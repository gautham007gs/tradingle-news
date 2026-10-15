<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$articleId = (int) ($_GET['article_id'] ?? 0);
$slug = trim((string) ($_GET['slug'] ?? ''));

if ($articleId <= 0 && $slug === '') {
    json_error('Article id or slug is required.');
}

if ($articleId <= 0) {
    $stmt = db()->prepare("SELECT id FROM articles WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $article = $stmt->fetch();
    if (!$article) {
        json_error('Article not found.', 404);
    }
    $articleId = (int) $article['id'];
}

$stmt = db()->prepare("
    SELECT
      c.id, c.article_id, c.user_id, c.guest_name, c.body, c.created_at, c.parent_id,
      u.display_name AS user_name, u.avatar_url AS user_avatar
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.article_id = ?
      AND c.status = 'approved'
    ORDER BY c.created_at DESC
    LIMIT 100
");
$stmt->execute([$articleId]);

json_response(['data' => $stmt->fetchAll()]);
