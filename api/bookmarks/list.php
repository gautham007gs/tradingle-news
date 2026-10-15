<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
$user = require_user();

$limit = max(1, min(100, (int) ($_GET['limit'] ?? 50)));

$sql = '
    SELECT
      a.id, a.title, a.slug, a.excerpt, a.featured_image, a.featured_image_alt,
      a.status, a.priority, a.is_live, a.is_sponsored, a.sponsor_name, a.sponsor_disclosure,
      a.published_at, a.scheduled_at, a.updated_at, a.views,
      a.points_awarded, a.review_notes,
      a.reading_time_minutes, a.seo_title, a.seo_description, a.seo_og_image,
      c.name AS category_name, c.slug AS category_slug,
      u.display_name AS author_name, u.slug AS author_slug, u.avatar_url AS author_avatar,
      b.created_at AS bookmarked_at
    FROM bookmarks b
    INNER JOIN articles a ON a.id = b.article_id
    LEFT JOIN categories c ON c.id = a.category_id
    INNER JOIN users u ON u.id = a.author_id
    WHERE b.user_id = ? AND a.status = "published"
    ORDER BY b.created_at DESC
    LIMIT ' . $limit;

$stmt = db()->prepare($sql);
$stmt->execute([(int) $user['id']]);

json_response(['data' => $stmt->fetchAll()]);
