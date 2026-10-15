<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('POST');
require_csrf_token();
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$input = input_json();
$articleId = isset($input['article_id']) && $input['article_id'] !== '' ? (int) $input['article_id'] : 0;
$content = (string) ($input['content'] ?? '');

// Prevent extremely large drafts
if (strlen($content) > 1024 * 1024) {
    json_error('Draft too large.', 413);
}

$pdo = db();

$stmt = $pdo->prepare('
    INSERT INTO drafts (user_id, article_id, content, updated_at) 
    VALUES (?, ?, ?, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = VALUES(updated_at)
');
$stmt->execute([(int) $user['id'], $articleId, $content]);

$idStmt = $pdo->prepare('SELECT id FROM drafts WHERE user_id = ? AND article_id = ? LIMIT 1');
$idStmt->execute([(int) $user['id'], $articleId]);
$id = (int) ($idStmt->fetch()['id'] ?? 0);

json_response(['ok' => true, 'id' => $id, 'updated_at' => gmdate('Y-m-d H:i:s')]);
