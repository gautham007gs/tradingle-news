import { NextRequest, NextResponse } from "next/server";
import { getServerApiBase } from "./lib/site";

/**
 * Serves redirects dynamically so changes made in the admin panel take
 * effect within about a minute, instead of requiring a server restart.
 *
 * Previously, redirects only worked via next.config.mjs's redirects()
 * function, which Next.js evaluates once when the server process starts —
 * so a redirect saved through the CMS looked successful but silently didn't
 * work for visitors until the next deploy/restart. See the audit report for
 * the full history here.
 *
 * Design goals, in order:
 *  1. Minimize latency impact. The redirect list is cached in memory and
 *     only re-fetched when it's more than 60 seconds old — the large
 *     majority of requests just do a plain Map lookup against the existing
 *     cache and add no network call at all. The rare request that does
 *     trigger a refresh awaits it (bounded by a 2.5s timeout) rather than
 *     firing it in the background, since background work continuing to run
 *     after this function returns isn't something to assume without being
 *     able to test it against the actual deployment target.
 *  2. Never break the site if the redirects API is slow, down, or returns
 *     something unexpected — worst case, redirects stop updating until the
 *     API recovers (a failed attempt still marks the cache as "checked" so
 *     a persistent outage doesn't force every request to pay the timeout),
 *     but the site itself keeps working normally.
 *  3. Fast lookup — a plain Map, checked before any regex/pattern work.
 */

type RedirectEntry = { to: string; status: number };

let cache = new Map<string, RedirectEntry>();
let lastFetchedAt = 0;
let fetchInFlight = false;
let maintenanceEnabled = false;
let maintenanceMessage = "Tradingle is being updated. Please check back soon.";
const REFRESH_INTERVAL_MS = 60_000;

async function refreshCache() {
  if (fetchInFlight) return;
  fetchInFlight = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const [res, settingsRes] = await Promise.all([
      fetch(`${getServerApiBase()}/redirects/list.php`, {
        headers: {
          Accept: "application/json",
          ...(process.env.API_SECRET_KEY ? { "X-API-Key": process.env.API_SECRET_KEY } : {}),
        },
        next: { revalidate: 60 },
        signal: controller.signal,
      }),
      fetch(`${getServerApiBase()}/site-settings.php`, {
        headers: {
          Accept: "application/json",
          ...(process.env.API_SECRET_KEY ? { "X-API-Key": process.env.API_SECRET_KEY } : {}),
        },
        next: { revalidate: 60 },
        signal: controller.signal,
      }),
    ]);

    if (settingsRes.ok) {
      try {
        const settingsPayload = (await settingsRes.json()) as {
          settings?: Record<string, string>;
        };
        const settings = settingsPayload?.settings ?? {};
        maintenanceEnabled = settings.maintenance_enabled === "1";
        if (typeof settings.maintenance_message === "string" && settings.maintenance_message.trim() !== "") {
          maintenanceMessage = settings.maintenance_message;
        }
      } catch {
        // Keep previous maintenance state on parse failure
      }
    }

    if (!res.ok) return;
    const { data } = (await res.json()) as {
      data?: { from_path: string; to_path: string; status_code: number; is_active: number | boolean }[];
    };
    if (!Array.isArray(data)) return;

    const next = new Map<string, RedirectEntry>();
    for (const row of data) {
      if (!row.from_path || !row.to_path) continue;
      if (!row.is_active) continue;
      next.set(row.from_path, { to: row.to_path, status: Number(row.status_code) === 302 ? 302 : 301 });
    }
    cache = next;
    lastFetchedAt = Date.now();
  } catch {
    // Network error, timeout, bad JSON, etc. — keep serving the last good
    // cache (or the empty starting cache) and try again on the next request.
    // Importantly: still counts as "attempted" so a persistently-down API
    // doesn't cause every single request to pay the timeout cost — see below.
    lastFetchedAt = Date.now();
  } finally {
    clearTimeout(timeout);
    fetchInFlight = false;
  }
}

/** The two legacy patterns that predate the canonical /{category}/{slug} URL structure. */
function legacyArticleRedirect(pathname: string): RedirectEntry | null {
  if (pathname.startsWith("/article/")) {
    return { to: pathname.replace(/^\/article/, ""), status: 301 };
  }
  if (pathname.startsWith("/m/article/")) {
    return { to: pathname.replace(/^\/m\/article/, ""), status: 301 };
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only actually wait on a refresh when the cache is stale or empty — the
  // overwhelming majority of requests land inside the 60-second window and
  // skip this entirely. When a refresh is needed, awaiting it (rather than
  // firing-and-forgetting) means this mechanism has a real, verifiable
  // effect rather than depending on background work reliably continuing
  // after this function returns, which isn't something to assume without
  // being able to test it against the actual deployment target.
  if (Date.now() - lastFetchedAt > REFRESH_INTERVAL_MS) {
    await refreshCache();
  }

  // Maintenance mode — the admin panel toggles `maintenance_enabled` in Site
  // Settings. When active, public reader-facing pages return a real 503 (never
  // a 200 placeholder) per the SEO rules. Staff routes and the API keep
  // working so editors can take the site down/up.
  if (maintenanceEnabled && !isStaffOrApiPath(pathname)) {
    const body = maintenanceHtml(maintenanceMessage);
    return new NextResponse(body, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "3600",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  const dynamicMatch = cache.get(pathname);
  if (dynamicMatch) {
    return NextResponse.redirect(new URL(dynamicMatch.to, req.url), dynamicMatch.status);
  }

  const legacyMatch = legacyArticleRedirect(pathname);
  if (legacyMatch) {
    return NextResponse.redirect(new URL(legacyMatch.to, req.url), legacyMatch.status);
  }

  return NextResponse.next();
}

/** Paths that must stay reachable during maintenance: the CMS, contributor
 *  dashboard, auth pages, and the revalidate webhook. All other pages
 *  (including the homepage) return 503. */
function isStaffOrApiPath(pathname: string): boolean {
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/contributor") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/")
  ) {
    return true;
  }
  return false;
}

function maintenanceHtml(message: string): string {
  const safe = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Tradingle — Temporarily Unavailable</title>
    <style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
      .box{max-width:28rem;padding:2rem;text-align:center}
      h1{font-size:1.5rem;margin:0 0 .75rem}
      p{margin:0;color:#444;line-height:1.5}
    </style>
  </head>
  <body>
    <main class="box">
      <h1>We'll be right back</h1>
      <p>${safe}</p>
    </main>
  </body>
</html>`;
}

export const config = {
  // Skip static assets and API routes — redirects only ever apply to real
  // pages, and running on every JS/CSS/image request would be pure overhead
  // for zero benefit. This is the standard exclusion pattern from the
  // Next.js docs, plus this project's /assets/ static folder and /uploads/.
  matcher: ["/((?!api|_next/static|_next/image|assets|uploads|favicon.ico).*)"],
};
