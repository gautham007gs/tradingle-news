import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { absoluteUrl } from "../../../lib/site";
import PageShell from "../../../components/pages/PageShell";
import NewsletterSignup from "../../../components/pages/NewsletterSignup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Newsletters",
  description:
    "Tradingle's email editions — the morning briefing, market close, technology, India politics and the weekend read. Free, and you can unsubscribe from any of them in one click.",
  alternates: { canonical: absoluteUrl("/newsletters") },
  openGraph: {
    title: "Newsletters | Tradingle",
    description: "Pick the editions you want. Free, unsubscribe in one click.",
    url: absoluteUrl("/newsletters"),
    type: "website",
    siteName: "Tradingle",
  },
};

type Edition = {
  name: string;
  cadence: string;
  arrives: string;
  blurb: string;
  reads: string;
  source: string;
  categorySlug?: string;
  desk?: { label: string; href: string };
};

const EDITIONS: Edition[] = [
  {
    name: "The Daily Briefing",
    cadence: "Every weekday",
    arrives: "7:00 IST",
    blurb:
      "The five stories setting the agenda, each in a paragraph, with the reporting behind them one click away. Written after the overnight news has settled so you start the day already caught up.",
    reads: "4 min read",
    source: "newsletters-page-daily",
  },
  {
    name: "Market Close",
    cadence: "Every trading day",
    arrives: "16:30 IST",
    blurb:
      "What moved and why — indices, the rupee, the day's biggest single-stock swings, and the one chart worth keeping. Written from the closing tape, not the morning outlook.",
    reads: "3 min read",
    source: "newsletters-page-markets",
    categorySlug: "markets",
    desk: { label: "Markets", href: "/markets" },
  },
  {
    name: "India Politics",
    cadence: "Tuesday & Friday",
    arrives: "18:00 IST",
    blurb:
      "Parliament, the states and the machinery of government, from correspondents who cover them full time. Fewer takes, more of what actually changed.",
    reads: "6 min read",
    source: "newsletters-page-politics",
    categorySlug: "politics",
    desk: { label: "Politics", href: "/politics" },
  },
  {
    name: "Tech & Startups",
    cadence: "Every Wednesday",
    arrives: "9:00 IST",
    blurb:
      "Funding rounds, product launches, platform policy and the research worth knowing about — with a note on which of the week's announcements will still matter in a year.",
    reads: "5 min read",
    source: "newsletters-page-tech",
    categorySlug: "technology",
    desk: { label: "Technology", href: "/technology" },
  },
  {
    name: "The Weekend Read",
    cadence: "Every Saturday",
    arrives: "8:00 IST",
    blurb:
      "One long piece of reporting or analysis, chosen by the editors, plus the week's best writing from elsewhere. Made for a slower read.",
    reads: "15 min read",
    source: "newsletters-page-weekend",
  },
  {
    name: "Breaking News Alerts",
    cadence: "As it happens",
    arrives: "Rare by design",
    blurb:
      "A short email only when a story genuinely cannot wait for the next edition. We send a handful a month, not a handful a day.",
    reads: "1 min read",
    source: "newsletters-page-breaking",
  },
];

export default function NewslettersPage() {
  return (
    <PageShell
      kicker="Email"
      title="Newsletters"
      standfirst="Six editions, each written by the desk that covers the subject. Pick the ones you want — every email carries a one-click unsubscribe, and we never pass your address to advertisers."
    >
      {/* ── Editions ───────────────────────────────────────────────────── */}
      <section aria-labelledby="nl-editions">
        <h2
          id="nl-editions"
          className="border-b-2 border-b-[color:var(--ink-900)] pb-2 text-[13px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]"
        >
          The editions
        </h2>

        <div className="mt-7 grid gap-x-8 gap-y-9 lg:grid-cols-2">
          {EDITIONS.map((ed, i) => (
            <article
              key={ed.name}
              className={`border-[color:var(--rule)] ${
                i % 2 === 1 ? "lg:border-l lg:pl-8" : ""
              } ${i > 1 ? "pt-9 border-t lg:border-t-0 lg:pt-0" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-[700] uppercase tracking-[0.14em] text-[color:var(--ink-600)]">
                <span className="text-[color:var(--ink-900)]">{ed.cadence}</span>
                <span aria-hidden className="h-3 w-px bg-[color:var(--rule-strong)]" />
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} aria-hidden />
                  {ed.arrives}
                </span>
                <span aria-hidden className="h-3 w-px bg-[color:var(--rule-strong)]" />
                <span>{ed.reads}</span>
              </div>

              <h3 className="mt-2.5 text-[21px] font-[700] leading-[1.15] tracking-[-0.018em] text-[color:var(--ink-900)] sm:text-[23px]">
                {ed.name}
              </h3>
              <p className="mt-2 max-w-[54ch] text-[14.5px] leading-[1.55] text-[color:var(--ink-700)]">
                {ed.blurb}
              </p>

              {ed.desk && (
                <p className="mt-2.5 text-[12.5px] text-[color:var(--ink-600)]">
                  From the{" "}
                  <Link
                    href={ed.desk.href}
                    className="font-[600] text-[color:var(--ink-800)] underline decoration-[color:var(--rule-strong)] underline-offset-4 transition-colors hover:text-[color:var(--ink-900)] hover:decoration-[color:var(--ink-900)]"
                  >
                    {ed.desk.label}
                  </Link>{" "}
                  desk
                </p>
              )}

              <div className="mt-4">
                <NewsletterSignup source={ed.source} categorySlug={ed.categorySlug} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── What to expect ─────────────────────────────────────────────── */}
      <section aria-labelledby="nl-terms" className="mt-12 border-t border-t-[color:var(--rule)] pt-9 lg:mt-16">
        <h2
          id="nl-terms"
          className="text-[13px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]"
        >
          What to expect
        </h2>
        <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              h: "No sharing",
              p: "Your address is used to send the editions you asked for. We do not sell or rent it, and advertisers never receive it.",
            },
            {
              h: "One-click out",
              p: "Every email has an unsubscribe link that works immediately, per edition. No login and no confirmation loop.",
            },
            {
              h: "Clearly labelled ads",
              p: "Some editions carry a single sponsor message. It is marked as such and is written by the advertiser, not the newsroom.",
            },
            {
              h: "Plain-text friendly",
              p: "Each edition renders as readable plain text for screen readers and mail clients with images off.",
            },
          ].map((item, i) => (
            <div
              key={item.h}
              className={`border-[color:var(--rule)] ${i % 2 === 1 ? "sm:border-l sm:pl-8" : ""} ${
                i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-8"
              }`}
            >
              <h3 className="text-[14px] font-[700] leading-[1.25] text-[color:var(--ink-900)]">{item.h}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-[color:var(--ink-600)]">{item.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Manage ─────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="nl-manage"
        className="mt-10 flex flex-col gap-4 border border-[color:var(--rule)] bg-[color:var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
      >
        <div>
          <h2
            id="nl-manage"
            className="flex items-center gap-2 text-[15px] font-[700] leading-[1.2] text-[color:var(--ink-900)]"
          >
            <Mail size={15} aria-hidden />
            Already subscribed?
          </h2>
          <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-[1.5] text-[color:var(--ink-700)]">
            Change which editions you receive from your account, or unsubscribe from all of them without signing
            in.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          <Link
            href="/newsletter/unsubscribe"
            className="inline-flex h-10 items-center border border-[color:var(--ink-900)] px-4 text-[11.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ink-900)] transition-colors hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
          >
            Unsubscribe
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center border border-[color:var(--rule-strong)] px-4 text-[11.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ink-800)] transition-colors hover:border-[color:var(--ink-900)] hover:text-[color:var(--ink-900)]"
          >
            Contact us
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
