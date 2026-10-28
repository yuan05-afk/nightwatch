"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { familyOf, MINUTES_PER_INCIDENT } from "@/lib/triage";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { Incident, ShiftState } from "./types";

const TICK_MS = 1100;

export function Watchfloor() {
  const params = useSearchParams();
  const router = useRouter();
  const shiftId = params.get("shift");
  return shiftId ? <Shift key={shiftId} shiftId={shiftId} onExit={() => router.push("/watchfloor")} /> : <ScenarioPicker />;
}

function ScenarioPicker() {
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
      return setError(body.error ?? "Couldn't start the shift. Try again.");
    }
    router.push(`/watchfloor?shift=${body.id}`);
  }

  return (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-14">
      <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.4rem)] text-ink">Pick tonight&rsquo;s shift</h1>
      <p className="mt-3 max-w-[620px] text-ink-soft">
        Each shift replays held-out traffic from the corrected CIC-IDS2017 dataset, flow by flow, through the same model that
        runs in production here. Nothing you see was used to train it.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => start(s.id)}
            disabled={pending !== null}
            className="glass group rounded-2xl p-6 text-left transition-colors hover:border-mint/40 disabled:opacity-60"
          >
            <span className="font-display text-[1.6rem] text-ink">{s.title}</span>
            <p className="mt-2 text-[0.9rem] text-ink-soft">{s.blurb}</p>
            <span className="mt-6 inline-flex text-[0.84rem] text-mint">{pending === s.id ? "Starting…" : "Start shift"}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-6 text-attack">{error}</p>}
    </section>
  );
}

function Shift({ shiftId, onExit }: { shiftId: string; onExit: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<ShiftState | null>(null);
  const [playing, setPlaying] = useState(true);
  const [capacity, setCapacity] = useState(30);
  const [lane, setLane] = useState<"all" | "known" | "unknown">("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const capRef = useRef(capacity);
  capRef.current = capacity;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/shifts/${shiftId}/state?capacity=${capRef.current}`, { cache: "no-store" });
    if (res.status === 401) return router.push("/auth/sign-in");
    if (res.status === 404) return setError("This shift doesn't exist or belongs to another account.");
    if (res.ok) setState(await res.json());
  }, [shiftId, router]);

  useEffect(() => {
    refresh();
  }, [refresh, capacity]);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (done.current) return setPlaying(false);
      const res = await fetch(`/api/shifts/${shiftId}/tick`, { method: "POST" });
      if (cancelled) return;
      if (res.ok) {
        const t = await res.json();
        if (t.done) done.current = true;
      } else if (res.status === 429) {
        setError("Slowing down: too many requests. The replay will resume shortly.");
      }
      await refresh();
      if (!cancelled) timer = setTimeout(loop, TICK_MS);
    };
    loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playing, shiftId, refresh]);

  if (error && !state) return <p className="mx-auto mt-24 max-w-[600px] px-4 text-center text-ink-soft">{error}</p>;
  if (!state) return <p className="mx-auto mt-24 text-center text-ink-faint">Opening the shift…</p>;

  const scenario = SCENARIOS.find((s) => s.id === state.shift.scenario);
  const progress = state.shift.total ? state.shift.cursor / state.shift.total : 0;
  const s = state.stats;
  const visible = state.incidents.filter((i) => lane === "all" || i.verdict === lane);
  const knownCount = state.incidents.filter((i) => i.verdict === "known").length;
  const unknownCount = state.incidents.length - knownCount;
  const c = state.comparison;

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.84rem] text-ink-faint">Watchfloor</p>
          <h1 className="font-display text-[clamp(2rem,4vw,2.9rem)] text-ink">{scenario?.title ?? state.shift.scenario}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className={`btn ${playing ? "" : "btn-primary"}`} onClick={() => setPlaying((p) => !p)} disabled={done.current && !playing}>
            {done.current ? "Replay finished" : playing ? "Pause replay" : "Resume replay"}
          </button>
          <button className="btn" onClick={onExit}>New shift</button>
        </div>
      </div>

      <div className="mt-6 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]" aria-label={`Replay ${Math.round(progress * 100)}% complete`}>
        <div className="h-full rounded-full bg-gradient-to-r from-teal via-mint to-gold transition-[width] duration-700" style={{ width: `${progress * 100}%` }} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Flows scored" value={fmt(s?.flowsScored)} sub={`of ${fmt(state.shift.total)}`} />
        <Stat label="Quietly suppressed" value={fmt(s?.suppressed)} />
        <Stat label="Known attack alerts" value={fmt(s?.known)} tone="known" />
        <Stat label="Unknown, investigate" value={fmt(s?.unknown)} tone="unknown" />
        <Stat label="Attacks let through" value={fmt(s?.attacksSuppressed)} tone={s && s.attacksSuppressed > 0 ? "attack" : undefined} sub="from dataset labels" />
        <Stat label="Scoring time" value={s && s.flowsScored ? `${Math.round(s.scoringMicros / s.flowsScored)} µs` : "–"} sub="per flow, in TypeScript" />
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="glass rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <h2 className="font-display text-[1.45rem] text-ink">Incident queue</h2>
            <div role="tablist" className="flex gap-1 rounded-full border border-hairline p-1 text-[0.8rem]">
              {([["all", `All ${state.incidents.length}`], ["known", `Known ${knownCount}`], ["unknown", `Unknown ${unknownCount}`]] as const).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={lane === k} onClick={() => setLane(k)}
                  className={`rounded-full px-3 py-1 transition-colors ${lane === k ? "bg-white/[0.08] text-ink" : "text-ink-faint hover:text-ink-soft"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <IncidentTable incidents={visible} reviewable={lane === "all" ? state.reviewable : -1} onOpen={setSelected} selected={selected} />
        </div>

        <aside className="flex flex-col gap-6">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display text-[1.35rem] text-ink">Analyst time</h2>
            <label className="mt-3 block text-[0.85rem] text-ink-soft" htmlFor="capacity">
              {capacity} minutes this shift, about {state.reviewable} reviews at {MINUTES_PER_INCIDENT} minutes each
            </label>
            <input id="capacity" type="range" min={6} max={240} step={6} value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))} className="mt-3 w-full accent-[var(--mint)]" />
            <p className="mt-5 text-[0.85rem] text-ink-soft">Real attack incidents reached within that time, out of {c.attacks}:</p>
            <ul className="mt-3 space-y-2.5">
              <Bar label="Nightwatch ranking" value={c.reached.nightwatch} max={Math.max(1, c.attacks)} tone="mint" />
              <Bar label="Arrival order" value={c.reached.fifo} max={Math.max(1, c.attacks)} />
              <Bar label="Model confidence only" value={c.reached.confidence} max={Math.max(1, c.attacks)} />
            </ul>
            <p className="mt-4 text-[0.78rem] leading-relaxed text-ink-faint">Scored against the dataset&rsquo;s ground-truth labels, which stay hidden on each incident until you triage it.</p>
          </div>
          <div className="glass rounded-2xl p-5 text-[0.85rem] text-ink-soft">
            <h2 className="font-display text-[1.35rem] text-ink">Reading the verdicts</h2>
            <p className="mt-3"><span className="text-known">Known</span> means one attack type fits and nothing else does.</p>
            <p className="mt-2"><span className="text-unknown">Unknown</span> means no single type fits, or the traffic looks like nothing in training. It is never silently dropped.</p>
            <p className="mt-2"><span className="text-quiet">Suppressed</span> flows look benign to both the classifier and the anomaly check.</p>
          </div>
        </aside>
      </div>

      {selected !== null && (
        <EvidenceDrawer incidentId={selected} onClose={() => setSelected(null)} onTriaged={refresh} />
      )}
    </section>
  );
}

function IncidentTable({ incidents, reviewable, onOpen, selected }: { incidents: Incident[]; reviewable: number; onOpen: (id: number) => void; selected: number | null }) {
  if (!incidents.length) {
    return <p className="px-5 py-14 text-center text-ink-faint">No incidents yet. Alerts appear here as the replay scores traffic.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[0.85rem]">
        <thead className="text-[0.76rem] text-ink-faint">
          <tr className="border-b border-hairline">
            <th className="px-5 py-2.5 font-normal">Rank</th>
            <th className="px-2 py-2.5 font-normal">Verdict</th>
            <th className="px-2 py-2.5 font-normal">Hosts</th>
            <th className="px-2 py-2.5 text-right font-normal">Flows</th>
            <th className="px-2 py-2.5 text-right font-normal">Signal</th>
            <th className="px-5 py-2.5 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i, idx) => (
            <Row key={i.id} i={i} rank={idx + 1} onOpen={onOpen} selected={selected === i.id} budgetEdge={reviewable > 0 && idx === reviewable - 1 && idx < incidents.length - 1} inBudget={reviewable < 0 || idx < reviewable} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ i, rank, onOpen, selected, budgetEdge, inBudget }: { i: Incident; rank: number; onOpen: (id: number) => void; selected: boolean; budgetEdge: boolean; inBudget: boolean }) {
  const fam = i.verdict === "unknown" ? "Unknown" : familyOf(i.predicted);
  return (
    <tr
      onClick={() => onOpen(i.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(i.id)}
      tabIndex={0}
      className={`cursor-pointer border-b transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.04] ${budgetEdge ? "border-mint/50" : "border-hairline"} ${selected ? "bg-white/[0.05]" : ""} ${inBudget ? "" : "opacity-55"}`}
    >
      <td className="px-5 py-3 font-mono text-ink-faint">{rank}</td>
      <td className="px-2 py-3">
        <span className={`inline-flex items-center gap-2 ${i.verdict === "unknown" ? "text-unknown" : "text-known"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {fam}
          {i.verdict === "known" && <span className="text-ink-faint">{i.predicted !== fam ? i.predicted : ""}</span>}
        </span>
      </td>
      <td className="px-2 py-3 font-mono text-[0.8rem] text-ink-soft">{i.srcIp} → {i.dstIp}</td>
      <td className="px-2 py-3 text-right font-mono text-ink-soft">{fmt(i.flowCount)}</td>
      <td className="px-2 py-3 text-right font-mono text-ink-soft">
        {i.verdict === "unknown" ? `anomaly ${i.maxAnomaly.toFixed(2)}` : `${Math.round(i.maxProbability * 100)}%`}
      </td>
      <td className="px-5 py-3"><StatusChip status={i.status} truth={i.truthFamily} /></td>
    </tr>
  );
}

export function StatusChip({ status, truth }: { status: Incident["status"]; truth: string | null }) {
  if (status === "open") return <span className="text-ink-faint">Open</span>;
  const label = { confirmed: "Confirmed", false_positive: "False positive", escalated: "Escalated" }[status];
  return (
    <span className="text-ink-soft">
      {label}
      {truth && <span className="ml-1.5 text-ink-faint">· dataset: {truth}</span>}
    </span>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "known" | "unknown" | "attack" }) {
  const color = tone === "known" ? "text-known" : tone === "unknown" ? "text-unknown" : tone === "attack" ? "text-attack" : "text-ink";
  return (
    <div className="bg-night-raise px-4 py-4">
      <dt className="text-[0.76rem] text-ink-faint">{label}</dt>
      <dd className={`mt-1 font-display text-[1.7rem] leading-none ${color}`}>{value}</dd>
      {sub && <dd className="mt-1.5 text-[0.72rem] text-ink-faint">{sub}</dd>}
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone?: "mint" }) {
  return (
    <li>
      <div className="flex justify-between text-[0.8rem]">
        <span className={tone ? "text-ink" : "text-ink-soft"}>{label}</span>
        <span className="font-mono text-ink-soft">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone ? "bg-mint" : "bg-white/30"}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </li>
  );
}

function fmt(n: number | undefined | null) {
  return n == null ? "0" : n.toLocaleString("en-US");
}
