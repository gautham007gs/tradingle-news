<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

// Issue #23: authors and contributors may only see their own uploads;
// admins and editors may see all media for the library picker.
$isStaff = has_any_role($roles, ['admin', 'editor']);

$limit  = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
$offset = max(0, (int) ($_GET['offset'] ?? 0));

if ($isStaff) {
    $stmt = db()->prepare(
        'SELECT id, user_id, url, storage_path, file_name, mime_type, size_bytes, width, height, alt_text, caption, credit, created_at
         FROM media
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?'
    );
    $stmt->execute([$limit, $offset]);
} else {
    $stmt = db()->prepare(
        'SELECT id, user_id, url, storage_path, file_name, mime_type, size_bytes, width, height, alt_text, caption, credit, created_at
         FROM media
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?'
    );
    $stmt->execute([(int) $user['id'], $limit, $offset]);
}

json_response(['data' => $stmt->fetchAll()]);
