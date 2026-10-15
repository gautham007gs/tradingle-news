<?php
declare(strict_types=1);

/**
 * Optional, guarded foreign-key enforcement (audit issue #22).
 *
 * The app enforces referential integrity in code, but production should also
 * enforce the important relationships at the DB layer. This script adds
 * foreign keys ONLY where it is safe to do so:
 *
 *   - both the child and parent table exist,
 *   - the constraint does not already exist,
 *   - there are no orphaned child rows (rows with no matching parent).
 *
 * Any candidate that fails the orphan check is skipped and reported — the
 * script never deletes or mutates data, so it is safe to run against a live
 * database. Rerun it after cleaning up orphans to pick up the remainder.
 *
 * Usage:
 *   php database/add-foreign-keys.php
 *   php database/add-foreign-keys.php --dry-run   # show what would change
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script is CLI-only.');
}

require_once __DIR__ . '/../api/config.php';

$dryRun = in_array('--dry-run', $argv, true);

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

function table_exists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (int) $stmt->fetchColumn() > 0;
}

function fk_exists(PDO $pdo, string $table, string $constraint): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.table_constraints
         WHERE constraint_schema = DATABASE() AND table_name = ? AND constraint_name = ?'
    );
    $stmt->execute([$table, $constraint]);
    return (int) $stmt->fetchColumn() > 0;
}

function orphan_count(PDO $pdo, string $child, string $childCol, string $parent, string $parentCol): int
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM {$child} c
         LEFT JOIN {$parent} p ON p.{$parentCol} = c.{$childCol}
         WHERE c.{$childCol} IS NOT NULL AND p.{$parentCol} IS NULL"
    );
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

// [child, childCol, parent, parentCol, constraintName, onDelete]
// Junction tables cascade; nullable user references set NULL; hard business
// references (author/category) RESTRICT so a delete can't silently orphan or
// nuke content.
$candidates = [
    ['user_roles', 'user_id', 'users', 'id', 'fk_user_roles_user', 'CASCADE'],
    ['user_roles', 'role_id', 'roles', 'id', 'fk_user_roles_role', 'CASCADE'],
    ['article_tags', 'article_id', 'articles', 'id', 'fk_article_tags_article', 'CASCADE'],
    ['article_tags', 'tag_id', 'tags', 'id', 'fk_article_tags_tag', 'CASCADE'],
    ['article_categories', 'article_id', 'articles', 'id', 'fk_article_categories_article', 'CASCADE'],
    ['article_categories', 'category_id', 'categories', 'id', 'fk_article_categories_category', 'CASCADE'],
    ['comments', 'article_id', 'articles', 'id', 'fk_comments_article', 'CASCADE'],
    ['comments', 'user_id', 'users', 'id', 'fk_comments_user', 'SET NULL'],
    ['articles', 'author_id', 'users', 'id', 'fk_articles_author', 'RESTRICT'],
    ['articles', 'category_id', 'categories', 'id', 'fk_articles_category', 'RESTRICT'],
    ['media', 'user_id', 'users', 'id', 'fk_media_user', 'SET NULL'],
    ['article_revisions', 'article_id', 'articles', 'id', 'fk_article_revisions_article', 'CASCADE'],
    ['email_verifications', 'user_id', 'users', 'id', 'fk_email_verifications_user', 'CASCADE'],
    ['password_resets', 'user_id', 'users', 'id', 'fk_password_resets_user', 'CASCADE'],
    ['two_factor_challenges', 'user_id', 'users', 'id', 'fk_two_factor_challenges_user', 'CASCADE'],
];

echo ($dryRun ? 'DRY-RUN — ' : '') . 'Foreign key enforcement\n';
$added = 0;
$skipped = 0;

foreach ($candidates as [$child, $childCol, $parent, $parentCol, $constraintName, $onDelete]) {
    if (!table_exists($pdo, $child) || !table_exists($pdo, $parent)) {
        printf("  skip  %-28s missing table(s)\n", $constraintName);
        $skipped++;
        continue;
    }
    if (fk_exists($pdo, $child, $constraintName)) {
        printf("  ok    %-28s already present\n", $constraintName);
        continue;
    }
    $orphans = orphan_count($pdo, $child, $childCol, $parent, $parentCol);
    if ($orphans > 0) {
        printf("  skip  %-28s %d orphaned row(s) in %s.%s\n", $constraintName, $orphans, $child, $childCol);
        $skipped++;
        continue;
    }

    $sql = "ALTER TABLE {$child} ADD CONSTRAINT {$constraintName} FOREIGN KEY ({$childCol}) REFERENCES {$parent} ({$parentCol}) ON DELETE {$onDelete}";
    if ($dryRun) {
        printf("  plan  %-28s would add\n", $constraintName);
        continue;
    }
    try {
        $pdo->exec($sql);
        printf("  add   %-28s added\n", $constraintName);
        $added++;
    } catch (Throwable $e) {
        printf("  skip  %-28s error: %s\n", $constraintName, $e->getMessage());
        $skipped++;
    }
}

echo "\nDone. Added: {$added}, skipped: {$skipped}\n";
exit(0);
