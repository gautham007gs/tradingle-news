<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

require_method('POST');
[$user, $roles] = require_roles(['admin', 'editor', 'author']);

// ── AI rate limiting ──────────────────────────────────────────────────────
// Every AI call bills the site's provider keys, so the endpoint is throttled
// per user (minute / hour / day) plus a global emergency circuit breaker that
// halts all AI usage site-wide if the overall rate spikes. Limits are
// configurable via env so they can be tuned without a code deploy.
$aiLimits = [
    'minute' => max(1, (int) env_value('AI_RATE_LIMIT_PER_MINUTE', '8')),
    'hour'   => max(1, (int) env_value('AI_RATE_LIMIT_PER_HOUR', '80')),
    'day'    => max(1, (int) env_value('AI_RATE_LIMIT_PER_DAY', '500')),
    'global_per_minute' => max(1, (int) env_value('AI_GLOBAL_CIRCUIT_BREAKER_PER_MINUTE', '60')),
    'max_input_chars'   => max(100, (int) env_value('AI_MAX_INPUT_CHARS', '7000')),
];

$userId = (int) $user['id'];
$uid = 'ai:user:' . $userId;
if (!rate_limit($uid . ':min', $aiLimits['minute'], 60)
    || !rate_limit($uid . ':hour', $aiLimits['hour'], 3600)
    || !rate_limit($uid . ':day', $aiLimits['day'], 86400)) {
    json_error('AI assist rate limit reached. Please try again later.', 429);
}
if (!rate_limit('ai:global:min', $aiLimits['global_per_minute'], 60)) {
    json_error('AI assist is temporarily unavailable. Please try again in a minute.', 429);
}

$input = input_json();
$task = trim((string) ($input['task'] ?? 'seo'));
$title = trim((string) ($input['title'] ?? ''));
$excerpt = trim((string) ($input['excerpt'] ?? ''));
$content = trim(strip_tags((string) ($input['content'] ?? '')));
$keyword = trim((string) ($input['focus_keyword'] ?? ''));
$field = trim((string) ($input['field'] ?? ''));
$selectedText = trim(strip_tags((string) ($input['selected_text'] ?? '')));

$allowed = ['grammar', 'seo', 'headline', 'excerpt', 'fact_check', 'readability', 'seo_title', 'seo_description', 'field', 'paraphrase'];
if (!in_array($task, $allowed, true)) {
    json_error('Unsupported AI assist task.');
}

if ($title === '' && $excerpt === '' && $content === '' && $selectedText === '') {
    json_error('Add article content before using AI assist.');
}

if (strlen($content) > $aiLimits['max_input_chars'] || strlen($selectedText) > $aiLimits['max_input_chars']) {
    json_error('Input is too large for AI assist. Trim the selection and try again.', 413);
}

function build_local_guidance(string $task, string $content, string $field): array
{
    $wordCount = str_word_count($content);
    $fallback = [];

    if ($task === 'seo' || $task === 'seo_title' || $task === 'seo_description') {
        $fallback[] = 'Use the focus keyword naturally in the headline, first paragraph, one subheading, SEO title, and meta description.';
        $fallback[] = 'Keep SEO title near 45-70 characters and meta description near 120-160 characters.';
        $fallback[] = 'Add specific names, places, dates, and source context because generic summaries perform poorly for news.';
    }
    if ($task === 'grammar' || $task === 'readability' || $task === 'field') {
        $fallback[] = 'Shorten long sentences and keep one idea per paragraph.';
        $fallback[] = 'Prefer active voice for breaking-news copy.';
        $fallback[] = 'Check repeated words, unclear pronouns, and unsupported adjectives.';
    }
    if ($task === 'paraphrase') {
        $fallback[] = 'Rewrite the selected text in simpler, clearer language while preserving the facts.';
        $fallback[] = 'Try a tighter version with fewer filler words and stronger verbs.';
        $fallback[] = 'Keep names, numbers, places, and dates unchanged unless you have verified corrections.';
    }
    if ($task === 'headline' || $task === 'seo_title') {
        $fallback[] = 'Make the headline specific: who did what, where, and why it matters.';
        $fallback[] = 'Avoid vague teaser language. Keep the strongest noun and verb early.';
    }
    if ($task === 'excerpt' || $task === 'seo_description') {
        $fallback[] = 'Write an 18-25 word summary that answers who, what, where, and why now.';
        $fallback[] = 'Do not repeat the headline word-for-word.';
    }
    if ($task === 'fact_check') {
        $fallback[] = 'Verify names, titles, places, dates, numbers, quotes, and image captions against primary or trusted sources.';
        $fallback[] = 'Mark any unsupported claim before publishing.';
    }
    if ($field !== '') {
        $fallback[] = 'For the ' . $field . ' field, be specific, concise, and avoid claims that are not supported in the article.';
    }
    if ($wordCount < 250) {
        $fallback[] = 'The draft is short. Add verified context, background, and source attribution before publishing.';
    }

    return $fallback ?: ['Improve clarity, source every factual claim, and make the article useful for readers before publishing.'];
}

function suggestion_lines(string $text): array
{
    $jsonText = trim($text);
    $jsonText = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $jsonText) ?? $jsonText;
    $decoded = json_decode($jsonText, true);
    if (is_array($decoded) && is_array($decoded['suggestions'] ?? null)) {
        return array_values(array_filter(array_map(static fn ($item): string => trim((string) $item), $decoded['suggestions'])));
    }

    $lines = array_values(array_filter(array_map(static function (string $line): string {
        $line = preg_replace('/^[-*0-9.)\s]+/', '', $line) ?? '';
        $line = str_replace(['**', '__'], '', $line);
        return trim($line);
    }, preg_split('/\r?\n/', $text) ?: [])));

    return $lines ?: [$text];
}

function call_openai(string $apiKey, string $model, string $system, string $prompt, array &$errors): ?array
{
    $payload = [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $prompt],
        ],
        'temperature' => 0.25,
        'max_tokens' => 1400,
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 35,
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        $errors[] = [
            'provider' => 'openai',
            'model' => $model,
            'status' => $status,
            'message' => $response ? mb_substr((string) $response, 0, 240) : ($curlError ?: 'No response from OpenAI.'),
        ];
        return null;
    }

    $decoded = json_decode($response, true);
    $text = trim((string) ($decoded['choices'][0]['message']['content'] ?? ''));
    return $text === '' ? null : ['provider' => 'openai', 'model' => $model, 'text' => $text];
}

function normalize_gemini_model(string $model): string
{
    $model = trim($model);
    return str_starts_with($model, 'models/') ? substr($model, 7) : $model;
}

function call_gemini(string $apiKey, string $model, string $system, string $prompt, array &$errors): ?array
{
    $model = normalize_gemini_model($model);
    $payload = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [
                    ['text' => $system . "\n\n" . $prompt],
                ],
            ],
        ],
        'generationConfig' => [
            'temperature' => 0.25,
            'maxOutputTokens' => 1400,
        ],
    ];

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($apiKey);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 35,
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        $errors[] = [
            'provider' => 'gemini',
            'model' => $model,
            'status' => $status,
            'message' => $response ? mb_substr((string) $response, 0, 240) : ($curlError ?: 'No response from Gemini.'),
        ];
        return null;
    }

    $decoded = json_decode($response, true);
    $text = trim((string) ($decoded['candidates'][0]['content']['parts'][0]['text'] ?? ''));
    return $text === '' ? null : ['provider' => 'gemini', 'model' => $model, 'text' => $text];
}

$fallback = build_local_guidance($task, $content, $field);

$system = 'You are an expert newsroom writing and SEO assistant for a real news CMS. Do not invent facts. Do not write a full article unless asked. Keep suggestions publish-ready, specific, current-news aware, clear, human, and SEO-friendly. Preserve factual caution and avoid clickbait.';
$prompt = "Task: {$task}\nTarget field: {$field}\nFocus keyword: {$keyword}\nTitle: {$title}\nExcerpt: {$excerpt}\nSelected text: {$selectedText}\nDraft text:\n" . mb_substr($content, 0, (int) $aiLimits['max_input_chars']) . "\n\nReturn ONLY valid JSON exactly like this: {\"suggestions\":[\"option or suggestion 1\",\"option or suggestion 2\"]}. For headline, excerpt, SEO title, SEO description, field, or paraphrase tasks, return 3-5 complete ready-to-use options. For SEO, grammar, readability, or fact_check tasks, return 5-8 concise actionable suggestions. Each suggestion must be complete and not cut off. Do not use markdown.";

$providers = [];
foreach (['OPENAI_API_KEY', 'OPENAI_API_KEY_2'] as $name) {
    $key = trim((string) env_value($name, ''));
    if ($key !== '') {
        $providers[] = ['type' => 'openai', 'key' => $key, 'model' => env_value('OPENAI_MODEL', 'gpt-4.1-mini')];
    }
}
foreach (['GEMINI_API_KEY', 'GEMINI_API_KEY_2'] as $name) {
    $key = trim((string) env_value($name, ''));
    if ($key !== '') {
        $providers[] = ['type' => 'gemini', 'key' => $key, 'model' => env_value('GEMINI_MODEL', 'gemini-2.5-flash')];
    }
}

$providerErrors = [];
foreach ($providers as $provider) {
    $result = $provider['type'] === 'openai'
        ? call_openai($provider['key'], $provider['model'], $system, $prompt, $providerErrors)
        : call_gemini($provider['key'], $provider['model'], $system, $prompt, $providerErrors);

    if ($result !== null) {
        json_response([
            'mode' => 'ai',
            'provider' => $result['provider'],
            'model' => $result['model'],
            'suggestions' => suggestion_lines($result['text']),
        ]);
    }
}

json_response([
    'mode' => 'local',
    'provider' => 'local',
    'suggestions' => $fallback,
    'note' => $providers
        ? 'All configured AI providers were unavailable, so Tradingle returned local editorial guidance.'
        : 'No AI provider keys are configured, so Tradingle returned local editorial guidance.',
    'provider_errors' => APP_ENV === 'local' ? $providerErrors : [],
]);
