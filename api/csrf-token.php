<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_method('GET', 'OPTIONS');

// CSRF token generation - works with or without authentication
// During development, generates a temporary token
// For authenticated users, generates a persistent token
$user = current_user();

if ($user) {
    // Authenticated user - get or create persistent CSRF token
    $token = get_csrf_token();
    if (!$token) {
        $token = generate_csrf_token();
        set_csrf_token((int) $user['id'], $token);
    }
} else {
    // Unauthenticated/development mode - generate temporary token
    // This helps with development and form initialization
    $token = bin2hex(random_bytes(32));
}

// Cache-busting headers for development
header('Cache-Control: no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

json_response(['csrf_token' => $token]);
