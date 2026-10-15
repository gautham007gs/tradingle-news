import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import { fetchTaxonomySlugs } from "../../../lib/api";
import PageShell from "../../../components/pages/PageShell";
import { deskGroups } from "../../../src/lib/navConfig";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Topics A–Z",
  description:
    "Every Tradingle desk and topic in one index — news, business, markets, technology, sport and opinion, plus an alphabetical list of tags.",
  alternates: { canonical: absoluteUrl("/topics") },
  openGraph: {
    title: "Topics A–Z | Tradingle",
    description: "Every Tradingle desk and topic in one index.",
    url: absoluteUrl("/topics"),
    type: "website",
    siteName: "Tradingle",
  },
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function titleise(slug: string) {
  return slug
    .split("-")
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}

export default async function TopicsPage() {
  /* Tags are supplementary — the desk index below is the guaranteed content,
     so a taxonomy fetch failure degrades to desks only rather than a 500. */
  let tags: string[] = [];
  try {
    tags = (await fetchTaxonomySlugs()).tags;
  } catch {
    tags = [];
  }

  const grouped = LETTERS.map((letter) => ({
    letter,
    items: tags
      .filter((t) => t.toUpperCase().startsWith(letter))
      .sort((a, b) => a.localeCompare(b)),
  })).filter((g) => g.items.length > 0);

  return (
    <PageShell
      kicker="Index"
      title="Topics A–Z"
      standfirst="Start with a desk for the day's report, or jump straight to a topic to follow one story over time."
    >
      {/* ── Desks ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="topics-desks">
        <h2
          id="topics-desks"
          className="border-b-2 border-b-[color:var(--ink-900)] pb-2 text-[13px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]"
        >
          Desks
        </h2>
        <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {deskGroups.map((group, i) => (
            <div
              key={group.title}
              className={`border-[color:var(--rule)] ${i % 2 === 1 ? "sm:border-l sm:pl-8" : ""} ${
                i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-8"
              }`}
            >
              <h3 className="text-[15px] font-[700] leading-[1.2] tracking-[-0.01em] text-[color:var(--ink-900)]">
                {group.title}
              </h3>
              <p className="mt-1 text-[12.5px] leading-[1.4] text-[color:var(--ink-600)]">{group.blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block py-0.5 text-[14px] font-[600] text-[color:var(--ink-800)] transition-colors hover:text-[color:var(--ink-900)] hover:underline hover:decoration-2 hover:underline-offset-4"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tags ───────────────────────────────────────────────────────── */}
      {grouped.length > 0 && (
        <section aria-labelledby="topics-tags" className="mt-12 lg:mt-16">
          <h2
            id="topics-tags"
            className="border-b-2 border-b-[color:var(--ink-900)] pb-2 text-[13px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]"
          >
            All topics
          </h2>

          <nav aria-label="Jump to letter" className="mt-4 flex flex-wrap gap-1.5">
            {grouped.map((g) => (
              <a
                key={g.letter}
                href={`#letter-${g.letter}`}
                className="inline-flex h-8 w-8 items-center justify-center border border-[color:var(--rule-strong)] text-[12px] font-[700] text-[color:var(--ink-800)] transition-colors hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)]"
              >
                {g.letter}
              </a>
            ))}
          </nav>

          <div className="mt-7 space-y-7">
            {grouped.map((g) => (
              <div key={g.letter} id={`letter-${g.letter}`} className="scroll-mt-[130px]">
                <p className="mb-2.5 border-b border-b-[color:var(--rule)] pb-1.5 text-[20px] font-[700] leading-none text-[color:var(--ink-900)]">
                  {g.letter}
                </p>
                <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                  {g.items.map((t) => (
                    <li key={t}>
                      <Link
                        href={`/tag/${t}`}
                        className="block py-1 text-[13.5px] text-[color:var(--ink-700)] transition-colors hover:text-[color:var(--ink-900)] hover:underline hover:underline-offset-4"
                      >
                        {titleise(t)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
