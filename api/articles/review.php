<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../article_policy.php';
require_once __DIR__ . '/../referral_helpers.php';
require_once __DIR__ . '/../points_helpers.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin', 'editor']);

$input = input_json();
$articleId = (int) ($input['id'] ?? 0);
$decision = (string) ($input['decision'] ?? '');
$notes = trim((string) ($input['notes'] ?? ''));

if ($articleId <= 0 || !in_array($decision, ['approve', 'reject'], true)) {
    json_error('Valid article id and decision are required.');
}

$pdo = db();
ensure_referral_tables($pdo);
ensure_points_schema($pdo);

$stmt = $pdo->prepare('SELECT * FROM articles WHERE id = ? LIMIT 1');
$stmt->execute([$articleId]);
$article = $stmt->fetch();
if (!$article) {
    json_error('Article not found.', 404);
}

if ($decision === 'reject' && $notes === '') {
    json_error('Feedback notes are required when rejecting.');
}

// Approve publishes the article via award_article_points() — enforce the same
// hard blocks as a direct save so review can't become a bypass to "published"
// (issue #3). Runs before the transaction so a failure rolls back cleanly.
if ($decision === 'approve') {
    assert_publishable($pdo, [
        'title' => (string) ($article['title'] ?? ''),
        'content' => (string) ($article['content'] ?? ''),
        'category_id' => (int) ($article['category_id'] ?? 0),
        'author_id' => (int) ($article['author_id'] ?? 0),
        'seo_description' => (string) ($article['seo_description'] ?? ''),
        'featured_image' => (string) ($article['featured_image'] ?? ''),
        'featured_image_alt' => (string) ($article['featured_image_alt'] ?? ''),
        'canonical_url' => (string) ($article['canonical_url'] ?? ''),
    ], 'publish');
}

$pdo->beginTransaction();
try {
    if ($decision === 'approve') {
        $setting = $pdo->query('SELECT points_per_article FROM points_settings WHERE id = 1')->fetch();
        $points = (int) ($setting['points_per_article'] ?? 10);

        $pdo->prepare(
            'UPDATE articles
             SET review_notes = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(),
                 published_at = COALESCE(published_at, UTC_TIMESTAMP())
             WHERE id = ?'
        )->execute([$notes ?: null, (int) $user['id'], $articleId]);

        award_article_points($pdo, $article, (int) $user['id'], $points);
    } else {
        $pdo->prepare(
            'UPDATE articles
             SET status = "rejected", review_notes = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP()
             WHERE id = ?'
        )->execute([$notes, (int) $user['id'], $articleId]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not review article.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}

// Approving made the article visible — refresh ISR and app-level caches (issue #4).
if ($decision === 'approve') {
    invalidate_article_cache($pdo, $article, 'publish');
}

json_response(['ok' => true]);
