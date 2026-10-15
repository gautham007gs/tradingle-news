# Frontend / Next.js Audit — 2026-08-24

Scope: `app/**`, `components/**`, `lib/**`, `src/**` (SPA), `middleware.ts`.
`tsc --noEmit`: 0 errors. `eslint .`: 0 errors, 31 warnings. Build: succeeds.

## Route architecture (verified)

- `app/(site)/**` — reader-facing, all server-rendered with ISR:
  homepage (60s), article `/[category]/[slug]` (300s), category pages (180s), tag/author/archive/
  location/search/editors-picks, static policy pages. Reserved-slug sets prevent catch-all
  collisions with static routes; wrong-category article URLs 301 to the canonical path.
- `generateMetadata` everywhere with canonical + OG + Twitter + robots; failures fall back to
  safe defaults (`robots: noindex` only on genuine not-found metadata paths).
- Real status codes: `notFound()` on unknown slugs (404), middleware returns real 503 maintenance
  page with Retry-After; error.tsx/global-error.tsx render server-side content.
- `app/admin/**`, `app/contributor/**` — thin server shells mounting the client SPA.
- `app/api/*` route handlers: articles proxy, navigation, revalidate webhook (secret-guarded),
  cms-revalidate (cookie fallback per pass-1 C6).

## Data layer

- `lib/api.ts` — single server fetch helper: 10s AbortController timeout, ISR tags per entity,
  `X-API-Key` header when `API_SECRET_KEY` set, typed mappers with defensive fallbacks
  (`mapSummary/mapArticle`). NotFoundError → clean notFound() rendering.
- Client SPA uses `src/lib/hostingerApi.ts`: session token held **in module memory only**
  (legacy localStorage token actively scrubbed — pass-1 C6 verified), central CSRF injection,
  silent retry semantics, referral code consumed from localStorage then removed.

## Hydration & rendering integrity

- Deterministic sanitizer guarantees identical SSR/client HTML for article bodies.
- Timestamps stored TZ-naive in DB are parsed as UTC by appending `Z` (`toIsoDateTime`) — no
  server/client mismatch.
- Theme flash prevented via beforeInteractive inline script defaulting to light.

## Issues found this pass

### F2/F3. Dead brand-image references → **FIXED** (see MASTER §2)
`feed.xml` RSS image and editors-picks OG/Twitter images pointed at nonexistent files under
`/assets/brand/`. Root cause: hardcoded asset constants that bypassed the centralized
`articleOgImage()`/settings-driven OG helpers. Lesson for future edits: always source imagery
from `site_default_og_image` or `/og-image.png`; never invent `assets/brand/*` paths.

## Lint warnings (31 — triage guidance, non-blocking)

| Cluster | Files | Recommendation |
|---|---|---|
| `<img>` instead of `next/image` (~20) | app/(site)/author, editors-picks, location, tag, components/article, home, search, LoadMoreButton | Convert where the image benefits from optimization; several are intentionally plain `<img>` for exact-size avatars/thumbnails — acceptable if width/height set |
| Manual stylesheet tags (2) | app/layout.tsx | Intentional: font CSS + critical shell must load before hydration; keep |
| useEffect dependency arrays (6) | useInfiniteScroll, useReveal, ArticleEditor, ReviewQueue, MySubmissions, SubmitArticle | Mostly intentional mount-once fetches; wrap callbacks in useCallback if converting |
| Stale ref in cleanup (1) | useInfiniteScroll | Capture `ref.current` into a local const inside the effect |
| Unused eslint-disable (1) | MediaLibrary.tsx | Remove the directive |

## Environment note

`next build` fails **only** when the checkout path contains `$` characters — see MASTER §2 F5
for root cause and workaround. From a normal path the build completes cleanly (verified).
