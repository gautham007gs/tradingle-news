<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

// Public author listing (used by the /author index and the admin author
// picker). Issue #2: the DTO never leaks emails or role membership to
// non-staff callers. Anonymous and author-role requests get only the public
// byline fields (same data as authors/show.php); admin/editor additionally
// get email + roles, which the CMS needs to assign authorship.
$current = current_user();
$roles = $current ? current_user_roles((int) $current['id']) : [];
$isStaff = $current && has_any_role($roles, ['admin', 'editor']);

$stmt = db()->query(
    "SELECT u.id, u.display_name, u.email, u.slug, u.avatar_url, u.role_title, u.bio, GROUP_CONCAT(r.name ORDER BY r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.status = 'active'
     GROUP BY u.id
     ORDER BY u.display_name ASC"
);

$rows = array_map(static function (array $row) use ($isStaff): array {
    $author = [
        'id' => (int) $row['id'],
        'display_name' => $row['display_name'],
        'slug' => $row['slug'],
        'avatar_url' => $row['avatar_url'] ?? null,
        'role_title' => $row['role_title'] ?? null,
        'bio' => $row['bio'] ?? null,
    ];
    if ($isStaff) {
        $author['email'] = $row['email'];
        $author['roles'] = $row['roles'] ? explode(',', $row['roles']) : [];
    }
    return $author;
}, $stmt->fetchAll());

json_response(['data' => $rows]);
