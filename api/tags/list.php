<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$pdo = db();
try {
    ensure_cms_schema_upgrades($pdo);
} catch (Throwable $e) {
    error_log('tags/list schema upgrade skipped: ' . $e->getMessage());
}

$stmt = $pdo->query(
    "SELECT t.id, t.name, t.slug, t.description,
        (SELECT GROUP_CONCAT(tc.category_id) FROM tag_categories tc WHERE tc.tag_id = t.id) AS category_ids,
        (SELECT GROUP_CONCAT(c.name SEPARATOR '||') FROM tag_categories tc
            INNER JOIN categories c ON c.id = tc.category_id WHERE tc.tag_id = t.id) AS category_names
     FROM tags t
     ORDER BY t.name ASC"
);
$rows = $stmt->fetchAll();
foreach ($rows as &$row) {
    $row['category_ids'] = $row['category_ids'] ? array_map('intval', explode(',', $row['category_ids'])) : [];
    $row['category_names'] = $row['category_names'] ? explode('||', $row['category_names']) : [];
}

json_response(['data' => $rows]);
