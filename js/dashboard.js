/* ==========================================================================
   Q-MARK MEDIA — Dashboard view
   ========================================================================== */

async function renderDashboard() {
  const root = document.getElementById('view-root');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  let calendars = [...State.calendars];
  const allContent = await DB.getAll('contentItems');

  // enrich with client info + content counts
  const clientMap = Object.fromEntries(State.clients.map(c => [c.id, c]));
  let enriched = calendars.map(cal => {
    const client = clientMap[cal.clientId] || {};
    const outlet = (client.outlets || []).find(o => o.id === cal.outletId) || (client.outlets || [])[0] || {};
    const count = allContent.filter(ci => ci.calendarId === cal.id).length;
    return { cal, client, outlet, count };
  });

  if (State.searchQuery) {
    const q = State.searchQuery;
    enriched = enriched.filter(({ cal, client, outlet }) => {
      const monthLabel = `${QU.MONTH_NAMES[cal.month]} ${cal.year}`.toLowerCase();
      return (client.name || '').toLowerCase().includes(q) ||
             (outlet.name || '').toLowerCase().includes(q) ||
             (outlet.locationName || '').toLowerCase().includes(q) ||
             monthLabel.includes(q);
    });
  }

  enriched.sort((a, b) => (b.cal.updatedAt || 0) - (a.cal.updatedAt || 0));

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">${State.searchQuery ? 'Search Results' : 'Dashboard'}</p>
        <h1>${State.searchQuery ? `Results for "${QU.escapeHtml(State.searchQuery)}"` : greeting}</h1>
        <p>${State.searchQuery ? `${enriched.length} calendar(s) found` : 'Manage and create content calendars for your clients.'}</p>
      </div>
    </div>

    ${!State.searchQuery ? `
    <button class="create-cta" id="cta-create">
      <div class="plus-badge"><i class="fa-solid fa-plus"></i></div>
      <div>
        <h2>Create New Content Calendar</h2>
        <p>Set up a client, choose the month, and generate a premium calendar in minutes.</p>
      </div>
      <div style="margin-left:auto;font-size:20px;opacity:.8;"><i class="fa-solid fa-arrow-right"></i></div>
    </button>
    ` : ''}

    <div class="section-label">${State.searchQuery ? 'Matching Calendars' : 'Recent Calendars'}</div>
    ${enriched.length === 0 ? `
      <div class="empty-state">
        <i class="fa-regular fa-calendar"></i>
        <h4>No calendars yet</h4>
        <p>Create your first content calendar to get started.</p>
      </div>
    ` : `
      <div class="projects-grid">
        ${enriched.map(renderProjectCard).join('')}
      </div>
    `}
  `;

  const ctaBtn = document.getElementById('cta-create');
  if (ctaBtn) ctaBtn.addEventListener('click', () => navigate('/create'));

  root.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.pc-menu-btn') || e.target.closest('.pc-menu-dropdown')) return;
      navigate('/editor/' + card.dataset.id);
    });
  });

  root.querySelectorAll('.pc-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = btn.nextElementSibling;
      document.querySelectorAll('.pc-menu-dropdown').forEach(d => { if (d !== dd) d.classList.add('hidden'); });
      dd.classList.toggle('hidden');
    });
  });

  root.querySelectorAll('.pc-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Delete this calendar and all its content? This cannot be undone.')) return;
      await deleteCalendarCascade(id);
      showToast('Calendar deleted', 'success');
      await refreshData();
      renderDashboard();
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.pc-menu-dropdown').forEach(d => d.classList.add('hidden'));
  }, { once: true });
}

function renderProjectCard({ cal, client, outlet, count }) {
  const monthLabel = `${QU.MONTH_NAMES[cal.month]} ${cal.year}`;
  // mini preview: fill cells pseudo-randomly based on count for nice visual (deterministic)
  const totalCells = 35;
  let previewCells = '';
  for (let i = 0; i < totalCells; i++) {
    const filled = i < Math.min(count * 2, totalCells) && (i % 3 !== 2);
    const lime = filled && i % 5 === 0;
    previewCells += `<div class="cell ${filled ? 'filled' : ''} ${lime ? 'lime' : ''}"></div>`;
  }
  return `
    <article class="project-card" data-id="${cal.id}">
      <div class="pc-menu">
        <button class="icon-btn pc-menu-btn" style="width:30px;height:30px;"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="export-dropdown pc-menu-dropdown hidden" style="min-width:160px;">
          <div class="ed-item pc-delete" data-id="${cal.id}"><i class="fa-regular fa-trash-can"></i> Delete Calendar</div>
        </div>
      </div>
      <div class="pc-top">
        <div>
          <div class="pc-client">${QU.escapeHtml(client.name || 'Untitled Client')}</div>
          <div class="pc-outlet">${QU.escapeHtml(outlet.name || '')}</div>
          <div class="pc-loc"><i class="fa-solid fa-location-dot"></i> ${QU.escapeHtml(outlet.locationName || 'No location set')}</div>
        </div>
      </div>
      <div class="pc-preview">${previewCells}</div>
      <div class="pc-bottom">
        <span class="pc-month-chip">${monthLabel}</span>
        <span><strong>${count}</strong> Content ${count === 1 ? 'Piece' : 'Pieces'}</span>
      </div>
      <div class="pc-bottom" style="border-top:none;padding-top:8px;">
        <span>Last edited ${QU.timeAgo(cal.updatedAt)}</span>
      </div>
    </article>
  `;
}

async function deleteCalendarCascade(calendarId) {
  const items = await DB.getByIndex('contentItems', 'calendarId', calendarId);
  for (const item of items) await DB.delete('contentItems', item.id);
  await DB.delete('calendars', calendarId);
}

window.renderDashboard = renderDashboard;
window.deleteCalendarCascade = deleteCalendarCascade;
