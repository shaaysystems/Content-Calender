/* ==========================================================================
   Q-MARK MEDIA — Content Library view
   ========================================================================== */

let libraryFilters = { type: 'All', platform: 'All', status: 'All', search: '' };

async function renderLibrary(params) {
  const root = document.getElementById('view-root');
  const ctx = await loadEditorCtx(params.id);
  if (!ctx) {
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Calendar not found</h4></div>`;
    return;
  }
  EditorCtx = ctx;
  libraryFilters = { type: 'All', platform: 'All', status: 'All', search: '' };
  drawLibrary();
}

function drawLibrary() {
  const root = document.getElementById('view-root');
  const { calendar, client, outlet } = EditorCtx;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Content Library</p>
        <h1>${QU.escapeHtml(client.name)} ${outlet.name ? '· ' + QU.escapeHtml(outlet.name) : ''}</h1>
        <p>All creatives uploaded for ${QU.MONTH_NAMES[calendar.month]} ${calendar.year}</p>
      </div>
      <button class="btn btn-secondary" onclick="navigate('/editor/${calendar.id}')"><i class="fa-solid fa-arrow-left"></i> Back to Editor</button>
    </div>

    <div class="library-toolbar">
      <div class="filter-chips" id="type-filter-chips"></div>
      <div class="flex gap-8">
        <select class="filter-select" id="platform-filter"></select>
        <select class="filter-select" id="status-filter"></select>
        <div class="search-box" style="min-width:200px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="lib-search" placeholder="Search by title..." />
        </div>
      </div>
    </div>

    <div id="library-grid-container"></div>
  `;

  const typeCats = ['All', 'Static Posts', 'Reels', 'Stories', 'Carousels', 'Ad Creatives', 'Festive / Special Day Posters', 'Videos'];
  document.getElementById('type-filter-chips').innerHTML = typeCats.map(t =>
    `<div class="filter-chip ${libraryFilters.type === t ? 'active' : ''}" data-type-filter="${t}">${t}</div>`
  ).join('');
  document.querySelectorAll('[data-type-filter]').forEach(el => {
    el.addEventListener('click', () => {
      libraryFilters.type = el.dataset.typeFilter;
      drawLibrary();
    });
  });

  const platformSelect = document.getElementById('platform-filter');
  platformSelect.innerHTML = `<option value="All">All Platforms</option>` + QU.PLATFORMS.map(p => `<option value="${p.key}" ${libraryFilters.platform===p.key?'selected':''}>${p.key}</option>`).join('');
  platformSelect.addEventListener('change', (e) => { libraryFilters.platform = e.target.value; renderLibraryGrid(); });

  const statusSelect = document.getElementById('status-filter');
  statusSelect.innerHTML = `<option value="All">All Statuses</option>` + QU.STATUS_OPTIONS.map(s => `<option value="${s}" ${libraryFilters.status===s?'selected':''}>${s}</option>`).join('');
  statusSelect.addEventListener('change', (e) => { libraryFilters.status = e.target.value; renderLibraryGrid(); });

  const searchInput = document.getElementById('lib-search');
  searchInput.value = libraryFilters.search;
  searchInput.addEventListener('input', QU.debounce((e) => {
    libraryFilters.search = e.target.value.toLowerCase();
    renderLibraryGrid();
  }, 200));

  renderLibraryGrid();
}

function matchesTypeCategory(item, cat) {
  if (cat === 'All') return true;
  const t = (item.contentType || '').toLowerCase();
  if (cat === 'Static Posts') return t === 'static post';
  if (cat === 'Reels') return t === 'reel';
  if (cat === 'Stories') return t === 'story';
  if (cat === 'Carousels') return t === 'carousel';
  if (cat === 'Ad Creatives') return t === 'ad creative';
  if (cat === 'Festive / Special Day Posters') return t === 'festive / special day poster';
  if (cat === 'Videos') return t === 'video' || t.includes('motion');
  return true;
}

function renderLibraryGrid() {
  const container = document.getElementById('library-grid-container');
  let items = [...EditorCtx.items];

  items = items.filter(it => matchesTypeCategory(it, libraryFilters.type));
  if (libraryFilters.platform !== 'All') items = items.filter(it => (it.platforms || []).includes(libraryFilters.platform));
  if (libraryFilters.status !== 'All') items = items.filter(it => it.status === libraryFilters.status);
  if (libraryFilters.search) items = items.filter(it => (it.title || '').toLowerCase().includes(libraryFilters.search));

  items.sort((a, b) => QU.parseISODate(a.date) - QU.parseISODate(b.date));

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-photo-film"></i><h4>No content found</h4><p>Try adjusting your filters, or add content from the calendar editor.</p></div>`;
    return;
  }

  container.innerHTML = `<div class="library-grid">${items.map(libraryCardHtml).join('')}</div>`;

  container.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = EditorCtx.items.find(i => i.id === card.dataset.id);
      if (!item) return;
      if (State.clientView) openContentLightbox(item.id);
      else openContentModal({ editItem: item });
    });
  });
}

function libraryCardHtml(item) {
  const statusColor = { Draft: 'badge-gray', Ready: 'badge-blue', Scheduled: 'badge-lime', Published: 'badge-lime' }[item.status] || 'badge-gray';
  return `
    <div class="lib-card" data-id="${item.id}">
      ${item.thumbnail ? `<img class="lib-thumb" src="${item.thumbnail}" alt="" />` : `<div class="lib-thumb-empty"><i class="fa-solid fa-image"></i></div>`}
      <div class="lib-body">
        <div class="lib-title">${QU.escapeHtml(item.title || item.contentType)}</div>
        <div style="font-size:11.5px;color:var(--text-2);font-weight:600;text-transform:uppercase;letter-spacing:.02em;">${QU.escapeHtml(item.contentType)}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px;">${(item.platforms||[]).join(' • ') || 'No platform'}</div>
        <div class="lib-meta">
          <span>${QU.formatDateShort(item.date)}</span>
          <span class="badge ${statusColor}">${item.status}</span>
        </div>
      </div>
    </div>
  `;
}

window.renderLibrary = renderLibrary;
