<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
require_roles(['admin', 'editor']);

$rows = db()->query(
    "SELECT
        ph.id, ph.points, ph.reason, ph.created_at, ph.user_id, ph.article_id,
        u.display_name AS user_display_name, u.slug AS user_slug,
        a.title AS article_title, a.slug AS article_slug, c.slug AS article_category_slug
     FROM points_history ph
     INNER JOIN users u ON u.id = ph.user_id
     LEFT JOIN articles a ON a.id = ph.article_id
     LEFT JOIN categories c ON c.id = a.category_id
     ORDER BY ph.created_at DESC
     LIMIT 200"
)->fetchAll();

$data = array_map(static fn (array $row): array => [
    'id' => (int) $row['id'],
    'points' => (int) $row['points'],
    'reason' => $row['reason'],
    'created_at' => $row['created_at'],
    'user_id' => (int) $row['user_id'],
    'article_id' => $row['article_id'] !== null ? (int) $row['article_id'] : null,
    'user' => [
        'display_name' => $row['user_display_name'],
        'slug' => $row['user_slug'],
    ],
    'article' => $row['article_id'] !== null ? [
        'title' => $row['article_title'],
        'slug' => $row['article_slug'],
        'category_slug' => $row['article_category_slug'],
    ] : null,
], $rows);

$leaders = db()->query(
    "SELECT id, display_name, slug, points, total_points_earned
     FROM users
     WHERE total_points_earned > 0 AND status = 'active'
     ORDER BY total_points_earned DESC
     LIMIT 8"
)->fetchAll();

$totalsRow = db()->query(
    'SELECT
        COALESCE(SUM(points), 0) AS awarded,
        COUNT(DISTINCT user_id) AS contributors,
        COUNT(DISTINCT article_id) AS articles
     FROM points_history'
)->fetch();

json_response([
    'rows' => $data,
    'leaders' => array_map(static fn (array $leader): array => [
        'id' => (int) $leader['id'],
        'display_name' => $leader['display_name'],
        'slug' => $leader['slug'],
        'points' => (int) $leader['points'],
        'total_points_earned' => (int) $leader['total_points_earned'],
    ], $leaders),
    'totals' => [
        'awarded' => (int) $totalsRow['awarded'],
        'contributors' => (int) $totalsRow['contributors'],
        'articles' => (int) $totalsRow['articles'],
    ],
]);
