<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

// Issue #34: GET must NEVER perform the unsubscribe — email clients and spam
// scanners pre-fetch links, which would silently opt users out the moment
// Gmail/Outlook loads the message. GET is safe/informational only; the actual
// state change requires a POST (or a form click that POSTs).
require_method('POST', 'GET');

$clientIp = get_client_ip();
if (!rate_limit('newsletter:unsub-ip:' . $clientIp, 10, 3600)) {
    json_error('Too many attempts. Please try again later.', 429);
}

$token = trim((string) (input_json()['token'] ?? ($_GET['token'] ?? '')));
if ($token === '') {
    json_error('An unsubscribe token is required.', 422);
}

// GET: return a safe confirmation payload — the front-end shows a "Click to
// confirm unsubscribe" button which then fires a POST to this same endpoint.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response(['ok' => true, 'requires_confirmation' => true, 'token' => $token]);
}

// POST: perform the actual unsubscribe
$stmt = db()->prepare("
    UPDATE newsletters
    SET status = 'unsubscribed', unsubscribed_at = UTC_TIMESTAMP()
    WHERE unsubscribe_token_hash = ? AND status = 'subscribed'
");
$stmt->execute([hash('sha256', $token)]);

if ($stmt->rowCount() === 0) {
    json_response(['ok' => true, 'already_unsubscribed' => true]);
}

json_response(['ok' => true, 'unsubscribed' => true]);

