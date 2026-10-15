<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');

$setupKey = env_value('SETUP_KEY');
if (!$setupKey || ($_SERVER['HTTP_X_SETUP_KEY'] ?? '') !== $setupKey) {
    json_error('Invalid setup key.', 403);
}

$pdo = db();
require_setup_allowed($pdo);

$input = input_json();
$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');
$displayName = trim((string) ($input['display_name'] ?? 'Tradingle Admin'));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
    json_error('Valid email and password with at least 8 characters are required.');
}

$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $userId = (int) $user['id'];
        $pdo->prepare('UPDATE users SET password_hash = ?, display_name = ?, status = "active" WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $displayName, $userId]);
    } else {
        $slug = slugify_php($displayName);
        $pdo->prepare(
            'INSERT INTO users (email, password_hash, display_name, slug, role_title, email_verified_at)
             VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())'
        )->execute([$email, password_hash($password, PASSWORD_DEFAULT), $displayName, $slug, 'Admin']);
        $userId = (int) $pdo->lastInsertId();
    }

    $role = $pdo->prepare("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
    $role->execute();
    $roleId = (int) ($role->fetch()['id'] ?? 0);
    $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$userId, $roleId]);

    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not create admin.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}

json_response(['ok' => true, 'user_id' => $userId]);
