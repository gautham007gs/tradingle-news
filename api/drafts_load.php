<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET');
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$articleId = isset($_GET['article_id']) && $_GET['article_id'] !== '' ? (int) $_GET['article_id'] : 0;

$pdo = db();
$stmt = $pdo->prepare('SELECT id, content, updated_at FROM drafts WHERE user_id = ? AND article_id = ? ORDER BY updated_at DESC LIMIT 1');
$stmt->execute([(int) $user['id'], $articleId]);
$draft = $stmt->fetch();

json_response(['data' => $draft ?: null]);
