<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

require_csrf_token();
[$user] = require_roles(['admin']);
$pdo = db();
ensure_account_tables($pdo);

$input = input_json();
$code = trim((string) ($input['totp_code'] ?? ''));

$stmt = $pdo->prepare('SELECT totp_secret FROM users WHERE id = ? LIMIT 1');
$stmt->execute([(int) $user['id']]);
$currentSecret = (string) ($stmt->fetch()['totp_secret'] ?? '');

if ($currentSecret === '' || empty($user['totp_enabled'])) {
    json_error('Two-factor authentication is not enabled.', 400);
}

// Disabling a second factor must itself be proven with a valid TOTP code so a
// stolen session cookie can't silently downgrade the account.
if (preg_match('/^\d{6}$/', $code) !== 1 || !totp_verify($currentSecret, $code)) {
    json_error('Invalid code. Two-factor authentication was not disabled.', 401);
}

$pdo->prepare('UPDATE users SET totp_secret = NULL, totp_pending_secret = NULL, totp_enabled = 0 WHERE id = ?')
    ->execute([(int) $user['id']]);

json_response(['ok' => true, 'totp_enabled' => false]);
