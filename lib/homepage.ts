import type { ArticleSummary, HomepageSlots, SiteSettings } from "./types";

export interface StoryCardData {
  title: string;
  image?: string;
  timestamp: string;
  excerpt?: string;
  category?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  slug?: string;
  author?: string;
  avatar?: string;
  readTime?: string;
  views?: number;
  priority?: string;
  isLive?: boolean;
  publishedAt?: string | null;
}

/** Normalise a DB datetime string so it is always parsed as UTC.
 *  DB stores timestamps without timezone (e.g. "2026-05-24 05:19:01").
 *  Without "Z" the browser parses that as *local* time, causing a
 *  different ISO string on server (UTC) vs client (user's TZ) — a
 *  hydration mismatch.  Append "Z" when no offset is present. */
function toUtcDate(value: string): Date {
  let s = value.trim().replace(" ", "T");
  // Already has an explicit timezone (Z, +HH, +HH:MM, +HHMM, -HH:MM…) — leave
  // alone. The trailing-offset check must accept both "+05:30" and "+0530".
  if (!/Z$|[-+]\d{1,2}:?\d{0,2}$/i.test(s)) s += "Z";
  return new Date(s);
}

export const formatArticleTime = (value?: string | null) => {
  if (!value) return "Just now";
  const date = toUtcDate(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
};

export const toIsoDateTime = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = toUtcDate(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export function summaryToStory(article: ArticleSummary): StoryCardData {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    image: article.featuredImage,
    timestamp: formatArticleTime(article.publishedAt),
    category: article.categoryName,
    categorySlug: article.categorySlug,
    tagSlugs: article.tagSlugs,
    author: article.authorName,
    avatar: article.authorAvatar,
    readTime: `${article.readingTimeMinutes} min read`,
    views: article.views,
    priority: article.priority,
    isLive: article.isLive,
    publishedAt: article.publishedAt,
  };
}

export function articlePath(source: { slug?: string; categorySlug?: string }): string {
  const slug = (source.slug || "").trim();
  const cat = (source.categorySlug || "").trim().toLowerCase();
  if (slug && cat) return `/${cat}/${slug}`;
  if (slug) return `/latest/${slug}`;
  return "/";
}

const storyKeys = (story: StoryCardData) =>
  [
    story.slug &&
      `slug:${story.slug.trim().replace(/\s+/g, " ").toLocaleLowerCase()}`,
    story.title &&
      `title:${story.title.trim().replace(/\s+/g, " ").toLocaleLowerCase()}`,
  ].filter((value): value is string => Boolean(value));

export const uniqueStories = (
  stories: StoryCardData[],
  used = new Set<string>(),
  limit?: number,
) => {
  const picked: StoryCardData[] = [];
  for (const story of stories) {
    const keys = storyKeys(story);
    if (!keys.length || keys.some((key) => used.has(key))) continue;
    keys.forEach((key) => used.add(key));
    picked.push(story);
    if (limit && picked.length >= limit) break;
  }
  return picked;
};

const HOMEPAGE_SECTION_FEEDS: Record<
  string,
  { categories: string[]; tags: string[] }
> = {
  politics: {
    categories: ["politics", "politics-policy", "elections"],
    tags: ["politics", "policy", "election"],
  },
  india: {
    categories: ["india", "politics-policy", "south-india"],
    tags: ["india", "politics", "delhi"],
  },
  world: {
    categories: ["world", "middle-east", "us-americas", "europe"],
    tags: ["world", "global"],
  },
  business: {
    categories: ["business", "companies", "startups", "economy"],
    tags: ["business", "companies", "economy"],
  },
  finance: {
    categories: ["finance", "markets", "stocks"],
    tags: ["finance", "markets", "stocks"],
  },
  technology: {
    categories: ["technology", "tech", "ai-ml", "gadgets"],
    tags: ["technology", "tech", "ai"],
  },
  cities: {
    categories: ["cities", "delhi", "mumbai", "bengaluru"],
    tags: ["cities", "delhi", "mumbai"],
  },
  science: {
    categories: ["science", "environment"],
    tags: ["science", "climate", "health"],
  },
  opinion: {
    categories: ["opinion"],
    tags: ["opinion", "analysis", "editorial"],
  },
  entertainment: {
    categories: ["entertainment", "bollywood", "hollywood"],
    tags: ["entertainment", "bollywood", "movies"],
  },
  sports: {
    categories: ["sports", "cricket", "football"],
    tags: ["sports", "cricket", "football"],
  },
  lifestyle: {
    categories: ["lifestyle", "food", "health-fitness", "travel"],
    tags: ["lifestyle", "health", "travel"],
  },
};

const normalizeTopic = (value?: string) => (value || "").trim().toLowerCase();
const normalizeText = (value?: string) =>
  normalizeTopic(value).replace(/[-_]/g, " ").replace(/\s+/g, " ");

const keywordMatchesStory = (
  story: StoryCardData,
  config: { categories: string[]; tags: string[] },
) => {
  const searchable = normalizeText(
    `${story.title} ${story.excerpt || ""} ${story.category || ""}`,
  );
  const keywords = [...config.categories, ...config.tags]
    .map(normalizeText)
    .filter((k) => k.length >= 3);
  return keywords.some((k) => searchable.includes(k));
};

const storyMatchesSection = (
  story: StoryCardData,
  config: { categories: string[]; tags: string[] },
) => {
  const categorySlug = normalizeTopic(story.categorySlug);
  const categorySet = new Set(config.categories.map(normalizeTopic));
  const tagSet = new Set(config.tags.map(normalizeTopic));
  const storyTags = story.tagSlugs?.map(normalizeTopic) || [];
  return (
    categorySet.has(categorySlug) ||
    (storyTags.some((t) => tagSet.has(t)) &&
      keywordMatchesStory(story, config))
  );
};

export interface HomepageDerivedData {
  heroStories: StoryCardData[];
  railStories: StoryCardData[];
  editorsPicks: StoryCardData[];
  sectionStories: Record<string, StoryCardData[]>;
  moreForYouStories: StoryCardData[];
  latestStories: StoryCardData[];
}

export function deriveHomepageData(
  homepageSlots: HomepageSlots,
  latestArticles: ArticleSummary[],
): HomepageDerivedData {
  const latestStories = latestArticles.map(summaryToStory);
  const usedAboveFold = new Set<string>();

  const pick = (primary: StoryCardData[] | undefined, limit?: number) => {
    const source = primary?.length ? primary : latestStories;
    const chosen = uniqueStories(source, usedAboveFold, limit);
    if (limit === undefined || chosen.length >= limit) return chosen;
    /* A slot's own rows are often duplicated in an earlier slot (the rail and
       the hero share stories in most editions). Once the earlier module has
       claimed them the remainder can be a single row, which renders as a
       half-empty band — so top the module up from the latest feed. */
    return [
      ...chosen,
      ...uniqueStories(latestStories, usedAboveFold, limit - chosen.length),
    ];
  };

  const sectionPick = (sectionKey: string, slotKey: string, limit = 8) => {
    const config = HOMEPAGE_SECTION_FEEDS[sectionKey];
    const slotStories = (homepageSlots[slotKey] || []).map(summaryToStory);
    const exactSource = [...slotStories, ...latestStories].filter(
      (s) => s.slug && (!config || storyMatchesSection(s, config)),
    );
    const exact = uniqueStories(exactSource, new Set<string>(), limit);
    if (!config || exact.length >= limit) return exact;
    const loose = latestStories.filter(
      (s) => s.slug && keywordMatchesStory(s, config),
    );
    return uniqueStories([...exact, ...loose], new Set<string>(), limit);
  };

  const heroSource = uniqueStories(
    [
      ...(homepageSlots.hero || []).map(summaryToStory),
      ...latestStories,
    ],
    new Set<string>(),
    13,
  );
  const hero = pick(heroSource, 13);
  const rail = pick(
    (homepageSlots.horizontal_rail || homepageSlots.top_stories || []).map(
      summaryToStory,
    ),
    5,
  );
  const editors = pick(
    (homepageSlots.editors_picks || []).map(summaryToStory),
    4,
  );

  const moreForYouStories = (() => {
    const slotStories = (homepageSlots.more_for_you || []).map(summaryToStory);
    const usedKeys = new Set<string>();
    [...hero, ...rail, ...editors].forEach((s) => {
      storyKeys(s).forEach((key) => usedKeys.add(key));
    });
    const fromSlot = uniqueStories(slotStories, usedKeys, 20);
    if (fromSlot.length >= 20) return fromSlot;
    const fallback = uniqueStories(latestStories, usedKeys, 20);
    return fromSlot.length
      ? uniqueStories(
          [...fromSlot, ...fallback],
          new Set(fromSlot.flatMap(storyKeys)),
          20,
        )
      : fallback;
  })();

  return {
    heroStories: hero,
    railStories: rail,
    editorsPicks: editors.slice(0, 4),
    sectionStories: {
      politics: sectionPick("politics", "politics"),
      india: sectionPick("india", "india", 5),
      world: sectionPick("world", "world"),
      /* 9 rows: the band runs one portrait feature plus an eight-headline
         index, and a short feed left the second sub-column half-empty. */
      business: sectionPick("business", "business", 9),
      finance: sectionPick("finance", "finance"),
      /* Keyed by the desk slug the page actually asks for. This used to be
         `tech`, while HomePageContent read `sectionStories.technology`, so the
         entire Technology band silently never rendered. */
      technology: sectionPick("technology", "technology"),
      cities: sectionPick("cities", "cities"),
      science: sectionPick("science", "science", 5),
      opinion: sectionPick("opinion", "opinion"),
      entertainment: sectionPick("entertainment", "entertainment"),
      sports: sectionPick("sports", "sports"),
      lifestyle: sectionPick("lifestyle", "lifestyle"),
    },
    moreForYouStories,
    latestStories,
  };
}

export function slotsToStories(
  slots: HomepageSlots,
): Record<string, StoryCardData[]> {
  const result: Record<string, StoryCardData[]> = {};
  for (const [key, rows] of Object.entries(slots)) {
    result[key] = rows.map(summaryToStory);
  }
  return result;
}
