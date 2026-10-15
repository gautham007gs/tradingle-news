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
if (preg_match('/^\d{6}$/', $code) !== 1) {
    json_error('Enter the 6-digit code from your authenticator app.', 422);
}

$stmt = $pdo->prepare('SELECT totp_pending_secret FROM users WHERE id = ? LIMIT 1');
$stmt->execute([(int) $user['id']]);
$pendingSecret = (string) ($stmt->fetch()['totp_pending_secret'] ?? '');

if ($pendingSecret === '') {
    json_error('No pending setup. Start two-factor setup first.', 400);
}

if (!totp_verify($pendingSecret, $code)) {
    json_error('Invalid code. Please try again.', 401);
}

$pdo->prepare('UPDATE users SET totp_secret = ?, totp_pending_secret = NULL, totp_enabled = 1 WHERE id = ?')
    ->execute([$pendingSecret, (int) $user['id']]);

json_response(['ok' => true, 'totp_enabled' => true]);
