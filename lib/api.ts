import { getServerApiBase } from "./site";
import type {
  ApiArticleRaw,
  ApiArticleSummaryRaw,
  ApiAuthorRaw,
  ApiCategoryRaw,
  Article,
  ArticleSummary,
  ArticlesResult,
  Author,
  AuthorPageData,
  Category,
  HomepageSlots,
  SiteSettings,
} from "./types";

type FetchOptions = {
  revalidate: number;
  tags: string[];
};

// Issue #65: All server-side API fetches have a 10-second hard timeout so a
// slow or hung PHP backend can never freeze a Next.js page render indefinitely.
const API_FETCH_TIMEOUT_MS = 10_000;

async function apiFetch<T>(path: string, options: FetchOptions): Promise<T> {
  const apiBase = getServerApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBase}${normalizedPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      next: {
        revalidate: options.revalidate,
        tags: options.tags,
      },
      headers: {
        Accept: "application/json",
        ...(process.env.API_SECRET_KEY
          ? { "X-API-Key": process.env.API_SECRET_KEY }
          : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`API timeout after ${API_FETCH_TIMEOUT_MS}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new NotFoundError(path);
    }
    throw new Error(`API ${res.status}: ${path}`);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`API returned non-JSON response for: ${path}`);
  }
  return payload as T;
}

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = "NotFoundError";
  }
}

const enabledFlag = (value: unknown) =>
  value !== 0 && value !== false && value !== "0";

function mapSummary(raw: ApiArticleSummaryRaw): ArticleSummary {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt || "",
    featuredImage: raw.featured_image || "",
    featuredImageAlt: raw.featured_image_alt || raw.title,
    categoryName: raw.category_name || "Latest",
    categorySlug: raw.category_slug || "",
    authorName: raw.author_name,
    authorSlug: raw.author_slug,
    authorAvatar: raw.author_avatar || "",
    tagSlugs: raw.tag_slugs
      ? raw.tag_slugs.split(",").filter(Boolean)
      : [],
    publishedAt: raw.published_at || raw.updated_at || new Date().toISOString(),
    updatedAt: raw.updated_at || new Date().toISOString(),
    readingTimeMinutes: raw.reading_time_minutes || 1,
    views: Number(raw.views || 0),
    isLive: enabledFlag(raw.is_live),
    priority: raw.priority || "normal",
  };
}

function mapArticle(raw: ApiArticleRaw): Article {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt || "",
    content: raw.content || "",
    featuredImage: raw.featured_image || "",
    featuredImageAlt: raw.featured_image_alt || raw.title,
    featuredImageCaption: raw.featured_image_caption || "",
    imageSource: raw.image_source || "",
    categoryName: raw.category_name || "Latest",
    categorySlug: raw.category_slug || "",
    author: {
      id: 0,
      name: raw.author_name,
      slug: raw.author_slug,
      avatar: raw.author_avatar,
      bio: raw.author_bio,
      roleTitle: raw.author_role_title,
    },
    tags: (raw.tags || []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
    })),
    publishedAt: raw.published_at || raw.updated_at || new Date().toISOString(),
    updatedAt: raw.updated_at || new Date().toISOString(),
    readingTimeMinutes: raw.reading_time_minutes || 1,
    views: Number(raw.views || 0),
    isLive: enabledFlag(raw.is_live),
    isSponsored: enabledFlag(raw.is_sponsored),
    sponsorName: raw.sponsor_name || "",
    sponsorDisclosure: raw.sponsor_disclosure || "",
    commentsEnabled: enabledFlag(raw.comments_enabled ?? true),
    seoTitle: raw.seo_title || raw.title,
    seoDescription: raw.seo_description || raw.excerpt || raw.title,
    seoOgImage: raw.seo_og_image || raw.featured_image || "",
    canonicalUrl: raw.canonical_url || "",
    schemaType: raw.schema_type || "NewsArticle",
    robotsIndex: enabledFlag(raw.robots_index ?? true),
    robotsFollow: enabledFlag(raw.robots_follow ?? true),
    correctionNote: raw.correction_note || "",
    priority: raw.priority || "normal",
    contentType: raw.content_type || "breaking_news",
    googleNewsExclude: enabledFlag(raw.google_news_exclude ?? false),
    locationCountry: raw.location_country || "",
    locationState: raw.location_state || "",
    locationCity: raw.location_city || "",
    evergreenAuditDate: raw.evergreen_audit_date || "",
    twitterCard: raw.twitter_card || "summary_large_image",
    twitterCreator: raw.twitter_creator || "",
  };
}

function mapCategory(raw: ApiCategoryRaw): Category {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description || `${raw.name} news and updates.`,
    imageUrl: raw.image_url || "",
  };
}

function mapAuthor(raw: ApiAuthorRaw): Author {
  return {
    id: raw.id,
    slug: raw.slug,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url || "",
    bio: raw.bio || "",
    roleTitle: raw.role_title || "",
    socialX: raw.social_x || "",
    socialLinkedin: raw.social_linkedin || "",
    socialWebsite: raw.social_website || "",
  };
}

export async function fetchArticle(slug: string): Promise<Article> {
  const { data } = await apiFetch<{ data: ApiArticleRaw }>(
    `/articles/show.php?slug=${encodeURIComponent(slug)}`,
    {
      revalidate: 300,
      tags: [`article:${slug}`, "home"],
    },
  );
  return mapArticle(data);
}

export async function fetchArticles(params: {
  category?: string;
  tag?: string;
  author?: string;
  q?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}): Promise<ArticlesResult> {
  const search = new URLSearchParams({
    status: "published",
    order: "latest",
    limit: String(params.limit ?? 20),
    offset: String(params.offset ?? 0),
  });
  if (params.category) search.set("category", params.category);
  if (params.tag) search.set("tag", params.tag);
  if (params.author) search.set("author", params.author);
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("offset", params.cursor);

  const tags = params.category
    ? [`category:${params.category}`]
    : params.tag
      ? [`tag:${params.tag}`]
      : ["home"];

  const { data } = await apiFetch<{ data: ApiArticleSummaryRaw[] }>(
    `/articles/list.php?${search.toString()}`,
    { revalidate: params.category ? 180 : 60, tags },
  );

  const items = (data || []).map(mapSummary);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const nextCursor =
    items.length >= limit ? String(offset + limit) : null;

  return { items, nextCursor };
}

export async function fetchCategory(slug: string): Promise<Category> {
  const { data } = await apiFetch<{ data: ApiCategoryRaw[] }>(
    "/categories/list.php",
    { revalidate: 180, tags: [`category:${slug}`] },
  );
  const found = (data || []).find((c) => c.slug === slug);
  if (!found) {
    throw new NotFoundError(`category:${slug}`);
  }
  return mapCategory(found);
}

export async function fetchAuthor(slug: string): Promise<AuthorPageData> {
  const raw = await apiFetch<{
    author: ApiAuthorRaw | null;
    articles: Array<{
      id: number;
      slug: string;
      title: string;
      excerpt: string | null;
      featured_image: string | null;
      published_at: string | null;
      updated_at?: string;
      category_name?: string;
      category_slug?: string;
      author_name?: string;
      author_slug?: string;
    }>;
  }>(`/authors/show.php?slug=${encodeURIComponent(slug)}`, {
    revalidate: 300,
    tags: [`author:${slug}`],
  });

  if (!raw.author) {
    throw new NotFoundError(`author:${slug}`);
  }

  const articles: ArticleSummary[] = (raw.articles || []).map((a) =>
    mapSummary({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      featured_image: a.featured_image,
      status: "published",
      priority: "normal",
      is_live: false,
      published_at: a.published_at,
      updated_at: a.updated_at || a.published_at || "",
      author_name: a.author_name || raw.author!.display_name,
      author_slug: a.author_slug || raw.author!.slug,
      category_name: a.category_name,
      category_slug: a.category_slug,
    }),
  );

  return { author: mapAuthor(raw.author), articles };
}

export async function fetchLatest(
  sinceTimestamp?: string,
): Promise<ArticleSummary[]> {
  const params = new URLSearchParams({
    status: "published",
    order: "latest",
    limit: "20",
  });
  if (sinceTimestamp) {
    params.set("since", sinceTimestamp);
  }
  const { data } = await apiFetch<{ data: ApiArticleSummaryRaw[] }>(
    `/articles/list.php?${params.toString()}`,
    { revalidate: 30, tags: ["home", "latest"] },
  );
  return (data || []).map(mapSummary);
}

export async function fetchHomepage(): Promise<HomepageSlots> {
  const { data } = await apiFetch<{
    data: Record<string, ApiArticleSummaryRaw[]>;
  }>("/homepage.php", {
    revalidate: 60,
    tags: ["home"],
  });
  const mapped: HomepageSlots = {};
  for (const [slot, rows] of Object.entries(data || {})) {
    mapped[slot] = (rows || []).map(mapSummary);
  }
  return mapped;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { settings } = await apiFetch<{ settings: Record<string, string> }>(
    "/site-settings.php",
    { revalidate: 300, tags: ["site-settings"] },
  );
  return {
    homepage_seo_title:
      settings.homepage_seo_title || "Tradingle — Latest News & Analysis",
    homepage_seo_description:
      settings.homepage_seo_description ||
      "Breaking news, analysis and in-depth coverage from Tradingle.",
    footer_tagline:
      settings.footer_tagline ||
      "Independent journalism for the digital age.",
    spotlight_label: settings.spotlight_label || "Spotlight",
    spotlight_kicker: settings.spotlight_kicker || "Featured",
    more_for_you_title: settings.more_for_you_title || "More For You",
    show_read_time: settings.show_read_time || "1",
    show_view_count: settings.show_view_count || "1",
    site_name: settings.site_name || "Tradingle",
    maintenance_enabled: settings.maintenance_enabled || "0",
    maintenance_message: settings.maintenance_message || "",
    site_default_og_image: settings.site_default_og_image || "",
    site_logo_url: settings.site_logo_url || "",
    social_twitter: settings.social_twitter || "",
    ga4_measurement_id: settings.ga4_measurement_id || "",
    gtm_container_id: settings.gtm_container_id || "",
    google_site_verification: settings.google_site_verification || "",
    news_sitemap_window_hours: settings.news_sitemap_window_hours || "48",
  };
}

export interface TaxonomySlugs {
  categories: string[];
  authors: string[];
  tags: string[];
}

/**
 * Slug-only taxonomy for sitemap generation. Consumed by app/sitemap.ts and
 * the category/author/tag generateStaticParams — the endpoint is public and
 * returns nothing but slugs, so SSG can call it without a session (issue #1).
 */
export async function fetchTaxonomySlugs(): Promise<TaxonomySlugs> {
  const { data } = await apiFetch<{ data: TaxonomySlugs }>(
    "/sitemap/taxonomy.php",
    { revalidate: 3600, tags: ["categories", "authors", "tags"] },
  );
  return {
    categories: data?.categories || [],
    authors: data?.authors || [],
    tags: data?.tags || [],
  };
}

export async function fetchAllCategorySlugs(): Promise<string[]> {
  const { categories } = await fetchTaxonomySlugs();
  return categories;
}

export async function fetchAllAuthorSlugs(): Promise<string[]> {
  const { authors } = await fetchTaxonomySlugs();
  return authors;
}

export async function fetchAllTagSlugs(): Promise<string[]> {
  const { tags } = await fetchTaxonomySlugs();
  return tags;
}

export interface SitemapArticle {
  slug: string;
  title: string;
  categorySlug: string;
  publishedAt: string;
  updatedAt: string;
  featuredImage: string;
  featuredImageAlt: string;
  googleNewsExclude: boolean;
}

/** Number of article URLs emitted per sitemap-articles segment. */
export const SITEMAP_ARTICLES_PER_PAGE = 1000;

/**
 * Fetch one page of published, indexable articles for sitemap generation.
 * Image URLs are already absolutized server-side (api/sitemap/articles.php).
 */
export async function fetchSitemapArticles(
  page: number,
): Promise<{ articles: SitemapArticle[]; totalPages: number }> {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    per_page: String(SITEMAP_ARTICLES_PER_PAGE),
  });
  const { total_pages, data } = await apiFetch<{
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    data: Array<{
      slug: string;
      title: string;
      category_slug: string;
      published_at: string | null;
      updated_at: string | null;
      featured_image: string | null;
      featured_image_alt: string | null;
      google_news_exclude: boolean | number;
    }>;
  }>(`/sitemap/articles.php?${params.toString()}`, {
    revalidate: 300,
    tags: ["sitemap"],
  });

  const articles = (data || []).map((a) => ({
    slug: a.slug,
    title: a.title,
    categorySlug: a.category_slug || "latest",
    publishedAt: a.published_at || a.updated_at || "",
    updatedAt: a.updated_at || a.published_at || "",
    featuredImage: a.featured_image || "",
    featuredImageAlt: a.featured_image_alt || "",
    googleNewsExclude: a.google_news_exclude === true || a.google_news_exclude === 1,
  }));

  return { articles, totalPages: Number(total_pages) || 0 };
}
