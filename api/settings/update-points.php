<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
require_roles(['admin']);

$points = max(0, (int) (input_json()['points_per_article'] ?? 0));
db()->prepare('UPDATE points_settings SET points_per_article = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')->execute([$points]);

json_response(['ok' => true, 'points_per_article' => $points]);
