<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../referral_helpers.php';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    json_error('Google login is not configured yet.', 500);
}

$state = $_GET['state'] ?? '';
$code = $_GET['code'] ?? '';
$storedState = $_SESSION['google_oauth_state'] ?? '';
$stateExpires = $_SESSION['google_oauth_state_expires'] ?? 0;

// Validate state and ensure it hasn't expired
if (!$state || !$code || !hash_equals($storedState, (string) $state) || time() > $stateExpires) {
    json_error('Invalid Google login state.', 400);
}

// Clear the state from session after validation
unset($_SESSION['google_oauth_state']);
unset($_SESSION['google_oauth_state_expires']);

$tokenResponse = file_get_contents('https://oauth2.googleapis.com/token', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query([
            'code' => $code,
            'client_id' => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'redirect_uri' => GOOGLE_REDIRECT_URI,
            'grant_type' => 'authorization_code',
        ]),
    ],
]));

$tokens = json_decode($tokenResponse ?: '{}', true);
if (empty($tokens['access_token'])) {
    json_error('Could not complete Google login.', 400);
}

$profileResponse = file_get_contents('https://www.googleapis.com/oauth2/v3/userinfo', false, stream_context_create([
    'http' => [
        'header' => 'Authorization: Bearer ' . $tokens['access_token'] . "\r\n",
    ],
]));

$profile = json_decode($profileResponse ?: '{}', true);
$providerId = (string) ($profile['sub'] ?? '');
$email = strtolower((string) ($profile['email'] ?? ''));
$name = trim((string) ($profile['name'] ?? ''));
$avatar = (string) ($profile['picture'] ?? '');

// Issue #28: require email_verified so Google accounts with unverified
// addresses (possible for some GSuite/Workspace domains) cannot be used
// to claim a matching existing account on this site.
if (!$providerId || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Google did not return a valid profile.', 400);
}
if (empty($profile['email_verified'])) {
    json_error('Your Google account email address has not been verified. Please verify your email with Google and try again.', 400);
}

$pdo = db();
$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare("SELECT u.* FROM oauth_accounts oa INNER JOIN users u ON u.id = oa.user_id WHERE oa.provider = 'google' AND oa.provider_user_id = ? LIMIT 1");
    $stmt->execute([$providerId]);
    $user = $stmt->fetch();

    if (!$user) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            $displayName = $name ?: explode('@', $email)[0];
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

            $insert = $pdo->prepare(
                'INSERT INTO users (email, display_name, slug, avatar_url, role_title, email_verified_at)
                 VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())'
            );
            $insert->execute([$email, $displayName, $slug, $avatar ?: null, 'Contributor']);
            $userId = (int) $pdo->lastInsertId();

            $role = $pdo->prepare("SELECT id FROM roles WHERE name = 'contributor' LIMIT 1");
            $role->execute();
            $roleId = (int) ($role->fetch()['id'] ?? 0);
            $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $roleId]);

            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            $signupReferral = trim((string) ($_SESSION['signup_referral_code'] ?? ''));
            if ($signupReferral !== '') {
                ensure_referral_tables($pdo);
                link_referral_on_signup($pdo, $signupReferral, $email);
                unset($_SESSION['signup_referral_code']);
            }
        }

        // Google is used for authentication only — the app never calls Google
        // APIs after login. The identity is persisted (provider + sub + email)
        // but the Google access/refresh tokens are deliberately NOT stored:
        // they are short-lived, unnecessary after auth, and plaintext rows
        // would be usable if the DB were ever compromised.
        $pdo->prepare(
            'INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, access_token, refresh_token, expires_at)
             VALUES (?, "google", ?, ?, NULL, NULL, NULL)'
        )->execute([
            $user['id'],
            $providerId,
            $email,
        ]);
    }

    $pdo->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$user['id']]);
    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not complete Google login.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}

// Issue #29: Suspended/inactive accounts must not receive a new session
// even via OAuth. Check status after the transaction commits so we always
// read the freshest value.
if (($user['status'] ?? '') !== 'active') {
    http_response_code(403);
    header('Location: ' . FRONTEND_URL . '/login?error=account_suspended');
    exit;
}

// Establish the session. create_user_session() sets the HttpOnly
// `tradingle_session` cookie; its return value is deliberately discarded.
create_user_session((int) $user['id']);

// The session is established via the HttpOnly `tradingle_session` cookie set
// by create_user_session(). Never echo the session token into the redirect
// URL — the `#token=` fragment previously exposed the credential to any
// JavaScript running on the destination page. A non-sensitive `oauth=1` flag
// tells the frontend to refresh its auth state from the cookie.
$redirect = FRONTEND_URL . '/contributor?oauth=1';
header('Location: ' . $redirect);
exit;
