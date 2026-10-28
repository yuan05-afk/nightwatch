import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Watchfloor } from "@/components/watchfloor/Watchfloor";

export const metadata = { title: "Watchfloor · Nightwatch" };

export default function Page() {
  return (
    <>
      <Nav />
      <main className="watch-sky flex-1">
        <Suspense fallback={<p className="mt-24 text-center text-ink-faint">Opening the Watchfloor…</p>}>
          <Watchfloor />
        </Suspense>
      </main>
    </>
  );
}
