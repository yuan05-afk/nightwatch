import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { IncidentReport } from "@/components/report/IncidentReport";

export const metadata = { title: "Incident report · Nightwatch" };

export default function Page() {
  return (
    <>
      <div className="no-print"><Nav /></div>
      <main className="app-bg flex-1">
        <Suspense fallback={<p className="mx-auto mt-24 text-center text-ink-faint">Building the report…</p>}>
          <IncidentReport />
        </Suspense>
      </main>
    </>
  );
}
