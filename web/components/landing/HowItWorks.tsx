"use client";

import { useState } from "react";
import { Section, SectionHead } from "./Section";

const STEPS = [
  {
    title: "Monitor",
    body: "Export flow logs from the router or firewall you already have (CICFlowMeter format), or replay a recorded day. Nothing to install on every computer.",
    visual: "group",
  },
  {
    title: "Detect",
    body: "A detector trained on 2.1 million labelled connections names known attacks. When nothing fits with 95% confidence, it says \u201cneeds review\u201d instead of guessing.",
    visual: "set",
  },
  {
    title: "Prioritize",
    body: "Alerts from the same attacker and target become one incident, rated Critical to Low. On the held-out Friday, 65,728 alerts became 126 incidents.",
    visual: "queue",
  },
  {
    title: "Investigate",
    body: "Each incident explains what happened in plain words, names the MITRE ATT&CK technique, shows the evidence, and lists the first response steps.",
    visual: "bars",
  },
  {
    title: "Report",
    body: "Your decisions become a draft incident report with the four fields the National Privacy Commission asks for and the 72-hour deadline worked out.",
    visual: "log",
  },
] as const;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  return (
    <Section>
      <SectionHead id="how" title="How it works">
        From &ldquo;something looks wrong&rdquo; to a report you can file, in five steps a one-person IT team can follow.
      </SectionHead>

      <div className="mt-16 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <ol className="relative">
          <span aria-hidden className="absolute bottom-3 left-[13px] top-3 w-px bg-hairline" />
          {STEPS.map((s, i) => {
            const on = i === active;
            return (
              <li key={s.title} className="relative">
                <button
                  onClick={() => setActive(i)}
                  aria-expanded={on}
                  className="flex w-full items-start gap-4 py-3 text-left"
                >
                  <span
                    className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.78rem] transition-colors ${
                      on ? "border-mint bg-mint text-night" : "border-hairline-strong bg-night text-ink-soft"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className={`text-[1.02rem] transition-colors ${on ? "text-ink" : "text-ink-soft"}`}>{s.title}</span>
                    {on && <span className="mt-2 max-w-[420px] text-[0.88rem] leading-relaxed text-ink-faint">{s.body}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="iso-stage" aria-hidden>
          <div className="iso">
            <div className="iso-plane iso-plane-3" />
            <div className="iso-plane iso-plane-2" />
            <div key={step.title} className="iso-plane iso-card">
              <IsoVisual kind={step.visual} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function IsoVisual({ kind }: { kind: (typeof STEPS)[number]["visual"] }) {
  switch (kind) {
    case "bars":
      return (
        <div className="flex h-full items-end gap-2.5 p-7">
          {[38, 72, 54, 90, 28, 64, 46].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${h}%`, background: i === 3 ? "var(--mint)" : undefined }} />
          ))}
        </div>
      );
    case "set":
      return (
        <div className="flex h-full flex-wrap content-center items-center justify-center gap-2.5 p-6">
          {["DoS Hulk", "Benign", "PortScan", "Botnet"].map((c, i) => (
            <span key={c} className={`rounded-full border px-3 py-1 text-[0.78rem] ${i === 0 ? "border-mint text-mint" : "border-hairline-strong text-ink-faint line-through"}`}>{c}</span>
          ))}
          <span className="mt-2 w-full text-center font-display text-[1.6rem] text-unknown">?</span>
        </div>
      );
    case "group":
      return (
        <div className="grid h-full grid-cols-8 content-center gap-2 p-7">
          {Array.from({ length: 32 }, (_, i) => (
            <span key={i} className={`aspect-square rounded-full ${i % 9 === 0 ? "bg-mint" : i % 7 === 0 ? "bg-unknown" : "bg-white/15"}`} />
          ))}
        </div>
      );
    case "queue":
      return (
        <div className="flex h-full flex-col justify-center gap-2 p-6">
          {[0.95, 0.8, 0.7, 0.45, 0.3].map((w, i) => (
            <div key={i} className={`flex items-center gap-2 ${i > 2 ? "opacity-40" : ""}`}>
              <span className="w-4 font-mono text-[0.7rem] text-ink-faint">{i + 1}</span>
              <span className="h-2 rounded-full bg-white/20" style={{ width: `${w * 100}%`, background: i === 0 ? "var(--mint)" : undefined }} />
              {i === 2 && <span className="sr-only">review budget ends here</span>}
            </div>
          ))}
          <span className="mt-1 h-px w-full bg-mint/60" />
        </div>
      );
    case "log":
      return (
        <div className="flex h-full flex-col justify-center gap-2.5 p-6 font-mono text-[0.72rem] text-ink-soft">
          <span className="text-ink">Security incident report</span>
          <span><span className="text-unknown">notify NPC by</span> 72h after discovery</span>
          <span><span className="text-mint">2 confirmed</span>, 1 escalated, T1071</span>
        </div>
      );
  }
}
