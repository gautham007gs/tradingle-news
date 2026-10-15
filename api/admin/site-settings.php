<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$user] = require_roles(['admin']);

db()->exec(
    "CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

$defaults = [
    // ── Operational ───────────────────────────────────────────────────────────
    'maintenance_enabled'          => '0',
    'maintenance_message'          => 'Tradingle is being updated. Please check back soon.',
    'announcement_enabled'         => '0',
    'announcement_text'            => '',

    // ── Appearance ────────────────────────────────────────────────────────────
    'primary_color'                => '',
    'accent_color'                 => '',

    // ── Editorial defaults ────────────────────────────────────────────────────
    'default_article_status'       => 'draft',
    'contributor_submit_status'    => 'pending_review',
    'show_read_time'               => '1',
    'show_view_count'              => '1',
    'spotlight_label'              => 'Spotlight',
    'spotlight_kicker'             => 'Analyses, Explainers, Exclusives',
    'more_for_you_title'           => 'More for You',

    // ── Site identity (issue #93) ──────────────────────────────────────────────
    'site_name'                    => 'Tradingle',
    'site_tagline'                 => 'Breaking News, Live Updates & In-Depth Analysis',
    'site_logo_url'                => '',
    'site_favicon_url'             => '',
    'site_default_og_image'        => '',

    // ── SEO defaults ──────────────────────────────────────────────────────────
    'homepage_seo_title'           => 'Breaking News, Live Updates, India & World News',
    'homepage_seo_description'     => 'Tradingle delivers breaking news, live updates, in-depth analysis on India, world affairs, business, technology, sports, and entertainment.',
    'footer_tagline'               => 'Tradingle brings you breaking news, live updates, and in-depth analysis on politics, business, sports, entertainment, and more.',
    'news_sitemap_window_hours'    => '48',

    // ── Organisation contact (issue #94) ──────────────────────────────────────
    'org_contact_email'            => '',
    'org_phone'                    => '',
    'org_address'                  => '',
    'org_founding_date'            => '',

    // ── Social media links (issue #94) ────────────────────────────────────────
    'social_twitter'               => '',
    'social_facebook'              => '',
    'social_instagram'             => '',
    'social_youtube'               => '',
    'social_linkedin'              => '',
    'social_threads'               => '',
    'social_whatsapp'              => '',

    // ── Analytics & tracking (issue #95) ──────────────────────────────────────
    'ga4_measurement_id'           => '',
    'gtm_container_id'             => '',
    'google_site_verification'     => '',
    'bing_site_verification'       => '',
    'facebook_pixel_id'            => '',
    'clarity_project_id'           => '',

    // ── Advertising (issue #96) ───────────────────────────────────────────────
    'adsense_publisher_id'         => '',
    'ads_txt_extra'                => '',
    'ad_slots_enabled'             => '1',

    // ── Comments & UGC ───────────────────────────────────────────────────────
    'comment_blocklist'            => '',
    'comments_require_approval'    => '1',

    // ── Content defaults ──────────────────────────────────────────────────────
    'default_author_bio'           => '',
    'copyright_text'               => '',
];


if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = db()->query('SELECT setting_key, setting_value FROM site_settings')->fetchAll();
    $settings = $defaults;
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'] ?? '';
    }
    json_response(['settings' => $settings]);
}

require_method('POST');
require_csrf_token();

$input = input_json();
$allowed = array_keys($defaults);
$pdo = db();
$stmt = $pdo->prepare(
    'INSERT INTO site_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)'
);

foreach ($allowed as $key) {
    if (!array_key_exists($key, $input)) {
        continue;
    }
    $value = is_bool($input[$key]) ? ($input[$key] ? '1' : '0') : trim((string) $input[$key]);
    $stmt->execute([$key, $value, (int) $user['id']]);
}

// Issue #121: Record to immutable audit trail
$details = "Admin (User ID {$user['id']}) updated site settings";
record_audit_log($pdo, (int) $user['id'], 'settings_update', $details, null, json_encode($input));

json_response(['ok' => true]);
