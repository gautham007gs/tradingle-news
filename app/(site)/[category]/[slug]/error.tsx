"use client";

import { useEffect } from "react";

/**
 * Article-level error boundary (issue #25). Keeps the reader on a styled,
 * recoverable error state for the most important page type on the site rather
 * than a white screen, and never renders 200-with-error-content.
 */
export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Article error boundary caught:", error);
  }, [error]);

  return (
    <main className="trd-container py-24 text-center">
      <h1 className="text-2xl font-bold mb-4">This story could not be displayed</h1>
      <p className="text-muted-foreground mb-6">
        Something interrupted loading this article. Try again, or head back to the
        homepage.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="text-primary underline"
        >
          Try again
        </button>
        <a href="/" className="text-primary underline">
          Homepage
        </a>
      </div>
    </main>
  );
}
