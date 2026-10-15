import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSitemapArticles, SITEMAP_ARTICLES_PER_PAGE, NotFoundError } from "../../lib/api";

/**
 * AUDIT issue #23 — sitemap client pagination + mapping. The sitemap route
 * (app/sitemap-articles/[page]/route.ts) depends on this function returning
 * correctly mapped URLs; a mapping bug silently produces URLs that contradict
 * the canonical tags (AGENTS.md rule 7).
 */

const API_BASE = "https://tradingle.com/api";

function mockApi(payload: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSitemapArticles", () => {
  it("requests page 1 with the configured per_page and caches for revalidation", async () => {
    const fetchMock = mockApi({ total_pages: 2, data: [] });
    await fetchSitemapArticles(1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe(`${API_BASE}/sitemap/articles.php?page=1&per_page=${SITEMAP_ARTICLES_PER_PAGE}`);
    expect(init.next.revalidate).toBe(300);
    expect(init.next.tags).toContain("sitemap");
  });

  it("maps snake_case API rows to camelCase article records", async () => {
    mockApi({
      total_pages: 1,
      data: [
        {
          slug: "rbi-holds-rates",
          title: "RBI holds rates",
          category_slug: "markets",
          published_at: "2026-08-10 09:30:00",
          updated_at: "2026-08-10 10:00:00",
          featured_image: "https://img.example.com/h.webp",
          featured_image_alt: "RBI building",
          google_news_exclude: 1,
        },
      ],
    });

    const { articles, totalPages } = await fetchSitemapArticles(1);
    expect(totalPages).toBe(1);
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      slug: "rbi-holds-rates",
      categorySlug: "markets",
      publishedAt: "2026-08-10 09:30:00",
      updatedAt: "2026-08-10 10:00:00",
      featuredImage: "https://img.example.com/h.webp",
      featuredImageAlt: "RBI building",
      googleNewsExclude: true,
    });
  });

  it("falls back to /latest when category_slug is missing", async () => {
    mockApi({ total_pages: 1, data: [{ slug: "x", category_slug: "", google_news_exclude: false }] });
    const { articles } = await fetchSitemapArticles(1);
    expect(articles[0].categorySlug).toBe("latest");
  });

  it("coerces google_news_exclude from boolean or 0/1", async () => {
    mockApi({
      total_pages: 1,
      data: [
        { slug: "a", google_news_exclude: true },
        { slug: "b", google_news_exclude: 0 },
      ],
    });
    const { articles } = await fetchSitemapArticles(1);
    expect(articles[0].googleNewsExclude).toBe(true);
    expect(articles[1].googleNewsExclude).toBe(false);
  });

  it("throws NotFoundError on 404", async () => {
    mockApi({}, 404);
    await expect(fetchSitemapArticles(1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws a descriptive error on 5xx", async () => {
    mockApi({}, 500);
    await expect(fetchSitemapArticles(1)).rejects.toThrow(/API 500/);
  });
});
