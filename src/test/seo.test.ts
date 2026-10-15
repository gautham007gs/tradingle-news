import { describe, it, expect } from "vitest";
import { buildArticleJsonLd, buildWebsiteJsonLd, buildCollectionPageJsonLd } from "../../lib/seo";
import { SITE_URL } from "../../lib/site";
import type { Article } from "../../lib/types";

/**
 * AUDIT issue #23 — structured-data regression tests. These pin the SEO
 * contract in AGENTS.md rule 8: canonical/og image agreement, ISO 8601 dates
 * with timezone offsets, Person author, NewsMediaOrganization publisher, and
 * BreadcrumbList on article pages.
 */

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    slug: "rbi-holds-rates",
    title: "RBI holds rates as inflation cools",
    excerpt: "The central bank left policy rates unchanged.",
    content: "<p>Full body.</p>",
    featuredImage: "/uploads/hero.webp",
    featuredImageAlt: "Reserve Bank of India building",
    featuredImageCaption: "",
    imageSource: "",
    categoryName: "Markets",
    categorySlug: "markets",
    author: { id: 1, name: "Priya Sharma", slug: "priya-sharma", bio: "Markets editor", avatar: "" },
    tags: [{ id: 1, name: "RBI", slug: "rbi" }],
    publishedAt: "2026-08-10T09:30:00+05:30",
    updatedAt: "2026-08-10T10:00:00+05:30",
    readingTimeMinutes: 4,
    views: 100,
    isLive: true,
    isSponsored: false,
    sponsorName: "",
    sponsorDisclosure: "",
    commentsEnabled: true,
    seoTitle: "RBI holds rates as inflation cools",
    seoDescription: "The central bank left policy rates unchanged amid cooling inflation.",
    seoOgImage: "",
    canonicalUrl: "",
    schemaType: "NewsArticle",
    robotsIndex: true,
    robotsFollow: true,
    correctionNote: "",
    priority: "normal",
    contentType: "breaking_news",
    googleNewsExclude: false,
    locationCountry: "India",
    locationState: "",
    locationCity: "",
    evergreenAuditDate: "",
    twitterCard: "summary_large_image",
    twitterCreator: "",
    ...overrides,
  };
}

describe("buildArticleJsonLd", () => {
  it("emits the generated canonical article URL by default", () => {
    const graph: any = buildArticleJsonLd(makeArticle());
    const articleNode = graph["@graph"][0];
    expect(articleNode.url).toBe(`${SITE_URL}/markets/rbi-holds-rates`);
  });

  it("ignores a canonical URL that points off-site (never leaks foreign authority)", () => {
    const graph: any = buildArticleJsonLd(makeArticle({ canonicalUrl: "https://evil.example/steal" }));
    const articleNode = graph["@graph"][0];
    expect(articleNode.url).toBe(`${SITE_URL}/markets/rbi-holds-rates`);
  });

  it("keeps an on-site canonical URL", () => {
    const onSite = `${SITE_URL}/markets/rbi-holds-rates`;
    const graph: any = buildArticleJsonLd(makeArticle({ canonicalUrl: onSite }));
    const articleNode = graph["@graph"][0];
    expect(articleNode.url).toBe(onSite);
  });

  it("references a NewsMediaOrganization publisher (full logo node on homepage)", () => {
    const graph: any = buildArticleJsonLd(makeArticle());
    const articleNode = graph["@graph"][0];
    expect(articleNode.publisher).toMatchObject({ "@type": "NewsMediaOrganization" });
    // The publisher node is referenced by @id; the full node (with logo) is
    // emitted once on the homepage via buildWebsiteJsonLd — see the next suite.
    const orgRef = graph["@graph"].find((n: any) => n["@type"] === "NewsMediaOrganization");
    expect(orgRef.url).toBe(`${SITE_URL}/`);
  });

  it("emits the author as a Person with a real bio URL", () => {
    const graph: any = buildArticleJsonLd(makeArticle());
    const articleNode = graph["@graph"][0];
    expect(articleNode.author).toMatchObject({ "@type": "Person" });
    expect(articleNode.author.url).toBe(`${SITE_URL}/author/priya-sharma`);
    expect(articleNode.author.worksFor["@id"]).toContain("#organization");
  });

  it("emits ISO 8601 datePublished/dateModified with timezone offsets", () => {
    const graph: any = buildArticleJsonLd(makeArticle());
    const articleNode = graph["@graph"][0];
    expect(articleNode.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
    expect(articleNode.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  });

  it("emits an absolute, same-source primary image (og/JSON-LD agreement)", () => {
    const graph: any = buildArticleJsonLd(makeArticle());
    const articleNode = graph["@graph"][0];
    const primaryImage = articleNode.image.find((i: any) => i["@id"]?.endsWith("#primaryimage"));
    expect(primaryImage).toBeDefined();
    expect(primaryImage.url).toBe(`${SITE_URL}/uploads/hero.webp`);
    expect(primaryImage.width).toBeGreaterThanOrEqual(1200);
  });

  it("maps opinion content type to OpinionNewsArticle", () => {
    const graph: any = buildArticleJsonLd(makeArticle({ contentType: "opinion_editorial", schemaType: "NewsArticle" }));
    expect(graph["@graph"][0]["@type"]).toBe("OpinionNewsArticle");
  });

  it("downgrades howto/review to Article (avoids invalid Rich Results)", () => {
    const howto = buildArticleJsonLd(makeArticle({ contentType: "howto_tutorial", schemaType: "NewsArticle" }));
    expect(howto["@graph"][0]["@type"]).toBe("Article");
    const review = buildArticleJsonLd(makeArticle({ contentType: "review", schemaType: "NewsArticle" }));
    expect(review["@graph"][0]["@type"]).toBe("Article");
  });

  it("truncates the headline to 110 chars", () => {
    const longTitle = "X".repeat(200);
    const graph: any = buildArticleJsonLd(makeArticle({ title: longTitle, seoTitle: longTitle }));
    expect(graph["@graph"][0].headline).toHaveLength(110);
  });

  it("emits a BreadcrumbList with the article as the last item", () => {
    const graph: any = buildArticleJsonLd(makeArticle());
    const crumbs = graph["@graph"].find((n: any) => n["@type"] === "BreadcrumbList");
    expect(crumbs).toBeDefined();
    const items = crumbs.itemListElement;
    expect(items).toHaveLength(3);
    expect(items[items.length - 1].item).toBe(`${SITE_URL}/markets/rbi-holds-rates`);
  });
});

describe("buildWebsiteJsonLd", () => {
  it("emits WebSite with SearchAction and a NewsMediaOrganization", () => {
    const graph: any = buildWebsiteJsonLd();
    const website = graph["@graph"].find((n: any) => n["@type"] === "WebSite");
    expect(website.potentialAction).toMatchObject({ "@type": "SearchAction" });
    const org = graph["@graph"].find((n: any) => n["@type"] === "NewsMediaOrganization");
    expect(org).toBeDefined();
    expect(org.name).toBe("Tradingle");
    expect(org.logo).toBeDefined();
    expect(org.logo.url).toBe(`${SITE_URL}/og-image.png`);
    expect(org.logo.width).toBeGreaterThanOrEqual(600);
  });
});

describe("buildCollectionPageJsonLd", () => {
  it("emits CollectionPage + breadcrumb for category pages", () => {
    const graph: any = buildCollectionPageJsonLd({
      name: "Markets",
      url: "/markets",
      breadcrumbItems: [{ name: "Home", path: "/" }, { name: "Markets", path: "/markets" }],
    });
    const page = graph["@graph"].find((n: any) => n["@type"] === "CollectionPage");
    expect(page.url).toBe(`${SITE_URL}/markets`);
    const crumbs = graph["@graph"].find((n: any) => n["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[0].position).toBe(1);
  });
});
