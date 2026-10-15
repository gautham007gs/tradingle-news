# `app/` — Next.js App Router (frontend + route handlers)

Routing is defined by this folder structure — **folder names are URLs**.
All public reader pages are server-rendered (SSR/ISR) per the SEO contract in `AGENTS.md`.

## Layout

| Path | Purpose |
|---|---|
| `layout.tsx` | Root document: metadata defaults, fonts, GA4/GTM, theme init |
| `(site)/` | Public reader pages inside the TopNav/Footer shell — homepage, `[category]/[slug]` articles, tags, authors, archive, search, legal & policy pages |
| `admin/[[...path]]/`, `contributor/[[...path]]/` | Thin server shells that mount the client-side SPAs from `src/` |
| `login/`, `register/`, `forgot-password/`, `reset-password/`, `verify-email/` | Auth pages |
| `api/articles`, `api/navigation` | Read proxies used by client components |
| `api/revalidate`, `api/cms-revalidate` | ISR webhook (secret-guarded) |
| `robots.ts`, `sitemap.ts`, `sitemap-index.xml/`, `sitemap-articles/[page]/`, `news-sitemap.xml/` | Crawler surface (SEO contract §6–7) |
| `feed.xml/`, `rss.xml/`, `(site)/[category]/rss.xml/` | RSS feeds |
| `error.tsx`, `global-error.tsx`, `not-found.tsx` | Server-rendered error states |

## Conventions

- `export const revalidate = <seconds>` on every public page; canonical via `lib/site.ts`.
- `"use client"` only where interaction is real; everything else stays a server component.
- New public page → also add it to `sitemap.ts` and, if it can collide with `[category]`, to
  the `RESERVED_SLUGS` sets. Playbook: `AGENTS.md` §F.
