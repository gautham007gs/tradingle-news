import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../../lib/site";
import JsonLd from "../../../../components/JsonLd";
import { buildCollectionPageJsonLd } from "../../../../lib/seo";
import { CalendarDays } from "lucide-react";

export const revalidate = 600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ date?: string[] }> };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildDateLabel(segments: string[]) {
  if (segments.length === 0) return "Archive";
  if (segments.length === 1) return `${segments[0]}`;
  if (segments.length >= 2) {
    const month = parseInt(segments[1], 10);
    return `${MONTH_NAMES[month - 1] || segments[1]} ${segments[0]}`;
  }
  return "Archive";
}

function buildBreadcrumbs(segments: string[]) {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Archive", path: "/archive" },
  ];
  if (segments.length >= 1) {
    crumbs.push({ name: segments[0], path: `/archive/${segments[0]}` });
  }
  if (segments.length >= 2) {
    const month = parseInt(segments[1], 10);
    const monthName = MONTH_NAMES[month - 1] || segments[1];
    crumbs.push({ name: monthName, path: `/archive/${segments[0]}/${segments[1]}` });
  }
  return crumbs;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date = [] } = await params;
  const label = buildDateLabel(date);
  const canonicalPath = date.length ? `/archive/${date.join("/")}` : "/archive";

  return {
    title: `Archive: ${label} | Tradingle`,
    description: `Browse all Tradingle articles published in ${label}.`,
    alternates: { canonical: absoluteUrl(canonicalPath) },
    openGraph: {
      title: `Archive: ${label} | Tradingle`,
      description: `Browse all Tradingle articles published in ${label}.`,
      url: absoluteUrl(canonicalPath),
      type: "website",
      siteName: "Tradingle",
      locale: "en_IN",
      images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: "Tradingle article archive" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@tradingle",
      title: `Archive: ${label} | Tradingle`,
      description: `Browse all Tradingle articles published in ${label}.`,
      images: [absoluteUrl("/og-image.png")],
    },
    // Month pages are currently navigation placeholders rather than actual
    // article listings; keep them out of the index until they contain content.
    robots: { index: date.length < 2, follow: true },
  };
}

const RECENT_YEARS = [2026, 2025, 2024, 2023];

export default async function ArchivePage({ params }: PageProps) {
  const { date = [] } = await params;
  const label = buildDateLabel(date);
  const breadcrumbs = buildBreadcrumbs(date);
  const canonicalPath = date.length ? `/archive/${date.join("/")}` : "/archive";

  return (
    <main className="trd-container py-8 max-w-3xl mx-auto">
      <JsonLd data={buildCollectionPageJsonLd({
        name: `Archive: ${label}`,
        url: canonicalPath,
        description: `Browse all Tradingle articles published in ${label}.`,
        breadcrumbItems: breadcrumbs,
      })} />

      <header className="mb-8 border-b pb-6">
        <nav className="mb-3 text-sm text-muted-foreground flex flex-wrap items-center gap-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link href={crumb.path} className="hover:underline">{crumb.name}</Link>
              ) : (
                <span>{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="p-2 bg-primary/10 rounded-lg text-primary">
            <CalendarDays size={22} />
          </span>
          <h1 className="text-3xl font-bold">Archive: {label}</h1>
        </div>
      </header>

      {date.length === 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Browse by Year</h2>
          <div className="flex flex-wrap gap-3">
            {RECENT_YEARS.map((y) => (
              <Link
                key={y}
                href={`/archive/${y}`}
                className="px-5 py-2 border rounded-lg hover:bg-muted transition-colors font-semibold"
              >
                {y}
              </Link>
            ))}
          </div>
        </section>
      )}

      {date.length === 1 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Browse {date[0]} by Month</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {MONTH_NAMES.map((name, i) => {
              const m = String(i + 1).padStart(2, "0");
              return (
                <Link
                  key={m}
                  href={`/archive/${date[0]}/${m}`}
                  className="px-4 py-3 border rounded-lg hover:bg-muted transition-colors text-sm font-medium text-center"
                >
                  {name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {date.length >= 2 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Archive browsing by month is coming soon. In the meantime, use search to find articles
            from {buildDateLabel(date)}.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Search Articles
          </Link>
        </div>
      )}
    </main>
  );
}
