/* ==========================================================================
   Q-MARK MEDIA — Interactive Content Lightbox
   Full-screen/large modal for inspecting a single creative, with
   Previous / Next / Close navigation across all scheduled content.
   ========================================================================== */

let lightboxCurrentId = null;

function openContentLightbox(itemId) {
  if (!EditorCtx) return;
  lightboxCurrentId = itemId;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.id = 'content-lightbox-overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeContentLightbox(); });
  document.addEventListener('keydown', lightboxKeyHandler);
  drawLightbox();
}

function closeContentLightbox() {
  const overlay = document.getElementById('content-lightbox-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', lightboxKeyHandler);
  lightboxCurrentId = null;
}

function lightboxKeyHandler(e) {
  if (e.key === 'Escape') closeContentLightbox();
  if (e.key === 'ArrowRight') lightboxStep(1);
  if (e.key === 'ArrowLeft') lightboxStep(-1);
}

function lightboxOrderedItems() {
  return QU.sortedByDate(EditorCtx.items);
}

function lightboxStep(dir) {
  const ordered = lightboxOrderedItems();
  const idx = ordered.findIndex(i => i.id === lightboxCurrentId);
  if (idx === -1) return;
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= ordered.length) return;
  lightboxCurrentId = ordered[nextIdx].id;
  drawLightbox();
}

function drawLightbox() {
  const overlay = document.getElementById('content-lightbox-overlay');
  if (!overlay) return;
  const ordered = lightboxOrderedItems();
  const idMap = QU.assignContentIds(EditorCtx.items);
  const idx = ordered.findIndex(i => i.id === lightboxCurrentId);
  const item = ordered[idx];
  if (!item) { closeContentLightbox(); return; }
  const clientView = !!State.clientView;
  const statusColor = { Draft: 'badge-gray', Ready: 'badge-blue', Scheduled: 'badge-lime', Published: 'badge-lime' }[item.status] || 'badge-gray';

  overlay.innerHTML = `
    <button class="lb-close" id="lb-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
    <button class="lb-nav lb-prev" id="lb-prev" title="Previous Content" ${idx <= 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
    <button class="lb-nav lb-next" id="lb-next" title="Next Content" ${idx >= ordered.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>

    <div class="lb-panel">
      <div class="lb-media">
        ${item.image || item.thumbnail
          ? `<img src="${item.image || item.thumbnail}" alt="" />`
          : `<div class="lb-noimg"><i class="fa-solid fa-image"></i></div>`}
      </div>
      <div class="lb-info">
        <div class="lb-info-scroll">
          <div class="lb-id-row">
            <span class="lb-content-id">${idMap[item.id] || ''}</span>
            <span class="lb-counter">${idx + 1} of ${ordered.length}</span>
          </div>
          <h2 class="lb-title">${QU.escapeHtml(item.title || item.contentType || 'Untitled')}</h2>
          <div class="lb-date"><i class="fa-regular fa-calendar"></i> ${QU.formatDateLong(item.date)} &middot; ${QU.weekdayName(item.date)}</div>

          <div class="lb-meta-grid">
            <div class="lb-meta-item">
              <div class="lb-meta-lbl">Content Type</div>
              <div class="lb-meta-val lb-meta-type">${QU.escapeHtml(item.contentType || '—')}</div>
            </div>
            ${item.campaignName ? `
              <div class="lb-meta-item">
                <div class="lb-meta-lbl">Campaign</div>
                <div class="lb-meta-val">${QU.escapeHtml(item.campaignName)}</div>
              </div>
            ` : ''}
            ${!clientView ? `
              <div class="lb-meta-item">
                <div class="lb-meta-lbl">Status</div>
                <div class="lb-meta-val"><span class="badge ${statusColor}">${QU.escapeHtml(item.status || '')}</span></div>
              </div>
            ` : ''}
          </div>

          ${(item.platforms || []).length ? `
            <div class="lb-section-lbl">Platforms</div>
            <div class="lb-platform-badges">
              ${item.platforms.map(p => `<span class="lb-platform-badge">${QU.escapeHtml(p)}</span>`).join('')}
            </div>
          ` : ''}

          ${item.description ? `
            <div class="lb-section-lbl">Description</div>
            <p class="lb-description">${QU.escapeHtml(item.description)}</p>
          ` : ''}

          ${(!clientView && item.notes) ? `
            <div class="lb-section-lbl">Internal Notes</div>
            <p class="lb-description lb-notes">${QU.escapeHtml(item.notes)}</p>
          ` : ''}
        </div>

        ${!clientView ? `
          <div class="lb-actions">
            <button class="btn btn-secondary" id="lb-edit"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="btn btn-danger" id="lb-delete"><i class="fa-regular fa-trash-can"></i> Delete</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('lb-close').addEventListener('click', closeContentLightbox);
  document.getElementById('lb-prev').addEventListener('click', () => lightboxStep(-1));
  document.getElementById('lb-next').addEventListener('click', () => lightboxStep(1));

  const editBtn = document.getElementById('lb-edit');
  if (editBtn) editBtn.addEventListener('click', () => {
    closeContentLightbox();
    openContentModal({ editItem: item });
  });
  const delBtn = document.getElementById('lb-delete');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this content piece?')) return;
    await deleteContentItem(item.id);
    closeContentLightbox();
  });
}

window.openContentLightbox = openContentLightbox;
window.closeContentLightbox = closeContentLightbox;
