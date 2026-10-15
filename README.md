# Tradingle News — Project Handbook

> **Last updated:** 2026-08-24 (UTC) · Audit reference: `audits/AUDIT-2026-08-24-MASTER.md`
> This README is the single entry point for understanding, running, and safely modifying the
> Tradingle codebase. It is written for both humans and AI coding assistants: every section
> states facts about the actual code (verified during the 2026-08-24 full audit), not
> aspirations. If code and this document ever disagree, fix one of them in the same commit.

---

## 1. What is Tradingle?

Tradingle is a production **digital news publication** (India-focused: markets, business,
technology, politics, global affairs) with three faces:

1. **Public reader site** — server-rendered (SSR/ISR) pages optimized for Google News,
   search engines, and AI answer engines. Live at `https://www.tradingle.com`.
2. **Admin CMS** (`/admin`) — a client-side React SPA for editors: article lifecycle
   (draft → review → scheduled → published), homepage curation, categories/tags/series,
   media library, comments moderation, redirects, ads, newsletters, jobs board, user/role
   management, security settings (2FA), analytics and SEO health dashboards.
3. **Contributor portal** (`/contributor`) — a separate SPA for external writers to submit
   articles into a review queue and track rewards/referrals.

Key product features: article revisions with restore, collaborative edit locks, scheduled
publishing via cron, live-update blogs, guest + authenticated comments (moderated),
bookmarks ("saved"), points/referral rewards, newsletters, dynamic redirects manager,
maintenance mode, Google OAuth login, TOTP two-factor auth for admins.

## 2. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | **Next.js 15** (App Router), React 19, TypeScript | `output: 'standalone'` |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) + custom CSS modules | CSS priority: `app/globals.css` > `src/styles/*` > `src/index.css` |
| Admin/contributor SPAs | React Router v6 mounted inside Next.js catch-all routes | Client-only; never used for public reader pages |
| Data-fetching (client) | TanStack Query v5 | In `src/**` SPA views |
| Backend API | **Procedural PHP 8.2+** (`strict_types` everywhere), no framework | Lives in `api/`, deployed separately at `tradingle.com/api` |
| Database | MySQL/MariaDB (InnoDB, utf8mb4) via PDO, prepared statements only | Remote on Hostinger in prod; self-migrating schema |
| Auth | PHP sessions (hashed tokens in DB, HttpOnly cookie) + Google OAuth + TOTP 2FA | See §8 |
| Rendering cache | Next.js ISR + tag-based revalidation webhook from PHP | See §7 |
| Tests | Vitest (44 tests across 6 files) | SEO/sitemap/robots/json-ld contracts are test-enforced |
| CI | GitHub Actions | type-check → lint → tests → build → npm audit → php lint → sitemap check |
| Hosting | Hostinger: Apache edge + PHP for `/api/*` + Node standalone for everything else | See `docs/deploy-hostinger.md` |

## 3. Quick start

```bash
# Prerequisites: Node.js 22 LTS, npm 10+. Optional: local PHP 8.2+ & MySQL to run the backend.
npm install            # no --legacy-peer-deps needed
cp .env.example .env   # fill in values (see §9)
npm run dev            # http://localhost:3000
```

By default `/api/*` is **proxied to the live backend** (`https://tradingle.com/api`) so you can
develop the frontend without local PHP. To run the PHP backend locally, set:

```env
API_PROXY_TARGET=http://localhost:8080/api
API_SERVER_BASE=http://localhost:8080/api
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build (standalone output in `.next/standalone`) |
| `npm start` | Serve a completed build |
| `npm run lint` | ESLint (must stay at **0 errors**) |
| `npm run type-check` | `tsc --noEmit` (must stay at **0 errors**) |
| `npm test` | Vitest suite (44 tests — all must pass) |
| `npm run check:sitemap` | Crawl generated sitemap output; fails if any listed URL is not indexable |
| `npm run fonts:copy` | Refresh self-hosted WOFF2 fonts into `public/assets/fonts/` |

## 4. Directory map (what lives where)

Every major folder has its own `README.md` explaining its contents and rules — the tree is
self-documenting. Top level:

```
tradingleworkspace/
├── AGENTS.md              ← engineering law for humans & AI agents (read first)
├── README.md              ← this handbook
├── middleware.ts          ← Next.js middleware: DB-driven redirects + maintenance 503
├── app/                   ← Next.js App Router — routing = URLs (server-rendered pages)
│   ├── (site)/            ← public reader pages (ISR): home, [category]/[slug] articles,
│   │                        tags, authors, archive, search, legal/policy, RSS per category
│   ├── admin/[[...path]]/ ← mounts the admin SPA (from src/)
│   ├── contributor/[[...path]]/ ← mounts the contributor SPA
│   ├── api/               ← Next route handlers (revalidate webhook, read proxies)
│   ├── robots.ts · sitemap.ts · sitemap-index.xml/ · sitemap-articles/[page]/ ·
│   │   news-sitemap.xml/ · feed.xml/ · rss.xml/
│   ├── login/ register/ forgot-password/ reset-password/ verify-email/
│   ├── error.tsx · global-error.tsx · not-found.tsx · layout.tsx · globals.css
├── api/                   ← PHP 8.2 backend — folder/file = endpoint URL (deployed to Hostinger)
│   ├── bootstrap.php · config.php · db.php · helpers.php · article_policy.php
│   ├── auth/ articles/ categories/ tags/ series/ media/ comments/ bookmarks/
│   ├── points/ referrals/ newsletters/ jobs/ ads/ analytics/ redirects/
│   ├── admin/ (staff endpoints) · cron/ · setup/ · sitemap/
│   └── .htaccess          ← deny .env/.sql/.log; gzip; no indexes
├── components/            ← server components for public pages (article/, home/, layout/,
│                            legal/, search/, JsonLd.tsx …)
├── lib/                   ← server-side TS utilities (api.ts fetch layer, site.ts URL
│                            builders, seo.ts + jsonLd.ts structured data)
├── src/                   ← client-side world (admin & contributor SPAs + shared client code)
│   ├── views/admin/       ← one file per CMS screen (~26), lazy-loaded
│   ├── views/contributor/ ← contributor portal screens
│   ├── components/{cms,news,ui,account,auth,seo}/
│   ├── hooks/             ← useCmsAuth, useAuth, useTheme, use-toast
│   ├── lib/hostingerApi.ts← client API wrapper (in-memory token + CSRF)
│   ├── lib/contentHtml.ts ← deterministic HTML sanitizer
│   ├── assets/ · data/ · styles/ · test/
├── database/              ← schema tooling only (migrate.php) — dumps are gitignored forever
├── public/                ← static edge files served by Apache verbatim
│   ├── og-image.png · favicon.* · placeholder.svg · critical-shell.css · llms.txt
│   ├── assets/fonts/      ← self-hosted WOFF2 fonts
│   └── .htaccess · index.php (503 fallback)
├── scripts/               ← check-sitemap.mjs · copy-fonts.mjs · dev-local.sh
├── audits/                ← current audit reports (start at AUDIT-2026-08-24-MASTER.md)
├── docs/                  ← guides & historical documents
│   ├── deploy-hostinger.md · replit notes
│   └── history/           ← pass-1 / pass-2 audit reports (superseded, kept for context)
└── .github/workflows/ci.yml  ← CI: type-check → lint → tests → build → audit → php lint
```

Hard constraints behind this layout:
- `app/**` folder names **are** URLs (Next.js routing) — never rename casually.
- `api/**` file paths **are** API endpoint URLs consumed by `src/lib/hostingerApi.ts`,
  `middleware.ts`, and deployed clients — renames are breaking changes.
- Server code (`lib/`, `components/`) vs client code (`src/`) is a deliberate split;
  see each folder's README.


## 5. How a request flows (production)

```
Browser ──► Apache (Hostinger edge, public/.htaccess)
             ├─ HTTPS redirect + www canonicalization (301)
             ├─ /api/*          ──► PHP-FPM (tradingle.com/api/**)
             ├─ /uploads/*      ──► static user uploads
             ├─ real files      ──► served directly (og-image, fonts, favicon…)
             └─ everything else ──► proxy [P] ──► Node (Next.js standalone :3000)
                                                    ├─ middleware.ts: redirects map +
                                                    │  maintenance 503 (both from PHP API)
                                                    ├─ ISR cache hit? serve instantly
                                                    └─ render: fetch PHP API (server-side,
                                                       absolute base from API_SERVER_BASE,
                                                       10s timeout) → SSR HTML + JSON-LD
```

After any publish/update/delete, PHP calls back `POST /api/revalidate` (secret-guarded) which
busts ISR tags (`article:<slug>`, `category:<slug>`, `home`, `latest`, `sitemap`, …). Without
the webhook, ISR timers (60–300s per route type) are the fallback.

## 6. PHP backend subsystem map (`api/`)

| Path | Responsibility |
|---|---|
| `bootstrap.php` | Every endpoint starts here: env load, session start, CORS, security headers, OPTIONS short-circuit |
| `config.php` / `db.php` | Env accessor (`env_value()`), lazy PDO singleton (utf8mb4, real prepares, optional TLS) |
| `helpers.php` | JSON responses, CSRF, rate limiting, file cache, revalidation webhook, cron heartbeats, schema self-upgrades, canonical allow-list |
| `article_policy.php` | Shared publishability hard-blocks (`assert_publishable`) used by save/review/schedule |
| `auth/*` | login, login-2fa, register + email verify, forgot/reset password, Google OAuth, logout, me, TOTP setup/enable/disable, session helpers |
| `articles/*` | save (lifecycle + revisions + locks + scheduling), list/show/delete/review, live-updates, revisions, locks |
| `admin/*` | dashboard, authors, comments, jobs, newsletters, ads, homepage-slots, navigation-save, redirects save/delete, site-settings, users, toggle-role, revoke-sessions, rewards-ledger, sitemap-status, cron-health, ai-assist |
| `categories/ tags/ series/` | Taxonomy CRUD (+ tag merge) |
| `comments/ bookmarks/ points/ referrals/` | Reader features (guest comments moderated; points ledger; referral codes) |
| `media/*` | Upload (quota/megapixel/MIME limits), list, delete |
| `cron/*` | publish-scheduled (transactional, FOR UPDATE), cleanup-logs (retention pruning); both CRON_KEY-guarded with heartbeats to `cron_health` |
| `sitemap/`, `homepage.php`, `navigation.php`, `site-settings.php` | Public read endpoints consumed by Next.js ISR |
| `setup/*` | One-time admin bootstrap — locked by SETUP_KEY, refuses once an admin exists unless ALLOW_ADMIN_RERUN=1 |

**Core DB tables** (non-exhaustive): `articles` (rich single-table incl. SEO fields, flags,
lock columns), `article_revisions`, `article_categories`, `tags`, `tag_categories`,
`article_series`, `categories` (hierarchical via parent_id), `users`, `roles`, `user_roles`,
`user_sessions` (hashed tokens + csrf_token column), `comments`, `drafts`, `media`,
`redirects`, `site_settings`, `newsletters`, `jobs`, `bookmarks`, `analytics_events`,
`analytics_visitors`, `rate_limit_counters`, `error_logs`, `cache_invalidation_log`,
`cron_health`, `audit_logs`, `two_factor_challenges`, `email_verifications`,
`password_resets`, `referral_links`, `user_referrals`. Schema self-migrates idempotently at
write endpoints (`ensure_cms_schema_upgrades()`); never hand-edit production schema without
mirroring it in code.

## 7. Caching & freshness model

- **ISR windows:** homepage 60s · articles 300s · category 180s · editors-picks 120s ·
  news-sitemap 300s. Server API fetches have a **10s hard timeout** (`lib/api.ts`) so the PHP
  backend can never hang a render.
- **Event-driven invalidation:** every CMS write → `invalidate_article_cache()` →
  `POST /api/revalidate` with `x-webhook-secret`; outcome logged to `cache_invalidation_log`.
- **PHP-side:** homepage payload cached 60s via temp-file cache; invalidated on publish/curation.
- **Never** add a public route that hits MySQL fresh per anonymous view — route it through ISR
  or the existing caches.

## 8. Auth model (know this before touching auth code)

- Session tokens = 32 random bytes, stored **only as SHA-256 hashes** in `user_sessions`;
  HttpOnly cookie (`tradingle_session`) + optional Bearer header for non-browser clients.
- Idle timeout 2h (configurable), absolute expiry 30d, roles always re-read from DB per request.
- Admin TOTP 2FA: credentials alone never create a session — a 5-minute single-use challenge
  token is returned instead.
- Client SPA keeps its token **in module memory only** (a legacy localStorage token is actively
  scrubbed on boot). Never reintroduce localStorage token persistence.
- All cookie-authenticated state-changing requests require an CSRF token
  (`X-CSRF-Token` header) compared with `hash_equals()`.

## 9. Environment variables

Full documented template: `.env.example` (PHP vars + Next.js vars + secrets). Highlights:

| Var | Purpose |
|---|---|
| `DB_HOST/PORT/NAME/USER/PASSWORD` (+`DB_SSL_*`) | MySQL connection (TLS supported) |
| `APP_ENV`, `FRONTEND_URL`, `CORS_ORIGINS` | Environment + allowed CORS origins |
| `SESSION_*`, `SESSION_IDLE_HOURS` | Cookie name/lifetime/SameSite + idle timeout |
| `SETUP_KEY`, `ALLOW_ADMIN_RERUN` | One-time admin bootstrap lockdown |
| `API_SECRET_KEY` | Shared secret sent as `X-API-Key` by Next → PHP |
| `REVALIDATE_SECRET`, `NEXTJS_URL` | PHP → Next ISR webhook |
| `CRON_KEY` | Cron endpoint auth |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE` | Public origin (`https://www.tradingle.com`) + API base path |
| `API_PROXY_TARGET`, `API_SERVER_BASE` | Where Next proxies/fetches `/api/*` |
| `GOOGLE_CLIENT_*`, `MAIL_FROM_*`, `TOTP_ISSUER`, `CANONICAL_ALLOWED_ORIGINS`, `AI_RATE_LIMIT_*`, `ANALYTICS_*`, `UPLOAD_*`, `NEWSLETTER_RATE_LIMIT_PER_HOUR` | Feature-specific controls — see `.env.example` comments |

⚠️ **Secrets hygiene:** `.env*` and `*.sql` are gitignored. The local working `.env` may contain
real production credentials — never commit, paste into chats, or copy between environments.
Rotate any credential that has been exposed.

## 10. SEO model (summary — the enforceable contract lives in `AGENTS.md`)

- Canonical URL shape: `/{category-slug}/{article-slug}` — built once in
  `lib/site.ts::canonicalArticlePath()` and shared by pages, sitemaps, RSS. Never hand-type URLs.
- Everything a crawler needs is in the **raw SSR HTML**: headline, byline, dates, body,
  `<link rel="canonical">`, meta robots, OG/Twitter tags, and a JSON-LD `@graph`
  (NewsArticle family + Person author + NewsMediaOrganization publisher + BreadcrumbList).
- Real status codes everywhere: 200 content · 301 moved · 404 `notFound()` · 503 maintenance.
- Sitemaps: index + segmented article pages + taxonomy; news sitemap window configurable via
  `site_settings.news_sitemap_window_hours` (default 48h, cap 1000 entries).
- AI-bot policy is explicit in `app/robots.ts` (search AI bots allowed; pure scrapers blocked).

## 11. Documentation index

| Document | Contents |
|---|---|
| **`AGENTS.md`** | Enforceable engineering rules for humans & AI agents (read before coding) |
| `audits/AUDIT-2026-08-24-MASTER.md` | Latest full audit: findings, fixes, verification results |
| `audits/AUDIT-2026-08-24-{SECURITY,BACKEND-PHP,FRONTEND-NEXTJS,SEO,INFRA-CONFIG}.md` | Per-type audit deep-dives |
| `docs/history/AUDIT_REPORT.md` | Pass-1 audit (historical; all items FIXED) |
| `docs/history/CMS_ARCHITECTURE_AUDIT.md` | Pass-2 CMS design analysis (features since implemented) |
| `docs/deploy-hostinger.md` | Production deployment checklist |
| `replit.md` | Replit-specific dev notes + CSS priority rules |

## 12. Known environment caveats

1. **`$` characters in the project path break `next build`** with misleading ENOENT errors
   (JavaScript `String.replace` treats `$$` in replacement strings as an escaped `$`, and
   Next.js builds paths that way). Keep the checkout in a `$`-free path. Details:
   `audits/AUDIT-2026-08-24-MASTER.md` §2 F5.
2. Local dev defaults to light theme; theme is stored under localStorage key `trd-theme`.
3. Node 20 is EOL (April 2026) — use Node 22 LTS locally and in CI.

---

*Document version: 3.0 · Last updated: **2026-08-24 (UTC)** · Maintained alongside the codebase;
update it in the same PR as any structural change.*
