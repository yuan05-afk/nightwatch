import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { explainFeature } from "@/lib/explain";
import { requireUser } from "@/lib/guard";
import { drivers, score, type Model } from "@/lib/scoring";
import modelJson from "@/lib/scoring/model/model.json";

const model = modelJson as unknown as Model;

export async function GET(_req: Request, ctx: RouteContext<"/api/incidents/[id]">) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const incidentId = z.coerce.number().int().positive().safeParse(id);
  if (!incidentId.success) return Response.json({ error: "Unknown incident." }, { status: 404 });

  const I = schema.incidents;
  const [row] = await db
    .select({ incident: I, shift: schema.shifts })
    .from(I)
    .innerJoin(schema.shifts, eq(schema.shifts.id, I.shiftId))
    .where(and(eq(I.id, incidentId.data), eq(schema.shifts.userId, user.id)));
  if (!row) return Response.json({ error: "Unknown incident." }, { status: 404 });

  const [flow] = await db.select().from(schema.flowsReplay).where(eq(schema.flowsReplay.id, row.incident.exemplarFlowId));
  const s = score(model, flow.features);
  const explainClass = row.incident.verdict === "known" ? row.incident.predicted : s.predicted;
  const top = drivers(model, flow.features, explainClass, 6).map((d) => ({ ...d, ...explainFeature(d.feature) }));

  const related = await db
    .select({ id: I.id, verdict: I.verdict, predicted: I.predicted, srcIp: I.srcIp, dstIp: I.dstIp, flowCount: I.flowCount, status: I.status })
    .from(I)
    .where(and(eq(I.shiftId, row.incident.shiftId), ne(I.id, row.incident.id), eq(I.srcIp, row.incident.srcIp)))
    .orderBy(desc(I.rankScore))
    .limit(5);

  const { truthFamily, ...incident } = row.incident;
  return Response.json({
    incident: { ...incident, truthFamily: incident.status === "open" ? null : truthFamily },
    flow: {
      ts: flow.ts,
      srcIp: flow.srcIp,
      dstIp: flow.dstIp,
      srcPort: flow.srcPort,
      dstPort: flow.dstPort,
      protocol: flow.protocol,
    },
    score: { verdict: s.verdict, predicted: s.predicted, probability: s.probability, set: s.set, anomaly: s.anomaly, anomalous: s.anomalous, anomalyThreshold: model.iforest.threshold },
    explainedClass: explainClass,
    drivers: top,
    related,
  });
}
