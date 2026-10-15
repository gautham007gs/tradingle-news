<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':login-2fa', 10, 900)) {
    json_error('Too many attempts. Please try again later.', 429);
}

$input = input_json();
$token = trim((string) ($input['two_factor_token'] ?? ''));
$code = trim((string) ($input['totp_code'] ?? ''));

if (preg_match('/^\d{6}$/', $code) !== 1) {
    json_error('Enter the 6-digit code from your authenticator app.', 422);
}

$pdo = db();
$userId = redeem_single_use_token($pdo, 'two_factor_challenges', $token);
if (!$userId) {
    json_error('This login session has expired. Please sign in again.', 401);
}

$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND status = 'active' LIMIT 1");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || empty($user['totp_enabled']) || ($user['totp_secret'] ?? '') === '') {
    json_error('Two-factor authentication is not enabled for this account.', 401);
}

if (!totp_verify((string) $user['totp_secret'], $code)) {
    json_error('Invalid code. Please try again.', 401);
}

$pdo->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$userId]);
$sessionToken = create_user_session($userId);

$roles = current_user_roles($userId);
json_response(['user' => public_user($user, $roles), 'session_token' => $sessionToken]);
