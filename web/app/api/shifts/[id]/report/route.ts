import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { audit, requireUser } from "@/lib/guard";

export async function GET(req: Request, ctx: RouteContext<"/api/shifts/[id]/report">) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Unknown session." }, { status: 404 });

  const [shift] = await db.select().from(schema.shifts).where(and(eq(schema.shifts.id, id), eq(schema.shifts.userId, user.id)));
  if (!shift) return Response.json({ error: "Unknown session." }, { status: 404 });

  const I = schema.incidents;
  const decided = await db
    .select()
    .from(I)
    .where(and(eq(I.shiftId, id), ne(I.status, "open")))
    .orderBy(asc(I.firstSeen));
  const ids = decided.map((d) => d.id);
  const decisions = ids.length
    ? await db.select().from(schema.feedback).where(inArray(schema.feedback.incidentId, ids)).orderBy(asc(schema.feedback.createdAt))
    : [];
  const [stats] = await db.select().from(schema.shiftStats).where(eq(schema.shiftStats.shiftId, id));

  await audit(req, user.id, "report.view", id, { incidents: ids.length });
  return Response.json({
    session: { id: shift.id, scenario: shift.scenario, startedAt: shift.startedAt },
    preparedBy: { name: user.name, email: user.email },
    generatedAt: new Date().toISOString(),
    stats: stats ?? null,
    // ground truth is not part of a real report
    incidents: decided.map(({ truthFamily: _t, ...rest }) => rest),
    decisions: decisions.map((d) => ({ incidentId: d.incidentId, action: d.action, note: d.note, at: d.createdAt })),
  });
}
