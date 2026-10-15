<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_roles(['admin', 'editor']);

$pdo = db();
$days = max(1, min(90, (int) ($_GET['days'] ?? 30)));

// Helper: safely run a query, return empty on missing table
function safe_query(PDO $pdo, string $sql, array $params = []): array {
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable) {
        return [];
    }
}

$cutoff = date('Y-m-d H:i:s', strtotime("-{$days} days"));

// Total page views
$totalViews = safe_query($pdo,
    "SELECT COUNT(*) AS cnt FROM analytics_events
     WHERE event_name = 'page_view' AND created_at >= ?",
    [$cutoff]
);
$totalViews = (int) ($totalViews[0]['cnt'] ?? 0);

// Unique visitors (distinct visitor_id in events)
$uniqueVisitors = safe_query($pdo,
    "SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.visitor_id'))) AS cnt
     FROM analytics_events
     WHERE event_name = 'page_view' AND created_at >= ?
       AND JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.visitor_id')) IS NOT NULL
       AND JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.visitor_id')) != 'null'",
    [$cutoff]
);
$uniqueVisitors = (int) ($uniqueVisitors[0]['cnt'] ?? 0);

// Views per day (last N days)
$viewsByDay = safe_query($pdo,
    "SELECT DATE(created_at) AS day, COUNT(*) AS views
     FROM analytics_events
     WHERE event_name = 'page_view' AND created_at >= ?
     GROUP BY DATE(created_at)
     ORDER BY day ASC",
    [$cutoff]
);

// Top pages by views
$topPages = safe_query($pdo,
    "SELECT page_path, COUNT(*) AS views
     FROM analytics_events
     WHERE event_name = 'page_view' AND created_at >= ?
       AND page_path IS NOT NULL
     GROUP BY page_path
     ORDER BY views DESC
     LIMIT 10",
    [$cutoff]
);

// Top pages mapped to articles
$topArticles = [];
foreach ($topPages as $row) {
    $slug = basename(trim($row['page_path'] ?? '', '/'));
    if ($slug === '' || $slug === '/') continue;
    $topArticles[] = [
        'path'  => $row['page_path'],
        'slug'  => $slug,
        'views' => (int) $row['views'],
    ];
}

// Core Web Vitals averages (LCP, CLS, FID/INP)
$vitals = safe_query($pdo,
    "SELECT metric_name,
            ROUND(AVG(metric_value), 2) AS avg_val,
            COUNT(*) AS cnt
     FROM analytics_events
     WHERE event_name = 'web_vital' AND metric_name IN ('LCP','CLS','FID','INP','TTFB')
       AND created_at >= ?
     GROUP BY metric_name",
    [$cutoff]
);

// Total articles published this period — from articles table
$publishedInPeriod = safe_query($pdo,
    "SELECT COUNT(*) AS cnt FROM articles
     WHERE status = 'published' AND published_at >= ?",
    [$cutoff]
);
$publishedInPeriod = (int) ($publishedInPeriod[0]['cnt'] ?? 0);

// Breaking articles currently active
$breakingCount = safe_query($pdo,
    "SELECT COUNT(*) AS cnt FROM articles WHERE priority = 'breaking' AND status = 'published'"
);
$breakingCount = (int) ($breakingCount[0]['cnt'] ?? 0);

// Total registered users
$totalUsers = safe_query($pdo, "SELECT COUNT(*) AS cnt FROM users");
$totalUsers = (int) ($totalUsers[0]['cnt'] ?? 0);

json_response([
    'ok'               => true,
    'days'             => $days,
    'total_views'      => $totalViews,
    'unique_visitors'  => $uniqueVisitors,
    'published_period' => $publishedInPeriod,
    'breaking_active'  => $breakingCount,
    'total_users'      => $totalUsers,
    'views_by_day'     => $viewsByDay,
    'top_articles'     => $topArticles,
    'vitals'           => $vitals,
]);
