<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin']);

$id = (int) (input_json()['id'] ?? 0);
if ($id <= 0) {
    json_error('Tag id is required.');
}

$pdo = db();

// Fetch tag name before deletion for audit log
$tagRow = $pdo->prepare('SELECT name FROM tags WHERE id = ? LIMIT 1');
$tagRow->execute([$id]);
$tag = $tagRow->fetch() ?: ['name' => '(unknown)'];

$pdo->beginTransaction();
try {
    // Explicitly clean junction rows inside a transaction (issue #115)
    $pdo->prepare('DELETE FROM article_tags WHERE tag_id = ?')->execute([$id]);
    
    // Check if tag_categories table exists before trying to delete
    try {
        $pdo->prepare('DELETE FROM tag_categories WHERE tag_id = ?')->execute([$id]);
    } catch (Throwable) {
        // Table might not exist in all installations
    }
    
    $pdo->prepare('DELETE FROM tags WHERE id = ?')->execute([$id]);
    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Failed to delete tag: ' . $e->getMessage(), 500);
}

// Issue #121: Immutable audit trail
record_audit_log($pdo, (int) $user['id'], 'tag_delete', "Deleted tag ID {$id} name='{$tag['name']}'", json_encode(['id' => $id, 'name' => $tag['name']]), null);

json_response(['ok' => true]);
