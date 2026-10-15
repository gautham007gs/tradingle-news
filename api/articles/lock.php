<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$method  = $_SERVER['REQUEST_METHOD'];
$input   = $method === 'POST' ? input_json() : [];
$articleId = (int) ($input['article_id'] ?? $_GET['article_id'] ?? 0);

// Lock acquire/release both mutate state; GET (status read) is exempt.
if ($method !== 'GET') {
    require_csrf_token();
}

if ($articleId <= 0) {
    json_error('article_id is required.', 400);
}

$pdo = db();

// Ensure lock columns exist (one-time migration — safe to run repeatedly)
try {
    $pdo->exec("ALTER TABLE articles
        ADD COLUMN IF NOT EXISTS lock_held_by   BIGINT UNSIGNED NULL,
        ADD COLUMN IF NOT EXISTS lock_expires_at DATETIME       NULL");
} catch (Throwable) { /* columns already exist */ }

// Acquiring a lock is a state change and must respect the same edit rules as
// saving (issue #5): staff may lock anything they can publish; authors and
// contributors may only lock their own draft/pending submissions.
$target = $pdo->prepare('SELECT author_id, status FROM articles WHERE id = ? LIMIT 1');
$target->execute([$articleId]);
$targetRow = $target->fetch();
if (!$targetRow) {
    json_error('Article not found.', 404);
}
$isStaff = has_any_role($roles, ['admin', 'editor']);
if (!$isStaff && (int) $targetRow['author_id'] !== (int) $user['id']) {
    json_error('You can only lock your own articles.', 403);
}
if (!$isStaff && in_array($targetRow['status'], ['pending_review', 'published'], true)) {
    json_error('This submission is locked.', 403);
}

$LOCK_SECONDS = 90; // editor is considered "gone" after 90 s of silence

// ── DELETE: release lock ──────────────────────────────────────────────
if ($method === 'DELETE' || ($method === 'POST' && ($input['_method'] ?? '') === 'DELETE')) {
    $pdo->prepare(
        'UPDATE articles
         SET lock_held_by = NULL, lock_expires_at = NULL
         WHERE id = ? AND lock_held_by = ?'
    )->execute([$articleId, (int) $user['id']]);
    json_response(['ok' => true]);
}

// ── POST: acquire or renew lock ───────────────────────────────────────
require_method('POST');

// Atomically acquire lock if: unclaimed, owned by same user, or expired
$stmt = $pdo->prepare(
    'UPDATE articles
     SET lock_held_by    = ?,
         lock_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
     WHERE id = ?
       AND (lock_held_by IS NULL
            OR lock_held_by = ?
            OR lock_expires_at < UTC_TIMESTAMP())'
);
$stmt->execute([(int) $user['id'], $LOCK_SECONDS, $articleId, (int) $user['id']]);

if ($stmt->rowCount() > 0) {
    json_response(['locked' => true, 'by_me' => true, 'expires_in' => $LOCK_SECONDS]);
}

// Lock held by someone else — return their info
$holder = $pdo->prepare(
    'SELECT u.display_name, u.avatar_url, a.lock_expires_at
     FROM   articles a
     JOIN   users   u ON u.id = a.lock_held_by
     WHERE  a.id = ? AND a.lock_expires_at > UTC_TIMESTAMP()
     LIMIT  1'
);
$holder->execute([$articleId]);
$row = $holder->fetch();

if (!$row) {
    // Race condition: lock expired between the UPDATE and SELECT — try again
    $pdo->prepare(
        'UPDATE articles
         SET lock_held_by = ?, lock_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
         WHERE id = ? AND (lock_held_by IS NULL OR lock_expires_at < UTC_TIMESTAMP())'
    )->execute([(int) $user['id'], $LOCK_SECONDS, $articleId]);
    json_response(['locked' => true, 'by_me' => true, 'expires_in' => $LOCK_SECONDS]);
}

json_response([
    'locked'       => true,
    'by_me'        => false,
    'held_by'      => $row['display_name'],
    'held_by_avatar' => $row['avatar_url'] ?? null,
    'expires_at'   => $row['lock_expires_at'],
], 423);
