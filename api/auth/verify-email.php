<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST', 'GET');

$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':verify-email', 10, 3600)) {
    json_error('Too many attempts. Please try again later.', 429);
}

$token = trim((string) (input_json()['token'] ?? ($_GET['token'] ?? '')));
if ($token === '') {
    json_error('Verification token is required.', 422);
}

$pdo = db();
$userId = redeem_single_use_token($pdo, 'email_verifications', $token);
if (!$userId) {
    json_error('This verification link is invalid or has expired.', 400);
}

$pdo->prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?")
    ->execute([$userId]);

json_response(['ok' => true, 'email_verified' => true]);
