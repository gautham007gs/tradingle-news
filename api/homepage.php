<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET');

$slots = [
    'hero',
    'horizontal_rail',
    'editors_picks',
    'trending',
    'politics',
    'india',
    'world',
    'business',
    'finance',
    'technology',
    'cities',
    'science',
    'entertainment',
    'sports',
    'lifestyle',
    'opinion',
    'below_fold',
    'more_for_you',
    'spotlight',
];

$data = cache_get('homepage_payload', 60);
if ($data === null) {
    $data = build_homepage_payload();
    cache_set('homepage_payload', $data, 60);
}

$data['top_stories'] = $data['horizontal_rail'];

json_response(['data' => $data]);

function build_homepage_payload(): array
{
    $slots = [
        'hero',
        'horizontal_rail',
        'editors_picks',
        'trending',
        'politics',
        'india',
        'world',
        'business',
        'finance',
        'technology',
        'cities',
        'science',
        'entertainment',
        'sports',
        'lifestyle',
        'opinion',
        'below_fold',
        'more_for_you',
        'spotlight',
    ];

    $data = [];

    $articleQuery = "
        SELECT
          a.id, a.title, a.slug, a.excerpt, a.featured_image, a.featured_image_alt,
          a.priority, a.is_live, a.published_at, a.updated_at, a.reading_time_minutes,
          c.name AS category_name, c.slug AS category_slug,
          (SELECT GROUP_CONCAT(t.slug ORDER BY t.name SEPARATOR ',')
           FROM article_tags at_list
           INNER JOIN tags t ON t.id = at_list.tag_id
           WHERE at_list.article_id = a.id) AS tag_slugs,
          u.display_name AS author_name, u.slug AS author_slug, u.avatar_url AS author_avatar,
          hs.sort_order
        FROM homepage_slots hs
        INNER JOIN articles a ON a.id = hs.article_id
        LEFT JOIN categories c ON c.id = a.category_id
        INNER JOIN users u ON u.id = a.author_id
        WHERE hs.slot_key = ?
          AND hs.is_active = 1
          AND a.status = 'published'
          AND (hs.starts_at IS NULL OR hs.starts_at <= UTC_TIMESTAMP())
          AND (hs.ends_at IS NULL OR hs.ends_at >= UTC_TIMESTAMP())
        ORDER BY hs.sort_order ASC, a.published_at DESC
        LIMIT 12
    ";

    foreach ($slots as $slot) {
        try {
            $stmt = db()->prepare($articleQuery);
            $stmt->execute([$slot]);
            $data[$slot] = $stmt->fetchAll();
        } catch (Throwable $e) {
            error_log('Homepage slot skipped: ' . $slot . ' - ' . $e->getMessage());
            $data[$slot] = [];
        }
    }

    // Legacy alias: older admin saves used top_stories
    if (empty($data['horizontal_rail'])) {
        try {
            $stmt = db()->prepare($articleQuery);
            $stmt->execute(['top_stories']);
            $legacy = $stmt->fetchAll();
            if ($legacy) {
                $data['horizontal_rail'] = $legacy;
            }
        } catch (Throwable $e) {
            error_log('Legacy top_stories slot skipped: ' . $e->getMessage());
        }
    }

    return $data;
}
