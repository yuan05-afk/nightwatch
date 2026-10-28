import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { Nav } from "@/components/Nav";

export default function Page() {
  return (
    <>
      <Nav />
      <main className="auth-sky relative flex flex-1 items-center justify-center px-4 py-16">
        <Suspense>
          <AuthForm mode="sign-up" />
        </Suspense>
      </main>
    </>
  );
}
