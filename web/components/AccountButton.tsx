"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function AccountButton() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  if (isPending) return <span className="btn invisible" aria-hidden>Sign in</span>;
  if (!data?.user) {
    return (
      <Link href="/auth/sign-in" className="btn">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[160px] truncate text-[0.82rem] text-ink-soft sm:inline" title={data.user.email}>
        {data.user.name || data.user.email}
      </span>
      <button
        className="btn"
        onClick={async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
