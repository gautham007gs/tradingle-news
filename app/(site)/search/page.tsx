import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl } from "../../../lib/site";
import { fetchArticles } from "../../../lib/api";
import { summaryToStory } from "../../../lib/homepage";
import SearchPageContent from "../../../components/search/SearchPageContent";

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q
    ? `Search results for "${q}" – Tradingle`
    : "Search – Tradingle";
  const description = q
    ? `Find Tradingle articles matching "${q}".`
    : "Search Tradingle for breaking news, analysis, and in-depth reports.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/search") },
    robots: { index: false, follow: true },
  };
}

async function SearchResults({ q, category }: { q: string; category: string }) {
  const hasSearched = Boolean(q || category);
  let initialResults = [];

  if (hasSearched) {
    try {
      const result = await fetchArticles({
        q: q || undefined,
        category: category || undefined,
        limit: 40,
      });
      initialResults = result.items.map(summaryToStory);
    } catch {
      initialResults = [];
    }
  }

  return (
    <SearchPageContent
      initialQuery={q}
      initialCategory={category}
      initialResults={initialResults}
      hasSearched={hasSearched}
    />
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", category = "" } = await searchParams;

  return (
    <Suspense
      fallback={
        <main className="trd-container py-8 max-w-5xl" id="main-content">
          <h1 className="text-2xl font-bold mb-6">Search Tradingle</h1>
          <p className="text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <SearchResults q={q} category={category} />
    </Suspense>
  );
}
