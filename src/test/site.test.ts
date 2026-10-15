import { describe, it, expect } from "vitest";
import {
  SITE_URL,
  absoluteUrl,
  absoluteAssetUrl,
  canonicalArticlePath,
  canonicalArticleUrl,
  articleUrl,
} from "../../lib/site";

/**
 * AUDIT issue #23 — meaningful coverage of the URL primitives that feed
 * canonical tags, sitemaps, JSON-LD and RSS. A regression here silently breaks
 * rule 3/4 (canonical URL shape, single trailing-slash policy) site-wide.
 */

describe("absoluteUrl", () => {
  it("prefixes the canonical site origin", () => {
    expect(absoluteUrl("/markets/rbi")).toBe(`${SITE_URL}/markets/rbi`);
  });

  it("normalizes a missing leading slash", () => {
    expect(absoluteUrl("markets/rbi")).toBe(`${SITE_URL}/markets/rbi`);
  });

  it("never emits a double slash after the origin", () => {
    expect(absoluteUrl("/latest/abc")).not.toContain("//latest");
  });

  it("does not duplicate a trailing slash on the origin", () => {
    expect(absoluteUrl("/")).toBe(`${SITE_URL.replace(/\/$/, "")}/`);
  });
});

describe("absoluteAssetUrl", () => {
  it("keeps absolute https URLs as-is", () => {
    expect(absoluteAssetUrl("https://img.example.com/a.jpg")).toBe("https://img.example.com/a.jpg");
  });

  it("upgrades protocol-relative URLs to https", () => {
    expect(absoluteAssetUrl("//img.example.com/a.jpg")).toBe("https://img.example.com/a.jpg");
  });

  it("resolves root-relative paths against the site origin", () => {
    expect(absoluteAssetUrl("/uploads/hero.webp")).toBe(`${SITE_URL}/uploads/hero.webp`);
  });

  it("adds a leading slash to relative paths", () => {
    expect(absoluteAssetUrl("uploads/hero.webp")).toBe(`${SITE_URL}/uploads/hero.webp`);
  });

  it("returns an empty string for null/empty input", () => {
    expect(absoluteAssetUrl(null)).toBe("");
    expect(absoluteAssetUrl(undefined)).toBe("");
    expect(absoluteAssetUrl("   ")).toBe("");
  });
});

describe("canonical article URLs", () => {
  it("builds the /category/slug shape with no trailing slash", () => {
    expect(canonicalArticlePath("fed-cuts-rates", "markets")).toBe("/markets/fed-cuts-rates");
  });

  it("lowercases and trims the category", () => {
    expect(canonicalArticlePath("abc", "  Markets  ")).toBe("/markets/abc");
  });

  it("falls back to /latest when the category is empty", () => {
    expect(canonicalArticlePath("abc", "")).toBe("/latest/abc");
    expect(canonicalArticlePath("abc", null)).toBe("/latest/abc");
  });

  it("produces an absolute canonical URL", () => {
    expect(canonicalArticleUrl("abc", "markets")).toBe(`${SITE_URL}/markets/abc`);
  });

  it("sitemap/JSON-LD canonical and articleUrl use consistent paths", () => {
    // articleUrl is the legacy /latest/<slug> shape; canonical path may differ.
    // Both must be absolute and share the same origin so feeds never diverge.
    expect(articleUrl("abc")).toMatch(new RegExp(`^${SITE_URL.replace(/[.\\/]/g, "\\$&")}/latest/abc$`));
    expect(canonicalArticleUrl("abc")).toMatch(new RegExp(`^${SITE_URL.replace(/[.\\/]/g, "\\$&")}/latest/abc$`));
  });
});
