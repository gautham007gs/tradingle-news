<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
[$user] = require_roles(['admin', 'editor']);

/**
 * Saves the site navigation config (primary nav, footer columns, social
 * links) to site_settings. Structural validation of the payload already
 * happens in the Next.js route (app/api/navigation/route.ts) before this
 * is called, so this just persists whatever well-formed JSON it receives.
 */

db()->exec(
    "CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

$input = input_json();
if (!is_array($input) || !isset($input['primaryNav'], $input['footerColumns'])) {
    json_error('Invalid navigation payload.');
}

// Server-side href validation (issue #10): the Next.js route checks structure,
// but the PHP endpoint is the final gate — a stored `javascript:` href would
// become a clickable XSS vector rendered into every page's nav/footer.
$invalidHrefs = nav_payload_href_errors($input);
if ($invalidHrefs) {
    json_error('Navigation contains a disallowed URL: ' . implode(', ', array_slice($invalidHrefs, 0, 5)) . '. Only root-relative paths or http(s) URLs are allowed.', 422);
}

$json = json_encode($input, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($json === false) {
    json_error('Could not encode navigation payload.');
}

$stmt = db()->prepare(
    'INSERT INTO site_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)'
);
$stmt->execute(['navigation_config', $json, (int) $user['id']]);

// Issue #121: Record to immutable audit trail
$details = "User (User ID {$user['id']}) updated site navigation config";
record_audit_log(db(), (int) $user['id'], 'navigation_update', $details, null, $json);

json_response(['ok' => true, 'saved' => date('c')]);
