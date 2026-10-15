<?php
declare(strict_types=1);

/**
 * DB migration runner — apply versioned SQL migrations in order.
 *
 * Usage:
 *   php database/migrate.php              # apply pending migrations
 *   php database/migrate.php --status     # list applied + pending without running
 *   php database/migrate.php --dry-run    # show what would run, apply nothing
 *
 * Migrations live in database/migrations/ and are named NNNN_description.sql.
 * Each applied migration is recorded in the `schema_version` table. The legacy
 * runtime self-migration (ensure_cms_schema_upgrades) is intentionally kept as
 * a backward-compatible fallback for installs that were never migrated.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script is CLI-only.');
}

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/db.php';

$mode = 'apply';
foreach ($argv as $arg) {
    if ($arg === '--status') $mode = 'status';
    if ($arg === '--dry-run') $mode = 'dry-run';
}

$migrationsDir = __DIR__ . '/migrations';

function schema_pdo(): PDO
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
        fwrite(STDERR, "Missing DB_NAME/DB_USER environment variables.\n");
        exit(1);
    }
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
        $user,
        $pass ?: '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    return $pdo;
}

function ensure_schema_version_table(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_version (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            version VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL DEFAULT "",
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_schema_version (version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function applied_versions(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT version FROM schema_version');
    $versions = [];
    foreach ($stmt->fetchAll() as $row) {
        $versions[] = $row['version'];
    }
    return $versions;
}

function list_migrations(string $dir): array
{
    if (!is_dir($dir)) {
        return [];
    }
    $files = glob($dir . '/*.sql') ?: [];
    sort($files, SORT_STRING);
    $migrations = [];
    foreach ($files as $file) {
        if (preg_match('/^(\d+)_.+\.sql$/', basename($file), $m)) {
            $migrations[] = [
                'version' => $m[1],
                'file' => $file,
                'name' => basename($file),
            ];
        }
    }
    usort($migrations, fn($a, $b) => version_compare($a['version'], $b['version']));
    return $migrations;
}

$pdo = schema_pdo();
ensure_schema_version_table($pdo);
$applied = applied_versions($pdo);
$migrations = list_migrations($migrationsDir);

$pending = array_values(array_filter(
    $migrations,
    fn($m) => !in_array($m['version'], $applied, true)
));

if ($mode === 'status') {
    echo "Applied: " . count($applied) . "\n";
    foreach ($applied as $v) {
        echo "  [x] {$v}\n";
    }
    echo "Pending: " . count($pending) . "\n";
    foreach ($pending as $m) {
        echo "  [ ] {$m['name']}\n";
    }
    exit(0);
}

if (!$pending) {
    echo "Schema is up to date.\n";
    exit(0);
}

foreach ($pending as $m) {
    if ($mode === 'dry-run') {
        echo "WOULD APPLY: {$m['name']}\n";
        continue;
    }
    $sql = file_get_contents($m['file']);
    if ($sql === false || trim($sql) === '') {
        fwrite(STDERR, "Skipping empty/unreadable migration: {$m['name']}\n");
        continue;
    }
    try {
        $pdo->beginTransaction();
        $pdo->exec($sql);
        $pdo->prepare('INSERT INTO schema_version (version, name) VALUES (?, ?)')
            ->execute([$m['version'], $m['name']]);
        $pdo->commit();
        echo "Applied: {$m['name']}\n";
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        fwrite(STDERR, "FAILED: {$m['name']} — {$e->getMessage()}\n");
        exit(1);
    }
}

echo "Migration run complete.\n";
