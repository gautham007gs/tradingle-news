<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');

$token = current_session_token();
if ($token) {
    $stmt = db()->prepare('UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE session_token_hash = ?');
    $stmt->execute([session_token_hash($token)]);
}

clear_session_cookie();
json_response(['ok' => true]);
