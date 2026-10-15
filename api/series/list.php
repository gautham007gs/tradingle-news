<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$pdo = db();
try {
    ensure_cms_schema_upgrades($pdo);
} catch (Throwable $e) {
    error_log('series/list schema upgrade skipped: ' . $e->getMessage());
}

$stmt = $pdo->query(
    "SELECT s.id, s.name, s.slug, s.description, s.image_url, s.is_active,
            s.sort_order, s.seo_title, s.seo_description, s.created_at, s.updated_at,
            COUNT(a.id) AS article_count
     FROM article_series s
     LEFT JOIN articles a ON a.series_id = s.id AND a.status = 'published'
     GROUP BY s.id
     ORDER BY s.sort_order ASC, s.name ASC"
);

json_response(['data' => $stmt->fetchAll()]);
