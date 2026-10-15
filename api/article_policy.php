<?php
declare(strict_types=1);

/**
 * Shared article publish-policy + cache-invalidation helpers (issues #3/#4).
 *
 * Every code path that can flip an article to `published` (or `scheduled`,
 * which publishes on its own later) MUST pass through assert_publishable() so
 * the CMS hard blocks in AGENTS.md rule 10 can never be bypassed by calling a
 * different endpoint. Every path that changes a visible article MUST call
 * invalidate_article_cache() so ISR tags and app-level caches are refreshed
 * regardless of which endpoint made the change.
 */

/**
 * Verify an article is in a publishable state. `$fields` is a keyed array of
 * the same shape as the save payload (title, content, category_id, author_id,
 * seo_description, featured_image, featured_image_alt, canonical_url). Calls
 * json_error() (which terminates the request) when the state is not fit to
 * go live.
 */
function assert_publishable(PDO $pdo, array $fields, string $verb = 'publish'): void
{
    $title = trim((string) ($fields['title'] ?? ''));
    $content = (string) ($fields['content'] ?? '');
    $categoryId = (int) ($fields['category_id'] ?? 0);
    $authorId = (int) ($fields['author_id'] ?? 0);
    $seoDescription = trim((string) ($fields['seo_description'] ?? ''));
    $featuredImage = trim((string) ($fields['featured_image'] ?? ''));
    $featuredImageAlt = trim((string) ($fields['featured_image_alt'] ?? ''));
    $canonicalUrl = trim((string) ($fields['canonical_url'] ?? ''));

    $missing = [];
    if ($title === '') {
        $missing[] = 'title';
    }
    if (trim(strip_tags($content)) === '') {
        $missing[] = 'content';
    }
    if (!$categoryId) {
        $missing[] = 'category';
    } else {
        $catChk = $pdo->prepare('SELECT 1 FROM categories WHERE id = ? LIMIT 1');
        $catChk->execute([$categoryId]);
        if (!$catChk->fetchColumn()) {
            $missing[] = 'valid category';
        }
    }
    if (!$authorId) {
        $missing[] = 'assigned author';
    } else {
        $authorChk = $pdo->prepare('SELECT 1 FROM users WHERE id = ? LIMIT 1');
        $authorChk->execute([$authorId]);
        if (!$authorChk->fetchColumn()) {
            $missing[] = 'assigned author';
        }
    }
    if ($seoDescription === '') {
        $missing[] = 'SEO meta description';
    }
    if ($featuredImage === '') {
        $missing[] = 'featured image';
    }
    if ($featuredImageAlt === '') {
        $missing[] = 'featured image alt text';
    }

    if ($missing) {
        json_error('Cannot ' . $verb . ': missing required fields (' . implode(', ', $missing) . ').', 422);
    }

    $invalidStates = [];

    // Alt text must not be identical to the image filename (rule 10)
    $altPath = parse_url($featuredImage, PHP_URL_PATH) ?: '';
    if ($featuredImageAlt !== '' && $altPath !== '' && strtolower($featuredImageAlt) === strtolower(pathinfo($altPath, PATHINFO_FILENAME))) {
        $invalidStates[] = 'featured image alt text must not match the image filename';
    }

    // Featured image must be an absolute http(s) URL or root-relative path —
    // rejects data:/javascript: URIs and mixed-content sources.
    if (!preg_match('#^(https?://|/)#i', $featuredImage)) {
        $invalidStates[] = 'featured image must be an absolute URL';
    }

    // Canonical URL, when provided, must be an absolute http(s) URL so the
    // <link rel="canonical"> is always absolute (rule 4), and must belong to
    // an allowed origin (issue #20).
    if ($canonicalUrl !== '' && !preg_match('#^https?://#i', $canonicalUrl)) {
        $invalidStates[] = 'canonical URL must be an absolute http(s) URL';
    }
    if ($canonicalUrl !== '' && !canonical_url_allowed($canonicalUrl)) {
        $invalidStates[] = 'canonical URL must belong to an allowed site origin';
    }

    if ($invalidStates) {
        json_error('Cannot ' . $verb . ': ' . implode(', ', $invalidStates) . '.', 422);
    }
}

/**
 * Central cache invalidation for a changed article. Fires the Next.js ISR
 * webhook (article/category/author/tag slugs + shared feed tags) and drops the
 * app-level caches that may contain the article. `$article` needs at least
 * `id`, `slug`, `category_id`, `author_id`; slugs are resolved from the DB so
 * stale caller-provided values can't cause a wrong revalidation. Never throws.
 */
function invalidate_article_cache(PDO $pdo, array $article, string $event): void
{
    $articleId = (int) ($article['id'] ?? 0);
    $articleSlug = trim((string) ($article['slug'] ?? ''));
    $categoryId = (int) ($article['category_id'] ?? 0);
    $authorId = (int) ($article['author_id'] ?? 0);

    $categorySlug = '';
    if ($categoryId > 0) {
        try {
            $catQ = $pdo->prepare('SELECT slug FROM categories WHERE id = ? LIMIT 1');
            $catQ->execute([$categoryId]);
            $catRow = $catQ->fetch();
            $categorySlug = $catRow ? (string) $catRow['slug'] : '';
        } catch (Throwable $e) {
            error_log('invalidate_article_cache category slug lookup failed: ' . $e->getMessage());
        }
    }

    $authorSlug = '';
    if ($authorId > 0) {
        try {
            $authorQ = $pdo->prepare('SELECT slug FROM users WHERE id = ? LIMIT 1');
            $authorQ->execute([$authorId]);
            $authorRow = $authorQ->fetch();
            $authorSlug = $authorRow ? (string) $authorRow['slug'] : '';
        } catch (Throwable $e) {
            error_log('invalidate_article_cache author slug lookup failed: ' . $e->getMessage());
        }
    }

    $tagSlugs = [];
    if ($articleId > 0) {
        try {
            $tagQ = $pdo->prepare(
                'SELECT t.slug FROM article_tags at INNER JOIN tags t ON t.id = at.tag_id WHERE at.article_id = ?'
            );
            $tagQ->execute([$articleId]);
            $tagSlugs = array_values(array_map(static fn (array $row): string => (string) $row['slug'], $tagQ->fetchAll()));
        } catch (Throwable $e) {
            error_log('invalidate_article_cache tag slug lookup failed: ' . $e->getMessage());
        }
    }

    notify_nextjs_revalidate([
        'event' => $event,
        'articleSlug' => $articleSlug,
        'categorySlug' => $categorySlug,
        'authorSlug' => $authorSlug,
        'tagSlug' => $tagSlugs[0] ?? '',
        'tags' => $tagSlugs,
    ]);

    if ($articleSlug !== '') {
        cache_delete('article:' . $articleSlug);
    }
    if ($categorySlug !== '') {
        cache_delete('category:' . $categorySlug);
    }
    if ($authorSlug !== '') {
        cache_delete('author:' . $authorSlug);
    }
    cache_delete('homepage_payload');
    cache_delete('latest_payload');
}
