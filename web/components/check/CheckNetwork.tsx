"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { familyInfo } from "@/lib/security";

type Result = {
  rows: number;
  truncated: boolean;
  skipped: number;
  counts: { known: number; unknown: number; suppressed: number };
  incidents: { verdict: "known" | "unknown"; predicted: string; family: string; srcIp: string; dstIp: string; dstPort: number; flows: number; maxP: number }[];
  totalIncidents: number;
  microsPerFlow: number;
};

const SAMPLE = "/samples/nightwatch-sample-flows.csv";

export function CheckNetwork() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState<number | null>(0);

  async function submit(body: Blob, label: string) {
    setPending(true);
    setError(null);
    setResult(null);
    setName(label);
    const res = await fetch("/api/check", { method: "POST", headers: { "content-type": "text/csv" }, body });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (res.status === 401) return router.push("/auth/sign-in");
    if (!res.ok) return setError(data.error ?? "Couldn't check that file. Try again.");
    setResult(data);
    setOpen(0);
  }

  async function useSample() {
    const res = await fetch(SAMPLE);
    submit(await res.blob(), "nightwatch-sample-flows.csv (sample)");
  }

  return (
    <section className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-10">
      <p className="text-[0.82rem] text-ink-faint">Check your network</p>
      <h1 className="mt-1 text-[1.9rem] font-semibold tracking-[-0.02em] text-ink">Scan your own flow logs</h1>
      <p className="mt-2 max-w-[700px] text-[0.95rem] text-ink-soft">
        Export network flows from your router, firewall or a packet capture with CICFlowMeter, then upload the CSV. Nightwatch scores
        every connection with the same model the console uses. The file is processed in memory and never stored.
      </p>

      <div className="panel mt-6 flex flex-wrap items-center gap-3 p-5">
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) submit(f, f.name);
            e.target.value = "";
          }}
        />
        <button className="app-btn app-btn-primary" disabled={pending} onClick={() => input.current?.click()}>Upload a CSV file</button>
        <button className="app-btn" disabled={pending} onClick={useSample}>Use the sample file</button>
        <span className="text-[0.82rem] text-ink-faint">Up to 5 MB or 20,000 connections. <a href={SAMPLE} download className="underline underline-offset-4 hover:text-ink-soft">Download the sample</a> to see the format.</span>
      </div>

      {pending && <p className="mt-6 text-ink-soft">Scanning {name}…</p>}
      {error && <p role="alert" className="mt-6 rounded-md border border-attack/50 p-4 text-[0.9rem] text-attack">{error}</p>}

      {result && (
        <div className="mt-6 space-y-5">
          <p className="text-[0.85rem] text-ink-faint">
            Results for <span className="text-ink-soft">{name}</span>: {result.rows.toLocaleString("en-US")} connections scanned at{" "}
            {Math.round(result.microsPerFlow)} µs each{result.truncated ? " (file truncated at 20,000 rows)" : ""}{result.skipped ? `, ${result.skipped} malformed rows skipped` : ""}.
          </p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat k="Incidents to review" v={result.totalIncidents} strong />
            <Stat k="Recognized attack connections" v={result.counts.known} />
            <Stat k="Unusual, need review" v={result.counts.unknown} />
            <Stat k="Cleared as normal" v={result.counts.suppressed} />
          </dl>

          {result.incidents.length === 0 ? (
            <p className="panel p-5 text-[0.92rem] text-ink-soft">Nothing suspicious found in this file. Keep checking regularly; quiet days are the normal case.</p>
          ) : (
            <div className="panel">
              <div className="panel-head px-4 py-3">
                <h2 className="text-[1.02rem] font-semibold text-ink">Incidents, most urgent first</h2>
                <p className="text-[0.78rem] text-ink-faint">Click a row for what it means and what to do.</p>
              </div>
              <ul>
                {result.incidents.map((i, n) => {
                  const info = familyInfo(i.family);
                  return (
                    <li key={`${i.family}-${i.srcIp}-${i.dstIp}`} className="border-b border-[#1c2022] last:border-0">
                      <button onClick={() => setOpen(open === n ? null : n)} aria-expanded={open === n} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 text-left hover:bg-[#111415] sm:grid-cols-[90px_1fr_320px_110px]">
                        <span className={`sev sev-${info.severity} justify-self-start`}>{info.severity}</span>
                        <span>
                          <span className="block text-[0.9rem] text-ink">{i.verdict === "unknown" ? "Unrecognized activity" : i.predicted}</span>
                          <span className="block font-mono text-[0.72rem] text-ink-faint">{info.attack.id === "Unmapped" ? "needs review" : info.attack.id}</span>
                        </span>
                        <span className="hidden whitespace-nowrap font-mono text-[0.8rem] text-ink-soft sm:block">{i.srcIp} → {i.dstIp}:{i.dstPort}</span>
                        <span className="text-right font-mono text-[0.8rem] text-ink-soft">{i.flows.toLocaleString("en-US")} conn</span>
                      </button>
                      {open === n && (
                        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[0.82rem] font-semibold text-ink">What it means</p>
                            <p className="mt-1 text-[0.86rem] text-ink-soft">{info.plain}</p>
                          </div>
                          <div>
                            <p className="text-[0.82rem] font-semibold text-ink">What to do first</p>
                            <ol className="mt-1 list-decimal space-y-1 pl-5 text-[0.86rem] text-ink-soft">
                              {info.respond(i.srcIp, i.dstIp, i.dstPort).map((s) => <li key={s}>{s}</li>)}
                            </ol>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="text-[0.82rem] text-ink-faint">
            Want to record decisions and produce an incident report? <Link href="/console" className="text-ink-soft underline underline-offset-4 hover:text-ink">Open the console</Link>.
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
  return (
    <div className="panel px-3.5 py-3">
      <dt className="text-[0.76rem] text-ink-faint">{k}</dt>
      <dd className={`mt-1 font-mono text-[1.35rem] font-medium leading-none ${strong ? "text-mint" : "text-ink"}`}>{v.toLocaleString("en-US")}</dd>
    </div>
  );
}
