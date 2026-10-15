import type { Metadata } from "next";
import {
  fetchArticles,
  fetchHomepage,
  fetchSiteSettings,
} from "../../lib/api";
import { deriveHomepageData, slotsToStories } from "../../lib/homepage";
import { absoluteUrl } from "../../lib/site";
import { buildWebsiteJsonLd } from "../../lib/seo";
import JsonLd from "../../components/JsonLd";
import HomePageContent from "../../components/home/HomePageContent";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await fetchSiteSettings();
    return {
      title: settings.homepage_seo_title,
      description: settings.homepage_seo_description,
      alternates: { canonical: absoluteUrl("/") },
      openGraph: {
        title: settings.homepage_seo_title,
        description: settings.homepage_seo_description,
        url: absoluteUrl("/"),
        type: "website",
        siteName: "Tradingle",
        locale: "en_IN",
        images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: settings.homepage_seo_title }],
      },
      twitter: {
        card: "summary_large_image",
        site: "@tradingle",
        title: settings.homepage_seo_title,
        description: settings.homepage_seo_description,
        images: [absoluteUrl("/og-image.png")],
      },
    };
  } catch {
    return {
      title: "Tradingle — Latest News & Analysis",
      description: "Breaking news and analysis from Tradingle.",
      alternates: { canonical: absoluteUrl("/") },
      openGraph: {
        title: "Tradingle — Latest News & Analysis",
        description: "Breaking news and analysis from Tradingle.",
        url: absoluteUrl("/"),
        type: "website",
        images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: "Tradingle news" }],
      },
      twitter: {
        card: "summary_large_image",
        site: "@tradingle",
        title: "Tradingle — Latest News & Analysis",
        description: "Breaking news and analysis from Tradingle.",
        images: [absoluteUrl("/og-image.png")],
      },
    };
  }
}

export default async function HomePage() {
  const [homepageSlots, latestResult, settings] = await Promise.all([
    fetchHomepage().catch(() => ({})),
    fetchArticles({ limit: 80 }).catch(() => ({ items: [], nextCursor: null })),
    fetchSiteSettings().catch(() => null),
  ]);

  const derived = deriveHomepageData(homepageSlots, latestResult.items);
  const slotStories = slotsToStories(homepageSlots);

  return (
    <>
      <JsonLd data={buildWebsiteJsonLd()} />
      <HomePageContent
        heroStories={derived.heroStories}
        railStories={derived.railStories}
        editorsPicks={derived.editorsPicks}
        sectionStories={derived.sectionStories}
        moreForYouStories={derived.moreForYouStories}
        slotStories={slotStories}
        spotlightLabel={settings?.spotlight_label || "Spotlight"}
        spotlightKicker={settings?.spotlight_kicker || "Featured"}
        moreForYouTitle={settings?.more_for_you_title || "More For You"}
      />
    </>
  );
}
