import Link from "next/link";
import { AccountButton } from "./AccountButton";
import { MobileMenu } from "./MobileMenu";
import { Wordmark } from "./Logo";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/console", label: "Console" },
  { href: "/check", label: "Check your network" },
  { href: "/method", label: "Method" },
];

export function Nav() {
  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-[1120px] px-4">
      <nav className="nav-bar relative flex items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
        <Link href="/" aria-label="Nightwatch home">
          <Wordmark />
        </Link>
        <ul className="hidden items-center gap-7 text-[0.84rem] text-ink-soft md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <MobileMenu links={links} />
          <AccountButton />
        </div>
      </nav>
    </header>
  );
}
