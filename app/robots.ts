import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default: all crawlers ──────────────────────────────────────────────
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/contributor/",
          "/saved",
          "/api/",
          "/login",
          "/register",
        ],
      },

      // ── AI training bots: allow reading, block admin ───────────────────────
      // Allow AI search assistants (they index content, not just train)
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "Claude-SearchBot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },

      // ── Google: explicitly allow everything including AIO ──────────────────
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        // Issue #84: must also disallow CMS-internal paths — previously this
        // rule had no disallow at all, allowing Google-Extended to index
        // /admin/, /contributor/, and /api/ routes.
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "Googlebot-News",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },

      // ── Apple: allow for Apple News and Spotlight indexing ─────────────────
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },

      // ── Bingbot / Microsoft Copilot ────────────────────────────────────────
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin/", "/contributor/", "/api/"],
      },

      // ── Aggressive scrapers / bulk crawlers: block completely ──────────────
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "Amazonbot", disallow: "/" },
      { userAgent: "PetalBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
    ],
    sitemap: [
      absoluteUrl("/sitemap-index.xml"),
      absoluteUrl("/sitemap.xml"),
      absoluteUrl("/news-sitemap.xml"),
    ],
    host: absoluteUrl("/"),
  };
}
