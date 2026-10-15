<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = env_value('DB_HOST', 'localhost');
    $port = env_value('DB_PORT', '3306');
    $name = env_value('DB_NAME');
    $user = env_value('DB_USER');
    $pass = env_value('DB_PASSWORD');

    if (!$name || !$user) {
        json_error('Database environment variables are missing.', 500);
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $sslCa = env_value('DB_SSL_CA');
    $sslCert = env_value('DB_SSL_CERT');
    $sslKey = env_value('DB_SSL_KEY');
    $sslVerify = env_value('DB_SSL_VERIFY', '1');

    if ($sslCa) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
        if ($sslCert) $options[PDO::MYSQL_ATTR_SSL_CERT] = $sslCert;
        if ($sslKey) $options[PDO::MYSQL_ATTR_SSL_KEY] = $sslKey;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = ($sslVerify !== '0');
    }

    try {
        $pdo = new PDO($dsn, $user, $pass ?: '', $options);
        return $pdo;
    } catch (PDOException $e) {
        json_error('Database connection failed.', 500, APP_ENV === 'local' ? $e->getMessage() : null);
    }
}
