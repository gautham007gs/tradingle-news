import { slugify } from "./slugify";
import { SITE_URL } from "./siteUrl";

type ArticleLinkSource = {
  slug?: string | null;
  title?: string | null;
  categorySlug?: string | null;
};

/**
 * Canonical public article URL.
 * Gold standard: /{categorySlug}/{article-slug}
 * Falls back to /latest/{slug} when categorySlug is missing so every emitted
 * link remains inside the canonical two-segment route.
 */
export function articlePath(source: ArticleLinkSource, fallback = "latest-story"): string {
  const slug = (source.slug || "").trim();
  const cat = (source.categorySlug || "").trim().toLowerCase();

  if (slug && cat) return `/${cat}/${slug}`;
  if (slug) return `/latest/${slug}`;

  const titleSlug = slugify((source.title || "").trim());
  if (titleSlug && cat) return `/${cat}/${titleSlug}`;
  if (titleSlug) return `/latest/${titleSlug}`;

  return `/${fallback}`;
}

export function articleAbsoluteUrl(source: ArticleLinkSource, origin = SITE_URL): string {
  return `${origin.replace(/\/$/, "")}${articlePath(source)}`;
}
