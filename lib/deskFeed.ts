import { fetchArticles, fetchCategory, NotFoundError } from "./api";
import type { ArticleSummary, Category } from "./types";
import { getDesk, type Desk } from "./desks";

/* ─────────────────────────────────────────────────────────────────────────────
   Desk feed assembly.

   A desk page needs a headline list whether or not the CMS has a category of
   that name. This module resolves both cases through one function so the page
   component does not have to care which it got:

     tier 1  every CMS category the desk claims          (exact)
     tier 2  every topic slug the desk claims            (near enough)
     tier 3  free-text search over the desk's keywords   (last resort)

   Tiers run in order and stop as soon as the desk has `limit` stories, so a
   desk backed by a real category costs exactly one upstream request. Results
   keep their tier order rather than being globally re-sorted: a keyword hit
   should never outrank a story an editor actually filed to the desk, however
   fresh it is. Within a tier, newest first.

   Every upstream call is allowed to fail on its own. One dead tag must not take
   the page down, so failures resolve to an empty list.
   ────────────────────────────────────────────────────────────────────────── */

export interface DeskHead {
  slug: string;
  name: string;
  description: string;
  /** True when a CMS category of this slug exists — drives the RSS link. */
  isCategory: boolean;
  /** The registry entry, when the slug is a known desk. */
  desk: Desk | null;
}

/** Newest first, tolerant of missing or unparseable dates. */
const byNewest = (a: ArticleSummary, b: ArticleSummary) => {
  const t = (v?: string | null) => {
    if (!v) return 0;
    const s = v.trim().replace(" ", "T");
    const d = new Date(/Z$|[-+]\d{2}:?\d{2}$/i.test(s) ? s : `${s}Z`);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  };
  return t(b.publishedAt) - t(a.publishedAt);
};

async function safeList(
  params: Parameters<typeof fetchArticles>[0],
): Promise<ArticleSummary[]> {
  try {
    const { items } = await fetchArticles(params);
    return items;
  } catch {
    return [];
  }
}

/** Merge tiers in order, dropping repeats and anything without a slug. */
function mergeTiers(tiers: ArticleSummary[][], limit: number) {
  const seen = new Set<string>();
  const out: ArticleSummary[] = [];
  for (const tier of tiers) {
    for (const item of [...tier].sort(byNewest)) {
      const key = (item.slug || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Resolve the desk head: the CMS category when there is one, otherwise the
 * registry entry. Returns null when the slug is neither, which is the caller's
 * cue to try a legacy article redirect and then 404.
 */
export async function resolveDeskHead(slug: string): Promise<DeskHead | null> {
  const desk = getDesk(slug);

  let category: Category | null = null;
  try {
    category = await fetchCategory(slug);
  } catch (e) {
    if (!(e instanceof NotFoundError)) throw e;
  }

  if (category) {
    return {
      slug,
      name: category.name,
      /* The CMS auto-fills "<Name> news and updates." when a category has no
         description of its own; the registry blurb is written copy, so prefer
         it over the generated string. */
      description:
        desk && /news and updates\.?$/i.test(category.description || "")
          ? desk.blurb
          : category.description || desk?.blurb || "",
      isCategory: true,
      desk,
    };
  }

  if (desk) {
    return {
      slug,
      name: desk.label,
      description: desk.blurb,
      isCategory: false,
      desk,
    };
  }

  return null;
}

/**
 * Headlines for a desk page. `offset` only applies to the exact-category tier,
 * which is the only tier that can be paginated coherently — once the page is
 * borrowing from tags and search there is no stable cursor to advance, so the
 * caller stops offering "load more".
 */
export async function fetchDeskFeed(
  head: DeskHead,
  { limit = 24, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ items: ArticleSummary[]; nextCursor: string | null }> {
  const desk = head.desk;

  /* ── Tier 1: exact categories ─────────────────────────────────────────── */
  const catSlugs = Array.from(
    new Set([...(head.isCategory ? [head.slug] : []), ...(desk?.categories || [])]),
  ).slice(0, 4);

  const tier1Pages = await Promise.all(
    catSlugs.map((c, i) =>
      /* Only the desk's own category can be paged; the supporting ones are
         always read from the top so their newest stories are the ones that
         survive the merge. */
      safeList({ category: c, limit, offset: i === 0 ? offset : 0 }),
    ),
  );
  const tier1 = tier1Pages.flat();

  /* A real category with a full page is the common case — return immediately
     and keep the cursor so "load more" walks the category cleanly. */
  if (head.isCategory && tier1Pages[0]?.length >= limit) {
    return {
      items: mergeTiers([tier1], limit),
      nextCursor: String(offset + limit),
    };
  }

  const tiers: ArticleSummary[][] = [tier1];
  let have = mergeTiers(tiers, limit).length;

  /* ── Tier 2: topic slugs ──────────────────────────────────────────────── */
  if (have < limit && desk?.tags?.length) {
    const tagPages = await Promise.all(
      desk.tags.slice(0, 4).map((t) => safeList({ tag: t, limit })),
    );
    tiers.push(tagPages.flat());
    have = mergeTiers(tiers, limit).length;
  }

  /* ── Tier 3: keyword search ───────────────────────────────────────────── */
  if (have < limit && desk?.keywords?.length) {
    const qPages = await Promise.all(
      desk.keywords.slice(0, 4).map((q) => safeList({ q, limit })),
    );
    tiers.push(qPages.flat());
  }

  const items = mergeTiers(tiers, limit);

  /* Paginate only while tier 1 alone is carrying the page. Anything else and
     the next offset would re-serve stories already on screen. */
  const canPage = head.isCategory && tier1Pages[0]?.length >= limit;
  return { items, nextCursor: canPage ? String(offset + limit) : null };
}
