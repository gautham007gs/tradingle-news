import { NextResponse } from "next/server";
import { fetchSitemapArticles, fetchSiteSettings } from "../../lib/api";
import { absoluteAssetUrl, canonicalArticleUrl } from "../../lib/site";

// Google News Sitemap refreshes frequently — revalidate every 5 minutes
export const revalidate = 300;

export async function GET() {
  const articles: Array<{
    slug: string;
    categorySlug: string;
    title: string;
    publishedAt: string;
    featuredImage?: string;
  }> = [];

  // Window configurable via site_settings.news_sitemap_window_hours (default 48h)
  let windowHours = 48;
  try {
    const settings = await fetchSiteSettings();
    const parsed = Number(settings.news_sitemap_window_hours);
    if (Number.isFinite(parsed) && parsed >= 1) windowHours = parsed;
  } catch {
    /* keep default */
  }

  // Paginate through every article segment (no truncation), keeping only the
  // stories published inside the Google News window. Segments are ordered
  // oldest→newest, so walk from the newest segment back and stop at the first
  // segment that is entirely older than the cutoff.
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  try {
    const first = await fetchSitemapArticles(1);
    let page = first.totalPages;
    while (page >= 1) {
      const { articles: segment } = await fetchSitemapArticles(page);
      const withinWindow = segment.filter((a) => {
        if (a.googleNewsExclude) return false;
        // Issue #71: Explicitly parse as UTC by appending "Z"
        const ts = new Date(a.publishedAt.replace(" ", "T") + "Z").getTime();
        return !Number.isNaN(ts) && ts >= cutoff;
      });
      articles.push(
        ...withinWindow.map((a) => ({
          slug: a.slug,
          categorySlug: a.categorySlug,
          title: a.title,
          publishedAt: a.publishedAt,
          featuredImage: a.featuredImage || undefined,
        })),
      );
      // Issue #72: Instead of stopping on empty window (where all might be excluded),
      // stop only when the newest article in this segment is older than the cutoff.
      const maxTs = segment.reduce((max, a) => {
        const t = new Date(a.publishedAt.replace(" ", "T") + "Z").getTime();
        return !Number.isNaN(t) && t > max ? t : max;
      }, 0);
      if (maxTs < cutoff) break;
      page -= 1;
    }
  } catch {
    /* nothing — return an empty sitemap */
  }

  // Issue #70: Google News sitemap max 1000 items ceiling, sorted by newest first
  articles.sort((a, b) => {
    const tA = new Date(a.publishedAt.replace(" ", "T") + "Z").getTime();
    const tB = new Date(b.publishedAt.replace(" ", "T") + "Z").getTime();
    return tB - tA;
  });
  const newsArticles = articles.slice(0, 1000);

  const siteName = "Tradingle";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${newsArticles
    .map((a) => {
      // Issue #71: Explicitly parse as UTC
      const pubDate = new Date(a.publishedAt.replace(" ", "T") + "Z").toISOString();
      const loc = canonicalArticleUrl(a.slug, a.categorySlug);

      const imageTag = a.featuredImage
        ? `
    <image:image>
      <image:loc>${escapeXml(absoluteAssetUrl(a.featuredImage))}</image:loc>
      <image:title>${escapeXml(a.title)}</image:title>
    </image:image>`
        : "";

      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteName)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>${imageTag}
  </url>`;
    })
    .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
