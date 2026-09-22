# SUMMARY.md — Front-end DRY Refactor

## 1. Overview

Static GitHub Pages personal site (DJ mixes + developer portfolio). Plain
HTML/CSS/JS — **no build step, no dependencies, no frameworks**. All rendering
is client-side: pages fetch JSON/HTML at runtime, so the site **must be served
over HTTP** (`fetch` fails on `file://`).

This refactor removed duplicated header/footer markup, shared helpers, and dead
code across the four pages, consolidating them into a single shared module
(`js/site.js`) loaded before every page-specific script. Net result: nav links
live in one place and the active link is derived from the URL, so chrome can
never drift out of sync between pages.

## 2. File Structure

```
/
├── index.html        # Hero + #mixes-list[data-limit="3"] -> compact recent mixes
├── mixes.html        # #mixes-list (no limit) -> full mix cards w/ track tables
├── projects.html     # #projects-grid + #filter-chips + #project-search
├── about.html        # #about-content (Background/Contact) + #profile-tagline
├── styles/
│   └── main.css      # All styling; CSS custom props; dark mode via @media
├── js/
│   ├── site.js       # Shared: header/footer partials, fetchJSON, escapeHtml,
│   │                 #   memoized getAboutData, loadProfileHero, auto-init
│   ├── main.js       # Mix loading + Traaktor export parsing (compact & full)
│   ├── projects.js   # Render/filter/search/sort + live commit dates (GH API)
│   └── about.js      # About page render (uses site.js getAboutData)
├── data/             # JSON "database" — source of truth for content
│   ├── mixes.json    # Mix metadata: id, date, title, description, genre
│   ├── projects.json # Manual GitHub repo snapshot (name, language, stars...)
│   └── about.json    # profile{tagline,heroTitle}, background[], contact[]
├── mixes/2024/       # Traaktor export HTML (track tables); 2 files present
└── stylesheet.css    # Legacy, unreferenced — do not edit
```

Each page loads `js/site.js` first, then its page script (e.g.
`index.html:34-35`). Header/footer are placeholders
(`<div data-partial="header|footer">`) filled at runtime.

## 3. What Changed in This Refactor

- **NEW `js/site.js`**: single source of truth for chrome. `NAV_LINKS` array
  (`site.js:7`); header/footer built and injected into `data-partial`
  placeholders (`site.js:74`, `site.js:83`); active nav derived from URL
  basename (`getActivePage` `site.js:18`). Shared `fetchJSON` (`site.js:92`),
  `escapeHtml` (`site.js:104`), memoized `getAboutData` (`site.js:119`), and
  `loadProfileHero` (`site.js:130`). Auto-init on `DOMContentLoaded`
  (`site.js:163`).
- **NEW `js/about.js`**: renders Background/Contact tables from
  `data/about.json` via `getAboutData`; escaped output; error empty-state
  (`about.js:54`).
- **`js/main.js`**: removed dead code (`essentialColumns`, `formatDate`,
  `renderMixList`). `TRACK_COLUMNS` constant (`main.js:8`) now drives the
  `<thead>`. Two modes: **COMPACT** (index, via `data-limit`) and **FULL**
  (mixes.html). Escaped ids/metadata/track fields.
- **`js/projects.js`**: removed dead `GITHUB_USERNAME` constant. Replaced
  per-chip listeners with a **single event-delegated** listener on
  `#filter-chips` (`projects.js:394`); "All" chip preserved across rebuilds
  (`projects.js:363`). Now uses `fetchJSON`/`escapeHtml` from `site.js`.
- **`js/projects.js` (post-refactor feature)**: the page is now an **offline
  base + live overlay**. It still reads `data/projects.json` for all card data,
  but at runtime also fetches each repo's latest default-branch commit date from
  the GitHub API and patches the "Last updated" text in place. `localStorage`
  cache (key `pbustos97.repoLastCommit`, 24h TTL, one `{date, fetchedAt}` entry
  per repo) keeps it within the unauthenticated 60 req/hr/IP limit. Sort order is
  **unchanged** (still uses local `updatedAt`, never live dates).
- **`styles/main.css`**: duplicate `.project-card` block merged into one
  canonical set (`main.css:498`) using the second block's conflicting values —
  zero visual change. Dead selectors removed: `.list-view`, `.project-topics`,
  `.project-topic`, `.hide-mobile`, `footer .nav-link`.
- **`AGENTS.md`** rewritten to document the new shared-module structure.

## 4. Key Functions / Flows

**`js/site.js`**
- `NAV_LINKS` (`site.js:7`) — 5 entries; `external:true` flag for GitHub link.
- `getActivePage()` (`site.js:18`) — `location.pathname` basename, defaults to
  `index.html`.
- `buildHeader()` (`site.js:28`) / `renderHeader()` (`site.js:74`) — nav built
  with `class="active"` on the matching link, injected via `outerHTML`.
- `fetchJSON(url)` (`site.js:92`) — throws on `!response.ok` or parse failure.
- `escapeHtml(value)` (`site.js:104`) — escapes `& < > " '`; null -> `''`.
- `getAboutData()` (`site.js:119`) — memoized promise in `_aboutDataPromise`
  so hero + about page share one `data/about.json` fetch.
- `loadProfileHero()` (`site.js:130`) — fills `#hero-title`, `#hero-tagline`,
  `#profile-tagline` where present; no-ops if none exist; on error sets
  `#hero-tagline` to a hardcoded `FALLBACK_TAGLINE` (`site.js:138`).

**`js/main.js`** — `loadMixes()` (`main.js:102`)
- Reads `data-limit` from `#mixes-list` (`main.js:106`); `compactMode` true
  when a positive integer limit is set (`main.js:108`).
- Compact: copies mixes, sorts by `date` descending via `localeCompare`
  (`main.js:118`), slices to N, renders `renderMixCardCompact` (no track
  fetch). Full: renders `renderMixCard` in original order, then fetches each
  `mixes/2024/<id>.html` (`main.js:140`), `parseMixFile` (`main.js:10`) reads
  `table.border` rows, and `renderMixTracks` (`main.js:78`) fills the tbody.
- Track duration uses `Duration || Time` fallback (`main.js:86`). Per-mix and
  page-level failures show `Failed to load...` empty-states.

**`js/projects.js`** — `initProjects()` (`projects.js:456`)
- Loads `data/projects.json`; `filterProjects` (`projects.js:253`) applies
  language filter + case-insensitive search over name/desc/language;
  `sortProjects` (`projects.js:276`) orders featured first, then stars desc,
  then local `updatedAt` desc (`projects.js:281`). `updateFilterChips`
  (`projects.js:338`) rebuilds language chips sorted by count; `syncActiveChip`
  (`projects.js:382`) keeps the active highlight; `attachChipListeners`
  (`projects.js:394`) delegates clicks; search handler supports `Escape` to clear
  (`projects.js:423`).
- **Live date flow**: `renderProjects` (`projects.js:288`) is **cache-first** —
  reads cache (`projects.js:325`) and passes `resolveDate(repo, cache)`
  (`projects.js:98`) into `renderProjectCard` (`projects.js:197`), which emits a
  `<span class="updated" data-repo-name="...">` wrapping `.updated-date`
  (`projects.js:238`, `projects.js:242`). `resolveDate` prefers a fresh cache
  entry (`isCacheFresh` `projects.js:90`) else `repo.updatedAt`; formats via
  `formatDate` (`projects.js:107`). After the initial render, `initProjects`
  fires `refreshRepoDates()` (`projects.js:476`, non-blocking): sequential loop
  over `currentRenderedProjects` (`projects.js:148`) skips fresh-cached repos
  (`projects.js:153`), calls `fetchLastCommitDate` (`projects.js:118` →
  `GET https://api.github.com/repos/pbustos97/<repo>/commits?per_page=1` →
  `json[0].commit.committer.date` `projects.js:135`), writes cache
  (`projects.js:161`), and patches only the matching card's `.updated-date`
  via `[data-repo-name]` (`projects.js:166`) — no full re-render, so filter/
  search re-renders stay correct. Loop **stops on rate limit** (`X-RateLimit-
  Remaining === '0'` `projects.js:172`, or error containing `403`/`429`
  `projects.js:181`) with a single `console.warn`; other failures (offline/404/
  empty repo → `'No commit date found'`) keep the `updatedAt` fallback and write
  no cache. Cache IO: `readCache`/`writeCache` (`projects.js:66`, `projects.js:79`).

**`js/about.js`** — `loadAbout()` (`about.js:54`)
- Fills `#profile-tagline` and renders Background/Contact `mix-section` tables
  into `#about-content` from `getAboutData()`; contact items with `url` render
  as external links; errors show `Failed to load content`.

## 5. Behavior Contract / How to Verify

```bash
python -m http.server 8000   # then open http://localhost:8000
```

- **index.html**: same header/footer as all pages (Sessions active); hero title
  + tagline populated from `about.json`; up to 3 most-recent mixes as **compact**
  cards (currently 2 entries exist, sorted newest-first: 2024-04-24, 2024-04-11),
  **no** track tables.
- **mixes.html**: **all** mixes as full cards; each track table fetched and
  parsed from its `mixes/2024/<id>.html`.
- **projects.html**: cards from `data/projects.json`; "Last updated" starts at
  local `updatedAt` (or fresh `localStorage` cache) then patches to live
  per-repo commit dates from `api.github.com` (silently skips on offline/rate
  limit). Chips filter by language, search box filters live, `Escape` clears;
  featured badge sorts first (sort uses local `updatedAt`); empty state when
  filters exclude all; error state if JSON fetch fails.
- **about.html**: Background + Contact tables + profile tagline from
  `about.json`.
- **Dark mode**: automatic via `@media (prefers-color-scheme: dark)`
  (`main.css:65`, `main.css:125`) — no JS toggle.
- **Deploy**: push to `master` (default branch, not `main`); Pages serves root.

## 6. Adding a Mix / Updating Projects (Quick Reference)

**New mix**:
1. Export from Traaktor as HTML -> `mixes/2024/YYYY-MM-DD.html`.
2. Add entry to `data/mixes.json` whose `id` matches the filename:
   `{ "id": "2025-01-15", "date": "2025-01-15", "title": "January 15, 2025", "description": "", "genre": "Multi-Genre" }`.
   (Parsing is fragile: an export without a `table.border` renders tracks
   silently empty.)

**Projects**: edit `data/projects.json` by hand. `featured: true` adds a badge
and sorts first, then by stars desc, then `updatedAt` (the local snapshot —
sort never uses live dates). At runtime the page fetches each repo's latest
default-branch commit date from `api.github.com` to show "Last updated",
falling back to `updatedAt` when offline/rate-limited, with a 24h `localStorage`
cache (`pbustos97.repoLastCommit`). Keep repo names in `projects.json` matching
GitHub, since the API path is built from `repo.name`.

## 7. AI Quick Reference

- **Entry points**: `site.js` `initSite` (`site.js:157`) auto-runs on every page
  (DOM-ready guard `site.js:163`); page scripts self-init: `main.js:163`,
  `about.js:71`, `projects.js:485`.
- **Load order matters**: `js/site.js` must precede page scripts (defines
  `fetchJSON`/`escapeHtml`/`getAboutData` globals, no modules/bundler).
- **Shared globals**: `NAV_LINKS`, `fetchJSON`, `escapeHtml`, `getAboutData`,
  `loadProfileHero`; no `export`/`import`, plain browser scripts.
- **State**: `projects.js` module-level `allProjects`, `currentFilter`,
  `currentSearch`, `currentRenderedProjects` (`projects.js:37`-`projects.js:40`)
  and cache constants `GITHUB_API_BASE`/`CACHE_KEY`/`CACHE_TTL_MS`
  (`projects.js:7`-`projects.js:9`) + `localStorage` cache
  (`readCache`/`writeCache`/`isCacheFresh`); `site.js` `_aboutDataPromise` memo
  (`site.js:118`). No other persistent state.
- **DOM contracts (ids/attrs to preserve)**: `mixes-list` (+ optional
  `data-limit`), `hero-title`/`hero-tagline`/`profile-tagline`, `about-content`,
  `projects-grid`/`filter-chips`/`project-search`/`projects-empty`/`projects-error`,
  `data-partial="header|footer"`, per-mix tbody `${id}-tracks`, and the projects
  date-patch hook: `.updated[data-repo-name="..."]` wrapping an `.updated-date`
  span (live dates rewrite that span's `textContent`).
- **Where to extend**: new nav page -> add to `NAV_LINKS` (`site.js:7`) + a
  `data-partial` placeholder; new mix field -> edit `TRACK_COLUMNS`
  (`main.js:8`) and `renderMixTracks`; new language -> `languageColors`
  (`projects.js:14`); live-date behavior -> `fetchLastCommitDate`
  (`projects.js:118`)/`refreshRepoDates` (`projects.js:144`)/cache TTL
  (`projects.js:9`).
- **XSS**: all data-driven interpolation routes through `escapeHtml`.
- **Live dates**: cache-first render + non-blocking `refreshRepoDates()`; sort
  uses local `updatedAt` only; loop bails on rate limit (`X-RateLimit-
  Remaining==='0'` or `403`/`429`) and falls back to `updatedAt`.
- **Not present / do not re-add**: `GITHUB_USERNAME`, the `main.js` dead helpers
  (`essentialColumns`, `formatDate`, `renderMixList`), CSS
  `.list-view`/`.project-topic(s)`/`.hide-mobile`/`footer .nav-link`. (Note:
  `formatDate` in `projects.js:107` is a *new, live* helper — not the removed
  `main.js` one.) `feed.xml` referenced by `index.html` but does not exist.
  `stylesheet.css` legacy/unreferenced.
