<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin']);

ensure_cms_schema_upgrades(db());

$input = input_json();
$id = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;
$fromPath = trim((string) ($input['from_path'] ?? ''));
$toPath = trim((string) ($input['to_path'] ?? ''));
$statusCode = (int) ($input['status_code'] ?? 301);
$articleId = isset($input['article_id']) && $input['article_id'] !== '' ? (int) $input['article_id'] : null;
$isActive = array_key_exists('is_active', $input) ? (int) (bool) $input['is_active'] : 1;

if ($fromPath === '' || $fromPath[0] !== '/') {
    json_error("'from' must be a site-relative path starting with /");
}
if ($toPath === '') {
    json_error("'to' is required");
}
if ($fromPath === $toPath) {
    json_error("'from' and 'to' cannot be the same path (redirect loop)");
}
if (!in_array($statusCode, [301, 302], true)) {
    json_error('status_code must be 301 or 302');
}

if ($id) {
    $stmt = db()->prepare(
        'UPDATE redirects SET from_path = ?, to_path = ?, status_code = ?, article_id = ?, is_active = ? WHERE id = ?'
    );
    $stmt->execute([$fromPath, $toPath, $statusCode, $articleId, $isActive, $id]);
    json_response(['ok' => true, 'id' => $id]);
}

try {
    $stmt = db()->prepare(
        'INSERT INTO redirects (from_path, to_path, status_code, article_id, is_active) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$fromPath, $toPath, $statusCode, $articleId, $isActive]);
} catch (PDOException $e) {
    // uq_redirect_from — a redirect for this path already exists
    if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate')) {
        json_error("A redirect from \"$fromPath\" already exists.");
    }
    throw $e;
}

json_response(['ok' => true, 'id' => (int) db()->lastInsertId()]);
