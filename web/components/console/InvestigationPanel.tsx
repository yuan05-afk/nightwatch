"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { familyInfo, STATUS_LABEL } from "@/lib/security";
import { familyOf } from "@/lib/triage";
import type { Evidence } from "./types";

const DECISIONS = [
  { action: "confirm", label: "Confirm threat", cls: "app-btn-danger", help: "This is a real attack. It goes into the incident report." },
  { action: "false_positive", label: "Dismiss as false alarm", cls: "", help: "This is normal activity. Nightwatch records it to learn." },
  { action: "escalate", label: "Escalate", cls: "", help: "Not sure. Hand it to a senior analyst; it also goes into the report." },
] as const;

const PROTOCOLS: Record<number, string> = { 6: "TCP", 17: "UDP", 1: "ICMP" };

export function InvestigationPanel({ incidentId, onClose, onDecided }: { incidentId: number; onClose: () => void; onDecided: () => void }) {
  const [ev, setEv] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: keyof typeof STATUS_LABEL; truthFamily: string } | null>(null);
  // The parent passes a new onClose on every render; keeping it in a ref means recording a decision (which
  // re-renders the console) doesn't re-run the load effect and blank the panel.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let live = true;
    fetch(`/api/incidents/${incidentId}`, { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => ({}))).error)))
      .then((d) => live && setEv(d))
      .catch((e) => live && setError(typeof e === "string" ? e : "Couldn't load this incident."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      live = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [incidentId]);

  async function decide(action: string) {
    setPending(action);
    const res = await fetch(`/api/incidents/${incidentId}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) return setError(body.error ?? "Couldn't save your decision. Try again.");
    setResult(body);
    onDecided();
  }

  const fam = ev ? (ev.incident.verdict === "unknown" ? "Unknown" : familyOf(ev.incident.predicted)) : "";
  const info = familyInfo(fam);
  const maxAbs = ev ? Math.max(...ev.drivers.map((d) => Math.abs(d.contribution)), 1e-9) : 1;
  const status = result?.status ?? ev?.incident.status;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/60" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Incident investigation"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-[600px] overflow-y-auto border-l border-[#1c2022] bg-[#0a0c0d]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#1c2022] bg-[#0a0c0d] px-6 py-4">
          <div>
            <p className="text-[0.78rem] text-ink-faint">Investigation · incident {incidentId}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              {ev && <span className={`sev sev-${info.severity}`}>{info.severity}</span>}
              <h2 className="text-[1.25rem] font-semibold text-ink">{ev ? (ev.incident.verdict === "unknown" ? "Unrecognized activity" : ev.incident.predicted) : "Loading…"}</h2>
            </div>
          </div>
          <button onClick={onClose} className="app-btn h-8 px-2.5 text-[0.8rem]" aria-label="Close investigation"><X size={14} aria-hidden /> Close</button>
        </header>

        {error && <p role="alert" className="px-6 pt-4 text-attack">{error}</p>}

        {ev && (
          <div className="space-y-6 px-6 py-5">
            <Block title="What happened">
              <p className="text-[0.92rem] leading-relaxed text-ink">{info.plain}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.82rem]">
                <Field k="Source" v={`${ev.flow.srcIp}`} mono />
                <Field k="Target" v={`${ev.flow.dstIp}:${ev.flow.dstPort} (${PROTOCOLS[ev.flow.protocol] ?? ev.flow.protocol})`} mono />
                <Field k="Connections" v={ev.incident.flowCount.toLocaleString("en-US")} mono />
                <Field k="First seen" v={new Date(ev.incident.firstSeen).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })} />
                <Field k="MITRE ATT&CK" v={info.attack.id === "Unmapped" ? "No technique matched" : `${info.attack.id}: ${info.attack.name}`} link={info.attack.id === "Unmapped" ? undefined : info.attack.url} />
              </dl>
            </Block>

            <Block title="Why Nightwatch flagged it">
              <p className="text-[0.88rem] leading-relaxed text-ink-soft">
                {ev.incident.verdict === "known"
                  ? `The traffic matches exactly one known attack type, ${ev.incident.predicted}, with ${pct(ev.score.probability)} model confidence. No other type, including normal traffic, fits at the 95% confidence level.`
                  : ev.score.set.length === 0
                    ? "No known attack type, and not normal traffic either, fits at the 95% confidence level. Rather than guess, Nightwatch asks a person to look."
                    : ev.score.set.length > 1
                      ? `More than one explanation fits (${ev.score.set.map(nice).join(", ")}), so Nightwatch won't pick one for you.`
                      : "The detector thinks it looks normal, but the anomaly check says it is unlike the normal traffic it learned from."}
              </p>
            </Block>

            <Block title="Recommended response">
              <ol className="list-decimal space-y-1.5 pl-5 text-[0.88rem] text-ink">
                {info.respond(ev.flow.srcIp, ev.flow.dstIp, ev.flow.dstPort).map((step) => <li key={step}>{step}</li>)}
              </ol>
              <p className="mt-2 text-[0.75rem] text-ink-faint">Nightwatch never blocks traffic itself. These are steps for your team.</p>
            </Block>

            <Block title="Evidence">
              <p className="text-[0.8rem] text-ink-faint">The traffic features that pushed the model toward &ldquo;{nice(ev.explainedClass)}&rdquo;, with an innocent explanation for each.</p>
              <ul className="mt-3 space-y-3">
                {ev.drivers.map((d) => (
                  <li key={d.feature} className="rounded-md border border-[#1c2022] p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.86rem] text-ink">{d.name}</span>
                      <span className="font-mono text-[0.75rem] text-ink-faint">{fmtVal(d.value)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-16 text-[0.72rem] text-ink-faint">{d.contribution >= 0 ? "raises" : "lowers"}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-[#1a1e20]">
                        <div className={`h-full rounded-full ${d.contribution >= 0 ? "bg-mint" : "bg-[#5a6266]"}`} style={{ width: `${(Math.abs(d.contribution) / maxAbs) * 100}%` }} />
                      </div>
                    </div>
                    <p className="mt-2 text-[0.76rem] text-ink-faint">Could also be normal: {d.benign}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[0.8rem]">
                <div className="rounded-md border border-[#1c2022] p-3">
                  <p className="text-ink-faint">Possible explanations</p>
                  <p className="mt-1 text-ink">{ev.score.set.length ? ev.score.set.map(nice).join(", ") : "none fit"}</p>
                </div>
                <div className="rounded-md border border-[#1c2022] p-3">
                  <p className="text-ink-faint">Anomaly score</p>
                  <p className="mt-1 font-mono text-ink">{ev.score.anomaly.toFixed(3)} <span className="text-ink-faint">/ alert at {ev.score.anomalyThreshold.toFixed(3)}</span></p>
                </div>
              </div>
            </Block>

            {ev.related.length > 0 && (
              <Block title="Other incidents from this source">
                <ul className="space-y-1 font-mono text-[0.78rem] text-ink-soft">
                  {ev.related.map((r) => (
                    <li key={r.id}>#{r.id} {r.verdict === "unknown" ? "Unrecognized" : r.predicted} → {r.dstIp} · {r.flowCount} conn · {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL]}</li>
                  ))}
                </ul>
              </Block>
            )}

            <Block title="Your decision">
              {status && status !== "open" ? (
                <p className="text-[0.9rem] text-ink-soft">
                  Recorded as <span className="font-medium text-ink">{STATUS_LABEL[status]}</span>. The dataset labels this traffic{" "}
                  <span className="font-medium text-ink">{result?.truthFamily ?? ev.incident.truthFamily}</span>.
                </p>
              ) : (
                <div className="space-y-2">
                  {DECISIONS.map((d) => (
                    <div key={d.action} className="flex flex-wrap items-center gap-3">
                      <button className={`app-btn min-w-[190px] ${d.cls}`} disabled={pending !== null} onClick={() => decide(d.action)}>
                        {pending === d.action ? "Saving…" : d.label}
                      </button>
                      <span className="text-[0.78rem] text-ink-faint">{d.help}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[0.74rem] text-ink-faint">Every decision is saved with your name and time in the audit log.</p>
            </Block>
          </div>
        )}
      </aside>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[0.95rem] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Field({ k, v, mono, link }: { k: string; v: string; mono?: boolean; link?: string }) {
  return (
    <div className={link ? "col-span-2" : ""}>
      <dt className="text-ink-faint">{k}</dt>
      <dd className={`text-ink ${mono ? "font-mono text-[0.8rem]" : ""}`}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
            {v} <ExternalLink size={12} />
          </a>
        ) : v}
      </dd>
    </div>
  );
}

function nice(c: string) {
  return c === "BENIGN" ? "normal traffic" : c;
}

function pct(p: number) {
  return `${(p * 100).toFixed(p > 0.999 ? 2 : 1)}%`;
}

function fmtVal(v: number) {
  return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : Number(v.toFixed(3)).toString();
}
