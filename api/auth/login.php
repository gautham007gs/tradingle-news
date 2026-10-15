<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

// Rate limit login attempts (issue #37, #15)
// Uses failOpen=false so abuse controls remain active even if the DB is failing
$clientIp = get_client_ip();
if (!rate_limit('login:ip:' . $clientIp, 10, 900, false)) {
    json_error('Too many login attempts. Please try again later.', 429);
}

$input = input_json();
$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

if ($email !== '' && !rate_limit('login:email:' . $email, 5, 900, false)) {
    json_error('Too many login attempts for this account. Please try again later.', 429);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    json_error('Invalid email or password.', 422);
}

$pdo = db();
ensure_account_tables($pdo);

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !$user['password_hash'] || !password_verify($password, $user['password_hash'])) {
    json_error('Invalid email or password.', 401);
}

// Issue #107: Upgrade password hash if cost/algorithm changes
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$newHash, $user['id']]);
}

$roles = current_user_roles((int) $user['id']);

// ── Two-factor authentication (issue #17) ──────────────────────────────────
// When TOTP is enabled we never create a session from credentials alone.
// If a valid code is supplied inline, proceed; otherwise hand back a
// short-lived challenge token for the login-2fa.php step.
if (!empty($user['totp_enabled']) && ($user['totp_secret'] ?? '') !== '') {
    $code = trim((string) ($input['totp_code'] ?? ''));
    if ($code !== '' && totp_verify((string) $user['totp_secret'], $code)) {
        // Fall through to session creation below.
    } else {
        $challenge = create_single_use_token($pdo, 'two_factor_challenges', (int) $user['id'], 300);
        json_response([
            'requires_2fa' => true,
            'two_factor_token' => $challenge,
            'user' => public_user($user, $roles),
        ], 200);
    }
}

$pdo->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$user['id']]);
$sessionToken = create_user_session((int) $user['id']);

json_response(['user' => public_user($user, $roles), 'session_token' => $sessionToken]);
