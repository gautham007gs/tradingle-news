import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import PageShell from "../../../components/pages/PageShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers to the questions readers ask most about Tradingle — accounts, newsletters, saved articles, reading on mobile, corrections, republishing, advertising and how to reach the newsroom.",
  alternates: { canonical: absoluteUrl("/help") },
  openGraph: {
    title: "Help & FAQ | Tradingle",
    description: "Accounts, newsletters, corrections, republishing and how to reach us.",
    url: absoluteUrl("/help"),
    type: "website",
    siteName: "Tradingle",
  },
};

type Faq = { q: string; a: string };
type Group = { id: string; title: string; blurb: string; faqs: Faq[] };

const GROUPS: Group[] = [
  {
    id: "reading",
    title: "Reading Tradingle",
    blurb: "Getting around the site and the reading experience itself.",
    faqs: [
      {
        q: "Do I need an account to read articles?",
        a: "No. Every article on Tradingle is free to read without an account and without a paywall. An account only adds reader tools — saving articles, newsletter preferences and a personalised location feed.",
      },
      {
        q: "How do I find coverage of one subject over time?",
        a: "Use a topic page rather than the search box. Topics A–Z lists every tag we file against, and each topic page carries the full archive for that subject in date order.",
      },
      {
        q: "Can I switch to a dark theme?",
        a: "Yes. The theme control sits in the masthead on desktop and at the bottom of the menu drawer on mobile. Your choice is remembered on that device, and the site also follows your operating system setting by default.",
      },
      {
        q: "Is there a mobile app?",
        a: "Not yet. The site is built to work as one on a phone — add it to your home screen from your browser's share menu and it opens full-screen with no address bar.",
      },
    ],
  },
  {
    id: "account",
    title: "Accounts & saved articles",
    blurb: "Signing in, saving stories, and deleting your data.",
    faqs: [
      {
        q: "How do I create an account?",
        a: "Register with an email address and password, or use Google sign-in. You will receive a verification email; until you confirm it, saved articles are held on your device only.",
      },
      {
        q: "I have forgotten my password.",
        a: "Use the password reset link on the sign-in screen. The reset email is valid for one hour. If it does not arrive, check your spam folder before requesting another — repeated requests invalidate earlier links.",
      },
      {
        q: "Where do my saved articles go?",
        a: "To your Saved Articles page. Saving is available from the article header and from any card in a list. There is no limit, and saved items stay until you remove them.",
      },
      {
        q: "How do I delete my account and data?",
        a: "Email privacy@tradingle.com from the address on the account. We delete the account and associated personal data within 30 days and confirm when it is done. Newsletter records are removed at the same time.",
      },
    ],
  },
  {
    id: "newsletters",
    title: "Newsletters",
    blurb: "Editions, delivery problems and unsubscribing.",
    faqs: [
      {
        q: "Which newsletters do you publish?",
        a: "Six: The Daily Briefing, Market Close, India Politics, Tech & Startups, The Weekend Read and Breaking News Alerts. Each one lists its cadence and send time on the Newsletters page.",
      },
      {
        q: "My newsletter is not arriving.",
        a: "Check your spam or promotions folder first, then add newsletters@tradingle.com to your contacts. Corporate mail filters are the most common cause; if the problem persists, write to us and we will check the delivery log for your address.",
      },
      {
        q: "How do I unsubscribe?",
        a: "Every email carries a one-click unsubscribe for that edition. To stop all of them without signing in, use the unsubscribe page directly.",
      },
    ],
  },
  {
    id: "editorial",
    title: "Editorial & corrections",
    blurb: "How we work, and what to do when we get something wrong.",
    faqs: [
      {
        q: "I have found a factual error.",
        a: "Tell us at corrections@tradingle.com with the article address and the specific error, plus a reference if you have one. The newsroom reviews requests within two business days and publishes a labelled correction where one is warranted.",
      },
      {
        q: "How do I send a news tip?",
        a: "Use the Contact page, or email tips@tradingle.com. Say at the outset whether you need to be off the record. Do not send material you are contractually barred from sharing before speaking to us.",
      },
      {
        q: "Do advertisers influence coverage?",
        a: "No. The newsroom is independent of the commercial side and no advertiser sees editorial content before publication. Sponsored material is labelled and is written by the advertiser. Our Editorial Policy and Ownership disclosure set this out in full.",
      },
      {
        q: "Do you use AI to write articles?",
        a: "Reporting and writing are done by named journalists. Where machine tools assist with transcription, translation or data processing, the work is checked by a person and the article says so.",
      },
    ],
  },
  {
    id: "reuse",
    title: "Republishing & advertising",
    blurb: "Using our work, and reaching our readers.",
    faqs: [
      {
        q: "Can I republish a Tradingle article?",
        a: "You may quote a short excerpt with attribution and a link. Republishing a full article or our photography needs written permission — email licensing@tradingle.com with the URLs and the intended use. Educational and non-commercial requests are usually granted free of charge.",
      },
      {
        q: "Someone has copied your article without permission.",
        a: "Send the offending address to dmca@tradingle.com, with a screenshot if you can. Our Copyright & DMCA page explains how notices are handled.",
      },
      {
        q: "How do I advertise on Tradingle?",
        a: "The Advertise page covers formats, placements and audience data, and carries the enquiry form that reaches the commercial team directly.",
      },
      {
        q: "Do you accept contributed articles?",
        a: "Yes, for Opinion and for some specialist desks. Read the Write For Us page for what we look for and what we will not run before pitching.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical & accessibility",
    blurb: "When something on the site is broken or unusable.",
    faqs: [
      {
        q: "A page will not load, or looks broken.",
        a: "Reload once, then try a private window to rule out an extension — ad blockers and script blockers are the usual cause of missing images or embeds. If it persists, email support@tradingle.com with the address, your browser and a screenshot.",
      },
      {
        q: "Is there an RSS feed?",
        a: "Yes. The main feed covers everything we publish, and every desk and topic page has its own feed. The RSS page lists them all.",
      },
      {
        q: "Something on the site is inaccessible to me.",
        a: "Please report it to accessibility@tradingle.com with the page, your assistive technology and browser. We acknowledge within two business days. Our Accessibility Statement records the standard we work to and the gaps we already know about.",
      },
    ],
  },
];

const SHORTCUTS = [
  { label: "Contact the newsroom", href: "/contact" },
  { label: "Report a correction", href: "/corrections" },
  { label: "Manage newsletters", href: "/newsletters" },
  { label: "Saved articles", href: "/saved" },
  { label: "Advertise with us", href: "/advertise" },
  { label: "Accessibility statement", href: "/accessibility" },
  { label: "Copyright & DMCA", href: "/dmca" },
  { label: "Topics A–Z", href: "/topics" },
];

export default function HelpPage() {
  return (
    <PageShell
      kicker="Support"
      title="Help & FAQ"
      standfirst="The questions readers ask most, answered plainly. If yours is not here, the newsroom and support desk both read their mail."
    >
      {/* ── Shortcuts ──────────────────────────────────────────────────── */}
      <nav aria-label="Common tasks" className="border-y border-y-[color:var(--rule)] py-4">
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block py-1 text-[13.5px] font-[600] text-[color:var(--ink-800)] transition-colors hover:text-[color:var(--ink-900)] hover:underline hover:underline-offset-4"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── On this page ───────────────────────────────────────────────── */}
      <nav aria-label="Sections on this page" className="mt-8 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="inline-flex h-8 items-center border border-[color:var(--rule-strong)] px-3 text-[11.5px] font-[700] uppercase tracking-[0.1em] text-[color:var(--ink-800)] transition-colors hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
          >
            {g.title}
          </a>
        ))}
      </nav>

      {/* ── FAQ groups ─────────────────────────────────────────────────── */}
      <div className="mt-10 space-y-11">
        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-[130px]">
            <h2
              id={`${g.id}-h`}
              className="border-b-2 border-b-[color:var(--ink-900)] pb-2 text-[13px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]"
            >
              {g.title}
            </h2>
            <p className="mt-2 text-[13px] text-[color:var(--ink-600)]">{g.blurb}</p>

            <dl className="mt-5 grid gap-x-8 gap-y-6 lg:grid-cols-2">
              {g.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="text-[15px] font-[700] leading-[1.3] tracking-[-0.01em] text-[color:var(--ink-900)]">
                    {f.q}
                  </dt>
                  <dd className="mt-1.5 max-w-[58ch] text-[14px] leading-[1.6] text-[color:var(--ink-700)]">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {/* ── Still stuck ────────────────────────────────────────────────── */}
      <section
        aria-labelledby="help-contact"
        className="mt-12 border border-[color:var(--rule)] bg-[color:var(--surface)] p-6 sm:p-7"
      >
        <h2 id="help-contact" className="text-[16px] font-[700] leading-[1.2] text-[color:var(--ink-900)]">
          Still stuck?
        </h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.55] text-[color:var(--ink-700)]">
          Write to <span className="font-[600] text-[color:var(--ink-900)]">support@tradingle.com</span> for
          accounts, delivery and technical problems, or use the contact form to reach a specific desk. Include the
          page address and what you were doing — it saves a round trip.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/contact"
            className="inline-flex h-10 items-center bg-[color:var(--ink-900)] px-4 text-[11.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--on-ink)] transition-opacity hover:opacity-85"
          >
            Contact us
          </Link>
          <Link
            href="/sitemap"
            className="inline-flex h-10 items-center border border-[color:var(--rule-strong)] px-4 text-[11.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ink-800)] transition-colors hover:border-[color:var(--ink-900)] hover:text-[color:var(--ink-900)]"
          >
            Browse the sitemap
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
