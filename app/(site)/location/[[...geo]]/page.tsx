import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl } from "../../../../lib/site";
import JsonLd from "../../../../components/JsonLd";
import { buildCollectionPageJsonLd } from "../../../../lib/seo";
import { fetchArticles } from "../../../../lib/api";
import { summaryToStory, formatArticleTime } from "../../../../lib/homepage";
import type { StoryCardData } from "../../../../lib/homepage";
import { MapPin } from "lucide-react";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = { params: Promise<{ geo?: string[] }> };

function storyHref(story: StoryCardData): string {
  if (story.categorySlug && story.slug) return `/${story.categorySlug}/${story.slug}`;
  return `/${story.slug}`;
}

const GEO_MAP: Record<string, { name: string; description: string }> = {
  "india": { name: "India", description: "Comprehensive news coverage across India — business, politics, technology, and local stories." },
  "india/karnataka": { name: "Karnataka", description: "Latest news from Karnataka — Bengaluru, Mysuru, Hubli, and beyond." },
  "india/karnataka/bengaluru": { name: "Bengaluru", description: "Bengaluru city news — tech startups, infrastructure, politics, and community stories." },
  "india/maharashtra": { name: "Maharashtra", description: "News from Maharashtra — Mumbai, Pune, Nashik, and the rest of the state." },
  "india/maharashtra/mumbai": { name: "Mumbai", description: "Mumbai city news — finance, Bollywood, infrastructure, and local events." },
  "india/delhi": { name: "Delhi / NCR", description: "Delhi and the National Capital Region — government, business, and city news." },
  "india/tamil-nadu": { name: "Tamil Nadu", description: "News from Tamil Nadu — Chennai, Coimbatore, and beyond." },
  "india/telangana": { name: "Telangana", description: "News from Telangana — Hyderabad and the state." },
  "us": { name: "United States", description: "U.S. news coverage — politics, economy, and major developments." },
  "uk": { name: "United Kingdom", description: "UK news — Westminster, business, and society." },
};

function geoKey(geo: string[] = []) { return geo.join("/"); }
function geoLabel(geo: string[] = []) {
  return GEO_MAP[geoKey(geo)]?.name || geo[geo.length - 1] || "Global";
}
function geoDescription(geo: string[] = []) {
  return GEO_MAP[geoKey(geo)]?.description || `Latest news and updates from ${geoLabel(geo)}.`;
}
function buildBreadcrumbs(geo: string[] = []) {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Locations", path: "/location" },
  ];
  geo.forEach((_, i) => {
    const path = `/location/${geo.slice(0, i + 1).join("/")}`;
    const name = GEO_MAP[geo.slice(0, i + 1).join("/")]?.name || geo[i];
    crumbs.push({ name, path });
  });
  return crumbs;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { geo = [] } = await params;
  const label = geoLabel(geo);
  const description = geoDescription(geo);
  const path = geo.length ? `/location/${geo.join("/")}` : "/location";
  return {
    title: `${label} News | Tradingle`,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: `${label} | Tradingle`,
      description,
      url: absoluteUrl(path),
      type: "website",
      siteName: "Tradingle",
      locale: "en_IN",
      images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: `${label} news` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@tradingle",
      title: `${label} News | Tradingle`,
      description,
      images: [absoluteUrl("/og-image.png")],
    },
  };
}

const LOCATION_HUBS = [
  { label: "India", path: "/location/india" },
  { label: "Karnataka", path: "/location/india/karnataka" },
  { label: "Bengaluru", path: "/location/india/karnataka/bengaluru" },
  { label: "Maharashtra", path: "/location/india/maharashtra" },
  { label: "Mumbai", path: "/location/india/maharashtra/mumbai" },
  { label: "Delhi NCR", path: "/location/india/delhi" },
  { label: "Tamil Nadu", path: "/location/india/tamil-nadu" },
  { label: "Telangana", path: "/location/india/telangana" },
  { label: "United States", path: "/location/us" },
  { label: "United Kingdom", path: "/location/uk" },
];

export default async function LocationPage({ params }: PageProps) {
  const { geo = [] } = await params;
  const label = geoLabel(geo);
  const description = geoDescription(geo);
  const canonicalPath = geo.length ? `/location/${geo.join("/")}` : "/location";
  const breadcrumbs = buildBreadcrumbs(geo);

  let stories: StoryCardData[] = [];
  if (geo.length > 0) {
    try {
      const locationTag = geo[geo.length - 1];
      const { items } = await fetchArticles({ tag: locationTag, limit: 16, offset: 0 });
      stories = items.map(summaryToStory);
    } catch {
      stories = [];
    }
  }

  // A location URL that isn't a known hub and has no articles is a genuine
  // miss — return a real 404 rather than a 200 "no articles" page (soft 404s
  // are indexed as live pages and violate the SEO contract).
  if (geo.length > 0 && !GEO_MAP[geoKey(geo)] && stories.length === 0) {
    notFound();
  }

  return (
    <main className="trd-container py-8">
      {/* Single @graph: CollectionPage + BreadcrumbList — no duplicate JSON-LD */}
      <JsonLd data={buildCollectionPageJsonLd({
        name: `${label} News`,
        url: canonicalPath,
        description,
        breadcrumbItems: breadcrumbs,
      })} />

      <header className="mb-8 border-b pb-6">
        <nav className="mb-3 text-sm text-muted-foreground flex flex-wrap items-center gap-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link href={crumb.path} className="hover:underline">{crumb.name}</Link>
              ) : <span>{crumb.name}</span>}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="p-2 bg-primary/10 rounded-lg text-primary"><MapPin size={22} /></span>
          <div>
            <h1 className="text-3xl font-bold">{label}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </header>

      {geo.length === 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Browse by Location</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {LOCATION_HUBS.map((hub) => (
              <Link
                key={hub.path}
                href={hub.path}
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                <MapPin size={14} className="text-primary flex-shrink-0" />
                {hub.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {stories.length > 0 ? (
        <section aria-label={`${label} articles`}>
          <h2 className="text-xl font-bold mb-4">Latest from {label}</h2>
          <div className="divide-y">
            {stories.map((story) => (
              <article key={story.slug} className="py-4">
                <Link href={storyHref(story)} className="group flex gap-4">
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.title}
                      width={160}
                      height={90}
                      className="h-24 w-40 flex-shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold group-hover:underline">{story.title}</h3>
                    {story.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{story.excerpt}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {story.author && <span>{story.author} · </span>}
                      <time>{formatArticleTime(story.publishedAt)}</time>
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : geo.length > 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No articles found for this location yet. Check back soon.
        </p>
      ) : null}
    </main>
  );
}
