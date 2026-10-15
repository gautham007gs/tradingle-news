<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$slug = trim((string) ($_GET['slug'] ?? ''));
if ($slug === '') {
    json_error('Author slug is required.');
}

$stmt = db()->prepare(
    "SELECT id, display_name, slug, avatar_url, bio, role_title, social_x, social_linkedin, social_website
     FROM users
     WHERE slug = ? AND status = 'active'
     LIMIT 1"
);
$stmt->execute([$slug]);
$author = $stmt->fetch();

if (!$author) {
    json_response(['author' => null, 'articles' => []]);
}

$articlesStmt = db()->prepare(
    "SELECT id, slug, title, excerpt, featured_image, published_at
     FROM articles
     WHERE author_id = ? AND status = 'published'
     ORDER BY published_at DESC, updated_at DESC
     LIMIT 24"
);
$articlesStmt->execute([(int) $author['id']]);

json_response([
    'author' => [
        'id' => (int) $author['id'],
        'display_name' => $author['display_name'],
        'slug' => $author['slug'],
        'avatar_url' => $author['avatar_url'] ?? null,
        'bio' => $author['bio'] ?? null,
        'role_title' => $author['role_title'] ?? null,
        'social_x' => $author['social_x'] ?? null,
        'social_linkedin' => $author['social_linkedin'] ?? null,
        'social_website' => $author['social_website'] ?? null,
    ],
    'articles' => $articlesStmt->fetchAll(),
]);
