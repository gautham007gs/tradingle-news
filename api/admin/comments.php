<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$user] = require_roles(['admin', 'editor']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = trim((string) ($_GET['status'] ?? 'pending'));
    if (!in_array($status, ['pending', 'approved', 'rejected', 'spam', 'all'], true)) {
        $status = 'pending';
    }

    // Pagination
    $limit  = max(1, min(100, (int) ($_GET['limit'] ?? 40)));
    $page   = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    // Search (body, article title, commenter name)
    $q = trim((string) ($_GET['q'] ?? ''));

    // Date range (MySQL date strings: YYYY-MM-DD)
    $dateFrom = trim((string) ($_GET['date_from'] ?? ''));
    $dateTo   = trim((string) ($_GET['date_to'] ?? ''));

    $conditions = [];
    $params     = [];

    if ($status !== 'all') {
        $conditions[] = 'c.status = ?';
        $params[]     = $status;
    }

    if ($q !== '') {
        $like = '%' . $q . '%';
        $conditions[] = '(c.body LIKE ? OR a.title LIKE ? OR COALESCE(u.display_name, c.guest_name) LIKE ?)';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if ($dateFrom !== '') {
        $conditions[] = 'DATE(c.created_at) >= ?';
        $params[]     = $dateFrom;
    }
    if ($dateTo !== '') {
        $conditions[] = 'DATE(c.created_at) <= ?';
        $params[]     = $dateTo;
    }

    $where = $conditions ? implode(' AND ', $conditions) : '1 = 1';

    // Total count for pagination
    $countStmt = db()->prepare("
        SELECT COUNT(*) AS total
        FROM comments c
        INNER JOIN articles a ON a.id = c.article_id
        LEFT JOIN categories cat ON cat.id = a.category_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE {$where}
    ");
    $countStmt->execute($params);
    $total = (int) ($countStmt->fetch()['total'] ?? 0);

    // Data fetch
    $dataParams   = array_merge($params, [$limit, $offset]);
    $stmt = db()->prepare("
        SELECT
          c.id, c.article_id, c.user_id, c.guest_name, c.guest_email,
          c.body, c.status, c.created_at,
          a.title AS article_title, a.slug AS article_slug,
          cat.slug AS article_category_slug,
          u.display_name AS user_name
        FROM comments c
        INNER JOIN articles a ON a.id = c.article_id
        LEFT JOIN categories cat ON cat.id = a.category_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE {$where}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($dataParams);

    json_response([
        'data'  => $stmt->fetchAll(),
        'total' => $total,
        'page'  => $page,
        'limit' => $limit,
    ]);
}

require_method('POST');
require_csrf_token();
$input = input_json();

// ── Bulk action ──────────────────────────────────────────────────────────────
if (isset($input['ids']) && is_array($input['ids'])) {
    $ids    = array_filter(array_map('intval', $input['ids']), fn($i) => $i > 0);
    $status = trim((string) ($input['status'] ?? ''));

    if (empty($ids) || !in_array($status, ['approved', 'rejected', 'spam'], true)) {
        json_error('Valid ids array and status are required.');
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare(
        "UPDATE comments SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id IN ({$placeholders})"
    );
    $stmt->execute(array_merge([$status], $ids));
    $updated = $stmt->rowCount();

    // Issue #121: Immutable audit trail
    record_audit_log(db(), (int) $user['id'], 'comment_bulk_moderate', "Bulk set " . count($ids) . " comments to status '{$status}'", json_encode(['ids' => $ids, 'status' => $status]), null);

    json_response(['ok' => true, 'updated' => $updated]);
}

// ── Single action ────────────────────────────────────────────────────────────
$commentId = (int) ($input['id'] ?? 0);
$status    = trim((string) ($input['status'] ?? ''));

if ($commentId <= 0 || !in_array($status, ['approved', 'rejected', 'spam'], true)) {
    json_error('Valid comment id and status are required.');
}

$stmt = db()->prepare('UPDATE comments SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
$stmt->execute([$status, $commentId]);

// Issue #121: Immutable audit trail
record_audit_log(db(), (int) $user['id'], 'comment_moderate', "Set comment ID {$commentId} to status '{$status}'", json_encode(['id' => $commentId, 'status' => $status]), null);

json_response(['ok' => true]);
