<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/account_helpers.php';

require_method('POST');

// Enumerate-proof: unknown addresses get the same generic success response.
$clientIp = get_client_ip();
if (!rate_limit($clientIp . ':forgot-password', 5, 3600)) {
    json_error('Too many requests. Please try again later.', 429);
}

$input = input_json();
$email = strtolower(trim((string) ($input['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['ok' => true]);
}

$pdo = db();
ensure_account_tables($pdo);

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND status = 'active' LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $userId = (int) $user['id'];
    // Invalidate any previous outstanding reset for this user.
    $pdo->prepare("UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL")
        ->execute([$userId]);

    $resetToken = create_single_use_token($pdo, 'password_resets', $userId, 1800);
    $resetUrl = account_action_url('/reset-password', ['token' => $resetToken]);
    $sent = send_account_email(
        $email,
        'Reset your password',
        '<h1 style="font-size:18px;margin:0 0 12px">Reset your password</h1>'
            . '<p>We received a request to reset your password. Use the link below to choose a new one:</p>'
            . '<p><a href="' . htmlspecialchars($resetUrl, ENT_QUOTES) . '" style="display:inline-block;background:#0052ff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px">Reset password</a></p>'
            . '<p style="color:#666;font-size:13px">This link expires in 30 minutes. If you did not request this, you can safely ignore this email — your password will not change.</p>'
    );
    if (!$sent) {
        error_log('forgot-password: failed to send reset email to ' . $email);
    }
}

json_response(['ok' => true]);
