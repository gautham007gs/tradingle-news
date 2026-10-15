# Backend (PHP) Audit — 2026-08-24

Scope: every file under `api/**` plus `database/**`. All 99 files pass `php -l`.
Architecture: procedural PHP 8.2+, strict_types everywhere, PDO/MySQL, no framework.

## Subsystem map (for AI navigators)

| Path | Responsibility |
|---|---|
| `api/bootstrap.php` | single entry include: env load, session start (strict mode), CORS, header validation, security headers, OPTIONS short-circuit |
| `api/config.php`, `.env` loading | `env_value()` accessor; project-root or `api/.env`; production-safe defaults |
| `api/db.php` | lazy PDO singleton; TLS options (`DB_SSL_CA/CERT/KEY/VERIFY`); errors never leak details outside local env |
| `api/helpers.php` (~1145 lines) | JSON responses, security headers, CSRF, rate limiting, file cache (`cache_get/set/delete`), revalidation webhook + logging table, cron heartbeats, schema self-upgrades, tag/category helpers, canonical allow-list |
| `api/auth/*` | login, login-2fa, register (+email verification), forgot/reset password, Google OAuth start/callback, logout, sessions revoke, TOTP setup/enable/disable, account_helpers (mail, tokens, TOTP) |
| `api/articles/*` | save (full lifecycle incl. revisions, locks, scheduling), list/show, delete, review queue transitions, live-updates, revisions, drafts autosave (`api/drafts_*.php`) |
| `api/admin/*` | dashboard stats, authors, comments moderation, jobs board, newsletters admin, ads, homepage curation, navigation save, redirects CRUD, sitemap status, cron health, error-log viewer, AI assist proxy, toggle-role, revoke-sessions |
| `api/cron/*` | publish-scheduled (transactional, `FOR UPDATE`), cleanup-logs (30d logs, revision pruning keep-20, stale drafts/sessions/locks, analytics retention) — both heartbeat to `cron_health` and require `CRON_KEY` via `hash_equals()` |
| `api/sitemap/*`, `api/homepage.php`, `api/navigation.php`, `api/site-settings.php` | public read endpoints consumed by Next.js ISR; taxonomy slugs for sitemaps |
| `api/setup/*` | one-time admin bootstrap (form + JSON), locked by SETUP_KEY + refuse-if-admin-exists + ALLOW_ADMIN_RERUN |
| `api/article_policy.php` | shared publishability hard-blocks (meta description, alt text, author, category, canonical origin) used by save AND review AND schedule paths |

## Patterns verified sound

1. **Write-path transactionality** — multi-table writes wrapped in beginTransaction/commit/
   rollBack with json_error on catch (save.php, create-admin.php, publish-scheduled.php).
2. **Concurrent-edit safety** — document lock columns checked against `UTC_TIMESTAMP()` inside
   the DB (timezone-drift-proof); save returns HTTP 423 when another editor holds the lock.
3. **Schema self-migration** — idempotent `CREATE TABLE IF NOT EXISTS` / defensive ALTERs
   (`ensure_cms_schema_upgrades()`) run once per request at write endpoints; failures logged,
   never fatal. Mirrors pass-2 recommendation; `cron_health`, `audit_logs`, `tag_categories`,
   `cache_invalidation_log`, revision `content_hash` all present now.
4. **ISR invalidation** — centralized `invalidate_article_cache()` fires after commit in save /
   delete / review / scheduled-publish so every path clears identical tags.
5. **Publish-time hard blocks** enforced server-side (`assert_publishable`) — a scripted client
   cannot bypass CMS UI validation (SEO rule 10).
6. **Cron correctness** — `SELECT ... FOR UPDATE` prevents double-publish on overlapping crons;
   heartbeats recorded with error detail; success heartbeat written only after commit.
   *Minor note:* publish-scheduled writes an initial success heartbeat before work begins, so a
   hard crash mid-run would leave `last_success_at` slightly optimistic. Cosmetic only — the
   trailing heartbeat + error path are authoritative.
7. **Caching** — homepage payload cached 60s via temp-file cache with flock; invalidated on
   publish/curation saves (pass-1 M1 fix verified still in place).

## Issues found this pass

### F1. `api/.htaccess` HTML comment → **FIXED** (see MASTER §2 F1)
Would have caused HTTP 500 on all API routes under Apache.

### F4. CSRF comparison timing-safety → **FIXED** (see MASTER §2 F4)

## Observations (no action required)

- `csrf-token.php` issues ephemeral tokens to unauthenticated callers that can never validate;
  harmless (all guarded endpoints also require auth) but could be tightened later to 403 guests.
- `db-health-check.php` and `error-log.php` correctly use role guards after pass-1 C1 fix.
- Legacy PHP sitemap/RSS generators remain as fallbacks aligned with the same settings window;
  Next.js route handlers are authoritative (pass-1 H1 resolution holds).
