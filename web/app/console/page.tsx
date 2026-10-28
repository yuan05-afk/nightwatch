import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Console } from "@/components/console/Console";

export const metadata = { title: "Security console · Nightwatch" };

export default function Page() {
  return (
    <>
      <Nav />
      <main className="app-bg flex-1">
        <Suspense fallback={<p className="mt-24 text-center text-ink-faint">Opening the console…</p>}>
          <Console />
        </Suspense>
      </main>
    </>
  );
}
