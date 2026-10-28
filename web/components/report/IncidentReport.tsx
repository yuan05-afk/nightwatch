"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { familyInfo, SEVERITY_ORDER, STATUS_LABEL, type Severity } from "@/lib/security";
import { familyOf } from "@/lib/triage";

type ReportIncident = {
  id: number;
  verdict: "known" | "unknown";
  predicted: string;
  srcIp: string;
  dstIp: string;
  dstPort: number;
  firstSeen: string;
  lastSeen: string;
  flowCount: number;
  status: keyof typeof STATUS_LABEL;
};

type Report = {
  session: { id: string; scenario: string; startedAt: string };
  preparedBy: { name: string; email: string };
  generatedAt: string;
  stats: { flowsScored: number; suppressed: number; known: number; unknown: number } | null;
  incidents: ReportIncident[];
  decisions: { incidentId: number; action: string; note: string | null; at: string }[];
};

const isInternal = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
const dt = (s: string) => new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function IncidentReport({ sessionId }: { sessionId: string }) {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/shifts/${sessionId}/report`, { cache: "no-store" })
      .then(async (res) => (res.ok ? res.json() : Promise.reject((await res.json().catch(() => ({}))).error)))
      .then(setR)
      .catch((e) => setError(typeof e === "string" ? e : "Couldn't build the report."));
  }, [sessionId]);

  if (error) return <p className="mx-auto mt-24 max-w-[600px] text-center text-ink-soft">{error}</p>;
  if (!r) return <p className="mx-auto mt-24 text-center text-ink-faint">Building the report…</p>;

  const reportable = r.incidents.filter((i) => i.status === "confirmed" || i.status === "escalated");
  const dismissed = r.incidents.filter((i) => i.status === "false_positive").length;
  const decisionAt = new Map(r.decisions.map((d) => [d.incidentId, d.at]));
  const fam = (i: ReportIncident) => (i.verdict === "unknown" ? "Unknown" : familyOf(i.predicted));
  const sev = (i: ReportIncident): Severity => familyInfo(fam(i)).severity;
  const top = SEVERITY_ORDER.find((s) => reportable.some((i) => sev(i) === s));
  const techniques = [...new Map(reportable.map((i) => [familyInfo(fam(i)).attack.id, familyInfo(fam(i)).attack])).values()].filter((t) => t.id !== "Unmapped");
  const hosts = [...new Set(reportable.flatMap((i) => [i.srcIp, i.dstIp]))];
  const internal = hosts.filter(isInternal);
  const external = hosts.filter((h) => !isInternal(h));
  const discovered = r.decisions.filter((d) => d.action !== "false_positive").map((d) => d.at).sort()[0];
  const deadline = discovered ? new Date(new Date(discovered).getTime() + 72 * 3600 * 1000) : null;
  const scenario = SCENARIOS.find((s) => s.id === r.session.scenario);

  return (
    <article className="report mx-auto w-full max-w-[920px] px-4 pb-24 pt-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/console?session=${r.session.id}`} className="app-btn">Back to the console</Link>
        <button className="app-btn app-btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
      </div>

      <div className="panel p-6 sm:p-8">
        <p className="text-[0.78rem] font-semibold text-unknown">DRAFT · for review by your Data Protection Officer</p>
        <h1 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.02em] text-ink">Security incident report</h1>
        <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-[0.85rem] sm:grid-cols-2">
          <Row k="Monitoring session" v={`${scenario?.title ?? r.session.scenario} (replayed traffic)`} />
          <Row k="Report generated" v={dt(r.generatedAt)} />
          <Row k="Prepared by" v={`${r.preparedBy.name} <${r.preparedBy.email}>`} />
          <Row k="Detection system" v="Nightwatch network intrusion detection" />
        </dl>

        {deadline && (
          <div className="mt-6 rounded-md border border-unknown/50 p-4">
            <p className="text-[0.9rem] font-semibold text-ink">Breach notification deadline: {dt(deadline.toISOString())}</p>
            <p className="mt-1 text-[0.82rem] text-ink-soft">
              If personal data may have been exposed, the Philippine Data Privacy Act (NPC Circular 16-03) requires notifying the
              National Privacy Commission within 72 hours of discovery, with a full report within five days. Discovery is counted here
              from the first confirmed threat at {dt(discovered!)}. GDPR Article 33 sets the same 72-hour window.
            </p>
          </div>
        )}

        <H>1. Summary</H>
        {reportable.length === 0 ? (
          <p className="text-[0.9rem] text-ink-soft">No incidents were confirmed or escalated in this session. Confirm or escalate incidents in the console to include them here.</p>
        ) : (
          <p className="text-[0.92rem] leading-relaxed text-ink">
            Nightwatch scanned {r.stats?.flowsScored.toLocaleString("en-US") ?? "the"} network connections. The analyst confirmed or escalated{" "}
            {reportable.length} incident{reportable.length === 1 ? "" : "s"}, the most serious rated <b className="font-semibold">{top}</b>, and dismissed {dismissed} as
            false alarm{dismissed === 1 ? "" : "s"}. Activity involved {internal.length} internal host{internal.length === 1 ? "" : "s"}
            {external.length ? ` and ${external.length} external address${external.length === 1 ? "" : "es"}` : ""}
            {techniques.length ? `, matching MITRE ATT&CK ${techniques.map((t) => t.id).join(", ")}` : ""}.
          </p>
        )}

        <H>2. Timeline</H>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[0.8rem]">
            <thead className="text-ink-faint">
              <tr className="border-b border-[#1c2022]">
                <th className="py-2 pr-3 font-medium">First seen</th>
                <th className="py-2 pr-3 font-medium">Severity</th>
                <th className="py-2 pr-3 font-medium">Activity</th>
                <th className="py-2 pr-3 font-medium">Source → target</th>
                <th className="py-2 pr-3 text-right font-medium">Connections</th>
                <th className="py-2 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {reportable.map((i) => (
                <tr key={i.id} className="border-b border-[#1c2022] align-top">
                  <td className="py-2 pr-3 text-ink-soft">{dt(i.firstSeen)}</td>
                  <td className="py-2 pr-3"><span className={`sev sev-${sev(i)}`}>{sev(i)}</span></td>
                  <td className="py-2 pr-3 text-ink">{i.verdict === "unknown" ? "Unrecognized activity" : i.predicted}<span className="block font-mono text-[0.7rem] text-ink-faint">{familyInfo(fam(i)).attack.id}</span></td>
                  <td className="py-2 pr-3 font-mono text-ink-soft">{i.srcIp} → {i.dstIp}:{i.dstPort}</td>
                  <td className="py-2 pr-3 text-right font-mono text-ink-soft">{i.flowCount.toLocaleString("en-US")}</td>
                  <td className="py-2 text-ink-soft">{STATUS_LABEL[i.status]}<span className="block text-[0.7rem] text-ink-faint">{decisionAt.get(i.id) ? dt(decisionAt.get(i.id)!) : ""}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H>3. Affected systems</H>
        <dl className="grid gap-3 text-[0.85rem] sm:grid-cols-2">
          <div><dt className="text-ink-faint">Internal hosts</dt><dd className="mt-1 font-mono text-ink">{internal.join(", ") || "none"}</dd></div>
          <div><dt className="text-ink-faint">External addresses</dt><dd className="mt-1 font-mono text-ink">{external.join(", ") || "none"}</dd></div>
        </dl>

        <H>4. Recommended containment and recovery</H>
        <ol className="list-decimal space-y-3 pl-5 text-[0.86rem] text-ink">
          {reportable.map((i) => (
            <li key={i.id}>
              <span className="font-medium">{i.verdict === "unknown" ? "Unrecognized activity" : i.predicted}, {i.srcIp} → {i.dstIp}</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
                {familyInfo(fam(i)).respond(i.srcIp, i.dstIp, i.dstPort).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </li>
          ))}
        </ol>

        <H>5. NPC breach notification fields (NPC Circular 16-03)</H>
        <dl className="space-y-4 text-[0.86rem]">
          <Npc k="Nature of the breach">
            {reportable.length
              ? reportable.map((i) => familyInfo(fam(i)).plain).filter((v, idx, a) => a.indexOf(v) === idx).join(" ")
              : "No confirmed incidents."}
          </Npc>
          <Npc k="Personal data possibly involved" todo>
            To be completed by the Data Protection Officer. Nightwatch analyses network traffic patterns, not the contents of data,
            so it cannot tell which personal records the affected systems hold.
          </Npc>
          <Npc k="Measures taken to address the breach">
            Incidents were reviewed and recorded in the Nightwatch audit log: {reportable.filter((i) => i.status === "confirmed").length} confirmed,{" "}
            {reportable.filter((i) => i.status === "escalated").length} escalated. Recommended containment steps are listed in section 4; record
            here which were completed and when.
          </Npc>
          <Npc k="Contact person" todo>
            Replace with your Data Protection Officer&rsquo;s name and contact details. Report prepared by {r.preparedBy.name} ({r.preparedBy.email}).
          </Npc>
        </dl>

        <p className="mt-10 border-t border-[#1c2022] pt-4 text-[0.74rem] leading-relaxed text-ink-faint">
          Generated by Nightwatch from network detections and the analyst&rsquo;s recorded decisions. This draft is not legal advice.
          Review it with your Data Protection Officer before submitting through the NPC&rsquo;s Data Breach Notification Management System.
          The traffic in this demonstration is replayed from the public CIC-IDS2017 research dataset.
        </p>
      </div>
    </article>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 text-[1.05rem] font-semibold text-ink">{children}</h2>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-faint">{k}:</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}

function Npc({ k, children, todo }: { k: string; children: React.ReactNode; todo?: boolean }) {
  return (
    <div className="rounded-md border border-[#1c2022] p-3">
      <dt className="font-medium text-ink">{k}{todo && <span className="ml-2 text-[0.74rem] font-normal text-unknown">needs your input</span>}</dt>
      <dd className="mt-1 leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}
