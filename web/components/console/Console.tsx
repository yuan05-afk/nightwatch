"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { familyInfo, STATUS_LABEL } from "@/lib/security";
import { familyOf, MINUTES_PER_INCIDENT } from "@/lib/triage";
import { InvestigationPanel } from "./InvestigationPanel";
import type { Incident, ShiftState } from "./types";

const TICK_MS = 1100;

export function Console() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("session");
  return id ? <Session key={id} sessionId={id} onExit={() => router.push("/console")} /> : <Start />;
}

/* ---------------- Step bar ---------------- */

const STEPS = [
  { title: "Monitor", text: "Nightwatch scans every connection in the traffic." },
  { title: "Prioritize", text: "Related alerts are grouped and the most dangerous rise to the top." },
  { title: "Investigate", text: "Open an incident to see what happened and what to do." },
  { title: "Report", text: "Turn your decisions into an incident report." },
];

function StepBar({ current }: { current: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li key={s.title} className={`panel px-4 py-3 ${state === "now" ? "border-mint/60" : ""}`}>
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[0.75rem] font-semibold ${
                  state === "done" ? "bg-mint text-[#04130e]" : state === "now" ? "border border-mint text-mint" : "border border-[#2a2f32] text-ink-faint"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={`text-[0.9rem] font-medium ${state === "next" ? "text-ink-faint" : "text-ink"}`}>{s.title}</span>
            </div>
            <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-faint">{s.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Start: choose traffic ---------------- */

function Start() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(scenario: string) {
    setPending(scenario);
    setError(null);
    const res = await fetch("/api/shifts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario }) });
    if (res.status === 401) return router.push("/auth/sign-in");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(null);
      return setError(body.error ?? "Couldn't start monitoring. Try again.");
    }
    router.push(`/console?session=${body.id}`);
  }

  return (
    <section className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-10">
      <p className="text-[0.82rem] text-ink-faint">Security console</p>
      <h1 className="mt-1 text-[1.9rem] font-semibold tracking-[-0.02em] text-ink">Choose the traffic to monitor</h1>
      <p className="mt-2 max-w-[680px] text-[0.95rem] text-ink-soft">
        Each option replays one real day of recorded network traffic, connection by connection, through the live detection model.
        The traffic is held out: the model never saw it during training.
      </p>
      <div className="mt-6"><StepBar current={0} /></div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => start(s.id)} disabled={pending !== null} className="panel flex flex-col p-5 text-left transition-colors hover:border-[#3a4044] disabled:opacity-60">
            <span className="text-[1.05rem] font-semibold text-ink">{s.title}</span>
            <span className="mt-1.5 text-[0.88rem] text-ink-soft">{s.blurb}</span>
            <span className="mt-5 inline-flex w-fit items-center rounded-md border border-[#2a2f32] px-3 py-1.5 text-[0.82rem] text-ink">
              {pending === s.id ? "Starting…" : "Start monitoring"}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-[0.82rem] text-ink-faint">
        Have your own flow logs? <Link href="/check" className="text-ink-soft underline underline-offset-4 hover:text-ink">Check your network</Link> with a CICFlowMeter CSV export.
      </p>
      {error && <p role="alert" className="mt-4 text-attack">{error}</p>}
    </section>
  );
}

/* ---------------- Session ---------------- */

function Session({ sessionId, onExit }: { sessionId: string; onExit: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<ShiftState | null>(null);
  const [playing, setPlaying] = useState(true);
  const [capacity, setCapacity] = useState(30);
  const [filter, setFilter] = useState<"all" | "known" | "unknown">("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const capRef = useRef(capacity);
  capRef.current = capacity;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/shifts/${sessionId}/state?capacity=${capRef.current}`, { cache: "no-store" });
    if (res.status === 401) return router.push("/auth/sign-in");
    if (res.status === 404) return setError("This monitoring session doesn't exist or belongs to another account.");
    if (res.ok) setState(await res.json());
  }, [sessionId, router]);

  useEffect(() => {
    refresh();
  }, [refresh, capacity]);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (done.current) return setPlaying(false);
      const res = await fetch(`/api/shifts/${sessionId}/tick`, { method: "POST" });
      if (cancelled) return;
      if (res.ok) {
        const t = await res.json();
        if (t.done) done.current = true;
      } else if (res.status === 429) {
        setError("Too many requests. Monitoring will resume shortly.");
      }
      await refresh();
      if (!cancelled) timer = setTimeout(loop, TICK_MS);
    };
    loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playing, sessionId, refresh]);

  if (error && !state) return <p className="mx-auto mt-24 max-w-[600px] px-4 text-center text-ink-soft">{error}</p>;
  if (!state) return <p className="mx-auto mt-24 text-center text-ink-faint">Opening the session…</p>;

  const scenario = SCENARIOS.find((s) => s.id === state.shift.scenario);
  const progress = state.shift.total ? state.shift.cursor / state.shift.total : 0;
  const s = state.stats;
  const decided = state.incidents.filter((i) => i.status !== "open").length;
  const confirmed = state.incidents.filter((i) => i.status === "confirmed" || i.status === "escalated").length;
  const step = decided > 0 ? 3 : opened ? 2 : state.incidents.length > 0 ? 1 : 0;
  const visible = state.incidents.filter((i) => filter === "all" || i.verdict === filter);
  const knownCount = state.incidents.filter((i) => i.verdict === "known").length;
  const c = state.comparison;

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.82rem] text-ink-faint">Security console · monitoring session</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">{scenario?.title ?? state.shift.scenario}</h1>
          <p className="mt-1 text-[0.88rem] text-ink-soft">{scenario?.blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="app-btn" onClick={() => setPlaying((p) => !p)} disabled={done.current && !playing}>
            {done.current ? "Scan complete" : playing ? "Pause scan" : "Resume scan"}
          </button>
          <button className="app-btn" onClick={onExit}>New session</button>
          <Link
            href={confirmed > 0 ? `/reports/${sessionId}` : "#"}
            aria-disabled={confirmed === 0}
            onClick={(e) => confirmed === 0 && e.preventDefault()}
            className={`app-btn ${confirmed > 0 ? "app-btn-primary" : "pointer-events-none opacity-50"}`}
            title={confirmed > 0 ? "Create the incident report" : "Confirm or escalate at least one incident first"}
          >
            Create incident report
          </Link>
        </div>
      </div>

      <div className="mt-5"><StepBar current={step} /></div>

      <div className="mt-5 flex items-center gap-3 text-[0.8rem] text-ink-faint">
        <span className="whitespace-nowrap">{done.current ? "Scan complete" : playing ? "Scanning" : "Paused"}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a1e20]" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-mint transition-[width] duration-700" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="whitespace-nowrap font-mono">{fmt(state.shift.cursor)} / {fmt(state.shift.total)} connections</span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Connections scanned" value={fmt(s?.flowsScored)} />
        <Stat label="Cleared as normal" value={fmt(s?.suppressed)} />
        <Stat label="Recognized attacks" value={fmt(s?.known)} hint="Connections matching a known attack type" />
        <Stat label="Need review" value={fmt(s?.unknown)} hint="Unusual, but not a known attack type" />
        <Stat label="Attacks missed" value={fmt(s?.attacksSuppressed)} hint="Checked afterwards against the dataset's true labels" warn={!!s && s.attacksSuppressed > 0} />
        <Stat label="Scan speed" value={s && s.flowsScored ? `${Math.round(s.scoringMicros / s.flowsScored)} µs` : "–"} hint="Per connection" />
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="panel">
          <div className="panel-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <h2 className="text-[1.02rem] font-semibold text-ink">Incidents</h2>
              <p className="text-[0.78rem] text-ink-faint">Alerts from the same source and target, grouped. Most urgent first. Click one to investigate.</p>
            </div>
            <div role="tablist" className="flex gap-1 rounded-md border border-[#2a2f32] p-0.5 text-[0.8rem]">
              {([["all", `All (${state.incidents.length})`], ["known", `Recognized (${knownCount})`], ["unknown", `Need review (${state.incidents.length - knownCount})`]] as const).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                  className={`rounded px-2.5 py-1 ${filter === k ? "bg-[#1c2022] text-ink" : "text-ink-faint hover:text-ink-soft"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <IncidentTable incidents={visible} reviewable={filter === "all" ? state.reviewable : -1} selected={selected} onOpen={(id) => { setSelected(id); setOpened(true); }} />
        </div>

        <aside className="flex flex-col gap-5">
          <div className="panel p-4">
            <h2 className="text-[1.02rem] font-semibold text-ink">Analyst capacity</h2>
            <p className="mt-1 text-[0.8rem] text-ink-faint">How much time do you have to review incidents?</p>
            <label className="mt-3 block text-[0.88rem] text-ink" htmlFor="capacity">
              {capacity} minutes, about {state.reviewable} incidents at {MINUTES_PER_INCIDENT} min each
            </label>
            <input id="capacity" type="range" min={6} max={240} step={6} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-2 w-full accent-[var(--mint)]" />
            <div className="mt-4 border-t border-[#1c2022] pt-3">
              <p className="text-[0.82rem] text-ink-soft">Real attacks you would reach in that time, out of {c.attacks}:</p>
              <ul className="mt-2.5 space-y-2">
                <Bar label="Nightwatch priority order" value={c.reached.nightwatch} max={Math.max(1, c.attacks)} strong />
                <Bar label="Oldest first" value={c.reached.fifo} max={Math.max(1, c.attacks)} />
                <Bar label="Highest model confidence first" value={c.reached.confidence} max={Math.max(1, c.attacks)} />
              </ul>
              <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-faint">Measured against the dataset&rsquo;s true labels, which stay hidden on each incident until you decide.</p>
            </div>
          </div>

          <div className="panel p-4 text-[0.82rem] text-ink-soft">
            <h2 className="text-[1.02rem] font-semibold text-ink">What the labels mean</h2>
            <dl className="mt-3 space-y-2.5">
              <div><dt className="font-medium text-known">Recognized attack</dt><dd>Matches exactly one known attack type, with 95% confidence.</dd></div>
              <div><dt className="font-medium text-unknown">Needs review</dt><dd>Doesn&rsquo;t match a known attack, but doesn&rsquo;t look normal either. Never silently dropped.</dd></div>
              <div><dt className="font-medium text-ink">Severity</dt><dd>Critical and High mean act now: footholds, data theft, account takeover. Low is usually reconnaissance.</dd></div>
              <div><dt className="font-medium text-ink">T-codes</dt><dd>The matching MITRE ATT&amp;CK technique, the industry&rsquo;s common language for attacker behavior.</dd></div>
            </dl>
          </div>
        </aside>
      </div>

      {selected !== null && <InvestigationPanel incidentId={selected} onClose={() => setSelected(null)} onDecided={refresh} />}
    </section>
  );
}

function IncidentTable({ incidents, reviewable, onOpen, selected }: { incidents: Incident[]; reviewable: number; onOpen: (id: number) => void; selected: number | null }) {
  if (!incidents.length) return <p className="px-4 py-14 text-center text-[0.9rem] text-ink-faint">No incidents yet. They appear here as Nightwatch finds suspicious traffic.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[0.85rem]">
        <thead className="text-[0.75rem] text-ink-faint">
          <tr className="border-b border-[#1c2022]">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Severity</th>
            <th className="px-2 py-2 font-medium">Detection</th>
            <th className="px-2 py-2 font-medium">Source → target</th>
            <th className="px-2 py-2 text-right font-medium">Connections</th>
            <th className="px-2 py-2 text-right font-medium">Confidence</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i, idx) => {
            const fam = i.verdict === "unknown" ? "Unknown" : familyOf(i.predicted);
            const info = familyInfo(fam);
            const edge = reviewable > 0 && idx === reviewable - 1 && idx < incidents.length - 1;
            const inBudget = reviewable < 0 || idx < reviewable;
            return (
              <tr
                key={i.id}
                tabIndex={0}
                onClick={() => onOpen(i.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(i.id)}
                className={`cursor-pointer border-b hover:bg-[#111415] focus-visible:bg-[#111415] ${edge ? "border-b-2 border-mint/60" : "border-[#1c2022]"} ${selected === i.id ? "bg-[#111415]" : ""} ${inBudget ? "" : "text-ink-faint [&_.sev]:opacity-60"}`}
              >
                <td className="px-4 py-2.5 font-mono text-ink-faint">{idx + 1}</td>
                <td className="px-2 py-2.5"><span className={`sev sev-${info.severity}`}>{info.severity}</span></td>
                <td className="px-2 py-2.5">
                  <span className="block text-ink">{i.verdict === "unknown" ? "Unrecognized activity" : i.predicted === fam ? fam : i.predicted}</span>
                  <span className="block font-mono text-[0.72rem] text-ink-faint">{info.attack.id === "Unmapped" ? "needs review" : `${info.attack.id} · ${fam}`}</span>
                </td>
                <td className="px-2 py-2.5 font-mono text-[0.8rem] text-ink-soft">{i.srcIp} → {i.dstIp}</td>
                <td className="px-2 py-2.5 text-right font-mono text-ink-soft">{fmt(i.flowCount)}</td>
                <td className="px-2 py-2.5 text-right font-mono text-ink-soft">{i.verdict === "unknown" ? "review" : `${Math.round(i.maxProbability * 100)}%`}</td>
                <td className="px-4 py-2.5 text-[0.82rem]">
                  <span className={i.status === "open" ? "text-ink-soft" : "text-ink"}>{STATUS_LABEL[i.status]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {reviewable > 0 && reviewable < incidents.length && (
        <p className="px-4 py-2.5 text-[0.76rem] text-ink-faint">The green line marks where your analyst capacity runs out. Incidents below it would wait.</p>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="panel px-3.5 py-3" title={hint}>
      <dt className="text-[0.76rem] text-ink-faint">{label}</dt>
      <dd className={`mt-1 font-mono text-[1.35rem] font-medium leading-none ${warn ? "text-attack" : "text-ink"}`}>{value}</dd>
      {hint && <dd className="mt-1.5 text-[0.7rem] leading-snug text-ink-faint">{hint}</dd>}
    </div>
  );
}

function Bar({ label, value, max, strong }: { label: string; value: number; max: number; strong?: boolean }) {
  return (
    <li>
      <div className="flex justify-between text-[0.8rem]">
        <span className={strong ? "text-ink" : "text-ink-soft"}>{label}</span>
        <span className="font-mono text-ink-soft">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[#1a1e20]">
        <div className={`h-full rounded-full ${strong ? "bg-mint" : "bg-[#5a6266]"}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </li>
  );
}

function fmt(n: number | undefined | null) {
  return n == null ? "0" : n.toLocaleString("en-US");
}
