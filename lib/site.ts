export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";

/**
 * Server-side fetch MUST use an absolute URL — Node fetch cannot resolve `/api/...`.
 * Client-side code should use `/api` (proxied by Next.js rewrites to the live PHP API).
 */
export function getServerApiBase(): string {
  const explicit =
    process.env.API_SERVER_BASE ||
    process.env.API_PROXY_TARGET;

  if (explicit?.startsWith("http")) {
    const base = explicit.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  return "https://tradingle.com/api";
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL.replace(/\/$/, "")}${normalized}`;
}

/**
 * Resolve any asset/image URL to an absolute https URL. The CMS stores images
 * either as absolute URLs (when UPLOAD_BASE_URL is absolute) or root-relative
 * paths (when it defaults to `/uploads`). JSON-LD, sitemaps, and RSS all need
 * absolute URLs — never raw relative paths.
 */
export function absoluteAssetUrl(url: string | null | undefined): string {
  const value = (url || "").trim();
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return absoluteUrl(value.startsWith("/") ? value : `/${value}`);
}

export function articleUrl(slug: string): string {
  return absoluteUrl(`/latest/${slug}`);
}

/** Build the one canonical public URL shape used by pages, feeds and sitemaps. */
export function canonicalArticlePath(slug: string, categorySlug?: string | null): string {
  const safeSlug = slug.trim();
  const safeCategory = (categorySlug || "").trim().toLowerCase() || "latest";
  return `/${safeCategory}/${safeSlug}`;
}

export function canonicalArticleUrl(slug: string, categorySlug?: string | null): string {
  return absoluteUrl(canonicalArticlePath(slug, categorySlug));
}
