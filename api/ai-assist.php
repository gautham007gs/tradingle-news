<?php
/**
 * AI Assistant API Endpoint
 * Provides AI-powered suggestions for articles
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
[$user, $roles] = require_roles(['admin', 'editor', 'author', 'contributor']);

$input = input_json();
$task = trim((string) ($input['task'] ?? ''));
$content = trim((string) ($input['content'] ?? ''));
$title = trim((string) ($input['title'] ?? ''));
$count = (int) ($input['count'] ?? 5);

if (!$task) {
    json_error('Task is required.');
}

$suggestions = [];

switch ($task) {
    case 'generate_headlines':
        // Generate headline suggestions based on content
        $suggestions = generate_headline_suggestions($content, $count);
        break;

    case 'generate_excerpts':
        // Generate excerpt suggestions
        $suggestions = generate_excerpt_suggestions($title, $content, $count);
        break;

    case 'seo_optimization':
        // Provide SEO optimization tips
        $suggestions = provide_seo_tips($title, $content);
        break;

    case 'readability':
        // Analyze readability
        $suggestions = analyze_readability($content);
        break;

    case 'fact_check':
        // Provide fact-check reminders
        $suggestions = provide_fact_check_reminders();
        break;

    case 'google_news':
        // Check Google News eligibility
        $suggestions = check_google_news_eligibility($title, $content);
        break;

    default:
        json_error('Unknown task: ' . $task);
}

json_response([
    'task' => $task,
    'suggestions' => $suggestions,
    'count' => count($suggestions),
]);

/**
 * Generate headline suggestions
 */
function generate_headline_suggestions(string $content, int $count): array {
    $sentences = array_filter(
        array_map('trim', preg_split('/[.!?]+/', $content)),
        fn($s) => strlen($s) > 10
    );

    $suggestions = [];

    // Extract strong opening statements
    foreach (array_slice($sentences, 0, 3) as $sentence) {
        if (strlen($sentence) < 80) {
            $suggestions[] = ucfirst($sentence) . (str_ends_with($sentence, '?') ? '' : ' Update');
        }
    }

    // Generate variations
    $templates = [
        'Breaking: %s',
        'Latest: %s Developments',
        '%s: What You Need to Know',
        'Exclusive: %s Report',
        'Analysis: Understanding %s',
    ];

    $words = array_slice(
        array_filter(
            explode(' ', strtolower($content)),
            fn($w) => strlen($w) > 4
        ),
        0,
        2
    );

    foreach (array_slice($templates, 0, $count - count($suggestions)) as $template) {
        $keyword = ucfirst($words[0] ?? 'News');
        $suggestions[] = sprintf($template, $keyword);
    }

    return array_slice($suggestions, 0, $count);
}

/**
 * Generate excerpt suggestions
 */
function generate_excerpt_suggestions(string $title, string $content, int $count): array {
    $sentences = array_filter(
        explode('.', $content),
        fn($s) => strlen(trim($s)) > 50
    );

    $suggestions = [];

    foreach (array_slice($sentences, 0, $count) as $sentence) {
        $excerpt = trim($sentence);
        if (strlen($excerpt) > 160) {
            $excerpt = substr($excerpt, 0, 157) . '...';
        }
        if (strlen($excerpt) > 30) {
            $suggestions[] = $excerpt;
        }
    }

    return array_slice($suggestions, 0, $count);
}

/**
 * Provide SEO optimization tips
 */
function provide_seo_tips(string $title, string $content): array {
    $tips = [];
    $wordCount = str_word_count($content);

    if (strlen($title) < 30) {
        $tips[] = 'Expand your headline to at least 30 characters for better SEO';
    }
    if (strlen($title) > 60) {
        $tips[] = 'Consider shortening your headline to 60 characters or less';
    }

    if ($wordCount < 300) {
        $tips[] = "Expand your article to at least 300 words (currently: {$wordCount})";
    }
    if ($wordCount > 5000) {
        $tips[] = 'Consider breaking this into multiple articles or shortening it';
    }

    // Check for keyword usage
    $titleWords = array_filter(explode(' ', strtolower($title)), fn($w) => strlen($w) > 3);
    if (count($titleWords) > 0) {
        $mainKeyword = reset($titleWords);
        $contentLower = strtolower($content);
        $occurrences = substr_count($contentLower, $mainKeyword);
        
        if ($occurrences < 3) {
            $tips[] = "Your main keyword '{$mainKeyword}' should appear 3-5 times in the content";
        }
    }

    if (!strpos($content, '[')) {
        $tips[] = 'Consider adding internal links to related articles for better SEO';
    }

    return array_slice($tips, 0, 5);
}

/**
 * Analyze readability
 */
function analyze_readability(string $content): array {
    $tips = [];
    $sentences = array_filter(preg_split('/[.!?]+/', $content), fn($s) => strlen(trim($s)) > 0);
    
    if (count($sentences) > 0) {
        $avgLength = strlen($content) / count($sentences);
        if ($avgLength > 150) {
            $tips[] = 'Consider breaking up long sentences for better readability';
        }
    }

    $paragraphs = explode("\n\n", $content);
    foreach ($paragraphs as $para) {
        if (strlen($para) > 500) {
            $tips[] = 'Break up long paragraphs into smaller chunks (3-5 sentences)';
            break;
        }
    }

    // Check for passive voice (simple heuristic)
    if (preg_match_all('/\bis\s+\w+ed\b|\bare\s+\w+ed\b|\bwas\s+\w+ed\b/i', $content, $matches)) {
        if (count($matches[0]) > 5) {
            $tips[] = 'Use active voice more often instead of passive voice';
        }
    }

    if (empty($tips)) {
        $tips[] = 'Your article has good readability! Well done.';
    }

    return $tips;
}

/**
 * Provide fact-check reminders
 */
function provide_fact_check_reminders(): array {
    return [
        'Have you verified all numerical statistics and data?',
        'Are all quotes properly attributed with sources?',
        'Have you linked to credible sources?',
        'Is the context accurate and unbiased?',
        'Have you checked spelling and grammar?',
        'Are all names and titles correctly spelled?',
    ];
}

/**
 * Check Google News eligibility
 */
function check_google_news_eligibility(string $title, string $content): array {
    $checks = [];
    $wordCount = str_word_count($content);

    // Title check
    if (strlen($title) < 6) {
        $checks[] = 'Title is too short (minimum 6 characters)';
    } else if (strlen($title) > 160) {
        $checks[] = 'Title is too long (maximum 160 characters)';
    }

    // Content check
    if ($wordCount < 80) {
        $checks[] = "Content is too short for Google News (minimum 80 words, current: {$wordCount})";
    } else {
        $checks[] = '✓ Content length is suitable for Google News';
    }

    // Structure check
    if (preg_match('/<h2|<h3|##|###/i', $content)) {
        $checks[] = '✓ Article uses proper heading structure';
    } else {
        $checks[] = 'Consider using headings (H2, H3) to structure your article';
    }

    return $checks;
}
