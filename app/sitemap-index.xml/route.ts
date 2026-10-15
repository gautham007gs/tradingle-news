import { NextResponse } from "next/server";
import { fetchSitemapArticles } from "../../lib/api";
import { absoluteUrl } from "../../lib/site";

// Sitemap index — points crawlers at the segmented sitemaps, matching the
// legacy api/sitemap-index.php behavior now that the Apache→Node proxy serves
// this route. Lists the news sitemap, the shared sitemap (static/category/
// author/tag URLs) and one segment per SITEMAP_ARTICLES_PER_PAGE articles so
// full article coverage is never truncated.
export const revalidate = 300;

export async function GET() {
  let articleSegments: string[] = [];
  try {
    const { totalPages } = await fetchSitemapArticles(1);
    articleSegments = Array.from({ length: totalPages }, (_, i) => String(i + 1));
  } catch {
    articleSegments = [];
  }

  const entries = [
    { url: absoluteUrl("/news-sitemap.xml") },
    { url: absoluteUrl("/sitemap.xml") },
    ...articleSegments.map((page) => ({
      url: absoluteUrl(`/sitemap-articles/${page}`),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
    .map(
      (entry) => `  <sitemap>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`,
    )
    .join("\n")}
</sitemapindex>`;

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
