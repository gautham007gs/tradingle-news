import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  fetchArticle,
  NotFoundError,
} from "../../../../lib/api";
import { prepareArticlePageData } from "../../../../lib/articlePage";
import { absoluteUrl } from "../../../../lib/site";
import {
  buildArticleJsonLd,
  articleOgImage,
} from "../../../../lib/seo";
import { toIsoDateTime } from "../../../../lib/homepage";
import JsonLd from "../../../../components/JsonLd";
import ArticlePageContent from "../../../../components/article/ArticlePageContent";

export const revalidate = 300;
export const dynamicParams = true;

/**
 * Slugs that cannot be used as a category segment.
 * Prevents conflicts with static routes.
 */
const RESERVED_CATEGORY_SLUGS = new Set([
  "about", "contact", "privacy", "terms", "advertise", "search",
  "saved", "admin", "contributor", "login", "register", "author",
  "tag", "api", "write-for-us", "editors-picks", "refer-earn",
  "cookies", "editorial-policy", "corrections-policy", "editorial-standards",
  "corrections", "rss", "location", "archive", "ownership",
  "dashboard", "account", "legal", "careers",
]);

type PageProps = { params: Promise<{ category: string; slug: string }> };

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  if (RESERVED_CATEGORY_SLUGS.has(category)) return {};

  try {
    const article = await fetchArticle(slug);
    const canonicalUrl =
      article.canonicalUrl ||
      absoluteUrl(`/${article.categorySlug || category}/${article.slug}`);
    const ogImage = articleOgImage(article);

    // Always fall back to article title / excerpt so meta tags are never blank
    const seoTitle = article.seoTitle || article.title;
    const seoDescription = article.seoDescription || article.excerpt;

    // Build article OG tags per-category and per-tag for richer signals
    const ogTags = article.tags?.map((t) => t.name) ?? [];
    const ogSection = article.categoryName || category;

    // Per-article X/Twitter creator handle: article-level field first, then author socialX
    const rawCreator =
      article.twitterCreator ||
      article.author.socialX ||
      "";
    const authorTwitter = rawCreator
      ? `@${rawCreator.replace(/^@/, "").replace(/^https?:\/\/(x|twitter)\.com\//i, "")}`
      : undefined;

    // Validate twitter card type against Next.js allowed values
    const validCards = ["summary", "summary_large_image", "app", "player"] as const;
    type TwitterCard = typeof validCards[number];
    const twitterCard: TwitterCard = validCards.includes(article.twitterCard as TwitterCard)
      ? (article.twitterCard as TwitterCard)
      : "summary_large_image";

    return {
      title: seoTitle,
      description: seoDescription,
      alternates: {
        canonical: canonicalUrl,
        types: {
          "application/rss+xml": absoluteUrl(`/${article.categorySlug || category}/rss.xml`),
        },
      },
      robots: {
        index: article.robotsIndex !== false,
        follow: article.robotsFollow !== false,
        googleBot: {
          index: article.robotsIndex !== false,
          follow: article.robotsFollow !== false,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        type: "article",
        siteName: "Tradingle",
        locale: "en_IN",
        publishedTime: toIsoDateTime(article.publishedAt),
        modifiedTime: toIsoDateTime(article.updatedAt || article.publishedAt),
        authors: [absoluteUrl(`/author/${article.author.slug}`)],
        section: ogSection,
        tags: ogTags,
        images: ogImage
          ? [{ url: ogImage, width: 1200, height: 630, alt: article.featuredImageAlt || seoTitle }]
          : [],
      },
      twitter: {
        card: twitterCard,
        site: "@tradingle",
        creator: authorTwitter,
        title: seoTitle,
        description: seoDescription,
        images: ogImage ? [{ url: ogImage, alt: seoTitle }] : [],
      },
    };
  } catch {
    return { title: "Article Not Found", robots: { index: false } };
  }
}

/**
 * Article pages at the canonical URL: /{categorySlug}/{articleSlug}
 * If the category segment doesn't match the article's real category,
 * performs a 301 redirect to the correct canonical URL.
 */
export default async function ArticlePage({ params }: PageProps) {
  const { category, slug } = await params;
  if (RESERVED_CATEGORY_SLUGS.has(category)) notFound();

  let pageData;
  try {
    pageData = await prepareArticlePageData(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const { article, leftRailRelated, leftRailTrending, rightRailDontMiss, moreStoryRows } =
    pageData;

  // Redirect to canonical URL if category param doesn't match
  const correctCategory = article.categorySlug || "latest";
  if (correctCategory && correctCategory !== category) {
    permanentRedirect(`/${correctCategory}/${article.slug}`);
  }

  return (
    <main id="main-content">
      <JsonLd data={buildArticleJsonLd(article)} />
      <ArticlePageContent
        article={article}
        slug={slug}
        leftRailRelated={leftRailRelated}
        leftRailTrending={leftRailTrending}
        rightRailDontMiss={rightRailDontMiss}
        moreStoryRows={moreStoryRows}
      />
    </main>
  );
}
