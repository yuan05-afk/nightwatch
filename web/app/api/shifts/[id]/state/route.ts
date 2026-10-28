import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { reviewableCount } from "@/lib/triage";

const Query = z.object({ capacity: z.coerce.number().int().min(0).max(480).default(30) });

export async function GET(req: Request, ctx: RouteContext<"/api/shifts/[id]/state">) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Unknown shift." }, { status: 404 });
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return Response.json({ error: "Capacity must be 0 to 480 minutes." }, { status: 400 });

  const [shift] = await db
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.id, id), eq(schema.shifts.userId, user.id)));
  if (!shift) return Response.json({ error: "Unknown shift." }, { status: 404 });

  const I = schema.incidents;
  const [[stats], [{ total }], rows, comparison] = await Promise.all([
    db.select().from(schema.shiftStats).where(eq(schema.shiftStats.shiftId, id)),
    db.select({ total: count() }).from(schema.flowsReplay).where(eq(schema.flowsReplay.scenario, shift.scenario)),
    db
      .select({
        id: I.id,
        verdict: I.verdict,
        predicted: I.predicted,
        srcIp: I.srcIp,
        dstIp: I.dstIp,
        dstPort: I.dstPort,
        firstSeen: I.firstSeen,
        lastSeen: I.lastSeen,
        flowCount: I.flowCount,
        maxProbability: I.maxProbability,
        maxAnomaly: I.maxAnomaly,
        rankScore: I.rankScore,
        status: I.status,
        // ground truth only after the analyst has triaged the incident
        truthFamily: sql<string | null>`case when ${I.status} <> 'open' then ${I.truthFamily} end`,
      })
      .from(I)
      .where(eq(I.shiftId, id))
      .orderBy(desc(I.rankScore))
      .limit(250),
    triageComparison(id, reviewableCount(q.data.capacity)),
  ]);

  return Response.json({
    shift: { id: shift.id, scenario: shift.scenario, cursor: shift.cursor, total: Number(total) },
    stats: stats ?? null,
    capacity: q.data.capacity,
    reviewable: reviewableCount(q.data.capacity),
    incidents: rows,
    comparison,
  });
}

/** True attack incidents an analyst reaches in the first n reviews, by ordering policy. */
async function triageComparison(shiftId: string, n: number) {
  const res = await db.execute(sql`
    with i as (select * from incidents where shift_id = ${shiftId}),
    totals as (select count(*) filter (where truth_family <> 'Benign') as attacks, count(*) as all_incidents from i),
    ranked as (
      select truth_family <> 'Benign' as is_attack,
        row_number() over (order by rank_score desc) as by_rank,
        row_number() over (order by first_seen asc, id asc) as by_fifo,
        row_number() over (order by max_probability desc, id asc) as by_confidence
      from i)
    select
      (select attacks from totals) as attacks,
      (select all_incidents from totals) as incidents,
      count(*) filter (where is_attack and by_rank <= ${n}) as nightwatch,
      count(*) filter (where is_attack and by_fifo <= ${n}) as fifo,
      count(*) filter (where is_attack and by_confidence <= ${n}) as confidence
    from ranked`);
  const r = res.rows[0] as Record<string, string | number | null>;
  const num = (v: unknown) => Number(v ?? 0);
  return {
    attacks: num(r.attacks),
    incidents: num(r.incidents),
    reached: { nightwatch: num(r.nightwatch), fifo: num(r.fifo), confidence: num(r.confidence) },
  };
}
