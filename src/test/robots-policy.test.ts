import { describe, it, expect } from "vitest";
import robots from "../../app/robots";

/**
 * SEO rule 6: "AI bot policy is explicit, not accidental."
 *
 * This test pins the exact robots.txt policy served by the Next.js route
 * handler (app/robots.ts) — the single live source since the .htaccess proxy
 * change. If this test fails, the policy changed on purpose and the legacy
 * fallback api/robots.php must be updated to match (see AUDIT_REPORT H1/M3).
 */

const ALLOWED_AI = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"];
const BLOCKED_SCRAPERS = ["CCBot", "Bytespider", "Amazonbot", "PetalBot", "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot"];

describe("robots.txt policy", () => {
  const rawRules = robots().rules;
  const rules = Array.isArray(rawRules) ? rawRules : [rawRules];

  const userAgents = rules.flatMap((r) =>
    Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent ?? ""],
  );

  it("allows the approved AI search/assistant bots (not accidental)", () => {
    for (const agent of ALLOWED_AI) {
      const rule = rules.find((r) => r.userAgent === agent);
      expect(rule, `${agent} must have an explicit rule`).toBeDefined();
      expect(rule!.allow).toContain("/");
    }
  });

  it("fully blocks known aggressive scrapers", () => {
    for (const agent of BLOCKED_SCRAPERS) {
      const rule = rules.find((r) => r.userAgent === agent);
      expect(rule, `${agent} must have an explicit rule`).toBeDefined();
      expect(rule!.disallow).toContain("/");
    }
  });

  it("does not allow AI/aggregator bots that were never approved", () => {
    const explicitlyApproved = new Set(["*", ...ALLOWED_AI, "Googlebot", "Googlebot-News", "Applebot", "Applebot-Extended", "Bingbot"]);
    for (const agent of userAgents) {
      // Google-Extended/Googlebot/Applebot are search engines, not just AI; allowed.
      if (explicitlyApproved.has(agent)) continue;
      const rule = rules.find((r) => r.userAgent === agent);
      // Any other UA block must be an explicit, intentional decision.
      expect(rule!.disallow ?? []).toContain("/");
    }
  });

  it("never disallows css/js/assets/image directories", () => {
    for (const rule of rules) {
      const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
      for (const d of disallowed) {
        if (!d) continue;
        expect(/^\/?(css|js|assets|images?)(\/|$)/.test(d)).toBe(false);
      }
    }
  });

  it("references the sitemap index and news sitemap", () => {
    const sitemaps = robots().sitemap ?? [];
    const joined = Array.isArray(sitemaps) ? sitemaps.join(",") : String(sitemaps);
    expect(joined).toContain("/sitemap.xml");
    expect(joined).toContain("/news-sitemap.xml");
  });
});
