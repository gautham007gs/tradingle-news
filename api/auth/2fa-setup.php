<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

// Admin-only: setting up a second factor on a privileged account is itself a
// privileged action. Requires an authenticated admin AND a CSRF token.
require_csrf_token();
[$user] = require_roles(['admin']);
ensure_account_tables(db());

$pdo = db();
$secret = totp_generate_secret();
$pdo->prepare('UPDATE users SET totp_pending_secret = ? WHERE id = ?')
    ->execute([$secret, (int) $user['id']]);

json_response([
    'ok' => true,
    'secret' => $secret,
    'provisioning_uri' => totp_provisioning_uri($secret, $user['email']),
]);
