/**
 * About page: render Background + Contact sections from data/about.json.
 * Uses the shared fetchJSON and getAboutData from site.js.
 */

function renderAboutSections(data) {
  const backgroundRows = (data.background || [])
    .map(item => `
            <tr>
              <td><strong>${escapeHtml(item.label)}</strong></td>
              <td>${escapeHtml(item.value)}</td>
            </tr>`)
    .join('');

  const contactRows = (data.contact || [])
    .map(item => {
      const valueHtml = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.value)}</a>`
        : escapeHtml(item.value);
      return `
            <tr>
              <td><strong>${escapeHtml(item.label)}</strong></td>
              <td>${valueHtml}</td>
            </tr>`;
    })
    .join('');

  return `
    <section class="mix-section">
      <div class="mix-header">
        <h2>Background</h2>
      </div>
      <div class="mix-scroll">
        <table>
          <tbody>${backgroundRows}
          </tbody>
        </table>
      </div>
    </section>
    <section class="mix-section">
      <div class="mix-header">
        <h2>Contact</h2>
      </div>
      <div class="mix-scroll">
        <table>
          <tbody>${contactRows}
          </tbody>
        </table>
      </div>
    </section>
  `.trim();
}

async function loadAbout() {
  const content = document.getElementById('about-content');
  const profileTagline = document.getElementById('profile-tagline');
  if (!content) return;

  try {
    const data = await getAboutData();
    if (profileTagline && data.profile && data.profile.tagline) {
      profileTagline.textContent = data.profile.tagline;
    }
    content.innerHTML = renderAboutSections(data);
  } catch (error) {
    console.error('Failed to load about data:', error);
    content.innerHTML = '<div class="empty-state">Failed to load content</div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAbout);
} else {
  loadAbout();
}
