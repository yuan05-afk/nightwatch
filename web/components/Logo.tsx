// NIGHTWATCH mark: a watch-ring with a crescent eye. Single stroke so it reads at 16px.
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.25" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <path
        d="M15.6 6.2a6.6 6.6 0 1 0 2.2 8.9 5.2 5.2 0 0 1-2.2-8.9Z"
        fill="currentColor"
      />
      <circle cx="18.6" cy="5.4" r="1.1" fill="var(--gold)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <LogoMark />
      <span className="font-display text-[1.28rem] tracking-[-0.01em]" style={{ fontWeight: 400 }}>
        Nightwatch
      </span>
    </span>
  );
}
