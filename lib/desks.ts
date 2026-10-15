/* ─────────────────────────────────────────────────────────────────────────────
   Desk registry — the newsroom's section taxonomy in one place.

   Why this exists
   ───────────────
   The IA used to be pinned to "the sixteen categories the CMS happens to
   publish", because /[category] calls notFound() for anything else. That made
   the navigation a mirror of the database rather than of the newsroom, and it
   meant obvious desks a reader expects on a business-news site (Companies,
   Banking, IPO, Commodities, Money, Auto, Energy, Real Estate, Elections,
   Defence, Health, Climate, Education, Jobs, Mutual Funds) simply did not
   exist.

   A desk here is an editorial destination, not a database row. Each one
   declares where its stories come from, in falling order of confidence:

     categories → CMS category slugs (exact, authoritative)
     tags       → topic slugs an editor may have filed against
     keywords   → free-text search, the last resort

   lib/deskFeed.ts walks those tiers and stops as soon as it has enough, so a
   desk backed by a real CMS category costs exactly one request and a desk that
   is not yet a category still has a live, dedicated page.

   Every slug here resolves at /<slug> through app/(site)/[category]/page.tsx
   and has its own metadata, JSON-LD and /<slug>/rss.xml feed. Adding a desk is
   therefore a one-line change: nav, footer, /sitemap and sitemap.xml all read
   this file.

   Two rules when editing:
     • A slug must not collide with RESERVED_SLUGS in [category]/page.tsx —
       that is why the careers desk is called "jobs".
     • Group titles are load-bearing: the deck, the footer and /sitemap all lay
       the groups out in a four-column grid, so keep it to four groups of
       roughly equal length.
   ────────────────────────────────────────────────────────────────────────── */

export interface DeskGroup {
  title: string;
  blurb: string;
}

export interface Desk {
  slug: string;
  label: string;
  /** Must match a DESK_GROUPS title. */
  group: string;
  /** One-line dek. Doubles as the meta description when the CMS has none. */
  blurb: string;
  /** CMS category slugs, most specific first. */
  categories: string[];
  /** Topic slugs to fall back on when the categories are thin. */
  tags: string[];
  /** Free-text search terms — the last tier. */
  keywords: string[];
  /** Desk slugs offered as dropdown children in the top nav. */
  children?: string[];
}

export const DESK_GROUPS: DeskGroup[] = [
  { title: "News", blurb: "India and the world, hour by hour" },
  {
    title: "Business & Industry",
    blurb: "Companies, deals and the sectors that move them",
  },
  {
    title: "Markets & Money",
    blurb: "The tape, and what it means for your money",
  },
  {
    title: "Tech, Life & Views",
    blurb: "Research, culture, competition and comment",
  },
];

/** Ordered desk list. Order inside a group is the order readers see. */
export const DESK_LIST: Desk[] = [
  /* ── News ─────────────────────────────────────────────────────────────── */
  {
    slug: "india",
    label: "India",
    group: "News",
    blurb:
      "Politics, policy and the national story, filed from every state.",
    categories: ["india"],
    tags: ["india", "delhi", "parliament", "policy"],
    keywords: ["india"],
    children: ["politics", "elections", "cities", "defence", "education"],
  },
  {
    slug: "world",
    label: "World",
    group: "News",
    blurb: "Wars, elections and diplomacy — and what they mean from here.",
    categories: ["world", "middle-east", "us-americas", "europe"],
    tags: ["world", "global", "geopolitics", "china", "us"],
    keywords: ["global", "china", "europe"],
    children: ["politics", "defence", "climate"],
  },
  {
    slug: "politics",
    label: "Politics",
    group: "News",
    blurb:
      "Parties, parliament and power — the arithmetic behind the headlines.",
    categories: ["politics", "politics-policy"],
    tags: ["politics", "policy", "parliament", "government"],
    keywords: ["politics", "policy", "parliament"],
    children: ["elections", "india", "world"],
  },
  {
    slug: "elections",
    label: "Elections",
    group: "News",
    blurb:
      "Every state and national contest: candidates, results and the swing.",
    categories: ["elections", "politics"],
    tags: ["election", "elections", "polls", "voting", "campaign"],
    keywords: ["electoral", "election", "poll"],
  },
  {
    slug: "cities",
    label: "Cities",
    group: "News",
    blurb:
      "Delhi, Mumbai, Bengaluru and the metros that set the national mood.",
    categories: ["cities", "delhi", "mumbai", "bengaluru"],
    tags: ["cities", "delhi", "mumbai", "bengaluru", "urban"],
    keywords: ["municipal", "metro", "civic"],
  },
  {
    slug: "defence",
    label: "Defence",
    group: "News",
    blurb: "The armed forces, procurement and the national security file.",
    categories: ["defence", "defense"],
    tags: ["defence", "defense", "military", "army", "navy", "air-force"],
    keywords: ["defence", "military", "army"],
  },
  {
    slug: "education",
    label: "Education",
    group: "News",
    blurb: "Schools, universities, exams and the policy that shapes them.",
    categories: ["education"],
    tags: ["education", "exams", "schools", "universities", "students"],
    keywords: ["education", "university", "school", "exam"],
  },

  /* ── Business & Industry ──────────────────────────────────────────────── */
  {
    slug: "business",
    label: "Business",
    group: "Business & Industry",
    blurb: "The companies, deals and decisions that move the economy.",
    categories: ["business", "companies"],
    tags: ["business", "companies", "deals", "earnings"],
    keywords: ["business", "group", "stake"],
    children: ["companies", "economy", "startups", "real-estate", "jobs"],
  },
  {
    slug: "companies",
    label: "Companies",
    group: "Business & Industry",
    blurb: "Results, boardrooms and the corporate scorecard.",
    categories: ["companies", "business"],
    tags: ["companies", "earnings", "results", "mergers", "deals", "board"],
    keywords: ["earnings", "results", "demerger", "guidance"],
  },
  {
    slug: "economy",
    label: "Economy",
    group: "Business & Industry",
    blurb: "Growth, inflation, jobs and the numbers behind the cycle.",
    categories: ["economy"],
    tags: ["economy", "gdp", "inflation", "budget", "rbi"],
    keywords: ["inflation", "gdp", "growth", "borrowing"],
    children: ["jobs", "money", "markets"],
  },
  {
    slug: "startups",
    label: "Startups",
    group: "Business & Industry",
    blurb: "Founders, funding rounds and the venture cycle.",
    categories: ["startups", "startup"],
    tags: ["startups", "funding", "vc", "unicorn", "seed"],
    keywords: ["startup", "funding", "venture"],
  },
  {
    slug: "auto",
    label: "Auto",
    group: "Business & Industry",
    blurb: "Carmakers, EVs and the road ahead for mobility.",
    categories: ["auto", "automobile"],
    tags: ["auto", "cars", "ev", "automobile", "mobility"],
    keywords: ["motors", "vehicle", "scooter", "ev "],
  },
  {
    slug: "energy",
    label: "Energy",
    group: "Business & Industry",
    blurb: "Oil, power and the transition rewiring the grid.",
    categories: ["energy", "power"],
    tags: ["energy", "oil", "power", "solar", "renewables", "coal"],
    keywords: ["electricity", "coal", "power", "crude"],
  },
  {
    slug: "real-estate",
    label: "Real Estate",
    group: "Business & Industry",
    blurb: "Housing, land and the developers building on it.",
    categories: ["real-estate", "realty"],
    tags: ["real-estate", "property", "housing", "realty", "rera"],
    keywords: ["real estate", "property", "housing", "land"],
  },
  {
    slug: "jobs",
    label: "Jobs",
    group: "Business & Industry",
    blurb: "Hiring, pay and the shifting shape of work.",
    /* Named "jobs" rather than "careers": /careers is the masthead's own
       recruitment page and sits in RESERVED_SLUGS. */
    categories: ["jobs", "careers-desk"],
    tags: ["jobs", "hiring", "employment", "layoffs", "salaries", "work"],
    keywords: ["hiring", "worker", "employment", "gig"],
  },

  /* ── Markets & Money ─────────────────────────────────────────────────── */
  {
    slug: "markets",
    label: "Markets",
    group: "Markets & Money",
    blurb: "Equities, bonds and currencies, session by session.",
    categories: ["markets", "stocks"],
    tags: ["markets", "stocks", "sensex", "nifty", "bonds"],
    keywords: ["nifty", "sensex", "yields", "rupee"],
    children: ["finance", "banking", "ipo", "commodities", "money"],
  },
  {
    slug: "finance",
    label: "Finance",
    group: "Markets & Money",
    blurb: "Capital, credit and the plumbing of the financial system.",
    categories: ["finance"],
    tags: ["finance", "credit", "lending", "capital", "sebi"],
    keywords: ["sebi", "credit", "bond", "deposit"],
    children: ["banking", "mutual-funds", "money", "markets"],
  },
  {
    slug: "banking",
    label: "Banking",
    group: "Markets & Money",
    blurb: "Banks, the central bank and the state of credit.",
    categories: ["banking", "banks"],
    tags: ["banks", "banking", "rbi", "lending", "npa", "deposits"],
    keywords: ["bank", "rbi", "repo", "recapitalisation"],
  },
  {
    slug: "ipo",
    label: "IPO",
    group: "Markets & Money",
    blurb: "Issues on the road, listings, and how they trade after day one.",
    categories: ["ipo", "ipos"],
    tags: ["ipo", "listing", "drhp", "issue", "subscription"],
    keywords: ["ipo", "listing", "stake sale"],
  },
  {
    slug: "mutual-funds",
    label: "Mutual Funds",
    group: "Markets & Money",
    blurb: "Schemes, flows and what the fund managers are buying.",
    categories: ["mutual-funds", "funds"],
    tags: ["mutual-funds", "sip", "nav", "amc", "funds"],
    keywords: ["mutual fund", "sip", "fund managers", "etf"],
  },
  {
    slug: "commodities",
    label: "Commodities",
    group: "Markets & Money",
    blurb: "Gold, crude, metals and the physical market.",
    categories: ["commodities"],
    tags: ["commodities", "gold", "crude", "oil", "metals", "silver"],
    keywords: ["gold", "crude", "metals", "rare earth"],
  },
  {
    slug: "crypto",
    label: "Crypto",
    group: "Markets & Money",
    blurb: "Digital assets, exchanges and the rules catching up with them.",
    categories: ["crypto", "cryptocurrency"],
    tags: ["crypto", "bitcoin", "ethereum", "blockchain", "web3"],
    keywords: ["bitcoin", "crypto", "token"],
  },
  {
    slug: "money",
    label: "Money",
    group: "Markets & Money",
    blurb: "Tax, insurance, savings and borrowing — personal finance, explained.",
    categories: ["money", "personal-finance"],
    tags: ["personal-finance", "tax", "insurance", "savings", "loans", "pension"],
    keywords: ["tax", "insurance", "savings", "deposit rate"],
  },

  /* ── Tech, Life & Views ──────────────────────────────────────────────── */
  {
    slug: "technology",
    label: "Technology",
    group: "Tech, Life & Views",
    blurb: "AI, chips, platforms and the products in your hands.",
    categories: ["technology", "tech", "ai-ml", "gadgets"],
    tags: ["technology", "tech", "ai", "software", "gadgets"],
    keywords: ["chip", "semiconductor", "software", "ai "],
    children: ["startups", "science", "health", "climate"],
  },
  {
    slug: "science",
    label: "Science",
    group: "Tech, Life & Views",
    blurb: "Research, space and the discoveries worth your attention.",
    categories: ["science"],
    tags: ["science", "space", "research", "isro"],
    keywords: ["research", "space", "isro", "scientists"],
  },
  {
    slug: "health",
    label: "Health",
    group: "Tech, Life & Views",
    blurb: "Medicine, public health and the business of care.",
    categories: ["health", "healthcare", "health-fitness"],
    tags: ["health", "healthcare", "medicine", "pharma", "hospital"],
    keywords: ["health", "medicine", "pharma", "hospital"],
  },
  {
    slug: "climate",
    label: "Climate",
    group: "Tech, Life & Views",
    blurb: "Emissions, weather extremes and the energy transition.",
    categories: ["climate", "environment"],
    tags: ["climate", "environment", "emissions", "renewables", "pollution"],
    keywords: ["climate", "air quality", "monsoon", "sea ice"],
  },
  {
    slug: "sports",
    label: "Sports",
    group: "Tech, Life & Views",
    blurb: "Cricket, football and every result that matters.",
    categories: ["sports", "cricket", "football"],
    tags: ["sports", "cricket", "football", "olympics", "ipl"],
    keywords: ["cricket", "squad", "series", "match"],
    children: ["entertainment", "lifestyle"],
  },
  {
    slug: "entertainment",
    label: "Entertainment",
    group: "Tech, Life & Views",
    blurb: "Film, streaming, music and the business behind the credits.",
    categories: ["entertainment", "bollywood", "hollywood"],
    tags: ["entertainment", "bollywood", "movies", "ott", "music"],
    keywords: ["cinema", "film", "streaming"],
  },
  {
    slug: "lifestyle",
    label: "Lifestyle",
    group: "Tech, Life & Views",
    blurb: "Food, travel, wellbeing and how we live now.",
    categories: ["lifestyle", "food", "travel"],
    tags: ["lifestyle", "food", "travel", "fitness", "wellness"],
    keywords: ["luxury", "travel", "food", "retail"],
  },
  {
    slug: "opinion",
    label: "Opinion",
    group: "Tech, Life & Views",
    blurb: "Argument, analysis and the columns worth arguing with.",
    categories: ["opinion"],
    tags: ["opinion", "analysis", "editorial", "comment"],
    keywords: ["the case", "why india", "needs an"],
  },
];

/* ── Derived views ─────────────────────────────────────────────────────────
   Everything below is computed, so nav / footer / sitemap can never drift from
   the list above. */

const BY_SLUG: Record<string, Desk> = Object.fromEntries(
  DESK_LIST.map((d) => [d.slug, d]),
);

/** The desk for a URL slug, or null when the slug is not a desk. */
export function getDesk(slug: string): Desk | null {
  return BY_SLUG[(slug || "").trim().toLowerCase()] || null;
}

export function isDeskSlug(slug: string): boolean {
  return getDesk(slug) !== null;
}

/** Every desk slug, in reading order. Used by generateStaticParams. */
export const DESK_SLUGS: string[] = DESK_LIST.map((d) => d.slug);

export type DeskLink = { label: string; href: string };

const toLink = (d: Desk): DeskLink => ({ label: d.label, href: `/${d.slug}` });

/** Desks of a group, in registry order. */
export function desksInGroup(title: string): Desk[] {
  return DESK_LIST.filter((d) => d.group === title);
}

/** Group → links, the shape the deck, the footer and /sitemap all consume. */
export const deskGroupLinks: {
  title: string;
  blurb: string;
  links: DeskLink[];
}[] = DESK_GROUPS.map((g) => ({
  title: g.title,
  blurb: g.blurb,
  links: desksInGroup(g.title).map(toLink),
}));

/** Nav children for a desk, resolved from slugs and silently skipping any
    slug that has since been removed from the registry. */
export function deskChildren(slug: string): DeskLink[] {
  const desk = getDesk(slug);
  if (!desk?.children) return [];
  return desk.children.map(getDesk).filter(Boolean).map((d) => toLink(d!));
}

/** Sibling desks — the "more from this group" strip on a desk page. Excludes
    the desk itself and caps the strip so it never wraps to a third line. */
export function deskSiblings(slug: string, limit = 7): Desk[] {
  const desk = getDesk(slug);
  if (!desk) return [];
  return desksInGroup(desk.group)
    .filter((d) => d.slug !== desk.slug)
    .slice(0, limit);
}

/* Inside a desk module — a homepage band or a desk page — a story's own
   category is almost always the desk itself, so printing it as a kicker just
   echoes the section head: the reader sees "BUSINESS ▸ Business" on every row.
   Return the category only when it carries new information, such as Finance
   under "Markets & Money" or Science under "Technology". Desk titles built with
   an ampersand or a slash cover both of their halves. */
export function deskKicker(
  category: string | null | undefined,
  desk: string,
): string {
  const c = (category || "").trim();
  if (!c) return "";
  const own = desk
    .toLowerCase()
    .split(/\s*(?:&|\/|and)\s*/)
    .map((w) => w.trim())
    .filter(Boolean);
  return own.includes(c.toLowerCase()) ? "" : c;
}
