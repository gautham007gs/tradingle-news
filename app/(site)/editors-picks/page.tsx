import type { Metadata } from "next";
import Link from "next/link";
import { fetchArticles, fetchHomepage } from "../../../lib/api";
import { summaryToStory, articlePath } from "../../../lib/homepage";
import { absoluteUrl } from "../../../lib/site";
import { buildCollectionPageJsonLd } from "../../../lib/seo";
import StoryTitle from "@/components/news/StoryTitle";
import JsonLd from "../../../components/JsonLd";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Editor's Picks | Tradingle",
  description:
    "Hand-picked stories selected by the Tradingle editorial team — curated for impact, originality, and reader value.",
  alternates: { canonical: absoluteUrl("/editors-picks") },
  openGraph: {
    title: "Editor's Picks | Tradingle",
    description:
      "Hand-picked stories selected by the Tradingle editorial team.",
    url: absoluteUrl("/editors-picks"),
    type: "website",
    siteName: "Tradingle",
    locale: "en_IN",
    images: [
      {
        url: absoluteUrl("/og-image.png"),
        width: 1200,
        height: 630,
        alt: "Editor's Picks — Tradingle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@tradingle",
    title: "Editor's Picks | Tradingle",
    description: "Curated stories selected by the Tradingle editorial team.",
    images: [absoluteUrl("/og-image.png")],
  },
};

export default async function EditorsPicksPage() {
  const [homepage, latest] = await Promise.all([
    fetchHomepage().catch(() => ({ editors_picks: [] })),
    fetchArticles({ limit: 36 }).catch(() => ({ items: [], nextCursor: null })),
  ]);

  const picks = (homepage.editors_picks || []).map(summaryToStory);
  const fallback = latest.items.map(summaryToStory);
  const stories = (picks.length ? picks : fallback).slice(0, 24);

  return (
    <main className="trd-container trd-editors-page py-8 sm:py-10">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "Editor's Picks",
          url: "/editors-picks",
          description:
            "Hand-picked stories selected by the Tradingle editorial team — curated for impact, originality, and reader value.",
          breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Editor's Picks", path: "/editors-picks" },
          ],
        })}
      />

      <header className="trd-editors-header">
        <nav className="mb-3 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1" aria-hidden>/</span>
          <span>Editor&apos;s Picks</span>
        </nav>
        <p className="trd-category-tag inline-block mb-2">Curated</p>
        <h1>Editor&apos;s Picks</h1>
        <p>
          Stories our editors recommend — selected for impact, originality, and reader value.
        </p>
      </header>

      <div className="trd-editors-grid">
        {stories.map((story) => (
          <article key={story.slug || story.title} className="trd-editors-card group">
            {story.image && (
              <Link href={articlePath(story)} className="trd-editors-card-media">
                <img
                  src={story.image}
                  alt={story.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </Link>
            )}
            <div className="trd-editors-card-body">
              <span className="trd-category-tag">{story.category || "Latest"}</span>
              <Link href={articlePath(story)} className="headline-link trd-editors-card-title">
                <StoryTitle title={story.title} as="h2" className="trd-editors-card-title" />
              </Link>
              {story.excerpt && (
                <p className="trd-editors-card-excerpt line-clamp-2">{story.excerpt}</p>
              )}
              <p className="trd-editors-card-time">{story.timestamp}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
