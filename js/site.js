/**
 * Shared site module.
 * Single source of truth for page chrome (header/footer) and shared helpers.
 * Injected into every page via <div data-partial="header"> / <div data-partial="footer">.
 */

const NAV_LINKS = [
  { href: 'index.html', label: 'Sessions' },
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
