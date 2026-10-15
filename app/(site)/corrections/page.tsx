import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import JsonLd from "../../../components/JsonLd";
import { buildCollectionPageJsonLd } from "../../../lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Corrections & Clarifications | Tradingle",
  description:
    "A transparent log of factual corrections, clarifications, and updates issued by Tradingle's editorial team.",
  alternates: { canonical: absoluteUrl("/corrections") },
  openGraph: {
    title: "Corrections & Clarifications | Tradingle",
    description: "Tradingle's public record of editorial corrections and clarifications.",
    url: absoluteUrl("/corrections"),
    type: "website",
  },
};

const corrections = [
  {
    date: "June 25, 2026",
    article: "Example: Article Title Here",
    articleSlug: null,
    type: "Factual Correction",
    original: "This section will be populated as corrections are issued.",
    corrected: "Corrections are logged here within 24 hours of discovery.",
    note: "",
  },
];

export default function CorrectionsPage() {
  return (
    <main className="trd-container py-10 max-w-3xl mx-auto">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "Corrections & Clarifications",
          url: "/corrections",
          description: "A transparent log of factual corrections, clarifications, and updates issued by Tradingle's editorial team.",
          breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Corrections", path: "/corrections" },
          ],
        })}
      />

      <header className="mb-10 border-b pb-6">
        <nav className="mb-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1" aria-hidden>/</span>
          <span>Corrections</span>
        </nav>
        <h1 className="text-4xl font-bold">Corrections & Clarifications</h1>
        <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
          Tradingle is committed to accuracy and transparency. When we make errors,
          we correct them promptly and log every change here.
        </p>
      </header>

      <section className="mb-8 p-5 bg-muted rounded-lg text-sm leading-relaxed">
        <p className="font-semibold mb-1">Our Corrections Policy</p>
        <p className="text-muted-foreground">
          Minor typographical fixes are corrected silently. Factual errors are noted at the top
          of the affected article and logged here with the date of correction and a description of
          what changed. We never delete published articles that contain errors — we correct and
          annotate them in place, preserving the historical record.
        </p>
        <p className="mt-2 text-muted-foreground">
          To report an error, email{" "}
          <a href="mailto:corrections@tradingle.com" className="text-primary hover:underline">
            corrections@tradingle.com
          </a>{" "}
          or use our{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact form
          </Link>
          .
        </p>
      </section>

      <div className="space-y-6">
        {corrections.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No corrections have been issued yet.
          </p>
        ) : (
          corrections.map((c, i) => (
            <article
              key={i}
              className="border rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-wider bg-destructive/10 text-destructive px-2 py-0.5 rounded mb-2">
                    {c.type}
                  </span>
                  <h2 className="font-semibold text-base">
                    {c.articleSlug ? (
                      <Link href={`/${c.articleSlug}`} className="text-primary hover:underline">
                        {c.article}
                      </Link>
                    ) : (
                      c.article
                    )}
                  </h2>
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">{c.date}</time>
              </div>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-destructive/5 rounded border-l-2 border-destructive">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Original (incorrect):</p>
                  <p className="text-muted-foreground">{c.original}</p>
                </div>
                <div className="p-3 bg-green-500/5 rounded border-l-2 border-green-500">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Corrected:</p>
                  <p className="text-muted-foreground">{c.corrected}</p>
                </div>
                {c.note && (
                  <p className="text-xs text-muted-foreground italic">{c.note}</p>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <footer className="mt-14 pt-6 border-t text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <Link href="/editorial-standards" className="text-primary hover:underline">
            Editorial Standards
          </Link>
          <Link href="/about" className="text-primary hover:underline">About Tradingle</Link>
          <Link href="/contact" className="text-primary hover:underline">Contact</Link>
        </div>
      </footer>
    </main>
  );
}
