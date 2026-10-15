<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

// Enumerate-proof: a non-existent or already-verified address gets the same
// generic success response. The only cost is the rate limit + one SELECT.
$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':resend-verification', 5, 3600)) {
    json_error('Too many requests. Please try again later.', 429);
}

$input = input_json();
$email = strtolower(trim((string) ($input['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['ok' => true, 'sent' => false]);
}

$pdo = db();
ensure_account_tables($pdo);

$stmt = $pdo->prepare("SELECT id, email_verified_at FROM users WHERE email = ? AND status = 'active' LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

$sent = false;
if ($user && empty($user['email_verified_at'])) {
    $userId = (int) $user['id'];
    $verifyToken = create_single_use_token($pdo, 'email_verifications', $userId, 86400);
    $verifyUrl = account_action_url('/verify-email', ['token' => $verifyToken]);
    $sent = send_account_email(
        $email,
        'Verify your email address',
        '<h1 style="font-size:18px;margin:0 0 12px">Verify your email</h1>'
            . '<p>Confirm your address to finish signing up:</p>'
            . '<p><a href="' . htmlspecialchars($verifyUrl, ENT_QUOTES) . '" style="display:inline-block;background:#0052ff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px">Verify email</a></p>'
            . '<p style="color:#666;font-size:13px">This link expires in 24 hours.</p>'
    );
    if (!$sent) {
        error_log('resend-verification: failed to send email to ' . $email);
    }
}

// Always succeed; never reveal whether the address exists or is already verified.
json_response(['ok' => true, 'sent' => $sent]);
