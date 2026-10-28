import { Section, SectionHead } from "./Section";

const STATS = [
  {
    value: "13 million",
    text: "PhilHealth members' records compromised when Medusa ransomware hit in September 2023.",
    source: "Reported by GMA News; ACM case study, 2024",
    href: "https://dl.acm.org/doi/10.1145/3700706.3700711",
  },
  {
    value: "46%",
    text: "of alerts in security operations centers turn out to be false alarms.",
    source: "Microsoft and Omdia, State of the SOC, 2026",
    href: "https://www.microsoft.com/en-us/security/blog/2026/02/17/unify-now-or-pay-later-new-research-exposes-the-operational-cost-of-a-fragmented-soc/",
  },
  {
    value: "72 hours",
    text: "to notify the National Privacy Commission after discovering a personal data breach.",
    source: "NPC Circular 16-03, Data Privacy Act of 2012",
    href: "https://privacy.gov.ph/wp-content/uploads/2022/01/sgd-npc-circular-16-03-personal-data-breach-management.pdf",
  },
  {
    value: "25%+",
    text: "of flows in the most-used intrusion benchmark were mislabeled or malformed.",
    source: "Engelen, Rimmer and Joosen, IEEE SPW 2021",
    href: "https://intrusion-detection.distrinet-research.be/WTMC2021/",
  },
];

export function Problem() {
  return (
    <Section>
      <SectionHead title={<>Attackers work nights. Most organizations can&rsquo;t.</>}>
        PhilHealth&rsquo;s antivirus licence had lapsed months before the 2023 attack. Hospitals, schools and local governments face
        the same attackers with no 24-hour security team, yet the law still gives them 72 hours to report a breach. Security
        operations centers are priced for banks, and detectors that score 99% in the lab bury the few people these teams have in
        false alarms.
      </SectionHead>
      <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.value} className="flex flex-col bg-night p-6">
            <dt className="font-display text-[2.8rem] leading-none text-ink">{s.value}</dt>
            <dd className="mt-4 text-[0.92rem] text-ink-soft">{s.text}</dd>
            <dd className="mt-auto pt-6 text-[0.74rem] text-ink-faint">
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-ink-soft hover:underline">
                {s.source}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
