import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import { fetchTaxonomySlugs } from "../../../lib/api";
import PageShell from "../../../components/pages/PageShell";
import {
  companyLinks,
  deskGroups,
  footerLegalLinks,
  readerLinks,
} from "../../../src/lib/navConfig";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sitemap",
  description:
    "A readable index of Tradingle — every desk, reader tool, company page and policy, plus the topics and contributors we file against.",
  alternates: { canonical: absoluteUrl("/sitemap") },
  openGraph: {
    title: "Sitemap | Tradingle",
    description: "Every section, tool and policy page on Tradingle in one index.",
    url: absoluteUrl("/sitemap"),
    type: "website",
    siteName: "Tradingle",
  },
};

function titleise(slug: string) {
  return slug
    .split("-")
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}

const LINK =
  "block py-1 text-[13.5px] text-[color:var(--ink-700)] transition-colors hover:text-[color:var(--ink-900)] hover:underline hover:underline-offset-4";
const HEAD =
  "border-b-2 border-b-[color:var(--ink-900)] pb-2 text-[13px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]";

const ACCOUNT_LINKS = [
  { label: "Sign In", href: "/login" },
  { label: "Create Account", href: "/register" },
  { label: "Forgot Password", href: "/forgot-password" },
  { label: "Saved Articles", href: "/saved" },
  { label: "Refer & Earn", href: "/refer-earn" },
  { label: "Unsubscribe from Newsletters", href: "/newsletter/unsubscribe" },
];

const MACHINE_LINKS = [
  { label: "XML Sitemap Index", href: "/sitemap-index.xml" },
  { label: "News Sitemap", href: "/news-sitemap.xml" },
  { label: "Main RSS Feed", href: "/feed.xml" },
  { label: "RSS Directory", href: "/rss" },
  { label: "robots.txt", href: "/robots.txt" },
];

export default async function SitemapPage() {
  /* Taxonomy is supplementary: the static link sets below are the guaranteed
     content, so a fetch failure degrades to those rather than a 500. */
  let categories: string[] = [];
  let authors: string[] = [];
  let tags: string[] = [];
  try {
    const t = await fetchTaxonomySlugs();
    categories = t.categories;
    authors = t.authors;
    tags = t.tags;
  } catch {
    /* keep the empty defaults */
  }

  const sortedTags = [...tags].sort((a, b) => a.localeCompare(b)).slice(0, 240);
  const sortedAuthors = [...authors].sort((a, b) => a.localeCompare(b));

  return (
    <PageShell
      kicker="Index"
      title="Sitemap"
      standfirst="Every part of Tradingle in one readable list — desks, reader tools, company pages, policies and the machine-readable feeds."
    >
      {/* ── Sections ───────────────────────────────────────────────────── */}
      <section aria-labelledby="sm-sections">
        <h2 id="sm-sections" className={HEAD}>
          Sections
        </h2>
        <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {deskGroups.map((group, i) => (
            <div
              key={group.title}
              className={`border-[color:var(--rule)] ${i % 2 === 1 ? "sm:border-l sm:pl-8" : ""} ${
                i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-8"
              }`}
            >
              <h3 className="text-[14px] font-[700] leading-[1.2] text-[color:var(--ink-900)]">
                {group.title}
              </h3>
              <ul className="mt-2.5">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={LINK}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reader tools / Company / Account ───────────────────────────── */}
      <section aria-labelledby="sm-tools" className="mt-12 lg:mt-14">
        <h2 id="sm-tools" className={HEAD}>
          Tools, company &amp; account
        </h2>
        <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Reader tools", links: [...readerLinks, { label: "Home", href: "/" }] },
            { title: "Company", links: companyLinks },
            { title: "Your account", links: ACCOUNT_LINKS },
            { title: "Feeds & robots", links: MACHINE_LINKS },
          ].map((col, i) => (
            <div
              key={col.title}
              className={`border-[color:var(--rule)] ${i % 2 === 1 ? "sm:border-l sm:pl-8" : ""} ${
                i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-8"
              }`}
            >
              <h3 className="text-[14px] font-[700] leading-[1.2] text-[color:var(--ink-900)]">{col.title}</h3>
              <ul className="mt-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.href.startsWith("/sitemap-") ||
                    l.href.endsWith(".xml") ||
                    l.href === "/robots.txt" ? (
                      <a href={l.href} className={LINK}>
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className={LINK}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Policies ───────────────────────────────────────────────────── */}
      <section aria-labelledby="sm-policies" className="mt-12 lg:mt-14">
        <h2 id="sm-policies" className={HEAD}>
          Policies &amp; standards
        </h2>
        <ul className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {footerLegalLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={LINK}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Categories from the CMS ────────────────────────────────────── */}
      {categories.length > 0 && (
        <section aria-labelledby="sm-cats" className="mt-12 lg:mt-14">
          <h2 id="sm-cats" className={HEAD}>
            All categories
          </h2>
          <ul className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...categories].sort((a, b) => a.localeCompare(b)).map((c) => (
              <li key={c}>
                <Link href={`/${c}`} className={LINK}>
                  {titleise(c)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Contributors ───────────────────────────────────────────────── */}
      {sortedAuthors.length > 0 && (
        <section aria-labelledby="sm-authors" className="mt-12 lg:mt-14">
          <h2 id="sm-authors" className={HEAD}>
            Contributors
          </h2>
          <ul className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            {sortedAuthors.map((a) => (
              <li key={a}>
                <Link href={`/author/${a}`} className={LINK}>
                  {titleise(a)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Topics ─────────────────────────────────────────────────────── */}
      {sortedTags.length > 0 && (
        <section aria-labelledby="sm-tags" className="mt-12 lg:mt-14">
          <h2 id="sm-tags" className={HEAD}>
            Topics
          </h2>
          <p className="mt-2 text-[13px] text-[color:var(--ink-600)]">
            The most-used topics. The full alphabetical list lives on{" "}
            <Link
              href="/topics"
              className="font-[600] text-[color:var(--ink-800)] underline decoration-[color:var(--rule-strong)] underline-offset-4 transition-colors hover:text-[color:var(--ink-900)] hover:decoration-[color:var(--ink-900)]"
            >
              Topics A–Z
            </Link>
            .
          </p>
          <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            {sortedTags.map((t) => (
              <li key={t}>
                <Link href={`/tag/${t}`} className={LINK}>
                  {titleise(t)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
