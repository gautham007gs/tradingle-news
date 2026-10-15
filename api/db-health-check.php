<?php
/**
 * Database Health Check & Optimization
 * Validates schema, adds missing indexes, and optimizes queries
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

// Only admins can run this
require_method('GET', 'POST');
require_roles(['admin']);

$pdo = db();
$checks = [];
$optimizations = [];

// 1. Check articles table
$articlesCheckStmt = $pdo->query("
    SELECT COUNT(*) as count 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'articles'
");
$articlesExists = (bool) $articlesCheckStmt->fetch()['count'];
$checks['articles_table'] = [
    'status' => $articlesExists ? 'OK' : 'MISSING',
    'message' => $articlesExists ? 'Articles table exists' : 'Articles table missing'
];

if ($articlesExists) {
    // Check critical columns
    $criticalColumns = [
        'id', 'title', 'slug', 'excerpt', 'content', 'featured_image',
        'category_id', 'status', 'published_at', 'created_at', 'updated_at',
        'author_id', 'robots_index', 'robots_follow'
    ];
    
    $columnsStmt = $pdo->query("SHOW COLUMNS FROM articles");
    $existingColumns = [];
    while ($col = $columnsStmt->fetch(PDO::FETCH_ASSOC)) {
        $existingColumns[] = $col['Field'];
    }
    
    $missingColumns = array_diff($criticalColumns, $existingColumns);
    $checks['articles_columns'] = [
        'status' => empty($missingColumns) ? 'OK' : 'WARNING',
        'message' => empty($missingColumns) ? 
            'All critical columns exist' : 
            'Missing columns: ' . implode(', ', $missingColumns)
    ];
    
    // Check indexes
    $indexesStmt = $pdo->query("SHOW INDEXES FROM articles");
    $indexes = [];
    while ($idx = $indexesStmt->fetch(PDO::FETCH_ASSOC)) {
        $indexes[$idx['Key_name']][] = $idx['Column_name'];
    }
    
    $requiredIndexes = [
        'idx_status_published' => ['status', 'published_at'],
        'idx_robots_index' => ['robots_index', 'published_at'],
        'idx_slug' => ['slug'],
        'idx_category' => ['category_id'],
        'idx_author' => ['author_id'],
    ];
    
    $missingIndexes = [];
    foreach ($requiredIndexes as $indexName => $columns) {
        if (!isset($indexes[$indexName])) {
            $missingIndexes[] = $indexName;
            $optimizations[] = [
                'type' => 'ADD_INDEX',
                'table' => 'articles',
                'index' => $indexName,
                'columns' => $columns,
                'sql' => "ALTER TABLE articles ADD INDEX {$indexName} (" . implode(',', $columns) . ")"
            ];
        }
    }
    
    $checks['articles_indexes'] = [
        'status' => empty($missingIndexes) ? 'OK' : 'WARNING',
        'message' => empty($missingIndexes) ? 
            'All indexes exist' : 
            'Missing indexes: ' . implode(', ', $missingIndexes)
    ];
    
    // Check data integrity
    $nullTitles = $pdo->query("SELECT COUNT(*) as count FROM articles WHERE title IS NULL OR title = ''")->fetch()['count'];
    $nullSlugs = $pdo->query("SELECT COUNT(*) as count FROM articles WHERE slug IS NULL OR slug = ''")->fetch()['count'];
    $duplicateSlugs = $pdo->query("SELECT COUNT(*) as count FROM (SELECT slug FROM articles GROUP BY slug HAVING COUNT(*) > 1) as dupes")->fetch()['count'];
    
    $checks['data_integrity'] = [
        'status' => ($nullTitles == 0 && $nullSlugs == 0 && $duplicateSlugs == 0) ? 'OK' : 'WARNING',
        'issues' => [
            'null_titles' => (int)$nullTitles,
            'null_slugs' => (int)$nullSlugs,
            'duplicate_slugs' => (int)$duplicateSlugs
        ]
    ];
    
    // Check table size
    $sizeStmt = $pdo->query("
        SELECT 
            ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'articles'
    ");
    $tableSize = $sizeStmt->fetch()['size_mb'];
    $checks['table_size'] = [
        'size_mb' => (float)$tableSize,
        'status' => ((float)$tableSize < 100) ? 'OK' : 'WARNING',
        'message' => "Table size: {$tableSize} MB"
    ];
}

// 2. Check categories table
$categoriesCheckStmt = $pdo->query("
    SELECT COUNT(*) as count 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'categories'
");
$categoriesExists = (bool) $categoriesCheckStmt->fetch()['count'];
$checks['categories_table'] = [
    'status' => $categoriesExists ? 'OK' : 'MISSING',
    'message' => $categoriesExists ? 'Categories table exists' : 'Categories table missing'
];

// 3. Check users table
$usersCheckStmt = $pdo->query("
    SELECT COUNT(*) as count 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users'
");
$usersExists = (bool) $usersCheckStmt->fetch()['count'];
$checks['users_table'] = [
    'status' => $usersExists ? 'OK' : 'MISSING',
    'message' => $usersExists ? 'Users table exists' : 'Users table missing'
];

// 4. Query performance analysis
$slowQueries = $pdo->query("
    SELECT 
        SQL_TEXT,
        COUNT(*) as frequency,
        AVG(TIMER_WAIT) as avg_time_ns
    FROM performance_schema.events_statements_summary_by_digest
    WHERE DIGEST_TEXT LIKE '%articles%'
    AND TIMER_WAIT > 1000000000
    LIMIT 10
");

$slowQueryList = [];
if ($slowQueries) {
    while ($sq = $slowQueries->fetch(PDO::FETCH_ASSOC)) {
        $slowQueryList[] = [
            'query' => substr($sq['SQL_TEXT'], 0, 100),
            'frequency' => (int)$sq['frequency'],
            'avg_time_ms' => round($sq['avg_time_ns'] / 1000000, 2)
        ];
    }
}

$checks['slow_queries'] = [
    'status' => empty($slowQueryList) ? 'OK' : 'WARNING',
    'count' => count($slowQueryList),
    'queries' => $slowQueryList
];

// Return results
json_response([
    'health_check' => $checks,
    'optimizations_available' => count($optimizations),
    'suggested_optimizations' => $optimizations,
    'summary' => [
        'total_checks' => count($checks),
        'passed' => count(array_filter($checks, fn($c) => ($c['status'] ?? '') === 'OK')),
        'warnings' => count(array_filter($checks, fn($c) => ($c['status'] ?? '') === 'WARNING')),
        'errors' => count(array_filter($checks, fn($c) => ($c['status'] ?? '') === 'MISSING')),
    ]
]);
