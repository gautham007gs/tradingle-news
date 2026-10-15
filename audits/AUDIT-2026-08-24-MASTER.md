# Tradingle News — Master Audit Report (Pass 3, 2026-08-24)

> **Read this first (for humans and AI agents alike).** Entry point for the third full
> codebase audit. Indexes the per-type audit files, records what was verified and how, and
> lists every issue found with its status. Previous passes: `docs/history/AUDIT_REPORT.md` (pass 1) and
> `docs/history/CMS_ARCHITECTURE_AUDIT.md` (pass 2) remain valid historical records; this pass re-verified
> their fixes still hold.

---

## 1. Scope & Method

Every file and folder outside `.next/`, `.local/`, and `node_modules/` was inventoried and
reviewed: `api/**` (99 PHP files + .htaccess), `app/**` (~48 TS/TSX), `lib/**`, `components/**`,
`src/**` (~180 SPA files), `database/`, `scripts/`, `public/`, root configs and CI.

### Automated verification performed

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npx vitest run` | ✅ 44/44 passed (6 files) |
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| ESLint | `npx eslint .` | ✅ 0 errors, 31→26 warnings |
| PHP syntax | `php -l` over all PHP files | ✅ all pass |
| Production build | `next build` | ✅ succeeds — all routes compiled (see §2 F5 env note) |
| Security pattern scan | superglobals / SQL interpolation / CSRF+auth coverage | ✅ see SECURITY audit |

---

## 2. Issues found in THIS pass (cause → impact → fix)

### F1. `api/.htaccess` — HTML comment breaks Apache parsing — 🔴 CRITICAL → FIXED
- **What:** Line 8 used `<!-- ... -->` instead of an Apache `#` comment.
- **Why it happened:** AI/code-generator blended HTML syntax into `.htaccess`; nothing catches
  it locally because Apache only parses this on the Hostinger deploy.
- **Why it matters:** An invalid directive makes Apache fail to load the file → HTTP 500 for
  every `/api/*` request in production while local tests stay green.
- **Fix:** Changed to `# Enable gzip compression for API responses`.

### F2. `feed.xml` route — RSS channel image 404s — 🟠 MEDIUM → FIXED
- **What:** `<image><url>` pointed at nonexistent `/assets/brand/logo.png`.
- **Why:** Pass-1 issue #73 fixed that URL in `lib/seo.ts` but missed the feed template.
- **Impact:** Broken image in feed readers; contradicts SEO rule 8.
- **Fix:** Uses `/og-image.png` (1200×630).

### F3. `editors-picks` page — OG/Twitter card images 404 — 🟠 MEDIUM → FIXED
- **What:** OG + Twitter images pointed at nonexistent `/assets/brand/og-default.png`.
- **Why:** Static `metadata` objects bypass the shared `articleOgImage()` helper, so the same
  class of dead-path bug survived the pass-1 fix.
- **Impact:** No preview image when the page is shared socially.
- **Fix:** Both now use `/og-image.png`. Lesson: never reference `assets/brand/*`; only real
  public assets (`/og-image.png`) or CMS-driven `site_default_og_image`.

### F4. CSRF comparison not timing-safe — 🟡 LOW → FIXED
- **What:** `require_csrf_token()` compared tokens with `!==`.
- **Fix:** `hash_equals()` in `api/helpers.php`, consistent with all other secret comparisons.


### F5. Folder name `tradingle$$` breaks `next build` locally — ⚠️ ENVIRONMENT → DOCUMENTED
- **What:** `next build` failed with ENOENT on paths like `...\tradingle$\...` (one `$` missing).
- **Root cause (traced with instrumented builds):** JS `String.replace()` interprets `$$` in the
  replacement string as an escaped literal `$`. Next.js's build pipeline constructs paths via
  `.replace(ALIAS, appDir)` (`node_modules/next/dist/build/entries.js getPageFilePath()`,
  `next-app-loader createAbsolutePath()`), so any project path containing `$` is corrupted.
  **Not a codebase bug** — CI and Hostinger paths are unaffected.
- **Workaround:** replacer-function patches applied to local node_modules only; durable fix is a
  `$`-free project path. Build verified green from such a path.

---

## 3. Verified-sound areas (re-audited)

- **Auth & sessions** — SHA-256-hashed session tokens, HttpOnly/SameSite cookies, 2h idle
  timeout, TOTP 2FA with single-use challenge tokens, per-IP AND per-email login rate limits
  (fail-closed), password rehash upgrades, SETUP_KEY + admin-exists lockdown for setup endpoints.
- **Authorization** — all state-changing POST endpoints enumerated: role-guarded or deliberately
  public with own controls (rate limits / CRON_KEY / tokens). Roles re-read from DB per request.
- **SQL injection** — prepared statements everywhere; no superglobal interpolated into SQL;
  dynamic IN-lists built from integer casts only.
- **XSS** — CMS HTML through multi-pass deterministic sanitizer; JSON-LD through escaping
  serializer; prod CSP enforced; React escapes by default elsewhere.
- **SEO contract** — SSR content/canonical/robots/JSON-LD verified against AGENTS.md rules;
  real 404/503 status codes; sitemaps DB-driven with configurable news window (≤1000); explicit
  AI-bot robots policy; llms.txt lists real routes.
- **Caching/perf** — ISR windows per route type, secret-guarded tag-revalidation webhook with
  logging, 10s server-fetch timeout, PHP file cache for homepage payload, deferred analytics,
  edge gzip + immutable static caching.
- **CI** — Node 22; type-check, lint, tests, build, prod-dep audit, PHP lint, sitemap integrity.

## 4. Operator follow-ups

1. Rotate real credentials present in local `.env` (Hostinger DB password, Google OAuth secret,
   SETUP_KEY); consider gitleaks pre-commit.
2. Keep project checkout paths free of `$` characters (see F5).
3. Remaining 26 lint warnings are cosmetic (`<img>` vs next/image, hook deps) — triage in
   FRONTEND audit §4.
4. Nightly sitemap-vs-production check remains recommended.


## 5. Live CMS testing + fixes — 2026-08-24 (second pass)

Logged into the admin panel as a real admin, walked every view against the production DB
(Dashboard, Articles, Editor create/save/delete cycle, Categories, Tags, Series, Media, Authors,
Users, Review, Comments, Homepage slots, Navigation, Redirects, Ads, Sitemap view, Calendar,
Jobs, Newsletters, Rewards, Analytics, Breaking news, Security, Site settings), and smoke-tested
all 26 admin GET endpoints (26/26 → 200 OK). Two critical backend bugs surfaced and were fixed:

### F6. Article save returned 500 although the save SUCCEEDED — 🔴 CRITICAL → FIXED
- **What:** `POST /api/articles/save.php` returned an empty HTTP 500; the UI showed "Could not
  save article" while the article was actually created in the DB.
- **Root causes stacked:**
  1. `CREATE TABLE IF NOT EXISTS` DDL **inside** the save transaction → MySQL implicit commit →
     the final `commit()` threw "There is no active transaction".
  2. Post-commit side effects (audit log, cache invalidation) shared the same try block, so any
     failure reached `catch { rollBack(); }` — and `rollBack()` with no active transaction threw
     a SECOND uncaught exception → empty-body 500 to the client.
- **Fixes:** new `safe_rollback($pdo)` helper replaces all 16 bare `rollBack()` calls across
  `api/**`; all in-transaction DDL moved to `ensure_cms_schema_upgrades()`; post-commit side
  effects individually wrapped so they can never fail a saved article.
- **Verified end-to-end:** login → CSRF → save draft (200 + JSON id/slug) → list → delete.

### F7. Schema drift: DB missing columns newer code requires — 🔴 CRITICAL → FIXED
- **Found by:** running the fixed local PHP against the production DB: login fatals with
  `Unknown column 'last_active_at' in 'INSERT INTO' (user_sessions)`.
- **Why:** newer code referenced columns older databases never received; schema upgrades covered
  tables only, and the login path never ran upgrades at all.
- **Impact:** on any DB built from an older dump: login fatals, saves fail, 2FA fails.
- **Fixes:** new `ensure_column()` helper; `ensure_cms_schema_upgrades()` now ensures 19 known
  columns (user_sessions.last_active_at/csrf_token, users.totp_*/last_login_at/
  email_verified_at, articles.subtitle/robots_noarchive/content_type/google_news_exclude/
  location_*/evergreen_audit_date/audience/series_id/correction_note/lock_*);
  `ensure_session_schema()` guards every user_sessions read/write in `auth/session.php`.
- **Also fixed:** `api/error-log.php` GET branch wrapped (missing table returned empty 500);
  wrong-path require `dirname(__DIR__).'/auth/account_helpers.php'` → `__DIR__`.

> ⚠️ **Deploy note:** these backend fixes live in this repo's `api/` folder. Production
> (`tradingle.com/api`) still runs the OLD code until the folder is deployed to Hostinger —
> until then article saving from the CMS will keep returning 500 there even though the article
> is actually created.

## 6. Cleanup pass — 2026-08-24 (dead code & dependency removal)

Every candidate was verified unused via reference tracing across `app/ src/ lib/ components/
middleware.ts` before deletion:

- **Root junk:** 15 probe/log `.txt` files, `chat with chatgpt.txt`, `tsconfig.tsbuildinfo`,
  `.next/` (regenerable build output), `.local/` (647 tool-artifact files, zero code references).
- **36 dead UI components** (`src/components/ui/`): accordion, aspect-ratio, avatar, breadcrumb,
  calendar, carousel, chart, command, context-menu, drawer, dropdown-menu, form, hover-card,
  input-otp, menubar, navigation-menu, OptimizedImage, pagination, popover, progress,
  radio-group, resizable, RevealSection, scroll-area, ScrollRevealInit, separator, sheet,
  sidebar, slider, table, toggle, toggle-group.
- **Dead source files:** `src/components/cms/SchemaMarkup.tsx`, `src/hooks/useInfiniteScroll.ts`,
  `src/hooks/useReveal.ts`, `src/hooks/use-mobile.*`.
- **26 removed npm dependencies** (each one's only consumer was among the deleted files):
  `@hookform/resolvers`, `@radix-ui/react-{accordion, aspect-ratio, avatar, context-menu,
  dropdown-menu, hover-card, menubar, popover, progress, radio-group, scroll-area, separator,
  slider, toggle, toggle-group}`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`,
  `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `reading-time`, `recharts`,
  `vaul`. Lockfile re-synced; `date-fns` also removed from `optimizePackageImports`
  (`next.config.mjs`).
- **Kept deliberately:** legacy PHP fallback endpoints referenced by deploy docs; `.replit` /
  `replit.md`; all live UI primitives (alert-dialog, badge, button, card, checkbox, collapsible,
  dialog, input, label, select, skeleton, sonner, switch, tabs, textarea, toast/toaster,
  tooltip); `zod` (used by `app/api/navigation/route.ts`).

**Post-cleanup verification:** tsc 0 errors · eslint 0 errors / 26 warnings · 44/44 tests ·
production build succeeds.

## 7. Index of audit files

| File | Covers |
|---|---|
| `audits/AUDIT-2026-08-24-MASTER.md` | This file — index, method, findings F1–F5, cleanup log |
| `audits/AUDIT-2026-08-24-SECURITY.md` | AuthN/AuthZ, CSRF, injection, XSS, secrets, rate limiting |
| `audits/AUDIT-2026-08-24-BACKEND-PHP.md` | Every `api/**` subsystem, DB patterns, cron, caching |
| `audits/AUDIT-2026-08-24-FRONTEND-NEXTJS.md` | Routes, rendering, hydration, SPA, lint warnings |
| `audits/AUDIT-2026-08-24-SEO.md` | AGENTS.md contract compliance, sitemaps, feeds, JSON-LD |
| `audits/AUDIT-2026-08-24-INFRA-CONFIG.md` | Deploy artifacts, CI, env, dependencies |

---
*Last updated: **2026-08-24 (UTC)** — includes the post-audit cleanup pass.*
