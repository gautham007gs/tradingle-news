<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
$user = require_user();

$input = input_json();
$articleId = isset($input['article_id']) ? (int) $input['article_id'] : 0;
$slug = trim((string) ($input['slug'] ?? ''));

if ($articleId <= 0 && $slug !== '') {
    $stmt = db()->prepare('SELECT id FROM articles WHERE slug = ? AND status = "published" LIMIT 1');
    $stmt->execute([$slug]);
    $article = $stmt->fetch();
    $articleId = $article ? (int) $article['id'] : 0;
}

if ($articleId <= 0) {
    json_error('Article not found.', 404);
}

$check = db()->prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND article_id = ? LIMIT 1');
$check->execute([(int) $user['id'], $articleId]);

if ($check->fetchColumn()) {
    $stmt = db()->prepare('DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?');
    $stmt->execute([(int) $user['id'], $articleId]);
    json_response(['bookmarked' => false]);
}

$stmt = db()->prepare('INSERT INTO bookmarks (user_id, article_id) VALUES (?, ?)');
$stmt->execute([(int) $user['id'], $articleId]);

json_response(['bookmarked' => true]);
