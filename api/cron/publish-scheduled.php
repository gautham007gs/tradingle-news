<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../article_policy.php';

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
    error_log('publish-scheduled schema upgrade skipped: ' . $e->getMessage());
}
record_cron_heartbeat($pdo, 'publish-scheduled', null);

$pdo->beginTransaction();

try {
    // SELECT ... FOR UPDATE prevents two cron processes publishing the same rows
    // if the cron fires twice within the same second (e.g. server restart overlap).
    $selectStmt = $pdo->prepare("
        SELECT id, slug, category_id, author_id
        FROM   articles
        WHERE  status = 'scheduled'
          AND  scheduled_at IS NOT NULL
          AND  scheduled_at <= UTC_TIMESTAMP()
        FOR UPDATE
    ");
    $selectStmt->execute();
    $toPublish = $selectStmt->fetchAll();

    if (empty($toPublish)) {
        $pdo->commit();
        json_response(['ok' => true, 'published' => 0]);
    }

    // Bulk update — only rows we locked above are touched
    $ids = implode(',', array_map(fn($r) => (int) $r['id'], $toPublish));
    $pdo->exec("
        UPDATE articles
        SET    status      = 'published',
               published_at = COALESCE(published_at, scheduled_at, UTC_TIMESTAMP()),
               scheduled_at = NULL
        WHERE  id IN ({$ids})
    ");

    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    record_cron_heartbeat($pdo, 'publish-scheduled', $e->getMessage());
    json_error('Cron job failed: ' . $e->getMessage(), 500);
}

record_cron_heartbeat($pdo, 'publish-scheduled', null);

// Fire ISR revalidation AFTER the transaction commits (non-blocking best-effort).
// Centralized in invalidate_article_cache() (issue #4) so the scheduled-publish
// path clears the same tags and app-level caches as save/review/delete.
foreach ($toPublish as $article) {
    invalidate_article_cache($pdo, $article, 'publish');
}

json_response(['ok' => true, 'published' => count($toPublish)]);
