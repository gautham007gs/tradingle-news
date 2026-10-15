# Infrastructure & Configuration Audit — 2026-08-24

Scope: root configs, deploy artifacts, CI, dependencies, public/ edge files.

## Deployment model (verified consistent across artifacts)

1. **Apache (Hostinger) is the edge**: `public/.htaccess` forces HTTPS for the production host,
   serves physically-existing static files directly, leaves `/api/*` and `/uploads/*` to PHP,
   and proxies everything else via `[P]` to the Next.js standalone server on `127.0.0.1:3000`
   (pass-1 C4/C5 resolution verified intact).
2. **Next.js standalone** (`output: 'standalone'`) renders all reader pages; rewrites `/api/*`
   to the PHP base in dev (`API_PROXY_TARGET`).
3. **Middleware** (`middleware.ts`, single instance at repo root — pass-1 H3 verified) handles
   DB-driven redirects (60s cache, 2.5s bounded refresh, fail-open) and maintenance 503s.
4. **Cron**: Hostinger scheduler → `api/cron/publish-scheduled.php` + `cleanup-logs.php`,
   Bearer/GET-key auth with `hash_equals`, heartbeats visible in admin cron-health view.

## Config files reviewed

| File | Status |
|---|---|
| `package.json` | Scripts complete; deps pinned to caret ranges; vitest/eslint/tsc all green |
| `next.config.mjs` | standalone output; prod CSP; security headers; immutable caching for `_next/static` + `/assets`; images remote pattern https:** (broad but acceptable for CMS-hosted imagery); compress on |
| `tsconfig.json` | strict:false / noImplicitAny:false — legacy leniency; noted, not changed mid-audit to avoid a wave of type errors; path alias `@/*` maps src/components/lib |
| `eslint.config.js` | flat config incl. react-hooks rules — functioning (31 warnings, 0 errors) |
| `.env.example` | Comprehensive and documented; matches every env var consumed in code (spot-checked DB_*, SESSION_*, AI_*, UPLOAD_*, REVALIDATE_SECRET, CRON_KEY, API_SECRET_KEY, CANONICAL_ALLOWED_ORIGINS) |
| `.gitignore` | Covers .env*, *.sql dumps, tsbuildinfo, node_modules, .next; migration DDL whitelisted |
| `api/.htaccess` | **FIXED this pass (F1)** — HTML comment replaced with Apache comment; also -Indexes, deny env/sql/log, gzip for JSON/XML |
| `public/.htaccess` | Sound (see above); long-lived cache rules; no-cache for HTML/php |
| `public/index.php` | Graceful 503 fallback shell (noindex), never primary router |
| `.github/workflows/ci.yml` | Node 22 (EOL-aware per issue #129), full check matrix incl. prod-dependency audit and sitemap integrity |
| `components.json`, `postcss.config.js`, `tailwind.config.ts` | Standard shadcn/Tailwind v3 setup; no issues |

## Dependencies

- `npm audit --omit=dev --audit-level=high` runs in CI; lockfile regenerated against the live
  registry in pass 1 (H2 fix verified — no dead registry URLs).
- React 19 + Next 15.5 + TanStack Query v5 + Tailwind v3: mutually compatible versions.
- `php` runtime target 8.2 (CI) vs local CLI 8.5 — code avoids deprecated constructs
  (spot-checked dynamic properties, null passing into str_* functions).

## Findings

### F5. `$`-in-path build corruption — environment-only (see MASTER §2 F5)
Not a config defect; documented so future operators don't chase it.

### Recommendation (carried)
Add a pre-commit secret scanner (gitleaks) and rotate the credentials present in the local
`.env` (see SECURITY §G). No blocking infra issues found in this pass.
