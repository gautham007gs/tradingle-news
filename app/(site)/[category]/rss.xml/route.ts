import { fetchArticles } from "../../../../lib/api";
import { absoluteAssetUrl, absoluteUrl } from "../../../../lib/site";
import { SITE_URL } from "../../../../lib/site";
import { fetchDeskFeed, resolveDeskHead } from "../../../../lib/deskFeed";
import { notFound } from "next/navigation";

export const revalidate = 300;

/* Per-desk RSS. Resolved through the same DeskHead as the page, so a section
   that exists only in the desk registry still serves a real feed — the page
   advertises /{slug}/rss.xml in its <link rel="alternate">, and advertising a
   404 would be worse than not advertising at all. */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type RouteParams = { params: Promise<{ category: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { category } = await params;

  const head = await resolveDeskHead(category);
  if (!head) notFound();

  let articles: Awaited<ReturnType<typeof fetchArticles>>["items"] = [];
  try {
    const feed = await fetchDeskFeed(head, { limit: 50 });
    articles = feed.items;
  } catch {
    articles = [];
  }

  const siteUrl = SITE_URL.replace(/\/$/, "");
  const feedUrl = absoluteUrl(`/${category}/rss.xml`);
  const categoryUrl = absoluteUrl(`/${category}`);

  const items = articles
    .map((a) => {
      const link = a.categorySlug && a.slug
        ? `${siteUrl}/${a.categorySlug}/${a.slug}`
        : `${siteUrl}/${a.slug}`;
      const pubDate = a.publishedAt
        ? new Date(a.publishedAt.replace(" ", "T")).toUTCString()
        : new Date().toUTCString();

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(a.excerpt || "")}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(a.categoryName || head.name)}</category>
      ${a.featuredImage ? `<enclosure url="${escapeXml(absoluteAssetUrl(a.featuredImage))}" type="image/jpeg" length="0" />` : ""}
    </item>`.trim();
    })
    .join("\n    ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${head.name} — Tradingle`)}</title>
    <link>${escapeXml(categoryUrl)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(head.description || `Latest ${head.name} news from Tradingle`)}</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>300</ttl>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
