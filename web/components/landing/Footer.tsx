import Link from "next/link";
import { LogoMark } from "../Logo";

export function Cta() {
  return (
    <section className="relative isolate mx-auto w-full max-w-[1120px] overflow-hidden px-4 py-28 text-center">
      <div aria-hidden className="cta-glow absolute inset-x-0 bottom-0 -z-10 h-[70%]" />
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-hairline-strong bg-white/[0.04] text-ink">
        <LogoMark size={30} />
      </span>
      <h2 className="mx-auto mt-8 max-w-[640px] font-display text-[clamp(2.2rem,4.6vw,3.4rem)] text-ink">Check a day of network traffic</h2>
      <p className="mx-auto mt-4 max-w-[520px] text-ink-soft">
        Replay a real attack day through the live model, investigate what it finds, and produce the incident report.
      </p>
      <div className="mt-8 flex justify-center">
        <Link href="/console" className="btn btn-primary">Open the console</Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-hairline">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 pt-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2.5 text-ink">
            <LogoMark />
            <span className="font-display text-[1.25rem]" style={{ fontWeight: 400 }}>Nightwatch</span>
          </span>
          <p className="mt-4 max-w-[340px] text-[0.85rem] leading-relaxed text-ink-faint">
            Network intrusion detection and incident response for teams without a security operations center, built for DataNova 2026, track DN-CY-01. Named for the barangay
            tanod, the watchman who walks the street at night.
          </p>
        </div>
        <FooterCol title="Product" links={[["Console", "/console"], ["Check your network", "/check"], ["Method", "/method"]]} />
        <FooterCol
          title="Sources"
          links={[
            ["Corrected CIC-IDS2017", "https://intrusion-detection.distrinet-research.be/CNS2022/"],
            ["Arp et al. 2022", "https://dodo-mlsec.org/"],
            ["Research log", "/method#sources"],
          ]}
        />
      </div>
      <p aria-hidden className="footer-word pointer-events-none mx-auto mt-16 select-none whitespace-nowrap text-center font-display leading-[0.85] text-ink">
        Watch what you haven&rsquo;t seen
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-[0.8rem] text-ink-faint">{title}</p>
      <ul className="mt-3 space-y-2 text-[0.88rem]">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("http") ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-ink">{label}</a>
            ) : (
              <Link href={href} className="text-ink-soft hover:text-ink">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
