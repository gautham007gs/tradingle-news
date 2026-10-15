import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAllTagSlugs, fetchArticles } from "../../../../lib/api";
import { summaryToStory, type StoryCardData } from "../../../../lib/homepage";
import { absoluteUrl } from "../../../../lib/site";
import { buildCollectionPageJsonLd } from "../../../../lib/seo";
import JsonLd from "../../../../components/JsonLd";
import LoadMoreButton from "../../../../components/LoadMoreButton";
import AdSpace from "@/components/news/AdSpace";
import {
  FeedCardGrid,
  FeedEmpty,
  FeedIndexColumns,
  FeedLead,
  FeedMasthead,
  FeedRail,
  FeedRows,
  FeedShell,
  SectionHead,
} from "../../../../components/feed/FeedKit";

/* ─────────────────────────────────────────────────────────────────────────────
   TOPIC ARCHIVE — /tag/{slug}

   Same primitives as the desk fronts, so a topic reads as part of the paper
   rather than as a plugin's tag page.

   404 policy. A tag we have never heard of is a real 404. A tag that is in our
   own taxonomy but has nothing published yet is *not*: /topics and /sitemap
   link to every taxonomy tag, so 404ing those would mean publishing broken
   links. Those render an honest empty state and are marked noindex, which keeps
   the soft-404 contract with search engines while keeping the site's own links
   sound.
   ────────────────────────────────────────────────────────────────────────── */

export const revalidate = 180;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

const titleise = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateStaticParams() {
  try {
    const slugs = await fetchAllTagSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

/** One request, shared by generateMetadata and the page through the fetch
    cache — both ask for the same limit so they hit the same entry. */
const PAGE_SIZE = 30;

async function loadTag(slug: string) {
  const known = await fetchAllTagSlugs()
    .then((slugs) => slugs.includes(slug))
    .catch(() => true); /* taxonomy unavailable: assume known, never 404 on it */
  try {
    const { items, nextCursor } = await fetchArticles({ tag: slug, limit: PAGE_SIZE });
    return { known, stories: items.map(summaryToStory), nextCursor, failed: false };
  } catch {
    return { known, stories: [] as StoryCardData[], nextCursor: null, failed: true };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = titleise(slug);
  const tagUrl = absoluteUrl(`/tag/${slug}`);
  const { stories, failed } = await loadTag(slug);
  const title = `${label} — News & Analysis | Tradingle`;
  const description = `Latest news, analysis and stories filed under ${label} on Tradingle.`;

  return {
    title,
    description,
    alternates: { canonical: tagUrl },
    /* Thin or empty: keep the page reachable for readers, keep it out of the
       index. */
    robots: !failed && stories.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${label} | Tradingle`,
      description,
      url: tagUrl,
      type: "website",
      siteName: "Tradingle",
      locale: "en_IN",
      images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: label }],
    },
    twitter: { card: "summary_large_image", site: "@tradingle", title, description },
  };
}

/* The rail on a topic page deliberately does not repeat the stories already in
   the main column — it offers the way out to the wider index instead. */
function TopicRailNote({ label }: { label: string }) {
  return (
    <div>
      <SectionHead title="About this topic" />
      <p className="text-[13.5px] leading-[1.55] text-[color:var(--ink-700)]">
        Every story we file under <span className="font-[600] text-[color:var(--ink-900)]">{label}</span>{" "}
        appears here, newest first.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/topics"
          className="inline-block border border-[color:var(--rule-strong)] px-2.5 py-[5px] text-[12px] font-[600] text-[color:var(--ink-800)] transition-colors hover:border-[color:var(--ink-900)] hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
        >
          All topics A–Z
        </Link>
        <Link
          href="/latest"
          className="inline-block border border-[color:var(--rule-strong)] px-2.5 py-[5px] text-[12px] font-[600] text-[color:var(--ink-800)] transition-colors hover:border-[color:var(--ink-900)] hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
        >
          Latest news
        </Link>
      </div>
    </div>
  );
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const label = titleise(slug);
  const { known, stories, nextCursor, failed } = await loadTag(slug);

  /* Never heard of it and nothing published under it: a real 404. */
  if (!known && !failed && stories.length === 0) notFound();

  const [lead, ...rest] = stories;
  const index = rest.slice(0, 6);
  const cards = rest.slice(6, 12);
  const rows = rest.slice(12);

  return (
    <main id="main-content" className="bg-[color:var(--canvas)]">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: `${label} News`,
          url: `/tag/${slug}`,
          description: `Latest news, analysis and stories filed under ${label} on Tradingle.`,
          breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Topics", path: "/topics" },
            { name: label, path: `/tag/${slug}` },
          ],
        })}
      />

      <FeedMasthead
        title={label}
        kicker="Topic"
        standfirst={`Reporting, analysis and comment filed under ${label}.`}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/topics", label: "Topics" },
        ]}
        meta={
          stories.length > 0 ? (
            <p className="mt-3 text-[12px] font-[500] uppercase tracking-[0.08em] tabular-nums text-[color:var(--ink-500)]">
              {stories.length}
              {nextCursor ? "+" : ""} {stories.length === 1 ? "story" : "stories"}
            </p>
          ) : null
        }
      />

      <FeedShell
        leaderboard="tag_leaderboard"
        rail={
          <FeedRail title="" stories={[]} adSlots={["tag_sidebar_1", "tag_sidebar_2"]}>
            <TopicRailNote label={label} />
          </FeedRail>
        }
      >
        {failed ? (
          <FeedEmpty
            kicker="Temporarily unavailable"
            title="We couldn't load stories for this topic."
            body="This is usually brief. Refresh in a moment, or read the front page while we reconnect."
          />
        ) : stories.length === 0 ? (
          <FeedEmpty
            title={`Nothing has been filed under ${label} yet.`}
            body="The topic is live and will fill as our reporters file against it."
            ctaHref="/topics"
            ctaLabel="Browse all topics"
          />
        ) : null}

        {lead ? <FeedLead story={lead} /> : null}

        {index.length > 0 ? (
          <section aria-label={`More on ${label}`} className="mt-8">
            <SectionHead title="More on this topic" note="Newest first" />
            <FeedIndexColumns stories={index} />
          </section>
        ) : null}

        {cards.length > 0 ? (
          <>
            <div className="mt-9 border-t border-t-[color:var(--rule)] pt-4">
              <AdSpace slotKey="tag_mid_leaderboard" height={90} label="Advertisement" />
            </div>
            <section aria-label={`${label} features`} className="mt-8">
              <SectionHead title="Features & analysis" />
              <FeedCardGrid stories={cards} />
            </section>
          </>
        ) : null}

        {rows.length > 0 ? (
          <section aria-label={`All ${label} coverage`} className="mt-10">
            <SectionHead title="Earlier coverage" />
            <FeedRows stories={rows} adSlotPrefix="tag_infeed" />
          </section>
        ) : null}

        <LoadMoreButton tag={slug} initialCursor={nextCursor} />
      </FeedShell>
    </main>
  );
}
