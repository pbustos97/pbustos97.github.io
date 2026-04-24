const GITHUB_USERNAME = 'pbustos97';

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

/**
 * Fetch repositories from local data file
 */
async function fetchRepositories() {
  try {
    const response = await fetch('data/projects.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    throw error;
  }
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
 * Get language color
 */
function getLanguageColor(language) {
  return languageColors[language] || '#8b949e';
}

/**
 * Render a single project card
 */
function renderProjectCard(repo, index) {
  const languageColor = getLanguageColor(repo.language);
  const description = repo.description || 'No description available';
  const isFeatured = repo.featured === true;
  
  let updatedDate = '';
  if (repo.updatedAt) {
    try {
      updatedDate = new Date(repo.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });
    } catch (e) {
      updatedDate = repo.updatedAt;
    }
  }
  
  const cardClass = `project-card${isFeatured ? ' featured' : ''}`;
  const delay = Math.min(index * 0.05, 0.3);
  
  return `
    <article class="${cardClass}" style="animation-delay: ${delay}s">
      ${isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
      <div class="project-card-header">
        <a href="${repo.url}" target="_blank" rel="noopener noreferrer" class="project-name">
          ${repo.name}
        </a>
        ${repo.language ? `
          <span class="project-language">
            <span class="language-dot" style="background: ${languageColor}"></span>
            ${repo.language}
          </span>
        ` : '<span class="project-language"><span class="language-dot" style="background: #8b949e"></span>Unknown</span>'}
      </div>
      <p class="project-description">${description}</p>
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
        ${updatedDate ? `
        <span class="updated" title="Last updated">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.5-.25A.75.75 0 0 1 8 4.75v5.5a.75.75 0 0 1-1.5 0v-5.5Zm.75-2.75a.75.75 0 0 0-1.5 0v.01a.75.75 0 0 0 1.5 0Z"/>
          </svg>
          ${updatedDate}
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
    // Filter by language
    if (currentFilter !== 'all' && repo.language !== currentFilter) {
      return false;
    }
    
    // Filter by search query
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
  container.innerHTML = sortedProjects.map((repo, index) => renderProjectCard(repo, index)).join('');
}

/**
 * Update available filter chips based on loaded projects
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
  
  // Rebuild chips (keep "All" as first)
  const allChip = chipContainer.querySelector('[data-filter="all"]');
  chipContainer.innerHTML = '';
  chipContainer.appendChild(allChip);
  
  sortedLangs.forEach(lang => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    chip.dataset.filter = lang;
    chip.textContent = `${lang} (${langCounts[lang]})`;
    chipContainer.appendChild(chip);
  });
  
  // Reattach event listeners
  attachChipListeners();
}

/**
 * Attach filter chip click handlers
 */
function attachChipListeners() {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      // Update active state
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Update filter and re-render
      currentFilter = chip.dataset.filter;
      const filtered = filterProjects(allProjects);
      renderProjects(filtered);
    });
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
    allProjects = await fetchRepositories();
    renderProjects(allProjects);
    
    // Initialize filter chips
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