<?php
declare(strict_types=1);

function session_token_hash(string $token): string
{
    return hash('sha256', $token);
}

/**
 * Guarantee the user_sessions columns newer code writes/reads exist. Runs the
 * information_schema check at most once per request; a DB created from an old
 * dump otherwise fatals login with "Unknown column 'last_active_at'"
 * (audit finding F7).
 */
function ensure_session_schema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    ensure_column($pdo, 'user_sessions', 'last_active_at', 'TIMESTAMP NULL AFTER expires_at');
    ensure_column($pdo, 'user_sessions', 'csrf_token', 'VARCHAR(64) NULL AFTER user_agent');
}

function create_user_session(int $userId): string
{
    $pdo = db();
    ensure_session_schema($pdo);

    $token = bin2hex(random_bytes(32));
    $hash = session_token_hash($token);
    $expires = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
        ->modify('+' . SESSION_DAYS . ' days')
        ->format('Y-m-d H:i:s');

    $stmt = db()->prepare(
        'INSERT INTO user_sessions (user_id, session_token_hash, ip_address, user_agent, expires_at, last_active_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())'
    );
    $stmt->execute([
        $userId,
        $hash,
        // Issue #104: use proxy-aware IP for session recording
        function_exists('get_client_ip') ? get_client_ip() : ($_SERVER['REMOTE_ADDR'] ?? null),
        $_SERVER['HTTP_USER_AGENT'] ?? null,
        $expires,
    ]);

    set_session_cookie($token);
    return $token;
}

function is_https_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    $forwardedProto = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    if ($forwardedProto === 'https') {
        return true;
    }

    $forwardedSsl = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_SSL'] ?? ''));
    return $forwardedSsl === 'on';
}

function session_cookie_options(int $expires): array
{
    $secure = is_https_request();
    $sameSite = SESSION_SAMESITE;

    if (strcasecmp($sameSite, 'None') === 0 && !$secure) {
        $sameSite = 'Lax';
    }

    return [
        'expires' => $expires,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => $sameSite,
    ];
}

function set_session_cookie(string $token): void
{
    setcookie(SESSION_COOKIE_NAME, $token, session_cookie_options(time() + (SESSION_DAYS * 86400)));
}

function clear_session_cookie(): void
{
    setcookie(SESSION_COOKIE_NAME, '', session_cookie_options(time() - 3600));
}

function current_session_token(): ?string
{
    $cookie = $_COOKIE[SESSION_COOKIE_NAME] ?? null;
    if (is_string($cookie) && $cookie !== '') {
        return $cookie;
    }

    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($auth, 'Bearer ')) {
        return substr($auth, 7);
    }

    return null;
}

function current_user(): ?array
{
    static $cachedUser = null;
    static $alreadyChecked = false;
    if ($alreadyChecked) {
        return $cachedUser;
    }
    $alreadyChecked = true;

    $token = current_session_token();
    if (!$token) {
        return null;
    }

    $pdo = db();
    ensure_session_schema($pdo);

    // Issue #104: also check session idle timeout (SESSION_IDLE_HOURS, default 2h)
    $idleHours = defined('SESSION_IDLE_HOURS') ? (int) SESSION_IDLE_HOURS : 2;
    $idleCheck = $idleHours > 0
        ? "AND (s.last_active_at IS NULL OR s.last_active_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL {$idleHours} HOUR))"
        : '';

    $stmt = db()->prepare(
        "SELECT u.*
         FROM user_sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.session_token_hash = ?
           AND s.revoked_at IS NULL
           AND s.expires_at > UTC_TIMESTAMP()
           {$idleCheck}
           AND u.status = 'active'
         LIMIT 1"
    );
    $stmt->execute([session_token_hash($token)]);
    $user = $stmt->fetch();

    if ($user) {
        // Bump last_active_at on every authenticated request (best-effort)
        try {
            db()->prepare('UPDATE user_sessions SET last_active_at = UTC_TIMESTAMP() WHERE session_token_hash = ?')
                ->execute([session_token_hash($token)]);
        } catch (Throwable) {
            // non-critical
        }
    }

    $cachedUser = $user ?: null;
    return $cachedUser;
}

function current_user_roles(int $userId): array
{
    $stmt = db()->prepare(
        'SELECT r.name
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?'
    );
    $stmt->execute([$userId]);
    return array_map(static fn ($row) => $row['name'], $stmt->fetchAll());
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_error('Authentication required.', 401);
    }
    return $user;
}

function require_roles(array $allowed): array
{
    $user = require_user();
    $roles = current_user_roles((int) $user['id']);
    if (!has_any_role($roles, $allowed)) {
        json_error('You do not have permission to perform this action.', 403);
    }
    return [$user, $roles];
}
