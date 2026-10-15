import type { Metadata } from "next";
import { use } from "react";
import { absoluteUrl } from "../../../lib/site";
import NewsletterUnsubscribe from "../../../src/components/news/NewsletterUnsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe – Tradingle",
  alternates: { canonical: absoluteUrl("/newsletter/unsubscribe") },
  robots: { index: false },
};

export default function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? "";

  return (
    <main className="trd-container py-20 text-center">
      <h1 className="text-2xl font-bold mb-6">Unsubscribe from the newsletter</h1>
      {token ? (
        <NewsletterUnsubscribe token={token} />
      ) : (
        <p className="text-muted-foreground">
          Your unsubscribe link is missing. Use the link from the newsletter
          email itself, or contact us and we will remove you manually.
        </p>
      )}
    </main>
  );
}
