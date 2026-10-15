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
    error_log('series/save schema upgrade skipped: ' . $e->getMessage());
}

$input = input_json();
$id           = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;
$name         = trim((string) ($input['name'] ?? ''));
$slug         = trim((string) ($input['slug'] ?? ''));
$description  = trim((string) ($input['description'] ?? ''));
$imageUrl     = trim((string) ($input['image_url'] ?? ''));
$isActive     = !array_key_exists('is_active', $input) || (bool) $input['is_active'];
$sortOrder    = isset($input['sort_order']) ? (int) $input['sort_order'] : 0;
$seoTitle     = trim((string) ($input['seo_title'] ?? ''));
$seoDescription = trim((string) ($input['seo_description'] ?? ''));

if ($name === '') {
    json_error('Series name is required.');
}

$slug = $slug !== '' ? slugify_php($slug) : slugify_php($name);

if ($id !== null) {
    // Check slug collision
    $check = $pdo->prepare('SELECT id FROM article_series WHERE slug = ? AND id != ? LIMIT 1');
    $check->execute([$slug, $id]);
    if ($check->fetch()) {
        json_error('Another series already uses this slug.');
    }
    $stmt = $pdo->prepare(
        'UPDATE article_series
         SET name = ?, slug = ?, description = ?, image_url = ?, is_active = ?, sort_order = ?,
             seo_title = ?, seo_description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );
    $stmt->execute([
        $name, $slug, $description ?: null, $imageUrl ?: null, $isActive ? 1 : 0, $sortOrder,
        $seoTitle ?: null, $seoDescription ?: null, $id,
    ]);
    json_response(['ok' => true, 'id' => $id]);
}

$stmt = $pdo->prepare(
    'INSERT INTO article_series (name, slug, description, image_url, is_active, sort_order, seo_title, seo_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), description = VALUES(description), image_url = VALUES(image_url),
       is_active = VALUES(is_active), sort_order = VALUES(sort_order),
       seo_title = VALUES(seo_title), seo_description = VALUES(seo_description),
       updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute([
    $name, $slug, $description ?: null, $imageUrl ?: null,
    $isActive ? 1 : 0, $sortOrder, $seoTitle ?: null, $seoDescription ?: null,
]);
json_response(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
