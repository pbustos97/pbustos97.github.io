/**
 * Shared site module.
 * Single source of truth for page chrome (header/footer) and shared helpers.
 * Injected into every page via <div data-partial="header"> / <div data-partial="footer">.
 */

const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'mixes.html', label: 'Mixes' },
  { href: 'projects.html', label: 'Projects' },
  { href: 'about.html', label: 'About' },
  { href: 'https://github.com/pbustos97', label: 'GitHub', external: true }
];

/**
 * Derive which nav link is "active" from the current URL.
 */
function getActivePage() {
  const pathname = window.location.pathname;
  const basename = pathname.split('/').pop() || 'index.html';
  // Normalize: bare "/" or "" -> index.html
  return basename === '' ? 'index.html' : basename;
}

/**
 * Build the header HTML.
 */
function buildHeader() {
  const active = getActivePage();
  const linksHtml = NAV_LINKS.map(link => {
    const isActive = !link.external && link.href === active;
    const activeClass = isActive ? ' class="active"' : '';
    if (link.external) {
      return `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.label}</a>`;
    }
    return `<a href="${link.href}"${activeClass}>${link.label}</a>`;
  }).join('\n        ');

  return `
    <header>
      <div class="container">
        <a href="index.html" class="logo">Patrick Bustos</a>
        <nav>
        ${linksHtml}
        </nav>
      </div>
    </header>
  `.trim();
}

/**
 * Build the footer HTML.
 */
function buildFooter() {
  const linksHtml = NAV_LINKS.map(link => {
    if (link.external) {
      return `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.label}</a>`;
    }
    return `<a href="${link.href}">${link.label}</a>`;
  }).join('\n      ');

  return `
    <footer>
      <div class="container">
      ${linksHtml}
      </div>
    </footer>
  `.trim();
}

/**
 * Inject header into any <div data-partial="header"> placeholder.
 */
function renderHeader() {
  const placeholder = document.querySelector('[data-partial="header"]');
  if (!placeholder) return;
  placeholder.outerHTML = buildHeader();
}

/**
 * Inject footer into any <div data-partial="footer"> placeholder.
 */
function renderFooter() {
  const placeholder = document.querySelector('[data-partial="footer"]');
  if (!placeholder) return;
  placeholder.outerHTML = buildFooter();
}

/**
 * Shared JSON fetch wrapper. Throws on non-ok responses or parse failure.
 */
async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * HTML-escape user data interpolated into templates.
 * Prevents XSS when rendering user-provided content.
 */
function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------------------------------------------------------------------------
 * Shared GitHub project helpers.
 * Used by projects.js (projects page) and home.js (landing-page spotlight).
 * Fetches full repo list from GitHub API with 24h localStorage cache.
 * ------------------------------------------------------------------------- */

const GITHUB_REPOS_URL = 'https://api.github.com/users/pbustos97/repos?sort=updated&per_page=100&type=owner';
const CACHE_KEY = 'pbustos97.repos';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Language colors mapping (matching GitHub's color scheme)
 */
const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  SCSS: '#c6538c',
  Other: '#8b949e'
};

/**
 * Get language color
 */
function getLanguageColor(language) {
  return languageColors[language] || '#8b949e';
}

/**
 * Format count for display
 */
function formatCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

/**
 * Read the localStorage cache for repos.
 * Returns null if localStorage is unavailable or cache is corrupt/missing.
 */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.repos)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * Write the repos cache to localStorage. Silently fails if storage is unavailable.
 */
function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // Ignore — private browsing or quota exceeded
  }
}

/**
 * Check if a cache entry is still fresh (within TTL).
 */
function isCacheFresh(cache) {
  return cache && cache.fetchedAt && (Date.now() - cache.fetchedAt < CACHE_TTL_MS);
}

/**
 * Format an ISO date string for display.
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * Fetch the full repo list from GitHub API, following Link header pagination.
 * Returns transformed array of { name, description, language, stars, forks, url, updatedAt }.
 */
async function fetchReposFromGitHub() {
  const repos = [];
  let url = GITHUB_REPOS_URL;
  let pageCount = 0;
  const MAX_PAGES = 5;

  while (url && pageCount < MAX_PAGES) {
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: HTTP ${response.status}`);
    }

    const pageRepos = await response.json();
    if (!Array.isArray(pageRepos) || pageRepos.length === 0) break;

    // Transform each repo
    for (const repo of pageRepos) {
      repos.push({
        name: repo.name,
        description: repo.description, // may be null
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        url: repo.html_url,
        updatedAt: repo.pushed_at || repo.updated_at
      });
    }

    // Parse Link header for next page
    const linkHeader = response.headers.get('Link');
    url = parseLinkHeader(linkHeader);
    pageCount++;
  }

  return repos;
}

/**
 * Parse Link header to extract the 'next' URL.
 * Returns null if no next link found.
 */
function parseLinkHeader(linkHeader) {
  if (!linkHeader) return null;
  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Shared async function to get projects with stale-while-revalidate behavior.
 * - Fresh cache → resolve immediately with cached repos (no network)
 * - Stale cache → resolve immediately with stale repos, then fetch in background;
 *   on success write cache and call onRefresh(freshRepos); on failure keep stale silently
 * - No cache → await the fetch; on failure THROW so callers can show error state
 *
 * @param {Object} options
 * @param {Function} [options.onRefresh] - callback invoked with fresh repos after background refresh
 * @returns {Promise<Array>} - resolves with repos (cached or fresh)
 */
async function getProjects({ onRefresh } = {}) {
  const cache = readCache();

  // Fresh cache → resolve immediately
  if (cache && isCacheFresh(cache)) {
    return cache.repos;
  }

  // Stale cache → resolve immediately with stale, then refresh in background
  if (cache) {
    // Fire and forget background refresh
    fetchReposFromGitHub()
      .then(freshRepos => {
        const newCache = { fetchedAt: Date.now(), repos: freshRepos };
        writeCache(newCache);
        if (typeof onRefresh === 'function') {
          onRefresh(freshRepos);
        }
      })
      .catch(error => {
        // Keep stale silently
        console.warn('Background refresh failed, keeping stale cache:', error.message);
      });
    return cache.repos;
  }

  // No cache → await the fetch
  const repos = await fetchReposFromGitHub();
  const newCache = { fetchedAt: Date.now(), repos };
  writeCache(newCache);
  return repos;
}

/**
 * Memoized about.json fetch. Returns a cached promise so multiple callers
 * share a single network request.
 */
let _aboutDataPromise = null;
function getAboutData() {
  if (!_aboutDataPromise) {
    _aboutDataPromise = fetchJSON('data/about.json');
  }
  return _aboutDataPromise;
}

/**
 * Load profile hero data from data/about.json and fill known elements.
 * No-ops safely when elements are absent.
 */
async function loadProfileHero() {
  const heroTitle = document.getElementById('hero-title');
  const heroTagline = document.getElementById('hero-tagline');
  const profileTagline = document.getElementById('profile-tagline');

  // Nothing to do if no relevant elements exist on this page.
  if (!heroTitle && !heroTagline && !profileTagline) return;

  const FALLBACK_TAGLINE = 'Software Engineer passionate about building tools and crafting sounds.';

  try {
    const data = await getAboutData();
    const profile = data && data.profile;
    if (!profile) throw new Error('about.json missing profile');

    if (heroTitle) heroTitle.textContent = profile.heroTitle || heroTitle.textContent;
    if (heroTagline) heroTagline.textContent = profile.tagline || FALLBACK_TAGLINE;
    if (profileTagline) profileTagline.textContent = profile.tagline || FALLBACK_TAGLINE;
  } catch (error) {
    console.error('Failed to load profile:', error);
    if (heroTagline) heroTagline.textContent = FALLBACK_TAGLINE;
  }
}

/**
 * Initialize shared partials + hero. Safe to run on any page.
 */
function initSite() {
  renderHeader();
  renderFooter();
  loadProfileHero();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite);
} else {
  initSite();
}
