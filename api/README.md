# `api/` — PHP Backend (CMS API)

Procedural PHP 8.2+ (`declare(strict_types=1)` in every file), no framework.
Deployed to Hostinger at `tradingle.com/api` — **file paths here are public URL paths**
(`/api/<folder>/<file>.php`); never rename an endpoint without updating every client.

## Layout

| Path | Purpose |
|---|---|
| `bootstrap.php` | Single entry include for every endpoint (env, session, CORS, security headers) |
| `config.php`, `db.php` | Env access + lazy PDO singleton (utf8mb4, real prepares, optional TLS) |
| `helpers.php` | Shared kernel: JSON responses, CSRF, rate limiting, cache, revalidation webhook, audit log, schema self-upgrades (`ensure_cms_schema_upgrades`) |
| `article_policy.php` | Server-side publishability hard-blocks shared by save/review/schedule |
| `<resource>/list.php · show.php · save.php · delete.php` | One folder per resource; verbs are files |
| `auth/` | Sessions (hashed tokens), OAuth, TOTP 2FA, account lifecycle |
| `admin/` | Staff-only management endpoints (roles enforced via `require_roles()`) |
| `cron/` | Scheduler targets (`CRON_KEY`-guarded, heartbeat to `cron_health`) |
| `setup/` | One-time admin bootstrap (SETUP_KEY + refuse-once-admin-exists) |

## Rules for new endpoints

1. Order: strict_types → bootstrap → `require_method()` → auth → CSRF → rate limit → validate → transaction → `json_response()`.
2. Use `safe_rollback($pdo)` in catch blocks — bare `rollBack()` after a committed transaction throws a second fatal.
3. Never put DDL inside a transaction (implicit commit). Schema changes go through `ensure_cms_schema_upgrades()` / `ensure_column()` in `helpers.php`.
