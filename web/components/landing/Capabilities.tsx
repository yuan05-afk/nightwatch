import { CircleHelp, FileText, FlaskConical, Gauge, ListChecks, Scale, ShieldCheck, Siren } from "lucide-react";
import type { ReactNode } from "react";
import { Section, SectionHead } from "./Section";

const ITEMS: { title: string; body: string; icon: ReactNode }[] = [
  { title: "Rare attacks still count", body: "Weighted training keeps an 11-connection attack from vanishing under 1.6 million normal ones.", icon: <Scale size={20} strokeWidth={1.4} /> },
  { title: "Says when it isn\u2019t sure", body: "Calibrated confidence turns doubt into a \u201cneeds review\u201d label instead of a confident wrong answer.", icon: <CircleHelp size={20} strokeWidth={1.4} /> },
  { title: "Critical-to-Low priority", body: "Related alerts become one incident, ranked for the minutes you actually have.", icon: <Gauge size={20} strokeWidth={1.4} /> },
  { title: "Plain-language investigations", body: "What happened, why it was flagged, and the matching MITRE ATT&CK technique.", icon: <ListChecks size={20} strokeWidth={1.4} /> },
  { title: "Response playbooks", body: "First steps for each attack type: what to isolate, block and check.", icon: <Siren size={20} strokeWidth={1.4} /> },
  { title: "72-hour breach report", body: "Confirmed incidents become a draft with the NPC\u2019s required fields and the deadline.", icon: <FileText size={20} strokeWidth={1.4} /> },
  { title: "Tested against hidden attacks", body: "Each attack family is hidden from training once to measure what it misses.", icon: <FlaskConical size={20} strokeWidth={1.4} /> },
  { title: "Accounts and an audit trail", body: "Every decision is saved with who made it and when.", icon: <ShieldCheck size={20} strokeWidth={1.4} /> },
];

export function Capabilities() {
  return (
    <Section>
      <SectionHead title="What Nightwatch does">
        Everything a small IT team needs between &ldquo;something looks wrong&rdquo; and &ldquo;here&rsquo;s the report&rdquo;, built on
        a detector that handles rare attacks and says when it is unsure.
      </SectionHead>
      <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <li key={it.title} className="flex min-h-[200px] flex-col bg-night p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-hairline-strong bg-white/[0.03] text-ink-soft">
              {it.icon}
            </span>
            <h3 className="mt-auto pt-8 text-[0.98rem] text-ink">{it.title}</h3>
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-ink-faint">{it.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
