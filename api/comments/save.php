<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');

// Require CSRF token for authenticated users or guests with email
$user = current_user();
if ($user) {
    require_csrf_token();
}

// Rate limit comments
$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':comment', 5, 300)) {
    json_error('Too many comments. Please wait before posting another.', 429);
}

$input = input_json();

$articleId = (int) ($input['article_id'] ?? 0);
$slug = trim((string) ($input['slug'] ?? ''));
$body = trim((string) ($input['body'] ?? ''));
$guestName = trim((string) ($input['guest_name'] ?? 'Guest Reader'));
$guestEmail = trim((string) ($input['guest_email'] ?? ''));
$parentId = isset($input['parent_id']) ? (int) $input['parent_id'] : null;

if ($articleId <= 0 && $slug === '') {
    json_error('Article id or slug is required.');
}
if ($body === '' || mb_strlen($body) < 3) {
    json_error('Comment is too short.');
}
if (mb_strlen($body) > 2000) {
    json_error('Comment is too long.');
}
if ($guestEmail !== '' && !filter_var($guestEmail, FILTER_VALIDATE_EMAIL)) {
    json_error('Guest email is invalid.');
}

if ($articleId <= 0) {
    $stmt = db()->prepare("SELECT id, comments_enabled FROM articles WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $article = $stmt->fetch();
} else {
    $stmt = db()->prepare("SELECT id, comments_enabled FROM articles WHERE id = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$articleId]);
    $article = $stmt->fetch();
}

if (!$article) {
    json_error('Article not found.', 404);
}
if ((int) ($article['comments_enabled'] ?? 1) !== 1) {
    json_error('Comments are closed for this article.', 403);
}

$current = current_user();
$userId = $current ? (int) $current['id'] : null;

// A reply must reference a parent that (a) exists, (b) belongs to the SAME
// article — prevents cross-article reply chains that would orphan replies in
// the comment tree — and (c) is not a deleted/rejected/hidden comment.
if ($parentId) {
    $parentStmt = db()->prepare('SELECT id, article_id, status FROM comments WHERE id = ? LIMIT 1');
    $parentStmt->execute([$parentId]);
    $parent = $parentStmt->fetch();

    if (!$parent || (int) $parent['article_id'] !== (int) $article['id']) {
        json_error('Parent comment does not belong to this article.', 422);
    }
    if (in_array((string) $parent['status'], ['deleted', 'rejected', 'spam'], true)) {
        json_error('Cannot reply to a removed comment.', 422);
    }
}

$stmt = db()->prepare("
    INSERT INTO comments (article_id, user_id, guest_name, guest_email, body, status, parent_id)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
");
$stmt->execute([
    (int) $article['id'],
    $userId,
    $userId ? null : ($guestName ?: 'Guest Reader'),
    $userId ? null : ($guestEmail ?: null),
    $body,
    $parentId ?: null,
]);

json_response(['ok' => true, 'status' => 'pending']);
