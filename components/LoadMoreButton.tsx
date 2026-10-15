"use client";

import { useState, useTransition } from "react";
import type { StoryCardData } from "../lib/homepage";
import { FeedRows } from "./feed/FeedKit";

/* Appends further pages of any feed in place. The rows are rendered by the
   shared FeedRows primitive — the same component the server used for the first
   page — so an appended batch is indistinguishable from a server-rendered one
   and can never drift from it. The button disappears once the server stops
   issuing a cursor, which for an aggregated desk happens as soon as the
   exact-category tier is no longer carrying the page on its own. */

interface LoadMoreButtonProps {
  /** Desk or category slug; resolved server-side by /api/articles?desk=… */
  deskSlug?: string;
  /** Human-readable desk or page name, used to suppress a redundant kicker. */
  deskName?: string;
  /** Tag slug, for /tag/… archives. */
  tag?: string;
  /** Author slug, for author archives. */
  author?: string;
  /** Free-text query, for search results. */
  q?: string;
  initialCursor: string | null;
  /** Label on the button. Defaults to the generic "Load more stories". */
  label?: string;
}

export default function LoadMoreButton({
  deskSlug,
  deskName = "",
  tag,
  author,
  q,
  initialCursor,
  label = "Load more stories",
}: LoadMoreButtonProps) {
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState(false);

  if (!cursor && !stories.length) return null;

  const loadMore = () => {
    if (!cursor) return;
    setLoadError(false);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ cursor, limit: "20" });
        if (deskSlug) params.set("desk", deskSlug);
        if (tag) params.set("tag", tag);
        if (author) params.set("author", author);
        if (q) params.set("q", q);
        const res = await fetch(`/api/articles?${params.toString()}`);
        if (!res.ok) {
          setLoadError(true);
          return;
        }
        const data = await res.json();
        setStories((prev) => [...prev, ...(data.items || [])]);
        setCursor(data.nextCursor ?? null);
      } catch {
        setLoadError(true);
      }
    });
  };

  return (
    <div>
      {stories.length > 0 ? <FeedRows stories={stories} suppress={deskName} /> : null}

      {loadError ? (
        <p
          role="alert"
          className="border-t border-t-[color:var(--rule)] pt-4 text-[13.5px] leading-[1.5] text-[color:var(--ink-700)]"
        >
          Couldn&apos;t load more stories.{" "}
          <button
            type="button"
            onClick={loadMore}
            className="font-[600] text-[color:var(--ink-900)] underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </p>
      ) : null}

      {cursor && !loadError ? (
        <div className="mt-7 flex justify-center border-t border-t-[color:var(--rule)] pt-7">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="border border-[color:var(--ink-900)] px-6 py-3 text-[11.5px] font-[700] uppercase tracking-[0.1em] text-[color:var(--ink-900)] transition-colors duration-150 hover:bg-[color:var(--ink-900)] hover:text-[color:var(--on-ink)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink-900)]"
          >
            {isPending ? "Loading…" : label}
          </button>
        </div>
      ) : null}
    </div>
  );
}
