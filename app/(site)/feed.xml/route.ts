import { fetchArticles } from "../../../lib/api";
import { absoluteAssetUrl, absoluteUrl, SITE_URL } from "../../../lib/site";

export const revalidate = 300;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let articles: Awaited<ReturnType<typeof fetchArticles>>["items"] = [];

  try {
    const result = await fetchArticles({ limit: 50 });
    articles = result.items;
  } catch {
    articles = [];
  }

  const siteUrl = SITE_URL.replace(/\/$/, "");

  const items = articles
    .map((a) => {
      // Canonical URL always includes the category segment
      const link =
        a.categorySlug && a.slug
          ? `${siteUrl}/${a.categorySlug}/${a.slug}`
          : `${siteUrl}/${a.slug}`;

      const pubDate = a.publishedAt
        ? new Date(a.publishedAt.replace(" ", "T")).toUTCString()
        : new Date().toUTCString();

      // Author display name — dc:creator for names (RSS <author> requires email)
      const authorName = a.authorName || "Tradingle Staff";

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(a.excerpt || "")}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(a.categoryName || "News")}</category>
      <dc:creator>${escapeXml(authorName)}</dc:creator>
      ${a.featuredImage
        ? `<enclosure url="${escapeXml(absoluteAssetUrl(a.featuredImage))}" type="image/jpeg" length="0" />
      <media:content url="${escapeXml(absoluteAssetUrl(a.featuredImage))}" medium="image" type="image/jpeg">
        <media:title>${escapeXml(a.title)}</media:title>
        ${a.featuredImageAlt ? `<media:description>${escapeXml(a.featuredImageAlt)}</media:description>` : ""}
      </media:content>`
        : ""}
    </item>`.trim();
    })
    .join("\n    ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Tradingle — Latest News</title>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
    <description>Breaking news and in-depth analysis from Tradingle</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>editorial@tradingle.com (Tradingle Editorial)</managingEditor>
    <webMaster>tech@tradingle.com (Tradingle Tech)</webMaster>
    <ttl>300</ttl>
    <image>
      <!-- Issue #73: /assets/brand/logo.png does not exist — use the real site image -->
      <url>${escapeXml(absoluteUrl("/og-image.png"))}</url>
      <title>Tradingle</title>
      <link>${escapeXml(siteUrl)}</link>
      <width>1200</width>
      <height>630</height>
    </image>
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
