<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$stmt = db()->query('SELECT points_per_article FROM points_settings WHERE id = 1 LIMIT 1');
$row = $stmt->fetch();

json_response(['points_per_article' => (int) ($row['points_per_article'] ?? 10)]);
