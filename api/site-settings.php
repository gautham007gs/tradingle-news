<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET');

db()->exec(
    "CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

// ── Public-safe defaults ───────────────────────────────────────────────────
// Only keys in this array may be returned to anonymous callers. Admin-only
// settings (analytics IDs, verification tokens, ad config, etc.) must never
// appear in this list — they are only readable via api/admin/site-settings.php
// which requires an admin session.
$defaults = [
    'maintenance_enabled'       => '0',
    'maintenance_message'       => 'Tradingle is being updated. Please check back soon.',
    'announcement_enabled'      => '0',
    'announcement_text'         => '',
    'primary_color'             => '',
    'accent_color'              => '',
    'show_read_time'            => '1',
    'show_view_count'           => '1',
    'spotlight_label'           => 'Spotlight',
    'spotlight_kicker'          => 'Analyses, Explainers, Exclusives',
    'more_for_you_title'        => 'More for You',
    'homepage_seo_title'        => 'Breaking News, Live Updates, India & World News',
    'homepage_seo_description'  => 'Tradingle delivers breaking news, live updates, in-depth analysis on India, world affairs, business, technology, sports, and entertainment.',
    'footer_tagline'            => 'Tradingle brings you breaking news, live updates, and in-depth analysis on politics, business, sports, entertainment, and more.',
    'site_name'                 => 'Tradingle',
    'site_tagline'              => 'Breaking News, Live Updates & In-Depth Analysis',
    'site_logo_url'             => '',
    'site_favicon_url'          => '',
    'site_default_og_image'     => '',
    'copyright_text'            => '',
];

// Fetch only the whitelisted keys from the DB — never expose admin-only keys
// to public callers regardless of what's stored.
$placeholders = implode(',', array_fill(0, count($defaults), '?'));
$rows = db()->prepare(
    "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ({$placeholders})"
);
$rows->execute(array_keys($defaults));

$settings = $defaults;
foreach ($rows->fetchAll() as $row) {
    if (array_key_exists($row['setting_key'], $defaults)) {
        $settings[$row['setting_key']] = $row['setting_value'] ?? '';
    }
}

header('Cache-Control: public, max-age=60, stale-while-revalidate=30');
json_response(['settings' => $settings]);

