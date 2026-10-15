<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
require_roles(['admin', 'editor']);

$base = rtrim(FRONTEND_URL, '/');

$publishedIndexed = (int) db()->query(
    "SELECT COUNT(*) AS c FROM articles
     WHERE status = 'published' AND slug IS NOT NULL AND slug <> '' AND COALESCE(robots_index, 1) = 1"
)->fetch()['c'];

$publishedExcluded = (int) db()->query(
    "SELECT COUNT(*) AS c FROM articles
     WHERE status = 'published' AND (COALESCE(robots_index, 1) = 0 OR slug IS NULL OR slug = '')"
)->fetch()['c'];

$windowHours = 48;
$windowRow = db()->query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'news_sitemap_window_hours'"
)->fetch();
if ($windowRow && is_numeric($windowRow['setting_value'])) {
    $parsed = (int) $windowRow['setting_value'];
    if ($parsed >= 1) $windowHours = $parsed;
}

$newsEligible = (int) db()->query(
    "SELECT COUNT(*) AS c FROM articles
     WHERE status = 'published' AND slug IS NOT NULL AND slug <> ''
       AND COALESCE(robots_index, 1) = 1
       AND published_at IS NOT NULL
       AND published_at >= (UTC_TIMESTAMP() - INTERVAL $windowHours HOUR)"
)->fetch()['c'];

$categoryCount = (int) db()->query("SELECT COUNT(*) AS c FROM categories WHERE slug IS NOT NULL AND slug <> ''")->fetch()['c'];

$authorCount = (int) db()->query(
    "SELECT COUNT(*) AS c FROM users WHERE slug IS NOT NULL AND slug <> '' AND status = 'active' AND (is_byline_author = 1 OR role_title IN ('Author','Editor','Admin'))"
)->fetch()['c'];

$latest = db()->query(
    "SELECT a.title, a.slug, c.slug AS category_slug, a.published_at
     FROM articles a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.status = 'published' AND COALESCE(a.robots_index, 1) = 1
     ORDER BY a.published_at DESC LIMIT 5"
)->fetchAll();

json_response([
    'base_url' => $base,
    'sitemaps' => [
        ['label' => 'Sitemap index', 'url' => $base . '/sitemap-index.xml'],
        ['label' => 'Main sitemap', 'url' => $base . '/sitemap.xml'],
        ['label' => 'Google News sitemap', 'url' => $base . '/news-sitemap.xml'],
        ['label' => 'robots.txt', 'url' => $base . '/robots.txt'],
    ],
    'stats' => [
        'published_indexed' => $publishedIndexed,
        'published_excluded' => $publishedExcluded,
        'news_eligible' => $newsEligible,
        'news_window_hours' => $windowHours,
        'categories' => $categoryCount,
        'authors' => $authorCount,
    ],
    'recent' => $latest,
]);
