import "server-only";

import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { auth } from "./auth/server";
import { db, schema } from "./db";

export type SessionUser = { id: string; email: string; name: string; role: string };

/** Every route handler calls this; proxy.ts redirects are only a UX layer. */
export async function requireUser(): Promise<SessionUser | Response> {
  const { data: session } = await auth.getSession();
  const user = session?.user as (SessionUser & { role?: string | null }) | undefined;
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  return { id: user.id, email: user.email, name: user.name, role: user.role ?? "user" };
}

export function isLead(user: SessionUser): boolean {
  return user.role === "admin";
}

function ipHash(req: Request): string | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? createHash("sha256").update(`nightwatch:${ip}`).digest("hex").slice(0, 16) : null;
}

export async function audit(
  req: Request,
  actorId: string | null,
  action: string,
  target?: string,
  meta: Record<string, unknown> = {},
) {
  await db.insert(schema.auditLog).values({ actorId, action, target, meta, ipHash: ipHash(req) });
}

/** Fixed-window limiter in Postgres: at most `limit` calls per `windowSeconds` per key. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.execute(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count`);
  const count = Number((rows.rows[0] as { count: number }).count);
  return count <= limit;
}

export function tooMany(): Response {
  return Response.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
}
