<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
require_roles(['admin', 'editor']);

ensure_cms_schema_upgrades(db());

$input = input_json();
$id = (int) ($input['id'] ?? 0);
$name = trim((string) ($input['name'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$slug = trim((string) ($input['slug'] ?? ''));
$parentId = isset($input['parent_id']) && $input['parent_id'] !== '' && $input['parent_id'] !== null ? (int) $input['parent_id'] : null;
$sortOrder = isset($input['sort_order']) && $input['sort_order'] !== '' ? (int) $input['sort_order'] : 0;
$imageUrl = trim((string) ($input['image_url'] ?? ''));
$seoTitle = trim((string) ($input['seo_title'] ?? ''));
$seoDescription = trim((string) ($input['seo_description'] ?? ''));
$showInNav = array_key_exists('show_in_nav', $input) ? (int) (bool) $input['show_in_nav'] : 1;
$navLabel = trim((string) ($input['nav_label'] ?? ''));
$navOrder = isset($input['nav_order']) && $input['nav_order'] !== '' ? (int) $input['nav_order'] : 0;
$color = trim((string) ($input['color'] ?? ''));

if ($name === '') {
    json_error('Category name is required.');
}

$slug = $slug !== '' ? slugify_php($slug) : slugify_php($name);

if ($parentId !== null && $id > 0 && $parentId === $id) {
    json_error('A category cannot be its own parent.');
}

if ($id > 0) {
    $stmt = db()->prepare(
        'UPDATE categories
         SET name = ?, slug = ?, description = ?, parent_id = ?, sort_order = ?, image_url = ?, seo_title = ?, seo_description = ?,
             show_in_nav = ?, nav_label = ?, nav_order = ?, color = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );
    $stmt->execute([
        $name, $slug, $description ?: null, $parentId, $sortOrder,
        $imageUrl ?: null, $seoTitle ?: null, $seoDescription ?: null,
        $showInNav, $navLabel ?: null, $navOrder, $color ?: null, $id,
    ]);
    json_response(['ok' => true, 'id' => $id]);
}

$stmt = db()->prepare(
    'INSERT INTO categories (name, slug, description, parent_id, sort_order, image_url, seo_title, seo_description, show_in_nav, nav_label, nav_order, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), parent_id = VALUES(parent_id),
       sort_order = VALUES(sort_order), image_url = VALUES(image_url), seo_title = VALUES(seo_title),
       seo_description = VALUES(seo_description), show_in_nav = VALUES(show_in_nav), nav_label = VALUES(nav_label),
       nav_order = VALUES(nav_order), color = VALUES(color), updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute([
    $name, $slug, $description ?: null, $parentId, $sortOrder, $imageUrl ?: null, $seoTitle ?: null, $seoDescription ?: null,
    $showInNav, $navLabel ?: null, $navOrder, $color ?: null,
]);

json_response(['ok' => true, 'id' => (int) db()->lastInsertId()]);
