<?php
/**
 * Admin Jobs CRUD API
 * GET    /api/admin/jobs.php           – list all jobs (any status)
 * POST   /api/admin/jobs.php           – create job (or action=create_table)
 * PUT    /api/admin/jobs.php?id=X      – update job
 * DELETE /api/admin/jobs.php?id=X      – delete job
 */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

[$currentUser, $currentUserRoles] = require_roles(['admin', 'editor']);

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

$body = [];
if (in_array($method, ['POST', 'PUT'], true)) {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];
}

// CSRF required for every state-changing verb; GET (read) is exempt.
if ($method !== 'GET') {
    require_csrf_token();
}

// One-time table creation (admin only)
if ($method === 'POST' && ($body['action'] ?? '') === 'create_table') {
    if (!in_array('admin', $currentUserRoles, true)) {
        http_response_code(403);
        json_response(['error' => 'Admin only']);
    }
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            department VARCHAR(100) DEFAULT '',
            location VARCHAR(150) DEFAULT 'New Delhi, India',
            job_type ENUM('full-time','part-time','contract','internship') DEFAULT 'full-time',
            work_mode ENUM('remote','hybrid','onsite') DEFAULT 'onsite',
            description TEXT,
            requirements TEXT,
            salary_min INT NULL,
            salary_max INT NULL,
            salary_currency VARCHAR(10) DEFAULT 'INR',
            apply_url VARCHAR(500) DEFAULT '',
            apply_email VARCHAR(255) DEFAULT 'careers@tradingle.com',
            posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NULL,
            status ENUM('active','draft','closed') DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        json_response(['success' => true, 'message' => 'Table created']);
    } catch (PDOException $e) {
        http_response_code(500);
        json_response(['error' => $e->getMessage()]);
    }
}

function sanitize_job(array $b): array
{
    $allowed_types  = ['full-time', 'part-time', 'contract', 'internship'];
    $allowed_modes  = ['remote', 'hybrid', 'onsite'];
    $allowed_status = ['active', 'draft', 'closed'];

    // Normalise dates from both HTML datetime-local (T separator) and MySQL (space separator)
    $normalize_dt = static function (?string $v): ?string {
        if ($v === null || $v === '') return null;
        $v = str_replace('T', ' ', $v);
        // Ensure seconds are present
        if (strlen($v) === 16) $v .= ':00';
        return $v;
    };
    $normalize_d = static function (?string $v): ?string {
        if ($v === null || $v === '') return null;
        // Accept YYYY-MM-DD only; strip time if present
        return substr(str_replace('T', ' ', $v), 0, 10);
    };

    return [
        'title'           => trim($b['title'] ?? ''),
        'department'      => trim($b['department'] ?? ''),
        'location'        => trim($b['location'] ?? 'New Delhi, India'),
        'job_type'        => in_array($b['job_type'] ?? '', $allowed_types, true) ? $b['job_type'] : 'full-time',
        'work_mode'       => in_array($b['work_mode'] ?? '', $allowed_modes, true) ? $b['work_mode'] : 'onsite',
        'description'     => trim($b['description'] ?? ''),
        'requirements'    => trim($b['requirements'] ?? ''),
        'salary_min'      => isset($b['salary_min']) && $b['salary_min'] !== '' ? (int) $b['salary_min'] : null,
        'salary_max'      => isset($b['salary_max']) && $b['salary_max'] !== '' ? (int) $b['salary_max'] : null,
        'salary_currency' => trim($b['salary_currency'] ?? 'INR'),
        'apply_url'       => preg_match('/^(https?|mailto):/i', trim($b['apply_url'] ?? '')) ? trim($b['apply_url']) : '',
        'apply_email'     => trim($b['apply_email'] ?? 'careers@tradingle.com'),
        'posted_at'       => $normalize_dt($b['posted_at'] ?? null) ?? gmdate('Y-m-d H:i:s'),
        'expires_at'      => $normalize_d($b['expires_at'] ?? null),
        'status'          => in_array($b['status'] ?? '', $allowed_status, true) ? $b['status'] : 'draft',
    ];
}

try {
    switch ($method) {
        case 'GET':
            $rows = db()->query(
                'SELECT * FROM jobs ORDER BY posted_at DESC'
            )->fetchAll();
            json_response(['success' => true, 'data' => $rows]);
            break;

        case 'POST':
            $d = sanitize_job($body);
            if (empty($d['title'])) {
                http_response_code(422);
                json_response(['error' => 'Title required']);
            }
            $stmt = db()->prepare(
                'INSERT INTO jobs
                 (title,department,location,job_type,work_mode,description,requirements,
                  salary_min,salary_max,salary_currency,apply_url,apply_email,posted_at,expires_at,status)
                 VALUES
                 (:title,:department,:location,:job_type,:work_mode,:description,:requirements,
                  :salary_min,:salary_max,:salary_currency,:apply_url,:apply_email,:posted_at,:expires_at,:status)'
            );
            $stmt->execute($d);
            json_response(['success' => true, 'id' => db()->lastInsertId()]);
            break;

        case 'PUT':
            if (!$id) { http_response_code(400); json_response(['error' => 'Missing id']); }
            $d = sanitize_job($body);
            $stmt = db()->prepare(
                'UPDATE jobs SET
                 title=:title,department=:department,location=:location,job_type=:job_type,
                 work_mode=:work_mode,description=:description,requirements=:requirements,
                 salary_min=:salary_min,salary_max=:salary_max,salary_currency=:salary_currency,
                 apply_url=:apply_url,apply_email=:apply_email,posted_at=:posted_at,
                 expires_at=:expires_at,status=:status WHERE id=:id'
            );
            $stmt->execute(array_merge($d, ['id' => $id]));
            json_response(['success' => true]);
            break;

        case 'DELETE':
            if (!$id) { http_response_code(400); json_response(['error' => 'Missing id']); }
            db()->prepare('DELETE FROM jobs WHERE id=?')->execute([$id]);
            json_response(['success' => true]);
            break;

        default:
            http_response_code(405);
            json_response(['error' => 'Method not allowed']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    json_response(['error' => 'Database error']);
}
