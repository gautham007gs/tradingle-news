# AGENTS.md — Engineering Rules for Humans & AI Coding Agents

> **Last updated:** 2026-08-24 (UTC) · Version 3.0
> **How to use this file (AI agents):** read it fully before your first change in this repo.
> Sections A–D are *enforceable engineering law*; Section E is the SEO contract that overrides
> convenience every time; Section F lists task playbooks so you don't reinvent patterns that
> already exist. When a user request conflicts with this file, surface the conflict explicitly
> instead of silently breaking an invariant.

**Project:** Tradingle — production digital news publication.
**Stack:** Next.js 15 (App Router, React 19, TS, Tailwind v3, shadcn/ui) + procedural PHP 8.2+
backend (`api/`, no framework) + MySQL via PDO + Hostinger (Apache edge → Node standalone :3000,
PHP serves `/api/*`). Admin & contributor panels are client-side React SPAs mounted under
`/admin` and `/contributor`; all public reader pages are server-rendered with ISR.

---

## A. Project invariants — never break these

1. **Public pages must render content server-side.** Headline, byline, dates, full body,
   canonical link, meta robots, OG/Twitter tags and JSON-LD must exist in the raw HTML response.
   The admin/contributor SPAs may be client-rendered; public reader routes may not.
2. **One canonical URL shape:** `/{category-slug}/{article-slug}`. Build URLs only through
   `lib/site.ts` helpers (`canonicalArticlePath`, `canonicalArticleUrl`, `absoluteUrl`) or
   `lib/articlePaths.ts`. Never hand-concatenate URLs in templates, sitemaps or feeds.
3. **Real HTTP status codes:** 200 = real content; 301 = moved; 404 via `notFound()`;
   maintenance = real 503 from `middleware.ts`. Never return 200 with "not found" text.
4. **All SQL uses prepared statements.** No superglobal value is ever interpolated into a query
   string. Dynamic IN-lists are built only from integer-cast values.
5. **Every state-changing PHP endpoint** starts with `require_method(...)`, then either
   `require_roles([...])` + `require_csrf_token()` (staff/user writes) or an explicit public
   control (rate limit, CRON_KEY with `hash_equals`, SETUP_KEY). No exceptions.
6. **CMS-controlled HTML reaches the browser only through `sanitizeArticleHtml()`**
   (`src/lib/contentHtml.ts`) and JSON-LD only through `serializeJsonLd()` (`lib/jsonLd.ts`).
7. **Session tokens live in DB as SHA-256 hashes and in browser memory only.** Never store them
   in localStorage/sessionStorage/cookies you create yourself.
8. **Secrets compare with `hash_equals()`**, never `===`.
9. **Published article URLs are immutable.** Changing one requires a row in the redirects table
   (the middleware picks it up within ~60s).
10. **Schema changes ship as idempotent code** (`CREATE TABLE IF NOT EXISTS` / guarded ALTERs in
    `ensure_cms_schema_upgrades()` or the endpoint that needs them), never as untracked manual
    SQL. Dumps (*.sql) are gitignored forever.
11. **Server-side API fetches always go through `lib/api.ts::apiFetch`** (10s timeout, ISR tags,
    X-API-Key header). Don't call `fetch()` ad-hoc in server components.
12. **Timestamps from MySQL are timezone-naive UTC.** In TS, parse them by replacing `' '` with
    `'T'` and appending `'Z'` (see `toIsoDateTime`) to avoid hydration mismatches.

## B. Verification workflow — run before you claim done

```bash
npm run type-check   # must be 0 errors
npm run lint         # must be 0 errors (warnings tolerated, don't add new ones)
npm test             # all tests must pass (44 as of 2026-08-24)
php -l <file>        # for every touched .php file
npm run build        # when touching routing, layouts, middleware, or configs
```

For SEO-relevant template changes additionally: fetch the route's HTML and grep for `<h1` /
JSON-LD without JS, and validate changed structured data in Google's Rich Results Test.
CI (`.github/workflows/ci.yml`) runs all of this on push — don't merge red.

## C. Code conventions

### TypeScript / React
- Server components by default under `app/(site)/`; `"use client"` only where interaction is real.
- Types live in `lib/types.ts` (server) / near their consumer (client). API responses are mapped
  through typed mappers in `lib/api.ts` — keep mappers defensive (`raw.x || fallback`).
- Tailwind utility classes first; custom CSS goes in `app/globals.css` (highest priority),
  `src/styles/*`, or component-scoped files. CSS priority order matters: globals wins.
- UI primitives: use the existing shadcn components in `src/components/ui/*` before adding deps.
- No new runtime dependencies without justification — check package.json first.

### PHP
- Every file: `declare(strict_types=1);` + `require_once __DIR__ . '/bootstrap.php';` (or the
  correct relative path).
- Responses: `json_response([...])` / `json_error($msg, $status)` — both exit; nothing echoes
  output directly.
- Input: `input_json()` for JSON bodies; cast/sanitize everything; validate enums against
  allow-lists (`in_array(..., true)`).
- Multi-table writes: wrap in a transaction; roll back + json_error(500) on Throwable.
- Schema additions go through `ensure_cms_schema_upgrades()` style idempotent blocks wrapped in
  try/catch with error_log — failures must never break the request.

## D. Security rules

- Auth: `require_user()` / `require_roles(['admin','editor',...])` (returns `[$user, $roles]`).
  Roles are re-read from DB per request — never cache authorization decisions in tokens.
- CSRF: required on cookie-authenticated writes; Bearer-token requests are exempt by design
  (documented in `require_csrf_token()`).
- Rate limits: reuse the central `rate_limit(key, max, window, failOpen)` helper for any new
  public write path. Login-class endpoints use `failOpen=false`.
- File uploads: keep the megapixel cap, MIME allow-list, per-user/per-IP quotas — don't relax.
- Output: React escapes by default; PHP must JSON-encode responses; the two sanctioned
  raw-HTML sinks are named in invariant A6.
- Never log or return secrets, password hashes, or full session tokens.
- Headers: security headers are set centrally (`set_security_headers()` + Next.js
  `next.config.mjs` + `.htaccess` files). Don't strip them.

## E. SEO contract (enforceable)

*Prime directive: every rule exists so search engines and AI crawlers only ever reward this
site — no keyword stuffing, no cloaking, no shortcuts that break on the next algorithm update.*

1. **Rendering** — public routes return headline/byline/date/full body/JSON-LD in raw HTML.
   Verify with `curl -A "Mozilla/5.0" <url> | grep -i "<h1"`. Error pages render server-side too.
2. **Status codes** — real content → 200; moved → 301; missing/removed → 404/410 (never soft
   404); maintenance → 503; redirect chains max one hop.
3. **URLs** — `/{category-slug}/{article-slug}`, lowercase hyphenated, no query IDs, no trailing
   slash, immutable once indexed (changes require a 301 redirect row), no tracking params in
   canonical/internal/sitemap URLs.
4. **Canonicals** — exactly one per page, absolute, self-referencing by default; cross-domain
   only for true syndication and only to a live indexable URL; canonical/sitemap/links agree.
5. **Meta robots** — default index,follow; `noindex` is opt-in per article via `robots_index`;
   robots.txt is crawl control, not index control.
6. **robots.txt** — domain root, never disallows CSS/JS/assets; references sitemap index AND
   news sitemap; AI-bot policy is explicit (`app/robots.ts`); changes to it are deliberate,
   documented decisions.
7. **Sitemaps** — generated dynamically from the DB (index + segmented articles + taxonomy +
   static). News sitemap = only articles within `news_sitemap_window_hours` (default 48h),
   regenerated on publish, ≤1000 entries, dates from the same columns as JSON-LD dates. No
   sitemap may ever list a URL that 404s, redirects, or is noindex (`npm run check:sitemap`).
8. **Structured data** — NewsArticle-family JSON-LD server-side with headline, image array,
   ISO-8601-with-offset dates, Person author with bio URL, NewsMediaOrganization publisher with
   logo; homepage WebSite+SearchAction+organization; BreadcrumbList on categories/articles;
   Person/ProfilePage on author pages; og:image == JSON-LD image == hero image. Validate in
   Rich Results Test: zero errors, zero warnings.
9. **Performance budgets** — LCP < 2.5s, INP < 200ms, CLS < 0.1 at p75. Images WebP/AVIF with
   explicit dimensions; LCP hero eager + fetchpriority high; below-fold lazy; third-party
   scripts deferred (GA4/GTM are afterInteractive already); listing queries cached (ISR/60s PHP
   file cache); gzip at edge. Regressions here block merges.
10. **CMS enforcement** — hard blocks enforced SERVER-side in `api/article_policy.php`
    (`assert_publishable`): meta_description set, featured_image_alt set (≠ filename), author_id
    assigned, slug unique among published. Warnings (title >60/<30 chars, description outside
    120–160, small hero image, missing category/tags) surface in the editor UI with live
    counters and a social preview card. A scripted API client cannot bypass these.
11. **Content rules** — named linked author on everything; unique non-templated titles (≤~60
    chars) and descriptions (120–160); one h1 per page matching the headline, no skipped heading
    levels; no keyword stuffing anywhere; no pure wire-copy rewrites without added reporting;
    updates bump dateModified automatically and get a visible "Updated:" note; open sections
    BLUF-style (point first, 2–3 sentence paragraphs) — clarity, never stuffing.
12. **Server-level security** — HTTPS + host canonicalization forced at .htaccess before app
    code; no mixed content anywhere including JSON-LD images; `.env/.sql/.log` denied at web
    server level (`api/.htaccess`, `public/.htaccess`). Apache config comments start with `#`
    — an invalid directive in .htaccess 500s the whole tree (this exact bug shipped once; see
    audits F1).
13. **Pre-merge checklist** — (a) curl changed route, confirm content+JSON-LD without JS;
    (b) Rich Results Test clean; (c) canonical/sitemap/internal links agree; (d) CWV check;
    (e) robots.txt/meta-robots output unchanged.

## F. Task playbooks (follow existing patterns — don't invent new ones)

### Add a public page
1. Create `app/(site)/<path>/page.tsx` with `export const revalidate = <seconds>` and full
   `generateMetadata` (canonical via `absoluteUrl`, OG/Twitter images only from real files —
   today that is `/og-image.png`; never reference `/assets/brand/*`, those files don't exist).
2. Add JSON-LD via a builder in `lib/seo.ts` + `<JsonLd data={...} />`.
3. Add the route to the static list in `app/sitemap.ts` with a stable lastModified (not `new Date()`
   unless genuinely always-fresh).
4. If the path could collide with `[category]`, add it to `RESERVED_SLUGS` in both
   `app/(site)/[category]/page.tsx` and `[category]/[slug]/page.tsx`.

### Add/modify an article-page feature
- Data flows: PHP endpoint → mapper in `lib/api.ts` (+ type in `lib/types.ts`) →
  `lib/articlePage.ts` → server component under `components/article/`. Client interactivity goes
  in a child `"use client"` component. Any HTML from CMS passes `sanitizeArticleHtml()`.

### Add a PHP endpoint
1. New file under the matching `api/<subsystem>/` folder; start from an existing sibling.
2. Order: strict_types → bootstrap → require_method → auth (`require_roles`) → CSRF → rate
   limit (if public write) → validate input → transactional work → json_response.
3. If it mutates articles/homepage/settings, call `invalidate_article_cache()` /
   appropriate revalidation after commit, and log via existing helpers.

### Change DB schema
Add idempotent DDL to `ensure_cms_schema_upgrades()` in `api/helpers.php` (or the owning
endpoint), mirror any CREATE TABLE in `database/migrate.php` conventions, and remember prod
MySQL may pre-date `IF NOT EXISTS` for indexes — wrap defensively.

### Add a redirect
Insert into the `redirects` table (`from_path`, `to_path`, `status_code` 301|302, is_active) via
the admin UI or `api/admin/redirects-save.php` semantics; root `middleware.ts` picks it up within
~60s. Never create chains (A→B→C).

### Modify robots.txt / sitemaps / feeds
`app/robots.ts`, `app/sitemap.ts`, `app/sitemap-index.xml/route.ts`,
`app/sitemap-articles/[page]/route.ts`, `app/news-sitemap.xml/route.ts`, `app/(site)/feed.xml`.
After changes run `npm test` (contract tests exist) and `npm run check:sitemap`.

## G. Environment & operational caveats

1. **Never check out this repo into a path containing `$`.** Next.js's build toolchain corrupts
   absolute paths containing `$` (`String.replace` replacement-pattern semantics) and `next build`
   fails with misleading ENOENT errors. Verified 2026-08-24 — see audits MASTER §2 F5.
2. `.env*` files hold real credentials locally — gitignored; never commit, echo, or transmit.
3. Cron: Hostinger scheduler hits `api/cron/publish-scheduled.php` and `api/cron/cleanup-logs.php`
   with `Authorization: Bearer $CRON_KEY` (GET `?key=` fallback exists). Heartbeats land in
   `cron_health`; admin cron-health view alerts on staleness.
4. Maintenance mode: toggled via Site Settings (`maintenance_enabled`); middleware serves real
   503 within ~60s while keeping `/admin`, `/contributor`, auth pages and API reachable.
5. Node 22 LTS everywhere (Node 20 EOL April 2026). PHP ≥8.2.

## H. Where deeper knowledge lives

- `audits/AUDIT-2026-08-24-MASTER.md` — current audit entry point (findings F1–F5, verification).
- `audits/AUDIT-2026-08-24-{SECURITY,BACKEND-PHP,FRONTEND-NEXTJS,SEO,INFRA-CONFIG}.md`
- `README.md` — architecture handbook (directory map, request flow, caching model, env vars).
- `docs/history/AUDIT_REPORT.md`, `docs/history/CMS_ARCHITECTURE_AUDIT.md` — historical audit passes (context for *why*
  current patterns exist; issue numbers referenced throughout the code comments trace here).
- `docs/deploy-hostinger.md` — deployment; `.env.example` — every tunable knob, documented inline.

---
*Version 3.0 · Last updated: **2026-08-24 (UTC)** · Update this file in the same change set as
any commit that alters architecture, security posture, SEO behavior, or project structure.*

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
