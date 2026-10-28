"use client";

import { useState } from "react";

type Row = { alpha_benign: number; benign_alert_rate: number; attack_missed: number };

const W = 640;
const H = 340;
const M = { l: 64, r: 24, t: 20, b: 52 };

function logScale(min: number, max: number, a: number, b: number) {
  const lmin = Math.log10(min);
  const lmax = Math.log10(max);
  // Rounded so Node and the browser emit identical SVG attributes (Math.log10 can differ in the last bit).
  return (v: number) => Math.round((a + ((Math.log10(Math.max(v, min)) - lmin) / (lmax - lmin)) * (b - a)) * 100) / 100;
}

const pct = (v: number) => `${(v * 100).toFixed(v < 0.001 ? 3 : 2)}%`;

/** Trade-off between the benign false-alert budget and missed attacks, one point per alpha. */
export function OperatingCurve({ rows, chosen }: { rows: Row[]; chosen: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const floor = 1e-5; // a 0 miss rate is drawn on the floor and labelled as such
  const xs = rows.map((r) => r.benign_alert_rate);
  const ys = rows.map((r) => Math.max(r.attack_missed, floor));
  const x = logScale(Math.min(...xs) * 0.8, Math.max(...xs) * 1.25, M.l, W - M.r);
  const y = logScale(floor * 0.8, Math.max(...ys) * 1.6, H - M.b, M.t);
  const sorted = [...rows].sort((a, b) => a.benign_alert_rate - b.benign_alert_rate);
  const xTicks = [0.002, 0.005, 0.01, 0.02, 0.04].filter((t) => t >= Math.min(...xs) * 0.8 && t <= Math.max(...xs) * 1.25);
  const yTicks = [1e-5, 1e-4, 1e-3, 1e-2].filter((t) => t <= Math.max(...ys) * 1.6);
  const h = hover !== null ? rows[hover] : null;

  return (
    <figure className="mt-8">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Benign alert rate against share of attack flows missed, for each benign alpha">
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.07)" />
              <text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="fill-[var(--ink-faint)] text-[11px]">{pct(t)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - M.b + 20} textAnchor="middle" className="fill-[var(--ink-faint)] text-[11px]">{pct(t)}</text>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" className="fill-[var(--ink-soft)] text-[12px]">Benign flows that raise an alert (log scale)</text>
          <text transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-[var(--ink-soft)] text-[12px]">Attack flows missed (log)</text>
          <path
            d={sorted.map((r, i) => `${i ? "L" : "M"}${x(r.benign_alert_rate)} ${y(Math.max(r.attack_missed, floor))}`).join(" ")}
            fill="none"
            stroke="var(--ink-faint)"
            strokeWidth={2}
          />
          {rows.map((r, i) => {
            const cx = x(r.benign_alert_rate);
            const cy = y(Math.max(r.attack_missed, floor));
            const isChosen = r.alpha_benign === chosen;
            return (
              <g key={r.alpha_benign}>
                <circle cx={cx} cy={cy} r={isChosen ? 7 : 5} fill={isChosen ? "var(--mint)" : "var(--ink-soft)"} stroke="#000" strokeWidth={2} />
                {isChosen && (
                  <text x={cx + 12} y={cy - 10} className="fill-[var(--ink)] text-[12px]">chosen policy, α = {r.alpha_benign}</text>
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={16}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`alpha ${r.alpha_benign}: ${pct(r.benign_alert_rate)} benign alerts, ${pct(r.attack_missed)} attacks missed`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="cursor-pointer outline-none"
                />
              </g>
            );
          })}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute rounded-xl border border-hairline-strong bg-[#0a0c0c] px-3 py-2 text-[0.78rem] text-ink-soft shadow-lg"
            style={{ left: `${(x(h.benign_alert_rate) / W) * 100}%`, top: `${(y(Math.max(h.attack_missed, floor)) / H) * 100}%`, transform: "translate(-50%, -125%)" }}
          >
            <p className="text-ink">α for benign = {h.alpha_benign}</p>
            <p>{pct(h.benign_alert_rate)} of benign flows alert</p>
            <p>{h.attack_missed === 0 ? "no" : pct(h.attack_missed)} attack flows missed</p>
          </div>
        )}
      </div>
      <figcaption className="mt-3 text-[0.8rem] text-ink-faint">
        Each point is one benign miscoverage level on the held-out test split. Moving left buys fewer false alerts with more
        missed attacks. The policy was fixed at α = {chosen} before this curve was computed.
      </figcaption>
      <details className="mt-3 text-[0.82rem] text-ink-soft">
        <summary className="cursor-pointer text-ink-faint">Show as a table</summary>
        <table className="mt-2 w-full max-w-[460px] text-left font-mono text-[0.78rem]">
          <thead className="text-ink-faint"><tr><th className="py-1 font-normal">α benign</th><th className="font-normal">benign alerts</th><th className="font-normal">attacks missed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.alpha_benign} className="border-t border-hairline"><td className="py-1">{r.alpha_benign}</td><td>{pct(r.benign_alert_rate)}</td><td>{pct(r.attack_missed)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
