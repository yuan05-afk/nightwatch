"use client";

import { useState } from "react";
import { PITFALLS } from "@/lib/pitfalls";
import { Section, SectionHead } from "./Section";

export function Pillars() {
  const [active, setActive] = useState(2);
  const p = PITFALLS[active];
  return (
    <Section>
      <SectionHead title="Checked against the ten known pitfalls">
        Arp and colleagues found that every one of 30 top-venue security ML papers fell into at least three of these traps. Here is
        where Nightwatch stands on each one, including the ones it can&rsquo;t fully escape.
      </SectionHead>

      <div className="pillar-floor mt-14 overflow-x-auto pb-2">
        <svg viewBox="0 0 1000 330" className="mx-auto block w-full min-w-[720px]" role="group" aria-label="Pitfall scorecard">
          <defs>
            <linearGradient id="pillar-front" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3f40" />
              <stop offset="1" stopColor="#0b0d0d" />
            </linearGradient>
            <linearGradient id="pillar-side" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#24282a" />
              <stop offset="1" stopColor="#060707" />
            </linearGradient>
          </defs>
          {PITFALLS.map((pit, i) => {
            const x = 60 + i * 92;
            const h = pit.status === "addressed" ? 190 : 120;
            const on = i === active;
            return (
              <g
                key={pit.id}
                tabIndex={0}
                role="button"
                aria-label={`${pit.id} ${pit.name}: ${pit.status}`}
                aria-pressed={on}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="cursor-pointer outline-none"
              >
                <Prism x={x} base={290} h={h} on={on} tone={pit.status === "addressed" ? "mint" : "gold"} />
                <text x={x + 30} y={318} textAnchor="middle" className="fill-[var(--ink-faint)] text-[13px]">{pit.id}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mx-auto mt-6 grid max-w-[760px] gap-2 rounded-2xl border border-hairline p-6 sm:grid-cols-[180px_1fr]" aria-live="polite">
        <div>
          <p className="text-[0.8rem] text-ink-faint">{p.id}</p>
          <p className="text-[1.05rem] text-ink">{p.name}</p>
          <p className={`mt-2 text-[0.8rem] ${p.status === "addressed" ? "text-mint" : "text-unknown"}`}>
            {p.status === "addressed" ? "Addressed" : "Disclosed, not solved"}
          </p>
        </div>
        <p className="text-[0.9rem] leading-relaxed text-ink-soft">{p.how}</p>
      </div>
    </Section>
  );
}

/** Isometric box: front, side and top faces. */
function Prism({ x, base, h, on, tone }: { x: number; base: number; h: number; on: boolean; tone: "mint" | "gold" }) {
  const w = 44;
  const d = 18;
  const top = base - h;
  const c = tone === "mint" ? "var(--mint)" : "var(--gold)";
  return (
    <g style={{ transition: "opacity .3s" }} opacity={on ? 1 : 0.62}>
      {on && <ellipse cx={x + w / 2 + d / 2} cy={base + 4} rx={46} ry={10} fill={c} opacity={0.18} />}
      <path d={`M${x} ${top} h${w} v${h} h-${w} Z`} fill="url(#pillar-front)" stroke={on ? c : "rgba(255,255,255,.14)"} />
      <path d={`M${x + w} ${top} l${d} -${d} v${h} l-${d} ${d} Z`} fill="url(#pillar-side)" stroke={on ? c : "rgba(255,255,255,.1)"} />
      <path d={`M${x} ${top} l${d} -${d} h${w} l-${d} ${d} Z`} fill={on ? c : "rgba(255,255,255,.22)"} opacity={on ? 0.9 : 1} />
    </g>
  );
}
