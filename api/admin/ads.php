<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$user] = require_roles(['admin', 'editor']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->query(
        "SELECT id, slot_key, label, placement, provider, format, width, height, desktop_enabled, mobile_enabled,
                is_active, lazy_load, auto_insert, insert_after_paragraph, google_client, google_slot,
                gam_unit_path, custom_html, image_url, target_url, disclosure_label, notes, updated_at
         FROM ad_slots
         ORDER BY placement ASC, slot_key ASC"
    );
    json_response(['data' => $stmt->fetchAll()]);
}

require_method('POST');
require_csrf_token();
$input = input_json();

$slotKey = strtolower(trim((string) ($input['slot_key'] ?? '')));
$slotKey = preg_replace('/[^a-z0-9_]+/', '_', $slotKey) ?? '';
$slotKey = trim($slotKey, '_');
$label = trim((string) ($input['label'] ?? ''));
$placement = trim((string) ($input['placement'] ?? ''));
$provider = (string) ($input['provider'] ?? 'placeholder');
$format = (string) ($input['format'] ?? 'rectangle');

$providers = ['placeholder','google_adsense','google_ad_manager','custom_html','image','affiliate','sponsored'];
$formats = ['leaderboard','rectangle','skyscraper','native','in_article','sticky','fluid','custom'];
if ($label === '' || $placement === '') {
    json_error('Slot label and placement are required.');
}
if (!in_array($provider, $providers, true)) {
    $provider = 'placeholder';
}
if (!in_array($format, $formats, true)) {
    $format = 'rectangle';
}

$id = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;
$params = [
    $slotKey,
    $label,
    $placement,
    $provider,
    $format,
    isset($input['width']) && $input['width'] !== '' ? (int) $input['width'] : null,
    isset($input['height']) && $input['height'] !== '' ? (int) $input['height'] : null,
    !empty($input['desktop_enabled']) ? 1 : 0,
    !empty($input['mobile_enabled']) ? 1 : 0,
    !empty($input['is_active']) ? 1 : 0,
    !empty($input['lazy_load']) ? 1 : 0,
    !empty($input['auto_insert']) ? 1 : 0,
    isset($input['insert_after_paragraph']) && $input['insert_after_paragraph'] !== '' ? (int) $input['insert_after_paragraph'] : null,
    trim((string) ($input['google_client'] ?? '')) ?: null,
    trim((string) ($input['google_slot'] ?? '')) ?: null,
    trim((string) ($input['gam_unit_path'] ?? '')) ?: null,
    (string) ($input['custom_html'] ?? '') ?: null,
    trim((string) ($input['image_url'] ?? '')) ?: null,
    trim((string) ($input['target_url'] ?? '')) ?: null,
    trim((string) ($input['disclosure_label'] ?? 'Advertisement')) ?: 'Advertisement',
    trim((string) ($input['notes'] ?? '')) ?: null,
];

if ($id) {
    $stmt = db()->prepare(
        "UPDATE ad_slots
         SET slot_key = ?, label = ?, placement = ?, provider = ?, format = ?, width = ?, height = ?,
             desktop_enabled = ?, mobile_enabled = ?, is_active = ?, lazy_load = ?, auto_insert = ?,
             insert_after_paragraph = ?, google_client = ?, google_slot = ?, gam_unit_path = ?,
             custom_html = ?, image_url = ?, target_url = ?, disclosure_label = ?, notes = ?
         WHERE id = ?"
    );
    $params[] = $id;
    $stmt->execute($params);

    // Issue #121: Record to immutable audit trail
    $details = "User (User ID {$user['id']}) updated ad slot '{$slotKey}' (ID {$id})";
    record_audit_log(db(), (int) $user['id'], 'ad_slot_update', $details, null, json_encode($input));

    json_response(['ok' => true, 'id' => $id]);
}

$stmt = db()->prepare(
    "INSERT INTO ad_slots
     (slot_key, label, placement, provider, format, width, height, desktop_enabled, mobile_enabled,
      is_active, lazy_load, auto_insert, insert_after_paragraph, google_client, google_slot,
      gam_unit_path, custom_html, image_url, target_url, disclosure_label, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->execute($params);
$newId = (int) db()->lastInsertId();

// Issue #121: Record to immutable audit trail
$details = "User (User ID {$user['id']}) created ad slot '{$slotKey}' (ID {$newId})";
record_audit_log(db(), (int) $user['id'], 'ad_slot_create', $details, null, json_encode($input));

json_response(['ok' => true, 'id' => $newId]);
