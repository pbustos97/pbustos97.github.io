/**
 * Mixes page: load mix metadata and render cards.
 * - When #mixes-list has data-limit="N", render the N most recent mixes as
 *   COMPACT cards (header + meta only, no track table / no track fetch).
 * - Otherwise render full cards with track tables fetched from mixes/2024/<id>.html.
 */

const TRACK_COLUMNS = ['#', 'Title', 'Artist', 'Genre', 'BPM', 'Key', 'Duration'];

function parseMixFile(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('table.border tr');

  if (rows.length < 2) return { tracks: [], columns: [] };

  const headerRow = rows[0];
  const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());

  const trackRows = Array.from(rows).slice(1);
  const tracks = trackRows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    const track = {};
    headers.forEach((header, i) => {
      track[header] = cells[i]?.textContent.trim() || '';
    });
    return track;
  });

  return { tracks, columns: headers };
}

function renderMixCard(mix) {
  const theadHtml = TRACK_COLUMNS.map(col => `<th>${col}</th>`).join('');
  const id = escapeHtml(mix.id);
  return `
    <section class="mix-section" id="${id}">
      <div class="mix-header">
        <h2>${escapeHtml(mix.title)}</h2>
        <span class="mix-meta">${escapeHtml(mix.genre) || ''}</span>
      </div>
      <div class="mix-scroll">
        <table>
          <thead>
            <tr>${theadHtml}</tr>
          </thead>
          <tbody id="${id}-tracks">
            <tr>
              <td colspan="${TRACK_COLUMNS.length}" class="empty-state">Loading tracks...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMixCardCompact(mix) {
  const metaParts = [];
  if (mix.date) metaParts.push(`<span>${escapeHtml(mix.date)}</span>`);
  if (mix.description) metaParts.push(`<span>${escapeHtml(mix.description)}</span>`);
  const metaHtml = metaParts.length
    ? `<div class="mix-stats">${metaParts.join('')}</div>`
    : '';

  const id = escapeHtml(mix.id);
  return `
    <section class="mix-section" id="${id}">
      <div class="mix-header">
        <h2>${escapeHtml(mix.title)}</h2>
        <span class="mix-meta">${escapeHtml(mix.genre) || ''}</span>
      </div>
      ${metaHtml}
    </section>
  `;
}

function renderMixTracks(tracks) {
  return tracks.map((track, index) => {
    const num = track['Num.'] || index + 1;
    const title = track['Title'] || '';
    const artist = track['Artist'] || '';
    const genre = track['Genre'] || '';
    const bpm = track['BPM'] || '';
    const key = track['Key'] || '';
    const duration = track['Duration'] || track['Time'] || '';

    return `
      <tr>
        <td class="track-num">${escapeHtml(num)}</td>
        <td class="track-title">${escapeHtml(title)}</td>
        <td class="track-artist">${escapeHtml(artist)}</td>
        <td>${genre ? `<span class="track-genre">${escapeHtml(genre)}</span>` : ''}</td>
        <td class="track-bpm">${escapeHtml(bpm)}</td>
        <td class="track-key">${escapeHtml(key)}</td>
        <td class="track-duration">${escapeHtml(duration)}</td>
      </tr>
    `;
  }).join('');
}

async function loadMixes() {
  const container = document.getElementById('mixes-list');
  if (!container) return;

  const limitAttr = container.getAttribute('data-limit');
  const limit = limitAttr ? parseInt(limitAttr, 10) : null;
  const compactMode = Number.isFinite(limit) && limit > 0;

  try {
    const data = await fetchJSON('data/mixes.json');
    const mixes = data.mixes || [];

    // Compact mode: sort by date descending (most recent first), then take first N.
    // Full mode: render all mixes in original order (no sort).
    let visibleMixes;
    if (compactMode) {
      const sortedMixes = [...mixes].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      visibleMixes = sortedMixes.slice(0, limit);
    } else {
      visibleMixes = mixes;
    }

    if (visibleMixes.length === 0) {
      container.innerHTML = '<div class="empty-state">No mixes found</div>';
      return;
    }

    if (compactMode) {
      container.innerHTML = visibleMixes.map(renderMixCardCompact).join('');
      return;
    }

    // Full mode: render all cards with track tables, then fetch tracks per-mix.
    container.innerHTML = visibleMixes.map(renderMixCard).join('');

    for (const mix of visibleMixes) {
      const id = escapeHtml(mix.id);
      try {
        const response = await fetch(`mixes/2024/${mix.id}.html`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const { tracks } = parseMixFile(html);

        const tbody = document.getElementById(`${id}-tracks`);
        if (tbody) {
          tbody.innerHTML = renderMixTracks(tracks);
        }
      } catch (error) {
        console.error(`Failed to load mix ${mix.id}:`, error);
        const tbody = document.getElementById(`${id}-tracks`);
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="${TRACK_COLUMNS.length}" class="empty-state">Failed to load tracks</td></tr>`;
        }
      }
    }
  } catch (error) {
    console.error('Failed to load mixes:', error);
    container.innerHTML = '<div class="empty-state">Failed to load mixes</div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMixes);
} else {
  loadMixes();
}
