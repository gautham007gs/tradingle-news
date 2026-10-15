<?php
declare(strict_types=1);

const REFERRAL_QUALIFYING_ARTICLE_TARGET = 5;
const REFERRAL_REWARD_POINTS = 100;
const REFERRAL_RECENCY_DAYS = 90;
const REFERRAL_CURRENT_NEWS_DAYS = 30;
const REFERRAL_TREND_SLOT_KEYS = ['trending', 'top_stories', 'hero', 'editors_picks'];

function article_qualifies_for_referral_trend(PDO $pdo, int $articleId): bool
{
    if ($articleId <= 0) {
        return false;
    }

    $stmt = $pdo->prepare(
        'SELECT a.id, a.status, a.points_awarded, a.priority, a.published_at
         FROM articles a
         WHERE a.id = ?
         LIMIT 1'
    );
    $stmt->execute([$articleId]);
    $article = $stmt->fetch();
    if (!$article) {
        return false;
    }

    if ($article['status'] !== 'published' || (int) $article['points_awarded'] <= 0) {
        return false;
    }

    if (empty($article['published_at'])) {
        return false;
    }

    $publishedAt = strtotime((string) $article['published_at']);
    if ($publishedAt === false) {
        return false;
    }

    $cutoff = time() - (REFERRAL_RECENCY_DAYS * 86400);
    if ($publishedAt < $cutoff) {
        return false;
    }

    $priority = (string) ($article['priority'] ?? 'normal');
    if (in_array($priority, ['top', 'breaking'], true)) {
        return true;
    }

    $slotPlaceholders = implode(',', array_fill(0, count(REFERRAL_TREND_SLOT_KEYS), '?'));
    $slotStmt = $pdo->prepare(
        "SELECT id FROM homepage_slots
         WHERE article_id = ? AND is_active = 1 AND slot_key IN ($slotPlaceholders)
         LIMIT 1"
    );
    $slotStmt->execute(array_merge([$articleId], REFERRAL_TREND_SLOT_KEYS));
    if ($slotStmt->fetch()) {
        return true;
    }

    $currentCutoff = time() - (REFERRAL_CURRENT_NEWS_DAYS * 86400);
    return $publishedAt >= $currentCutoff;
}

function count_qualifying_referral_articles(PDO $pdo, string $authorEmail): int
{
    $authorEmail = strtolower(trim($authorEmail));
    $slotPlaceholders = implode(',', array_fill(0, count(REFERRAL_TREND_SLOT_KEYS), '?'));

    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT a.id) AS count
         FROM articles a
         INNER JOIN users u ON u.id = a.author_id
         LEFT JOIN homepage_slots hs
           ON hs.article_id = a.id
          AND hs.is_active = 1
          AND hs.slot_key IN ($slotPlaceholders)
         WHERE LOWER(u.email) = ?
           AND a.status = 'published'
           AND a.points_awarded > 0
           AND a.published_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)
           AND (
             a.priority IN ('top', 'breaking')
             OR hs.id IS NOT NULL
             OR a.published_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)
           )"
    );
    $stmt->execute(array_merge(
        REFERRAL_TREND_SLOT_KEYS,
        [$authorEmail, REFERRAL_RECENCY_DAYS, REFERRAL_CURRENT_NEWS_DAYS]
    ));

    return (int) ($stmt->fetch()['count'] ?? 0);
}

function ensure_referral_tables(PDO $pdo): void
{
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS referral_links (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            referrer_email VARCHAR(255) NOT NULL,
            referral_code VARCHAR(64) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_referrer_email (referrer_email),
            KEY idx_referral_code (referral_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('Referral links table unavailable: ' . $e->getMessage());
    }

    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS user_referrals (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            referrer_email VARCHAR(255) NOT NULL,
            referred_email VARCHAR(255) NOT NULL UNIQUE,
            referral_code VARCHAR(64) NOT NULL,
            articles_written INT NOT NULL DEFAULT 0,
            qualifying_articles INT NOT NULL DEFAULT 0,
            status ENUM("pending", "qualified", "rewarded") NOT NULL DEFAULT "pending",
            points_earned INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            qualified_at TIMESTAMP NULL,
            rewarded_at TIMESTAMP NULL,
            KEY idx_referrer_email (referrer_email),
            KEY idx_referred_email (referred_email),
            KEY idx_referral_code (referral_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        error_log('User referrals table unavailable: ' . $e->getMessage());
    }

    foreach ([
        'ALTER TABLE user_referrals ADD COLUMN articles_written INT NOT NULL DEFAULT 0',
        'ALTER TABLE user_referrals ADD COLUMN qualifying_articles INT NOT NULL DEFAULT 0',
        'ALTER TABLE user_referrals ADD COLUMN status ENUM("pending", "qualified", "rewarded") NOT NULL DEFAULT "pending"',
        'ALTER TABLE user_referrals ADD COLUMN points_earned INT NOT NULL DEFAULT 0',
        'ALTER TABLE user_referrals ADD COLUMN qualified_at TIMESTAMP NULL',
        'ALTER TABLE user_referrals ADD COLUMN rewarded_at TIMESTAMP NULL',
    ] as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // Column already exists on current installs.
        }
    }
}

// Legacy encode_referral_email_code and decode_referral_email_code were removed (issue #39)
// because they leaked user emails in reversible base64 format during DB outages.

function generate_referral_code(PDO $pdo): string
{
    do {
        $code = bin2hex(random_bytes(8));
        $stmt = $pdo->prepare('SELECT id FROM referral_links WHERE referral_code = ? LIMIT 1');
        $stmt->execute([$code]);
    } while ($stmt->fetch());

    return $code;
}

function get_or_create_referral_code(PDO $pdo, string $email): string
{
    ensure_referral_tables($pdo);
    $email = strtolower(trim($email));

    try {
        $stmt = $pdo->prepare('SELECT referral_code FROM referral_links WHERE referrer_email = ? LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        if ($row) {
            return (string) $row['referral_code'];
        }

        $code = generate_referral_code($pdo);
        $pdo->prepare('INSERT INTO referral_links (referrer_email, referral_code) VALUES (?, ?)')
            ->execute([$email, $code]);

        return $code;
    } catch (Throwable $e) {
        error_log('Failed to generate referral code: ' . $e->getMessage());
        throw new RuntimeException('Could not generate referral code. Please try again later.');
    }
}

function resolve_referrer_email_from_code(PDO $pdo, string $referralCode): ?string
{
    $referralCode = trim($referralCode);
    if ($referralCode === '') {
        return null;
    }

    try {
        $stmt = $pdo->prepare('SELECT referrer_email FROM referral_links WHERE referral_code = ? LIMIT 1');
        $stmt->execute([$referralCode]);
        $link = $stmt->fetch();
        if ($link) {
            return strtolower((string) $link['referrer_email']);
        }
    } catch (Throwable $e) {
        error_log('Referral link lookup failed: ' . $e->getMessage());
    }

    return null;
}

function create_referral_from_code(PDO $pdo, string $referralCode, string $referredEmail): bool
{
    ensure_referral_tables($pdo);
    $referredEmail = strtolower(trim($referredEmail));

    if (!filter_var($referredEmail, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $referrerEmail = resolve_referrer_email_from_code($pdo, $referralCode);
    if (!$referrerEmail || $referrerEmail === $referredEmail) {
        return false;
    }

    $existingUser = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $existingUser->execute([$referredEmail]);
    if ($existingUser->fetch()) {
        return false;
    }

    $insert = $pdo->prepare(
        'INSERT IGNORE INTO user_referrals (referrer_email, referred_email, referral_code, status)
         VALUES (?, ?, ?, "pending")'
    );
    $insert->execute([$referrerEmail, $referredEmail, trim($referralCode)]);

    return $insert->rowCount() > 0;
}

/** Link referral during signup (user may already exist in the same transaction). */
function link_referral_on_signup(PDO $pdo, string $referralCode, string $referredEmail): bool
{
    ensure_referral_tables($pdo);
    $referredEmail = strtolower(trim($referredEmail));
    $referralCode = trim($referralCode);

    if ($referralCode === '' || !filter_var($referredEmail, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $referrerEmail = resolve_referrer_email_from_code($pdo, $referralCode);
    if (!$referrerEmail || $referrerEmail === $referredEmail) {
        return false;
    }

    $insert = $pdo->prepare(
        'INSERT IGNORE INTO user_referrals (referrer_email, referred_email, referral_code, status)
         VALUES (?, ?, ?, "pending")'
    );
    $insert->execute([$referrerEmail, $referredEmail, $referralCode]);

    return $insert->rowCount() > 0;
}

function track_referral_article_approval(PDO $pdo, string $authorEmail, int $articleId, ?int $awardedBy): void
{
    ensure_referral_tables($pdo);

    $authorEmail = strtolower(trim($authorEmail));
    if (!filter_var($authorEmail, FILTER_VALIDATE_EMAIL)) {
        return;
    }

    if (!article_qualifies_for_referral_trend($pdo, $articleId)) {
        return;
    }

    $stmt = $pdo->prepare('SELECT * FROM user_referrals WHERE referred_email = ? LIMIT 1 FOR UPDATE');
    $stmt->execute([$authorEmail]);
    $referral = $stmt->fetch();
    if (!$referral || $referral['status'] === 'rewarded') {
        return;
    }

    $qualifyingCount = count_qualifying_referral_articles($pdo, $authorEmail);
    $status = $qualifyingCount >= REFERRAL_QUALIFYING_ARTICLE_TARGET ? 'qualified' : 'pending';

    $pdo->prepare(
        'UPDATE user_referrals
         SET articles_written = ?,
             qualifying_articles = ?,
             status = ?,
             qualified_at = CASE WHEN ? = "qualified" AND qualified_at IS NULL THEN UTC_TIMESTAMP() ELSE qualified_at END
         WHERE id = ?'
    )->execute([
        $qualifyingCount,
        $qualifyingCount,
        $status,
        $status,
        (int) $referral['id'],
    ]);

    if ($qualifyingCount < REFERRAL_QUALIFYING_ARTICLE_TARGET) {
        return;
    }

    $points = REFERRAL_REWARD_POINTS;
    $userStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $userStmt->execute([strtolower((string) $referral['referrer_email'])]);
    $referrer = $userStmt->fetch();
    if (!$referrer) {
        return;
    }

    $pdo->prepare(
        'UPDATE users
         SET points = points + ?, total_points_earned = total_points_earned + ?
         WHERE id = ?'
    )->execute([$points, $points, (int) $referrer['id']]);

    $pdo->prepare(
        'INSERT INTO points_history (user_id, article_id, points, reason, awarded_by)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        (int) $referrer['id'],
        $articleId > 0 ? $articleId : null,
        $points,
        'Referral reward: 5 published current/trending articles',
        $awardedBy ?: null,
    ]);

    $pdo->prepare(
        'UPDATE user_referrals
         SET status = "rewarded", points_earned = ?, rewarded_at = UTC_TIMESTAMP()
         WHERE id = ? AND status <> "rewarded"'
    )->execute([$points, (int) $referral['id']]);
}

function require_referral_owner_or_staff(string $email): void
{
    $user = current_user();
    if (!$user) {
        json_error('Authentication required.', 401);
    }

    if (strtolower((string) $user['email']) === strtolower(trim($email))) {
        return;
    }

    $roles = current_user_roles((int) $user['id']);
    if (!has_any_role($roles, ['admin', 'editor'])) {
        json_error('You do not have permission to view this referral data.', 403);
    }
}
