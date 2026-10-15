<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: text/html; charset=utf-8');

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $setupKey = env_value('SETUP_KEY');
    $providedKey = (string) ($_POST['setup_key'] ?? '');
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    $displayName = trim((string) ($_POST['display_name'] ?? 'Tradingle Admin'));

    if (!$setupKey || !hash_equals($setupKey, $providedKey)) {
        $error = 'Invalid setup key.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        $error = 'Use a valid email and a password with at least 8 characters.';
    } elseif (!require_setup_allowed(db())) {
        $error = 'Setup has already been completed. An admin account exists; use the normal password reset flow instead.';
    } else {
        try {
            $pdo = db();
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user) {
                $userId = (int) $user['id'];
                $pdo->prepare('UPDATE users SET password_hash = ?, display_name = ?, status = "active" WHERE id = ?')
                    ->execute([password_hash($password, PASSWORD_DEFAULT), $displayName, $userId]);
            } else {
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
            $message = 'Admin created successfully. Delete api/setup/create-admin-form.php and api/setup/create-admin.php now.';
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                safe_rollback($pdo);
            }
            $error = APP_ENV === 'local' ? $e->getMessage() : 'Could not create admin.';
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Create Tradingle Admin</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f6f6; margin: 0; padding: 32px; }
    form { max-width: 440px; margin: 0 auto; background: white; padding: 24px; border: 1px solid #ddd; }
    label { display: block; font-size: 13px; font-weight: 700; margin-top: 14px; }
    input { width: 100%; box-sizing: border-box; padding: 10px; margin-top: 6px; border: 1px solid #ccc; }
    button { margin-top: 18px; width: 100%; padding: 12px; border: 0; background: #e64a2e; color: white; font-weight: 700; cursor: pointer; }
    .ok { color: #0a7a32; font-weight: 700; }
    .err { color: #b00020; font-weight: 700; }
    p { font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <form method="post">
    <h1>Create Admin</h1>
    <p>This temporary setup page creates your first Tradingle admin account.</p>
    <?php if ($message): ?><p class="ok"><?= htmlspecialchars($message) ?></p><?php endif; ?>
    <?php if ($error): ?><p class="err"><?= htmlspecialchars($error) ?></p><?php endif; ?>

    <label>Setup Key</label>
    <input name="setup_key" type="password" required>

    <label>Admin Email</label>
    <input name="email" type="email" value="admin@tradingle.com" required>

    <label>Admin Password</label>
    <input name="password" type="password" minlength="8" required>

    <label>Display Name</label>
    <input name="display_name" value="Tradingle Admin" required>

    <button type="submit">Create Admin</button>
  </form>
</body>
</html>
