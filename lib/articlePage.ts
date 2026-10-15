import { fetchArticle, fetchArticles, fetchHomepage } from "./api";
import type { Article } from "./types";
import { summaryToStory, type StoryCardData } from "./homepage";
import { rankRelated } from "@/lib/relatedArticles";

export interface ArticlePageData {
  article: Article;
  leftRailRelated: StoryCardData[];
  leftRailTrending: StoryCardData[];
  rightRailDontMiss: StoryCardData | null;
  moreStoryRows: StoryCardData[];
}

/** Deduplicate by slug (or title as fallback), preserving order. */
function dedupeStories(stories: StoryCardData[]): StoryCardData[] {
  const seen = new Set<string>();
  return stories.filter((s) => {
    const key = s.slug || s.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function prepareArticlePageData(slug: string): Promise<ArticlePageData> {
  const article = await fetchArticle(slug);
  const tagNames = article.tags.map((t) => t.name);

  const [categoryResult, latestResult, homepageSlots] = await Promise.all([
    article.categorySlug
      ? fetchArticles({ category: article.categorySlug, limit: 16 }).catch(() => ({
          items: [],
          nextCursor: null,
        }))
      : Promise.resolve({ items: [], nextCursor: null }),
    fetchArticles({ limit: 24 }).catch(() => ({ items: [], nextCursor: null })),
    fetchHomepage().catch((): import('./types').HomepageSlots => ({})),
  ]);

  const cmsRelated = categoryResult.items
    .filter((a) => a.slug !== slug)
    .map(summaryToStory);
  const cmsLatest = latestResult.items
    .filter((a) => a.slug !== slug)
    .map(summaryToStory);
  const homepageTrending = (homepageSlots.trending || [])
    .filter((a) => a.slug !== slug)
    .map(summaryToStory);

  // Deduplicate the pool before ranking to avoid duplicate keys in UI
  const relatedPool = dedupeStories([...cmsRelated, ...cmsLatest]);

  const leftRailRelated = rankRelated(
    relatedPool,
    {
      category: article.categoryName,
      tags: tagNames,
      excludeTitle: article.title,
      excludeSlug: slug,
    },
    3,
  );

  const usedRelated = new Set(leftRailRelated.map((s) => s.slug || s.title));
  const leftRailTrending = dedupeStories(
    cmsLatest.filter((s) => {
      const key = s.slug || s.title;
      return key && !usedRelated.has(key);
    }),
  ).slice(0, 5);

  const usedDontMiss = new Set([
    ...leftRailRelated.map((s) => s.slug || s.title),
    ...leftRailTrending.map((s) => s.slug || s.title),
    slug,
  ]);
  const pickDontMiss = (list: StoryCardData[]) =>
    list.find((s) => {
      const key = s.slug || s.title;
      return key && !usedDontMiss.has(key);
    }) || null;

  const rightRailDontMiss =
    pickDontMiss(homepageTrending) ||
    pickDontMiss(cmsRelated) ||
    pickDontMiss(cmsLatest);

  const autoRelated = rankRelated(
    dedupeStories(cmsLatest),
    { category: article.categoryName, tags: tagNames, excludeTitle: article.title, excludeSlug: slug },
    8,
  );
  const relatedStories = (cmsRelated.length ? cmsRelated : cmsLatest).slice(0, 6);

  const moreStorySeen = new Set<string>();
  const moreStoryRows = dedupeStories(
    [...autoRelated, ...relatedStories, ...cmsLatest].filter((story) => {
      const key = story.slug || story.title;
      if (!key || moreStorySeen.has(key) || story.title === article.title) return false;
      moreStorySeen.add(key);
      return true;
    }),
  ).slice(0, 7);

  return {
    article,
    leftRailRelated,
    leftRailTrending,
    rightRailDontMiss,
    moreStoryRows,
  };
}
