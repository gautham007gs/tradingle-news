/**
 * Nightly SEO integrity check (SEO_RULES.md rule 7).
 *
 * Verifies every URL listed in the sitemaps is healthy:
 *   - returns 200 (or a redirect chain that terminates at 200 — never a dead
 *     redirect/404)
 *   - does not carry a `noindex` meta robots tag
 *
 * Run: node scripts/check-sitemap.mjs [--base https://www.tradingle.com]
 * Exit code 0 = all healthy, 1 = one or more URLs failed.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("--base=")) ?? "").split("=")[1]
  || process.env.SITEMAP_BASE
  || "https://www.tradingle.com";

const baseOrigin = new URL(base).origin;

const SITEMAPS = [
  "/sitemap-index.xml",
  "/sitemap.xml",
  "/news-sitemap.xml",
  "/robots.txt",
];

const UA = "Mozilla/5.0 (compatible; TradingSEO-bot/1.0)";

async function fetchWithRedirects(url, seen = new Set()) {
  if (seen.has(url)) {
    return { finalStatus: 0, redirectLoop: true, finalUrl: url };
  }
  seen.add(url);

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) return { finalStatus: res.status, finalUrl: url, redirected: true };
    return fetchWithRedirects(new URL(location, url).href, seen);
  }

  return { finalStatus: res.status, finalUrl: res.headers.get("x-final-url") ?? url, redirected: seen.size > 1 };
}

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    // Normalize loc URLs to the checked origin so --base local runs resolve
    // against the local server instead of the production host in the sitemap.
    try {
      const u = new URL(m[1].trim());
      locs.push(baseOrigin + u.pathname + u.search);
    } catch {
      /* skip malformed */
    }
  }
  return locs;
}

async function check() {
  const failures = [];
  let checked = 0;
  let sitemapFilesChecked = 0;

  // Crawl the sitemap tree: index → sub-sitemaps (incl. paginated article
  // segments /sitemap-articles/N) → page URLs. Every <loc> that points at a
  // sitemap file is fetched and expanded; leaf URLs are checked as pages.
  const pageUrls = new Set();
  const queue = [...SITEMAPS];
  const visited = new Set();

  while (queue.length) {
    const path = queue.shift();
    const url = `${base}${path}`;

    let res;
    try {
      res = await fetchWithRedirects(url);
    } catch (e) {
      failures.push({ url, reason: `fetch error: ${e.message}` });
      continue;
    }
    if (res.redirectLoop) {
      failures.push({ url, reason: "redirect loop" });
      continue;
    }
    if (res.finalStatus !== 200) {
      failures.push({ url, reason: `HTTP ${res.finalStatus}${res.redirected ? " (redirected)" : ""}` });
      continue;
    }

    if (path === "/robots.txt") continue;

    sitemapFilesChecked++;

    const text = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    const locs = extractLocs(text);
    for (const loc of locs) {
      const p = new URL(loc).pathname;
      const isSubSitemap =
        p === "/sitemap.xml" ||
        p === "/news-sitemap.xml" ||
        p === "/sitemap-index.xml" ||
        /^\/sitemap-articles\/\d+$/.test(p);
      if (isSubSitemap) {
        if (!visited.has(p)) {
          visited.add(p);
          queue.push(p);
        }
      } else {
        pageUrls.add(loc);
      }
    }
  }

  // Check each page URL: 200 + indexable (no noindex meta robots).
  for (const url of pageUrls) {
    checked++;
    let res;
    try {
      res = await fetchWithRedirects(url);
    } catch (e) {
      failures.push({ url, reason: `fetch error: ${e.message}` });
      continue;
    }
    if (res.redirectLoop) {
      failures.push({ url, reason: "redirect loop" });
      continue;
    }
    if (res.finalStatus !== 200) {
      failures.push({ url, reason: `HTTP ${res.finalStatus}${res.redirected ? " (redirected)" : ""}` });
      continue;
    }
    const html = await (await fetch(res.finalUrl, { headers: { "User-Agent": UA } })).text();
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) {
      failures.push({ url, reason: "page carries noindex but is listed in sitemap" });
    }
  }

  console.log(`Checked ${sitemapFilesChecked} sitemap file(s), ${checked} unique sitemap page URLs.`);
  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    for (const f of failures) console.error(`  - ${f.url}: ${f.reason}`);
    process.exit(1);
  }
  console.log("All sitemap URLs healthy (200, indexable, no dead redirects).");
}

check().catch((e) => {
  console.error("check-sitemap failed:", e);
  process.exit(1);
});
