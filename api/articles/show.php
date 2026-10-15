<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$slug = trim((string) ($_GET['slug'] ?? ''));
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($slug === '' && $id <= 0) {
    json_error('Article slug or id is required.');
}

$current = current_user();
$roles = $current ? current_user_roles((int) $current['id']) : [];
$canPreview = $current && has_any_role($roles, ['admin', 'editor', 'author']);

$where = $id > 0 ? 'a.id = ?' : 'a.slug = ?';
$params = [$id > 0 ? $id : $slug];
if (!$canPreview) {
    $where .= " AND a.status = 'published'";
}

// Explicit DTO column list (issue #8) — never `SELECT a.*`. Only fields the
// public article page / admin editor consume are returned; lock bookkeeping and
// anything else internal is excluded so a schema change can't leak new columns.
$stmt = db()->prepare("
    SELECT
      a.id, a.title, a.subtitle, a.slug, a.excerpt, a.content,
      a.featured_image, a.featured_image_alt, a.featured_image_caption, a.image_source,
      a.category_id, a.subcategory_id, a.author_id,
      a.status, a.priority, a.is_live, a.is_sponsored, a.sponsor_name, a.sponsor_disclosure,
      a.published_at, a.scheduled_at, a.reading_time_minutes,
      a.seo_title, a.seo_description, a.focus_keyword, a.seo_og_image, a.canonical_url,
      a.schema_type, a.correction_note, a.comments_enabled,
      a.robots_index, a.robots_follow, a.content_type, a.google_news_exclude, a.robots_noarchive,
      a.location_country, a.location_state, a.location_city,
      a.evergreen_audit_date, a.audience, a.series_id,
      a.created_at, a.updated_at, a.views,
      a.reviewed_by, a.reviewed_at, a.review_notes, a.points_awarded,
      c.name AS category_name, c.slug AS category_slug,
      u.display_name AS author_name, u.slug AS author_slug, u.avatar_url AS author_avatar,
      u.bio AS author_bio, u.role_title AS author_role_title,
      u.social_x AS author_social_x, u.social_linkedin AS author_social_linkedin,
      u.social_website AS author_social_website
    FROM articles a
    LEFT JOIN categories c ON c.id = a.category_id
    INNER JOIN users u ON u.id = a.author_id
    WHERE {$where}
    LIMIT 1
");
$stmt->execute($params);
$article = $stmt->fetch();

if (!$article) {
    json_error('Article not found.', 404);
}

$isStaff = has_any_role($roles, ['admin', 'editor']);
if ($article['status'] !== 'published' && !$isStaff) {
    if (!$current || (int) $article['author_id'] !== (int) $current['id']) {
        json_error('Article not found.', 404);
    }
}

$tagStmt = db()->prepare(
    'SELECT t.id, t.name, t.slug
     FROM article_tags at
     INNER JOIN tags t ON t.id = at.tag_id
     WHERE at.article_id = ?
     ORDER BY t.name ASC'
);
$tagStmt->execute([$article['id']]);
$article['tags'] = $tagStmt->fetchAll();

try {
    $categoryStmt = db()->prepare(
        'SELECT c.id, c.name, c.slug
         FROM article_categories ac
         INNER JOIN categories c ON c.id = ac.category_id
         WHERE ac.article_id = ?
         ORDER BY c.name ASC'
    );
    $categoryStmt->execute([$article['id']]);
    $article['secondary_categories'] = $categoryStmt->fetchAll();
} catch (Throwable $e) {
    $article['secondary_categories'] = [];
}

// Enrich with series data if the article belongs to a series
if (!empty($article['series_id'])) {
    try {
        $seriesStmt = db()->prepare('SELECT id, name, slug, description FROM article_series WHERE id = ? LIMIT 1');
        $seriesStmt->execute([$article['series_id']]);
        $article['series'] = $seriesStmt->fetch() ?: null;
    } catch (Throwable $e) {
        $article['series'] = null;
    }
} else {
    $article['series'] = null;
}

if ($article['status'] === 'published') {
    db()->prepare('UPDATE articles SET views = views + 1 WHERE id = ?')->execute([$article['id']]);
    $article['views'] = (int) $article['views'] + 1;
}

// Issue #142: Strip internal-only fields from the public DTO so unauthenticated
// readers don't receive review notes, sponsor disclosures, and robot directives
// which are only needed by staff in the editor.
if (!$canPreview) {
    unset(
        $article['reviewed_by'],
        $article['reviewed_at'],
        $article['review_notes'],
        $article['points_awarded'],
        $article['sponsor_disclosure'],
        $article['scheduled_at'],
        $article['robots_index'],
        $article['robots_follow'],
        $article['robots_noarchive'],
        $article['google_news_exclude'],
        $article['is_live'],
        $article['priority']
    );
}

json_response(['data' => $article]);
