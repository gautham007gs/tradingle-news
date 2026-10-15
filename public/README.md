# `public/` — Static edge files (served by Apache, not processed)

Only files that must exist verbatim at the domain root. Long-lived caching is set by
`.htaccess`. **Do not reference `assets/brand/*` — those files do not exist** (audit F2/F3);
the site image is `/og-image.png`.

| File | Purpose |
|---|---|
| `og-image.png` | THE social/OG image used by metadata, JSON-LD and RSS |
| `favicon.ico`, `favicon.png` | Favicons |
| `placeholder.svg` | Image fallback for missing media |
| `critical-shell.css` | Pre-hydration critical CSS (loaded in `app/layout.tsx`) |
| `llms.txt` | AI-crawler guidance listing real routes |
| `.htaccess` | Production edge rules: HTTPS force, Node proxy for non-file paths, `/api` + `/uploads` left to PHP |
| `index.php` | Graceful 503 fallback if Node is down — never a router |
| `assets/fonts/` | Self-hosted WOFF2 fonts + `local-fonts.css` (refresh via `npm run fonts:copy`) |
