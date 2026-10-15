<?php
/**
 * GET /api/jobs/list.php?status=active
 * Returns published job postings.
 *
 * Table: jobs
 *   id INT AUTO_INCREMENT PK,
 *   title VARCHAR(255),
 *   department VARCHAR(100),
 *   location VARCHAR(150),
 *   job_type ENUM('full-time','part-time','contract','internship'),
 *   work_mode ENUM('remote','hybrid','onsite'),
 *   description TEXT,
 *   requirements TEXT,
 *   salary_min INT NULL,
 *   salary_max INT NULL,
 *   salary_currency VARCHAR(10) DEFAULT 'INR',
 *   apply_url VARCHAR(500),
 *   apply_email VARCHAR(255),
 *   posted_at DATETIME,
 *   expires_at DATETIME NULL,
 *   status ENUM('active','draft','closed') DEFAULT 'draft',
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 */

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Public endpoint: always return active jobs only — do not expose draft/closed to unauthenticated callers
try {
    $stmt = db()->prepare(
        "SELECT id, title, department, location, job_type, work_mode,
                description, requirements,
                salary_min, salary_max, salary_currency,
                apply_url, apply_email, posted_at, expires_at
         FROM jobs
         WHERE status = 'active'
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY posted_at DESC"
    );
    $stmt->execute();
    $jobs = $stmt->fetchAll();

    json_response(['success' => true, 'data' => $jobs]);
} catch (PDOException $e) {
    // Table might not exist yet — return empty gracefully
    json_response(['success' => true, 'data' => []]);
}
