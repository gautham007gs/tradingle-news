import Link from "next/link";
import { articlePath } from "@/lib/articlePaths";
import { deskKicker } from "../../lib/desks";
import type { StoryCardData } from "../../lib/homepage";
import AdSpace from "@/components/news/AdSpace";

/* ─────────────────────────────────────────────────────────────────────────────
   FEED KIT — the shared vocabulary for every list page

   One monochrome type and rule system used by the desk fronts (/{desk}), the
   chronological front (/latest), topics (/tag/…), author archives, search and
   the date archive. These pages had drifted into four different looks — a
   coloured header band here, a card grid with chips there — which made the
   site read as several sites. Everything here is a server component: no state,
   no client bundle.

   Composition rules the kit encodes:
     · Hierarchy comes from size, weight and rules — never colour.
     · Art crops vary by role (3:2 lead, 16:9 cards, 4:3→16:9 row thumbs) so a
       page never looks like one repeating card.
     · A story's own section is not printed as a kicker when the page IS that
       section — see deskKicker in lib/desks.ts.
     · The rail is quiet: no panel, no box. The main column holds attention.
   ────────────────────────────────────────────────────────────────────────── */

const HOVER = "group-hover:underline underline-offset-2 decoration-[1px]";
const HEAD = "text-[color:var(--ink-900)]";

export function Kicker({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <span className="mb-1.5 block text-[10.5px] font-[700] uppercase leading-none tracking-[0.1em] text-[color:var(--ink-900)]">
      {children}
    </span>
  );
}

export function Meta({ story }: { story: StoryCardData }) {
  if (!story.timestamp && !story.author) return null;
  return (
    <span
      suppressHydrationWarning
      className="mt-2.5 block text-[12px] font-[500] leading-[1.4] tabular-nums text-[color:var(--ink-600)]"
    >
      {story.timestamp}
      {story.author ? <span className="text-[color:var(--ink-500)]"> · {story.author}</span> : null}
    </span>
  );
}

/* 2px ink rule over a 13px uppercase label — the newspaper column head, kept
   distinct from the hairlines that separate stories. */
export function SectionHead({
  title,
  note,
  href,
}: {
  title: string;
  note?: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4 border-t-2 border-[color:var(--ink-900)] pt-3">
      <h2 className={`text-[13px] font-[700] uppercase leading-none tracking-[0.1em] ${HEAD}`}>
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-[11.5px] font-[600] uppercase tracking-[0.06em] text-[color:var(--ink-600)] underline-offset-2 hover:text-[color:var(--ink-900)] hover:underline"
        >
          See all
        </Link>
      ) : note ? (
        <span className="shrink-0 text-[11.5px] font-[500] tabular-nums text-[color:var(--ink-500)]">
          {note}
        </span>
      ) : null}
    </div>
  );
}

/* Art beside the headline rather than above it, so the top of a list page is
   never mistaken for one of the 16:9 cards further down. */
export function FeedLead({ story, suppress = "" }: { story: StoryCardData; suppress?: string }) {
  const href = articlePath(story);
  return (
    <article className="group border-b border-b-[color:var(--rule-strong)] pb-7">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-7">
        <div className="min-w-0">
          <Kicker>{deskKicker(story.category, suppress)}</Kicker>
          <h2 className="text-[24px] font-[600] leading-[1.17] tracking-[-0.018em] text-[color:var(--ink-900)] sm:text-[28px] lg:text-[31px]">
            <Link href={href} className={HOVER}>
              {story.title}
            </Link>
          </h2>
          {story.excerpt ? (
            <p className="mt-2.5 line-clamp-3 text-[15px] leading-[1.55] text-[color:var(--ink-700)] sm:text-[15.5px]">
              {story.excerpt}
            </p>
          ) : null}
          <Meta story={story} />
        </div>
        {story.image ? (
          <Link href={href} className="block md:order-last" aria-hidden tabIndex={-1}>
            <span className="relative block aspect-[3/2] overflow-hidden bg-[color:var(--ink-200)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.image}
                alt=""
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

/* Text-only headline index in two columns — the cheapest way to show depth
   without another row of pictures. */
export function FeedIndexColumns({
  stories,
  suppress = "",
}: {
  stories: StoryCardData[];
  suppress?: string;
}) {
  if (!stories.length) return null;
  return (
    <div className="grid sm:grid-cols-2 sm:gap-x-7">
      {stories.map((story, i) => (
        <article
          key={story.slug ?? `${story.title}-${i}`}
          className={`group border-t border-t-[color:var(--rule)] py-3.5 ${
            i % 2 === 1 ? "sm:border-l sm:border-l-[color:var(--rule)] sm:pl-7" : ""
          }`}
        >
          <Kicker>{deskKicker(story.category, suppress)}</Kicker>
          <h3 className="text-[15px] font-[600] leading-[1.34] tracking-[-0.008em] text-[color:var(--ink-900)] sm:text-[15.5px]">
            <Link href={articlePath(story)} className={HOVER}>
              {story.title}
            </Link>
          </h3>
          <Meta story={story} />
        </article>
      ))}
    </div>
  );
}

/* 16:9 cards. Three across on desktop, two on tablet, one on phone — a
   different rhythm from both the lead and the rows. */
export function FeedCardGrid({
  stories,
  suppress = "",
}: {
  stories: StoryCardData[];
  suppress?: string;
}) {
  if (!stories.length) return null;
  return (
    <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((story, i) => {
        const href = articlePath(story);
        return (
          <article key={story.slug ?? `${story.title}-${i}`} className="group min-w-0">
            {story.image ? (
              <Link href={href} className="mb-3.5 block" aria-hidden tabIndex={-1}>
                <span className="relative block aspect-[16/9] overflow-hidden bg-[color:var(--ink-200)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </span>
              </Link>
            ) : null}
            <Kicker>{deskKicker(story.category, suppress)}</Kicker>
            <h3 className="text-[16px] font-[600] leading-[1.3] tracking-[-0.01em] text-[color:var(--ink-900)]">
              <Link href={href} className={HOVER}>
                {story.title}
              </Link>
            </h3>
            {story.excerpt ? (
              <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-[1.5] text-[color:var(--ink-600)]">
                {story.excerpt}
              </p>
            ) : null}
            <Meta story={story} />
          </article>
        );
      })}
    </div>
  );
}

/* The long tail. Thumbnail on the right so the headlines stay on one optical
   left edge all the way down the page, and the excerpt is dropped on phones
   where it would double every row's height. */
export function FeedRows({
  stories,
  suppress = "",
  adSlotPrefix = null,
  adEvery = 6,
}: {
  stories: StoryCardData[];
  suppress?: string;
  adSlotPrefix?: string | null;
  adEvery?: number;
}) {
  if (!stories.length) return null;
  return (
    <div>
      {stories.map((story, i) => {
        const href = articlePath(story);
        const showAd = adSlotPrefix && i > 0 && i % adEvery === 0;
        return (
          <div key={story.slug ?? `${story.title}-${i}`}>
            {showAd ? (
              <div className="border-t border-t-[color:var(--rule)] py-4">
                <AdSpace slotKey={`${adSlotPrefix}_${i}`} height={90} label="Advertisement" />
              </div>
            ) : null}
            <article
              className={`group grid items-start gap-4 border-t border-t-[color:var(--rule)] py-5 sm:gap-6 ${
                story.image
                  ? "grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[minmax(0,1fr)_176px]"
                  : "grid-cols-1"
              }`}
            >
              <div className="min-w-0">
                <Kicker>{deskKicker(story.category, suppress)}</Kicker>
                <h3 className="text-[16px] font-[600] leading-[1.32] tracking-[-0.01em] text-[color:var(--ink-900)] sm:text-[17px]">
                  <Link href={href} className={HOVER}>
                    {story.title}
                  </Link>
                </h3>
                {story.excerpt ? (
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-[1.5] text-[color:var(--ink-600)] max-sm:hidden">
                    {story.excerpt}
                  </p>
                ) : null}
                <Meta story={story} />
              </div>
              {story.image ? (
                <Link href={href} className="block" aria-hidden tabIndex={-1}>
                  <span className="relative block aspect-[4/3] overflow-hidden bg-[color:var(--ink-200)] sm:aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={story.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </span>
                </Link>
              ) : null}
            </article>
          </div>
        );
      })}
    </div>
  );
}

/* Deliberately quiet: no panel, no tinted box, no art. The rail carries a
   numbered index and the ad slots, and nothing that competes with the main
   column for the eye. */
export function FeedRail({
  title,
  stories,
  adSlots = [],
  children,
}: {
  title: string;
  stories: StoryCardData[];
  adSlots?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="lg:sticky lg:top-[calc(var(--nav-height)+20px)]">
      {adSlots[0] ? (
        <div className="mb-8">
          <AdSpace slotKey={adSlots[0]} height={250} label="Advertisement" />
        </div>
      ) : null}
      {children}
      {stories.length ? (
        <section className={children ? "mt-8" : ""}>
          <SectionHead title={title} />
          <ol className="mt-1">
            {stories.map((story, i) => (
              <li
                key={story.slug ?? `${story.title}-${i}`}
                className="group grid grid-cols-[26px_minmax(0,1fr)] gap-3 border-t border-t-[color:var(--rule)] py-3.5 first:border-t-0 first:pt-0"
              >
                <span className="mt-[1px] text-[18px] font-[600] leading-none tabular-nums text-[color:var(--ink-400)]">
                  {i + 1}
                </span>
                <h3 className="text-[14.5px] font-[600] leading-[1.34] tracking-[-0.006em] text-[color:var(--ink-900)]">
                  <Link href={articlePath(story)} className={HOVER}>
                    {story.title}
                  </Link>
                </h3>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {adSlots[1] ? (
        <div className="mt-8">
          <AdSpace slotKey={adSlots[1]} height={250} label="Advertisement" />
        </div>
      ) : null}
    </div>
  );
}

export type Crumb = { href: string; label: string };
export type Chip = { href: string; label: string };

/* One masthead for every list page: breadcrumb, small group kicker, the H1 and
   an optional standfirst, then an optional strip of related destinations. The
   surface tint plus one hairline is the only chrome — no coloured band. */
export function FeedMasthead({
  title,
  kicker,
  standfirst,
  crumbs = [],
  chips = [],
  chipsLabel,
  meta,
}: {
  title: string;
  kicker?: string;
  standfirst?: string;
  crumbs?: Crumb[];
  chips?: Chip[];
  chipsLabel?: string;
  meta?: React.ReactNode;
}) {
  return (
    <header className="border-b border-b-[color:var(--rule)] bg-[color:var(--surface)]">
      <div className="trd-container py-6 sm:py-8 lg:py-10">
        {crumbs.length ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-[500] uppercase tracking-[0.08em] text-[color:var(--ink-500)]">
              {crumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  <Link href={crumb.href} className="hover:text-[color:var(--ink-900)] hover:underline">
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {kicker ? (
          <span className="mb-2.5 block border-l-2 border-l-[color:var(--ink-900)] pl-2.5 text-[11px] font-[700] uppercase leading-none tracking-[0.16em] text-[color:var(--ink-700)]">
            {kicker}
          </span>
        ) : null}
        <h1 className="text-[30px] font-[700] leading-[1.05] tracking-[-0.022em] text-[color:var(--ink-900)] sm:text-[38px] lg:text-[44px]">
          {title}
        </h1>
        {standfirst ? (
          <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.55] text-[color:var(--ink-700)] sm:text-[16.5px]">
            {standfirst}
          </p>
        ) : null}
        {meta}
        {chips.length ? (
          <div className="mt-6 border-t border-t-[color:var(--rule)] pt-4">
            {chipsLabel ? (
              <span className="mb-2.5 block text-[10.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ink-500)]">
                {chipsLabel}
              </span>
            ) : null}
            <ul className="flex flex-wrap gap-x-2 gap-y-2">
              {chips.map((chip) => (
                <li key={chip.href}>
                  <Link
                    href={chip.href}
                    className="inline-block border border-[color:var(--rule-strong)] px-2.5 py-[5px] text-[12px] font-[600] leading-none tracking-[0.01em] text-[color:var(--ink-800)] transition-colors hover:border-[color:var(--ink-900)] hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
                  >
                    {chip.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* An honest empty state. Padding a thin page with unrelated stories is how a
   reader loses trust in every other page, so we say so and offer a way out. */
export function FeedEmpty({
  kicker = "Nothing filed yet",
  title,
  body,
  ctaHref = "/",
  ctaLabel = "Read the latest",
}: {
  kicker?: string;
  title: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="border-t-2 border-[color:var(--ink-900)] py-10 sm:py-14">
      <span className="mb-3 block text-[10.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ink-500)]">
        {kicker}
      </span>
      <h2 className="max-w-[46ch] text-[22px] font-[600] leading-[1.2] tracking-[-0.015em] text-[color:var(--ink-900)] sm:text-[26px]">
        {title}
      </h2>
      {body ? (
        <p className="mt-3 max-w-[58ch] text-[14.5px] leading-[1.55] text-[color:var(--ink-600)]">
          {body}
        </p>
      ) : null}
      <Link
        href={ctaHref}
        className="mt-6 inline-block border border-[color:var(--ink-900)] px-4 py-2 text-[12px] font-[700] uppercase tracking-[0.08em] text-[color:var(--ink-900)] transition-colors hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
      >
        {ctaLabel}
      </Link>
    </section>
  );
}

/* The two-column body shared by every list page. The rail is a real <aside>
   and is separated by a hairline rather than a filled panel; below lg it
   simply follows the main column. */
export function FeedShell({
  children,
  rail,
  leaderboard,
}: {
  children: React.ReactNode;
  rail?: React.ReactNode;
  leaderboard?: string;
}) {
  return (
    <>
      {leaderboard ? (
        <div className="trd-container pt-4 sm:pt-5">
          <AdSpace slotKey={leaderboard} height={90} label="Advertisement" />
        </div>
      ) : null}
      <div className="trd-container py-7 sm:py-9 lg:py-11">
        <div
          className={
            rail
              ? "grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-x-12"
              : ""
          }
        >
          <div className="min-w-0">{children}</div>
          {rail ? (
            <aside className="lg:border-l lg:border-l-[color:var(--rule)] lg:pl-8 xl:pl-10">
              {rail}
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
