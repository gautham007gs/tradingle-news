import type { MetadataRoute } from "next";
import { fetchTaxonomySlugs } from "../lib/api";
import { absoluteUrl } from "../lib/site";
import { DESK_SLUGS } from "../lib/desks";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Issue #67: using new Date() makes every static page look "modified now" on
  // every sitemap regeneration. Google treats lastmod seriously for crawl-budget
  // allocation — a page that claims to change every minute wastes crawl budget.
  // Use stable dates that reflect when these pages were last meaningfully edited.
  // Dynamic pages (articles, categories, authors) get accurate lastmod from the DB.
  const staticPages: MetadataRoute.Sitemap = [
    // Homepage — treated as always fresh for the revalidation cycle
    { url: absoluteUrl("/"), lastModified: new Date(), changeFrequency: "hourly", priority: 1.0 },

    // Major editorial hubs — crawlers discover sections here
    { url: absoluteUrl("/editors-picks"), lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/topics"), lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/newsletters"), lastModified: new Date("2025-06-01"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/sitemap"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.4 },
    { url: absoluteUrl("/archive"), lastModified: new Date("2025-01-01"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/rss"), lastModified: new Date("2025-01-01"), changeFrequency: "monthly", priority: 0.4 },

    // About / institutional — change rarely, use a real stable date
    { url: absoluteUrl("/about"), lastModified: new Date("2025-06-01"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified: new Date("2025-06-01"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/careers"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/advertise"), lastModified: new Date("2025-06-01"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/write-for-us"), lastModified: new Date("2025-06-01"), changeFrequency: "monthly", priority: 0.4 },

    // Policy / trust pages — yearly review cycle
    { url: absoluteUrl("/editorial-policy"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/corrections-policy"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/editorial-standards"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/corrections"), lastModified: new Date("2025-01-01"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/ownership"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/cookies"), lastModified: new Date("2025-01-01"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/accessibility"), lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/dmca"), lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/help"), lastModified: new Date("2026-01-01"), changeFrequency: "monthly", priority: 0.4 },

    // Location hub — discoverable without API
    { url: absoluteUrl("/location"), lastModified: new Date("2025-01-01"), changeFrequency: "monthly", priority: 0.5 },
    // Issue #68: Only include location sub-pages that actually exist and serve content.
    // US/UK/India/* pages are only included if the route has been confirmed to return 200 + content.
    // Review and extend this list after verifying the pages don't return notFound().
    { url: absoluteUrl("/location/india"), lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/location/india/karnataka"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: absoluteUrl("/location/india/karnataka/bengaluru"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: absoluteUrl("/location/india/maharashtra"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: absoluteUrl("/location/india/maharashtra/mumbai"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: absoluteUrl("/location/india/delhi"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: absoluteUrl("/location/india/tamil-nadu"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: absoluteUrl("/location/india/telangana"), lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    // /location/us and /location/uk removed pending content verification (issue #68)

    // Archive year pages (link to month-level browsing)
    { url: absoluteUrl("/archive/2026"), lastModified: new Date(), changeFrequency: "daily", priority: 0.4 },
    { url: absoluteUrl("/archive/2025"), lastModified: new Date("2025-12-31"), changeFrequency: "weekly", priority: 0.4 },
    { url: absoluteUrl("/archive/2024"), lastModified: new Date("2024-12-31"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/archive/2023"), lastModified: new Date("2023-12-31"), changeFrequency: "monthly", priority: 0.3 },
  ];

  let categoryEntries: MetadataRoute.Sitemap = [];
  let authorEntries: MetadataRoute.Sitemap = [];
  let tagEntries: MetadataRoute.Sitemap = [];
  let cmsCategorySlugs: string[] = [];

  try {
    // Article URLs live in their own paginated segments (/sitemap-articles/N)
    // generated from every published article — see sitemap-index.xml.
    const { categories, authors, tags } = await fetchTaxonomySlugs();
    cmsCategorySlugs = categories;

    categoryEntries = categories.map((slug) => ({
      url: absoluteUrl(`/${slug}`),
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    }));

    authorEntries = authors.map((slug) => ({
      url: absoluteUrl(`/author/${slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    tagEntries = tags.map((slug) => ({
      url: absoluteUrl(`/tag/${slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    /* API unavailable at build/revalidate time — static pages still emitted */
  }

  /* Every registered desk is a real, indexable page whether or not the CMS has
     a category of that name — app/(site)/[category]/page.tsx serves all of
     them. Skip the ones already emitted above so no URL appears twice. */
  const cmsSet = new Set(cmsCategorySlugs);
  const deskEntries: MetadataRoute.Sitemap = DESK_SLUGS.filter((slug) => !cmsSet.has(slug)).map(
    (slug) => ({
      url: absoluteUrl(`/${slug}`),
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.65,
    }),
  );

  return [
    ...staticPages,
    ...categoryEntries,
    ...deskEntries,
    ...authorEntries,
    ...tagEntries,
  ];
}
