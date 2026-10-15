<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$user, $roles] = require_roles(['admin', 'editor']);

$allowedSlots = [
    'hero',
    'horizontal_rail',
    'editors_picks',
    'trending',
    'politics',
    'india',
    'world',
    'business',
    'finance',
    'technology',
    'cities',
    'science',
    'entertainment',
    'sports',
    'lifestyle',
    'opinion',
    'below_fold',
    'more_for_you',
    'spotlight',
];

$slotAliases = [
    'top_stories' => 'horizontal_rail',
];

$normalizeSlot = static function (string $slot) use ($slotAliases): string {
    return $slotAliases[$slot] ?? $slot;
};

$articleQuery = "
    SELECT
      hs.id AS slot_id, hs.slot_key, hs.sort_order, hs.is_active, hs.starts_at, hs.ends_at,
      a.id, a.title, a.slug, a.excerpt, a.featured_image, a.status, a.priority,
      a.published_at, a.updated_at,
      c.name AS category_name, c.slug AS category_slug,
      u.display_name AS author_name, u.slug AS author_slug, u.avatar_url AS author_avatar
    FROM homepage_slots hs
    INNER JOIN articles a ON a.id = hs.article_id
    LEFT JOIN categories c ON c.id = a.category_id
    INNER JOIN users u ON u.id = a.author_id
    WHERE hs.slot_key = ?
    ORDER BY hs.sort_order ASC, hs.id ASC
";

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = [];
    foreach ($allowedSlots as $slot) {
        $stmt = db()->prepare($articleQuery);
        $stmt->execute([$slot]);
        $data[$slot] = $stmt->fetchAll();
    }

    if (empty($data['horizontal_rail'])) {
        $stmt = db()->prepare($articleQuery);
        $stmt->execute(['top_stories']);
        $legacy = $stmt->fetchAll();
        if ($legacy) {
            $data['horizontal_rail'] = $legacy;
        }
    }

    $data['top_stories'] = $data['horizontal_rail'];

    json_response(['data' => $data, 'slots' => $allowedSlots]);
}

require_method('POST');
require_csrf_token();
$input = input_json();
$slot = $normalizeSlot(trim((string) ($input['slot_key'] ?? '')));
$articleIds = $input['article_ids'] ?? [];

if (!in_array($slot, $allowedSlots, true)) {
    json_error('Invalid homepage slot.', 422);
}

if (!is_array($articleIds)) {
    json_error('article_ids must be an array.', 422);
}

$cleanIds = [];
foreach ($articleIds as $id) {
    $articleId = (int) $id;
    if ($articleId > 0 && !in_array($articleId, $cleanIds, true)) {
        $cleanIds[] = $articleId;
    }
}
$cleanIds = array_slice($cleanIds, 0, 12);

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM homepage_slots WHERE slot_key = ?')->execute([$slot]);
    if ($slot === 'horizontal_rail') {
        $pdo->prepare('DELETE FROM homepage_slots WHERE slot_key = ?')->execute(['top_stories']);
    }

    if ($cleanIds) {
        $publishedCheck = $pdo->prepare("SELECT id FROM articles WHERE id = ? AND status = 'published'");
        $insert = $pdo->prepare(
            'INSERT INTO homepage_slots (slot_key, article_id, sort_order, is_active)
             VALUES (?, ?, ?, 1)'
        );
        foreach ($cleanIds as $index => $articleId) {
            $publishedCheck->execute([$articleId]);
            if (!$publishedCheck->fetch()) {
                continue;
            }
            $insert->execute([$slot, $articleId, $index + 1]);
        }
    }

    $pdo->commit();
    cache_delete('homepage_payload');
    json_response(['ok' => true]);
} catch (Throwable $e) {
    safe_rollback($pdo);
    json_error('Could not save homepage curation.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
}
