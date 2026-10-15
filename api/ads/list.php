<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$stmt = db()->query(
    "SELECT slot_key, label, placement, provider, format, width, height, desktop_enabled, mobile_enabled,
            is_active, lazy_load, auto_insert, insert_after_paragraph, google_client, google_slot,
            gam_unit_path, custom_html, image_url, target_url, disclosure_label
     FROM ad_slots
     WHERE is_active = 1
     ORDER BY placement ASC, slot_key ASC"
);

json_response(['data' => $stmt->fetchAll()]);
