<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$pdo = db();

try {
    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.title,
            a.slug,
            a.status,
            u.id          AS editor_id,
            u.display_name AS editor_name,
            u.avatar_url   AS editor_avatar,
            a.lock_expires_at
        FROM   articles a
        JOIN   users    u ON u.id = a.lock_held_by
        WHERE  a.lock_held_by IS NOT NULL
          AND  a.lock_expires_at > UTC_TIMESTAMP()
        ORDER  BY a.lock_expires_at DESC
    ");
    $stmt->execute();
    $locks = array_map(function ($row) use ($user) {
        return [
            'article_id'     => (string) $row['id'],
            'article_title'  => $row['title'],
            'article_slug'   => $row['slug'],
            'article_status' => $row['status'],
            'editor_id'      => (string) $row['editor_id'],
            'editor_name'    => $row['editor_name'],
            'editor_avatar'  => $row['editor_avatar'],
            'is_me'          => (int) $row['editor_id'] === (int) $user['id'],
            'expires_at'     => $row['lock_expires_at'],
        ];
    }, $stmt->fetchAll());
} catch (Throwable) {
    // lock columns not yet created (lock.php never called) — return empty
    $locks = [];
}

// Short TTL: live-editing status should feel real-time
header('Cache-Control: no-store');
json_response(['data' => $locks]);
