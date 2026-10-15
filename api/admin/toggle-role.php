<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$currentUser] = require_roles(['admin']);

$input = input_json();
$userId = (int) ($input['user_id'] ?? 0);
$role = trim((string) ($input['role'] ?? ''));
$enabled = (bool) ($input['enabled'] ?? false);
$allowed = ['admin', 'editor', 'author', 'contributor', 'reader'];

if ($userId <= 0 || !in_array($role, $allowed, true)) {
    json_error('Valid user and role are required.');
}

$roleStmt = db()->prepare('SELECT id FROM roles WHERE name = ? LIMIT 1');
$roleStmt->execute([$role]);
$roleRow = $roleStmt->fetch();
if (!$roleRow) {
    json_error('Role not found.', 404);
}
$roleId = (int) $roleRow['id'];

if (!$enabled && $role === 'admin') {
    $countStmt = db()->query(
        "SELECT COUNT(*) AS c
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name = 'admin'"
    );
    $adminCount = (int) $countStmt->fetch()['c'];
    if ($adminCount <= 1) {
        json_error('At least one admin must remain.', 422);
    }
    if ($userId === (int) $currentUser['id']) {
        json_error('You cannot remove your own admin role while signed in.', 422);
    }
}

if ($enabled) {
    $stmt = db()->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)');
    $stmt->execute([$userId, $roleId]);
} else {
    $stmt = db()->prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?');
    $stmt->execute([$userId, $roleId]);
}

// Issue #121: Record to immutable audit trail
$actionName = $enabled ? 'role_grant' : 'role_revoke';
$details = "Admin (User ID {$currentUser['id']}) toggled role '{$role}' to " . ($enabled ? 'ENABLED' : 'DISABLED') . " for User ID {$userId}";
record_audit_log(db(), (int) $currentUser['id'], $actionName, $details);

json_response(['ok' => true]);
