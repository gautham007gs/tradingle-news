<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
require_roles(['admin', 'editor']);

$pdo = db();
try {
    ensure_cms_schema_upgrades($pdo);
} catch (Throwable $e) {
    error_log('tags/merge schema upgrade skipped: ' . $e->getMessage());
}

$input = input_json();
$targetId = isset($input['target_id']) ? (int) $input['target_id'] : 0;
$sourceIds = is_array($input['source_ids'] ?? null)
    ? array_values(array_unique(array_filter(array_map('intval', $input['source_ids']), fn ($id) => $id > 0)))
    : [];
$sourceIds = array_values(array_diff($sourceIds, [$targetId]));

if ($targetId <= 0) {
    json_error('Choose which tag should survive the merge.');
}
if (!$sourceIds) {
    json_error('Choose at least one other tag to merge into the target.');
}

$targetStmt = $pdo->prepare('SELECT id, name FROM tags WHERE id = ? LIMIT 1');
$targetStmt->execute([$targetId]);
$target = $targetStmt->fetch();
if (!$target) {
    json_error('Target tag not found.', 404);
}

$placeholders = implode(',', array_fill(0, count($sourceIds), '?'));
$sourcesStmt = $pdo->prepare("SELECT id, name FROM tags WHERE id IN ({$placeholders})");
$sourcesStmt->execute($sourceIds);
$sources = $sourcesStmt->fetchAll();
if (count($sources) !== count($sourceIds)) {
    json_error('One or more source tags were not found.', 404);
}

$pdo->beginTransaction();
try {
    foreach ($sourceIds as $sourceId) {
        // Re-point article associations onto the surviving tag; INSERT IGNORE
        // dedupes cases where an article already carries both tags.
        $pdo->prepare('INSERT IGNORE INTO article_tags (article_id, tag_id) SELECT article_id, ? FROM article_tags WHERE tag_id = ?')
            ->execute([$targetId, $sourceId]);
        $pdo->prepare('DELETE FROM article_tags WHERE tag_id = ?')->execute([$sourceId]);

        // Union the category-relevance restrictions. If either tag was global
        // (no rows), the merged tag stays global rather than becoming falsely
        // restrictive — merging should never make a tag harder to use.
        $targetRestricted = (int) $pdo->query('SELECT COUNT(*) AS c FROM tag_categories WHERE tag_id = ' . $targetId)->fetch()['c'] > 0;
        $sourceRestricted = (int) $pdo->query('SELECT COUNT(*) AS c FROM tag_categories WHERE tag_id = ' . $sourceId)->fetch()['c'] > 0;
        if ($targetRestricted && $sourceRestricted) {
            $pdo->prepare('INSERT IGNORE INTO tag_categories (tag_id, category_id) SELECT ?, category_id FROM tag_categories WHERE tag_id = ?')
                ->execute([$targetId, $sourceId]);
        } elseif (!$targetRestricted && !$sourceRestricted) {
            // both already global — nothing to do
        } else {
            // one side is global — make the merged tag global by clearing target's restrictions
            $pdo->prepare('DELETE FROM tag_categories WHERE tag_id = ?')->execute([$targetId]);
        }
        $pdo->prepare('DELETE FROM tag_categories WHERE tag_id = ?')->execute([$sourceId]);
        $pdo->prepare('DELETE FROM tags WHERE id = ?')->execute([$sourceId]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Merge failed: ' . $e->getMessage(), 500);
}

json_response([
    'ok' => true,
    'target_id' => $targetId,
    'target_name' => $target['name'],
    'merged' => array_map(fn ($s) => $s['name'], $sources),
]);
