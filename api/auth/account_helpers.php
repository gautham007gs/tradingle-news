<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers.php';

/**
 * Account lifecycle helpers (issues #16/#17):
 *
 *  - Single-use, expiring token stores for email verification and password
 *    reset (only SHA-256 hashes are ever persisted — a DB leak can't be
 *    replayed).
 *  - Transactional email delivery on top of PHP mail() with a minimal HTML
 *    template. No external SMTP dependency so it works on shared Hostinger
 *    hosting; swap the body of send_account_email() for PHPMailer/SMTP later
 *    without changing callers.
 *  - Minimal RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s step) for admin 2FA.
 */

function ensure_account_tables(PDO $pdo): void
{
    static $ran = false;
    if ($ran) {
        return;
    }
    $ran = true;

    $statements = [
        'CREATE TABLE IF NOT EXISTS email_verifications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_email_verification_hash (token_hash),
            INDEX idx_email_verification_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

        'CREATE TABLE IF NOT EXISTS password_resets (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_password_reset_hash (token_hash),
            INDEX idx_password_reset_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

        'CREATE TABLE IF NOT EXISTS two_factor_challenges (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_tfa_challenge_hash (token_hash),
            INDEX idx_tfa_challenge_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];

    foreach ($statements as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            error_log('ensure_account_tables: ' . $e->getMessage());
        }
    }

    // users.totp_* columns are additive and idempotent; MariaDB/MySQL 8
    // support ADD COLUMN IF NOT EXISTS. Also add email_verified_at defensively
    // for installs where the column pre-dates the setup flow.
    $columns = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at DATETIME NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_secret VARCHAR(64) NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled TINYINT(1) NOT NULL DEFAULT 0",
    ];
    foreach ($columns as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            error_log('ensure_account_tables users columns: ' . $e->getMessage());
        }
    }
}

/**
 * Create a single-use token, persisting only its hash.
 * Returns the raw token for the caller to email/display.
 */
function create_single_use_token(PDO $pdo, string $table, int $userId, int $ttlSeconds = 1800): string
{
    ensure_account_tables($pdo);
    $token = bin2hex(random_bytes(32));
    $expires = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
        ->modify('+' . $ttlSeconds . ' seconds')
        ->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        "INSERT INTO {$table} (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
    );
    $stmt->execute([$userId, hash('sha256', $token), $expires]);
    return $token;
}

/**
 * Redeem a single-use token. Returns the user_id on success (marking the
 * token used atomically), or null when invalid/expired/already used.
 */
function redeem_single_use_token(PDO $pdo, string $table, string $rawToken): ?int
{
    if ($rawToken === '') {
        return null;
    }
    ensure_account_tables($pdo);
    $hash = hash('sha256', $rawToken);
    $stmt = $pdo->prepare(
        "SELECT user_id FROM {$table}
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
         LIMIT 1"
    );
    $stmt->execute([$hash]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $pdo->prepare("UPDATE {$table} SET used_at = UTC_TIMESTAMP() WHERE token_hash = ?")
        ->execute([$hash]);
    return (int) $row['user_id'];
}

function account_mail_from(): string
{
    $name = env_value('MAIL_FROM_NAME', 'Tradingle News');
    $email = env_value('MAIL_FROM_EMAIL', 'noreply@tradingle.com');
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = 'noreply@tradingle.com';
    }
    return mb_encode_mimeheader($name, 'UTF-8', 'B') . " <{$email}>";
}

/**
 * Transactional email via PHP mail(). Best-effort by design — callers must
 * never fail a request because delivery failed, only log it.
 */
function send_account_email(string $to, string $subject, string $htmlBody): bool
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: ' . account_mail_from(),
        'To: ' . mb_encode_mimeheader($to, 'UTF-8', 'B'),
        'X-Mailer: Tradingle-CMS/1.0',
    ]);
    $html = '<!doctype html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">'
        . $htmlBody
        . '<p style="color:#666;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">'
        . 'You received this email because of an action on '
        . htmlspecialchars((string) env_value('APP_NAME', 'Tradingle News'), ENT_QUOTES)
        . '. If you did not request it, you can safely ignore it.</p></body></html>';
    return @mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'B'), $html, $headers);
}

function account_action_url(string $path, array $query = []): string
{
    $base = rtrim((string) env_value('FRONTEND_URL', 'https://www.tradingle.com'), '/');
    if ($query) {
        $path .= '?' . http_build_query($query);
    }
    return $base . $path;
}

// ───────────────────────────── TOTP (RFC 6238) ─────────────────────────────

function base32_encode_custom(string $data): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $binary = '';
    foreach (str_split($data) as $byte) {
        $binary .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
    }
    $encoded = '';
    foreach (str_split($binary, 5) as $chunk) {
        $encoded .= $alphabet[(int) bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
    }
    return $encoded;
}

function base32_decode_custom(string $b32): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $b32 = strtoupper((string) preg_replace('/[^A-Z2-7]/', '', $b32));
    $bits = '';
    foreach (str_split($b32) as $char) {
        $index = strpos($alphabet, $char);
        if ($index === false) {
            continue;
        }
        $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
    }
    $bytes = '';
    foreach (str_split($bits, 8) as $chunk) {
        if (strlen($chunk) === 8) {
            $bytes .= chr((int) bindec($chunk));
        }
    }
    return $bytes;
}

function totp_generate_secret(): string
{
    return base32_encode_custom(random_bytes(20));
}

function totp_code(string $secret, ?int $timestamp = null): string
{
    $timestamp ??= time();
    $counter = (int) floor($timestamp / 30);
    $binCounter = pack('N*', 0) . pack('N*', $counter);
    $hash = hash_hmac('sha1', $binCounter, base32_decode_custom($secret), true);
    $offset = ord($hash[strlen($hash) - 1]) & 0x0f;
    $value = (
        ((ord($hash[$offset]) & 0x7f) << 24) |
        ((ord($hash[$offset + 1]) & 0xff) << 16) |
        ((ord($hash[$offset + 2]) & 0xff) << 8) |
        (ord($hash[$offset + 3]) & 0xff)
    ) % 1000000;
    return str_pad((string) $value, 6, '0', STR_PAD_LEFT);
}

function totp_verify(string $secret, string $code, int $window = 1): bool
{
    if (preg_match('/^\d{6}$/', $code) !== 1) {
        return false;
    }
    $now = time();
    for ($offset = -$window; $offset <= $window; $offset++) {
        if (hash_equals(totp_code($secret, $now + ($offset * 30)), $code)) {
            return true;
        }
    }
    return false;
}

function totp_provisioning_uri(string $secret, string $label): string
{
    $issuer = (string) env_value('TOTP_ISSUER', 'Tradingle News');
    return sprintf(
        'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
        rawurlencode($issuer),
        rawurlencode($label),
        $secret,
        rawurlencode($issuer)
    );
}
