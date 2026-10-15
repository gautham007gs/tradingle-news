<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin']);

$id = (int) (input_json()['id'] ?? 0);
if ($id <= 0) {
    json_error('Category id is required.');
}

$pdo = db();

// Fetch category details before deletion for audit log
$catRow = $pdo->prepare('SELECT name, slug FROM categories WHERE id = ? LIMIT 1');
$catRow->execute([$id]);
$category = $catRow->fetch() ?: ['name' => '(unknown)', 'slug' => ''];

// Check if this category has subcategories (child categories)
$subQ = $pdo->prepare('SELECT COUNT(*) AS count FROM categories WHERE parent_id = ?');
$subQ->execute([$id]);
if (((int) ($subQ->fetch()['count'] ?? 0)) > 0) {
    json_error('Cannot delete category: it has subcategories. Reassign or delete them first.', 409);
}

// Check if this category is assigned to any articles as primary category
$artQ = $pdo->prepare('SELECT COUNT(*) AS count FROM articles WHERE category_id = ?');
$artQ->execute([$id]);
if (((int) ($artQ->fetch()['count'] ?? 0)) > 0) {
    json_error('Cannot delete category: it is assigned as primary category to articles. Reassign those articles first.', 409);
}

// Wrap cleanup in a transaction
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM article_categories WHERE category_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Failed to delete category: ' . $e->getMessage(), 500);
}

// Issue #121: Immutable audit trail
record_audit_log($pdo, (int) $user['id'], 'category_delete', "Deleted category ID {$id} slug='{$category['slug']}'", json_encode(['id' => $id, 'name' => $category['name'], 'slug' => $category['slug']]), null);

json_response(['ok' => true]);
