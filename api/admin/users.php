<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
require_roles(['admin']);

$users = db()->query(
    "SELECT id, email, display_name, slug, avatar_url, bio, role_title, points, total_points_earned, status, created_at
     FROM users
     WHERE status <> 'deleted'
     ORDER BY created_at DESC"
)->fetchAll();

$rolesRows = db()->query(
    'SELECT ur.user_id, r.name
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id'
)->fetchAll();

$rolesByUser = [];
foreach ($rolesRows as $row) {
    $userId = (int) $row['user_id'];
    $rolesByUser[$userId] ??= [];
    $rolesByUser[$userId][] = $row['name'];
}

$data = array_map(static function (array $user) use ($rolesByUser): array {
    $id = (int) $user['id'];
    return [
        'id' => $id,
        'email' => $user['email'],
        'display_name' => $user['display_name'],
        'slug' => $user['slug'],
        'avatar_url' => $user['avatar_url'] ?? null,
        'bio' => $user['bio'] ?? null,
        'role_title' => $user['role_title'] ?? null,
        'points' => (int) ($user['points'] ?? 0),
        'total_points_earned' => (int) ($user['total_points_earned'] ?? 0),
        'status' => $user['status'],
        'created_at' => $user['created_at'],
        'roles' => $rolesByUser[$id] ?? [],
    ];
}, $users);

json_response(['users' => $data]);
