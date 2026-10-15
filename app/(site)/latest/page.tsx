import type { Metadata } from "next";
import Link from "next/link";
import { fetchArticles } from "../../../lib/api";
import { summaryToStory, type StoryCardData } from "../../../lib/homepage";
import { absoluteUrl } from "../../../lib/site";
import { buildCollectionPageJsonLd } from "../../../lib/seo";
import { deskGroupLinks, getDesk } from "../../../lib/desks";
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
   /latest — the chronological front

   The homepage is edited: slots, bands, a lead the desk chose. This page is
   not — it is simply everything published, newest first, which is what the
   three "See all" affordances on the homepage (Top Stories, Latest News, More
   From Tradingle) have always promised. Until now they pointed at a 404.

   It shares every primitive with the desk fronts (components/feed/FeedKit.tsx)
   and takes its rail from the desk registry rather than a hand-kept list, so a
   new desk appears here the moment it is registered.
   ────────────────────────────────────────────────────────────────────────── */

export const revalidate = 60;

/* The eight desks a reader is most likely to want from an undifferentiated
   chronological list. Kept to one line of chips on a phone. */
const SPINE = ["india", "world", "politics", "business", "markets", "technology", "sports", "opinion"];

const TITLE = "Latest News";
const DESCRIPTION =
  "Every story Tradingle has published, newest first — markets, business, India, world and technology in one chronological file.";

export const metadata: Metadata = {
  title: `${TITLE} | Tradingle`,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/latest"),
    types: { "application/rss+xml": absoluteUrl("/rss") },
  },
  openGraph: {
    title: `${TITLE} | Tradingle`,
    description: DESCRIPTION,
    url: absoluteUrl("/latest"),
    type: "website",
    siteName: "Tradingle",
    locale: "en_IN",
    images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@tradingle",
    title: `${TITLE} | Tradingle`,
    description: DESCRIPTION,
    images: [absoluteUrl("/og-image.png")],
  },
};

/* Browse-by-desk block for the rail. The registry's four groups, so this can
   never fall out of step with the navigation or the footer. */
function DeskIndex() {
  return (
    <nav aria-label="Browse desks">
      <SectionHead title="Browse desks" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {deskGroupLinks.map((group) => (
          <div key={group.title}>
            <span className="mb-2 block text-[10.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ink-500)]">
              {group.title}
            </span>
            <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] font-[600] leading-[1.35] text-[color:var(--ink-800)] underline-offset-2 hover:text-[color:var(--ink-900)] hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export default async function LatestPage() {
  let stories: StoryCardData[] = [];
  let nextCursor: string | null = null;
  try {
    const feed = await fetchArticles({ limit: 31 });
    stories = feed.items.map(summaryToStory);
    nextCursor = feed.nextCursor;
  } catch {
    /* Upstream down: the page still renders its masthead and desk index, which
       is more useful than a 500. */
    stories = [];
  }

  const [lead, ...rest] = stories;
  const index = rest.slice(0, 6);
  const cards = rest.slice(6, 12);
  const rows = rest.slice(12);

  const chips = SPINE.map(getDesk)
    .filter(Boolean)
    .map((d) => ({ href: `/${d!.slug}`, label: d!.label }));

  return (
    <main id="main-content" className="bg-[color:var(--canvas)]">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: TITLE,
          url: "/latest",
          description: DESCRIPTION,
        })}
      />

      <FeedMasthead
        title={TITLE}
        kicker="The wire"
        standfirst={DESCRIPTION}
        crumbs={[{ href: "/", label: "Home" }]}
        chips={chips}
        chipsLabel="Jump to a desk"
      />

      <FeedShell
        leaderboard="latest_leaderboard"
        rail={
          <FeedRail title="" stories={[]} adSlots={["latest_rail_1", "latest_rail_2"]}>
            <DeskIndex />
          </FeedRail>
        }
      >
        {stories.length === 0 ? (
          <FeedEmpty
            kicker="Nothing to show"
            title="No stories are available right now."
            body="This page lists everything as it is published. If it is empty, our feed is briefly unavailable — try again in a moment."
            ctaLabel="Back to the front page"
          />
        ) : null}

        {lead ? <FeedLead story={lead} /> : null}

        {index.length > 0 ? (
          <section aria-label="Next up" className="mt-8">
            <SectionHead title="Next up" note="Newest first" />
            <FeedIndexColumns stories={index} />
          </section>
        ) : null}

        {cards.length > 0 ? (
          <>
            <div className="mt-9 border-t border-t-[color:var(--rule)] pt-4">
              <AdSpace slotKey="latest_mid_leaderboard" height={90} label="Advertisement" />
            </div>
            <section aria-label="Across the desks" className="mt-8">
              <SectionHead title="Across the desks" />
              <FeedCardGrid stories={cards} />
            </section>
          </>
        ) : null}

        {rows.length > 0 ? (
          <section aria-label="Earlier stories" className="mt-10">
            <SectionHead title="Earlier" />
            <FeedRows stories={rows} adSlotPrefix="latest_infeed" />
          </section>
        ) : null}

        <LoadMoreButton initialCursor={nextCursor} />
      </FeedShell>
    </main>
  );
}
