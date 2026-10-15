<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');
require_roles(['admin', 'editor']);

$stmt = db()->query("
    SELECT id, email, source, category_slug, status, subscribed_at, unsubscribed_at
    FROM newsletters
    ORDER BY subscribed_at DESC
    LIMIT 500
");

$total = db()->query("SELECT COUNT(*) AS c FROM newsletters WHERE status = 'subscribed'")->fetch();

json_response([
    'data' => $stmt->fetchAll(),
    'total_subscribed' => (int) ($total['c'] ?? 0),
]);
