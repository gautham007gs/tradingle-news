<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../article_policy.php';

require_method('POST');
require_csrf_token();
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$pdo = db();
try {
    ensure_cms_schema_upgrades($pdo);
} catch (Throwable $e) {
    error_log('articles/save schema upgrade skipped: ' . $e->getMessage());
}
$input = input_json();
$isStaff = has_any_role($roles, ['admin', 'editor']);
$isAuthor = has_any_role($roles, ['admin', 'editor', 'author']);

$id = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;
$existing = null;
if ($id) {
    $check = $pdo->prepare('SELECT * FROM articles WHERE id = ? LIMIT 1');
    $check->execute([$id]);
    $existing = $check->fetch();
    if (!$existing) {
        json_error('Article not found.', 404);
    }
    if (!$isStaff && (int) $existing['author_id'] !== (int) $user['id']) {
        json_error('You can only edit your own articles.', 403);
    }
    if (!$isStaff && in_array($existing['status'], ['pending_review', 'published'], true)) {
        json_error('This submission is locked.', 403);
    }
}

$title = trim((string) ($input['title'] ?? ''));
$slug = trim((string) ($input['slug'] ?? ''));
$excerpt = trim((string) ($input['excerpt'] ?? ''));
$content = (string) ($input['content'] ?? '');
$featuredImage = trim((string) ($input['featured_image'] ?? ''));
$featuredImageAlt = trim((string) ($input['featured_image_alt'] ?? ''));
$featuredImageCaption = trim((string) ($input['featured_image_caption'] ?? ''));
$imageSource = trim((string) ($input['image_source'] ?? ''));
$commentsEnabled = !array_key_exists('comments_enabled', $input) || (bool) $input['comments_enabled'];
$focusKeyword = trim((string) ($input['focus_keyword'] ?? ''));
$categoryId = isset($input['category_id']) && $input['category_id'] !== '' ? (int) $input['category_id'] : null;
$secondaryCategoryIds = is_array($input['secondary_category_ids'] ?? null)
    ? array_values(array_unique(array_filter(array_map('intval', $input['secondary_category_ids']))))
    : [];
$status = (string) ($input['status'] ?? 'draft');
$subtitle = trim((string) ($input['subtitle'] ?? ''));
$scheduledAt = trim((string) ($input['scheduled_at'] ?? ''));
$tags = is_array($input['tags'] ?? null) ? $input['tags'] : [];

// ── Extended taxonomy fields ───────────────────────────────────────────────
$subcategoryId = isset($input['subcategory_id']) && $input['subcategory_id'] !== '' ? (int) $input['subcategory_id'] : null;
$contentType = in_array((string) ($input['content_type'] ?? ''), [
    'breaking_news','evergreen_guide','opinion_editorial','howto_tutorial','review','live_blog','analysis'
], true) ? (string) $input['content_type'] : 'breaking_news';
$locationCountry = trim((string) ($input['location_country'] ?? ''));
$locationState   = trim((string) ($input['location_state'] ?? ''));
$locationCity    = trim((string) ($input['location_city'] ?? ''));
$audience = in_array((string) ($input['audience'] ?? ''), [
    'general','youth','professional','investors','regional'
], true) ? (string) $input['audience'] : 'general';
$seriesId = isset($input['series_id']) && $input['series_id'] !== '' && $input['series_id'] !== '0'
    ? (int) $input['series_id'] : null;

// Gated fields (issues #41, #42): non-staff cannot alter sensitive priority, SEO, or sponsor flags.
$priority = 'normal';
$isLive = false;
$isSponsored = false;
$sponsorName = '';
$sponsorDisclosure = '';
$robotsIndex = true;
$robotsFollow = true;
$robotsNoarchive = false;
$googleNewsExclude = false;
$schemaType = 'NewsArticle';
$correctionNote = '';
$evergreenAuditDate = '';

if ($isStaff) {
    $priority = in_array((string) ($input['priority'] ?? 'normal'), ['normal', 'top', 'breaking'], true) ? (string) $input['priority'] : 'normal';
    $isLive = !empty($input['is_live']);
    $isSponsored = !empty($input['is_sponsored']);
    $sponsorName = trim((string) ($input['sponsor_name'] ?? ''));
    $sponsorDisclosure = trim((string) ($input['sponsor_disclosure'] ?? ''));
    $robotsIndex = !array_key_exists('robots_index', $input) || (bool) $input['robots_index'];
    $robotsFollow = !array_key_exists('robots_follow', $input) || (bool) $input['robots_follow'];
    $robotsNoarchive = !empty($input['robots_noarchive']);
    $googleNewsExclude = !empty($input['google_news_exclude']);
    $schemaType = in_array((string) ($input['schema_type'] ?? ''), [
        'NewsArticle', 'Article', 'BlogPosting', 'ReportageNewsArticle',
        'AnalysisNewsArticle', 'OpinionNewsArticle', 'TechArticle',
    ], true) ? (string) $input['schema_type'] : 'NewsArticle';
    $correctionNote = trim((string) ($input['correction_note'] ?? ''));
    $evergreenAuditDate = trim((string) ($input['evergreen_audit_date'] ?? ''));
} elseif ($existing) {
    $priority = $existing['priority'];
    $isLive = (bool) $existing['is_live'];
    $isSponsored = (bool) $existing['is_sponsored'];
    $sponsorName = (string) $existing['sponsor_name'];
    $sponsorDisclosure = (string) $existing['sponsor_disclosure'];
    $robotsIndex = (bool) $existing['robots_index'];
    $robotsFollow = (bool) $existing['robots_follow'];
    $robotsNoarchive = (bool) $existing['robots_noarchive'];
    $googleNewsExclude = (bool) $existing['google_news_exclude'];
    $schemaType = (string) $existing['schema_type'];
    $correctionNote = (string) $existing['correction_note'];
    $evergreenAuditDate = (string) $existing['evergreen_audit_date'];
}

if ($title === '') {
    json_error('Title is required.');
}
if (mb_strlen($title) > 255) {
    json_error('Title must be under 255 characters.');
}
if (mb_strlen($slug) > 255) {
    json_error('Slug must be under 255 characters.');
}
if (mb_strlen($excerpt) > 2000) {
    json_error('Excerpt must be under 2000 characters.');
}
if (mb_strlen($content) > 500000) { // ~500KB textual limit
    json_error('Article content is too long.');
}
if (isset($input['seo_title']) && mb_strlen($input['seo_title']) > 255) {
    json_error('SEO title must be under 255 characters.');
}
if (isset($input['seo_description']) && mb_strlen($input['seo_description']) > 1000) {
    json_error('SEO description must be under 1000 characters.');
}
if (count($tags) > 50) {
    json_error('Maximum 50 tags allowed per article.');
}
foreach ($tags as $t) {
    if (mb_strlen((string)$t) > 60) {
        json_error('Individual tags must be under 60 characters.');
    }
}

// Issue #112: Validate URL fields
$seoOgImage = trim((string) ($input['seo_og_image'] ?? ''));
if ($seoOgImage !== '' && !preg_match('/^https?:\/\//i', $seoOgImage)) {
    json_error('SEO OG image must be an absolute https:// URL.');
}
$canonicalUrl = trim((string) ($input['canonical_url'] ?? ''));
if ($canonicalUrl !== '' && !preg_match('/^https?:\/\//i', $canonicalUrl)) {
    json_error('Canonical URL must be an absolute https:// URL.');
}

$excerptWords = preg_split('/\s+/', $excerpt, -1, PREG_SPLIT_NO_EMPTY) ?: [];
if (count($excerptWords) > 25) {
    $excerpt = implode(' ', array_slice($excerptWords, 0, 25));
}

$authorId = $isStaff && isset($input['author_id']) && (int) $input['author_id'] > 0 ? (int) $input['author_id'] : (int) $user['id'];
$slug = $slug !== '' ? slugify_php($slug) : slugify_php($title);

// Resolve slug collisions with a single LIKE query (O(1) DB round-trip)
$baseSlug = $slug;
$takenStmt = $pdo->prepare(
    "SELECT id, slug FROM articles WHERE slug = ? OR slug LIKE ? LIMIT 60"
);
$takenStmt->execute([$baseSlug, $baseSlug . '-%']);
$takenSlugs = [];
foreach ($takenStmt->fetchAll() as $row) {
    if (!$id || (int) $row['id'] !== $id) {
        $takenSlugs[$row['slug']] = true;
    }
}
if (isset($takenSlugs[$slug])) {
    $suffix = 2;
    while (isset($takenSlugs[$baseSlug . '-' . $suffix])) {
        $suffix++;
    }
    $slug = $baseSlug . '-' . $suffix;
}

$allowedStatus = ['draft', 'pending_review'];
if ($isAuthor) {
    $allowedStatus = ['draft', 'pending_review', 'published', 'scheduled', 'archived', 'rejected'];
}
if (!in_array($status, $allowedStatus, true)) {
    $status = $isAuthor ? 'draft' : 'pending_review';
}

$publishedAt = null;
if ($status === 'published') {
    $rawPublishedAt = trim((string) ($input['published_at'] ?? ''));
    if ($rawPublishedAt === '') {
        $rawPublishedAt = gmdate('Y-m-d H:i:s');
    }
    // Issue #111: Strict date format check — accept YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
    if (!preg_match('/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/', $rawPublishedAt)) {
        json_error('Invalid published_at format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.');
    }
    $publishedAt = $rawPublishedAt;
    // Issue #43: Published_at validated
    if (strtotime($publishedAt) > time() + 300) {
        json_error('Published time cannot be in the future.');
    }
}
if ($status === 'scheduled') {
    if ($scheduledAt === '') {
        json_error('Scheduled publish time is required.');
    }
    // Issue #111: Strict format check for scheduled_at
    if (!preg_match('/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/', $scheduledAt)) {
        json_error('Invalid scheduled_at format. Use YYYY-MM-DD HH:MM:SS.');
    }
    // Issue #43: Scheduled_at validated
    if (strtotime($scheduledAt) <= time()) {
        json_error('Scheduled publish time must be in the future.');
    }
    $publishedAt = null;
}

$readingTime = max(1, (int) ceil(str_word_count(strip_tags($content)) / 220));

// ── Publish-time hard blocks (AGENTS.md rule 10) ──────────────────────────
// The SPA surfaces these as UI warnings, but the API must refuse to go live so
// a scripted client can't bypass the CMS. Applied to both `published` and
// `scheduled` (a scheduled article becomes published on its own later). The
// checks live in api/article_policy.php and are shared with review.php so no
// path to "published" can dodge them (issue #3).
if ($status === 'published' || $status === 'scheduled') {
    assert_publishable($pdo, [
        'title' => $title,
        'content' => $content,
        'category_id' => $categoryId,
        'author_id' => $authorId,
        'seo_description' => (string) ($input['seo_description'] ?? ''),
        'featured_image' => $featuredImage,
        'featured_image_alt' => $featuredImageAlt,
        'canonical_url' => (string) ($input['canonical_url'] ?? ''),
    ], $status === 'scheduled' ? 'schedule' : 'publish');
}

if ($id) {
    // Server-side document lock enforcement (issue #5): the UI only shows a
    // banner, so a save from another editor must be rejected here. Compared
    // against UTC_TIMESTAMP() in MySQL to avoid PHP/DB timezone drift.
    $lockQ = $pdo->prepare(
        'SELECT u.display_name
         FROM articles a
         JOIN users u ON u.id = a.lock_held_by
         WHERE a.id = ?
           AND a.lock_held_by IS NOT NULL
           AND a.lock_held_by <> ?
           AND a.lock_expires_at > UTC_TIMESTAMP()
         LIMIT 1'
    );
    $lockQ->execute([$id, (int) $user['id']]);
    $lockHolderName = $lockQ->fetchColumn();
    if ($lockHolderName !== false && $lockHolderName !== null) {
        json_error("This article is currently being edited by {$lockHolderName}.", 423);
    }
}

$pdo->beginTransaction();
try {
    if ($id) {
        // NOTE: article_revisions DDL lives in ensure_cms_schema_upgrades() —
        // CREATE TABLE inside a transaction triggers an implicit commit in
        // MySQL, which silently destroyed the atomicity of every save and made
        // the final commit() throw "There is no active transaction".
        // Skip inserting a revision if nothing actually changed since the last one
        // (e.g. repeated Save clicks with no edits) — prevents unbounded row bloat.
        // Issue #117: hash now includes SEO fields, category and author so changes
        // to those fields also produce a new revision snapshot.
        $preSaveContentHash = hash('sha256',
            ($existing['title'] ?? '') . '|' .
            ($existing['excerpt'] ?? '') . '|' .
            ($existing['content'] ?? '') . '|' .
            ($existing['status'] ?? '') . '|' .
            ($existing['seo_title'] ?? '') . '|' .
            ($existing['seo_description'] ?? '') . '|' .
            ($existing['category_id'] ?? '') . '|' .
            ($existing['author_id'] ?? '') . '|' .
            ($existing['schema_type'] ?? '')
        );
        try {
            $lastRevisionStmt = $pdo->prepare('SELECT content_hash FROM article_revisions WHERE article_id = ? ORDER BY id DESC LIMIT 1');
            $lastRevisionStmt->execute([$id]);
            $lastRevision = $lastRevisionStmt->fetch();
        } catch (Throwable $lookupError) {
            $lastRevision = null;
        }
        if (!$lastRevision || ($lastRevision['content_hash'] ?? null) !== $preSaveContentHash) {
            try {
                $pdo->prepare(
                    'INSERT INTO article_revisions (article_id, editor_id, title, excerpt, content, status, revision_note, content_hash)
                     SELECT id, ?, title, excerpt, content, status, ?, ? FROM articles WHERE id = ?'
                )->execute([(int) $user['id'], 'Auto revision before save', $preSaveContentHash, $id]);
            } catch (Throwable $revisionError) {
                error_log('Article revision save skipped: ' . $revisionError->getMessage());
            }
        }

        $stmt = $pdo->prepare(
            'UPDATE articles
             SET title = ?, subtitle = ?, slug = ?, excerpt = ?, content = ?, featured_image = ?, featured_image_alt = ?,
                 featured_image_caption = ?, image_source = ?,
                 category_id = ?, subcategory_id = ?,
                 status = ?, priority = ?, is_live = ?, is_sponsored = ?, sponsor_name = ?, sponsor_disclosure = ?,
                 published_at = ?, scheduled_at = ?, reading_time_minutes = ?,
                 seo_title = ?, seo_description = ?, focus_keyword = ?, seo_og_image = ?, canonical_url = ?, schema_type = ?,
                 correction_note = ?, comments_enabled = ?, robots_index = ?, robots_follow = ?,
                 content_type = ?, google_news_exclude = ?, robots_noarchive = ?,
                 location_country = ?, location_state = ?, location_city = ?,
                 evergreen_audit_date = ?, audience = ?, series_id = ?,
                 author_id = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $title,
            $subtitle ?: null,
            $slug,
            $excerpt ?: null,
            $content ?: null,
            $featuredImage ?: null,
            $featuredImageAlt ?: null,
            $featuredImageCaption ?: null,
            $imageSource ?: null,
            $categoryId,
            $subcategoryId,
            $status,
            $priority,
            $isLive ? 1 : 0,
            $isSponsored ? 1 : 0,
            $sponsorName ?: null,
            $sponsorDisclosure ?: null,
            $publishedAt,
            $scheduledAt ?: null,
            $readingTime,
            $input['seo_title'] ?? null,
            $input['seo_description'] ?? null,
            $focusKeyword ?: null,
            $seoOgImage ?: null,
            $canonicalUrl ?: null,
            $schemaType,
            $correctionNote ?: null,
            $commentsEnabled ? 1 : 0,
            $robotsIndex ? 1 : 0,
            $robotsFollow ? 1 : 0,
            $contentType,
            $googleNewsExclude ? 1 : 0,
            $robotsNoarchive ? 1 : 0,
            $locationCountry ?: null,
            $locationState ?: null,
            $locationCity ?: null,
            $evergreenAuditDate ?: null,
            $audience,
            $seriesId,
            $authorId,
            $id,
        ]);
        $articleId = $id;
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO articles
             (title, subtitle, slug, excerpt, content, featured_image, featured_image_alt, featured_image_caption, image_source,
              category_id, subcategory_id, author_id, status, priority, is_live, is_sponsored, sponsor_name, sponsor_disclosure,
              published_at, scheduled_at, reading_time_minutes, seo_title, seo_description,
              focus_keyword, seo_og_image, canonical_url, schema_type, correction_note, comments_enabled,
              robots_index, robots_follow,
              content_type, google_news_exclude, robots_noarchive,
              location_country, location_state, location_city,
              evergreen_audit_date, audience, series_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $title,
            $subtitle ?: null,
            $slug,
            $excerpt ?: null,
            $content ?: null,
            $featuredImage ?: null,
            $featuredImageAlt ?: null,
            $featuredImageCaption ?: null,
            $imageSource ?: null,
            $categoryId,
            $subcategoryId,
            $authorId,
            $status,
            $priority,
            $isLive ? 1 : 0,
            $isSponsored ? 1 : 0,
            $sponsorName ?: null,
            $sponsorDisclosure ?: null,
            $publishedAt,
            $scheduledAt ?: null,
            $readingTime,
            $input['seo_title'] ?? null,
            $input['seo_description'] ?? null,
            $focusKeyword ?: null,
            $seoOgImage ?: null,
            $canonicalUrl ?: null,
            $schemaType,
            $correctionNote ?: null,
            $commentsEnabled ? 1 : 0,
            $robotsIndex ? 1 : 0,
            $robotsFollow ? 1 : 0,
            $contentType,
            $googleNewsExclude ? 1 : 0,
            $robotsNoarchive ? 1 : 0,
            $locationCountry ?: null,
            $locationState ?: null,
            $locationCity ?: null,
            $evergreenAuditDate ?: null,
            $audience,
            $seriesId,
        ]);
        $articleId = (int) $pdo->lastInsertId();
    }

    // Resolve tag names -> ids first (without writing article_tags yet) so we can
    // validate relevance before committing anything.
    $resolvedTagIds = []; // tagId => tagName
    $newlyCreatedTagIds = [];
    foreach ($tags as $tagName) {
        $tagName = normalize_label(trim((string) $tagName));
        if ($tagName === '') {
            continue;
        }
        $tagSlug = slugify_php($tagName);
        $tagStmt = $pdo->prepare('SELECT id FROM tags WHERE slug = ? LIMIT 1');
        $tagStmt->execute([$tagSlug]);
        $tag = $tagStmt->fetch();
        if (!$tag) {
            $pdo->prepare('INSERT INTO tags (name, slug) VALUES (?, ?)')->execute([$tagName, $tagSlug]);
            $tagId = (int) $pdo->lastInsertId();
            $newlyCreatedTagIds[] = $tagId;
        } else {
            $tagId = (int) $tag['id'];
        }
        $resolvedTagIds[$tagId] = $tagName;
    }

    // Validate pre-existing tags against the article's category (+ancestors/descendants).
    // Tags with zero tag_categories rows are "global" and always pass. Newly created
    // tags are exempt here — they get auto-scoped to this category just below.
    $articleCategoryIds = array_values(array_unique(array_filter(array_map('intval', array_merge(
        $categoryId ? [$categoryId] : [],
        $secondaryCategoryIds
    )))));
    $preExistingTagIds = array_diff(array_keys($resolvedTagIds), $newlyCreatedTagIds);
    if ($preExistingTagIds && $articleCategoryIds) {
        $violations = validate_tags_against_categories($pdo, $preExistingTagIds, $articleCategoryIds);
        if ($violations) {
            safe_rollback($pdo);
            $messages = array_map(function ($v) {
                $allowed = $v['allowed'] ? implode(', ', $v['allowed']) : 'no categories';
                return "\"{$v['tag_name']}\" (only allowed under: {$allowed})";
            }, $violations);
            json_error('Some tags are not relevant to the selected category: ' . implode(', ', $messages) . '. Remove them or broaden the tag in Tags admin.');
        }
    }

    $pdo->prepare('DELETE FROM article_tags WHERE article_id = ?')->execute([$articleId]);
    foreach ($resolvedTagIds as $tagId => $tagName) {
        $pdo->prepare('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)')->execute([$articleId, $tagId]);
    }

    // Auto-scope newly created tags to the category they were created under, so
    // e.g. a "finance" tag coined on a Finance article can't later be misapplied
    // to a Health article. Admins can broaden this anytime via the Tags screen.
    if ($newlyCreatedTagIds && $categoryId) {
        foreach ($newlyCreatedTagIds as $newTagId) {
            $pdo->prepare('INSERT IGNORE INTO tag_categories (tag_id, category_id) VALUES (?, ?)')->execute([$newTagId, $categoryId]);
        }
    }

    // NOTE: article_categories DDL lives in ensure_cms_schema_upgrades() —
    // CREATE TABLE inside a transaction implicitly commits in MySQL.
    $pdo->prepare('DELETE FROM article_categories WHERE article_id = ?')->execute([$articleId]);
    foreach ($secondaryCategoryIds as $secondaryCategoryId) {
        if ($secondaryCategoryId <= 0 || ($categoryId && $secondaryCategoryId === $categoryId)) {
            continue;
        }
        $pdo->prepare('INSERT IGNORE INTO article_categories (article_id, category_id) VALUES (?, ?)')->execute([$articleId, $secondaryCategoryId]);
    }

    $pdo->commit();

    // ── Post-commit side effects ──────────────────────────────────────────
    // Everything after commit() is best-effort: the article IS saved, so no
    // failure here may reach the outer catch (whose rollBack() would be a
    // no-op-then-fatal pre-fix) or return an error to the client.
    try {
        // Issue #121: Record to immutable audit trail
        $auditAction = $id ? 'article_update' : 'article_create';
        $auditDetails = "Article ID {$articleId} ('{$title}') saved with status '{$status}' by User ID {$user['id']}";
        record_audit_log($pdo, (int)$user['id'], $auditAction, $auditDetails, $existing ? json_encode($existing) : null, json_encode(['title' => $title, 'status' => $status, 'category_id' => $categoryId]));
    } catch (Throwable $auditError) {
        error_log('Audit log write failed (article saved OK): ' . $auditError->getMessage());
    }

    // ── Auto-write 301 redirect when a published article's URL changes ──
    if ($id && $existing && $existing['status'] === 'published') {
        try {
            $oldCatSlug = '';
            if ($existing['category_id']) {
                $oldCatQ = $pdo->prepare('SELECT slug FROM categories WHERE id = ? LIMIT 1');
                $oldCatQ->execute([$existing['category_id']]);
                $oldCatRow = $oldCatQ->fetch();
                $oldCatSlug = $oldCatRow ? (string) $oldCatRow['slug'] : '';
            }
            $newCatSlug = '';
            if ($categoryId) {
                $newCatQ = $pdo->prepare('SELECT slug FROM categories WHERE id = ? LIMIT 1');
                $newCatQ->execute([$categoryId]);
                $newCatRow = $newCatQ->fetch();
                $newCatSlug = $newCatRow ? (string) $newCatRow['slug'] : '';
            }
            $oldPath = $oldCatSlug ? "/{$oldCatSlug}/{$existing['slug']}" : "/{$existing['slug']}";
            $newPath = $newCatSlug ? "/{$newCatSlug}/{$slug}" : "/{$slug}";

            if ($oldPath !== $newPath) {
                // Upsert redirect — handles repeated slug changes gracefully
                $pdo->exec("CREATE TABLE IF NOT EXISTS redirects (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    from_path VARCHAR(512) NOT NULL,
                    to_path VARCHAR(512) NOT NULL,
                    status_code SMALLINT UNSIGNED NOT NULL DEFAULT 301,
                    article_id BIGINT UNSIGNED NULL,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uq_redirect_from (from_path(255)),
                    INDEX idx_redirect_article (article_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

                $pdo->prepare("
                    INSERT INTO redirects (from_path, to_path, article_id)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        to_path    = VALUES(to_path),
                        article_id = VALUES(article_id)
                ")->execute([$oldPath, $newPath, $articleId]);

                // Collapse redirect chains: A→B→C becomes A→C
                $pdo->prepare(
                    "UPDATE redirects SET to_path = ? WHERE to_path = ? AND from_path != ?"
                )->execute([$newPath, $oldPath, $newPath]);
            }
        } catch (Throwable $redirectError) {
            error_log('Redirect write failed: ' . $redirectError->getMessage());
        }
    }


    // Central cache invalidation (issue #4) — fires the ISR webhook with
    // article/category/author/tag slugs and drops app-level caches, for any
    // save that makes the article visible (published/scheduled) or was
    // previously visible (slug/category/author may have changed).
    // Post-commit best-effort: never fail an already-saved article.
    try {
        if (
            in_array($status, ['published', 'scheduled'], true)
            || ($existing && ($existing['status'] ?? '') === 'published')
        ) {
            invalidate_article_cache($pdo, [
                'id' => $articleId,
                'slug' => $slug,
                'category_id' => $categoryId,
                'author_id' => $authorId,
            ], $status === 'published' ? 'publish' : 'update');
        }
    } catch (Throwable $cacheError) {
        error_log('Cache invalidation failed (article saved OK): ' . $cacheError->getMessage());
    }
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not save article.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}

json_response(['id' => $articleId, 'slug' => $slug]);
