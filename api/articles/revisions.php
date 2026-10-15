<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
[$user, $roles] = require_roles(['admin', 'editor', 'author']);

$articleId = (int) ($_GET['id'] ?? 0);
if ($articleId <= 0) {
    json_error('Article id is required.');
}

$articleStmt = db()->prepare('SELECT id, author_id FROM articles WHERE id = ? LIMIT 1');
$articleStmt->execute([$articleId]);
$article = $articleStmt->fetch();
if (!$article) {
    json_error('Article not found.', 404);
}

$isStaff = has_any_role($roles, ['admin', 'editor']);
if (!$isStaff && (int) $article['author_id'] !== (int) $user['id']) {
    json_error('You can only view revisions for your own articles.', 403);
}

$stmt = db()->prepare("
    SELECT
      ar.id, ar.article_id, ar.editor_id, ar.title, ar.excerpt, ar.content,
      ar.status, ar.revision_note, ar.created_at,
      u.display_name AS editor_name
    FROM article_revisions ar
    LEFT JOIN users u ON u.id = ar.editor_id
    WHERE ar.article_id = ?
    ORDER BY ar.created_at DESC, ar.id DESC
    LIMIT 50
");
$stmt->execute([$articleId]);

json_response(['data' => $stmt->fetchAll()]);
