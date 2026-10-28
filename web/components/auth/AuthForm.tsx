"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("redirectTo") ?? params.get("next"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: { message?: string } | null }>) {
    setPending(true);
    setError(null);
    try {
      const { error } = await fn();
      if (error) {
        setError(error.message ?? "That didn't work. Check your details and try again.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (mode === "sign-up") {
      const name = String(form.get("name") ?? "").trim() || email.split("@")[0];
      run(() => authClient.signUp.email({ email, password, name }));
    } else {
      run(() => authClient.signIn.email({ email, password }));
    }
  }

  return (
    <div className="glass w-full max-w-[400px] rounded-3xl p-7 sm:p-8">
      <h1 className="font-display text-[2.1rem] text-ink">{mode === "sign-in" ? "Start your shift" : "Create an analyst account"}</h1>
      <p className="mt-2 text-[0.9rem] text-ink-soft">
        {mode === "sign-in" ? "Sign in to open the Watchfloor." : "Your shifts and triage decisions are saved to your account."}
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
        {mode === "sign-up" && <Field name="name" label="Name" autoComplete="name" />}
        <Field name="email" label="Email" type="email" autoComplete="email" required />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {error && (
          <p role="alert" className="rounded-xl border border-attack/40 bg-attack/10 px-3 py-2 text-[0.85rem] text-attack">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary mt-1 justify-center disabled:opacity-60">
          {pending ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "sign-in" && DEMO_EMAIL && DEMO_PASSWORD && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => authClient.signIn.email({ email: DEMO_EMAIL, password: DEMO_PASSWORD }))}
          className="btn mt-3 w-full justify-center disabled:opacity-60"
        >
          Use the judge demo account
        </button>
      )}

      <p className="mt-6 text-center text-[0.85rem] text-ink-faint">
        {mode === "sign-in" ? (
          <>New here? <Link className="text-ink-soft underline-offset-4 hover:underline" href="/auth/sign-up">Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="text-ink-soft underline-offset-4 hover:underline" href="/auth/sign-in">Sign in</Link></>
        )}
      </p>
    </div>
  );
}

function Field(props: { name: string; label: string; type?: string; autoComplete?: string; required?: boolean; minLength?: number }) {
  const { label, ...input } = props;
  return (
    <label className="flex flex-col gap-1.5 text-[0.82rem] text-ink-soft">
      {label}
      <input
        {...input}
        type={props.type ?? "text"}
        className="rounded-xl border border-hairline bg-white/[0.02] px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mint/60"
      />
    </label>
  );
}

/** Only same-site paths; never redirect off-site after login. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/watchfloor";
}
