<?php
/**
 * Error Logging & Monitoring Endpoint
 * Captures frontend errors for debugging and analysis
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST', 'GET');

$input = input_json();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Admin can view error logs
    require_roles(['admin']);

    try {
        $pdo = db();
        $stmt = $pdo->query(
            "SELECT * FROM error_logs 
             ORDER BY created_at DESC 
             LIMIT 100"
        );
        
        $errors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_response(['errors' => $errors]);
    } catch (Throwable $e) {
        // Missing table or DB issue must return a JSON error, never a fatal
        // empty-body 500 (the admin error monitor needs a parseable response).
        error_log('error-log.php read failed: ' . $e->getMessage());
        json_response(['errors' => [], 'warning' => 'Error log unavailable.']);
    }
    return;
}

// POST: Log error from frontend
$message = trim((string) ($input['message'] ?? ''));
$stack = trim((string) ($input['stack'] ?? ''));
$url = trim((string) ($input['url'] ?? ''));
$userAgent = trim((string) ($input['userAgent'] ?? ''));
$severity = trim((string) ($input['severity'] ?? 'error'));
$context = is_array($input['context'] ?? null) ? json_encode($input['context']) : '{}';

if (!$message) {
    json_error('Message is required.');
}

// M2: bound payload sizes so unauthenticated POST cannot poison/log-flood the table
$message = mb_substr($message, 0, 2000);
$stack = mb_substr($stack, 0, 20000);
$url = mb_substr($url, 0, 500);
$userAgent = mb_substr($userAgent, 0, 500);
if (strlen((string) $context) > 10000) {
    $context = '{}';
}

// M2: IP-based rate limiting (soft in-memory + hard per-IP quota in DB)
// Issue #124: use get_client_ip() (proxy-aware) rather than REMOTE_ADDR.
$clientIp = get_client_ip();
try {
    $rl = db()->query(
        "SELECT COUNT(*) AS c FROM error_logs
         WHERE ip_address = " . db()->quote($clientIp) . "
           AND created_at >= (UTC_TIMESTAMP() - INTERVAL 5 MINUTE)"
    )->fetch();
    if ((int) ($rl['c'] ?? 0) >= 20) {
        json_error('Too many error reports. Please retry later.', 429);
    }
} catch (Throwable) {
    // rate-limit check is best-effort; never block error capture because of it
}

try {
    $pdo = db();
    ensure_cms_schema_upgrades($pdo);
    
    // Insert error log
    $stmt = $pdo->prepare("
        INSERT INTO error_logs 
        (message, stack, url, user_agent, ip_address, severity, context) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $message,
        $stack ?: null,
        $url ?: null,
        $userAgent ?: null,
        $clientIp,
        in_array($severity, ['info', 'warning', 'error', 'critical']) ? $severity : 'error',
        $context,
    ]);
    
    json_response([
        'success' => true,
        'message' => 'Error logged successfully',
    ]);
} catch (Exception $e) {
    // Issue #125: never expose internal exception details to callers.
    error_log('error-log.php failed: ' . $e->getMessage());
    json_error('Failed to log error.', 500);
}
