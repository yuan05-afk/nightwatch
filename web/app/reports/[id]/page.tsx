import { Nav } from "@/components/Nav";
import { IncidentReport } from "@/components/report/IncidentReport";

export const metadata = { title: "Incident report · Nightwatch" };

export default async function Page({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  return (
    <>
      <div className="no-print"><Nav /></div>
      <main className="app-bg flex-1">
        <IncidentReport sessionId={id} />
      </main>
    </>
  );
}
