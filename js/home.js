/**
 * Home page: render a "Latest Project" spotlight card.
 * - Shows the most recently updated repo (by updatedAt) first.
 * - The "Show another" button (id="spotlight-shuffle") swaps in a random repo.
 * - Reuses shared helpers from site.js: escapeHtml, getLanguageColor,
 *   formatCount, formatDate, getProjects.
 */

const STAR_ICON = `
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
  </svg>`;
const FORK_ICON = `
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a.75.75 0 0 1 1.5 0v.878a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75v-.878a.75.75 0 0 1 1.5 0v.878c0 .414-.336.75-.75.75h-4.5a.75.75 0 0 0-.75.75v.878a.75.75 0 0 1-1.5 0v-.878c0-.414.336-.75.75-.75h4.5a.75.75 0 0 0 .75-.75v-.878a.75.75 0 0 1 1.5 0v.878a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75v-.878c0-.414-.336-.75-.75-.75h-4.5a.75.75 0 0 0-.75.75v.878a.75.75 0 0 1-1.5 0v-.878ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm0 2.122a2.25 2.25 0 1 0 1.5 0 2.25 2.25 0 0 0-1.5 0Zm2.5-.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm1.5 2.122a2.25 2.25 0 1 0 1.5 0 2.25 2.25 0 0 0-1.5 0Zm0 2.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z"/>
  </svg>`;
const UPDATED_ICON = `
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.5-.25A.75.75 0 0 1 8 4.75v5.5a.75.75 0 0 1-1.5 0v-5.5Zm.75-2.75a.75.75 0 0 0-1.5 0v.01a.75.75 0 0 0 1.5 0Z"/>
  </svg>`;

// Global state
let spotlightProjects = [];
let spotlightIndex = -1;
let spotlightRepoName = null;

/**
 * Render a single spotlight card for the given repo.
 */
function renderSpotlightCard(repo) {
  const languageColor = getLanguageColor(repo.language);
  const description = repo.description || 'No description available';
  const safeName = escapeHtml(repo.name);
  const safeDescription = escapeHtml(description);
  const safeLanguage = escapeHtml(repo.language) || 'Unknown';
  const resolvedDate = formatDate(repo.updatedAt);

  return `
    <article class="project-card spotlight-project-card">
      <div class="project-card-header">
        <a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer" class="project-name">
          ${safeName}
        </a>
        <span class="project-language">
          <span class="language-dot" style="background: ${languageColor}"></span>
          ${safeLanguage}
        </span>
      </div>
      <p class="project-description">${safeDescription}</p>
      <div class="project-stats">
        <span class="star" title="Stars">${STAR_ICON}${formatCount(repo.stars)}</span>
        <span class="fork" title="Forks">${FORK_ICON}${formatCount(repo.forks)}</span>
        ${resolvedDate ? `
        <span class="updated" title="Last updated">
          ${UPDATED_ICON}<span class="updated-date">${escapeHtml(resolvedDate)}</span>
        </span>
        ` : ''}
      </div>
    </article>
  `;
}

/**
 * Show a repo in the spotlight container.
 */
function showSpotlight(index) {
  const container = document.getElementById('spotlight-project');
  if (!container) return;
  spotlightIndex = index;
  spotlightRepoName = spotlightProjects[index]?.name || null;
  container.innerHTML = renderSpotlightCard(spotlightProjects[index]);
}

/**
 * Pick the most recently updated repo (updatedAt descending).
 */
function pickLatest() {
  const sorted = [...spotlightProjects].sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
  return spotlightProjects.indexOf(sorted[0]);
}

/**
 * Pick a random repo, avoiding the one currently shown when possible.
 */
function pickRandom() {
  if (spotlightProjects.length <= 1) return spotlightIndex;
  let index;
  do {
    index = Math.floor(Math.random() * spotlightProjects.length);
  } while (index === spotlightIndex);
  return index;
}

/**
 * Re-render the currently shown spotlight with fresh data (don't reset to latest).
 * Finds the current repo by name in the fresh array; falls back to pickLatest if vanished.
 */
function onRefresh() {
  if (spotlightProjects.length === 0) return;
  let newIndex = -1;
  if (spotlightRepoName) {
    newIndex = spotlightProjects.findIndex(r => r.name === spotlightRepoName);
  }
  if (newIndex < 0) {
    newIndex = pickLatest();
  }
  if (newIndex >= 0 && newIndex < spotlightProjects.length) {
    showSpotlight(newIndex);
  }
}

/**
 * Initialize the home page spotlight section.
 */
async function initHome() {
  const container = document.getElementById('spotlight-project');
  const shuffleButton = document.getElementById('spotlight-shuffle');
  if (!container) return;

  try {
    const repos = await getProjects({ onRefresh: (freshRepos) => {
      spotlightProjects = freshRepos;
      onRefresh();
    }});
    spotlightProjects = repos;

    if (spotlightProjects.length === 0) {
      container.innerHTML = '<div class="empty-state">No projects found</div>';
      return;
    }

    showSpotlight(pickLatest());

    if (shuffleButton) {
      shuffleButton.addEventListener('click', () => showSpotlight(pickRandom()));
      if (spotlightProjects.length < 2) {
        shuffleButton.disabled = true;
      }
    }
  } catch (error) {
    console.error('Failed to load spotlight project:', error);
    container.innerHTML = '<div class="empty-state">Failed to load project</div>';
    if (shuffleButton) shuffleButton.disabled = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHome);
} else {
  initHome();
}
