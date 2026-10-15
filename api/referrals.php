<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/referral_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = (string) ($_GET['action'] ?? 'stats');
$pdo = db();

$tempDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'temp-mail.org', 'throwaway.email', 'dispostable.com', 'sharklasers.com',
    'spam4.me', 'yopmail.com', 'tempmail.info', 'fakeinbox.com',
    'throwawaymail.com', 'trashmail.com', 'maildrop.cc',
];

$isRealEmail = static function (string $email) use ($tempDomains): bool {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $domain = strtolower(substr(strrchr($email, '@'), 1) ?: '');
    if (in_array($domain, $tempDomains, true)) {
        return false;
    }
    return !preg_match('/(temp|trash|fake|throwaway|guerrilla)/i', $domain);
};

$emailFromAuthenticatedUser = static function () {
    $user = current_user();
    if (!$user) {
        json_error('Authentication required.', 401);
    }
    return strtolower((string) $user['email']);
};

try {
    ensure_referral_tables($pdo);

    if ($action === 'stats') {
        require_method('GET');
        $email = $emailFromAuthenticatedUser();
        if (!$isRealEmail($email)) {
            json_error('Valid email required.');
        }

        $referralCode = get_or_create_referral_code($pdo, $email);

        $totalReferrals = 0;
        $qualifiedReferrals = 0;
        $totalPointsEarned = 0;
        $pendingProgress = 0;

        $totalStmt = $pdo->prepare('SELECT COUNT(*) AS count FROM user_referrals WHERE referrer_email = ?');
        $totalStmt->execute([$email]);
        $totalReferrals = (int) ($totalStmt->fetch()['count'] ?? 0);

        $qualifiedStmt = $pdo->prepare(
            'SELECT COUNT(*) AS count FROM user_referrals WHERE referrer_email = ? AND status IN ("qualified", "rewarded")'
        );
        $qualifiedStmt->execute([$email]);
        $qualifiedReferrals = (int) ($qualifiedStmt->fetch()['count'] ?? 0);

        $pointsStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(points_earned), 0) AS total FROM user_referrals WHERE referrer_email = ? AND status = "rewarded"'
        );
        $pointsStmt->execute([$email]);
        $totalPointsEarned = (int) ($pointsStmt->fetch()['total'] ?? 0);

        $pendingStmt = $pdo->prepare(
            'SELECT COALESCE(AVG(qualifying_articles), 0) AS avg_progress
             FROM user_referrals
             WHERE referrer_email = ? AND status = "pending"'
        );
        $pendingStmt->execute([$email]);
        $pendingProgress = (int) round((float) ($pendingStmt->fetch()['avg_progress'] ?? 0));

        json_response([
            'success' => true,
            'data' => [
                'totalReferrals' => $totalReferrals,
                'qualifiedReferrals' => $qualifiedReferrals,
                'totalPointsEarned' => $totalPointsEarned,
                'referralCode' => $referralCode,
                'qualifyingTarget' => REFERRAL_QUALIFYING_ARTICLE_TARGET,
                'avgPendingProgress' => $pendingProgress,
            ],
        ]);
    }

    if ($action === 'create') {
        require_method('POST');
        require_csrf_token();
        $referrerEmail = $emailFromAuthenticatedUser();
        $input = input_json();
        $referredEmail = strtolower(trim((string) ($input['referredEmail'] ?? '')));

        if (!$isRealEmail($referredEmail)) {
            json_error('Please use a valid non-temporary email address.');
        }
        if ($referrerEmail === $referredEmail) {
            json_error('You cannot refer yourself.');
        }

        $code = get_or_create_referral_code($pdo, $referrerEmail);
        $created = create_referral_from_code($pdo, $code, $referredEmail);
        if (!$created) {
            json_error('This email has already been referred or has an account.', 409);
        }

        json_response(['success' => true, 'data' => ['referralCode' => $code]], 201);
    }

    if ($action === 'by-code') {
        require_method('GET');
        $code = trim((string) ($_GET['code'] ?? ''));
        if ($code === '' || !preg_match('/^[a-zA-Z0-9_-]{6,64}$/', $code)) {
            json_error('Invalid referral code.', 400);
        }
        $valid = resolve_referrer_email_from_code($pdo, $code) !== null;
        if (!$valid) {
            json_error('Referral code not found.', 404);
        }
        json_response(['success' => true, 'data' => ['valid' => true, 'referralCode' => $code]]);
    }

    if ($action === 'check') {
        // Issue #38: require authentication. An unauthenticated `check` endpoint
        // lets any caller enumerate whether an email is in our user_referrals
        // table — a silent account-existence oracle. Authentication limits this
        // to users who already have an account on the platform.
        require_method('GET');
        $emailFromAuthenticatedUser(); // throws 401 if not logged in
        $email = strtolower(trim((string) ($_GET['email'] ?? '')));
        if (!$isRealEmail($email)) {
            json_error('Valid email required.');
        }
        $stmt = $pdo->prepare('SELECT id FROM user_referrals WHERE referred_email = ? LIMIT 1');
        $stmt->execute([$email]);
        json_response(['success' => true, 'data' => ['isReferred' => (bool) $stmt->fetch()]]);
    }

    if ($action === 'list') {
        require_method('GET');
        $email = $emailFromAuthenticatedUser();
        if (!$isRealEmail($email)) {
            json_error('Valid email required.');
        }
        $stmt = $pdo->prepare(
            'SELECT referred_email, articles_written, qualifying_articles, status, points_earned, created_at, qualified_at, rewarded_at
             FROM user_referrals
             WHERE referrer_email = ?
             ORDER BY created_at DESC'
        );
        $stmt->execute([$email]);
        json_response([
            'success' => true,
            'data' => [
                'referrals' => $stmt->fetchAll(),
                'qualifyingTarget' => REFERRAL_QUALIFYING_ARTICLE_TARGET,
            ],
        ]);
    }

    if ($action === 'track-article') {
        require_method('POST');
        require_csrf_token();
        [$reviewer] = require_roles(['admin', 'editor']);
        $input = input_json();
        $authorEmail = strtolower(trim((string) ($input['authorEmail'] ?? '')));
        $articleId = (int) ($input['articleId'] ?? 0);
        if (!$isRealEmail($authorEmail)) {
            json_error('Valid author email required.');
        }
        $pdo->beginTransaction();
        try {
            track_referral_article_approval($pdo, $authorEmail, $articleId, (int) $reviewer['id']);
            $pdo->commit();
        } catch (Throwable $e) {
            safe_rollback($pdo);
            throw $e;
        }
        json_response(['success' => true, 'data' => ['tracked' => true]]);
    }

    json_error('Action not found.', 404);
} catch (Throwable $e) {
    json_error('Referral request failed.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}
