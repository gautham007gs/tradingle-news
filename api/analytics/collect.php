<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');

// Rate limit per IP (default 60 events/min) and per visitor id (default 30/min)
// so a single scripted client cannot flood analytics_events.
$clientIp = get_client_ip();
if (!rate_limit('analytics:ip:' . $clientIp, (int) env_value('ANALYTICS_RATE_LIMIT_PER_MINUTE', '60'), 60)) {
    json_error('Too many analytics events. Please slow down.', 429);
}

$input = input_json();
$event = trim((string) ($input['event_name'] ?? ''));
if ($event === '') {
    json_error('Event name is required.');
}

$metadata = $input['metadata'] ?? null;
if ($metadata !== null && !is_array($metadata)) {
    $metadata = ['value' => $metadata];
}

$visitorId = trim((string) ($input['visitor_id'] ?? ''));
if ($visitorId === '' || !preg_match('/^[a-f0-9]{32,64}$/i', $visitorId)) {
    $visitorId = null;
} elseif (!rate_limit('analytics:visitor:' . $visitorId, (int) env_value('ANALYTICS_VISITOR_RATE_LIMIT_PER_MINUTE', '30'), 60)) {
    json_error('Too many analytics events from this visitor.', 429);
}

// Opportunistic retention cleanup — delete events older than the retention
// window (default 180 days) so the events table can't grow without bound.
// Rate-limited to once per hour per process generation via a cheap cache key.
if (cache_get('analytics_cleanup_last_run', 3600) === null) {
    cache_set('analytics_cleanup_last_run', gmdate('Y-m-d H:i:s'), 3600);
    try {
        $retentionDays = max(7, (int) env_value('ANALYTICS_RETENTION_DAYS', '180'));
        $cutoff = gmdate('Y-m-d H:i:s', time() - $retentionDays * 86400);
        db()->prepare('DELETE FROM analytics_events WHERE created_at < ?')
            ->execute([$cutoff]);
    } catch (Throwable $e) {
        error_log('analytics retention cleanup failed: ' . $e->getMessage());
    }
}

// Issue #126: use get_client_ip() (proxy-aware) and a secret HMAC key so
// the IP hash cannot be reversed by an attacker who knows the cookie name.
$ip = get_client_ip();
$ipHashSecret = env_value('ANALYTICS_IP_HASH_SECRET', SESSION_COOKIE_NAME);
$ipHash = $ip !== '' ? hash_hmac('sha256', $ip, $ipHashSecret) : null;

$pdo = db();

try {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS analytics_visitors (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            visitor_id CHAR(64) NOT NULL UNIQUE,
            first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            visit_count INT UNSIGNED NOT NULL DEFAULT 1,
            user_id BIGINT UNSIGNED NULL,
            INDEX idx_analytics_visitors_last_seen (last_seen_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
} catch (Throwable $e) {
    error_log('analytics_visitors table unavailable: ' . $e->getMessage());
}

$currentUser = current_user();
$userId = $currentUser ? (int) $currentUser['id'] : null;

if ($visitorId) {
    try {
        $pdo->prepare(
            'INSERT INTO analytics_visitors (visitor_id, user_id, visit_count)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE
               last_seen_at = UTC_TIMESTAMP(),
               visit_count = visit_count + 1,
               user_id = COALESCE(VALUES(user_id), user_id)'
        )->execute([$visitorId, $userId]);
    } catch (Throwable $e) {
        error_log('analytics visitor upsert failed: ' . $e->getMessage());
    }

    if ($metadata === null) {
        $metadata = [];
    }
    $metadata['visitor_id'] = $visitorId;
    $metadata['is_unique_session'] = true;
}

$stmt = $pdo->prepare(
    'INSERT INTO analytics_events (event_name, page_path, metric_name, metric_value, rating, metadata, user_agent, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $event,
    substr((string) ($input['page_path'] ?? ''), 0, 255) ?: null,
    substr((string) ($input['metric_name'] ?? ''), 0, 50) ?: null,
    isset($input['metric_value']) ? (float) $input['metric_value'] : null,
    substr((string) ($input['rating'] ?? ''), 0, 32) ?: null,
    $metadata !== null ? json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
    substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255) ?: null,
    $ipHash,
]);

json_response(['ok' => true]);
