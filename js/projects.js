/**
 * Projects page: render GitHub repo cards from live GitHub API via shared getProjects().
 * Uses shared helpers (language colors, formatDate) from site.js.
 */

// Global state
let allProjects = [];
let currentFilter = 'all';
let currentSearch = '';

/**
 * Render a single project card
 */
function renderProjectCard(repo, index) {
  const languageColor = getLanguageColor(repo.language);
  const description = repo.description || 'No description available';
  const delay = Math.min(index * 0.05, 0.3);

  const safeName = escapeHtml(repo.name);
  const safeDescription = escapeHtml(description);
  const safeLanguage = escapeHtml(repo.language) || 'Unknown';
  const resolvedDate = formatDate(repo.updatedAt);

  return `
    <article class="project-card" style="animation-delay: ${delay}s">
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
        <span class="updated" title="Last updated">
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
 * Sort projects by updatedAt descending (recency only)
 */
function sortProjects(projects) {
  return [...projects].sort((a, b) =>
    new Date(b.updatedAt) - new Date(a.updatedAt)
  );
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
    container.style.display = 'none';
    if (emptyContainer) {
      emptyContainer.style.display = 'block';
    }
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
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
  container.innerHTML = sortedProjects
    .map((repo, index) => renderProjectCard(repo, index))
    .join('');
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
    // Background refresh handler: update state, rebuild chips, re-apply filters
    const onRefresh = (freshRepos) => {
      allProjects = freshRepos;
      updateFilterChips(allProjects);
      renderProjects(filterProjects(allProjects));
    };

    const repos = await getProjects({ onRefresh });
    allProjects = repos;
    renderProjects(allProjects);

    // Initialize filter chips + single delegated listener.
    if (chipContainer) {
      updateFilterChips(allProjects);
      attachChipListeners();
    }

    // Initialize search
    attachSearchHandler();

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
