# Security Audit — 2026-08-24

Scope: all 99 PHP files in `api/**`, `middleware.ts`, Next.js route handlers, client auth layer
(`src/lib/hostingerApi.ts`). Each finding states **what / why it happened / why it matters /
fix or recommendation**.

## A. Authentication & sessions — ✅ SOUND

- Session tokens are 32 random bytes, stored **only as SHA-256 hashes** (`api/auth/session.php`);
  a DB leak does not leak usable sessions.
- Cookies: HttpOnly + SameSite=Lax (configurable), Secure auto-detected incl. `X-Forwarded-Proto`;
  `SameSite=None` is downgraded to Lax when not HTTPS.
- Idle timeout: sessions expire after `SESSION_IDLE_HOURS` (default 2h) of inactivity; every
  authenticated request bumps `last_active_at` (best-effort, failure-tolerant).
- Bearer tokens accepted for non-browser clients; CSRF is deliberately skipped for them because
  the header is not browser-auto-attached (documented in `require_csrf_token()`).
- Login: rate-limited per-IP (10/15min) AND per-email (5/15min) with `failOpen=false`, generic
  error messages (no user enumeration), `password_needs_rehash()` upgrade path, TOTP 2FA via
  single-use 5-minute challenge token — credentials alone never yield a session for 2FA accounts.

## B. Authorization — ✅ SOUND

Enumerated every endpoint accepting POST/PUT/DELETE (`require_method(... 'POST' ...)`):

| Endpoint class | Guard |
|---|---|
| CMS writes (`articles/save|delete|review|lock`, categories/tags/series save+delete, media upload/delete, ads, homepage-slots, navigation-save, redirects-save/delete, site-settings, jobs, authors, newsletters, comments moderation) | `require_roles([...])` + `require_csrf_token()` |
| Reader writes (bookmarks/toggle, comments/save, points, referrals) | session check where needed + CSRF for cookie-auth + rate limits |
| Public by design | login/register/2fa/forgot/reset/verify/resend, newsletter subscribe/unsubscribe (token), analytics collect (rate-limited), cron (CRON_KEY) |

Role gates distinguish admin/editor vs author vs contributor server-side (e.g. contributors
cannot set priority/sponsor/SEO fields — issues #41/#42 gating in `articles/save.php`; owners-only
edit rule at save.php:30). Role checks always re-read roles from the DB per request — no stale
role caching. ✅

## C. CSRF — ✅ SOUND (one hardening fix applied)

- Token stored on the `user_sessions` row, delivered via `GET /api/csrf-token.php`
  (no-store), required on all cookie-authenticated state-changing requests.
- **FIXED (F4):** comparison now uses `hash_equals()` (was `!==`) in `api/helpers.php`.

## D. Injection — ✅ SOUND

- All SQL uses PDO prepared statements (`ATTR_EMULATE_PREPARES => false` → real prepares).
- Grep-verified: zero occurrences of request superglobals interpolated into SQL strings.
- Dynamic identifier construction avoided; the only dynamic SQL fragments are integer-cast ID
  lists (`implode(',', array_map(fn($r)=>(int)$r['id'], ...))` in publish-scheduled.php).
- Redirect targets from the redirects table are validated to be paths before use in middleware;
  canonical URLs validated against allow-listed origins (`canonical_url_allowed()`).

## E. XSS — ✅ SOUND

- Single render path for CMS-controlled HTML: `sanitizeArticleHtml()` (deterministic regex
  pipeline, entity-decode-aware protocol blocking, on* handler strip, dangerous tag removal,
  two-pass execution). Same output server/client → no hydration mismatch.
- JSON-LD serialized via `serializeJsonLd()` escaping `< > & U+2028 U+2029` → script-tag escape
  impossible even with hostile headline values.
- React escapes everything else by default; the only `dangerouslySetInnerHTML` sites are the two
  above plus the shadcn chart component (static CSS, no user data).
- CSP in production (`next.config.mjs`): default-src 'self'; script-src self+inline+accounts.google;
  frame-ancestors 'self'; object-src 'none'. Dev exempted for HMR.

## F. File uploads / media — ✅ SOUND (spot-verified)

`api/media/upload.php`: role-gated, CSRF-checked, per-user/per-day/per-IP rate limits, storage
quota per user, megapixel cap (`UPLOAD_MAX_MEGAPIXELS`) against decompression bombs, MIME/extension
allow-list, hashed filenames under `UPLOAD_BASE_DIR`. Delete requires ownership/staff.

## G. Secrets & configuration — ⚠️ OPERATOR ACTION

- `.gitignore` correctly excludes `.env*` (except example) and `*.sql` dumps; pass-1 removed the
  committed dump from tracking.
- The local working `.env` contains **real-looking production credentials** (Hostinger DB user/
  password, Google OAuth secret, SETUP_KEY, Supabase anon key). It is not in git, but anyone with
  this machine/filesystem access has prod DB access.
  **Recommendation:** rotate DB password + OAuth secret + SETUP_KEY; store env secrets in a
  manager (or at minimum keep this file out of any backup/sync that leaves the machine); add
  gitleaks pre-commit.

## H. Rate limiting & abuse controls — ✅ SOUND

Central `rate_limit(key, max, window, failOpen)` over a DB counter table; applied to login
(IP+email), registration, password resets, comment posting (5/5min per IP), AI assist
(minute/hour/day + global circuit breaker, configurable), analytics collection, newsletter,
uploads. Cron cleanup prunes counters. Analytics IPs stored as HMAC-SHA256 pseudonyms with a
dedicated secret (`ANALYTICS_IP_HASH_SECRET`). ✅
