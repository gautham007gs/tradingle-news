<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
require_csrf_token();
$user = require_user();

// ── Upload throttling ─────────────────────────────────────────────────────
// Per-user and per-IP limits stop an authenticated account or shared NAT from
// consuming storage in bulk. Daily storage quota caps total bytes a user can
// hold so one account cannot exhaust the Hostinger disk.
$uploadsPerHour = (int) env_value('UPLOADS_PER_HOUR_PER_USER', '50');
$uploadsPerDay  = (int) env_value('UPLOADS_PER_DAY_PER_USER', '200');
$storageQuota   = (int) env_value('UPLOAD_STORAGE_QUOTA_BYTES_PER_USER', (string) (500 * 1024 * 1024));

$userId = (int) $user['id'];
$clientIp = get_client_ip();
if (!rate_limit('upload:user:' . $userId . ':hour', $uploadsPerHour, 3600)
    || !rate_limit('upload:user:' . $userId . ':day', $uploadsPerDay, 86400)
    || !rate_limit('upload:ip:' . $clientIp . ':hour', (int) env_value('UPLOADS_PER_HOUR_PER_IP', '200'), 3600)) {
    json_error('Upload rate limit reached. Please try again later.', 429);
}

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    json_error('No file uploaded.');
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    json_error('Upload failed.');
}

$maxBytes = 8 * 1024 * 1024;
if ((int) $file['size'] > $maxBytes) {
    json_error('File is too large. Max size is 8 MB.');
}

// Daily storage quota check (sum of this user's media rows, best-effort)
try {
    $usedStmt = db()->prepare('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM media WHERE user_id = ?');
    $usedStmt->execute([$userId]);
    $usedBytes = (int) ($usedStmt->fetch()['total'] ?? 0);
    if (($usedBytes + (int) $file['size']) > $storageQuota) {
        json_error('Storage quota reached for this account.', 429);
    }
} catch (Throwable $e) {
    error_log('media upload quota check failed: ' . $e->getMessage());
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

if (!isset($allowed[$mime])) {
    json_error('Only JPG, PNG, WEBP, and GIF images are allowed.');
}

$datePath = gmdate('Y/m');
$targetDir = rtrim(UPLOAD_BASE_DIR, '/\\') . '/' . $datePath;
if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
    json_error('Could not create upload directory.', 500);
}

$originalName = (string) ($file['name'] ?? 'image');
$baseName = slugify_php(pathinfo($originalName, PATHINFO_FILENAME));
$fileName = $baseName . '-' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
$targetPath = $targetDir . '/' . $fileName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    json_error('Could not store uploaded file.', 500);
}

$size = getimagesize($targetPath) ?: null;

// Issue #25: reject decompression-bomb-sized images (>50 MP). An attacker
// could upload a tiny compressed JPEG that expands to gigabytes in memory
// when the server processes it downstream (thumbnail gen, re-encode, etc.).
$maxMegapixels = (int) env_value('UPLOAD_MAX_MEGAPIXELS', '50');
if ($size && isset($size[0], $size[1]) && (int) $size[0] * (int) $size[1] > $maxMegapixels * 1_000_000) {
    @unlink($targetPath);
    json_error('Image is too large. Maximum allowed size is ' . $maxMegapixels . ' megapixels.');
}

$url = UPLOAD_BASE_URL . '/' . $datePath . '/' . $fileName;
$storagePath = 'uploads/' . $datePath . '/' . $fileName;

try {
    $stmt = db()->prepare(
        'INSERT INTO media (user_id, url, storage_path, file_name, mime_type, size_bytes, width, height, alt_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        (int) $user['id'],
        $url,
        $storagePath,
        $originalName,
        $mime,
        (int) $file['size'],
        $size[0] ?? null,
        $size[1] ?? null,
        $_POST['alt_text'] ?? null,
    ]);
    $insertedId = (int) db()->lastInsertId();
} catch (Throwable $dbError) {
    // Issue #26: DB insert failed — clean up the orphaned physical file so
    // disk quota isn't consumed by an upload that didn't land in the DB.
    @unlink($targetPath);
    error_log('media/upload.php DB insert failed: ' . $dbError->getMessage());
    json_error('Could not record uploaded file. Please try again.', 500);
}

json_response([
    'data' => [
        'id'           => $insertedId,
        'url'          => $url,
        'storage_path' => $storagePath,
        'file_name'    => $originalName,
        'mime_type'    => $mime,
        'size_bytes'   => (int) $file['size'],
        'width'        => $size[0] ?? null,
        'height'       => $size[1] ?? null,
    ],
], 201);
