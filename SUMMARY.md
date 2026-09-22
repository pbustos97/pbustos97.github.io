# SUMMARY.md — Live GitHub Repos + Home Spotlight (branch `feat/live-github-repos`)

## Overview

- Static GitHub Pages personal site (DJ mixes + portfolio). Plain HTML/CSS/JS,
  no build step, no frameworks, all rendering client-side; must be served over
  HTTP (`fetch` fails on `file://`).
- This change set replaces the old manual `data/projects.json` snapshot +
  per-repo commit-date API calls with a **single shared live-repos layer** in
  `js/site.js` (`getProjects` / `fetchReposFromGitHub`), consumed by both
  `projects.html` and a **new "Latest Project" spotlight** on `index.html`
  rendered by the new `js/home.js`.
- Landing page renamed "Sessions" → "Home" everywhere: nav label
  (`js/site.js:8`), `<title>` (`index.html:7`), hero `h1` (`index.html:17`),
  `heroTitle` in `data/about.json:5`, and the meta description
  (`index.html:6`).
- Dead code removed: `data/projects.json` snapshot pipeline
  (`fetchLastCommitDate`, `resolveDate`, `pbustos97.repoLastCommit` cache),
  featured-badge logic/sorting, and per-repo API calls. Sort is now
  **recency-only** (`updatedAt` desc).
- **Pending**: `data/projects.json` still exists on disk (nothing in code
  references it — verified by grep; only the file itself contains its own
  `featured` fields). Deletion + HTTP-server verification + commit were
  blocked by the sandbox.

## Files

| Path | Status | Purpose |
|---|---|---|
| `js/site.js` | modified | Shared chrome + helpers; NEW live-repos layer (`GITHUB_REPOS_URL`, `fetchReposFromGitHub`, `parseLinkHeader`, `getProjects`, localStorage cache); nav label "Home" (`site.js:8`) |
| `js/home.js` | **new** | Home-page "Latest Project" spotlight: latest-first, random shuffle, refresh-stable |
| `js/projects.js` | modified | Now renders from `getProjects()`; removed `refreshRepoDates()`, `data-repo-name` patching, `currentRenderedProjects`, featured badges, per-repo API calls; recency-only sort |
| `index.html` | modified | Title/hero "Home"; NEW `#spotlight` section with `#spotlight-project` + `#spotlight-shuffle` (`index.html:21-29`); loads `js/home.js` (`index.html:46`) |
| `projects.html` | unchanged | Grid/chips/search/error/empty DOM contracts (`projects.html:27-60`) |
| `styles/main.css` | modified | Removed `.project-card.featured` + `::before` + `.featured-badge` (main + 640px media query); added `.spotlight-button` (`main.css:519-554`) and `.spotlight-project-card` (`main.css:556-574`) on existing design tokens |
| `data/about.json` | modified | `profile.heroTitle` → "Home" (`about.json:5`) |
| `data/projects.json` | **dead, pending deletion** | Old manual repo snapshot; zero code references remain |
| `AGENTS.md` | modified | Worktree copy documents the live data flow (endpoint, `pbustos97.repos` cache, stale-while-revalidate) |
| `js/main.js` | unchanged (context) | Mix loading + Traaktor parsing; compact vs full modes via `data-limit` |
| `SUMMARY.md` | overwritten | This file |

## Key Functions / Classes

**`js/site.js` — shared live-repos layer**
- `GITHUB_REPOS_URL` (`site.js:120`) — `https://api.github.com/users/pbustos97/repos?sort=updated&per_page=100&type=owner` (`type=owner` excludes forks). `CACHE_KEY = 'pbustos97.repos'` (`site.js:121`), `CACHE_TTL_MS = 24h` (`site.js:122`).
- `fetchReposFromGitHub()` (`site.js:217`) — `async () => Array<{name, description, language, stars, forks, url, updatedAt}>`. Follows Link-header pagination (`MAX_PAGES = 5`, `site.js:221`); sends `Accept: application/vnd.github+json`; throws `GitHub API error: HTTP <status>` on non-ok; stops on non-array/empty page. Maps `updatedAt = pushed_at || updated_at` (`site.js:244`), `stars/forks` default to 0.
- `parseLinkHeader(linkHeader)` (`site.js:261`) — returns the `rel="next"` URL from a Link header, or `null`.
- `getProjects({ onRefresh } = {})` (`site.js:282`) — stale-while-revalidate contract:
  - Fresh cache → resolve immediately, no network (`site.js:286-288`).
  - Stale cache → resolve with stale data, fire-and-forget background refresh; on success write cache + call `onRefresh(freshRepos)`; on failure keep stale silently (`console.warn`, `site.js:301-304`).
  - No cache → await fetch; throws on failure so callers can show error state (`site.js:309-312`).
- `readCache()` (`site.js:173`) / `writeCache()` (`site.js:188`) / `isCacheFresh()` (`site.js:199`) — localStorage cache shape `{ fetchedAt: number, repos: [] }`; corrupt/missing/shape-mismatched cache returns `null`; write failures (private mode/quota) silently ignored.
- Shared display helpers used by both consumers: `escapeHtml` (`site.js:104`), `formatDate` (`site.js:206`, `en-US` "Mon YYYY"), `getLanguageColor` (`site.js:152`), `formatCount` (`site.js:159`, K/M suffixes).

**`js/home.js` — spotlight**
- `initHome()` (`home.js:117`) — finds `#spotlight-project` + `#spotlight-shuffle`; calls `getProjects({ onRefresh })`; empty list → `No projects found`; catch → `Failed to load project` + button disabled.
- `pickLatest()` (`home.js:77`) — index of most recently updated repo (localeCompare on `updatedAt` desc).
- `pickRandom()` (`home.js:87`) — do/while random index ≠ current; returns current when ≤1 repo.
- `showSpotlight(index)` (`home.js:66`) — sets `spotlightIndex` + `spotlightRepoName`, injects `renderSpotlightCard` output.
- `onRefresh()` (`home.js:100`) — after background refresh, re-renders the SAME repo found by `spotlightRepoName` in the fresh array (stability across shuffle state), falling back to `pickLatest()` if the repo vanished.
- `renderSpotlightCard(repo)` (`home.js:30`) — single `article.project-card.spotlight-project-card`; all interpolation escaped; icons are static inline SVG constants (`home.js:9-20`).

**`js/projects.js` — projects page**
- `initProjects()` (`projects.js:270`) — `getProjects({ onRefresh: renderProjects })` → `allProjects = repos` → render, build chips, attach delegated chip + search/Escape handlers; catch → `showError()`.
- `renderProjects(projects)` (`projects.js:99`) — updates the `(count)` header (`projects.js:107-110`); hides grid + shows empty state both when filters exclude everything (`projects.js:112`) and when the dataset itself is empty (`projects.js:123`); otherwise sorts and renders cards.
- `sortProjects` (`projects.js:90`) — `new Date(b.updatedAt) - new Date(a.updatedAt)`, recency only (no featured/stars tie-break).
- `filterProjects` (`projects.js:67`) — language chip + case-insensitive search over name/description/language.
- `updateFilterChips` (`projects.js:152`) / `syncActiveChip` (`projects.js:196`) / `attachChipListeners` (`projects.js:208`) — chips rebuilt sorted by count, "All" preserved, one delegated click listener.

**`js/main.js` (unchanged context)** — `loadMixes()` (`main.js:102`) reads `data-limit` (`main.js:106-108`); compact mode sorts by `date` desc and slices without fetching track tables; full mode fetches + parses `mixes/2024/<id>.html` via `parseMixFile` (`main.js:10`) and `TRACK_COLUMNS` (`main.js:8`).

## Code Flow

1. Browser loads a page; `js/site.js` runs first and auto-inits chrome: `initSite` (`site.js:358`) → header/footer injected into `data-partial` placeholders + `loadProfileHero` (`site.js:331`) fills `#hero-title`/`#hero-tagline` from `data/about.json` (fallback tagline on error).
2. **Home spotlight** (`index.html:44-46` loads site.js → main.js → home.js): `initHome` (`home.js:117`) → `getProjects` (`site.js:282`). Fresh cache renders instantly; stale renders stale then refreshes; no cache awaits the API.
3. On render: `pickLatest()` → `showSpotlight(index)` → `renderSpotlightCard` HTML into `#spotlight-project` (`index.html:26`). Shuffle click → `showSpotlight(pickRandom())` (`home.js:137`); button disabled when <2 repos (`home.js:138-140`).
4. Background refresh success → home.js wrapper swaps `spotlightProjects` to fresh data and re-shows the same repo by name (`home.js:123-126` → `home.js:100-112`).
5. **Projects page** (`projects.html:66-67` loads site.js → projects.js): `initProjects` (`projects.js:270`) → `getProjects` → `allProjects` → `renderProjects` (skeletons in `projects.html:38-54` replaced on first render) → chips + search wired.
6. User filters/searches → `filterProjects(allProjects)` → `renderProjects(filtered)` (chip click `projects.js:212-220`, input `projects.js:230-234`, Escape clears `projects.js:236-243`).
7. Fetch path inside `getProjects`: `fetchReposFromGitHub` (`site.js:217`) loops pages via `parseLinkHeader` (`site.js:250`) up to 5 pages, transforms each repo, then result is written to `localStorage['pbustos97.repos']` as `{ fetchedAt, repos }` (`site.js:295-296`, `site.js:310-311`).
8. Failure with no cache: throw → `initHome` catch shows `Failed to load project` (`home.js:142-146`); `initProjects` catch shows `#projects-error` (`projects.js:289-292`).
9. **Mixes** (unchanged): `loadMixes` (`main.js:102`) renders 3 compact recent cards on index (`data-limit="3"`, `index.html:36`); full track tables only on `mixes.html`.

## Dependencies

- **External**: GitHub REST API `api.github.com/users/pbustos97/repos` (unauthenticated → 60 req/hr/IP limit; mitigated by 24h localStorage cache + max 5 pages). No frameworks, no build tooling, no npm deps.
- **Browser APIs**: `fetch`, `localStorage`, `DOMParser`, `document`/`location`, `Intl` date formatting via `toLocaleDateString`.
- **Cross-file (plain globals, no modules)**: `home.js` and `projects.js` depend on `site.js` globals (`getProjects`, `escapeHtml`, `formatDate`, `getLanguageColor`, `formatCount`); `main.js` depends on `fetchJSON`/`escapeHtml`. Load order is mandatory: site.js before every page script.
- **Removed dependencies**: `data/projects.json` (no longer fetched by anything; file deletion pending), `pbustos97.repoLastCommit` cache, `fetchLastCommitDate`/`resolveDate` helpers.
- **Out of scope but referenced**: `feed.xml` (`index.html:10`) still does not exist; `stylesheet.css` still legacy/unreferenced.

## AI Quick Reference

- **Entry points**: `site.js:364-368` auto-init on every page; `home.js:149-153`; `projects.js:296-300`; `main.js` loadMixes auto-run; `about.js` unchanged.
- **Repo data contract**: `getProjects({onRefresh})` at `site.js:282` is the ONLY repo fetcher. Item shape: `{name, description (nullable), language (nullable), stars, forks, url, updatedAt}`; `updatedAt = pushed_at || updated_at` (`site.js:244`). Never call the GitHub API from page scripts.
- **Cache**: key `pbustos97.repos`, shape `{fetchedAt, repos}`, TTL 24h (`site.js:120-122`); guards `readCache`/`isCacheFresh` (`site.js:173`, `site.js:199`). Clear via `localStorage.removeItem('pbustos97.repos')`.
- **Pagination**: `fetchReposFromGitHub` (`site.js:217`) follows `rel="next"` via `parseLinkHeader` (`site.js:261`), hard cap `MAX_PAGES=5`.
- **State**: `site.js` — `_aboutDataPromise` memo (`site.js:319`). `home.js` — `spotlightProjects` / `spotlightIndex` / `spotlightRepoName` (`home.js:23-25`). `projects.js` — `allProjects` / `currentFilter` / `currentSearch` (`projects.js:7-9`).
- **DOM contracts to preserve**: `spotlight` / `spotlight-project` / `spotlight-shuffle` (`index.html:21-29`), `mixes-list` + `data-limit`, `hero-title` / `hero-tagline`, `projects-grid` / `filter-chips` / `project-search` / `projects-empty` / `projects-error` / `.section-header .count`, `data-partial="header|footer"`; nav label "Home" via `NAV_LINKS[0]` (`site.js:8`) + `heroTitle` (`about.json:5`) + `<title>`/`h1` (`index.html:7,17`) — rename touches all four.
- **Where to extend**: cache TTL / pagination / repo field mapping → `site.js:120-255`; spotlight behavior → `home.js`; filter/sort UI → `projects.js`; new repo field → transform in `fetchReposFromGitHub` (`site.js:236-246`) then renderers.
- **Quirks / gotchas**:
  - `projects.js` passes `renderProjects` directly as `onRefresh` (`projects.js:276`): a background refresh re-renders the RAW fresh list — active filter/search are NOT re-applied, `allProjects` is NOT updated, and chips are NOT rebuilt by the callback (only by `initProjects`). Home avoids this via its name-stable wrapper (`home.js:123-126`).
  - Change notes mention an `aria-live` region on the spotlight — **none exists on disk** (grep: zero `aria-live` matches in repo); unknown whether intended/dropped.
  - `data/projects.json` still on disk, unreferenced — delete it as a pending step.
  - Empty-vs-filtered disambiguation in `renderProjects` relies on `allProjects.length` (`projects.js:112`, `projects.js:123`) — keep both state reads in sync.
  - Home shuffle button disabled only when <2 repos (`home.js:138`); `pickRandom` no-ops at ≤1 (`home.js:88`).
- **XSS**: every dynamic interpolation routes through `escapeHtml` (`site.js:104`) in `renderSpotlightCard`, `renderProjectCard`, and `url` attributes.
- **Do not re-add**: `data/projects.json` fetch path, `fetchLastCommitDate`/`resolveDate`/`pbustos97.repoLastCommit`, featured badges (`renderProjects`/`sortProjects` are recency-only; CSS `.featured-badge`/`.project-card.featured` deleted from `main.css`).
- **Verification status**: uncommitted on `feat/live-github-repos`; browser verification over `python -m http.server 8000` was blocked by the sandbox — still pending, along with the `data/projects.json` deletion and commit.
