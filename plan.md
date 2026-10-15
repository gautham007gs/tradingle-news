# Tradingle newsroom redesign

## Implementation

Redesign the public reader experience and admin CMS skin without changing route contracts, SEO metadata, API endpoints, authentication, or article URL helpers. The public system will use a restrained editorial palette, asymmetric lead grid, strong type hierarchy, hairline rules, compact metadata, and responsive image-led cards. Category, search, archive, and article pages inherit the same tokens and reading rhythm through shared CSS and existing FeedKit/article components. The admin will use a calmer newsroom workspace treatment with a persistent rail, clearer section labels, compact KPI cards, and stronger focus states.

Sample content will be seeded through the existing authenticated article API using the provided admin account, with 100+ published articles spread across the site's core categories and realistic editorial metadata/images. No new runtime dependencies are planned.

## Project structure

- `components/home/HomePageContent.tsx`: redesigned public homepage composition.
- `components/news/TopNav.tsx`, `components/layout/FooterServer.tsx`: existing public chrome, restyled through shared tokens.
- `components/feed/FeedKit.tsx`, `components/article/ArticlePageContent.tsx`: existing category/article layouts, restyled globally.
- `src/views/admin/AdminLayout.tsx`, `src/views/admin/Dashboard.tsx`, `src/views/admin/ArticlesList.tsx`: CMS shell and high-traffic screens, restyled for newsroom operations.
- `app/globals.css`, `src/index.css`: consolidated design tokens and responsive editorial rules.
- `scripts/seed-demo-content.mjs`: repeatable authenticated seeding utility for demo articles.

## Design direction

- **Movement:** contemporary international newspaper / financial newsroom.
- **Principles:** editorial hierarchy, quiet precision, generous white space, visible structure.
- **Color:** warm paper canvas, ink black, slate neutrals, and a single Tradingle vermilion accent for live/news signals.
- **Layout:** 12-column lead grid with an asymmetric hero, ruled index rails, and full-width section bands; no floating card soup.
- **Signature elements:** vermilion micro-kickers, double-rule section heads, compact numbered “most read” rail.
- **Interaction:** links are obvious through underline/color shifts; controls use 44px tap targets and clear focus rings.
- **Animation:** subtle image scale on hover and short fade-in only; no decorative motion.
- **Typography:** Inter for utility/body, Rubik/Inter for display headlines, tight 1.05–1.2 headline rhythm, 15–18px reading copy.
- **Brand essence:** precise Indian business and world reporting for readers who want signal over noise. Personality: exact, composed, curious.
- **Voice:** “The signal behind the headline.” / “Read the context before the reaction.”
- **Wordmark:** retain the existing Tradingle mark; pair it with a small vermilion signal dot.
- **Signature color:** `#C74332` vermilion, used sparingly for live states and editorial kickers.
