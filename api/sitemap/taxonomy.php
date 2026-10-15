<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

// Public, slug-only taxonomy endpoint for sitemap generation. Returns ONLY
// slugs (never emails, roles, or profile data) so it can be consumed by the
// Next.js sitemap SSG without authentication (issue #1). Categories/tags come
// from the already-public category/tag tables; authors are restricted to
// active users that have a slug and an author-ish role OR at least one
// published article — a sitemap must never list a URL that 404s or leaks.
$pdo = db();

$categoryStmt = $pdo->query(
    "SELECT slug
     FROM categories
     WHERE is_active = 1 AND slug IS NOT NULL AND slug <> ''
     ORDER BY sort_order ASC, name ASC"
);
$categorySlugs = array_map(static fn (array $row): string => (string) $row['slug'], $categoryStmt->fetchAll());

// Issue #69: only include tags that have at least one published article.
// A tag with zero published articles generates a URL that renders as empty
// (or 404s), which violates the sitemap rule that every listed URL must be
// indexable and return real content. The EXISTS subquery filters these out
// without requiring a full COUNT(*) per tag.
$tagStmt = $pdo->query(
    "SELECT DISTINCT t.slug
     FROM tags t
     INNER JOIN article_tags at2 ON at2.tag_id = t.id
     INNER JOIN articles a ON a.id = at2.article_id
     WHERE t.slug IS NOT NULL AND t.slug <> ''
       AND a.status = 'published'
     ORDER BY t.slug ASC"
);
$tagSlugs = array_map(static fn (array $row): string => (string) $row['slug'], $tagStmt->fetchAll());

// Authors must be reachable from the public byline endpoint. Active users with
// an author/editor/admin role, or any active user with at least one published
// article, get an author URL in the sitemap.
$authorStmt = $pdo->query(
    "SELECT DISTINCT u.slug
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.status = 'active'
       AND u.slug IS NOT NULL AND u.slug <> ''
       AND (r.name IN ('admin', 'editor', 'author')
            OR EXISTS (
                SELECT 1 FROM articles pa
                WHERE pa.author_id = u.id AND pa.status = 'published'
            ))
     ORDER BY u.display_name ASC"
);
$authorSlugs = array_map(static fn (array $row): string => (string) $row['slug'], $authorStmt->fetchAll());

json_response([
    'data' => [
        'categories' => $categorySlugs,
        'authors' => $authorSlugs,
        'tags' => $tagSlugs,
    ],
]);
