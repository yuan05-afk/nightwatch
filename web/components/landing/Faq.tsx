import { Section } from "./Section";

const QA = [
  {
    q: "Who is Nightwatch for?",
    a: "Organizations that hold personal data but can't staff a 24-hour security team: provincial hospitals and clinics, schools, local government offices, cooperatives and small businesses. One IT generalist should be able to run it.",
  },
  {
    q: "Does Nightwatch block traffic on its own?",
    a: "No. It ranks and explains; a person decides. Automatic blocking on a model's say-so would turn every false positive into an outage.",
  },
  {
    q: "What data was it trained on?",
    a: "The corrected release of CIC-IDS2017 from KU Leuven and UNSW Canberra: about 2.1 million labelled network flows from a university testbed, with the original dataset's labelling errors fixed.",
  },
  {
    q: "What happens with an attack it has never seen?",
    a: "If no known attack type fits at 95% confidence, or the traffic looks unlike anything in training, the verdict is Unknown and it goes to the queue. In our zero-day test it flagged every unseen DDoS and Heartbleed flow. It does not catch attacks built to look like ordinary traffic: unseen botnet and brute-force flows mostly passed as benign. The Method page lists every family.",
  },
  {
    q: "How do I know the numbers aren't inflated?",
    a: "Test traffic is later in time than training traffic, never a random shuffle; design choices were made on a separate calibration set; and the whole pipeline regenerates every number from the public dataset with one command.",
  },
  {
    q: "Can it read my own network's traffic?",
    a: "Yes, if you export flows with CICFlowMeter. The “Check your network” page scores an uploaded flow file with the same engine the console uses.",
  },
  {
    q: "Is the breach report ready to submit?",
    a: "No, it is a draft. Nightwatch fills in what the network evidence shows: the nature of the incident, the timeline, affected systems and the steps taken. Your Data Protection Officer adds which personal data was involved and the contact person, then files it with the National Privacy Commission.",
  },
  {
    q: "What happens to what I do here?",
    a: "Your monitoring sessions are private to your account. Decisions are stored with your user ID and written to an append-only audit log; IP addresses are stored only as salted hashes.",
  },
];

export function Faq() {
  return (
    <Section className="max-w-[860px]">
      <h2 className="text-center font-display text-[clamp(2.1rem,4.2vw,3.1rem)] text-ink">Questions judges ask</h2>
      <div className="mt-12 flex flex-col gap-3">
        {QA.map((item) => (
          <details key={item.q} className="faq group rounded-2xl border border-hairline bg-white/[0.015] px-5 open:bg-white/[0.03]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.98rem] text-ink">
              {item.q}
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-hairline-strong text-ink-soft transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-5 text-[0.9rem] leading-relaxed text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
