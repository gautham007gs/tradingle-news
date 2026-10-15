<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    json_error('Google login is not configured yet.', 500);
}

$state = bin2hex(random_bytes(16));

$_SESSION['google_oauth_state'] = $state;
$_SESSION['google_oauth_state_expires'] = time() + 600;

$referralCode = trim((string) ($_GET['ref'] ?? ''));
if ($referralCode !== '' && preg_match('/^[a-zA-Z0-9_-]{6,64}$/', $referralCode)) {
    $_SESSION['signup_referral_code'] = $referralCode;
}

$params = http_build_query([
    'client_id' => GOOGLE_CLIENT_ID,
    'redirect_uri' => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope' => 'openid email profile',
    'state' => $state,
    'prompt' => 'select_account',
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
