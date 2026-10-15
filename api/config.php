<?php
declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");

        if ($key !== '' && getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

// Local dev uses project-root .env. Hostinger can use public_html/api/.env,
// which is protected by api/.htaccess in this repo.
load_env_file(__DIR__ . '/.env');
load_env_file(dirname(__DIR__) . '/.env');

function env_value(string $key, ?string $fallback = null): ?string
{
    $value = getenv($key);
    return $value === false ? $fallback : $value;
}

define('APP_ENV', env_value('APP_ENV', 'production'));
define('APP_URL', rtrim(env_value('APP_URL', 'http://localhost:8080') ?? '', '/'));
define('FRONTEND_URL', rtrim(env_value('FRONTEND_URL', APP_URL) ?? '', '/'));
define('SESSION_COOKIE_NAME', env_value('SESSION_COOKIE_NAME', 'tradingle_session'));
define('SESSION_DAYS', (int) (env_value('SESSION_DAYS', '30') ?? '30'));
define('SESSION_SAMESITE', in_array(ucfirst(strtolower((string)env_value('SESSION_SAMESITE', 'Lax'))), ['Strict', 'Lax', 'None'], true) ? ucfirst(strtolower((string)env_value('SESSION_SAMESITE', 'Lax'))) : 'Lax');
define('UPLOAD_BASE_DIR', env_value('UPLOAD_BASE_DIR', dirname(__DIR__) . '/public/uploads'));
define('UPLOAD_BASE_URL', rtrim(env_value('UPLOAD_BASE_URL', '/uploads') ?? '', '/'));

define('GOOGLE_CLIENT_ID', env_value('GOOGLE_CLIENT_ID', ''));
define('GOOGLE_CLIENT_SECRET', env_value('GOOGLE_CLIENT_SECRET', ''));
define('GOOGLE_REDIRECT_URI', env_value('GOOGLE_REDIRECT_URI', APP_URL . '/api/auth/google-callback.php'));
define('CRON_KEY', env_value('CRON_KEY', ''));
define('API_SECRET_KEY', env_value('API_SECRET_KEY', ''));
// Issue #104: Idle session timeout in hours. Set to 0 to disable. Default 2h.
define('SESSION_IDLE_HOURS', (int)(env_value('SESSION_IDLE_HOURS', '2') ?? '2'));
