<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
require_roles(['admin', 'editor', 'author']);

$pdo = db();
try {
    ensure_cms_schema_upgrades($pdo);
} catch (Throwable $e) {
    error_log('tags/save schema upgrade skipped: ' . $e->getMessage());
}

$input = input_json();
$id = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;
$name = normalize_label(trim((string) ($input['name'] ?? '')));
$slug = trim((string) ($input['slug'] ?? ''));
$description = isset($input['description']) ? trim((string) $input['description']) : null;

// category_ids omitted (key not present) => leave existing restrictions untouched.
// category_ids explicitly [] => make the tag global (no restrictions).
$categoryIdsProvided = array_key_exists('category_ids', $input);
$categoryIds = is_array($input['category_ids'] ?? null)
    ? array_values(array_unique(array_filter(array_map('intval', $input['category_ids']))))
    : [];

if ($name === '') {
    json_error('Tag name is required.');
}

$slug = $slug !== '' ? slugify_php($slug) : slugify_php($name);

if ($id !== null) {
    $existing = $pdo->prepare('SELECT id FROM tags WHERE slug = ? AND id != ?');
    $existing->execute([$slug, $id]);
    if ($existing->fetch()) {
        json_error('Another tag already uses this slug.');
    }
    $stmt = $pdo->prepare('UPDATE tags SET name = ?, slug = ?, description = ? WHERE id = ?');
    $stmt->execute([$name, $slug, $description ?: null, $id]);
    $tagId = $id;
} else {
    $stmt = $pdo->prepare('INSERT INTO tags (name, slug, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = COALESCE(VALUES(description), description)');
    $stmt->execute([$name, $slug, $description ?: null]);
    $tagId = (int) $pdo->lastInsertId();
    if ($tagId === 0) {
        $lookup = $pdo->prepare('SELECT id FROM tags WHERE slug = ? LIMIT 1');
        $lookup->execute([$slug]);
        $row = $lookup->fetch();
        $tagId = $row ? (int) $row['id'] : 0;
    }
}

if ($categoryIdsProvided) {
    $pdo->prepare('DELETE FROM tag_categories WHERE tag_id = ?')->execute([$tagId]);
    foreach ($categoryIds as $categoryId) {
        if ($categoryId > 0) {
            $pdo->prepare('INSERT IGNORE INTO tag_categories (tag_id, category_id) VALUES (?, ?)')->execute([$tagId, $categoryId]);
        }
    }
}

json_response(['ok' => true, 'id' => $tagId]);
