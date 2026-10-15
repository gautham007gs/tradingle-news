<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$status = $_GET['status'] ?? 'published';
$category = trim((string) ($_GET['category'] ?? ''));
$tag = trim((string) ($_GET['tag'] ?? ''));
$author = trim((string) ($_GET['author'] ?? ''));
$q = trim((string) ($_GET['q'] ?? ''));
$priority = trim((string) ($_GET['priority'] ?? ''));
$limit = max(1, min(100, (int) ($_GET['limit'] ?? 30)));
$offset = max(0, (int) ($_GET['offset'] ?? 0));

$allowedStatuses = ['draft', 'pending_review', 'published', 'rejected', 'archived', 'scheduled', 'all', 'mine'];
if (!in_array($status, $allowedStatuses, true)) {
    $status = 'published';
}

$current = current_user();
$roles = $current ? current_user_roles((int) $current['id']) : [];
$isStaff = $current && has_any_role($roles, ['admin', 'editor']);

$where = [];
$params = [];

// Public queries are whitelisted explicitly: only "published" is public.
// Every other status (draft, pending_review, rejected, scheduled, archived,
// all) contains unreleased content and is staff-only. Never trust a requested
// status to grant access on its own.
$publicStatuses = ['published'];
$staffStatuses = ['draft', 'pending_review', 'rejected', 'scheduled', 'archived', 'all'];

if ($status === 'mine') {
    if (!$current) {
        json_error('Authentication required.', 401);
    }
    $where[] = 'a.author_id = ?';
    $params[] = (int) $current['id'];
} elseif (in_array($status, $publicStatuses, true)) {
    $where[] = 'a.status = ?';
    $params[] = $status;
} elseif (in_array($status, $staffStatuses, true)) {
    if (!$isStaff) {
        json_error('Staff access required.', 403);
    }
    if ($status === 'all') {
        // no status filter: staff see every status
    } else {
        $where[] = 'a.status = ?';
        $params[] = $status;
    }
} else {
    // Unknown status requested: fall back to the public default, never leak.
    $where[] = 'a.status = ?';
    $params[] = 'published';
}

if ($category !== '' && $category !== 'latest') {
    $where[] = 'c.slug = ?';
    $params[] = $category;
}

if ($tag !== '') {
    $where[] = 'EXISTS (
        SELECT 1
        FROM article_tags at_filter
        INNER JOIN tags t_filter ON t_filter.id = at_filter.tag_id
        WHERE at_filter.article_id = a.id
          AND t_filter.slug = ?
    )';
    $params[] = $tag;
}

if ($author !== '') {
    $where[] = 'u.slug = ?';
    $params[] = $author;
}

if ($priority !== '') {
    $where[] = 'a.priority = ?';
    $params[] = $priority;
}

if ($q !== '') {
    $where[] = 'MATCH(a.title, a.excerpt, a.content) AGAINST (? IN BOOLEAN MODE)';
    $params[] = $q . '*';
}

// Issue #142: Strip internal-only fields from the public DTO.
// Staff (admin/editor) get full data for the admin panel; public/contributor
// queries get only what is needed to render a card safely.
$staffFields = $isStaff ? ',
      a.sponsor_disclosure, a.scheduled_at, a.is_live,
      a.points_awarded, a.review_notes' : '';

$sql = '
    SELECT
      a.id, a.title, a.slug, a.excerpt, a.featured_image, a.featured_image_alt,
      a.status, a.priority, a.is_sponsored, a.sponsor_name,
      a.published_at, a.updated_at, a.views,
      a.reading_time_minutes, a.seo_title, a.seo_description, a.seo_og_image' . $staffFields . ',
      c.name AS category_name, c.slug AS category_slug,
      (SELECT GROUP_CONCAT(t.slug ORDER BY t.name SEPARATOR ",")
       FROM article_tags at_list
       INNER JOIN tags t ON t.id = at_list.tag_id
       WHERE at_list.article_id = a.id) AS tag_slugs,
      u.display_name AS author_name, u.slug AS author_slug, u.avatar_url AS author_avatar
    FROM articles a
    LEFT JOIN categories c ON c.id = a.category_id
    INNER JOIN users u ON u.id = a.author_id
    WHERE ' . ($where ? implode(' AND ', $where) : '1 = 1') . '
    ORDER BY
      CASE a.priority WHEN "breaking" THEN 1 WHEN "top" THEN 2 ELSE 3 END,
      a.published_at DESC,
      a.updated_at DESC
    LIMIT ' . $limit . ' OFFSET ' . $offset;

try {
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response(['data' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    error_log('Article list query failed: ' . $e->getMessage());

    $fallbackSql = '
        SELECT
          a.id, a.title, a.slug, a.excerpt, a.featured_image, a.featured_image_alt,
          a.status, a.priority, a.is_sponsored, a.sponsor_name,
          a.published_at, a.updated_at, a.views,
          a.reading_time_minutes, a.seo_title, a.seo_description, a.seo_og_image' . $staffFields . ',
          c.name AS category_name, c.slug AS category_slug,
          NULL AS tag_slugs,
          u.display_name AS author_name, u.slug AS author_slug, u.avatar_url AS author_avatar
        FROM articles a
        LEFT JOIN categories c ON c.id = a.category_id
        INNER JOIN users u ON u.id = a.author_id
        WHERE ' . ($where ? implode(' AND ', $where) : '1 = 1') . '
        ORDER BY
          CASE a.priority WHEN "breaking" THEN 1 WHEN "top" THEN 2 ELSE 3 END,
          a.published_at DESC,
          a.updated_at DESC
        LIMIT ' . $limit . ' OFFSET ' . $offset;

    try {
        $stmt = db()->prepare($fallbackSql);
        $stmt->execute($params);
        json_response(['data' => $stmt->fetchAll()]);
    } catch (Throwable $fallbackError) {
        json_error('Could not load articles.', 500, APP_ENV === 'local' ? $fallbackError->getMessage() : null);
    }
}
