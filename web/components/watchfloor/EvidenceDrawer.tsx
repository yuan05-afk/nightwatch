"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { familyOf } from "@/lib/triage";
import type { Evidence } from "./types";

const ACTIONS = [
  { action: "confirm", label: "Confirm attack", tone: "btn-primary" },
  { action: "false_positive", label: "Mark false positive", tone: "" },
  { action: "escalate", label: "Escalate", tone: "" },
] as const;

const PROTOCOLS: Record<number, string> = { 6: "TCP", 17: "UDP", 1: "ICMP" };

export function EvidenceDrawer({ incidentId, onClose, onTriaged }: { incidentId: number; onClose: () => void; onTriaged: () => void }) {
  const [ev, setEv] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; truthFamily: string } | null>(null);

  useEffect(() => {
    let live = true;
    setEv(null);
    setResult(null);
    fetch(`/api/incidents/${incidentId}`, { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => ({}))).error)))
      .then((d) => live && setEv(d))
      .catch((e) => live && setError(typeof e === "string" ? e : "Couldn't load this incident."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      live = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [incidentId, onClose]);

  async function triage(action: string) {
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
    onTriaged();
  }

  const fam = ev ? (ev.incident.verdict === "unknown" ? "Unknown" : familyOf(ev.incident.predicted)) : "";
  const maxAbs = ev ? Math.max(...ev.drivers.map((d) => Math.abs(d.contribution)), 1e-9) : 1;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Incident evidence"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-[560px] overflow-y-auto border-l border-hairline bg-[#050707] p-6 shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.9)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.8rem] text-ink-faint">Incident {incidentId}</p>
            <h2 className={`font-display text-[2rem] ${ev?.incident.verdict === "unknown" ? "text-unknown" : "text-known"}`}>{ev ? fam : "Loading…"}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-hairline p-2 text-ink-soft hover:text-ink" aria-label="Close evidence">
            <X size={16} />
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-attack">{error}</p>}

        {ev && (
          <>
            <p className="mt-2 font-mono text-[0.82rem] text-ink-soft">
              {ev.flow.srcIp}:{ev.flow.srcPort} → {ev.flow.dstIp}:{ev.flow.dstPort} · {PROTOCOLS[ev.flow.protocol] ?? `proto ${ev.flow.protocol}`} · {ev.incident.flowCount.toLocaleString("en-US")} flows
            </p>

            <section className="mt-7">
              <h3 className="text-[0.82rem] text-ink-faint">Why this verdict</h3>
              <p className="mt-2 text-[0.92rem] text-ink-soft">
                {ev.incident.verdict === "known"
                  ? `Only ${ev.incident.predicted} fits this traffic at the 95% confidence level, with probability ${pct(ev.score.probability)}.`
                  : ev.score.set.length === 0
                    ? "No attack type, and not benign either, fits this traffic at the 95% confidence level. It looks like nothing the model was trained on."
                    : ev.score.set.length > 1
                      ? `Several types fit at once (${ev.score.set.join(", ")}), so the model won't pick one for you.`
                      : "It looks benign to the classifier, but the anomaly check says it is unlike normal traffic."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[0.78rem] text-ink-faint">Plausible types:</span>
                {ev.score.set.length ? ev.score.set.map((c) => (
                  <span key={c} className="rounded-full border border-hairline px-2.5 py-0.5 text-[0.78rem] text-ink-soft">{c === "BENIGN" ? "Benign" : c}</span>
                )) : <span className="text-[0.78rem] text-unknown">none</span>}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[0.78rem] text-ink-faint">
                  <span>Anomaly score {ev.score.anomaly.toFixed(3)}</span>
                  <span>alert line {ev.score.anomalyThreshold.toFixed(3)}</span>
                </div>
                <div className="relative mt-1.5 h-1.5 rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${ev.score.anomalous ? "bg-unknown" : "bg-white/30"}`} style={{ width: `${Math.min(100, ev.score.anomaly * 100)}%` }} />
                  <div className="absolute -top-1 h-3.5 w-px bg-ink-soft" style={{ left: `${Math.min(100, ev.score.anomalyThreshold * 100)}%` }} />
                </div>
              </div>
            </section>

            <section className="mt-8">
              <h3 className="text-[0.82rem] text-ink-faint">What pushed the model toward {ev.explainedClass === "BENIGN" ? "benign" : ev.explainedClass}</h3>
              <ul className="mt-3 space-y-4">
                {ev.drivers.map((d) => (
                  <li key={d.feature}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.88rem] text-ink">{d.name}</span>
                      <span className="font-mono text-[0.78rem] text-ink-faint">value {fmtVal(d.value)}</span>
                    </div>
                    <div className="mt-1.5 flex h-1.5 items-center">
                      <div className="relative h-full w-full rounded-full bg-white/[0.05]">
                        <div
                          className={`absolute top-0 h-full rounded-full ${d.contribution >= 0 ? "left-1/2 bg-mint/80" : "right-1/2 bg-white/35"}`}
                          style={{ width: `${(Math.abs(d.contribution) / maxAbs) * 50}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-1.5 text-[0.8rem] text-ink-faint">
                      {d.contribution >= 0 ? "Raises" : "Lowers"} the score. Innocent reading: {d.benign}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {ev.related.length > 0 && (
              <section className="mt-8">
                <h3 className="text-[0.82rem] text-ink-faint">Same source, other incidents</h3>
                <ul className="mt-2 space-y-1.5 font-mono text-[0.78rem] text-ink-soft">
                  {ev.related.map((r) => (
                    <li key={r.id}>#{r.id} {r.verdict === "unknown" ? "Unknown" : r.predicted} → {r.dstIp} ({r.flowCount} flows, {r.status.replace("_", " ")})</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-9 border-t border-hairline pt-6">
              {result || ev.incident.status !== "open" ? (
                <p className="text-[0.92rem] text-ink-soft">
                  Saved as <span className="text-ink">{(result?.status ?? ev.incident.status).replace("_", " ")}</span>.{" "}
                  The dataset labels this traffic <span className="text-ink">{result?.truthFamily ?? ev.incident.truthFamily}</span>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map((a) => (
                    <button key={a.action} className={`btn ${a.tone}`} disabled={pending !== null} onClick={() => triage(a.action)}>
                      {pending === a.action ? "Saving…" : a.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-4 text-[0.76rem] text-ink-faint">Nightwatch never blocks traffic on its own. Every decision here is yours and is written to the audit log.</p>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

function pct(p: number) {
  return `${(p * 100).toFixed(p > 0.999 ? 2 : 1)}%`;
}

function fmtVal(v: number) {
  return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : Number(v.toFixed(3)).toString();
}
