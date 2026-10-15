<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../article_policy.php';

require_method('POST');
require_csrf_token();
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$input = input_json();
$articleId = (int) ($input['id'] ?? 0);
if ($articleId <= 0) {
    json_error('Article id is required.');
}

$stmt = db()->prepare(
    'SELECT a.id, a.author_id, a.category_id, a.status, a.slug
     FROM articles a
     WHERE a.id = ? LIMIT 1'
);
$stmt->execute([$articleId]);
$article = $stmt->fetch();
if (!$article) {
    json_error('Article not found.', 404);
}

$isStaff = has_any_role($roles, ['admin', 'editor']);
if (!$isStaff && (int) $article['author_id'] !== (int) $user['id']) {
    json_error('You can only delete your own articles.', 403);
}
if (!$isStaff && $article['status'] !== 'draft') {
    json_error('Only drafts can be deleted by contributors.', 403);
}

db()->prepare('DELETE FROM articles WHERE id = ?')->execute([$articleId]);

if ($article['status'] === 'published') {
    invalidate_article_cache(db(), $article, 'delete');
}

// Issue #121: Immutable audit trail
record_audit_log(db(), (int) $user['id'], 'article_delete', "Deleted article ID {$articleId} slug='{$article['slug']}'", json_encode(['id' => $articleId, 'slug' => $article['slug'], 'status' => $article['status']]), null);

json_response(['ok' => true]);
