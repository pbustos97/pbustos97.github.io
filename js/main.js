const essentialColumns = ['Num.', 'Title', 'Artist', 'Genre', 'BPM', 'Key', 'Duration'];

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

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

function renderMixCard(mix, index) {
  return `
    <section class="mix-section" id="${mix.id}">
      <div class="mix-header">
        <h2>${mix.title}</h2>
        <span class="mix-meta">${mix.genre || ''}</span>
      </div>
      <div class="mix-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Artist</th>
              <th>Genre</th>
              <th>BPM</th>
              <th>Key</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody id="${mix.id}-tracks">
            <tr>
              <td colspan="7" class="empty-state">Loading tracks...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMixList(mixes) {
  return mixes.map((mix, index) => `
    <section class="mix-section">
      <div class="mix-header">
        <h2>${mix.title}</h2>
        <span class="mix-meta">${mix.genre || ''}</span>
      </div>
      <div class="mix-stats">
        <span>${mix.date}</span>
      </div>
    </section>
  `).join('');
}

function renderMixTracks(mix, tracks) {
  let html = '';
  
  tracks.forEach((track, index) => {
    const num = track['Num.'] || index + 1;
    const title = track['Title'] || '';
    const artist = track['Artist'] || '';
    const genre = track['Genre'] || '';
    const bpm = track['BPM'] || '';
    const key = track['Key'] || '';
    const duration = track['Duration'] || track['Time'] || '';
    
    html += `
      <tr>
        <td class="track-num">${num}</td>
        <td class="track-title">${title}</td>
        <td class="track-artist">${artist}</td>
        <td>${genre ? `<span class="track-genre">${genre}</span>` : ''}</td>
        <td class="track-bpm">${bpm}</td>
        <td class="track-key">${key}</td>
        <td class="track-duration">${duration}</td>
      </tr>
    `;
  });
  
  return html;
}

async function loadMixes() {
  const container = document.getElementById('mixes-list');
  if (!container) return;
  
  try {
    const response = await fetch('data/mixes.json');
    const data = await response.json();
    const mixes = data.mixes;
    
    let allHtml = '';
    
    for (const mix of mixes) {
      allHtml += renderMixCard(mix);
    }
    
    container.innerHTML = allHtml || '<div class="empty-state">No mixes found</div>';
    
    for (const mix of mixes) {
      try {
        const response = await fetch(`mixes/2024/${mix.id}.html`);
        const html = await response.text();
        const { tracks } = parseMixFile(html);
        
        const tbody = document.getElementById(`${mix.id}-tracks`);
        if (tbody) {
          tbody.innerHTML = renderMixTracks(mix, tracks);
        }
      } catch (error) {
        console.error(`Failed to load mix ${mix.id}:`, error);
        const tbody = document.getElementById(`${mix.id}-tracks`);
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load tracks</td></tr>';
        }
      }
    }
  } catch (error) {
    console.error('Failed to load mixes:', error);
    container.innerHTML = '<div class="empty-state">Failed to load mixes</div>';
  }
}

document.addEventListener('DOMContentLoaded', loadMixes);