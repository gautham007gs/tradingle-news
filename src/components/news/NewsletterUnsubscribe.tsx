"use client";

import { useCallback, useEffect, useState } from "react";

export default function NewsletterUnsubscribe({ token }: { token: string }) {
  const [status, setStatus] = useState<"busy" | "done" | "error">("busy");

  const run = useCallback(async () => {
    try {
      const res = await fetch(`/api/newsletters/unsubscribe.php?token=${encodeURIComponent(token)}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.ok) {
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    if (token) void run();
  }, [token, run]);

  if (status === "busy") {
    return <p className="text-muted-foreground">Unsubscribing…</p>;
  }

  if (status === "done") {
    return (
      <div>
        <p className="mb-4">
          You have been unsubscribed from the Tradingle newsletter. You can
          re-subscribe at any time.
        </p>
        <a href="/" className="text-primary underline">Return to homepage</a>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4">
        We could not process that unsubscribe link. It may have been used
        already, or it has expired.
      </p>
      <a href="/" className="text-primary underline">Return to homepage</a>
    </div>
  );
}
