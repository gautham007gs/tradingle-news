import Link from "next/link";
import { Search } from "lucide-react";
import StoryTitle from "@/components/news/StoryTitle";
import { articlePath } from "../../lib/homepage";
import type { StoryCardData } from "../../lib/homepage";

const CATEGORY_OPTIONS = [
  { value: "", label: "All Sections" },
  { value: "india", label: "India" },
  { value: "world", label: "World" },
  { value: "business", label: "Business" },
  { value: "technology", label: "Technology" },
  { value: "sports", label: "Sports" },
  { value: "entertainment", label: "Entertainment" },
  { value: "science", label: "Science" },
  { value: "cities", label: "Cities" },
];

interface SearchPageContentProps {
  initialQuery: string;
  initialCategory: string;
  initialResults: StoryCardData[];
  hasSearched: boolean;
}

export default function SearchPageContent({
  initialQuery,
  initialCategory,
  initialResults,
  hasSearched,
}: SearchPageContentProps) {
  return (
    <main className="trd-container py-8 max-w-5xl" id="main-content">
      <h1 className="text-2xl font-bold mb-6">Search Tradingle</h1>

      <form
        action="/search"
        method="GET"
        className="flex flex-col sm:flex-row gap-3 mb-8"
        role="search"
        aria-label="Search articles"
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={initialQuery}
            placeholder="Search articles…"
            aria-label="Search query"
            autoComplete="off"
            className="w-full rounded border border-border bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          name="category"
          defaultValue={initialCategory}
          aria-label="Filter by category"
          className="rounded border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {hasSearched && (
        <p className="text-sm text-muted-foreground mb-6">
          {initialResults.length > 0 ? (
            <>
              <strong>{initialResults.length}</strong>{" "}
              {initialResults.length === 1 ? "result" : "results"} found
            </>
          ) : (
            "No articles found"
          )}
          {initialQuery && (
            <>
              {" "}for <strong>&ldquo;{initialQuery}&rdquo;</strong>
            </>
          )}
          {initialCategory && (
            <>
              {" "}in <strong>{initialCategory}</strong>
            </>
          )}
        </p>
      )}

      {initialResults.length > 0 && (
        <section aria-label="Search results">
          <div className="divide-y divide-border">
            {initialResults.map((story) => (
              <article key={story.slug || story.title} className="py-5 first:pt-0">
                <div className="flex gap-4">
                  {story.image && (
                    <Link
                      href={articlePath(story)}
                      className="flex-shrink-0"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <img
                        src={story.image}
                        alt=""
                        width={140}
                        height={84}
                        loading="lazy"
                        decoding="async"
                        className="h-[84px] w-[140px] object-cover rounded"
                      />
                    </Link>
                  )}
                  <div className="min-w-0">
                    {story.category && (
                      <span className="trd-category-tag">{story.category}</span>
                    )}
                    <Link href={articlePath(story)} className="headline-link block mt-1">
                      <StoryTitle
                        title={story.title}
                        as="h2"
                        className="text-base font-semibold leading-snug"
                      />
                    </Link>
                    {story.excerpt && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {story.excerpt}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {story.author && <span>{story.author} · </span>}
                      <time>{story.timestamp}</time>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {hasSearched && initialResults.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
          <p className="font-medium">No articles found.</p>
          <p className="mt-1 text-sm">
            Try different keywords or browse by{" "}
            <Link href="/india" className="text-primary underline">
              category
            </Link>
            .
          </p>
        </div>
      )}

      {!hasSearched && (
        <div className="py-16 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
          <p className="font-medium">Enter a keyword to search Tradingle.</p>
          <p className="mt-1 text-sm">
            You can also browse{" "}
            <Link href="/editors-picks" className="text-primary underline">
              Editor&apos;s Picks
            </Link>{" "}
            or the latest{" "}
            <Link href="/" className="text-primary underline">
              top stories
            </Link>
            .
          </p>
        </div>
      )}
    </main>
  );
}
