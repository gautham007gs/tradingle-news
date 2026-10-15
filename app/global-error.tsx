"use client";

import { useEffect } from "react";

/**
 * Global error boundary (issue #25). Next.js requires this file to render its
 * own <html>/<body> because the root layout is not re-rendered on a root error.
 * Inline styles only — the global stylesheet may not be available here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div role="alert" style={{ maxWidth: 480, textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            We hit an unexpected error
          </h1>
          <p style={{ color: "#555", marginBottom: "1.5rem" }}>
            This error occurred at the application root. Try again, or return to the
            homepage.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
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
            <a
              href="/"
              style={{
                color: "#0052ff",
                border: "1px solid #0052ff",
                borderRadius: 8,
                padding: "0.6rem 1.4rem",
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
