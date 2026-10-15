<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

ensure_cms_schema_upgrades(db());

$stmt = db()->query(
    'SELECT id, name, slug, description, parent_id, image_url, sort_order, seo_title, seo_description,
            show_in_nav, nav_label, nav_order, color
     FROM categories
     WHERE is_active = 1
     ORDER BY sort_order ASC, name ASC'
);

json_response(['data' => $stmt->fetchAll()]);
