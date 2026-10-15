/**
 * Lightweight related-article ranker.
 * Works on any object with optional { title, category, tags?, slug?, image?, timestamp? }.
 * Score = sharedTags*3 + sameCategory*2 + recencyBoost.
 */
export interface RankableStory {
  title: string;
  category?: string;
  tags?: string[];
  slug?: string;
  image?: string;
  timestamp?: string;
  excerpt?: string;
}

export interface RankContext {
  category?: string;
  tags?: string[];
  excludeTitle?: string;
  excludeSlug?: string;
}

export function rankRelated<T extends RankableStory>(
  pool: T[],
  ctx: RankContext,
  limit = 4
): T[] {
  const ctxTags = (ctx.tags || []).map((t) => t.toLowerCase());
  const ctxCat = (ctx.category || "").toLowerCase();

  const scored = pool
    .filter(
      (s) =>
        s.title !== ctx.excludeTitle &&
        (!ctx.excludeSlug || s.slug !== ctx.excludeSlug)
    )
    .map((s, idx) => {
      const sTags = (s.tags || []).map((t) => t.toLowerCase());
      const shared = sTags.filter((t) => ctxTags.includes(t)).length;
      const sameCat = (s.category || "").toLowerCase() === ctxCat ? 1 : 0;
      const recency = Math.max(0, 10 - idx) * 0.1;
      return { s, score: shared * 3 + sameCat * 2 + recency };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);

  return scored;
}
