# `lib/` — Server-side utilities (Next.js server components & route handlers)

Imported by `app/**` and `components/**`. Client code uses `src/lib/` instead.

| File | Purpose |
|---|---|
| `api.ts` | THE server fetch layer: `apiFetch` (10s timeout, ISR tags, `X-API-Key`), typed mappers, `NotFoundError` |
| `site.ts` | Canonical URL helpers — `absoluteUrl()`, `canonicalArticlePath()`, `canonicalArticleUrl()`; the only place URLs are built |
| `seo.ts` / `jsonLd.ts` | JSON-LD graph builders (NewsArticle, Person, Breadcrumb…) + XSS-safe serializer |
| `articlePage.ts`, `homepage.ts`, `types.ts` | Article/homepage data assembly + shared types |
| `navData.ts` | Navigation data reader |
| `adminAuth.ts` | Auth check used by Next.js route handlers |
| `jobs.ts` | Jobs-board fetch helpers |

Rule: every server-side API call goes through `apiFetch` — no ad-hoc `fetch()`.
