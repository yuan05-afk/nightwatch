import { z } from "zod";
import { rateLimit, requireUser, tooMany } from "@/lib/guard";
import { tick } from "@/lib/stream";

export const maxDuration = 30;

export async function POST(_req: Request, ctx: RouteContext<"/api/shifts/[id]/tick">) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Unknown shift." }, { status: 404 });
  if (!(await rateLimit(`tick:${user.id}`, 120, 60))) return tooMany();
  const result = await tick(id, user.id);
  if (!result) return Response.json({ error: "Unknown shift." }, { status: 404 });
  return Response.json(result);
}
