"use client";

import Link from "next/link";
import { useState } from "react";

/** Below md the nav links collapse into this disclosure; tapping a link closes it. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        className="btn"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <ul
          id="mobile-menu"
          className="absolute inset-x-4 top-full mt-2 rounded-2xl border border-[#1c2022] bg-[#0a0c0d] p-2 text-[0.95rem]"
        >
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block rounded-xl px-3 py-2.5 text-ink-soft hover:bg-[#14181a] hover:text-ink" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
