"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = { name?: string | null; email: string };

/**
 * Reads the session with a plain fetch so the auth client (Better Auth + zod, ~70 KB gzipped) stays off
 * every page's first load; it is imported only when the person signs out.
 */
export function AccountButton() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => live && setUser(d?.user ?? null))
        .catch(() => live && setUser(null));
    // Not needed for the first paint: wait until the browser is idle so it never competes with page content.
    const idle = window.requestIdleCallback ? window.requestIdleCallback(load, { timeout: 1500 }) : window.setTimeout(load, 300);
    return () => {
      live = false;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  if (user === undefined) return <span className="btn invisible" aria-hidden>Sign in</span>;
  if (!user) {
    return (
      <Link href="/auth/sign-in" className="btn">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[160px] truncate text-[0.82rem] text-ink-soft sm:inline" title={user.email}>
        {user.name || user.email}
      </span>
      <button
        className="btn"
        onClick={async () => {
          const { authClient } = await import("@/lib/auth/client");
          await authClient.signOut();
          window.location.assign("/");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
