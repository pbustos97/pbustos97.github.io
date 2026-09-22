/**
 * Projects page: render GitHub repo cards from data/projects.json.
 * Uses shared fetchJSON from site.js.
 * Fetches live last-commit dates from GitHub API with localStorage cache.
 */

const GITHUB_API_BASE = 'https://api.github.com/repos/pbustos97';
const CACHE_KEY = 'pbustos97.repoLastCommit';
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

// Global state
let allProjects = [];
let currentFilter = 'all';
let currentSearch = '';
let currentRenderedProjects = [];

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
 * Get language color
 */
function getLanguageColor(language) {
  return languageColors[language] || '#8b949e';
}

/**
 * Read the localStorage cache for repo commit dates.
 * Returns an empty object if localStorage is unavailable or cache is corrupt.
 */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

/**
 * Write the cache to localStorage. Silently fails if storage is unavailable.
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
function isCacheFresh(entry) {
  return entry && entry.fetchedAt && (Date.now() - entry.fetchedAt < CACHE_TTL_MS);
}

/**
 * Resolve the display date for a repo: cache (if fresh) → repo.updatedAt fallback.
 * Returns a formatted date string or empty string.
 */
function resolveDate(repo, cache) {
  const cached = cache[repo.name];
  const isoString = (cached && isCacheFresh(cached)) ? cached.date : repo.updatedAt;
  return formatDate(isoString);
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
 * Fetch the latest commit date for a repo from GitHub API.
 * Returns { date: ISO string, rateLimitRemaining: string } or throws.
 */
async function fetchLastCommitDate(repoName) {
  const url = `${GITHUB_API_BASE}/${encodeURIComponent(repoName)}/commits?per_page=1`;
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
  const json = await response.json();

  if (!json || json.length === 0) {
    throw new Error('No commits found');
  }

  const date = json[0].commit.committer.date;
  if (!date) throw new Error('No commit date found');
  return { date, rateLimitRemaining };
}

/**
 * Refresh repo dates from GitHub API, updating the DOM in place.
 * Fetches sequentially, stops on rate limit (0 remaining or 403/429).
 */
async function refreshRepoDates() {
  const cache = readCache();
  let rateLimitWarningShown = false;

  for (let i = 0; i < currentRenderedProjects.length; i++) {
    const repo = currentRenderedProjects[i];
    const cached = cache[repo.name];

    // Skip if cache is fresh
    if (cached && isCacheFresh(cached)) {
      continue;
    }

    try {
      const { date, rateLimitRemaining } = await fetchLastCommitDate(repo.name);

      // Update cache
      cache[repo.name] = { date, fetchedAt: Date.now() };
      writeCache(cache);

      // Update DOM in place (skip silently if repo is filtered out)
      const escapedName = escapeHtml(repo.name);
      const span = document.querySelector(`[data-repo-name="${escapedName}"] .updated-date`);
      if (span) {
        span.textContent = formatDate(date);
      }

      // Check rate limit
      if (rateLimitRemaining === '0') {
        if (!rateLimitWarningShown) {
          console.warn('GitHub API rate limit reached. Stopping date refresh.');
          rateLimitWarningShown = true;
        }
        break;
      }
    } catch (error) {
      // On 403/429, stop the loop
      if (error.message.includes('403') || error.message.includes('429')) {
        if (!rateLimitWarningShown) {
          console.warn('GitHub API rate limit reached. Stopping date refresh.');
          rateLimitWarningShown = true;
        }
        break;
      }
      // Other errors: keep fallback date, continue to next repo
      console.error(`Failed to fetch date for ${repo.name}:`, error.message);
    }
  }
}

/**
 * Render a single project card
 */
function renderProjectCard(repo, index, resolvedDate) {
  const languageColor = getLanguageColor(repo.language);
  const description = repo.description || 'No description available';
  const isFeatured = repo.featured === true;

  const cardClass = `project-card${isFeatured ? ' featured' : ''}`;
  const delay = Math.min(index * 0.05, 0.3);

  const safeName = escapeHtml(repo.name);
  const safeDescription = escapeHtml(description);
  const safeLanguage = escapeHtml(repo.language) || 'Unknown';

  return `
    <article class="${cardClass}" style="animation-delay: ${delay}s">
      ${isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
      <div class="project-card-header">
        <a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer" class="project-name">
          ${safeName}
        </a>
        ${repo.language ? `
          <span class="project-language">
            <span class="language-dot" style="background: ${languageColor}"></span>
            ${safeLanguage}
          </span>
        ` : `<span class="project-language"><span class="language-dot" style="background: #8b949e"></span>${safeLanguage}</span>`}
      </div>
      <p class="project-description">${safeDescription}</p>
      <div class="project-stats">
        <span class="star" title="Stars">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
          </svg>
          ${formatCount(repo.stars)}
        </span>
        <span class="fork" title="Forks">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a.75.75 0 0 1 1.5 0v.878a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75v-.878a.75.75 0 0 1 1.5 0v.878c0 .414-.336.75-.75.75h-4.5a.75.75 0 0 0-.75.75v.878a.75.75 0 0 1-1.5 0v-.878c0-.414.336-.75.75-.75h4.5a.75.75 0 0 0 .75-.75v-.878a.75.75 0 0 1 1.5 0v.878a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75v-.878c0-.414-.336-.75-.75-.75h-4.5a.75.75 0 0 0-.75.75v.878a.75.75 0 0 1-1.5 0v-.878ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm0 2.122a2.25 2.25 0 1 0 1.5 0 2.25 2.25 0 0 0-1.5 0Zm2.5-.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm1.5 2.122a2.25 2.25 0 1 0 1.5 0 2.25 2.25 0 0 0-1.5 0Zm0 2.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z"/>
          </svg>
          ${formatCount(repo.forks)}
        </span>
        ${resolvedDate ? `
        <span class="updated" title="Last updated" data-repo-name="${safeName}">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.5-.25A.75.75 0 0 1 8 4.75v5.5a.75.75 0 0 1-1.5 0v-5.5Zm.75-2.75a.75.75 0 0 0-1.5 0v.01a.75.75 0 0 0 1.5 0Z"/>
          </svg>
          <span class="updated-date">${escapeHtml(resolvedDate)}</span>
        </span>
        ` : ''}
      </div>
    </article>
  `;
}

/**
 * Filter projects based on current filter and search
 */
function filterProjects(projects) {
  return projects.filter(repo => {
    if (currentFilter !== 'all' && repo.language !== currentFilter) {
      return false;
    }

    if (currentSearch) {
      const query = currentSearch.toLowerCase();
      const nameMatch = repo.name.toLowerCase().includes(query);
      const descMatch = repo.description?.toLowerCase().includes(query);
      const langMatch = repo.language?.toLowerCase().includes(query);
      if (!nameMatch && !descMatch && !langMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort projects: featured first, then by stars, then by updated date
 */
function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

/**
 * Render all project cards
 */
function renderProjects(projects) {
  const container = document.getElementById('projects-grid');
  const emptyContainer = document.getElementById('projects-empty');
  const errorContainer = document.getElementById('projects-error');

  if (!container) return;

  // Update count
  const sectionHeader = document.querySelector('.section-header .count');
  if (sectionHeader) {
    sectionHeader.textContent = `(${projects.length})`;
  }

  if (projects.length === 0 && allProjects.length > 0) {
    container.style.display = 'none';
    if (emptyContainer) {
      emptyContainer.style.display = 'block';
    }
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
    return;
  }

  if (allProjects.length === 0) {
    return;
  }

  container.style.display = 'grid';
  if (emptyContainer) {
    emptyContainer.style.display = 'none';
  }
  if (errorContainer) {
    errorContainer.style.display = 'none';
  }

  const sortedProjects = sortProjects(projects);
  const cache = readCache();
  container.innerHTML = sortedProjects
    .map((repo, index) => renderProjectCard(repo, index, resolveDate(repo, cache)))
    .join('');

  // Store for later refresh
  currentRenderedProjects = sortedProjects;
}

/**
 * Update available filter chips based on loaded projects.
 * Event delegation on #filter-chips handles clicks — no per-chip binding.
 */
function updateFilterChips(projects) {
  const chipContainer = document.getElementById('filter-chips');
  if (!chipContainer) return;

  // Get unique languages
  const languages = new Set();
  projects.forEach(repo => {
    if (repo.language) {
      languages.add(repo.language);
    }
  });

  // Sort languages by count
  const langCounts = {};
  projects.forEach(repo => {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    }
  });

  const sortedLangs = Array.from(languages).sort((a, b) =>
    (langCounts[b] || 0) - (langCounts[a] || 0)
  );

  // Preserve the "All" chip as the first chip.
  const allChip = chipContainer.querySelector('[data-filter="all"]');
  chipContainer.innerHTML = '';
  if (allChip) chipContainer.appendChild(allChip);

  sortedLangs.forEach(lang => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    chip.dataset.filter = lang;
    chip.textContent = `${lang} (${langCounts[lang]})`;
    chipContainer.appendChild(chip);
  });

  // Restore active state after rebuild.
  syncActiveChip();
}

/**
 * Sync the active class on the chip matching currentFilter.
 */
function syncActiveChip() {
  const chipContainer = document.getElementById('filter-chips');
  if (!chipContainer) return;
  chipContainer.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === currentFilter);
  });
}

/**
 * Attach filter chip click handler via event delegation on the container.
 * Called once during init.
 */
function attachChipListeners() {
  const chipContainer = document.getElementById('filter-chips');
  if (!chipContainer) return;

  chipContainer.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip || !chipContainer.contains(chip)) return;

    currentFilter = chip.dataset.filter;
    syncActiveChip();
    const filtered = filterProjects(allProjects);
    renderProjects(filtered);
  });
}

/**
 * Attach search input handler
 */
function attachSearchHandler() {
  const searchInput = document.getElementById('project-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    const filtered = filterProjects(allProjects);
    renderProjects(filtered);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      currentSearch = '';
      const filtered = filterProjects(allProjects);
      renderProjects(filtered);
    }
  });
}

/**
 * Show error state with fallback message
 */
function showError() {
  const container = document.getElementById('projects-grid');
  const errorContainer = document.getElementById('projects-error');
  const emptyContainer = document.getElementById('projects-empty');

  if (container) {
    container.style.display = 'none';
  }

  if (errorContainer) {
    errorContainer.style.display = 'block';
  }

  if (emptyContainer) {
    emptyContainer.style.display = 'none';
  }
}

/**
 * Initialize projects page
 */
async function initProjects() {
  const container = document.getElementById('projects-grid');
  const chipContainer = document.getElementById('filter-chips');
  if (!container) return;

  try {
    const data = await fetchJSON('data/projects.json');
    allProjects = data.projects || [];
    renderProjects(allProjects);

    // Initialize filter chips + single delegated listener.
    if (chipContainer) {
      updateFilterChips(allProjects);
      attachChipListeners();
    }

    // Initialize search
    attachSearchHandler();

    // Refresh dates from GitHub API (non-blocking)
    refreshRepoDates();

  } catch (error) {
    console.error('Failed to load projects:', error);
    showError();
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}
