/** Typed shapes for the PHP API — every field explicit, no `any`. */

export interface ArticleAuthor {
  id: number;
  name: string;
  slug: string;
  avatar?: string | null;
  bio?: string | null;
  roleTitle?: string | null;
  socialX?: string | null;
  socialLinkedin?: string | null;
  socialWebsite?: string | null;
}

export interface ArticleTag {
  id: number;
  name: string;
  slug: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageAlt: string;
  featuredImageCaption: string;
  imageSource: string;
  categoryName: string;
  categorySlug: string;
  author: ArticleAuthor;
  tags: ArticleTag[];
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  views: number;
  isLive: boolean;
  isSponsored: boolean;
  sponsorName: string;
  sponsorDisclosure: string;
  commentsEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string;
  canonicalUrl: string;
  schemaType: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  correctionNote: string;
  priority: string;
  /** Content intent classification — drives schema auto-selection */
  contentType: string;
  /** When true, this post is excluded from Google News RSS feeds */
  googleNewsExclude: boolean;
  /** Geographic coverage fields */
  locationCountry: string;
  locationState: string;
  locationCity: string;
  /** ISO date for the next evergreen content audit reminder */
  evergreenAuditDate: string;
  /** X/Twitter card type for this article (summary_large_image, summary, app, player) */
  twitterCard: string;
  /** Article-level X/Twitter creator handle (without @), overrides author.socialX for twitter:creator */
  twitterCreator: string;
}

export interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  featuredImageAlt: string;
  categoryName: string;
  categorySlug: string;
  authorName: string;
  authorSlug: string;
  authorAvatar: string;
  tagSlugs: string[];
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  views: number;
  isLive: boolean;
  priority: string;
  contentType?: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface Author {
  id: number;
  slug: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  roleTitle: string;
  socialX: string;
  socialLinkedin: string;
  socialWebsite: string;
}

export interface AuthorPageData {
  author: Author;
  articles: ArticleSummary[];
}

export interface ArticlesResult {
  items: ArticleSummary[];
  nextCursor: string | null;
}

export interface HomepageSlots {
  [slotKey: string]: ArticleSummary[];
}

export interface SiteSettings {
  homepage_seo_title: string;
  homepage_seo_description: string;
  footer_tagline: string;
  spotlight_label: string;
  spotlight_kicker: string;
  more_for_you_title: string;
  show_read_time: string;
  show_view_count: string;
  site_name: string;
  maintenance_enabled: string;
  maintenance_message: string;
  /** Identity */
  site_default_og_image: string;
  site_logo_url: string;
  social_twitter: string;
  /** Analytics IDs (for server-side injection) */
  ga4_measurement_id: string;
  gtm_container_id: string;
  google_site_verification: string;
  /** Google News sitemap window in hours (default 48) */
  news_sitemap_window_hours: string;
}

/** Raw PHP API shapes (snake_case) */
export interface ApiArticleSummaryRaw {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  featured_image?: string | null;
  featured_image_alt?: string | null;
  status: string;
  priority: string;
  is_live: number | boolean;
  published_at?: string | null;
  updated_at: string;
  views?: number;
  reading_time_minutes?: number;
  category_name?: string | null;
  category_slug?: string | null;
  tag_slugs?: string | null;
  author_name: string;
  author_slug: string;
  author_avatar?: string | null;
  content_type?: string | null;
}

export interface ApiArticleRaw extends ApiArticleSummaryRaw {
  content?: string | null;
  featured_image_caption?: string | null;
  image_source?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_og_image?: string | null;
  canonical_url?: string | null;
  schema_type?: string | null;
  correction_note?: string | null;
  robots_index?: number | boolean;
  robots_follow?: number | boolean;
  comments_enabled?: number | boolean;
  is_sponsored?: number | boolean;
  sponsor_name?: string | null;
  sponsor_disclosure?: string | null;
  author_bio?: string | null;
  author_role_title?: string | null;
  tags: Array<{ id: number; name: string; slug: string }>;
  google_news_exclude?: number | boolean | null;
  location_country?: string | null;
  location_state?: string | null;
  location_city?: string | null;
  evergreen_audit_date?: string | null;
  twitter_card?: string | null;
  twitter_creator?: string | null;
}

export interface ApiCategoryRaw {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
}

export interface ApiAuthorRaw {
  id: number;
  display_name: string;
  slug: string;
  avatar_url?: string | null;
  bio?: string | null;
  role_title?: string | null;
  social_x?: string | null;
  social_linkedin?: string | null;
  social_website?: string | null;
}
