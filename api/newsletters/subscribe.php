<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');

// Per-IP throttle: max 5 subscription attempts per hour so an automated bot
// can't churn the newsletters table (or use it as a spam/enumeration vector).
$clientIp = get_client_ip();
if (!rate_limit('newsletter:ip:' . $clientIp, (int) env_value('NEWSLETTER_RATE_LIMIT_PER_HOUR', '5'), 3600)) {
    json_error('Too many subscription attempts. Please try again later.', 429);
}

$input = input_json();

$email = strtolower(trim((string) ($input['email'] ?? '')));
$source = trim((string) ($input['source'] ?? 'site'));
$categorySlug = trim((string) ($input['category_slug'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('A valid email address is required.');
}

$pdo = db();

// Ensure the unsubscribe token column exists (idempotent, also covered by
// the runtime schema self-migration in helpers.php).
try {
    $pdo->exec("ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS unsubscribe_token_hash CHAR(64) NULL");
} catch (Throwable $e) {
    error_log('newsletters unsubscribe_token_hash: ' . $e->getMessage());
}

// Generate a one-click unsubscribe token for this address. Keep the previous
// token alive on re-subscribe so the latest email link still works.
$rawToken = bin2hex(random_bytes(32));

$stmt = $pdo->prepare("
    INSERT INTO newsletters (email, source, category_slug, status, subscribed_at, unsubscribed_at, unsubscribe_token_hash)
    VALUES (?, ?, ?, 'subscribed', UTC_TIMESTAMP(), NULL, ?)
    ON DUPLICATE KEY UPDATE
      source = VALUES(source),
      category_slug = COALESCE(VALUES(category_slug), category_slug),
      status = 'subscribed',
      unsubscribed_at = NULL,
      unsubscribe_token_hash = VALUES(unsubscribe_token_hash)
");
$stmt->execute([$email, $source ?: 'site', $categorySlug ?: null, hash('sha256', $rawToken)]);

json_response(['ok' => true, 'unsubscribe_token' => $rawToken]);
