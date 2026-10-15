<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET');

/**
 * Site navigation (primary nav, footer columns, social links) — previously
 * stored in data/navigation.json, a file that's part of the git repo, which
 * means a live edit made through the CMS could be silently reverted by the
 * next code deploy if that deploy pulls a fresh copy from git rather than
 * preserving the server's locally-modified file. Now stored in the same
 * site_settings table used for other durable site config, which isn't
 * touched by code deploys at all.
 *
 * Returns { data: null } when nothing has been saved yet; the frontend
 * (lib/navData.ts) falls back to its built-in default nav in that case,
 * same as it did for a missing/corrupt JSON file before this change.
 */

db()->exec(
    "CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

$stmt = db()->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
$stmt->execute(['navigation_config']);
$row = $stmt->fetch();

if (!$row || !$row['setting_value']) {
    json_response(['data' => null]);
}

$decoded = json_decode((string) $row['setting_value'], true);
if (!is_array($decoded)) {
    json_response(['data' => null]);
}

json_response(['data' => $decoded]);
