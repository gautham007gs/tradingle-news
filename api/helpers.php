<?php
declare(strict_types=1);

function send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_filter(array_map('trim', explode(',', env_value('CORS_ORIGINS', FRONTEND_URL) ?? '')));

    if ($origin && (in_array($origin, $allowed, true) || (defined('APP_ENV') && APP_ENV !== 'production' && in_array('*', $allowed, true)))) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    } elseif (APP_ENV === 'local') {
        // Local dev: restrict to known localhost ports — never wildcard
        $localAllowed = [
            'http://localhost:3000', 'http://localhost:5000', 'http://localhost:8080',
            'http://127.0.0.1:3000', 'http://127.0.0.1:5000', 'http://127.0.0.1:8080',
        ];
        if ($origin && in_array($origin, $localAllowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        } else {
            header('Access-Control-Allow-Origin: http://localhost:3000');
        }
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

function set_security_headers(): void
{
    // Prevent MIME type sniffing
    header('X-Content-Type-Options: nosniff');
    
    // Prevent clickjacking
    header('X-Frame-Options: SAMEORIGIN');
    
    // Enable XSS protection (legacy browser support)
    header('X-XSS-Protection: 1; mode=block');
    
    // Referrer policy
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // Permissions policy
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    
    // Only set Strict-Transport-Security in production
    if (APP_ENV === 'production') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400, ?string $detail = null): never
{
    $payload = ['error' => $message];
    if ($detail !== null) {
        $payload['detail'] = $detail;
    }
    json_response($payload, $status);
}

/**
 * Roll back only if a transaction is still active.
 *
 * Calling rollBack() after the transaction has already committed (or after a
 * connection drop) throws a second PDOException ("There is no active
 * transaction") from inside the catch block. That second exception is uncaught
 * and surfaces as an empty HTTP 500 — even when the database work itself
 * SUCCEEDED. This exact bug made every article save return 500 on production
 * while the article was actually created (see audits MASTER §2 F6).
 */
function safe_rollback(PDO $pdo): void
{
    try {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
    } catch (Throwable $e) {
        error_log('safe_rollback failed: ' . $e->getMessage());
    }
}

/**
 * Add a column to a table only if it does not already exist. MySQL (unlike
 * MariaDB) has no "ADD COLUMN IF NOT EXISTS", so we check information_schema
 * first and wrap the ALTER defensively — a race or permission failure must
 * never break the request that triggered the upgrade check.
 */
function ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    static $checked = [];
    $key = "{$table}.{$column}";
    if (isset($checked[$key])) {
        return;
    }
    $checked[$key] = true;
    try {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute([$table, $column]);
        if ((int) $stmt->fetchColumn() === 0) {
            if (!preg_match('/^[a-z0-9_]+$/i', $table) || !preg_match('/^[a-z0-9_]+$/i', $column)) {
                return; // refuse unexpected identifiers
            }
            $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
            error_log("ensure_column added {$key}");
        }
    } catch (Throwable $e) {
        error_log("ensure_column({$key}) skipped: " . $e->getMessage());
    }
}

function require_method(string ...$methods): void
{
    $allowed = array_map('strtoupper', $methods);
    if (!in_array(strtoupper($_SERVER['REQUEST_METHOD']), $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        json_error('Method not allowed.', 405);
    }
}

function input_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function slugify_php(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/i', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : bin2hex(random_bytes(4));
}

function public_user(array $user, array $roles = []): array
{
    return [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'display_name' => $user['display_name'],
        'slug' => $user['slug'],
        'avatar_url' => $user['avatar_url'] ?? null,
        'bio' => $user['bio'] ?? null,
        'role_title' => $user['role_title'] ?? null,
        'points' => (int) ($user['points'] ?? 0),
        'total_points_earned' => (int) ($user['total_points_earned'] ?? 0),
        'roles' => $roles,
        'email_verified' => !empty($user['email_verified_at']),
        'totp_enabled' => !empty($user['totp_enabled']),
    ];
}

function has_any_role(array $roles, array $allowed): bool
{
    return count(array_intersect($roles, $allowed)) > 0;
}

// ============ SECURITY FUNCTIONS ============

// Minimum password length constant
const MIN_PASSWORD_LENGTH = 8;

// Request validation
function validate_request_headers(): void
{
    // Validate Content-Type for POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isJson = strpos($contentType, 'application/json') === 0;
        $isMultipart = strpos($contentType, 'multipart/form-data') === 0;
        if (!$isJson && !$isMultipart && $contentType !== '') {
            json_error('Invalid Content-Type. Expected application/json or multipart/form-data', 400);
        }
    }

    // Limit request payload size (10MB max)
    $maxSize = 10 * 1024 * 1024;
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > $maxSize) {
        json_error('Payload too large. Maximum size is 10MB.', 413);
    }

    // Issue #100: Enforce internal API trust boundary using API_SECRET_KEY
    if (defined('API_SECRET_KEY') && API_SECRET_KEY !== '') {
        $headers = getallheaders();
        $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? '';
        
        // If the X-API-Key is valid, we trust the caller (e.g. Next.js server)
        if ($apiKey !== '' && hash_equals(API_SECRET_KEY, $apiKey)) {
            return;
        }

        // If not authenticated via X-API-Key, check if they have a valid user session
        $hasSession = false;
        try {
            if (function_exists('current_user') && current_user() !== null) {
                $hasSession = true;
            }
        } catch (Throwable) {
            $hasSession = false;
        }

        if (!$hasSession) {
            // Allow public browser/guest actions without API key or session
            $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
            $publicEndpoints = [
                '/api/auth/login.php',
                '/api/auth/register.php',
                '/api/auth/forgot-password.php',
                '/api/auth/reset-password.php',
                '/api/auth/google-callback.php',
                '/api/analytics/collect.php',
                '/api/newsletters/subscribe.php',
                '/api/newsletters/unsubscribe.php',
                '/api/referrals.php',
                '/api/csrf-token.php',
            ];
            
            $isPublic = false;
            foreach ($publicEndpoints as $endpoint) {
                if (str_ends_with($scriptName, $endpoint)) {
                    $isPublic = true;
                    break;
                }
            }
            
            if (!$isPublic) {
                json_error('Unauthorized: Invalid API Key or session.', 401);
            }
        }
    }
}

// Rate limiting — DB-backed per-IP counter (works across PHP processes/workers)
function rate_limit(string $key, int $maxRequests = 10, int $windowSeconds = 60, bool $failOpen = true): bool
{
    try {
        $pdo = db();
        // Ensure rate_limit table exists (idempotent)
        $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limit_counters (
            id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            bucket_key  VARCHAR(128)    NOT NULL,
            count       INT UNSIGNED    NOT NULL DEFAULT 1,
            window_start DATETIME       NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_rl_bucket (bucket_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $now = gmdate('Y-m-d H:i:s');

        // Atomic upsert: reset window if expired, otherwise increment
        $pdo->prepare("
            INSERT INTO rate_limit_counters (bucket_key, count, window_start)
            VALUES (?, 1, ?)
            ON DUPLICATE KEY UPDATE
                count        = IF(TIMESTAMPDIFF(SECOND, window_start, UTC_TIMESTAMP()) >= ?, 1, count + 1),
                window_start = IF(TIMESTAMPDIFF(SECOND, window_start, UTC_TIMESTAMP()) >= ?, UTC_TIMESTAMP(), window_start)
        ")->execute([$key, $now, $windowSeconds, $windowSeconds]);

        $stmt = $pdo->prepare('SELECT count FROM rate_limit_counters WHERE bucket_key = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        return $row && ((int) $row['count']) <= $maxRequests;
    } catch (Throwable) {
        // If DB is unavailable, fail open (allow the request) unless $failOpen is false
        return $failOpen;
    }
}

// Get client IP address for rate limiting.
// Security notes:
//   - HTTP_CLIENT_IP is non-standard and trivially spoofable — we never use it.
//   - X-Forwarded-For is only trusted when REMOTE_ADDR is a private/loopback
//     address, which indicates a trusted reverse proxy sits in front of us.
//     We take the leftmost public IP in that header (the one the proxy appended
//     first) to prevent clients from injecting fake IPs on the left.
function get_client_ip(): string
{
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    $xForwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($xForwardedFor !== '') {
        // Only trust XFF when the direct peer is a private/loopback address
        $behindProxy = !filter_var(
            $remoteAddr,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
        if ($behindProxy) {
            // Use the RIGHTMOST public IP, not the leftmost.
            // In append-mode proxy chains (the most common setup), each proxy
            // appends the address it received the connection from. The leftmost
            // entries are client-supplied and can be spoofed; the rightmost
            // entry was written by the first trusted proxy and cannot be forged
            // by a remote client. Iterating from right-to-left gives us the
            // most trustworthy public-IP entry.
            $ips = array_reverse(array_map('trim', explode(',', $xForwardedFor)));
            foreach ($ips as $ip) {
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
    }

    return $remoteAddr;
}

/**
 * Short-TTL key/value cache backed by a temp file (no APCu/Redis dependency,
 * portable across Hostinger shared hosting). Protects public endpoints from
 * hitting the remote MySQL DB on every anonymous page view.
 *
 * Returns the cached value on a fresh hit, or null on miss/expiry.
 */
function cache_get(string $key, int $ttlSeconds): mixed
{
    $file = sys_get_temp_dir() . '/trd_cache_' . md5($key) . '.json';
    if (!is_readable($file)) {
        return null;
    }

    $handle = fopen($file, 'rb');
    if (!$handle) {
        return null;
    }
    try {
        if (!flock($handle, LOCK_SH)) {
            return null;
        }
        $raw = stream_get_contents($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }
    if ($raw === false || $raw === '') {
        return null;
    }

    $payload = json_decode($raw, true);
    if (!is_array($payload) || !array_key_exists('expires_at', $payload) || !array_key_exists('data', $payload)) {
        return null;
    }
    if ((int) $payload['expires_at'] < time()) {
        return null;
    }
    return $payload['data'];
}

/**
 * Store a value in the temp-file cache.
 */
function cache_set(string $key, mixed $value, int $ttlSeconds): void
{
    $file = sys_get_temp_dir() . '/trd_cache_' . md5($key) . '.json';
    $payload = json_encode(
        ['expires_at' => time() + $ttlSeconds, 'data' => $value],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    if ($payload === false) {
        return;
    }

    $handle = fopen($file, 'wb');
    if (!$handle) {
        return;
    }
    try {
        if (flock($handle, LOCK_EX)) {
            ftruncate($handle, 0);
            fwrite($handle, $payload);
            flock($handle, LOCK_UN);
        }
    } finally {
        fclose($handle);
    }
}

/**
 * Delete a single cache key.
 */
function cache_delete(string $key): void
{
    $file = sys_get_temp_dir() . '/trd_cache_' . md5($key) . '.json';
    if (is_file($file)) {
        @unlink($file);
    }
}

// CSRF token generation and validation
function generate_csrf_token(): string
{
    return bin2hex(random_bytes(32));
}

function get_csrf_token(): ?string
{
    $user = current_user();
    if (!$user) {
        return null;
    }

    $userId = (int) $user['id'];
    $pdo = db();
    
    $stmt = $pdo->prepare(
        'SELECT csrf_token FROM user_sessions 
         WHERE user_id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() 
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$userId]);
    $session = $stmt->fetch();
    
    return $session ? $session['csrf_token'] : null;
}

function set_csrf_token(int $userId, string $token): void
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'UPDATE user_sessions SET csrf_token = ? 
         WHERE user_id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()'
    );
    $stmt->execute([$token, $userId]);
}

function require_csrf_token(): void
{
    $user = current_user();
    if (!$user) {
        json_error('Authentication required.', 401);
    }

    // Requests authenticated with an explicit Bearer session token are not vulnerable
    // to browser-driven CSRF in the same way cookies are, because the token is added
    // by our app code and is not sent automatically by the browser.
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($auth, 'Bearer ') === 0) {
        return;
    }

    // Get CSRF token from request header or body
    $token = null;
    
    // Check header first (preferred)
    if (!empty($_SERVER['HTTP_X_CSRF_TOKEN'])) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
    } else {
        // Fallback to body
        $input = input_json();
        $token = $input['csrf_token'] ?? null;
    }

    if (!$token) {
        json_error('CSRF token required.', 400);
    }

    $sessionToken = get_csrf_token();
    if (!$sessionToken || !hash_equals($sessionToken, (string) $token)) {
        json_error('Invalid CSRF token.', 403);
    }
}

/**
 * Notify Next.js to revalidate ISR cache after publish/update/delete.
 * Requires REVALIDATE_SECRET and NEXTJS_URL in api/.env
 * Logs outcome to cache_invalidation_log (best-effort) so failed revalidations
 * are visible instead of silently disappearing.
 */
function notify_nextjs_revalidate(array $payload): void
{
    $secret = env_value('REVALIDATE_SECRET', '');
    $nextjsUrl = rtrim((string) env_value('NEXTJS_URL', FRONTEND_URL), '/');
    if ($secret === '' || $nextjsUrl === '') {
        log_cache_invalidation($payload, 'skipped', 0, 'REVALIDATE_SECRET or NEXTJS_URL not configured');
        return;
    }

    $ch = curl_init("{$nextjsUrl}/api/revalidate");
    if ($ch === false) {
        log_cache_invalidation($payload, 'error', 0, 'curl_init failed');
        return;
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "x-webhook-secret: {$secret}",
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '') {
        log_cache_invalidation($payload, 'error', $httpCode, $curlError ?: 'No response from Next.js revalidate endpoint');
    } elseif ($httpCode >= 400) {
        log_cache_invalidation($payload, 'error', $httpCode, is_string($response) ? substr($response, 0, 500) : null);
    } else {
        log_cache_invalidation($payload, 'ok', $httpCode, null);
    }
}

/**
 * Best-effort audit trail for ISR revalidation calls. Never throws — a logging
 * failure must not break the publish/save flow that triggered it.
 */
function log_cache_invalidation(array $payload, string $outcome, int $httpCode, ?string $detail): void
{
    try {
        $pdo = db();
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cache_invalidation_log (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                event VARCHAR(40) NULL,
                article_slug VARCHAR(255) NULL,
                category_slug VARCHAR(255) NULL,
                author_slug VARCHAR(255) NULL,
                outcome VARCHAR(20) NOT NULL,
                http_code SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                detail VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_cache_invalidation_outcome (outcome, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        $pdo->prepare(
            'INSERT INTO cache_invalidation_log (event, article_slug, category_slug, author_slug, outcome, http_code, detail)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $payload['event'] ?? null,
            $payload['articleSlug'] ?? null,
            $payload['categorySlug'] ?? null,
            $payload['authorSlug'] ?? null,
            $outcome,
            $httpCode,
            $detail,
        ]);
    } catch (Throwable $e) {
        error_log('Cache invalidation logging failed: ' . $e->getMessage());
    }
}

/**
 * Normalize a tag/category name for comparison and storage: trim, collapse
 * internal whitespace. Keeps casing as typed for display (slug handles case).
 */
function normalize_label(string $value): string
{
    return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
}

/**
 * Walk categories.parent_id upward from $categoryId and return the full
 * ancestor chain including $categoryId itself (root last is not included
 * unless it's an ancestor). Guards against cycles with a visited set.
 */
function category_ancestor_ids(PDO $pdo, int $categoryId): array
{
    $chain = [];
    $visited = [];
    $current = $categoryId;
    $stmt = $pdo->prepare('SELECT id, parent_id FROM categories WHERE id = ? LIMIT 1');
    while ($current > 0 && !isset($visited[$current])) {
        $visited[$current] = true;
        $chain[] = $current;
        $stmt->execute([$current]);
        $row = $stmt->fetch();
        if (!$row || $row['parent_id'] === null) {
            break;
        }
        $current = (int) $row['parent_id'];
    }
    return $chain;
}

/**
 * Return direct + indirect descendant category ids for $categoryId (children,
 * grandchildren, ...). Guards against cycles/runaway depth.
 */
function category_descendant_ids(PDO $pdo, int $categoryId): array
{
    $descendants = [];
    $frontier = [$categoryId];
    $visited = [$categoryId => true];
    $depth = 0;
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE parent_id = ?');
    while ($frontier && $depth < 10) {
        $next = [];
        foreach ($frontier as $parentId) {
            $stmt->execute([$parentId]);
            foreach ($stmt->fetchAll() as $row) {
                $childId = (int) $row['id'];
                if (!isset($visited[$childId])) {
                    $visited[$childId] = true;
                    $descendants[] = $childId;
                    $next[] = $childId;
                }
            }
        }
        $frontier = $next;
        $depth++;
    }
    return $descendants;
}

/**
 * Dead man's switch for scheduled cron jobs. Call once at the start of a cron
 * script (error = null) and once more at the end (error = null on success, or
 * the exception message on failure). An admin health check can then alert if
 * last_success_at is stale — catching a silently-broken cron trigger.
 */
function record_cron_heartbeat(PDO $pdo, string $jobName, ?string $error): void
{
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cron_health (
                job_name VARCHAR(80) NOT NULL,
                last_run_at TIMESTAMP NULL,
                last_success_at TIMESTAMP NULL,
                last_error VARCHAR(500) NULL,
                run_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (job_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        if ($error === null) {
            $pdo->prepare(
                'INSERT INTO cron_health (job_name, last_run_at, last_success_at, last_error, run_count)
                 VALUES (?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), NULL, 1)
                 ON DUPLICATE KEY UPDATE last_run_at = UTC_TIMESTAMP(), last_success_at = UTC_TIMESTAMP(), last_error = NULL, run_count = run_count + 1'
            )->execute([$jobName]);
        } else {
            $pdo->prepare(
                'INSERT INTO cron_health (job_name, last_run_at, last_success_at, last_error, run_count)
                 VALUES (?, UTC_TIMESTAMP(), NULL, ?, 1)
                 ON DUPLICATE KEY UPDATE last_run_at = UTC_TIMESTAMP(), last_error = ?, run_count = run_count + 1'
            )->execute([$jobName, substr($error, 0, 500), substr($error, 0, 500)]);
        }
    } catch (Throwable $e) {
        error_log('record_cron_heartbeat failed: ' . $e->getMessage());
    }
}

/**
 * Idempotent schema upgrades run defensively at the top of write endpoints.
 * Mirrors the existing codebase convention (see article_revisions,
 * article_categories) of embedding CREATE TABLE IF NOT EXISTS / ALTER TABLE
 * directly in PHP so the schema self-migrates on first request after deploy.
 * Every statement is wrapped so a failure (e.g. index already exists on an
 * older MySQL without "IF NOT EXISTS" support) never blocks the request.
 */
function ensure_cms_schema_upgrades(PDO $pdo): void
{
    static $ran = false;
    if ($ran) {
        return;
    }
    $ran = true;

    // ── Column-level upgrades (MySQL has no ADD COLUMN IF NOT EXISTS, so each
    // is checked via information_schema first). These columns are referenced
    // by newer code paths; a DB created from an older dump lacks them and any
    // write touching them fatals with "Unknown column" (audit finding F7).
    ensure_column($pdo, 'user_sessions', 'last_active_at', 'TIMESTAMP NULL AFTER expires_at');
    ensure_column($pdo, 'user_sessions', 'csrf_token', 'VARCHAR(64) NULL AFTER user_agent');
    ensure_column($pdo, 'users', 'totp_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensure_column($pdo, 'users', 'totp_secret', 'VARCHAR(255) NULL');
    ensure_column($pdo, 'users', 'last_login_at', 'TIMESTAMP NULL');
    ensure_column($pdo, 'users', 'email_verified_at', 'TIMESTAMP NULL');
    ensure_column($pdo, 'articles', 'subtitle', 'VARCHAR(255) NULL AFTER title');
    ensure_column($pdo, 'articles', 'robots_noarchive', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensure_column($pdo, 'articles', 'content_type', "VARCHAR(40) NOT NULL DEFAULT 'breaking_news'");
    ensure_column($pdo, 'articles', 'google_news_exclude', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensure_column($pdo, 'articles', 'location_country', 'VARCHAR(80) NULL');
    ensure_column($pdo, 'articles', 'location_state', 'VARCHAR(80) NULL');
    ensure_column($pdo, 'articles', 'location_city', 'VARCHAR(80) NULL');
    ensure_column($pdo, 'articles', 'evergreen_audit_date', 'DATE NULL');
    ensure_column($pdo, 'articles', 'audience', "VARCHAR(30) NOT NULL DEFAULT 'general'");
    ensure_column($pdo, 'articles', 'series_id', 'BIGINT UNSIGNED NULL');
    ensure_column($pdo, 'articles', 'correction_note', 'TEXT NULL');
    ensure_column($pdo, 'articles', 'lock_held_by', 'BIGINT UNSIGNED NULL');
    ensure_column($pdo, 'articles', 'lock_expires_at', 'TIMESTAMP NULL');

    // Issue #121: Create audit_logs table
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS audit_logs (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT NOT NULL,
                before_data LONGTEXT NULL,
                after_data LONGTEXT NULL,
                ip_address VARCHAR(45) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_audit_logs_action (action),
                INDEX idx_audit_logs_user (user_id),
                INDEX idx_audit_logs_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades audit_logs: ' . $e->getMessage());
    }

    // Tag ↔ category relevance map. A tag with zero rows here is "global"
    // (usable under any category) — this preserves existing tag behavior.
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS tag_categories (
                tag_id BIGINT UNSIGNED NOT NULL,
                category_id BIGINT UNSIGNED NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (tag_id, category_id),
                INDEX idx_tag_categories_category (category_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades tag_categories: ' . $e->getMessage());
    }

    // Dead man's switch for scheduled cron jobs (publish-scheduled.php etc).
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cron_health (
                job_name VARCHAR(80) NOT NULL,
                last_run_at TIMESTAMP NULL,
                last_success_at TIMESTAMP NULL,
                last_error VARCHAR(500) NULL,
                run_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (job_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades cron_health: ' . $e->getMessage());
    }

    // article_categories: secondary/secondary-category mapping table. Created
    // here because in-transaction DDL implicitly commits in MySQL.
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS article_categories (
                article_id BIGINT UNSIGNED NOT NULL,
                category_id BIGINT UNSIGNED NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (article_id, category_id),
                INDEX idx_article_categories_category (category_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades article_categories: ' . $e->getMessage());
    }

    // article_revisions: full-row snapshots powering the editor's revision
    // history. Created here (not inside save.php's transaction — DDL in a
    // transaction implicitly commits in MySQL and broke save atomicity).
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS article_revisions (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                article_id BIGINT UNSIGNED NOT NULL,
                editor_id BIGINT UNSIGNED NULL,
                title VARCHAR(255) NOT NULL,
                excerpt TEXT NULL,
                content LONGTEXT NULL,
                status VARCHAR(40) NULL,
                revision_note VARCHAR(255) NULL,
                content_hash VARCHAR(64) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_article_revisions_article (article_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades article_revisions: ' . $e->getMessage());
    }

    // article_revisions: content_hash column lets save.php skip inserting a
    // new revision row when nothing actually changed (stops unbounded bloat).
    try {
        $pdo->exec("ALTER TABLE article_revisions ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64) NULL AFTER revision_note");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades content_hash: ' . $e->getMessage());
    }

    // redirects.article_id existed only in the CREATE TABLE IF NOT EXISTS in
    // save.php — installs where the table pre-dated that never got the column.
    try {
        $pdo->exec("ALTER TABLE redirects ADD COLUMN IF NOT EXISTS article_id BIGINT UNSIGNED NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades redirects.article_id: ' . $e->getMessage());
    }

    // De-duplicate then enforce uniqueness on tags.slug / articles.slug.
    // Duplicates shouldn't exist given app-level checks, but the lack of a DB
    // constraint means a race or manual edit could have created one — dedupe
    // defensively before adding the constraint so the ALTER never fails.
    try {
        dedupe_and_unique_index($pdo, 'tags', 'slug', 'uq_tags_slug', function (PDO $pdo, int $keepId, int $dupeId) {
            $pdo->prepare('UPDATE IGNORE article_tags SET tag_id = ? WHERE tag_id = ?')->execute([$keepId, $dupeId]);
            $pdo->prepare('DELETE FROM article_tags WHERE tag_id = ?')->execute([$dupeId]);
            $pdo->prepare('DELETE FROM tags WHERE id = ?')->execute([$dupeId]);
        });
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades tags.slug unique: ' . $e->getMessage());
    }

    try {
        dedupe_and_unique_index($pdo, 'articles', 'slug', 'uq_articles_slug', function (PDO $pdo, int $keepId, int $dupeId) {
            // Never delete an article automatically — just rename the slug of
            // the newer duplicate so the unique index can be added safely.
            $pdo->prepare("UPDATE articles SET slug = CONCAT(slug, '-dup-', id) WHERE id = ?")->execute([$dupeId]);
        });
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.slug unique: ' . $e->getMessage());
    }

    // ── Taxonomy fields — defensive adds for installs that predate these columns ─
    // subtitle: editorial deck / sub-headline
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.subtitle: ' . $e->getMessage());
    }

    // subcategory_id: second-level category assignment
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS subcategory_id BIGINT UNSIGNED NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.subcategory_id: ' . $e->getMessage());
    }

    // content_type: drives schema auto-selection and Google News behaviour
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) NOT NULL DEFAULT 'breaking_news'");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.content_type: ' . $e->getMessage());
    }

    // google_news_exclude: opt article out of the News RSS / sitemap feed
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS google_news_exclude TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.google_news_exclude: ' . $e->getMessage());
    }

    // robots_noarchive: disallow Google cache copies
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS robots_noarchive TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.robots_noarchive: ' . $e->getMessage());
    }

    // Geographic coverage — adds spatialCoverage to JSON-LD
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS location_country VARCHAR(100) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.location_country: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS location_state VARCHAR(100) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.location_state: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS location_city VARCHAR(100) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.location_city: ' . $e->getMessage());
    }

    // evergreen_audit_date: ISO date for the next content-audit reminder
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS evergreen_audit_date DATE NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.evergreen_audit_date: ' . $e->getMessage());
    }

    // audience: editorial targeting (general | youth | professional | investors | regional)
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS audience VARCHAR(50) NOT NULL DEFAULT 'general'");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.audience: ' . $e->getMessage());
    }

    // ── Story Series — groups ongoing multi-article coverage ──────────────────
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS article_series (
                id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                name        VARCHAR(191) NOT NULL,
                slug        VARCHAR(191) NOT NULL,
                description TEXT NULL,
                image_url   TEXT NULL,
                is_active   TINYINT(1) NOT NULL DEFAULT 1,
                sort_order  INT NOT NULL DEFAULT 0,
                seo_title   VARCHAR(255) NULL,
                seo_description VARCHAR(255) NULL,
                created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_series_slug (slug)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades article_series: ' . $e->getMessage());
    }

    // series_id on articles — links an article into a Story Series
    try {
        $pdo->exec("ALTER TABLE articles ADD COLUMN IF NOT EXISTS series_id BIGINT UNSIGNED NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades articles.series_id: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE articles ADD INDEX IF NOT EXISTS idx_articles_series (series_id)");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades idx_articles_series: ' . $e->getMessage());
    }

    // tags.description — editorial note about what this tag covers
    try {
        $pdo->exec("ALTER TABLE tags ADD COLUMN IF NOT EXISTS description TEXT NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades tags.description: ' . $e->getMessage());
    }

    // ── Category nav/display metadata — previously lived in a local JSON file
    // (data/taxonomy-meta.json) that doesn't survive redeploys on Hostinger.
    // Moved into real columns so it's backed up with everything else. ─────────
    try {
        // Default 1 (visible): matches the existing behavior where a category
        // with no explicit setting shows in nav by default (opt-out, not opt-in).
        $pdo->exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_nav TINYINT(1) NOT NULL DEFAULT 1");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades categories.show_in_nav: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS nav_label VARCHAR(100) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades categories.nav_label: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS nav_order INT NOT NULL DEFAULT 0");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades categories.nav_order: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(20) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades categories.color: ' . $e->getMessage());
    }

    // ── Redirects — table already existed in production with (from_path,
    // to_path, status_code); this just adds article_id for "this redirect
    // exists because this article's slug changed" bookkeeping, and creates
    // the table for anyone starting from a bare schema. ─────────────────────
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS redirects (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                from_path VARCHAR(512) NOT NULL,
                to_path VARCHAR(512) NOT NULL,
                status_code SMALLINT UNSIGNED NOT NULL DEFAULT 301,
                article_id BIGINT UNSIGNED NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_redirect_from (from_path(255)),
                INDEX idx_redirect_article (article_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades redirects table: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE redirects ADD COLUMN IF NOT EXISTS article_id BIGINT UNSIGNED NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades redirects.article_id: ' . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE redirects ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades redirects.is_active: ' . $e->getMessage());
    }

    // newsletters.unsubscribe_token_hash: one-click unsubscribe support
    try {
        $pdo->exec("ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS unsubscribe_token_hash CHAR(64) NULL");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades newsletters.unsubscribe_token_hash: ' . $e->getMessage());
    }

    // Account lifecycle tables (email verification, password resets, 2FA) +
    // users.totp_* columns — idempotent, so this is safe to run every boot.
    try {
        require_once __DIR__ . '/auth/account_helpers.php';
        ensure_account_tables($pdo);
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades account tables: ' . $e->getMessage());
    }

    // Issue #122: error_logs table creation moved from request time
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS error_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message TEXT NOT NULL,
                stack LONGTEXT,
                url VARCHAR(500),
                user_agent VARCHAR(500),
                ip_address VARCHAR(45) NULL,
                severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'error',
                context JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_severity_created (severity, created_at),
                INDEX idx_url (url(255)),
                INDEX idx_ip_created (ip_address, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades error_logs table: ' . $e->getMessage());
    }

    try {
        $pdo->exec("ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) NULL AFTER user_agent");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades error_logs.ip_address: ' . $e->getMessage());
    }

    // Issue #119: Enforce drafts user_id and article_id uniqueness constraint
    try {
        // First deduplicate: find pairs with count > 1 and delete older records
        $dupes = $pdo->query(
            "SELECT user_id, article_id, MAX(id) as keep_id
             FROM drafts
             GROUP BY user_id, article_id
             HAVING COUNT(*) > 1"
        )->fetchAll();
        
        foreach ($dupes as $dupe) {
            $pdo->prepare(
                "DELETE FROM drafts 
                 WHERE user_id = ? AND article_id = ? AND id <> ?"
            )->execute([(int)$dupe['user_id'], (int)$dupe['article_id'], (int)$dupe['keep_id']]);
        }
        
        $pdo->exec("ALTER TABLE drafts ADD UNIQUE KEY uq_drafts_user_article (user_id, article_id)");
    } catch (Throwable $e) {
        // Safe to fail if unique key already exists
    }

    // Issue #104: Add last_active_at to user_sessions for idle timeout support
    try {
        $pdo->exec("ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP NULL DEFAULT NULL");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON user_sessions (last_active_at)");
    } catch (Throwable $e) {
        error_log('ensure_cms_schema_upgrades user_sessions.last_active_at: ' . $e->getMessage());
    }
}

/**
 * Generic helper: find duplicate values of $column in $table, resolve them
 * via $onDuplicate(keepId, dupeId), then add a unique index if not present.
 */
function dedupe_and_unique_index(PDO $pdo, string $table, string $column, string $indexName, callable $onDuplicate): void
{
    $existingIndex = $pdo->query(
        "SELECT COUNT(*) AS cnt FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = " . $pdo->quote($table) . "
           AND index_name = " . $pdo->quote($indexName)
    )->fetch();
    if ($existingIndex && (int) $existingIndex['cnt'] > 0) {
        return;
    }

    $dupes = $pdo->query(
        "SELECT {$column} AS val FROM {$table} GROUP BY {$column} HAVING COUNT(*) > 1"
    )->fetchAll();

    foreach ($dupes as $dupe) {
        $rows = $pdo->prepare("SELECT id FROM {$table} WHERE {$column} = ? ORDER BY id ASC");
        $rows->execute([$dupe['val']]);
        $ids = array_map('intval', array_column($rows->fetchAll(), 'id'));
        if (count($ids) < 2) {
            continue;
        }
        $keepId = $ids[0];
        foreach (array_slice($ids, 1) as $dupeId) {
            $onDuplicate($pdo, $keepId, $dupeId);
        }
    }

    $pdo->exec("ALTER TABLE {$table} ADD UNIQUE KEY {$indexName} ({$column})");
}

/**
 * Validate that a set of tag ids are permitted under a set of category ids
 * (ancestors + descendants included, so a tag scoped to a parent category is
 * still valid on a child article and vice versa). A tag with no rows in
 * tag_categories is unrestricted ("global") and always passes.
 *
 * Returns an array of violations: [['tag_id'=>, 'tag_name'=>, 'allowed'=>[names]], ...]
 * Empty array = all tags are allowed.
 */
function validate_tags_against_categories(PDO $pdo, array $tagIds, array $categoryIds): array
{
    $tagIds = array_values(array_unique(array_filter(array_map('intval', $tagIds))));
    if (!$tagIds) {
        return [];
    }

    // Expand the article's categories to include ancestors + descendants so
    // a tag restricted to "Finance" also works on "Finance > Markets".
    $allowedCategorySet = [];
    foreach (array_filter(array_map('intval', $categoryIds)) as $categoryId) {
        foreach (category_ancestor_ids($pdo, $categoryId) as $ancestorId) {
            $allowedCategorySet[$ancestorId] = true;
        }
        foreach (category_descendant_ids($pdo, $categoryId) as $descendantId) {
            $allowedCategorySet[$descendantId] = true;
        }
    }

    $placeholders = implode(',', array_fill(0, count($tagIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT tc.tag_id, tc.category_id, t.name AS tag_name, c.name AS category_name
         FROM tag_categories tc
         INNER JOIN tags t ON t.id = tc.tag_id
         LEFT JOIN categories c ON c.id = tc.category_id
         WHERE tc.tag_id IN ({$placeholders})"
    );
    $stmt->execute($tagIds);

    $restrictions = [];
    foreach ($stmt->fetchAll() as $row) {
        $tagId = (int) $row['tag_id'];
        $restrictions[$tagId]['name'] = $row['tag_name'];
        $restrictions[$tagId]['allowed'][] = $row['category_name'] ?? ('#' . $row['category_id']);
        $restrictions[$tagId]['allowed_ids'][] = (int) $row['category_id'];
    }

    $violations = [];
    foreach ($restrictions as $tagId => $info) {
        $overlap = array_intersect($info['allowed_ids'], array_keys($allowedCategorySet));
        if (!$overlap) {
            $violations[] = [
                'tag_id' => $tagId,
                'tag_name' => $info['name'],
                'allowed' => $info['allowed'],
            ];
        }
    }
    return $violations;
}

/**
 * Resolve an image/asset URL to an absolute URL for use in sitemaps, RSS and
 * structured data. Handles absolute URLs (kept as-is), protocol-relative URLs,
 * and root-relative paths (e.g. `/uploads/...`).
 */
function absolute_asset_url(?string $url): string
{
    if ($url === null || $url === '') {
        return '';
    }
    if (preg_match('#^https?://#i', $url)) {
        return $url;
    }
    $frontend = rtrim((string) env_value('FRONTEND_URL', 'https://www.tradingle.com'), '/');
    return $frontend . '/' . ltrim($url, '/');
}

/**
 * Whether a canonical URL may be used on the site. The canonical target must
 * belong to one of the allowed origins (FRONTEND_URL by default, overridable
 * via CANONICAL_ALLOWED_ORIGINS) so an article can never point its rel=canonical
 * at an unrelated domain. Empty values are allowed (self-referencing).
 */
function canonical_url_allowed(?string $url): bool
{
    if ($url === null || $url === '') {
        return true;
    }
    $parts = parse_url($url);
    if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
        return false;
    }
    $scheme = strtolower((string) $parts['scheme']);
    if (!in_array($scheme, ['http', 'https'], true)) {
        return false;
    }
    $host = strtolower((string) $parts['host']);

    $rawOrigins = (string) env_value('CANONICAL_ALLOWED_ORIGINS', '');
    if ($rawOrigins === '') {
        $rawOrigins = (string) env_value('FRONTEND_URL', 'https://www.tradingle.com');
    }
    $allowed = array_filter(array_map('trim', explode(',', $rawOrigins)));
    foreach ($allowed as $origin) {
        $o = parse_url($origin);
        if (!$o || empty($o['host'])) {
            continue;
        }
        $oHost = strtolower((string) $o['host']);
        if ($host !== $oHost) {
            continue;
        }
        $portOk = true;
        if (!empty($o['port'])) {
            $portOk = (int) ($parts['port'] ?? 0) === (int) $o['port'];
        }
        $oScheme = strtolower((string) ($o['scheme'] ?? ''));
        if ($portOk && ($oScheme === '' || $oScheme === $scheme)) {
            return true;
        }
    }
    return false;
}

function admin_role_exists(PDO $pdo): bool
{
    try {
        $stmt = $pdo->prepare(
            "SELECT 1
             FROM user_roles ur
             INNER JOIN roles r ON r.id = ur.role_id
             WHERE r.name = 'admin'
             LIMIT 1"
        );
        $stmt->execute();
        return (bool) $stmt->fetchColumn();
    } catch (Throwable $e) {
        error_log('admin_role_exists check failed: ' . $e->getMessage());
        return true; // fail closed
    }
}

/**
 * Lockdown guard for the one-time setup endpoints (api/setup/*.php).
 * Once an admin account exists the setup endpoints refuse to run, so a leaked
 * SETUP_KEY can't silently reset an existing admin's password or mint a new one.
 * Re-enabling for deliberate re-runs (e.g. on a fresh restore) requires setting
 * ALLOW_ADMIN_RERUN=1 in the environment.
 */
function require_setup_allowed(PDO $pdo): void
{
    if (admin_role_exists($pdo) && env_value('ALLOW_ADMIN_RERUN') !== '1') {
        json_error('Setup has already been completed. An admin account exists; use the normal password reset flow instead.', 403);
    }
}

/**
 * Whether a URL may be stored as an href/url in nav, footer, legal, or social
 * config (issue #10). Allows only root-relative paths (single leading slash,
 * never `//` which is protocol-relative) and absolute http(s) URLs. Rejects
 * `javascript:`, `data:`, `vbscript:`, `blob:`, `mailto:` and any other scheme
 * so a stored navigation item can never execute script or exfiltrate a click.
 */
function is_safe_nav_url(?string $url): bool
{
    if ($url === null) {
        return true;
    }
    $url = trim($url);
    if ($url === '') {
        return false;
    }
    if ($url[0] === '/') {
        // `//host/path` is protocol-relative and can point off-site — reject.
        return substr($url, 0, 2) !== '//';
    }
    return preg_match('#^https?://#i', $url) === 1;
}

/**
 * Validate every href/url inside a navigation payload (issue #10). Returns a
 * list of invalid values (empty when the whole payload is safe). Handles the
 * navigation_config shape: primaryNav, footerColumns.links, footerLegalLinks,
 * socialLinks.
 */
function nav_payload_href_errors(array $payload): array
{
    $errors = [];

    $checkHref = static function ($href) use (&$errors): void {
        if (!is_string($href) || !is_safe_nav_url($href)) {
            $errors[] = is_string($href) ? $href : '(non-string)';
        }
    };

    foreach ((array) ($payload['primaryNav'] ?? []) as $item) {
        if (is_array($item)) {
            $checkHref($item['href'] ?? null);
            foreach ((array) ($item['children'] ?? []) as $child) {
                if (is_array($child)) {
                    $checkHref($child['href'] ?? null);
                }
            }
        }
    }
    foreach ((array) ($payload['footerColumns'] ?? []) as $col) {
        if (!is_array($col)) {
            continue;
        }
        foreach ((array) ($col['links'] ?? []) as $link) {
            if (is_array($link)) {
                $checkHref($link['href'] ?? null);
            }
        }
    }
    foreach ((array) ($payload['footerLegalLinks'] ?? []) as $link) {
        if (is_array($link)) {
            $checkHref($link['href'] ?? null);
        }
    }
    foreach ((array) ($payload['socialLinks'] ?? []) as $social) {
        if (is_array($social)) {
            $checkHref($social['url'] ?? null);
        }
    }

    return array_values(array_unique($errors));
}

/**
 * Record an action to the immutable audit trail (issue #121).
 */
function record_audit_log(PDO $pdo, ?int $userId, string $action, string $details, ?string $beforeData = null, ?string $afterData = null): void
{
    try {
        $ip = function_exists('get_client_ip') ? get_client_ip() : ($_SERVER['REMOTE_ADDR'] ?? null);
        $stmt = $pdo->prepare(
            'INSERT INTO audit_logs (user_id, action, details, before_data, after_data, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $details, $beforeData, $afterData, $ip]);
    } catch (Throwable $e) {
        error_log('Failed to record audit log: ' . $e->getMessage());
    }
}
