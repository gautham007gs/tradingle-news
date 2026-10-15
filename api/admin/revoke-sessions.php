<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_roles(['admin']);

$input = input_json();
$userId = isset($input['user_id']) ? (int) $input['user_id'] : 0;

if ($userId <= 0) {
    json_error('Valid user_id is required.');
}

$pdo = db();

// Ensure the user exists
$userStmt = $pdo->prepare('SELECT id FROM users WHERE id = ? AND status <> "deleted"');
$userStmt->execute([$userId]);
if (!$userStmt->fetch()) {
    json_error('User not found.', 404);
}

// Revoke all sessions for the user
$stmt = $pdo->prepare(
    'UPDATE user_sessions
     SET revoked_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND revoked_at IS NULL'
);
$stmt->execute([$userId]);

json_response([
    'ok' => true,
    'message' => 'All active sessions for the user have been revoked.',
]);
