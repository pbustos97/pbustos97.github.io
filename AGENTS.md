# AGENTS.md - Developer Guide

## Overview

Static GitHub Pages personal site (DJ mixes + portfolio). Plain HTML/CSS/JS — no build step, no dependencies, no frameworks. All rendering is client-side; content is JSON-driven and fetched at runtime, so pages must be served over HTTP (`fetch` fails on `file://`).

## Structure

```
/
├── index.html          # Sessions: hero + 3 recent compact mixes
├── mixes.html          # All mixes with full track tables
├── projects.html       # GitHub repo cards (filter + search)
├── about.html          # Profile / background / contact
├── styles/
│   └── main.css        # All styling (CSS custom properties / design tokens)
├── js/
│   ├── site.js         # Shared: runtime-injected header/footer partials,
│   │                   # fetchJSON helper, profile hero loader
│   ├── main.js         # Mix loading + Traaktor export parsing
│   ├── projects.js     # Projects rendering/filtering
│   └── about.js        # About page rendering
├── data/               # JSON "database" — source of truth for content
│   ├── mixes.json      # Mix metadata
│   ├── projects.json   # Manual GitHub repo snapshot
│   └── about.json      # Hero tagline, background, contact
├── mixes/2024/         # Traaktor export HTML files (track tables)
└── stylesheet.css      # Legacy - unused, do not edit
```

All four pages share identical header/footer markup, injected at runtime by `js/site.js` into `<div data-partial="header">` / `<div data-partial="footer">` placeholders. Nav links live in ONE place (the `NAV_LINKS` array in `site.js`); the active link is derived from the current URL, so it can never drift out of sync.

## Data flow

- `data/mixes.json` — mix metadata only (`id`, `date`, `title`, `description`, `genre`). Tracks are NOT in JSON: `js/main.js` fetches `mixes/2024/<id>.html` and parses `table.border` rows with DOMParser.
- `data/projects.json` — manual snapshot of GitHub repos (`name`, `description`, `language`, `stars`, `forks`, `updatedAt`, `featured`). The page reads this local file as the offline base + fallback. At runtime, it fetches each repo's latest default-branch commit date from `api.github.com` (`commits?per_page=1`) to show "Last updated", falling back to `updatedAt` when offline/rate-limited. Results are cached in `localStorage` (key `pbustos97.repoLastCommit`) with a 24h TTL to respect the unauthenticated 60 req/hr/IP limit.
- `data/about.json` — `profile` (name, tagline, heroTitle), `background[]`, `contact[]`. Feeds the index hero, the about page, and the profile tagline.
- `js/site.js` — shared header/footer partials + `fetchJSON` wrapper + `loadProfileHero`. Loaded by every page before its page-specific script.

### Mix rendering modes

- `index.html`: `#mixes-list` has `data-limit="3"` → the 3 most recent mixes render as COMPACT cards (section header + date/description meta, NO track table, NO track fetch).
- `mixes.html`: no `data-limit` → all mixes render as full cards with track tables fetched from `mixes/2024/<id>.html`, parsed, and rendered using the `TRACK_COLUMNS` constant.

## Adding a New Mix

1. Export mix from Traaktor as HTML → `mixes/2024/YYYY-MM-DD.html`
2. Add an entry to `data/mixes.json` whose `id` matches the file name:
   ```json
   { "id": "2025-01-15", "date": "2025-01-15", "title": "January 15, 2025", "description": "", "genre": "Multi-Genre" }
   ```

## Updating projects

Edit `data/projects.json` by hand. `featured: true` adds a badge and sorts first, then stars desc, then `updatedAt`.

## Testing Locally

`fetch()` of `data/` and mix HTML fails when opened as `file://`. Always serve over HTTP:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

No build, lint, or test step exists.

## Deploy

Push to `master` (the default branch — NOT `main`). GitHub Pages serves the repo root automatically; no CI, no build hook, no special config required for static hosting.

## Known quirks

- `index.html` references `/feed.xml` (RSS `<link>`) but no `feed.xml` exists in the repo.
- Dark theme is CSS-only via `@media (prefers-color-scheme: dark)` in `main.css` — no JS toggle.
- `stylesheet.css` is legacy and unreferenced; don't edit it.
