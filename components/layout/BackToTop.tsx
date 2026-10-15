"use client";

import { ArrowUp } from "lucide-react";

/** Compact "Back to top" control in the footer legal bar. */
export default function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="inline-flex h-9 items-center gap-1.5 border border-[color:var(--ft-rule-strong)] px-3.5 text-[10.5px] font-[700] uppercase tracking-[0.14em] text-[color:var(--ft-fg-dim)] transition-colors duration-150 hover:border-[color:var(--ft-fg)] hover:bg-[color:var(--ft-tint)] hover:text-[color:var(--ft-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ft-fg)]"
      aria-label="Back to top of page"
    >
      Back to top
      <ArrowUp size={12} strokeWidth={2.6} aria-hidden />
    </button>
  );
}
