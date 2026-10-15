<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
require_roles(['admin', 'editor']);

$pdo = db();
try {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS cron_health (
            job_name VARCHAR(80) NOT NULL,
            last_run_at TIMESTAMP NULL,
            last_success_at TIMESTAMP NULL,
            last_error VARCHAR(500) NULL,
            run_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY (job_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
} catch (Throwable $e) {
    error_log('cron-health schema upgrade skipped: ' . $e->getMessage());
}

$jobs = $pdo->query('SELECT job_name, last_run_at, last_success_at, last_error, run_count FROM cron_health')->fetchAll();
foreach ($jobs as &$job) {
    $lastSuccess = $job['last_success_at'] ? strtotime($job['last_success_at'] . ' UTC') : null;
    $job['minutes_since_success'] = $lastSuccess ? (int) round((time() - $lastSuccess) / 60) : null;
    // publish-scheduled should run at least every ~15 min; flag if it's gone quiet.
    $job['is_stale'] = $lastSuccess === null || (time() - $lastSuccess) > 30 * 60;
}

$recentFailures = $pdo->query(
    "SELECT event, article_slug, outcome, http_code, detail, created_at
     FROM cache_invalidation_log
     WHERE outcome = 'error'
     ORDER BY created_at DESC LIMIT 10"
)->fetchAll();

json_response(['jobs' => $jobs, 'recent_cache_invalidation_failures' => $recentFailures]);
