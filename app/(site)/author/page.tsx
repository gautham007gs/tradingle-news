import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, getServerApiBase } from "../../../lib/site";
import { buildCollectionPageJsonLd } from "../../../lib/seo";
import JsonLd from "../../../components/JsonLd";
import AdSpace from "@/components/news/AdSpace";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Authors & Journalists | Tradingle",
  description:
    "Meet the reporters, journalists, and analysts behind Tradingle's news coverage. Browse all contributors and their work.",
  alternates: { canonical: absoluteUrl("/author") },
  openGraph: {
    title: "Authors & Journalists | Tradingle",
    description:
      "Meet the reporters, journalists, and analysts behind Tradingle's news coverage.",
    url: absoluteUrl("/author"),
    type: "website",
    siteName: "Tradingle",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    site: "@tradingle",
    title: "Authors & Journalists | Tradingle",
    description:
      "Meet the reporters, journalists, and analysts behind Tradingle's news coverage.",
  },
};

interface ApiAuthor {
  slug: string;
  display_name: string;
  role_title?: string;
  avatar_url?: string;
  bio?: string;
  article_count?: number;
}

async function fetchAuthors(): Promise<ApiAuthor[]> {
  try {
    // Use the same server-side API base as the rest of lib/api.ts
    const base = getServerApiBase();
    const res = await fetch(`${base}/authors/list.php`, {
      next: { revalidate: 3600, tags: ["authors"] },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || json) as ApiAuthor[];
  } catch {
    return [];
  }
}

export default async function AuthorIndexPage() {
  const authors = await fetchAuthors();

  return (
    <main className="it-page-root">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "Authors & Journalists",
          url: "/author",
          description:
            "Meet the reporters, journalists, and analysts behind Tradingle's news coverage.",
          breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Authors", path: "/author" },
          ],
        })}
      />

      {/* Header */}
      <div className="it-header-band">
        <div className="trd-container">
          <nav aria-label="Breadcrumb" className="it-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Authors</span>
          </nav>
          <h1 className="it-header-title">AUTHORS</h1>
          <p className="it-header-sub">
            The journalists and analysts behind Tradingle&apos;s reporting
          </p>
        </div>
      </div>

      {/* Leaderboard ad */}
      <div className="trd-container">
        <div className="it-leaderboard">
          <AdSpace slotKey="author_index_leaderboard" height={90} label="Advertisement" />
        </div>
      </div>

      {/* Author grid */}
      <div className="trd-container py-8">
        {authors.length === 0 ? (
          <div className="tag-empty-state">
            <div className="tag-empty-icon" aria-hidden="true">✍️</div>
            <h2 className="tag-empty-title">Authors coming soon</h2>
            <p className="tag-empty-desc">Our contributor profiles will be listed here shortly.</p>
            <Link href="/" className="tag-empty-link">← Back to Home</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {authors.map((author) => (
              <Link
                key={author.slug}
                href={`/author/${author.slug}`}
                className="group flex flex-col items-center gap-3 rounded-lg border bg-card p-5 text-center hover:border-primary/40 hover:shadow-sm transition-all"
              >
                {author.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt={`${author.display_name} profile photo`}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/40 transition-all"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary"
                    aria-hidden="true"
                  >
                    {author.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                    {author.display_name}
                  </p>
                  {author.role_title && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {author.role_title}
                    </p>
                  )}
                  {typeof author.article_count === "number" && author.article_count > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {author.article_count}{" "}
                      {author.article_count === 1 ? "article" : "articles"}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
