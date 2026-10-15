<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

// Paginated, published-articles endpoint for sitemap generation.
// Every sitemap URL and image loc is built from this single source so the
// sitemap-index, article segments, canonical tags and internal links can never
// drift apart. Returns JSON; the Next.js sitemap routes render the XML.
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = max(1, min(1000, (int) ($_GET['per_page'] ?? 1000)));
$offset = ($page - 1) * $perPage;

$pdo = db();

$countStmt = $pdo->query(
    "SELECT COUNT(*) AS total
     FROM articles
     WHERE status = 'published'
       AND slug IS NOT NULL AND slug <> ''
       AND COALESCE(robots_index, 1) = 1"
);
$total = (int) ($countStmt->fetch()['total'] ?? 0);

$totalPages = $perPage > 0 ? (int) ceil($total / $perPage) : 0;

$stmt = $pdo->query(
    "SELECT a.slug, a.title, a.featured_image, a.featured_image_alt,
            a.published_at, a.updated_at, a.google_news_exclude,
            c.slug AS category_slug
     FROM articles a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.status = 'published'
       AND a.slug IS NOT NULL AND a.slug <> ''
       AND COALESCE(a.robots_index, 1) = 1
     ORDER BY a.id ASC
     LIMIT {$perPage} OFFSET {$offset}"
);

$data = array_map(static function (array $row): array {
    return [
        'slug' => (string) $row['slug'],
        'title' => (string) $row['title'],
        'category_slug' => trim((string) ($row['category_slug'] ?? '')) ?: 'latest',
        'published_at' => $row['published_at'],
        'updated_at' => $row['updated_at'],
        'featured_image' => absolute_asset_url($row['featured_image']),
        'featured_image_alt' => (string) ($row['featured_image_alt'] ?? ''),
        'google_news_exclude' => !empty($row['google_news_exclude']),
    ];
}, $stmt->fetchAll());

json_response([
    'total' => $total,
    'page' => $page,
    'per_page' => $perPage,
    'total_pages' => $totalPages,
    'data' => $data,
]);
