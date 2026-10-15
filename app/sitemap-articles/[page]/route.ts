import { NextResponse } from "next/server";
import { fetchSitemapArticles } from "../../../lib/api";
import { absoluteAssetUrl, canonicalArticleUrl } from "../../../lib/site";

// Article sitemap segments — /sitemap-articles/1, /sitemap-articles/2, ...
// Each segment holds up to SITEMAP_ARTICLES_PER_PAGE published, indexable
// articles so the sitemap never truncates coverage (no 500-row / 30-day cap).
export const revalidate = 300;

type RouteParams = { params: Promise<{ page: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { page } = await params;
  const pageNumber = Number(page);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let articles: Awaited<ReturnType<typeof fetchSitemapArticles>>["articles"] = [];
  try {
    const result = await fetchSitemapArticles(pageNumber);
    articles = result.articles;
  } catch {
    articles = [];
  }

  if (articles.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${articles
    .map((a) => {
      const loc = canonicalArticleUrl(a.slug, a.categorySlug);
      const lastmod = a.updatedAt
        ? new Date(a.updatedAt.replace(" ", "T")).toISOString()
        : "";
      const imageTag = a.featuredImage
        ? `
    <image:image>
      <image:loc>${escapeXml(absoluteAssetUrl(a.featuredImage))}</image:loc>
      ${a.featuredImageAlt ? `<image:title>${escapeXml(a.featuredImageAlt)}</image:title>` : `<image:title>${escapeXml(a.title)}</image:title>`}
    </image:image>`
        : "";

      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>${imageTag}
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
