// Server-only module.
import { getServerApiBase } from "./site";
import {
  footerColumns,
  footerLegalLinks,
  primaryNavSections,
  socialLinks,
} from "../src/lib/navConfig";

export type NavChild = { id: string; label: string; href: string };

export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** "link" = plain nav link, "section" = has dropdown/mega-menu children, "live" = live badge */
  type: "link" | "section" | "live";
  showInDesktopInline: boolean;
  children: NavChild[];
};

export type FooterColumn = {
  id: string;
  title: string;
  links: { id: string; label: string; href: string }[];
};

export type FooterLegalLink = { id: string; label: string; href: string };
export type SocialLink = { id: string; name: string; url: string };

export type NavigationData = {
  primaryNav: NavItem[];
  footerColumns: FooterColumn[];
  footerLegalLinks: FooterLegalLink[];
  socialLinks: SocialLink[];
};

/**
 * Reads nav data from the PHP backend (site_settings table), falling back to
 * static defaults if the request fails or nothing has been saved yet.
 *
 * Previously read from a local JSON file (data/navigation.json) that isn't
 * part of the deployed source and gets wiped on redeploy. Cached and tied to
 * the "navigation" tag so admin saves (which call revalidateTag("navigation"))
 * take effect immediately instead of waiting for the cache to expire.
 */
export async function readNavData(): Promise<NavigationData> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${getServerApiBase()}/navigation.php`, {
      headers: {
        Accept: "application/json",
        ...(process.env.API_SECRET_KEY ? { "X-API-Key": process.env.API_SECRET_KEY } : {}),
      },
      next: { revalidate: 300, tags: ["navigation"] },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return getDefaultNavData();
    const { data } = await res.json();
    return data ?? getDefaultNavData();
  } catch {
    return getDefaultNavData();
  }
}

/**
 * Static fallback IA. This is what renders whenever navigation.php has no
 * saved payload, so it has to be as correct as the CMS-driven version — an
 * earlier revision advertised /elections, /education, /middle-east,
 * /us-americas, /europe, /asia-pacific, /ai-ml, /cricket and /football, none
 * of which had a page, plus a "Live TV" entry pointing at the homepage.
 *
 * It is now DERIVED from src/lib/navConfig.ts (which is itself derived from the
 * desk registry in lib/desks.ts) rather than hand-copied. The two used to be
 * maintained in parallel with a "change both together" comment, which is
 * exactly the arrangement that let them drift.
 */
export function getDefaultNavData(): NavigationData {
  const id = (prefix: string, href: string, label: string) =>
    `${prefix}-${(href === "/" ? label : href)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

  return {
    primaryNav: primaryNavSections.map((section) => ({
      id: id("nav", section.href, section.label),
      label: section.label,
      href: section.href,
      type: section.children?.length ? "section" : "link",
      showInDesktopInline: true,
      children: (section.children ?? []).map((child) => ({
        id: id(`nav-${section.label.toLowerCase()}`, child.href, child.label),
        label: child.label,
        href: child.href,
      })),
    })),
    footerColumns: footerColumns.map((column, i) => ({
      id: column.id ?? `col-${i}`,
      title: column.title,
      links: column.links.map((link) => ({
        id: id(column.id ?? `col-${i}`, link.href, link.label),
        label: link.label,
        href: link.href,
      })),
    })),
    footerLegalLinks: footerLegalLinks.map((l) => ({
      id: id("legal", l.href, l.label),
      label: l.label,
      href: l.href,
    })),
    socialLinks: socialLinks.map((s) => ({
      id: s.name.toLowerCase(),
      name: s.name,
      url: s.url,
    })),
  };
}
