<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$currentUser] = require_roles(['admin']);

function unique_author_slug(string $base, int $ignoreId = 0): string
{
    $slug = slugify_php($base);
    $candidate = $slug;
    $i = 2;
    while (true) {
        $stmt = db()->prepare('SELECT id FROM users WHERE slug = ? AND id <> ? LIMIT 1');
        $stmt->execute([$candidate, $ignoreId]);
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $candidate = $slug . '-' . $i;
        $i++;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->query(
        "SELECT u.id, u.email, u.display_name, u.slug, u.avatar_url, u.bio, u.role_title,
                u.social_x, u.social_linkedin, u.social_website, u.status,
                COUNT(a.id) AS article_count
         FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id AND r.name = 'author'
         LEFT JOIN articles a ON a.author_id = u.id
         WHERE u.status <> 'deleted'
         GROUP BY u.id
         ORDER BY u.display_name ASC"
    );
    json_response(['data' => $stmt->fetchAll()]);
}

require_method('POST');

$input = input_json();
$action = trim((string) ($_GET['action'] ?? $input['action'] ?? ''));
$id = (int) ($input['id'] ?? 0);

if ($action === 'delete') {
    if ($id <= 0) {
        json_error('Author ID is required for deletion.');
    }
    $stmt = db()->prepare('UPDATE users SET status = ? WHERE id = ?');
    $stmt->execute(['deleted', $id]);
    json_response(['ok' => true]);
}

$displayName = trim((string) ($input['display_name'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$slugInput = trim((string) ($input['slug'] ?? ''));
$avatar = trim((string) ($input['avatar_url'] ?? ''));
$bio = trim((string) ($input['bio'] ?? ''));
$roleTitle = trim((string) ($input['role_title'] ?? ''));
$socialX = trim((string) ($input['social_x'] ?? ''));
$socialLinkedin = trim((string) ($input['social_linkedin'] ?? ''));
$socialWebsite = trim((string) ($input['social_website'] ?? ''));

if ($displayName === '') {
    json_error('Author name is required.');
}

$slug = unique_author_slug($slugInput !== '' ? $slugInput : $displayName, $id);
$email = $email !== '' ? $email : $slug . '@authors.tradingle.local';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Enter a valid author email.');
}

$pdo = db();
$pdo->beginTransaction();
try {
    if ($id > 0) {
        $stmt = $pdo->prepare(
            'UPDATE users
             SET email = ?, display_name = ?, slug = ?, avatar_url = ?, bio = ?, role_title = ?,
                 social_x = ?, social_linkedin = ?, social_website = ?, status = "active"
             WHERE id = ?'
        );
        $stmt->execute([
            $email, $displayName, $slug, $avatar ?: null, $bio ?: null, $roleTitle ?: null,
            $socialX ?: null, $socialLinkedin ?: null, $socialWebsite ?: null, $id,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO users
              (email, display_name, slug, avatar_url, bio, role_title, social_x, social_linkedin, social_website, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active")'
        );
        $stmt->execute([
            $email, $displayName, $slug, $avatar ?: null, $bio ?: null, $roleTitle ?: null,
            $socialX ?: null, $socialLinkedin ?: null, $socialWebsite ?: null,
        ]);
        $id = (int) $pdo->lastInsertId();
    }

    $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE name = "author" LIMIT 1');
    $roleStmt->execute();
    $role = $roleStmt->fetch();
    if ($role) {
        $pdo->prepare('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)')->execute([$id, (int) $role['id']]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not save author.', 500, $e->getMessage());
}

json_response(['ok' => true, 'id' => $id, 'slug' => $slug]);
