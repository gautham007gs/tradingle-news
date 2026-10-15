<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':reset-password', 10, 3600)) {
    json_error('Too many attempts. Please try again later.', 429);
}

$input = input_json();
$token = trim((string) ($input['token'] ?? ''));
$password = (string) ($input['password'] ?? '');

if (strlen($password) < MIN_PASSWORD_LENGTH) {
    json_error('Password must be at least ' . MIN_PASSWORD_LENGTH . ' characters.', 422);
}

$pdo = db();
$userId = redeem_single_use_token($pdo, 'password_resets', $token);
if (!$userId) {
    json_error('This reset link is invalid or has expired.', 400);
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);

    // Revoke every existing session for the user so a leaked old cookie dies.
    $pdo->prepare('UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL')
        ->execute([$userId]);

    // Burn any outstanding reset/verification tokens for this user.
    $pdo->prepare("UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL")
        ->execute([$userId]);
    $pdo->prepare("UPDATE email_verifications SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL")
        ->execute([$userId]);

    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not reset your password.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}

json_response(['ok' => true]);
