"use client";

/* ─────────────────────────────────────────────────────────────────────────────
   Top navigation — three stacked rows on desktop, one on phones.

   A. Utility strip (≥1024px)  — dateline, edition, masthead utility links
   B. Masthead                 — menu trigger, wordmark, search / theme / account
   C. Desk row (≥768px)        — the eight primary desks, each with a dropdown

   One trigger drives both overflow surfaces: below 768px it opens the drawer,
   at and above 768px it opens the "Browse all desks" deck. Two separate
   affordances (a hamburger and a grid button) were doing the same job before.

   Navigation is <Link>-based throughout. The previous revision routed every
   item through `window.location.assign()` inside a <button>, which meant a
   full document reload, no middle-click or open-in-new-tab, and nothing for a
   crawler to follow.

   Colours come from the --nv-* variables declared on .trd-nav in src/index.css
   so the dark bar and the light deck both invert correctly under .dark.
   ────────────────────────────────────────────────────────────────────────── */

import { Search, Menu, ChevronDown, X, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import UserMenu from "./UserMenu";
import { hostingerApi } from "@/lib/hostingerApi";
import { formatArticleTime } from "@/lib/articleMapper";
import {
  companyLinks,
  deskGroups,
  desktopInlineNav,
  menuNavSections,
  readerLinks,
  utilityLinks,
  type NavSection,
} from "@/lib/navConfig";
import { articlePath } from "@/lib/articlePaths";
import { rafThrottle } from "@/lib/rafThrottle";

type DynamicNavItem = {
  id?: string;
  label: string;
  href: string;
  type?: string;
  showInDesktopInline?: boolean;
  children?: { label: string; href: string }[];
};
type DynamicNavData = {
  primaryNav: DynamicNavItem[];
  footerColumns: unknown[];
  footerLegalLinks: unknown[];
  socialLinks: unknown[];
};

/* ── Shared class strings ───────────────────────────────────────────────── */

/** Desk-row link. The rule slides in from the left on hover and stays put on
    the active desk, which is cheaper to read than a colour change alone. */
const DESK_LINK =
  "group/desk relative inline-flex h-full items-center gap-1 whitespace-nowrap px-3 text-[12.5px] font-[600] leading-none tracking-[0.01em] text-[color:var(--nv-fg-dim)] transition-colors duration-150 hover:text-[color:var(--nv-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--nv-fg)] after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:bg-[color:var(--nv-fg)] after:transition-transform after:duration-200 hover:after:scale-x-100 lg:px-3.5 lg:text-[13px]";

const DESK_LINK_ACTIVE = "text-[color:var(--nv-fg)] after:scale-x-100";

/** 36px icon buttons in the masthead. 44px tap target via the padded row. */
const UTIL_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center border border-transparent text-[color:var(--nv-fg-dim)] transition-colors duration-150 hover:border-[color:var(--nv-rule-strong)] hover:bg-[color:var(--nv-tint)] hover:text-[color:var(--nv-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nv-fg)]";

const UTIL_BTN_ON =
  "border-[color:var(--nv-rule-strong)] bg-[color:var(--nv-tint)] text-[color:var(--nv-fg)]";

/** Links inside the deck / drawer / dropdown — all on the light ground. */
const PANEL_LINK =
  "block text-[13.5px] leading-[1.35] text-[color:var(--nv-panel-fg-dim)] transition-colors duration-150 hover:text-[color:var(--nv-panel-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nv-panel-fg)]";

const PANEL_HEAD =
  "mb-3 flex items-center gap-1.5 border-b-2 border-b-[color:var(--nv-panel-fg)] pb-2 text-[11px] font-[700] uppercase tracking-[0.14em] text-[color:var(--nv-panel-fg)]";

const TopNav = ({ navData }: { navData?: DynamicNavData | null } = {}) => {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cmsSearchResults, setCmsSearchResults] = useState<
    Array<{ title: string; category: string; slug?: string; timestamp?: string }>
  >([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  /** One trigger, two surfaces: drawer below 768px, deck at and above it. */
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [dateline, setDateline] = useState("");
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawerSearchRef = useRef<HTMLInputElement>(null);

  /* ── Resolved IA — CMS payload when present, static config otherwise ──── */
  const deskRow: NavSection[] = useMemo(
    () =>
      navData
        ? navData.primaryNav
            .filter((i) => i.showInDesktopInline)
            .map((i) => ({
              label: i.label,
              href: i.href,
              children: i.children?.map((c) => ({ label: c.label, href: c.href })),
            }))
        : desktopInlineNav,
    [navData],
  );

  const drawerSections: NavSection[] = useMemo(
    () =>
      navData
        ? navData.primaryNav
            .filter((i) => i.href !== "/")
            .map((i) => ({
              label: i.label,
              href: i.href,
              children: i.children?.map((c) => ({ label: c.label, href: c.href })),
            }))
        : menuNavSections,
    [navData],
  );

  /** Deck columns. The CMS payload carries no group blurbs, so when it drives
      the nav each section becomes its own column and the blurb is dropped. */
  const deckColumns = useMemo(() => {
    const fromCms = navData?.primaryNav.filter((i) => (i.children?.length ?? 0) > 0) ?? [];
    if (fromCms.length >= 2) {
      return fromCms.map((i) => ({
        title: i.label,
        blurb: "",
        href: i.href,
        links: (i.children ?? []).map((c) => ({ label: c.label, href: c.href })),
      }));
    }
    return deskGroups.map((g) => ({ title: g.title, blurb: g.blurb, href: "", links: g.links }));
  }, [navData]);

  /* ── Behaviour ─────────────────────────────────────────────────────────── */

  useEffect(() => setSelectedResultIndex(-1), [cmsSearchResults]);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setOpenDropdown(null);
    setExpandedGroup(null);
  }, []);

  const openDropdownFor = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };
  const scheduleDropdownClose = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 160);
  };

  useEffect(
    () => () => {
      if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    },
    [],
  );

  /* Route change closes every surface. */
  useEffect(() => {
    closeAll();
    setSearchOpen(false);
    setSearchQuery("");
    setCmsSearchResults([]);
  }, [pathname, closeAll]);

  /* Rendered client-side only — a server-rendered date would not match the
     reader's clock and would trip a hydration warning. */
  useEffect(() => {
    setDateline(
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date()),
    );
  }, []);

  useEffect(() => {
    const onScroll = rafThrottle(() => {
      const y = window.scrollY;
      if (searchOpen || menuOpen) {
        setNavHidden(false);
        lastScrollY.current = y;
        return;
      }
      const delta = y - lastScrollY.current;
      if (y < 80) {
        setNavHidden(false);
      } else if (delta < -10) {
        setNavHidden(false);
      } else if (delta > 10 && y > 160) {
        setNavHidden(false);
        setOpenDropdown(null);
      }
      lastScrollY.current = y;
    });
    setNavHidden(false);
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [pathname, searchOpen, menuOpen]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setCmsSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      hostingerApi
        .articles(`?q=${encodeURIComponent(q)}&limit=8`)
        .then(({ data }) => {
          setCmsSearchResults(
            data.map(
              (a: {
                title: string;
                slug: string;
                category_name?: string;
                published_at?: string;
                updated_at?: string;
              }) => ({
                title: a.title,
                slug: a.slug,
                category: a.category_name || "Latest",
                timestamp: formatArticleTime(a.published_at || a.updated_at),
              }),
            ),
          );
        })
        .catch(() => setCmsSearchResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSearchOpen(false);
      setSearchQuery("");
      setCmsSearchResults([]);
      closeAll();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeAll]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const searchHref = (q: string) => `/search?q=${encodeURIComponent(q)}`;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const q = searchQuery.trim();
    if (e.key === "Enter") {
      const picked = selectedResultIndex >= 0 ? cmsSearchResults[selectedResultIndex] : null;
      const href = picked?.slug
        ? articlePath({ slug: picked.slug, title: picked.title })
        : q
          ? searchHref(q)
          : null;
      if (!href) return;
      window.location.assign(href);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedResultIndex((i) => Math.min(i + 1, cmsSearchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedResultIndex((i) => Math.max(i - 1, -1));
    }
  };

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <>
      <header
        className={`trd-nav${navHidden ? " trd-nav--hidden" : ""}`}
        suppressHydrationWarning
      >
        {/* ══ A. UTILITY STRIP — ≥1024px ══════════════════════════════════ */}
        <div className="trd-nav-utility hidden border-b border-b-[color:var(--nv-rule)] lg:block" aria-hidden="true">
          <div className="trd-container flex h-[28px] items-center justify-between gap-6">
            <p
              className="truncate text-[10.5px] font-[500] uppercase tracking-[0.16em] text-[color:var(--nv-fg-mute)]"
              suppressHydrationWarning
            >
              <span suppressHydrationWarning>{dateline || " "}</span>
              <span aria-hidden className="px-2 opacity-40">
                ·
              </span>
              India Edition
            </p>
            <nav
              aria-label="Masthead utilities"
              className="flex items-center"
              style={{ columnGap: "20px" }}
            >
              {utilityLinks.filter((l) => l.href !== "/newsletters").map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[10.5px] font-[600] uppercase tracking-[0.14em] text-[color:var(--nv-fg-mute)] transition-colors duration-150 hover:text-[color:var(--nv-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nv-fg)]"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* ══ B. MASTHEAD ════════════════════════════════════════════════ */}
        <div className="trd-nav-masthead trd-container flex h-12 items-center gap-2 md:h-12 md:gap-3">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
              setOpenDropdown(null);
            }}
            className={`${UTIL_BTN} md:h-9 md:w-auto md:gap-2 md:px-3 ${menuOpen ? UTIL_BTN_ON : ""}`}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close sections menu" : "Browse all sections"}
          >
            {menuOpen ? <X size={19} aria-hidden /> : <Menu size={19} aria-hidden />}
            <span className="hidden text-[11px] font-[700] uppercase tracking-[0.14em] md:inline">
              Sections
            </span>
          </button>

          <span
            aria-hidden
            className="hidden h-6 w-px bg-[color:var(--nv-rule-strong)] md:block"
          />

          {/* Logo is itself the home link — wrapping it in another anchor
              would nest <a> inside <a>. */}
          <div className="flex shrink-0 items-center">
            <Logo size="lg" variant="footer" />
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/newsletters"
              className="mr-1 hidden h-9 items-center border border-[color:var(--nv-rule-strong)] px-3 text-[11px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-fg)] transition-colors duration-150 hover:bg-[color:var(--nv-fg)] hover:text-[color:var(--nv-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nv-fg)] lg:inline-flex"
            >
              Newsletters
            </Link>

            <button
              type="button"
              onClick={() => {
                setSearchOpen((v) => !v);
                setSearchQuery("");
                setCmsSearchResults([]);
                setMenuOpen(false);
              }}
              className={`${UTIL_BTN} ${searchOpen ? UTIL_BTN_ON : ""}`}
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X size={18} aria-hidden /> : <Search size={18} aria-hidden />}
            </button>

            <UserMenu />
          </div>
        </div>

        {/* ══ C. DESK ROW — ≥768px ═══════════════════════════════════════ */}
        <nav
          aria-label="Sections"
          className="trd-nav-desk-row hidden border-t border-t-[color:var(--nv-rule)] md:block"
        >
          <div className="trd-container flex h-[34px] items-stretch">
            {deskRow.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const open = openDropdown === item.label;
              return (
                <div
                  key={item.label}
                  className="relative flex items-stretch"
                  onMouseEnter={() => hasChildren && openDropdownFor(item.label)}
                  onMouseLeave={hasChildren ? scheduleDropdownClose : undefined}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className={`${DESK_LINK} ${isActive(item.href) ? DESK_LINK_ACTIVE : ""}`}
                      aria-haspopup="menu"
                      aria-expanded={open}
                      onClick={() => {
                        if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
                        setOpenDropdown((current) => (current === item.label ? null : item.label));
                      }}
                      onFocus={() => openDropdownFor(item.label)}
                    >
                      {item.label}
                      <ChevronDown size={11} aria-hidden className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <Link href={item.href} className={`${DESK_LINK} ${isActive(item.href) ? DESK_LINK_ACTIVE : ""}`}>
                      {item.label}
                    </Link>
                  )}

                  {hasChildren && open && (
                    <div
                      role="menu"
                      className="trd-nav-panel absolute left-0 top-full z-10 min-w-[210px] border border-[color:var(--nv-panel-rule)] bg-[color:var(--nv-panel-bg)] py-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
                      onMouseEnter={() => openDropdownFor(item.label)}
                      onMouseLeave={scheduleDropdownClose}
                    >
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`${PANEL_LINK} px-4 py-2 hover:bg-[color:var(--nv-panel-tint)]`}
                        >
                          {child.label}
                        </Link>
                      ))}
                      <Link
                        href={item.href}
                        className="mt-1.5 flex items-center gap-1.5 border-t border-t-[color:var(--nv-panel-rule)] px-4 pb-1 pt-2.5 text-[11px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-panel-fg)] transition-colors duration-150 hover:bg-[color:var(--nv-panel-tint)]"
                      >
                        All {item.label}
                        <ArrowRight size={12} aria-hidden />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* ══ SEARCH PANEL ═══════════════════════════════════════════════ */}
        {searchOpen && (
          <div
            role="search"
            className="trd-nav-panel border-t border-t-[color:var(--nv-panel-rule)] bg-[color:var(--nv-panel-bg)]"
          >
            <div className="trd-container py-4">
              <div className="flex items-center gap-2 border-b-2 border-b-[color:var(--nv-panel-fg)] pb-2">
                <Search size={18} aria-hidden className="shrink-0 text-[color:var(--nv-panel-fg-dim)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  role="combobox"
                  aria-expanded={searchQuery.trim().length > 0 && cmsSearchResults.length > 0}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  aria-controls="trd-nav-search-results"
                  aria-activedescendant={
                    selectedResultIndex >= 0 ? `trd-nav-result-${selectedResultIndex}` : undefined
                  }
                  aria-label="Search news"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search news, topics, people…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[16px] font-[500] text-[color:var(--nv-panel-fg)] outline-none placeholder:text-[color:var(--nv-panel-fg-mute)] sm:text-[18px]"
                />
                {searchQuery.trim() && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setCmsSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[color:var(--nv-panel-fg-dim)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
                    >
                      <X size={15} aria-hidden />
                    </button>
                    <Link
                      href={searchHref(searchQuery.trim())}
                      className="shrink-0 bg-[color:var(--nv-panel-fg)] px-4 py-2 text-[11px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-panel-bg)] transition-opacity hover:opacity-80"
                    >
                      Search
                    </Link>
                  </>
                )}
              </div>

              {searchQuery.trim() ? (
                <div id="trd-nav-search-results" role="listbox" aria-label="Search suggestions" className="mt-1">
                  {cmsSearchResults.length > 0 ? (
                    <>
                      {cmsSearchResults.map((r, i) => (
                        <Link
                          key={`${r.slug ?? i}`}
                          id={`trd-nav-result-${i}`}
                          role="option"
                          aria-selected={i === selectedResultIndex}
                          href={r.slug ? articlePath({ slug: r.slug, title: r.title }) : searchHref(searchQuery.trim())}
                          className={`flex items-baseline gap-3 border-b border-b-[color:var(--nv-panel-rule)] py-2.5 transition-colors ${
                            i === selectedResultIndex ? "bg-[color:var(--nv-panel-tint)]" : ""
                          } hover:bg-[color:var(--nv-panel-tint)]`}
                        >
                          <span className="w-[92px] shrink-0 text-[10px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-panel-fg-mute)]">
                            {r.category}
                          </span>
                          <span className="min-w-0 flex-1 text-[14px] font-[600] leading-[1.3] text-[color:var(--nv-panel-fg)]">
                            {r.title}
                          </span>
                          {r.timestamp && (
                            <span className="hidden shrink-0 text-[10.5px] tabular-nums text-[color:var(--nv-panel-fg-mute)] sm:block">
                              {r.timestamp}
                            </span>
                          )}
                        </Link>
                      ))}
                      <Link
                        href={searchHref(searchQuery.trim())}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-panel-fg)] hover:underline"
                      >
                        All results for &ldquo;{searchQuery.trim()}&rdquo;
                        <ArrowRight size={12} aria-hidden />
                      </Link>
                    </>
                  ) : (
                    <p className="py-4 text-[13px] text-[color:var(--nv-panel-fg-mute)]">
                      No results for &ldquo;{searchQuery.trim()}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-[10.5px] font-[700] uppercase tracking-[0.14em] text-[color:var(--nv-panel-fg-mute)]">
                    Popular
                  </span>
                  {["Markets", "India", "Economy", "Technology", "Crypto", "Opinion"].map((t) => (
                    <Link
                      key={t}
                      href={searchHref(t)}
                      className="border border-[color:var(--nv-panel-rule)] px-2.5 py-1 text-[11.5px] font-[600] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:border-[color:var(--nv-panel-fg)] hover:text-[color:var(--nv-panel-fg)]"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ BROWSE ALL DESKS — deck, ≥768px ════════════════════════════ */}
        {menuOpen && (
          <div
            id="trd-nav-deck"
            className="trd-nav-panel hidden max-h-[calc(100dvh-var(--nav-height))] overflow-y-auto border-t border-t-[color:var(--nv-panel-rule)] bg-[color:var(--nv-panel-bg)] md:block"
          >
            <div className="trd-container py-7 lg:py-8">
              <div className="mb-6 flex items-end justify-between gap-6 border-b border-b-[color:var(--nv-panel-rule)] pb-4">
                <div>
                  <p className="text-[11px] font-[700] uppercase tracking-[0.18em] text-[color:var(--nv-panel-fg)]">
                    Browse all desks
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.4] text-[color:var(--nv-panel-fg-mute)]">
                    Sixteen desks, one index. Every link opens a live section.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close sections menu"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[color:var(--nv-panel-rule)] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:border-[color:var(--nv-panel-fg)] hover:text-[color:var(--nv-panel-fg)]"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              {/* Two columns on tablets, three at 1024px, all five at 1280px.
                  A hairline separates the columns rather than a card border —
                  five boxed panels read as a control surface, not an index. */}
              <div className="grid gap-x-8 gap-y-7 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-7">
                {deckColumns.map((col, i) => (
                  <div
                    key={col.title}
                    className={`border-[color:var(--nv-panel-rule)] ${
                      i % 2 === 1 ? "md:border-l md:pl-8" : ""
                    } ${i % 3 === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-8"} ${
                      i === 0 ? "xl:border-l-0 xl:pl-0" : "xl:border-l xl:pl-7"
                    }`}
                  >
                    <p className={PANEL_HEAD}>{col.title}</p>
                    {col.blurb && (
                      <p className="mb-3 text-[12px] leading-[1.4] text-[color:var(--nv-panel-fg-mute)]">
                        {col.blurb}
                      </p>
                    )}
                    <ul className="space-y-2">
                      {col.links.map((l) => (
                        <li key={`${col.title}-${l.href}`}>
                          <Link
                            href={l.href}
                            className={`${PANEL_LINK} font-[600] ${
                              isActive(l.href) ? "text-[color:var(--nv-panel-fg)] underline decoration-2 underline-offset-4" : ""
                            }`}
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {col.href && (
                      <Link
                        href={col.href}
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-panel-fg)] hover:underline"
                      >
                        All {col.title}
                        <ArrowRight size={11} aria-hidden />
                      </Link>
                    )}
                  </div>
                ))}

                {/* Reader tools always ride at the end of the deck. */}
                <div className="border-[color:var(--nv-panel-rule)] md:border-l md:pl-8 lg:border-l lg:pl-8 xl:border-l xl:pl-7">
                  <p className={PANEL_HEAD}>Reader Tools</p>
                  <ul className="space-y-2">
                    {readerLinks.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className={`${PANEL_LINK} font-[600]`}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Masthead row — company routes, kept out of the desk grid so
                  editorial and corporate links never sit in the same column. */}
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-t-[color:var(--nv-panel-rule)] pt-4">
                <span className="text-[10.5px] font-[700] uppercase tracking-[0.16em] text-[color:var(--nv-panel-fg-mute)]">
                  Tradingle
                </span>
                {companyLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-[12.5px] font-[500] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Scrim — closes the deck / search on a click outside. */}
      {(searchOpen || menuOpen) && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => {
            setSearchOpen(false);
            setSearchQuery("");
            setCmsSearchResults([]);
            closeAll();
          }}
          className="fixed inset-0 z-[55] cursor-default bg-black/45 backdrop-blur-[1px] md:z-[45]"
        />
      )}

      {/* ══ DRAWER — <768px ══════════════════════════════════════════════ */}
      <aside
        aria-label="Sections"
        aria-hidden={!menuOpen}
        className={`trd-nav-panel fixed inset-y-0 left-0 z-[70] flex w-[88%] max-w-[400px] flex-col bg-[color:var(--nv-panel-bg)] shadow-[10px_0_40px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-b-[color:var(--nv-panel-fg)] px-4">
          <p className="text-[11px] font-[700] uppercase tracking-[0.18em] text-[color:var(--nv-panel-fg)]">
            Sections
          </p>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-[color:var(--nv-panel-fg-dim)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Search first — on a phone it is the fastest route to a story. */}
          <form
            action="/search"
            method="get"
            className="flex items-center gap-2 border-b border-b-[color:var(--nv-panel-rule)] px-4 py-3"
          >
            <Search size={16} aria-hidden className="shrink-0 text-[color:var(--nv-panel-fg-mute)]" />
            <input
              ref={drawerSearchRef}
              name="q"
              type="search"
              placeholder="Search Tradingle"
              aria-label="Search news"
              className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] text-[color:var(--nv-panel-fg)] outline-none placeholder:text-[color:var(--nv-panel-fg-mute)]"
            />
            <button
              type="submit"
              className="shrink-0 bg-[color:var(--nv-panel-fg)] px-3 py-2 text-[10.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--nv-panel-bg)]"
            >
              Go
            </button>
          </form>

          {/* Desk accordions. Rows are 48px tall so they clear the 44px
              minimum tap target on the smallest phones and foldable covers. */}
          <nav aria-label="Desks">
            {drawerSections.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const expanded = expandedGroup === item.label;
              return (
                <div key={item.label} className="border-b border-b-[color:var(--nv-panel-rule)]">
                  <div className="flex items-stretch">
                    <Link
                      href={item.href}
                      className={`flex min-h-[48px] flex-1 items-center px-4 text-[15px] font-[600] tracking-[-0.005em] transition-colors ${
                        isActive(item.href)
                          ? "text-[color:var(--nv-panel-fg)]"
                          : "text-[color:var(--nv-panel-fg-dim)]"
                      } hover:text-[color:var(--nv-panel-fg)]`}
                    >
                      {isActive(item.href) && (
                        <span
                          aria-hidden
                          className="mr-2 inline-block h-3.5 w-[3px] bg-[color:var(--nv-panel-fg)]"
                        />
                      )}
                      {item.label}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(expanded ? null : item.label)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Hide" : "Show"} ${item.label} subsections`}
                        className="inline-flex w-12 items-center justify-center border-l border-l-[color:var(--nv-panel-rule)] text-[color:var(--nv-panel-fg-mute)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
                      >
                        <ChevronDown
                          size={16}
                          aria-hidden
                          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                  {hasChildren && expanded && (
                    <ul className="border-t border-t-[color:var(--nv-panel-rule)] bg-[color:var(--nv-panel-tint)] py-1">
                      {item.children!.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="flex min-h-[42px] items-center pl-8 pr-4 text-[13.5px] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Reader tools — two columns so eight items cost four rows. */}
          <div className="border-b border-b-[color:var(--nv-panel-rule)] px-4 py-4">
            <p className="mb-2.5 text-[10.5px] font-[700] uppercase tracking-[0.16em] text-[color:var(--nv-panel-fg-mute)]">
              Reader Tools
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              {readerLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-[34px] items-center text-[13px] font-[500] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 py-4">
            <p className="mb-2.5 text-[10.5px] font-[700] uppercase tracking-[0.16em] text-[color:var(--nv-panel-fg-mute)]">
              Tradingle
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-[34px] items-center text-[13px] font-[500] text-[color:var(--nv-panel-fg-dim)] transition-colors hover:text-[color:var(--nv-panel-fg)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </aside>
    </>
  );
};

export default TopNav;
