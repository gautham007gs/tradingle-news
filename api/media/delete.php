<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$id = (int) (input_json()['id'] ?? 0);
if ($id <= 0) {
    json_error('Media id is required.');
}

$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM media WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$item = $stmt->fetch();
if (!$item) {
    json_error('Media not found.', 404);
}

$isStaff = has_any_role($roles, ['admin', 'editor']);
if (!$isStaff && (int) $item['user_id'] !== (int) $user['id']) {
    json_error('You can only delete your own media.', 403);
}

// ── Usage guard: block deletion if image is used by any article ───────
// Check featured_image column (URL match)
$usedByStmt = $pdo->prepare(
    "SELECT id, title, slug FROM articles
     WHERE (featured_image = ? OR seo_og_image = ?)
       AND status != 'archived'
     LIMIT 5"
);
$usedByStmt->execute([$item['url'], $item['url']]);
$usedByArticles = $usedByStmt->fetchAll();

// Also check article_media cross-reference table if it exists
$crossRefArticles = [];
try {
    $xStmt = $pdo->prepare(
        "SELECT a.id, a.title, a.slug
         FROM article_media am
         JOIN articles a ON a.id = am.article_id
         WHERE am.media_id = ? AND a.status != 'archived'
         LIMIT 5"
    );
    $xStmt->execute([$id]);
    $crossRefArticles = $xStmt->fetchAll();
} catch (Throwable) { /* table may not exist yet */ }

// Merge and deduplicate
$allUsages = array_unique(
    array_merge(
        array_column($usedByArticles, 'id'),
        array_column($crossRefArticles, 'id')
    )
);

if (!empty($allUsages)) {
    // Build human-readable list for the error response
    $usageList = array_values(array_unique(array_merge($usedByArticles, $crossRefArticles), SORT_REGULAR));
    $usageList = array_slice(array_map(fn($a) => [
        'id'    => (int) $a['id'],
        'title' => $a['title'],
        'slug'  => $a['slug'],
    ], $usageList), 0, 5);

    json_response([
        'ok'      => false,
        'error'   => 'This image is used by ' . count($allUsages) . ' article(s). Remove it from those articles first.',
        'articles' => $usageList,
    ], 409);
}

// ── Safe to delete ────────────────────────────────────────────────────
// Issue #22: dirname(__DIR__) from api/media/ resolves to api/, making the
// path api/uploads/... which is wrong. UPLOAD_BASE_DIR is the definitive
// location configured in api/config.php and already points at the correct
// uploads root (e.g. /home/user/public_html/uploads). We reconstruct the
// absolute path from that constant + the relative portion of storage_path
// (everything after the leading "uploads/" prefix).
$relPath = ltrim((string) $item['storage_path'], '/\\');
// Strip a leading "uploads/" prefix if storage_path is relative to project root
if (strncasecmp($relPath, 'uploads/', 8) === 0) {
    $relPath = substr($relPath, 8);
}
$storagePath = rtrim(UPLOAD_BASE_DIR, '/\\') . '/' . $relPath;
if (is_file($storagePath)) {
    @unlink($storagePath);
}

$pdo->prepare('DELETE FROM media WHERE id = ?')->execute([$id]);

// Issue #121: Immutable audit trail
record_audit_log($pdo, (int) $user['id'], 'media_delete', "Deleted media ID {$id} url='{$item['url']}'", json_encode(['id' => $id, 'url' => $item['url'], 'file_name' => $item['file_name'] ?? '']), null);

json_response(['ok' => true]);
