# `src/` — Client-side world (admin & contributor SPAs + shared client code)

Everything here runs in the browser. The admin (`/admin`) and contributor (`/contributor`)
panels are React Router v6 SPAs mounted by the thin Next.js shells in `app/admin` and
`app/contributor`. Entry point: `AppAdmin.tsx`.

## Layout

| Path | Purpose |
|---|---|
| `views/admin/` | One file per CMS screen (Dashboard, ArticleEditor, ArticlesList, Categories, Tags, …) — lazy-loaded via `AppAdmin.tsx` routes |
| `views/contributor/` | Contributor portal screens (submit, my submissions, rewards) |
| `components/cms/` | Editor building blocks (SEOPanel, ArticlePreview, writing tools) |
| `components/news/` | Public-facing client components (TopNav, Footer, AuthModal, CookieConsent…) |
| `components/account/`, `auth/` | Auth forms and modal auto-open logic |
| `components/ui/` | shadcn/ui primitives — **only the ones actually used**; add new ones from shadcn on demand |
| `hooks/` | `useCmsAuth` (session/roles/2FA), `useAuth`, `useTheme`, `use-toast` |
| `lib/hostingerApi.ts` | THE client API wrapper: in-memory session token, CSRF injection, typed calls for every endpoint |
| `lib/contentHtml.ts` | Deterministic HTML sanitizer (the only sanctioned raw-HTML path) |
| `lib/*` | Small focused utilities (SEO helpers, caching, mappers) |
| `data/newsData.ts` | Fallback imagery/config consumed by mappers |
| `styles/` | CSS modules loaded by `index.css`; final authority is `app/globals.css` |
| `test/` | Vitest suites (SEO/sitemap/robots contracts) |

## Rules

- Session tokens live in memory only (`hostingerApi.ts`) — never localStorage.
- All API calls go through `hostingerApi.request()` (adds CSRF + auth automatically).
- New admin screen = new file in `views/admin/` + a route + a sidebar entry in `AdminLayout.tsx`.
