<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $articleId = isset($_GET['article_id']) ? (int) $_GET['article_id'] : 0;
    if ($articleId <= 0 && isset($_GET['slug'])) {
        $stmt = db()->prepare('SELECT id FROM articles WHERE slug = ? AND status = "published" LIMIT 1');
        $stmt->execute([trim((string) $_GET['slug'])]);
        $article = $stmt->fetch();
        $articleId = $article ? (int) $article['id'] : 0;
    }
    if ($articleId <= 0) {
        json_response(['data' => []]);
    }

    // Read-path visibility (issue #9): only live updates for published
    // articles are ever returned. A direct article_id pointing at a draft or
    // deleted article yields an empty list — never its internal updates.
    $publishedChk = db()->prepare('SELECT id FROM articles WHERE id = ? AND status = "published" LIMIT 1');
    $publishedChk->execute([$articleId]);
    if (!$publishedChk->fetchColumn()) {
        json_response(['data' => []]);
    }

    $stmt = db()->prepare(
        'SELECT id, article_id, update_title, update_body, update_time
         FROM article_live_updates
         WHERE article_id = ?
         ORDER BY update_time DESC, id DESC'
    );
    $stmt->execute([$articleId]);
    json_response(['data' => $stmt->fetchAll()]);
}

require_method('POST');
require_csrf_token();
[$user, $roles] = require_roles(['admin', 'editor', 'author']);
$input = input_json();
$articleId = (int) ($input['article_id'] ?? 0);
$body = trim((string) ($input['update_body'] ?? ''));
$title = trim((string) ($input['update_title'] ?? ''));

if ($articleId <= 0 || $body === '') {
    json_error('Article and update body are required.');
}

// Write-path authz (issue #9): staff may add live updates to any article;
// authors/contributors may only add them to their own unpublished work. This
// stops an author from appending updates to someone else's (or a published)
// story that renders on the public page.
$target = db()->prepare('SELECT author_id, status FROM articles WHERE id = ? LIMIT 1');
$target->execute([$articleId]);
$targetRow = $target->fetch();
if (!$targetRow) {
    json_error('Article not found.', 404);
}
$isStaff = has_any_role($roles, ['admin', 'editor']);
if (!$isStaff && (int) $targetRow['author_id'] !== (int) $user['id']) {
    json_error('You can only add live updates to your own articles.', 403);
}
if (!$isStaff && $targetRow['status'] === 'published') {
    json_error('Published articles can only be updated by staff.', 403);
}

$stmt = db()->prepare(
    'INSERT INTO article_live_updates (article_id, update_title, update_body, update_time, created_by)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)'
);
$stmt->execute([$articleId, $title ?: null, $body, (int) $user['id']]);

json_response(['ok' => true, 'id' => (int) db()->lastInsertId()]);
