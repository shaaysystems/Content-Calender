/* ==========================================================================
   Q-MARK MEDIA — Calendar Editor: grid rendering, content modal, drag & drop,
   undo/redo, statistics
   ========================================================================== */

let EditorCtx = null; // { calendar, client, outlet, items }
let UndoStack = [];
let RedoStack = [];
let draggedItemId = null;

async function loadEditorCtx(calendarId) {
  const calendar = await DB.get('calendars', calendarId);
  if (!calendar) return null;
  const client = await DB.get('clients', calendar.clientId);
  const outlet = (client.outlets || []).find(o => o.id === calendar.outletId) || (client.outlets || [])[0] || {};
  const items = await DB.getByIndex('contentItems', 'calendarId', calendarId);
  items.sort((a, b) => (a.order || 0) - (b.order || 0));
  return { calendar, client, outlet, items };
}

async function renderEditor(params) {
  const root = document.getElementById('view-root');
  const ctx = await loadEditorCtx(params.id);
  if (!ctx) {
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Calendar not found</h4></div>`;
    return;
  }
  EditorCtx = ctx;
  UndoStack = [];
  RedoStack = [];
  drawEditorShell();
}

function drawEditorShell() {
  const root = document.getElementById('view-root');
  const { calendar, client, outlet } = EditorCtx;
  const monthLabel = `${QU.MONTH_NAMES[calendar.month]} ${calendar.year}`;

  root.innerHTML = `
    <div class="editor-toolbar">
      <div class="et-info">
        <p class="eyebrow" style="margin-bottom:2px;">${QU.escapeHtml(client.name)} ${outlet.name ? '· ' + QU.escapeHtml(outlet.name) : ''}</p>
        <h1>${monthLabel} Content Calendar</h1>
        <p><i class="fa-solid fa-location-dot"></i> ${QU.escapeHtml(outlet.locationName || 'No location set')} &nbsp;·&nbsp; ${EditorCtx.items.length} content pieces</p>
      </div>
      <div class="et-actions">
        ${!State.clientView ? `
          <button class="icon-btn" id="undo-btn" title="Undo"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="icon-btn" id="redo-btn" title="Redo"><i class="fa-solid fa-rotate-right"></i></button>
          <button class="btn btn-secondary" id="edit-details-btn"><i class="fa-solid fa-pen"></i> Edit Details</button>
        ` : ''}
        ${!State.clientView ? `<button class="btn btn-secondary" id="library-btn"><i class="fa-solid fa-photo-film"></i> Content Library</button>` : ''}
        <button class="btn btn-secondary" id="content-details-btn"><i class="fa-solid fa-table-cells-large"></i> Content Details</button>
        <button class="btn ${State.clientView ? 'btn-lime' : 'btn-secondary'}" id="client-view-btn"><i class="fa-solid fa-user-tie"></i> Client View: ${State.clientView ? 'ON' : 'OFF'}</button>
        <button class="btn btn-lime" id="preview-btn"><i class="fa-solid fa-eye"></i> Preview &amp; Export</button>
      </div>
    </div>
    <div id="stats-panel"></div>
    <div class="calendar-wrap" id="calendar-wrap"></div>
  `;

  const editDetailsBtn = document.getElementById('edit-details-btn');
  if (editDetailsBtn) editDetailsBtn.addEventListener('click', openEditDetailsModal);
  const libraryBtn = document.getElementById('library-btn');
  if (libraryBtn) libraryBtn.addEventListener('click', () => navigate('/library/' + EditorCtx.calendar.id));
  document.getElementById('content-details-btn').addEventListener('click', () => navigate('/details/' + EditorCtx.calendar.id));
  document.getElementById('client-view-btn').addEventListener('click', toggleClientView);
  document.getElementById('preview-btn').addEventListener('click', () => navigate('/preview/' + EditorCtx.calendar.id));
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.addEventListener('click', doUndo);
  if (redoBtn) redoBtn.addEventListener('click', doRedo);

  renderStatsPanel();
  renderCalendarGrid();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const u = document.getElementById('undo-btn');
  const r = document.getElementById('redo-btn');
  if (u) u.disabled = UndoStack.length === 0;
  if (r) r.disabled = RedoStack.length === 0;
}

async function toggleClientView() {
  State.clientView = !State.clientView;
  const { name, params } = State.route;
  const fn = (window.routes || {})[name];
  if (fn) { try { await fn(params); } catch (e) { console.error(e); } }
  showToast('Client View ' + (State.clientView ? 'enabled' : 'disabled'), 'default');
}
window.toggleClientView = toggleClientView;

/* ---------------- Undo / Redo (snapshot-based on contentItems) ---------------- */

function snapshotItems() {
  return JSON.parse(JSON.stringify(EditorCtx.items));
}

function pushUndo() {
  UndoStack.push(snapshotItems());
  if (UndoStack.length > 30) UndoStack.shift();
  RedoStack = [];
}

async function applySnapshot(snapshot) {
  const currentIds = EditorCtx.items.map(i => i.id);
  const newIds = snapshot.map(i => i.id);
  for (const id of currentIds) {
    if (!newIds.includes(id)) await DB.delete('contentItems', id);
  }
  for (const item of snapshot) await DB.put('contentItems', item);
  EditorCtx.items = snapshot;
  renderCalendarGrid();
  renderStatsPanel();
}

async function doUndo() {
  if (UndoStack.length === 0) return;
  RedoStack.push(snapshotItems());
  const prev = UndoStack.pop();
  await applySnapshot(prev);
  updateUndoRedoButtons();
  showToast('Undone', 'default');
}

async function doRedo() {
  if (RedoStack.length === 0) return;
  UndoStack.push(snapshotItems());
  const next = RedoStack.pop();
  await applySnapshot(next);
  updateUndoRedoButtons();
  showToast('Redone', 'default');
}

/* ---------------- Calendar grid rendering ---------------- */

function renderCalendarGrid() {
  const { calendar, items } = EditorCtx;
  const weekStart = calendar.weekStartDay === 'sunday' ? 'sunday' : 'monday';
  const grid = QU.buildCalendarGrid(calendar.year, calendar.month, weekStart);
  const wrap = document.getElementById('calendar-wrap');
  const clientView = !!State.clientView;
  const idMap = QU.assignContentIds(items);

  const itemsByDate = {};
  items.forEach(it => {
    if (!itemsByDate[it.date]) itemsByDate[it.date] = [];
    itemsByDate[it.date].push(it);
  });

  const todayIso = QU.toISODate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  let html = `<div class="cal-weekdays">${grid.weekdayLabels.map(d => `<div>${d}</div>`).join('')}</div>`;
  html += `<div class="cal-grid">`;
  grid.weeks.forEach(week => {
    week.forEach(cell => {
      if (!cell) {
        html += `<div class="cal-cell empty"></div>`;
        return;
      }
      const isWeekend = cell.dow === 0 || cell.dow === 6;
      const dayItems = itemsByDate[cell.iso] || [];
      const visible = dayItems.slice(0, 2);
      const extra = dayItems.length - visible.length;
      html += `
        <div class="cal-cell ${isWeekend ? 'weekend' : ''}" data-date="${cell.iso}">
          <div class="cc-date">
            <span>${cell.day}</span>
            ${cell.iso === todayIso ? '<span class="today-badge">Today</span>' : ''}
          </div>
          ${dayItems.length === 0 ? `
            ${clientView ? '' : `<div class="cc-add" data-add-date="${cell.iso}"><i class="fa-solid fa-plus" style="margin-right:5px;"></i> Add Content</div>`}
          ` : `
            <div class="cc-items">
              ${visible.map(it => contentChipHtml(it, idMap[it.id])).join('')}
              ${extra > 0 ? `<div class="cc-more" data-expand-date="${cell.iso}">+${extra} More</div>` : ''}
              ${clientView ? '' : `<button class="add-content-mini" data-add-date="${cell.iso}"><i class="fa-solid fa-plus"></i> Add</button>`}
            </div>
          `}
        </div>
      `;
    });
  });
  html += `</div>`;
  wrap.innerHTML = html;

  attachGridListeners();
}

function contentChipHtml(item, contentId) {
  const platforms = item.platforms || [];
  const clientView = !!State.clientView;
  return `
    <div class="content-chip" draggable="${clientView ? 'false' : 'true'}" data-item-id="${item.id}">
      <div class="chip-media">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="" />` : `<div class="chip-noimg"><i class="fa-solid fa-image"></i></div>`}
        ${clientView ? '' : `<button class="chip-edit-btn" data-edit-item="${item.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>`}
      </div>
      <div class="chip-info">
        <div class="chip-id-row">
          <span class="chip-id">${contentId || ''}</span>
          <span class="chip-type">${QU.escapeHtml(item.contentType || 'Content')}</span>
        </div>
        <div class="chip-platforms">${platforms.slice(0,3).map(p => `<span class="chip-pf-badge">${QU.escapeHtml(QU.shortPlatform(p))}</span>`).join('')}${platforms.length > 3 ? `<span class="chip-pf-badge">+${platforms.length-3}</span>` : ''}</div>
      </div>
    </div>
  `;
}

function attachGridListeners() {
  const wrap = document.getElementById('calendar-wrap');
  const clientView = !!State.clientView;

  wrap.querySelectorAll('[data-add-date]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openContentModal({ date: el.dataset.addDate });
    });
  });

  wrap.querySelectorAll('[data-expand-date]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openDayDetailModal(el.dataset.expandDate);
    });
  });

  wrap.querySelectorAll('.chip-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = EditorCtx.items.find(i => i.id === btn.dataset.editItem);
      if (item) openContentModal({ editItem: item });
    });
  });

  wrap.querySelectorAll('.content-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('.chip-edit-btn')) return;
      openContentLightbox(chip.dataset.itemId);
    });
    if (!clientView) {
      chip.addEventListener('dragstart', (e) => {
        draggedItemId = chip.dataset.itemId;
        chip.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        draggedItemId = null;
        wrap.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('drop-hover'));
      });
    }
  });

  if (clientView) return;

  wrap.querySelectorAll('.cal-cell[data-date]').forEach(cellEl => {
    cellEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      cellEl.classList.add('drop-hover');
    });
    cellEl.addEventListener('dragleave', () => cellEl.classList.remove('drop-hover'));
    cellEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      cellEl.classList.remove('drop-hover');
      if (!draggedItemId) return;
      const targetDate = cellEl.dataset.date;
      const item = EditorCtx.items.find(i => i.id === draggedItemId);
      if (!item || item.date === targetDate) return;
      pushUndo();
      const prevDate = item.date;
      item.date = targetDate;
      item.updatedAt = Date.now();
      try {
        await DB.put('contentItems', item);
        renderCalendarGrid();
        renderStatsPanel();
        updateUndoRedoButtons();
        showToast(`Moved to ${QU.formatDateShort(targetDate)}`, 'success');
      } catch (err) {
        console.error('Failed to move content:', err);
        item.date = prevDate;
        showToast('Could not move that content. Please try again.', 'error');
        renderCalendarGrid();
      }
    });
  });
}

/* ---------------- Day detail modal (expand +N more) ---------------- */

function openDayDetailModal(iso) {
  const dayItems = EditorCtx.items.filter(i => i.date === iso);
  const clientView = !!State.clientView;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel" style="max-width:560px;">
      <div class="modal-header">
        <div>
          <h2>${QU.formatDateLong(iso)}</h2>
          <div class="modal-sub">${dayItems.length} content piece(s)</div>
        </div>
        <button class="modal-close" data-close><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="day-detail-list">
          ${dayItems.map(item => `
            <div class="day-detail-item" data-item-id="${item.id}">
              ${item.thumbnail ? `<img src="${item.thumbnail}" alt="" />` : `<div class="ddi-noimg"><i class="fa-solid fa-image"></i></div>`}
              <div class="ddi-info">
                <div class="ddi-title">${QU.escapeHtml(item.title || item.contentType)}</div>
                <div style="font-size:11.5px;color:var(--text-3);">${QU.escapeHtml(item.contentType)} · ${(item.platforms||[]).join(', ')}</div>
              </div>
              <div class="ddi-actions">
                ${clientView ? '' : `
                  <button class="icon-btn ddi-edit" style="width:32px;height:32px;" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button class="icon-btn ddi-dup" style="width:32px;height:32px;" title="Duplicate"><i class="fa-regular fa-copy"></i></button>
                  <button class="icon-btn ddi-del" style="width:32px;height:32px;color:#c0392b;" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
                `}
              </div>
            </div>
          `).join('')}
        </div>
        ${clientView ? '' : `<button class="btn btn-primary btn-block" style="margin-top:16px;" id="ddi-add-new"><i class="fa-solid fa-plus"></i> Add Another Content</button>`}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('[data-close]').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.day-detail-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.ddi-actions')) return;
      overlay.remove();
      openContentLightbox(el.dataset.itemId);
    });
  });

  const addNewBtn = overlay.querySelector('#ddi-add-new');
  if (addNewBtn) addNewBtn.addEventListener('click', () => {
    overlay.remove();
    openContentModal({ date: iso });
  });

  overlay.querySelectorAll('.ddi-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.closest('.day-detail-item').dataset.itemId;
      const item = EditorCtx.items.find(i => i.id === id);
      overlay.remove();
      openContentModal({ editItem: item });
    });
  });
  overlay.querySelectorAll('.ddi-dup').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.day-detail-item').dataset.itemId;
      await duplicateContentItem(id);
      overlay.remove();
      openDayDetailModal(iso);
    });
  });
  overlay.querySelectorAll('.ddi-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.day-detail-item').dataset.itemId;
      if (!confirm('Delete this content piece?')) return;
      await deleteContentItem(id);
      overlay.remove();
      if (EditorCtx.items.some(i => i.date === iso)) openDayDetailModal(iso);
    });
  });
}

async function duplicateContentItem(id) {
  const item = EditorCtx.items.find(i => i.id === id);
  if (!item) return;
  pushUndo();
  const copy = { ...item, id: uid(), title: item.title ? item.title + ' (Copy)' : '', createdAt: Date.now(), updatedAt: Date.now() };
  try {
    await DB.put('contentItems', copy);
    EditorCtx.items.push(copy);
    renderCalendarGrid();
    renderStatsPanel();
    updateUndoRedoButtons();
    showToast('Content duplicated', 'success');
  } catch (err) {
    console.error('Failed to duplicate content:', err);
    showToast('Could not duplicate that content. Please try again.', 'error');
  }
}

async function deleteContentItem(id) {
  pushUndo();
  try {
    await DB.delete('contentItems', id);
    EditorCtx.items = EditorCtx.items.filter(i => i.id !== id);
    renderCalendarGrid();
    renderStatsPanel();
    updateUndoRedoButtons();
    showToast('Content deleted', 'success');
  } catch (err) {
    console.error('Failed to delete content:', err);
    showToast('Could not delete that content. Please try again.', 'error');
  }
}

/* ---------------- Statistics panel ---------------- */

function computeStats(items, calendar) {
  const total = items.length;
  const byType = {};
  const byPlatform = {};
  const postingDates = new Set();
  items.forEach(it => {
    byType[it.contentType] = (byType[it.contentType] || 0) + 1;
    (it.platforms || []).forEach(p => byPlatform[p] = (byPlatform[p] || 0) + 1);
    postingDates.add(it.date);
  });
  const totalDaysInMonth = QU.daysBetweenInclusive(calendar.startDate, calendar.endDate);
  const postingDays = postingDates.size;
  let frequency = 'N/A';
  if (postingDays > 1) {
    frequency = `Every ${Math.round(totalDaysInMonth / postingDays)} days`;
  } else if (postingDays === 1) {
    frequency = 'Once this month';
  }
  return { total, byType, byPlatform, postingDays, totalDaysInMonth, frequency };
}

function renderStatsPanel() {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  if (!EditorCtx.calendar.display.showStats) { panel.innerHTML = ''; return; }
  const stats = computeStats(EditorCtx.items, EditorCtx.calendar);
  const topTypes = Object.entries(stats.byType).sort((a,b) => b[1]-a[1]).slice(0, 4);
  const topPlatforms = Object.entries(stats.byPlatform).sort((a,b) => b[1]-a[1]);

  panel.innerHTML = `
    <div class="section-card">
      <h3>Content Summary</h3>
      <p class="hint">Automatically calculated from your calendar content.</p>
      <div class="stats-grid" style="margin-bottom:22px;">
        <div class="stat-card accent">
          <div class="stat-val">${stats.total}</div>
          <div class="stat-lbl">Total Content Pieces</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${stats.postingDays} / ${stats.totalDaysInMonth}</div>
          <div class="stat-lbl">Posting Days</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${stats.frequency}</div>
          <div class="stat-lbl">Posting Frequency</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${topPlatforms.length}</div>
          <div class="stat-lbl">Platforms In Use</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
        <div>
          <div class="tr-label" style="margin-bottom:10px;">Content Types</div>
          ${topTypes.length ? topTypes.map(([type, count]) => barRow(type, count, stats.total)).join('') : '<p class="text-muted" style="font-size:13px;">No content added yet.</p>'}
        </div>
        <div>
          <div class="tr-label" style="margin-bottom:10px;">Platform Distribution</div>
          ${topPlatforms.length ? topPlatforms.map(([pf, count]) => barRow(pf, count, stats.total)).join('') : '<p class="text-muted" style="font-size:13px;">No platforms selected yet.</p>'}
        </div>
      </div>
    </div>
  `;
}

function barRow(label, count, total) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${QU.escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct,100)}%;"></div></div>
      <div class="bar-val">${count}</div>
    </div>
  `;
}

window.renderEditor = renderEditor;
window.computeStats = computeStats;
window.duplicateContentItem = duplicateContentItem;
window.deleteContentItem = deleteContentItem;
