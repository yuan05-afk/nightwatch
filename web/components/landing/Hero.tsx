import Link from "next/link";
import { Bot, Bug, Globe, KeyRound, Radar, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";

type Orb = { label: string; icon: ReactNode; className: string; unknown?: boolean };

// Attack families the model knows, placed on the orbit lines; the gold orb is the one it doesn't.
const ORBS: Orb[] = [
  { label: "DoS and DDoS", icon: <ServerCrash size={18} strokeWidth={1.5} />, className: "left-[7%] top-[24%] [animation-delay:-2s]" },
  { label: "Port scans", icon: <Radar size={18} strokeWidth={1.5} />, className: "left-[13%] top-[58%] [animation-delay:-5s]" },
  { label: "Brute force", icon: <KeyRound size={18} strokeWidth={1.5} />, className: "right-[9%] top-[20%] [animation-delay:-1s]" },
  { label: "Botnet traffic", icon: <Bot size={18} strokeWidth={1.5} />, className: "right-[6%] top-[52%] [animation-delay:-4s]" },
  { label: "Web injection", icon: <Globe size={18} strokeWidth={1.5} />, className: "left-[27%] top-[12%] [animation-delay:-3s] hidden lg:grid" },
  { label: "Infiltration", icon: <Bug size={18} strokeWidth={1.5} />, className: "right-[25%] top-[9%] [animation-delay:-6s] hidden lg:grid" },
  { label: "Never seen before", icon: <span className="font-display text-[1.35rem] leading-none">?</span>, className: "right-[19%] top-[66%] [animation-delay:-2.5s]", unknown: true },
];

export function Hero() {
  return (
    <section className="hero grain relative isolate -mt-[76px] flex min-h-[100svh] flex-col items-center overflow-hidden pt-[76px]">
      {/* sky haze and light shafts */}
      <div aria-hidden className="hero-haze absolute inset-0 -z-10" />
      <div aria-hidden className="hero-shafts absolute inset-x-0 top-0 -z-10 h-[70%]" />

      {/* orbit lines */}
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
        <path d="M-80 120 C 320 260, 520 520, 380 980" stroke="white" strokeOpacity="0.09" />
        <path d="M1520 90 C 1110 250, 930 520, 1080 980" stroke="white" strokeOpacity="0.09" />
        <path d="M-60 520 C 300 430, 1140 430, 1500 540" stroke="white" strokeOpacity="0.05" />
        <circle cx="236" cy="246" r="2.5" fill="white" fillOpacity="0.8" />
        <circle cx="1196" cy="214" r="2.5" fill="white" fillOpacity="0.8" />
        <circle cx="1260" cy="640" r="2" fill="white" fillOpacity="0.6" />
        <circle cx="168" cy="700" r="2" fill="white" fillOpacity="0.6" />
      </svg>

      {/* floating family orbs */}
      {ORBS.map((o) => (
        <span
          key={o.label}
          title={o.label}
          aria-label={o.label}
          role="img"
          className={`hero-orb absolute z-0 grid h-14 w-14 place-items-center rounded-full ${o.unknown ? "hero-orb-unknown text-unknown" : "text-ink-soft"} ${o.className}`}
        >
          {o.icon}
        </span>
      ))}

      <div className="hero-copy relative z-10 mx-auto mt-[18vh] flex max-w-[860px] flex-col items-center px-5 text-center sm:mt-[20vh]">
        <h1 className="font-display text-[clamp(2.6rem,6.4vw,5rem)] text-ink">
          The intrusion watch that knows what it hasn&rsquo;t seen
        </h1>
        <p className="mt-6 max-w-[600px] text-[1.02rem] leading-relaxed text-ink-soft [text-wrap:pretty]">
          Nightwatch names the attacks it recognizes, says <span className="text-unknown">Unknown</span> when
          traffic matches nothing it was trained on, and ranks incidents for the analyst time you actually have.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/watchfloor" className="btn btn-primary">
            Enter the Watchfloor
            <span className="btn-glyph" aria-hidden>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 6.5l5-5M2.5 1.5h4v4" stroke="currentColor" strokeWidth="1.2" /></svg>
            </span>
          </Link>
          <Link href="/method" className="btn">
            Read the method
          </Link>
        </div>
      </div>

      {/* aurora horizon */}
      <div aria-hidden className="hero-horizon pointer-events-none absolute left-1/2 top-[74%] -z-10 aspect-square w-[170vw] rounded-full sm:top-[74%] sm:w-[150vw]" />
    </section>
  );
}
