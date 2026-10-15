import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import JsonLd from "../../../components/JsonLd";
import { buildCollectionPageJsonLd } from "../../../lib/seo";
import { Rss } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "RSS Feeds | Tradingle",
  description:
    "Subscribe to Tradingle's RSS feeds by topic or region. Add any feed URL to your favourite reader — Feedly, Inoreader, or any RSS-compatible app.",
  alternates: { canonical: absoluteUrl("/rss") },
  openGraph: {
    title: "RSS Feeds | Tradingle",
    description: "Subscribe to Tradingle's RSS feeds by topic or region.",
    url: absoluteUrl("/rss"),
    type: "website",
    siteName: "Tradingle",
  },
};

/**
 * Only list feeds that actually exist as live routes.
 * Non-existent feed URLs create crawler 404s that waste crawl budget.
 */
const RSS_FEEDS = [
  {
    section: "Main Feeds",
    feeds: [
      {
        label: "All News",
        path: "/feed.xml",
        description: "Every published article — the primary Tradingle feed",
      },
    ],
  },
  {
    section: "By Topic",
    feeds: [
      { label: "India", path: "/india/rss.xml", description: "India news and analysis" },
      { label: "World", path: "/world/rss.xml", description: "International coverage" },
      { label: "Business", path: "/business/rss.xml", description: "Business, markets, economy" },
      { label: "Technology", path: "/technology/rss.xml", description: "Tech, AI, startups" },
      { label: "Sports", path: "/sports/rss.xml", description: "Cricket, football, and more" },
      { label: "Politics", path: "/politics/rss.xml", description: "National & global politics" },
      { label: "Entertainment", path: "/entertainment/rss.xml", description: "Movies, music, culture" },
      { label: "Science", path: "/science/rss.xml", description: "Research, space, wellness" },
      { label: "Opinion", path: "/opinion/rss.xml", description: "Columns & editorials" },
    ],
  },
  {
    section: "Google News",
    feeds: [
      {
        label: "Google News Sitemap",
        path: "/news-sitemap.xml",
        description: "Articles from the last 48 hours — submitted to Google News",
        isXml: true,
      },
    ],
  },
];

export default function RssPage() {
  return (
    <main className="trd-container py-10 max-w-3xl mx-auto">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "RSS Feeds",
          url: "/rss",
          description:
            "Subscribe to Tradingle news via RSS. Add any feed URL to your favourite reader — Feedly, Inoreader, or any RSS-compatible app.",
          breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "RSS Feeds", path: "/rss" },
          ],
        })}
      />

      <header className="mb-10 border-b pb-6">
        <nav className="mb-3 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1" aria-hidden>/</span>
          <span>RSS Feeds</span>
        </nav>
        <div className="flex items-center gap-3 mb-3">
          <span className="p-2 bg-primary/10 rounded-lg text-primary">
            <Rss size={24} aria-hidden />
          </span>
          <h1 className="text-4xl font-bold">RSS Feeds</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Subscribe to Tradingle news via RSS. Add any feed URL to your favourite reader — Feedly,
          Inoreader, or any RSS-compatible app.
        </p>
      </header>

      <div className="space-y-10">
        {RSS_FEEDS.map((group) => (
          <section key={group.section}>
            <h2 className="text-lg font-bold mb-4 border-l-4 border-primary pl-4">
              {group.section}
            </h2>
            <div className="divide-y border rounded-lg overflow-hidden">
              {group.feeds.map((feed) => (
                <div
                  key={feed.path}
                  className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{feed.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{feed.description}</p>
                    <p className="text-[11px] text-muted-foreground/70 font-mono mt-1">
                      {absoluteUrl(feed.path)}
                    </p>
                  </div>
                  <a
                    href={absoluteUrl(feed.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded px-3 py-1.5 hover:bg-primary/10 transition-colors flex-shrink-0 ml-4"
                    aria-label={`Subscribe to ${feed.label} RSS feed`}
                  >
                    <Rss size={12} aria-hidden />
                    Subscribe
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 p-5 bg-muted rounded-lg text-sm">
        <p className="font-semibold mb-2">Syndication & Developer API</p>
        <p className="text-muted-foreground">
          Looking to syndicate Tradingle content programmatically? Contact{" "}
          <a
            href="mailto:syndication@tradingle.com"
            className="text-primary hover:underline"
          >
            syndication@tradingle.com
          </a>{" "}
          for API access and licensing terms.
        </p>
      </section>
    </main>
  );
}
