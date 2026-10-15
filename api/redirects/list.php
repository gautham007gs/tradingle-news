<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$pdo = db();
ensure_cms_schema_upgrades($pdo);

$stmt = $pdo->query('SELECT id, from_path, to_path, status_code, article_id, is_active FROM redirects ORDER BY id ASC');
$rows = $stmt->fetchAll();

header('Cache-Control: public, max-age=60, stale-while-revalidate=30');
json_response(['data' => $rows]);
