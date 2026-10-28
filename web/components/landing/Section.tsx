import type { ReactNode } from "react";

/** Reference layout: serif title on the left, a short paragraph on the right. */
export function SectionHead({ title, children, id }: { title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div id={id} className="grid scroll-mt-28 gap-5 md:grid-cols-[1.1fr_1fr] md:items-end">
      <h2 className="font-display text-[clamp(2.1rem,4.2vw,3.3rem)] text-ink">{title}</h2>
      {children && <p className="max-w-[460px] text-[0.95rem] leading-relaxed text-ink-soft md:justify-self-end">{children}</p>}
    </div>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-[1120px] px-4 py-24 sm:py-28 ${className}`}>{children}</section>;
}
