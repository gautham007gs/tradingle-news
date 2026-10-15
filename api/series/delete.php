<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin', 'editor']);

$pdo = db();
$input = input_json();
$id = (int) ($input['id'] ?? 0);

if ($id <= 0) {
    json_error('Series id is required.');
}

// Fetch series name before deletion for audit log.
// NOTE: this table's column is `name`, not `title` — the old SELECT title
// threw "Unknown column" AFTER output had started, so clients received a
// 200 with an HTML error fragment and the series was never deleted.
try {
    $seriesRow = $pdo->prepare('SELECT name FROM article_series WHERE id = ? LIMIT 1');
    $seriesRow->execute([$id]);
    $series = $seriesRow->fetch() ?: ['name' => '(unknown)'];
} catch (Throwable $e) {
    error_log('series/delete prefetch failed: ' . $e->getMessage());
    $series = ['name' => '(unknown)'];
}

$pdo->beginTransaction();
try {
    $pdo->prepare('UPDATE articles SET series_id = NULL WHERE series_id = ?')->execute([$id]);
    $deleted = $pdo->prepare('DELETE FROM article_series WHERE id = ?')->execute([$id]);
    if (!$deleted || $pdo->query('SELECT COUNT(*) FROM article_series WHERE id = ' . (int) $id)->fetchColumn() > 0) {
        // still present after DELETE inside our own transaction — refuse to lie
        safe_rollback($pdo);
        json_error('Failed to delete series.', 500);
    }
    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Failed to delete series: ' . $e->getMessage(), 500);
}

// Issue #121: Immutable audit trail
record_audit_log($pdo, (int) $user['id'], 'series_delete', "Deleted series ID {$id} name='{$series['name']}'", json_encode(['id' => $id, 'name' => $series['name']]), null);

json_response(['ok' => true]);
