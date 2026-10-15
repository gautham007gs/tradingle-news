"use client";

import { useEffect } from "react";

/**
 * Root error boundary (issue #25). Renders a recoverable error card for any
 * route below app/layout.tsx instead of a blank screen. Client-side only —
 * the boundary must be a "use client" component.
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#555", marginBottom: "1.5rem" }}>
          An unexpected error interrupted this page. You can try again — if the
          problem persists, it has been logged and reported.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#0052ff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.6rem 1.4rem",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
