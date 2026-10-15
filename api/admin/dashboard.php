<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
[$user, $roles] = require_roles(['admin', 'editor', 'author']);

$isStaff = has_any_role($roles, ['admin', 'editor']);
$whereMine = $isStaff ? '' : ' WHERE author_id = ' . (int) $user['id'];

$total = (int) db()->query('SELECT COUNT(*) AS c FROM articles' . $whereMine)->fetch()['c'];
$published = (int) db()->query("SELECT COUNT(*) AS c FROM articles WHERE status = 'published'" . ($isStaff ? '' : ' AND author_id = ' . (int) $user['id']))->fetch()['c'];
$draft = (int) db()->query("SELECT COUNT(*) AS c FROM articles WHERE status = 'draft'" . ($isStaff ? '' : ' AND author_id = ' . (int) $user['id']))->fetch()['c'];
$pending = (int) db()->query("SELECT COUNT(*) AS c FROM articles WHERE status = 'pending_review'" . ($isStaff ? '' : ' AND author_id = ' . (int) $user['id']))->fetch()['c'];
$views = (int) db()->query('SELECT COALESCE(SUM(views), 0) AS c FROM articles' . $whereMine)->fetch()['c'];

$recentStmt = db()->query(
    "SELECT id, title, slug, status, updated_at, views
     FROM articles" . $whereMine . "
     ORDER BY updated_at DESC
     LIMIT 8"
);

json_response([
    'stats' => [
        'total' => $total,
        'published' => $published,
        'draft' => $draft,
        'pending' => $pending,
        'views' => $views,
    ],
    'recent' => $recentStmt->fetchAll(),
]);
