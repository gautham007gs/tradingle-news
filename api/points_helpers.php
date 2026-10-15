<?php
declare(strict_types=1);

function ensure_points_schema(PDO $pdo): void
{
    foreach ([
        'ALTER TABLE user_sessions ADD COLUMN csrf_token VARCHAR(64) NULL',
        'ALTER TABLE user_referrals ADD COLUMN qualifying_articles INT NOT NULL DEFAULT 0',
    ] as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // Column already exists.
        }
    }
}

function award_article_points(PDO $pdo, array $article, int $reviewerId, int $pointsPerArticle): bool
{
    if ($article['status'] === 'published' && (int) $article['points_awarded'] > 0) {
        return false;
    }

    $articleId = (int) $article['id'];
    $authorId = (int) $article['author_id'];

    $pdo->prepare(
        'UPDATE articles
         SET status = "published",
             published_at = COALESCE(published_at, UTC_TIMESTAMP()),
             points_awarded = CASE WHEN points_awarded = 0 THEN ? ELSE points_awarded END
         WHERE id = ?'
    )->execute([$pointsPerArticle, $articleId]);

    $pdo->prepare(
        'UPDATE users
         SET points = points + ?, total_points_earned = total_points_earned + ?
         WHERE id = ?'
    )->execute([$pointsPerArticle, $pointsPerArticle, $authorId]);

    $pdo->prepare(
        'INSERT INTO points_history (user_id, article_id, points, reason, awarded_by)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([$authorId, $articleId, $pointsPerArticle, 'Article approved and published', $reviewerId]);

    $authorStmt = $pdo->prepare('SELECT email FROM users WHERE id = ? LIMIT 1');
    $authorStmt->execute([$authorId]);
    $author = $authorStmt->fetch();
    if ($author) {
        require_once __DIR__ . '/referral_helpers.php';
        track_referral_article_approval($pdo, (string) $author['email'], $articleId, $reviewerId);
    }

    return true;
}
