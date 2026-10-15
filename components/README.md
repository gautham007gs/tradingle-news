# `components/` — Server components for public pages

Rendered inside `app/(site)/**`; no `"use client"` unless unavoidable.

| Path | Purpose |
|---|---|
| `article/` | Article page body (`ArticlePageContent`), comments drawer, read progress |
| `home/` | Homepage sections (hero, rails, section grids) |
| `layout/` | `ClientShell` (nav + providers) and `FooterServer` |
| `search/` | Search page content |
| `legal/` | Static legal/policy page renderer + shared content |
| `pages/` | Standalone page content (Refer & Earn) |
| `providers/` | Client provider wrapper for standalone pages |
| `JsonLd.tsx` | Renders serialized JSON-LD (XSS-safe via `lib/jsonLd.ts`) |
| `LoadMoreButton.tsx`, `RelativeTime.tsx` | Small shared widgets |
