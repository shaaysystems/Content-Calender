/* ==========================================================================
   Q-MARK MEDIA — Content Details View (Level 2)
   Premium editorial presentation: every scheduled creative shown large and
   readable, 2 cards per row, with full metadata. Reused (in a slightly
   different container) by the multi-page PDF export and the Content Board.
   ========================================================================== */

async function renderContentDetails(params) {
  const root = document.getElementById('view-root');
  const ctx = await loadEditorCtx(params.id);
  if (!ctx) {
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Calendar not found</h4></div>`;
    return;
  }
  EditorCtx = ctx;
  const { calendar, client, outlet, items } = EditorCtx;
  const monthLabel = `${QU.MONTH_NAMES[calendar.month]} ${calendar.year}`;
  const ordered = QU.sortedByDate(items);
  const idMap = QU.assignContentIds(items);
  const clientView = !!State.clientView;
  // Resolve each item's TRUE original image dimensions before building any
  // card markup, so the orientation-adaptive layout (portrait/landscape/
  // square) is correct on first render, not just after a re-render.
  await Promise.all(ordered.map(it => QU.ensureItemImageDims(it)));

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Content Details</p>
        <h1>${QU.escapeHtml(client.name)} ${outlet.name ? '· ' + QU.escapeHtml(outlet.name) : ''}</h1>
        <p>What will be posted &mdash; ${monthLabel} &middot; ${items.length} content piece(s)</p>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary" onclick="navigate('/editor/${calendar.id}')"><i class="fa-solid fa-arrow-left"></i> Back to Calendar</button>
        <button class="btn ${clientView ? 'btn-lime' : 'btn-secondary'}" id="cd-client-view-btn"><i class="fa-solid fa-user-tie"></i> Client View: ${clientView ? 'ON' : 'OFF'}</button>
        <button class="btn btn-lime" onclick="navigate('/preview/${calendar.id}')"><i class="fa-solid fa-eye"></i> Preview &amp; Export</button>
      </div>
    </div>

    ${ordered.length === 0 ? `
      <div class="empty-state"><i class="fa-solid fa-photo-film"></i><h4>No content yet</h4><p>Add content from the calendar editor to see it here.</p></div>
    ` : `
      <div class="detail-cards-grid">
        ${ordered.map(item => contentDetailCardHtml(item, idMap[item.id], clientView)).join('')}
      </div>
    `}
  `;

  document.getElementById('cd-client-view-btn').addEventListener('click', async () => {
    State.clientView = !State.clientView;
    await renderContentDetails(params);
  });

  root.querySelectorAll('.detail-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.dc-edit-btn')) return;
      openContentLightbox(card.dataset.itemId);
    });
  });
  root.querySelectorAll('.dc-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = EditorCtx.items.find(i => i.id === btn.dataset.editItem);
      if (item) openContentModal({ editItem: item });
    });
  });
}

/**
 * Build one editorial detail card. Used both for the on-screen Content
 * Details view and (via preview.js) for the multi-page PDF export /
 * Content Board export — those callers pass forExport=true to drop
 * interactive-only chrome (edit button, hover affordances).
 */
function contentDetailCardHtml(item, contentId, clientView, forExport) {
  const platforms = item.platforms || [];
  const img = item.image || item.thumbnail;
  const statusColor = { Draft: 'badge-gray', Ready: 'badge-blue', Scheduled: 'badge-lime', Published: 'badge-lime' }[item.status] || 'badge-gray';
  const dateShort = `${String(QU.parseISODate(item.date).getDate()).padStart(2,'0')} ${QU.MONTH_NAMES[QU.parseISODate(item.date).getMonth()].toUpperCase()}`;
  // Orientation-adaptive media area: never a fixed landscape box. The card
  // reads the creative's TRUE original width/height (captured at upload time,
  // or measured on demand for legacy items) and classes the media container
  // as portrait / landscape / square so the layout itself adapts — the image
  // element then uses plain intrinsic sizing (no object-fit) so it can never
  // be stretched or cropped.
  const orientation = QU.orientationOf(item.imageWidth, item.imageHeight);

  return `
    <div class="detail-card" data-item-id="${item.id}">
      <div class="dc-date-header">
        <span class="dc-date">${dateShort} <span class="dc-weekday">&middot; ${QU.weekdayName(item.date)}</span></span>
        <span class="dc-cid">${contentId || ''}</span>
      </div>
      <div class="dc-media dc-${orientation}">
        ${img ? `<img src="${img}" alt="" width="${item.imageWidth || ''}" height="${item.imageHeight || ''}" />` : `<div class="dc-noimg"><i class="fa-solid fa-image"></i></div>`}
        ${(!forExport && !clientView) ? `<button class="dc-edit-btn" data-edit-item="${item.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>` : ''}
      </div>
      <div class="dc-body">
        <h3 class="dc-title">${QU.escapeHtml(item.title || item.contentType || 'Untitled')}</h3>
        <div class="dc-type-row">
          <span class="dc-type">${QU.escapeHtml(item.contentType || '')}</span>
          ${(!clientView && item.status) ? `<span class="badge ${statusColor}">${QU.escapeHtml(item.status)}</span>` : ''}
        </div>
        ${platforms.length ? `<div class="dc-platforms">${platforms.map(p => `<span class="dc-platform-badge">${QU.escapeHtml(p)}</span>`).join('')}</div>` : ''}
        ${item.campaignName ? `<div class="dc-campaign"><i class="fa-solid fa-bullhorn"></i> ${QU.escapeHtml(item.campaignName)}</div>` : ''}
        ${item.description ? `<p class="dc-description">${QU.escapeHtml(item.description)}</p>` : ''}
      </div>
    </div>
  `;
}

window.renderContentDetails = renderContentDetails;
window.contentDetailCardHtml = contentDetailCardHtml;
