<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin']);

$input = input_json();
$id = (int) ($input['id'] ?? 0);
if ($id <= 0) {
    json_error('A valid redirect id is required.');
}

$stmt = db()->prepare('DELETE FROM redirects WHERE id = ?');
$stmt->execute([$id]);

json_response(['ok' => true]);
