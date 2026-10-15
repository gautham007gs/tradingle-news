<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

// Allow POST to hide secrets in body/headers, but fall back to GET for older clients temporarily
require_method('POST', 'GET');

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$key = '';
if (strpos($authHeader, 'Bearer ') === 0) {
    $key = substr($authHeader, 7);
} else {
    // Fallback for transition
    $key = trim((string) ($_GET['key'] ?? ''));
}

if (CRON_KEY === '' || !hash_equals(CRON_KEY, $key)) {
    json_error('Invalid cron key.', 403);
}

$pdo = db();
try {
    ensure_cms_schema_upgrades($pdo);
} catch (Throwable $e) {
    error_log('cleanup-logs schema upgrade skipped: ' . $e->getMessage());
}
record_cron_heartbeat($pdo, 'cleanup-logs', null);

$result = [
    'error_logs_deleted' => 0,
    'cache_invalidation_log_deleted' => 0,
    'article_revisions_deleted' => 0,
    'stale_drafts_deleted' => 0,
    'rate_limits_deleted' => 0,
    'expired_sessions_deleted' => 0,
    'stale_locks_cleared' => 0,
    'analytics_events_deleted' => 0,
];

try {
    // error_logs / cache_invalidation_log: pure diagnostics, no reason to keep past 30 days.
    try {
        $result['error_logs_deleted'] = $pdo->exec(
            "DELETE FROM error_logs WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 30 DAY)"
        ) ?: 0;
    } catch (Throwable $e) {
        error_log('cleanup-logs error_logs: ' . $e->getMessage());
    }

    try {
        $result['cache_invalidation_log_deleted'] = $pdo->exec(
            "DELETE FROM cache_invalidation_log WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 30 DAY)"
        ) ?: 0;
    } catch (Throwable $e) {
        error_log('cleanup-logs cache_invalidation_log: ' . $e->getMessage());
    }

    // article_revisions: keep the 20 most recent revisions per article (undo history),
    // drop the rest. Content itself lives on the article row, so this is safe.
    try {
        $pdo->exec(
            "DELETE ar FROM article_revisions ar
             LEFT JOIN (
                 SELECT id FROM (
                     SELECT id, article_id,
                            ROW_NUMBER() OVER (PARTITION BY article_id ORDER BY id DESC) AS rn
                     FROM article_revisions
                 ) ranked WHERE rn <= 20
             ) keep ON keep.id = ar.id
             WHERE keep.id IS NULL"
        );
        $result['article_revisions_deleted'] = $pdo->query('SELECT ROW_COUNT() AS c')->fetch()['c'] ?? 0;
    } catch (Throwable $e) {
        // ROW_NUMBER() requires MySQL 8+; older MySQL/MariaDB falls back to a no-op rather than failing the whole job.
        error_log('cleanup-logs article_revisions: ' . $e->getMessage());
    }

    // drafts: autosave rows are only useful while someone is actively editing.
    // Anything untouched for 30+ days is abandoned work-in-progress.
    try {
        $result['stale_drafts_deleted'] = $pdo->exec(
            "DELETE FROM drafts WHERE updated_at < (UTC_TIMESTAMP() - INTERVAL 30 DAY)"
        ) ?: 0;
    } catch (Throwable $e) {
        error_log('cleanup-logs drafts: ' . $e->getMessage());
    }

    try {
        $result['rate_limits_deleted'] = $pdo->exec(
            "DELETE FROM rate_limit_counters WHERE window_start < (UTC_TIMESTAMP() - INTERVAL 7 DAY)"
        ) ?: 0;
    } catch (Throwable $e) {}

    try {
        $result['expired_sessions_deleted'] = $pdo->exec(
            "DELETE FROM user_sessions WHERE expires_at < UTC_TIMESTAMP() OR revoked_at < (UTC_TIMESTAMP() - INTERVAL 7 DAY)"
        ) ?: 0;
    } catch (Throwable $e) {}

    try {
        $result['stale_locks_cleared'] = $pdo->exec(
            "UPDATE articles SET lock_held_by = NULL, lock_expires_at = NULL WHERE lock_expires_at < UTC_TIMESTAMP()"
        ) ?: 0;
    } catch (Throwable $e) {}

    try {
        $analyticsRetention = max(1, (int) env_value('ANALYTICS_RETENTION_DAYS', '180'));
        $result['analytics_events_deleted'] = $pdo->exec(
            "DELETE FROM analytics_events WHERE created_at < (UTC_TIMESTAMP() - INTERVAL {$analyticsRetention} DAY)"
        ) ?: 0;
    } catch (Throwable $e) {}

    record_cron_heartbeat($pdo, 'cleanup-logs', null);
} catch (Throwable $e) {
    record_cron_heartbeat($pdo, 'cleanup-logs', $e->getMessage());
    json_error('Cleanup failed: ' . $e->getMessage(), 500);
}

json_response(['ok' => true] + $result);
