"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Bookmark, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/* Styled with the same --nv-* variables as TopNav so the trigger sits on the
   dark masthead and the popover on the light panel ground. */
const TRIGGER =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1 border border-transparent px-1.5 text-[color:var(--nv-fg-dim)] transition-colors duration-150 hover:border-[color:var(--nv-rule-strong)] hover:bg-[color:var(--nv-tint)] hover:text-[color:var(--nv-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nv-fg)]";

const ITEM =
  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-[500] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:bg-[color:var(--nv-panel-tint)] hover:text-[color:var(--nv-panel-fg)]";

const UserMenu = () => {
  const { user, signOut, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <button type="button" onClick={openAuthModal} className={`${TRIGGER} w-9`} title="Sign in" aria-label="Sign in">
        <User size={18} aria-hidden />
      </button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={TRIGGER}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center bg-[color:var(--nv-fg)] text-[10px] font-[700] tracking-[0.04em] text-[color:var(--nv-bg)]"
        >
          {initials}
        </span>
        <ChevronDown
          size={12}
          aria-hidden
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="trd-nav-panel absolute right-0 top-[calc(100%+6px)] z-50 w-60 border border-[color:var(--nv-panel-rule)] bg-[color:var(--nv-panel-bg)] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-b-[color:var(--nv-panel-rule)] px-4 py-3">
            <p className="truncate text-[13px] font-[700] text-[color:var(--nv-panel-fg)]">{user.name}</p>
            <p className="truncate text-[11.5px] text-[color:var(--nv-panel-fg-mute)]">{user.email}</p>
          </div>

          <div className="py-1">
            <Link href="/saved" onClick={() => setOpen(false)} className={ITEM} role="menuitem">
              <Bookmark size={14} aria-hidden />
              Saved Articles
            </Link>
            <Link href="/newsletters" onClick={() => setOpen(false)} className={ITEM} role="menuitem">
              <Settings size={14} aria-hidden />
              Newsletter Preferences
            </Link>
          </div>

          <div className="border-t border-t-[color:var(--nv-panel-rule)] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className={ITEM}
            >
              <LogOut size={14} aria-hidden />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
