import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchAllCategorySlugs, fetchArticle, NotFoundError } from "../../../lib/api";
import { summaryToStory, type StoryCardData } from "../../../lib/homepage";
import { absoluteUrl } from "../../../lib/site";
import { buildCollectionPageJsonLd } from "../../../lib/seo";
import { DESK_SLUGS, deskSiblings, getDesk } from "../../../lib/desks";
import { fetchDeskFeed, resolveDeskHead, type DeskHead } from "../../../lib/deskFeed";
import JsonLd from "../../../components/JsonLd";
import LoadMoreButton from "../../../components/LoadMoreButton";
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
} from "../../../components/feed/FeedKit";

/* ─────────────────────────────────────────────────────────────────────────────
   DESK PAGE — /{slug}

   One template for every section, whether the slug is a CMS category or a desk
   that only exists in the registry (lib/desks.ts). Both arrive here as a
   `DeskHead` from lib/deskFeed.ts, so this component never has to know which.

   Every visual primitive comes from components/feed/FeedKit.tsx, which the
   chronological front, the tag archives, author pages and search also use — one
   type and rule system instead of the four this page used to be one of.

   Composition, top to bottom: masthead with the sibling-desk strip, lead
   feature, two-column ruled headline index, card grid, ruled rows with in-feed
   ads, and a quiet sticky rail. Colour: none.
   ────────────────────────────────────────────────────────────────────────── */

export const revalidate = 180;
export const dynamicParams = true;

/* Slugs owned by a real route. `[category]` must never answer for these, or a
   desk would shadow the masthead's own pages.

   Only list slugs that actually have a route. This set used to also hold
   placeholders for pages someone might build one day — "videos", "photos",
   "live", "weather" — and that turned a live CMS category into a dead end: the
   newsroom publishes under the `videos` category, every one of those articles
   renders at /videos/<slug> and links back to /videos, and /videos answered 404.
   Un-reserving costs nothing, because resolveDeskHead() returns null for a slug
   that is neither a CMS category nor a registry desk, which still 404s. */
const RESERVED_SLUGS = new Set([
  "about", "contact", "privacy", "terms", "advertise", "search",
  "saved", "admin", "contributor", "login", "register", "category",
  "author", "tag", "api", "write-for-us", "editors-picks", "refer-earn",
  "cookies", "editorial-policy", "corrections-policy", "editorial-standards",
  "corrections", "rss", "location", "archive", "ownership",
  "careers", "newsletters", "newsletter", "help", "sitemap", "accessibility",
  "dmca", "topics", "latest", "forgot-password", "reset-password",
  "verify-email", "not-found",
]);

type PageProps = { params: Promise<{ category: string }> };

/** Every CMS category plus every registered desk, so the registry's virtual
    desks are prerendered rather than served on demand on first hit. */
export async function generateStaticParams() {
  let cmsSlugs: string[] = [];
  try {
    cmsSlugs = await fetchAllCategorySlugs();
  } catch {
    cmsSlugs = [];
  }
  const slugs = Array.from(new Set([...cmsSlugs, ...DESK_SLUGS]));
  return slugs.filter((s) => s && !RESERVED_SLUGS.has(s)).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (RESERVED_SLUGS.has(category)) return {};

  let head: DeskHead | null = null;
  try {
    head = await resolveDeskHead(category);
  } catch {
    head = null;
  }
  if (!head) return { title: "Page Not Found", robots: { index: false } };

  const canonicalUrl = absoluteUrl(`/${category}`);
  const description =
    head.description || `Latest ${head.name} news, analysis and updates from Tradingle.`;
  const title = `${head.name} News | Tradingle`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      /* Safe for registry-only desks too: /{slug}/rss.xml resolves through the
         same DeskHead, so the advertised feed always exists. */
      types: { "application/rss+xml": absoluteUrl(`/${category}/rss.xml`) },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Tradingle",
      locale: "en_IN",
      images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: `${head.name} News` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@tradingle",
      title,
      description,
      images: [absoluteUrl("/og-image.png")],
    },
  };
}

export default async function DeskPage({ params }: PageProps) {
  const { category } = await params;
  if (RESERVED_SLUGS.has(category)) notFound();

  let head: DeskHead | null = null;
  try {
    head = await resolveDeskHead(category);
  } catch {
    /* Upstream is unreachable rather than empty. A registered desk has an
       identity of its own, so serve its front instead of a 500. */
    const desk = getDesk(category);
    head = desk
      ? { slug: category, name: desk.label, description: desk.blurb, isCategory: false, desk }
      : null;
  }

  if (head) {
    let stories: StoryCardData[] = [];
    let nextCursor: string | null = null;
    try {
      const feed = await fetchDeskFeed(head, { limit: 25 });
      stories = feed.items.map(summaryToStory);
      nextCursor = feed.nextCursor;
    } catch {
      stories = [];
    }

    const deskName = head.name;
    const [lead, ...rest] = stories;
    const index = rest.slice(0, 6);
    const cards = rest.slice(6, 12);
    const rows = rest.slice(12);
    const railStories = rest.slice(0, 6);
    /* The sibling strip is the desk's own group from the registry — the cheapest
       way to make a shallow tree navigable: from Commodities you can reach
       Markets, Banking and IPO without opening the menu. */
    const chips = deskSiblings(category, 6).map((d) => ({ href: `/${d.slug}`, label: d.label }));

    return (
      <main id="main-content" className="bg-[color:var(--canvas)]">
        <JsonLd
          data={buildCollectionPageJsonLd({
            name: `${deskName} News`,
            url: `/${category}`,
            description: head.description,
          })}
        />

        <FeedMasthead
          title={deskName}
          kicker={head.desk?.group}
          standfirst={head.description}
          crumbs={[{ href: "/", label: "Home" }]}
          chips={chips}
          chipsLabel={head.desk?.group ? `More in ${head.desk.group}` : undefined}
        />

        <FeedShell
          leaderboard="desk_leaderboard"
          rail={
            <FeedRail
              title={`More in ${deskName}`}
              stories={railStories}
              adSlots={["desk_rail_1", "desk_rail_2"]}
            />
          }
        >
          {stories.length === 0 ? (
            <FeedEmpty
              title={`The ${deskName} desk has no published stories right now.`}
              body="This section is live and fills as our reporters file. Meanwhile the front page carries everything published today."
            />
          ) : null}

          {lead ? <FeedLead story={lead} suppress={deskName} /> : null}

          {index.length > 0 ? (
            <section aria-label={`Also in ${deskName}`} className="mt-8">
              <SectionHead
                title={`Also in ${deskName}`}
                note={stories.length >= 25 ? "Updated continuously" : undefined}
              />
              <FeedIndexColumns stories={index} suppress={deskName} />
            </section>
          ) : null}

          {cards.length > 0 ? (
            <>
              <div className="mt-9 border-t border-t-[color:var(--rule)] pt-4">
                <AdSpace slotKey="desk_mid_leaderboard" height={90} label="Advertisement" />
              </div>
              <section aria-label={`Features in ${deskName}`} className="mt-8">
                <SectionHead title="Features & analysis" />
                <FeedCardGrid stories={cards} suppress={deskName} />
              </section>
            </>
          ) : null}

          {rows.length > 0 ? (
            <section aria-label={`All ${deskName} stories`} className="mt-10">
              <SectionHead title={`More ${deskName} coverage`} />
              <FeedRows stories={rows} suppress={deskName} adSlotPrefix="desk_infeed" />
            </section>
          ) : null}

          <LoadMoreButton deskSlug={category} deskName={deskName} initialCursor={nextCursor} />
        </FeedShell>
      </main>
    );
  }

  /* Not a category and not a desk. It may still be a legacy bare-slug article
     URL, so try that redirect before conceding a 404. */
  try {
    const article = await fetchArticle(category);
    if (article.categorySlug && article.slug) permanentRedirect(`/${article.categorySlug}/${article.slug}`);
    permanentRedirect(`/latest/${article.slug}`);
  } catch (e) {
    if (e instanceof NotFoundError) {
      /* Neither a section nor a published article. Return a real 404: a soft
         404 answering 200 with "no articles" gets indexed as a live page. */
      notFound();
    }
    throw e;
  }
}
