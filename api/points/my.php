<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
$user = require_user();

$stmt = db()->prepare(
    'SELECT ph.id, ph.points, ph.reason, ph.created_at, a.title AS article_title, a.slug AS article_slug
     FROM points_history ph
     LEFT JOIN articles a ON a.id = ph.article_id
     WHERE ph.user_id = ?
     ORDER BY ph.created_at DESC
     LIMIT 100'
);
$stmt->execute([(int) $user['id']]);

json_response([
    'points' => (int) ($user['points'] ?? 0),
    'total_points_earned' => (int) ($user['total_points_earned'] ?? 0),
    'history' => $stmt->fetchAll(),
]);
