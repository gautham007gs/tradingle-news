<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$user = current_user();
if (!$user) {
    json_response(['bookmarked' => false]);
}

$articleId = isset($_GET['article_id']) ? (int) $_GET['article_id'] : 0;
$slug = trim((string) ($_GET['slug'] ?? ''));
if ($articleId <= 0 && $slug !== '') {
    $stmt = db()->prepare('SELECT id FROM articles WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $article = $stmt->fetch();
    $articleId = $article ? (int) $article['id'] : 0;
}

if ($articleId <= 0) {
    json_response(['bookmarked' => false]);
}

$stmt = db()->prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND article_id = ? LIMIT 1');
$stmt->execute([(int) $user['id'], $articleId]);

json_response(['bookmarked' => (bool) $stmt->fetchColumn()]);
