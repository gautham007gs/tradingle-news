<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('GET');

$user = current_user();
if (!$user) {
    json_response(['user' => null]);
}

$roles = current_user_roles((int) $user['id']);
json_response(['user' => public_user($user, $roles)]);
