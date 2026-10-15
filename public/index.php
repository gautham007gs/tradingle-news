<?php
declare(strict_types=1);

/**
 * Tradingle legacy PHP edge-router fallback.
 *
 * The current deployment serves the site from the Next.js standalone server
 * (Node) — see deploy-hostinger.md §7 — with Apache/PHP handling only the
 * /api/ tree and static assets. This file is no longer the application router.
 *
 * It is kept purely as a defensive fallback so a direct hit on /index.php
 * returns a clean 503 instead of a fatal "Application shell missing" error.
 * It must never be used as the primary entry point.
 */

http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
header('Retry-After: 60');
header('X-Content-Type-Options: nosniff');
echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    . '<meta name="robots" content="noindex, nofollow">'
    . '<title>Tradingle — Starting</title></head><body>'
    . '<h1>Service temporarily unavailable</h1>'
    . '<p>The application is starting or undergoing maintenance. Please retry shortly.</p>'
    . '</body></html>';
exit;
