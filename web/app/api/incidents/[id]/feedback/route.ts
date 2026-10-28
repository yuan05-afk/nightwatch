import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { audit, rateLimit, requireUser, tooMany } from "@/lib/guard";

const Body = z.object({
  action: z.enum(["confirm", "false_positive", "escalate"]),
  note: z.string().trim().max(500).optional(),
});
const STATUS = { confirm: "confirmed", false_positive: "false_positive", escalate: "escalated" } as const;

export async function POST(req: Request, ctx: RouteContext<"/api/incidents/[id]/feedback">) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!(await rateLimit(`feedback:${user.id}`, 60, 60))) return tooMany();
  const { id } = await ctx.params;
  const incidentId = z.coerce.number().int().positive().safeParse(id);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!incidentId.success) return Response.json({ error: "Unknown incident." }, { status: 404 });
  if (!body.success) return Response.json({ error: "Choose confirm, false positive or escalate. Notes are limited to 500 characters." }, { status: 400 });

  const I = schema.incidents;
  const [owned] = await db
    .select({ id: I.id, truthFamily: I.truthFamily })
    .from(I)
    .innerJoin(schema.shifts, eq(schema.shifts.id, I.shiftId))
    .where(and(eq(I.id, incidentId.data), eq(schema.shifts.userId, user.id)));
  if (!owned) return Response.json({ error: "Unknown incident." }, { status: 404 });

  await db.batch([
    db.insert(schema.feedback).values({ incidentId: owned.id, userId: user.id, action: body.data.action, note: body.data.note }),
    db.update(I).set({ status: STATUS[body.data.action] }).where(eq(I.id, owned.id)),
  ]);
  await audit(req, user.id, `incident.${body.data.action}`, String(owned.id));
  return Response.json({ status: STATUS[body.data.action], truthFamily: owned.truthFamily });
}
