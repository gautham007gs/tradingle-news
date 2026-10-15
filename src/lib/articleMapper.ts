import { images } from "@/data/newsData";
import type { ApiArticle, ApiArticleSummary } from "@/lib/hostingerApi";
import { looksLikeHtml } from "@/lib/contentHtml";
import { calculateReadingTime, formatReadingTime } from "@/lib/imageOptimization";

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

export const formatExcerpt = (value?: string | null, maxWords = 25) => {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  let words = normalized.split(" ");
  let truncated = words.length > maxWords;
  if (truncated) words = words.slice(0, maxWords);

  let text = words.join(" ").trim();
  const lastWord = text.split(" ").pop() || "";

  if (!/[.!?)]$/.test(text)) {
    if (lastWord.length <= 3 && words.length > 1) {
      words = words.slice(0, -1);
      text = words.join(" ").trim();
      truncated = true;
    }
    text = text.replace(/[,:;/-]+$/, "");
    if (text) text = `${text}...`;
  }

  return text;
};

export const cleanExcerpt = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
};

/** Treat DB timestamps (no timezone suffix) as UTC to avoid hydration mismatches. */
function toUtcDate(value: string): Date {
  let s = value.trim().replace(" ", "T");
  if (!/[-Z+]\d*$/.test(s)) s += "Z";
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

/** ISO 8601 datetime for `<time datetime>` and structured data. */
export const toIsoDateTime = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = toUtcDate(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const enabledFlag = (value: unknown) => value !== 0 && value !== false && value !== "0";

export const apiArticleToStory = (article: ApiArticleSummary): StoryCardData => ({
  title: article.title,
  slug: article.slug,
  excerpt: formatExcerpt(article.excerpt),
  image: article.featured_image || (images.hero as any).src || "",
  timestamp: formatArticleTime(article.published_at || article.updated_at),
  category: article.category_name ?? undefined,
  categorySlug: article.category_slug ?? undefined,
  tagSlugs: article.tag_slugs ? article.tag_slugs.split(",").filter(Boolean) : undefined,
  author: article.author_name,
  avatar: article.author_avatar ?? undefined,
  readTime: article.reading_time_minutes ? formatReadingTime(article.reading_time_minutes) : undefined,
  views: article.views ? Number(article.views) : undefined,
  priority: article.priority || undefined,
  isLive: enabledFlag(article.is_live),
  publishedAt: article.published_at || article.updated_at,
});

export const apiArticleToPageArticle = (article: ApiArticle) => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  subtitle: cleanExcerpt(article.excerpt) || "",
  category: article.category_name || "Latest",
  image: article.featured_image || (images.hero as any).src || "",
  imageAlt: article.featured_image_alt || article.title,
  imageCaption: article.featured_image_caption || "",
  imageSource: article.image_source || "",
  author: article.author_name,
  authorAvatar: article.author_avatar || images.author1,
  authorBio: article.author_bio || `${article.author_name} writes for Tradingle.`,
  timestamp: `Updated ${formatArticleTime(article.updated_at || article.published_at)}`,
  readTime: `${article.reading_time_minutes || 1} min read`,
  tags: (article.tags || []).map((tag) => tag.name),
  body: article.content ? (looksLikeHtml(article.content) ? [article.content] : article.content.split(/\n{2,}/).filter(Boolean)) : [],
  contentFormat: looksLikeHtml(article.content) ? "html" : "text",
  publishedTime: article.published_at || article.updated_at,
  modifiedTime: article.updated_at || article.published_at,
  seoTitle: article.seo_title || article.title,
  seoDescription: article.seo_description || cleanExcerpt(article.excerpt) || article.title,
  commentsEnabled: enabledFlag(article.comments_enabled),
  isLive: enabledFlag(article.is_live),
  isSponsored: enabledFlag(article.is_sponsored),
  sponsorName: article.sponsor_name || "",
  sponsorDisclosure: article.sponsor_disclosure || "",
  robotsIndex: enabledFlag(article.robots_index ?? true),
  robotsFollow: enabledFlag(article.robots_follow ?? true),
  schemaType: article.schema_type || "NewsArticle",
  correctionNote: article.correction_note || "",
  canonicalUrl: article.canonical_url || "",
  seoOgImage: article.seo_og_image || "",
  authorSlug: article.author_slug || "",
});
