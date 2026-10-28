import { z } from "zod";
import { db, schema } from "@/lib/db";
import { audit, rateLimit, requireUser, tooMany } from "@/lib/guard";
import { SCENARIO_IDS } from "@/lib/scenarios";

const Body = z.object({ scenario: z.enum(SCENARIO_IDS) });

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!(await rateLimit(`shift:${user.id}`, 10, 60))) return tooMany();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pick one of the listed scenarios." }, { status: 400 });

  const [shift] = await db
    .insert(schema.shifts)
    .values({ userId: user.id, scenario: parsed.data.scenario })
    .returning({ id: schema.shifts.id });
  await audit(req, user.id, "shift.start", shift.id, { scenario: parsed.data.scenario });
  return Response.json({ id: shift.id }, { status: 201 });
}
