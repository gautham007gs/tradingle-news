/* ─────────────────────────────────────────────────────────────────────────────
   Site information architecture — single source of truth for the top nav,
   the "Browse all desks" deck and the footer.

   Every href here resolves to a real route. An earlier version advertised
   subsections that had no page behind them (/elections, /middle-east,
   /cricket, /ai-ml and twenty-odd more all returned 404), so a third of the
   navigation was dead. The fix was not to delete the desks — a reader expects
   them on a business-news site — but to give them pages: lib/desks.ts is now
   the registry, and app/(site)/[category]/page.tsx serves every slug in it,
   aggregating from categories, topics and search when the CMS has no category
   of that name.

   Desk groups, the desk dropdowns and the footer's editorial columns are all
   DERIVED from that registry below, so adding a desk in one file updates the
   nav, the deck, the drawer, the footer, /sitemap and sitemap.xml at once.

   Depth is capped at two levels on purpose: a desk row plus one panel of
   children. Deeper trees measurably hurt findability on content-heavy sites,
   and a news reader is scanning, not drilling.
   ────────────────────────────────────────────────────────────────────────── */

import {
  deskChildren,
  deskGroupLinks,
  getDesk,
} from "../../lib/desks";

export type NavChild = {
  label: string;
  href: string;
};

export type NavSection = {
  label: string;
  href: string;
  isLive?: boolean;
  children?: NavChild[];
};

/** The desk groups, straight from the registry. Four columns by design — the
    deck, the footer and /sitemap all lay these out in a four-up grid. */
export const deskGroups: { title: string; blurb: string; links: NavChild[] }[] =
  deskGroupLinks;

/** Reader tools — the deck's last column and the drawer's second block. */
export const readerLinks: NavChild[] = [
  { label: "Editors' Picks", href: "/editors-picks" },
  { label: "Topics A–Z", href: "/topics" },
  { label: "Newsletters", href: "/newsletters" },
  { label: "Archive", href: "/archive" },
  { label: "Location News", href: "/location" },
  { label: "Saved Articles", href: "/saved" },
  { label: "Search", href: "/search" },
  { label: "RSS Feed", href: "/rss" },
];

/** Masthead / company routes. Shown in the deck footer and the site footer. */
export const companyLinks: NavChild[] = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Write For Us", href: "/write-for-us" },
  { label: "Advertise", href: "/advertise" },
  { label: "Contact / Tip Us", href: "/contact" },
  { label: "Corrections", href: "/corrections" },
  { label: "Help & FAQ", href: "/help" },
];

/** Thin utility strip above the masthead on wide screens. */
export const utilityLinks: NavChild[] = [
  { label: "Newsletters", href: "/newsletters" },
  { label: "Topics", href: "/topics" },
  { label: "Archive", href: "/archive" },
  { label: "Advertise", href: "/advertise" },
  { label: "Contact", href: "/contact" },
];

/** The desk row. Eight items is the most that fits 1024px without wrapping, so
    the row is a hand-picked spine and the dropdowns (registry `children`) carry
    the rest; everything else lives in the deck. */
const INLINE_DESK_SLUGS = [
  "india",
  "world",
  "politics",
  "business",
  "markets",
  "technology",
  "sports",
  "opinion",
] as const;

/** Primary editorial desks — shared by the desk row, the deck and the drawer. */
export const primaryNavSections: NavSection[] = [
  { label: "Latest", href: "/" },
  ...INLINE_DESK_SLUGS.map((slug) => {
    const desk = getDesk(slug);
    const children = deskChildren(slug);
    return {
      label: desk?.label ?? slug,
      href: `/${slug}`,
      ...(children.length ? { children } : {}),
    };
  }),
];

/** Deck + drawer sections (the home shortcut is a separate affordance). */
export const menuNavSections: NavSection[] = primaryNavSections.filter(
  (section) => section.label !== "Latest",
);

/** Inline desk row on desktop. Eight items fit 1024px without wrapping. */
export const desktopInlineNav: NavSection[] = primaryNavSections;

export type FooterLink = { label: string; href: string };

export type FooterColumn = {
  /** Stable identifier used for keys/aria wiring; CMS-driven columns always carry one */
  id?: string;
  title: string;
  links: FooterLink[];
};

/** Single source of truth for site footer links (static fallback).
 *
 *  The four editorial columns are the desk groups verbatim, so the footer is a
 *  complete index of the section tree rather than a hand-kept subset that goes
 *  stale. Company and Reader Tools follow, making six columns — see the
 *  `xl:grid-cols-6` in Footer.tsx / FooterServer.tsx. */
export const footerColumns: FooterColumn[] = [
  ...deskGroups.map((group, i) => ({
    id: `col-desk-${i}`,
    title: group.title,
    /* "Latest" belongs at the top of the first column: it is the front page,
       and a reader scanning the footer for "where do I start" looks there. */
    links: i === 0 ? [{ label: "Latest", href: "/" }, ...group.links] : group.links,
  })),
  {
    id: "col-company",
    title: "Company",
    links: companyLinks,
  },
  {
    id: "col-more",
    title: "Reader Tools",
    links: [...readerLinks, { label: "Sitemap", href: "/sitemap" }],
  },
];

export const footerLegalLinks: FooterLink[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Cookie Preferences", href: "/cookies" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Copyright & DMCA", href: "/dmca" },
  { label: "Editorial Policy", href: "/editorial-policy" },
  { label: "Corrections Policy", href: "/corrections-policy" },
  { label: "Ownership & Funding", href: "/ownership" },
  { label: "Editorial Standards", href: "/editorial-standards" },
];

export const socialLinks = [
  { name: "Twitter", url: "https://twitter.com/tradinglenews" },
  { name: "Facebook", url: "https://facebook.com/tradinglenews" },
  { name: "Instagram", url: "https://instagram.com/tradinglenews" },
  { name: "LinkedIn", url: "https://linkedin.com/company/tradingle" },
  { name: "YouTube", url: "https://youtube.com/@tradinglenews" },
] as const;
