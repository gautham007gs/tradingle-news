<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../referral_helpers.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

// Rate limit registration attempts
$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':register', 5, 3600)) {
    json_error('Too many registration attempts. Please try again later.', 429);
}

$input = input_json();
$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');
$displayName = trim((string) ($input['display_name'] ?? $input['name'] ?? ''));
$referralCode = trim((string) ($input['referral_code'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Enter a valid email address.');
}

if (strlen($password) < MIN_PASSWORD_LENGTH) {
    json_error('Password must be at least ' . MIN_PASSWORD_LENGTH . ' characters.');
}

if ($displayName === '') {
    $displayName = explode('@', $email)[0];
}

$pdo = db();
if ($referralCode !== '') {
    ensure_referral_tables($pdo);
}
$existing = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$existing->execute([$email]);
if ($existing->fetch()) {
    json_error('An account already exists with this email.', 409);
}

$baseSlug = slugify_php($displayName);
$slug = $baseSlug;
$i = 2;
while (true) {
    $check = $pdo->prepare('SELECT id FROM users WHERE slug = ? LIMIT 1');
    $check->execute([$slug]);
    if (!$check->fetch()) {
        break;
    }
    $slug = $baseSlug . '-' . $i++;
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare(
        'INSERT INTO users (email, password_hash, display_name, slug, role_title)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $email,
        password_hash($password, PASSWORD_DEFAULT),
        $displayName,
        $slug,
        'Contributor',
    ]);
    $userId = (int) $pdo->lastInsertId();

    $role = $pdo->prepare("SELECT id FROM roles WHERE name = 'contributor' LIMIT 1");
    $role->execute();
    $roleId = (int) ($role->fetch()['id'] ?? 0);
    $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $roleId]);

    if ($referralCode !== '') {
        $createdReferral = link_referral_on_signup($pdo, $referralCode, $email);
        if (!$createdReferral) {
            error_log('Referral signup not linked for ' . $email . ' using code ' . $referralCode);
        }
    }

    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not create account.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}

$userStmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$userStmt->execute([$userId]);
$user = $userStmt->fetch();

// ── Email verification (issue #16) ─────────────────────────────────────────
// The account is created unverified; a single-use token is emailed so the
// address is proven before the account is trusted. Delivery is best-effort —
// registration still succeeds, the user can hit resend-verification.php.
ensure_account_tables($pdo);
$verifyToken = create_single_use_token($pdo, 'email_verifications', $userId, 86400);
$verifyUrl = account_action_url('/verify-email', ['token' => $verifyToken]);
$sent = send_account_email(
    $email,
    'Verify your email address',
    '<h1 style="font-size:18px;margin:0 0 12px">Verify your email</h1>'
        . '<p>Thanks for creating an account. Confirm your address to finish signing up:</p>'
        . '<p><a href="' . htmlspecialchars($verifyUrl, ENT_QUOTES) . '" style="display:inline-block;background:#0052ff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px">Verify email</a></p>'
        . '<p style="color:#666;font-size:13px">Or paste this link: ' . htmlspecialchars($verifyUrl, ENT_QUOTES) . '</p>'
        . '<p style="color:#666;font-size:13px">This link expires in 24 hours.</p>'
);
if (!$sent) {
    error_log('register: failed to send verification email to ' . $email);
}

$roles = current_user_roles($userId);
$sessionToken = create_user_session($userId);

$userPayload = public_user($user, $roles);
$userPayload['email_verified'] = !empty($user['email_verified_at']);
$userPayload['verification_email_sent'] = $sent;

json_response(['user' => $userPayload, 'session_token' => $sessionToken], 201);
