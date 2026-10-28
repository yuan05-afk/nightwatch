import { headline, pct } from "@/lib/reports";
import { Section, SectionHead } from "./Section";

export function Impact() {
  const h = headline();
  const tiles = [
    {
      value: pct(h.attackFlagged, 2),
      label: "of held-out attack flows raised an alert",
      note: "Known attack families, later in their own campaigns.",
    },
    {
      value: `${Math.round(h.compression)}×`,
      label: "fewer things to look at",
      note: `${h.alerts.toLocaleString("en-US")} flow alerts folded into ${h.incidents.toLocaleString("en-US")} incidents across five test days.`,
    },
    {
      value: pct(h.benignAlertRate, 2),
      label: "of benign flows raised an alert",
      note: "The false-alert budget, fixed before testing.",
    },
    {
      value: h.macroF1Attacks.toFixed(3),
      label: "macro-F1 across 14 attack classes",
      note: "Every class counts equally, including those with 11 flows.",
    },
  ];
  return (
    <Section>
      <SectionHead title="What it achieved on held-out traffic">
        Numbers from the published pipeline on traffic the model never trained on. The Method page shows how each was measured,
        including the results that aren&rsquo;t flattering.
      </SectionHead>
      <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.label} className="impact-tile relative overflow-hidden bg-night p-7 sm:p-9">
            <dt className="sr-only">{t.label}</dt>
            <dd className="font-display text-[clamp(2.6rem,5vw,3.6rem)] leading-none text-ink">{t.value}</dd>
            <dd className="mt-3 text-[0.95rem] text-ink-soft">{t.label}</dd>
            <dd className="mt-6 text-[0.8rem] text-ink-faint">{t.note}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
