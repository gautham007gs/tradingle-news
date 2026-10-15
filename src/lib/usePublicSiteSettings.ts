import { useEffect, useState } from "react";
import { hostingerApi } from "@/lib/hostingerApi";
import { CACHE_TTL, fetchWithClientCache, readStaleCache } from "@/lib/clientCache";

export type PublicSiteSettings = {
  show_read_time: boolean;
  show_view_count: boolean;
  homepage_seo_title: string;
  homepage_seo_description: string;
  footer_tagline: string;
  spotlight_label: string;
  spotlight_kicker: string;
  more_for_you_title: string;
  [key: string]: string | boolean;
};

const DEFAULTS: PublicSiteSettings = {
  show_read_time: true,
  show_view_count: true,
  homepage_seo_title: "Breaking News, Live Updates, India & World News",
  homepage_seo_description:
    "Tradingle delivers breaking news, live updates, in-depth analysis on India, world affairs, business, technology, sports, and entertainment.",
  footer_tagline:
    "Tradingle brings you breaking news, live updates, and in-depth analysis on politics, business, sports, entertainment, and more.",
  spotlight_label: "Spotlight",
  spotlight_kicker: "Analyses, Explainers, Exclusives",
  more_for_you_title: "More for You",
};

let rawCache: Record<string, string> | null = null;
let rawPromise: Promise<Record<string, string>> | null = null;
let cache: PublicSiteSettings | null = null;
let promise: Promise<PublicSiteSettings> | null = null;

/** Single shared fetch for site settings (avoids duplicate API calls on boot). */
export function fetchRawSiteSettings(): Promise<Record<string, string>> {
  if (rawCache) return Promise.resolve(rawCache);
  if (rawPromise) return rawPromise;

  rawPromise = hostingerApi
    .siteSettings()
    .then(({ settings }) => {
      rawCache = settings || {};
      cache = normalize(rawCache);
      /* writeCacheEntry removed — not available in this context */
      return rawCache;
    })
    .catch(() => {
      rawCache = {};
      cache = DEFAULTS;
      return rawCache;
    });

  return rawPromise;
}

function normalize(raw: Record<string, string>): PublicSiteSettings {
  return {
    ...DEFAULTS,
    ...raw,
    show_read_time: raw.show_read_time !== "0",
    show_view_count: raw.show_view_count !== "0",
    homepage_seo_title: raw.homepage_seo_title?.trim() || DEFAULTS.homepage_seo_title,
    homepage_seo_description: raw.homepage_seo_description?.trim() || DEFAULTS.homepage_seo_description,
    footer_tagline: raw.footer_tagline?.trim() || DEFAULTS.footer_tagline,
    spotlight_label: raw.spotlight_label?.trim() || DEFAULTS.spotlight_label,
    spotlight_kicker: raw.spotlight_kicker?.trim() || DEFAULTS.spotlight_kicker,
    more_for_you_title: raw.more_for_you_title?.trim() || DEFAULTS.more_for_you_title,
  };
}

async function fetchPublicSettings(): Promise<PublicSiteSettings> {
  if (cache) return cache;
  if (promise) return promise;
  promise = fetchRawSiteSettings().then(() => cache ?? DEFAULTS);
  return promise;
}

export function usePublicSiteSettings(): PublicSiteSettings {
  const [settings, setSettings] = useState<PublicSiteSettings>(() => {
    return readStaleCache<PublicSiteSettings>("site_settings") ?? DEFAULTS;
  });

  useEffect(() => {
    let active = true;
    fetchPublicSettings().then((loaded) => {
      if (active) setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

export function resetPublicSettingsCache(): void {
  rawCache = null;
  rawPromise = null;
  cache = null;
  promise = null;
}
