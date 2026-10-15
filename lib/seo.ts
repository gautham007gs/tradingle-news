/**
 * lib/seo.ts — Central SEO / structured data hub for Tradingle
 *
 * All schema nodes use the @graph pattern so cross-references (@id links)
 * work correctly across the page graph. This follows 2025/2026 best
 * practices for news sites and Google's E-E-A-T guidelines.
 */
import type { Article, ArticleSummary } from "./types";
import { absoluteAssetUrl, absoluteUrl, canonicalArticleUrl, SITE_URL } from "./site";
import { toIsoDateTime } from "./homepage";

// ── Shared constants ──────────────────────────────────────────────────────────

const SITE_NAME = "Tradingle";
const SITE_URL_CLEAN = SITE_URL.replace(/\/$/, "");

/** Stable @id anchors for cross-node references */
export const ORG_ID = `${SITE_URL_CLEAN}/#organization`;
export const SITE_ID = `${SITE_URL_CLEAN}/#website`;

/**
 * Canonical publisher node — reused across all schemas.
 * Includes E-E-A-T signals: policies, corrections, masthead.
 */
export const PUBLISHER: Record<string, unknown> = {
  "@type": "NewsMediaOrganization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: absoluteUrl("/"),
  logo: {
    "@type": "ImageObject",
    "@id": `${SITE_URL_CLEAN}/#logo`,
    // Issue #73: /assets/brand/logo.png does not exist — using og-image.png until a proper logo asset is added
    url: absoluteUrl("/og-image.png"),
    width: 1200,
    height: 630,
    caption: SITE_NAME,
  },
  sameAs: [
    "https://x.com/tradingle",
    "https://www.linkedin.com/company/tradingle",
  ],
  publishingPrinciples: absoluteUrl("/editorial-policy"),
  correctionsPolicy: absoluteUrl("/corrections-policy"),
  // Issue #79: masthead removed — /about is not a structural masthead page
  // Issue #80: diversityPolicy removed — editorial-standards is not a diversity policy
  ethicsPolicy: absoluteUrl("/editorial-standards"),
  // Issue #78: foundingDate removed — conflicted with careers page copy (2023 vs 2020)
  // Re-add only when the correct date is verified
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "editorial",
    url: absoluteUrl("/contact"),
    availableLanguage: "English",
  },
};

// ── Schema type resolution ────────────────────────────────────────────────────

/**
 * Maps contentType / schemaType to a valid Schema.org type for news articles.
 *
 * IMPORTANT: HowTo and Review are intentionally downgraded to "Article".
 * Those types require additional mandatory fields (step[] for HowTo,
 * itemReviewed for Review) that we cannot guarantee — Google's Rich Results
 * tester rejects them without those fields. "Article" is safe and correct.
 */
function resolveSchemaType(article: Article): string {
  const ct = (article.contentType || "").toLowerCase();
  if (ct === "opinion_editorial") return "OpinionNewsArticle";
  if (ct === "analysis") return "AnalysisNewsArticle";
  if (ct === "live_blog") return "LiveBlogPosting";
  // Degrade types that need extra mandatory schema fields
  if (ct === "evergreen_guide" || ct === "howto_tutorial" || ct === "review") return "Article";

  // Allow an explicit CMS schema_type only for safe news types
  const SAFE_TYPES = new Set([
    "NewsArticle", "OpinionNewsArticle", "AnalysisNewsArticle",
    "Article", "BlogPosting", "LiveBlogPosting", "ReportageNewsArticle",
    "BackgroundNewsArticle",
  ]);
  if (article.schemaType && SAFE_TYPES.has(article.schemaType)) {
    return article.schemaType;
  }
  return "NewsArticle";
}

// ── Spatial coverage helper ───────────────────────────────────────────────────

function buildSpatialCoverage(article: Article) {
  const places: Array<{ "@type": string; name: string }> = [];
  if (article.locationCity) places.push({ "@type": "Place", name: article.locationCity });
  if (article.locationState) places.push({ "@type": "Place", name: article.locationState });
  if (article.locationCountry) places.push({ "@type": "Place", name: article.locationCountry });
  return places.length ? places : undefined;
}

// ── Author social sameAs helper ───────────────────────────────────────────────

function authorSameAs(author: {
  socialX?: string | null;
  socialLinkedin?: string | null;
  socialWebsite?: string | null;
}): string[] {
  return [
    author.socialX && (
      author.socialX.startsWith("http")
        ? author.socialX
        : `https://x.com/${author.socialX.replace(/^@/, "")}`
    ),
    author.socialLinkedin && (
      author.socialLinkedin.startsWith("http")
        ? author.socialLinkedin
        : `https://linkedin.com/in/${author.socialLinkedin}`
    ),
    author.socialWebsite && (
      author.socialWebsite.startsWith("http")
        ? author.socialWebsite
        : `https://${author.socialWebsite}`
    ),
  ].filter((x): x is string => Boolean(x));
}

// ── Article JSON-LD ───────────────────────────────────────────────────────────

export function buildArticleJsonLd(article: Article) {
  // CMS canonical URLs are accepted only when they stay on this site and use
  // the canonical article path. This prevents malformed legacy/off-site values
  // from leaking into JSON-LD.
  const generatedCanonicalUrl = canonicalArticleUrl(article.slug, article.categorySlug);
  const configuredCanonicalUrl = (article.canonicalUrl || "").trim();
  const canonicalUrl =
    configuredCanonicalUrl.startsWith(SITE_URL.replace(/\/$/, "") + "/")
      ? configuredCanonicalUrl
      : generatedCanonicalUrl;

  const ogImage = absoluteAssetUrl(article.seoOgImage || article.featuredImage);
  const schemaType = resolveSchemaType(article);
  const spatialCoverage = buildSpatialCoverage(article);
  const authorUrl = absoluteUrl(`/author/${article.author.slug}`);
  const sameAs = authorSameAs(article.author);

  // Author node with full E-E-A-T signals
  const authorNode: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${authorUrl}#person`,
    name: article.author.name,
    url: authorUrl,
    worksFor: { "@type": "Organization", "@id": ORG_ID },
  };
  if (article.author.bio) authorNode.description = article.author.bio;
  if (article.author.avatar) authorNode.image = absoluteAssetUrl(article.author.avatar);
  if (article.author.roleTitle) authorNode.jobTitle = article.author.roleTitle;
  if (sameAs.length) authorNode.sameAs = sameAs;

  // Image objects
  const imageObjects: unknown[] = [];
  if (ogImage) {
    imageObjects.push({
      "@type": "ImageObject",
      "@id": `${canonicalUrl}#primaryimage`,
      url: ogImage,
      width: 1200,
      height: 630,
      caption: article.featuredImageAlt || article.seoTitle || article.title,
    });
  }
  // Also include the feature image if different from OG image
  const absoluteFeaturedImage = absoluteAssetUrl(article.featuredImage);
  if (absoluteFeaturedImage && absoluteFeaturedImage !== ogImage) {
    imageObjects.push({
      "@type": "ImageObject",
      url: absoluteFeaturedImage,
      width: 1200,
      height: 630,
      caption: article.featuredImageAlt || article.title,
    });
  }

  // Issue #82: headline must be the visible article title, not the SEO title.
  // SEO title and actual headline are not interchangeable per schema.org guidance.
  const headline = article.title.slice(0, 110);
  const description = article.seoDescription || article.excerpt;

  const articleNode: Record<string, unknown> = {
    "@type": schemaType,
    "@id": `${canonicalUrl}#article`,
    headline,
    // Keep SEO title available for search-engine display via alternateName
    ...(article.seoTitle && article.seoTitle !== article.title ? { alternateName: article.seoTitle.slice(0, 110) } : {}),
    name: headline,
    description,
    datePublished: toIsoDateTime(article.publishedAt),
    dateModified: toIsoDateTime(article.updatedAt || article.publishedAt),
    url: canonicalUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    author: authorNode,
    publisher: { "@type": "NewsMediaOrganization", "@id": ORG_ID },
    isPartOf: { "@type": "WebSite", "@id": SITE_ID },
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    image: imageObjects.length ? imageObjects : undefined,
  };

  // Category / section for NewsArticle types
  if (article.categoryName) {
    articleNode.articleSection = article.categoryName;
    articleNode.genre = article.categoryName;
  }

  // Word count (estimated from reading time at 200 wpm)
  if (article.readingTimeMinutes) {
    articleNode.wordCount = article.readingTimeMinutes * 200;
  }

  // Tags → keywords + about
  if (article.tags?.length) {
    articleNode.keywords = article.tags.map((t) => t.name).join(", ");
    articleNode.about = article.tags.slice(0, 5).map((tag) => ({
      "@type": "Thing",
      name: tag.name,
    }));
  }

  // Correction note
  if (article.correctionNote) articleNode.correction = article.correctionNote;

  // Sponsored content
  if (article.isSponsored && article.sponsorName) {
    articleNode.sponsor = { "@type": "Organization", name: article.sponsorName };
  }

  // Geographic coverage
  if (spatialCoverage) articleNode.spatialCoverage = spatialCoverage;

  // SpeakableSpecification — for AEO / GEO (AI answer engines, voice assistants)
  articleNode.speakable = {
    "@type": "SpeakableSpecification",
    cssSelector: ["[data-speakable='headline']", "[data-speakable='description']"],
  };

  // Breadcrumb
  const breadcrumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
  ];
  if (article.categorySlug && article.categoryName) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: article.categoryName,
      item: absoluteUrl(`/${article.categorySlug}`),
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: article.seoTitle || article.title,
      item: canonicalUrl,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: article.seoTitle || article.title,
      item: canonicalUrl,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      articleNode,
      {
        "@type": "WebPage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: headline,
        description,
        isPartOf: { "@id": SITE_ID },
        inLanguage: "en-IN",
        datePublished: toIsoDateTime(article.publishedAt),
        dateModified: toIsoDateTime(article.updatedAt || article.publishedAt),
        ...(imageObjects.length
          ? { primaryImageOfPage: { "@id": `${canonicalUrl}#primaryimage` } }
          : {}),
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
      // Stub nodes so per-page validators can resolve @id references
      // (Full nodes are emitted on the homepage via buildWebsiteJsonLd)
      { "@type": "WebSite", "@id": SITE_ID, name: SITE_NAME, url: absoluteUrl("/") },
      { "@type": "NewsMediaOrganization", "@id": ORG_ID, name: SITE_NAME, url: absoluteUrl("/") },
    ],
  };
}

// ── Website + Organization (emitted on homepage) ──────────────────────────────

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description:
          "Breaking news, in-depth analysis and precise institutional reporting on India, markets, finance, technology and global affairs.",
        inLanguage: "en-IN",
        publisher: { "@id": ORG_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      // Full Organization node (E-E-A-T trust signals)
      PUBLISHER,
    ],
  };
}

// ── Collection pages (category, tag, archive) ─────────────────────────────────

export function buildCollectionPageJsonLd(opts: {
  name: string;
  url: string;
  description?: string;
  breadcrumbItems?: Array<{ name: string; path: string }>;
}) {
  const pageUrl = absoluteUrl(opts.url);
  const crumbs = opts.breadcrumbItems ?? [
    { name: "Home", path: "/" },
    { name: opts.name, path: opts.url },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collectionpage`,
        name: opts.name,
        url: pageUrl,
        description: opts.description,
        isPartOf: { "@id": SITE_ID },
        publisher: { "@id": ORG_ID },
        inLanguage: "en-IN",
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: crumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      },
      { "@type": "WebSite", "@id": SITE_ID, name: SITE_NAME, url: absoluteUrl("/") },
      { "@type": "NewsMediaOrganization", "@id": ORG_ID, name: SITE_NAME, url: absoluteUrl("/") },
    ],
  };
}

// ── Standalone breadcrumb (kept for backwards compatibility) ──────────────────

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// ── Person / Author profile pages ─────────────────────────────────────────────

export function buildPersonJsonLd(author: {
  displayName: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  roleTitle?: string;
  socialX?: string;
  socialLinkedin?: string;
  socialWebsite?: string;
}) {
  const authorUrl = absoluteUrl(`/author/${author.slug}`);
  const sameAs = authorSameAs(author);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${authorUrl}#person`,
        name: author.displayName,
        url: authorUrl,
        description: author.bio || undefined,
        image: author.avatarUrl
          ? {
              "@type": "ImageObject",
              url: author.avatarUrl,
              caption: author.displayName,
            }
          : undefined,
        jobTitle: author.roleTitle || "Journalist",
        worksFor: { "@type": "Organization", "@id": ORG_ID },
        sameAs: sameAs.length ? sameAs : undefined,
      },
      {
        "@type": "ProfilePage",
        "@id": `${authorUrl}#profilepage`,
        url: authorUrl,
        name: `${author.displayName} — ${SITE_NAME}`,
        description: author.bio
          ? author.bio.slice(0, 160)
          : `Articles by ${author.displayName} on ${SITE_NAME}`,
        mainEntity: { "@id": `${authorUrl}#person` },
        isPartOf: { "@id": SITE_ID },
        inLanguage: "en-IN",
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Authors", item: absoluteUrl("/author") },
            { "@type": "ListItem", position: 3, name: author.displayName, item: authorUrl },
          ],
        },
      },
      { "@type": "WebSite", "@id": SITE_ID, name: SITE_NAME, url: absoluteUrl("/") },
      { "@type": "NewsMediaOrganization", "@id": ORG_ID, name: SITE_NAME, url: absoluteUrl("/") },
    ],
  };
}

// ── ItemList (homepage featured stories, GEO / AI answer engine signals) ─────

export function buildItemListJsonLd(
  items: Array<{ title: string; url: string; image?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top Stories",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.title,
      url: absoluteUrl(item.url),
      image: item.image || undefined,
    })),
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

export function articleOgImage(article: Article | ArticleSummary): string {
  if ("seoOgImage" in article && article.seoOgImage)
    return absoluteAssetUrl(article.seoOgImage);
  if ("featuredImage" in article) return absoluteAssetUrl(article.featuredImage);
  return "";
}
