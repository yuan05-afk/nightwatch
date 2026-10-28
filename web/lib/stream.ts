import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { score, type Model } from "./scoring";
import modelJson from "./scoring/model/model.json";
import { confidenceOf, familyOf, groupKey, rankScore, severityTier } from "./triage";

const model = modelJson as unknown as Model;
export const TICK_BATCH = 400;

type Pending = {
  groupKey: string;
  verdict: "known" | "unknown";
  predicted: string;
  srcIp: string;
  dstIp: string;
  dstPort: number;
  firstSeen: Date;
  lastSeen: Date;
  flowCount: number;
  maxProbability: number;
  maxAnomaly: number;
  exemplarFlowId: number;
  truthFamily: string;
};

export type TickResult = { scored: number; cursor: number; done: boolean; newIncidents: number };

/** Score the next batch of the shift's scenario and fold alerts into incidents. */
export async function tick(shiftId: string, userId: string): Promise<TickResult | null> {
  const [shift] = await db
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.id, shiftId), eq(schema.shifts.userId, userId)));
  if (!shift) return null;

  const flows = await db
    .select()
    .from(schema.flowsReplay)
    .where(and(eq(schema.flowsReplay.scenario, shift.scenario), gt(schema.flowsReplay.seq, shift.cursor)))
    .orderBy(asc(schema.flowsReplay.seq))
    .limit(TICK_BATCH);

  if (flows.length === 0) return { scored: 0, cursor: shift.cursor, done: true, newIncidents: 0 };

  // Claim the batch: only the tick that still sees the old cursor may score it.
  // Two tabs (or React's dev double-effects) would otherwise count the same flows twice.
  const cursor = flows[flows.length - 1].seq;
  const claimed = await db
    .update(schema.shifts)
    .set({ cursor })
    .where(and(eq(schema.shifts.id, shiftId), eq(schema.shifts.cursor, shift.cursor)))
    .returning({ id: schema.shifts.id });
  if (claimed.length === 0) return { scored: 0, cursor: shift.cursor, done: false, newIncidents: 0 };

  const groups = new Map<string, Pending>();
  const stats = { suppressed: 0, known: 0, unknown: 0, attacksSuppressed: 0, benignAlerts: 0, micros: 0 };

  for (const f of flows) {
    const t0 = performance.now();
    const s = score(model, f.features);
    stats.micros += (performance.now() - t0) * 1000;
    const isAttack = f.label !== "BENIGN";
    if (s.verdict === "suppressed") {
      stats.suppressed++;
      if (isAttack) stats.attacksSuppressed++;
      continue;
    }
    stats[s.verdict]++;
    if (!isAttack) stats.benignAlerts++;
    const key = groupKey(s.verdict, s.predicted, f.srcIp, f.dstIp);
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        groupKey: key,
        verdict: s.verdict,
        predicted: s.predicted,
        srcIp: f.srcIp,
        dstIp: f.dstIp,
        dstPort: f.dstPort,
        firstSeen: f.ts,
        lastSeen: f.ts,
        flowCount: 1,
        maxProbability: s.probability,
        maxAnomaly: s.anomaly,
        exemplarFlowId: f.id,
        truthFamily: f.family,
      });
    } else {
      g.flowCount++;
      g.lastSeen = f.ts;
      if (s.probability > g.maxProbability) {
        g.maxProbability = s.probability;
        g.exemplarFlowId = f.id;
      }
      g.maxAnomaly = Math.max(g.maxAnomaly, s.anomaly);
      if (g.truthFamily === "Benign" && f.family !== "Benign") g.truthFamily = f.family;
    }
  }

  const rows = [...groups.values()].map((g) => {
    const tier = severityTier(g.verdict === "unknown" ? "Unknown" : familyOf(g.predicted));
    const confidence = confidenceOf(g.verdict, g.maxProbability, g.maxAnomaly);
    return { shiftId, ...g, tier, confidence, rankScore: rankScore(tier, confidence, g.flowCount) };
  });

  const ops = [];
  if (rows.length) {
    ops.push(
      db
        .insert(schema.incidents)
        .values(rows)
        .onConflictDoUpdate({
          target: [schema.incidents.shiftId, schema.incidents.groupKey],
          set: {
            flowCount: sql`${schema.incidents.flowCount} + excluded.flow_count`,
            lastSeen: sql`greatest(${schema.incidents.lastSeen}, excluded.last_seen)`,
            maxProbability: sql`greatest(${schema.incidents.maxProbability}, excluded.max_probability)`,
            maxAnomaly: sql`greatest(${schema.incidents.maxAnomaly}, excluded.max_anomaly)`,
            truthFamily: sql`case when ${schema.incidents.truthFamily} = 'Benign' then excluded.truth_family else ${schema.incidents.truthFamily} end`,
            confidence: sql`greatest(${schema.incidents.confidence}, excluded.confidence)`,
            // same formula as lib/triage.ts rankScore, on the merged confidence and volume (log = log10 in Postgres)
            rankScore: sql`${schema.incidents.tier} * 10 + greatest(${schema.incidents.confidence}, excluded.confidence) * (1 + log(${schema.incidents.flowCount} + excluded.flow_count))`,
          },
        }),
    );
  }
  ops.push(
    db
      .insert(schema.shiftStats)
      .values({
        shiftId,
        flowsScored: flows.length,
        suppressed: stats.suppressed,
        known: stats.known,
        unknown: stats.unknown,
        attacksSuppressed: stats.attacksSuppressed,
        benignAlerts: stats.benignAlerts,
        scoringMicros: stats.micros,
      })
      .onConflictDoUpdate({
        target: schema.shiftStats.shiftId,
        set: {
          flowsScored: sql`${schema.shiftStats.flowsScored} + excluded.flows_scored`,
          suppressed: sql`${schema.shiftStats.suppressed} + excluded.suppressed`,
          known: sql`${schema.shiftStats.known} + excluded.known`,
          unknown: sql`${schema.shiftStats.unknown} + excluded.unknown`,
          attacksSuppressed: sql`${schema.shiftStats.attacksSuppressed} + excluded.attacks_suppressed`,
          benignAlerts: sql`${schema.shiftStats.benignAlerts} + excluded.benign_alerts`,
          scoringMicros: sql`${schema.shiftStats.scoringMicros} + excluded.scoring_micros`,
        },
      }),
  );
  await db.batch(ops as unknown as Parameters<typeof db.batch>[0]);

  return { scored: flows.length, cursor, done: flows.length < TICK_BATCH, newIncidents: rows.length };
}
