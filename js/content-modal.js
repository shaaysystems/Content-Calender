/* ==========================================================================
   Q-MARK MEDIA — Add/Edit Content modal (side panel)
   ========================================================================== */

let modalState = null;
let customContentTypes = [];

async function loadCustomTypes() {
  const s = await DB.get('settings', 'app');
  customContentTypes = (s && s.customContentTypes) || [];
}

function openContentModal({ date, editItem } = {}) {
  modalState = editItem ? JSON.parse(JSON.stringify(editItem)) : {
    id: null,
    date: date,
    title: '',
    campaignName: '',
    contentType: 'Static Post',
    platforms: [],
    status: 'Ready',
    description: '',
    notes: '',
    image: '',
    thumbnail: ''
  };

  const overlay = document.createElement('div');
  overlay.className = 'side-panel-overlay';
  overlay.id = 'content-modal-overlay';
  overlay.innerHTML = `<div class="side-panel" id="content-side-panel"></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeContentModal(); });

  drawContentModal();
}

function closeContentModal() {
  const overlay = document.getElementById('content-modal-overlay');
  if (overlay) overlay.remove();
  modalState = null;
}

function drawContentModal() {
  const panel = document.getElementById('content-side-panel');
  const allTypes = [...QU.CONTENT_TYPES.filter(t => t !== 'Other'), ...customContentTypes, 'Other'];
  const isReel = modalState.contentType === 'Reel' || modalState.contentType === 'Video';

  panel.innerHTML = `
    <div class="modal-header">
      <div>
        <h2>${modalState.id ? 'Edit Content' : 'Add Content'}</h2>
        <div class="modal-sub">${QU.formatDateLong(modalState.date)}</div>
      </div>
      <button class="modal-close" id="cm-close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>${isReel ? 'Upload Thumbnail' : 'Upload Creative'}</label>
        <div id="upload-area"></div>
      </div>

      <div class="field">
        <label>Content Type</label>
        <div class="type-grid" id="type-grid">
          ${allTypes.map(t => `<div class="type-chip ${modalState.contentType === t ? 'selected' : ''}" data-type="${QU.escapeHtml(t)}">${QU.escapeHtml(t)}</div>`).join('')}
        </div>
        <div class="flex gap-8" style="margin-top:10px;">
          <input type="text" id="custom-type-input" placeholder="Add custom content type..." style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid var(--border);font-size:12.5px;" />
          <button class="btn btn-secondary btn-sm" id="add-custom-type-btn">Add</button>
        </div>
      </div>

      <div class="field">
        <label>Publishing Platforms <span class="opt">(select one or more)</span></label>
        <div class="platform-grid" id="platform-grid">
          ${QU.PLATFORMS.map(p => `
            <div class="platform-chip ${modalState.platforms.includes(p.key) ? 'selected' : ''}" data-platform="${p.key}">
              <i class="${p.icon}"></i> ${p.key}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="field">
        <label>Content Title <span class="opt">(optional)</span></label>
        <input type="text" id="cm-title" placeholder="e.g. Onam Collection Launch" value="${QU.escapeHtml(modalState.title)}" />
      </div>

      <div class="field">
        <label>Campaign Name <span class="opt">(optional)</span></label>
        <input type="text" id="cm-campaign" placeholder="e.g. Onam 2026" value="${QU.escapeHtml(modalState.campaignName)}" />
      </div>

      <div class="field">
        <label>Caption / Description <span class="opt">(optional)</span></label>
        <textarea id="cm-description" placeholder="Write a caption or description...">${QU.escapeHtml(modalState.description)}</textarea>
      </div>

      <div class="field">
        <label>Notes <span class="opt">(optional)</span></label>
        <textarea id="cm-notes" placeholder="e.g. Post at 7:00 PM" style="min-height:60px;">${QU.escapeHtml(modalState.notes)}</textarea>
      </div>

      <div class="field">
        <label>Content Status</label>
        <div class="status-pill-group" id="status-group">
          ${QU.STATUS_OPTIONS.map(s => `<div class="status-pill ${modalState.status === s ? 'selected ' + s.toLowerCase() : ''}" data-status="${s}">${s}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <div>
        ${modalState.id ? `<button class="btn btn-danger" id="cm-delete"><i class="fa-regular fa-trash-can"></i> Delete</button>` : ''}
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary" id="cm-cancel">Cancel</button>
        <button class="btn btn-primary" id="cm-save"><i class="fa-solid fa-check"></i> ${modalState.id ? 'Save Changes' : 'Add Content'}</button>
      </div>
    </div>
  `;

  renderUploadArea();
  attachContentModalListeners();
}

function renderUploadArea() {
  const area = document.getElementById('upload-area');
  if (modalState.thumbnail) {
    area.innerHTML = `
      <div class="upload-preview">
        <img src="${modalState.thumbnail}" alt="preview" />
        <div class="up-actions">
          <button id="up-replace" title="Replace"><i class="fa-solid fa-arrows-rotate"></i></button>
          <button id="up-remove" title="Remove"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
      <input type="file" id="file-input" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none;" />
    `;
    document.getElementById('up-replace').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('up-remove').addEventListener('click', () => {
      modalState.image = '';
      modalState.thumbnail = '';
      renderUploadArea();
    });
  } else {
    area.innerHTML = `
      <div class="upload-zone" id="upload-zone">
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <p>Click to upload or drag &amp; drop</p>
        <span>JPG, JPEG, PNG or WEBP</span>
      </div>
      <input type="file" id="file-input" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none;" />
    `;
    const zone = document.getElementById('upload-zone');
    zone.addEventListener('click', () => document.getElementById('file-input').click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
    });
  }
  document.getElementById('file-input').addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0]);
  });
}

async function handleFileUpload(file) {
  if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
    showToast('Please upload a JPG, PNG or WEBP image', 'error');
    return;
  }
  // Supports real-world photos up to 5MB (and a bit beyond) at any resolution.
  const MAX_FILE_MB = 30;
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    showToast(`Image is too large (max ${MAX_FILE_MB}MB). Please choose a smaller file.`, 'error');
    return;
  }
  const area = document.getElementById('upload-area');
  area.innerHTML = `<div class="upload-zone"><span class="spinner" style="border-top-color:var(--blue);border-color:rgba(1,94,254,.3);"></span><p style="margin-top:10px;">Processing image&hellip;</p></div>`;
  try {
    // Pass the File/Blob directly (via createImageBitmap where available) —
    // much faster than first converting a multi-MB file to a base64 string.
    // Full creative kept at a reasonable size; thumbnail kept much smaller so
    // calendar rendering, undo snapshots, and IndexedDB writes stay fast.
    const [fullImage, thumb, dims] = await withTimeout(
      Promise.all([
        QU.resizeImage(file, 1600, 0.82),
        QU.resizeImage(file, 480, 0.8),
        QU.getImageSize(URL.createObjectURL(file))
      ]),
      30000,
      'Processing the image took too long. Please try a smaller photo or a different format.'
    );
    modalState.image = fullImage;
    modalState.thumbnail = thumb;
    // Store the TRUE original pixel dimensions (before any resize/compression)
    // so every renderer/export can reproduce the exact original aspect ratio,
    // never the resized-canvas ratio (which is identical, but this is the
    // authoritative source of truth going forward).
    if (dims) { modalState.imageWidth = dims.width; modalState.imageHeight = dims.height; }
    renderUploadArea();
    showToast('Image ready', 'success');
  } catch (err) {
    console.error('Image upload failed:', err);
    showToast('Could not process that image: ' + (err && err.message ? err.message : 'unknown error'), 'error');
    renderUploadArea();
  }
}

/** Reject a promise if it doesn't settle within `ms`, so the UI never hangs forever. */
function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message || 'Operation timed out.')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function attachContentModalListeners() {
  document.getElementById('cm-close').addEventListener('click', closeContentModal);
  document.getElementById('cm-cancel').addEventListener('click', closeContentModal);

  document.querySelectorAll('#type-grid [data-type]').forEach(el => {
    el.addEventListener('click', () => {
      modalState.contentType = el.dataset.type;
      document.querySelectorAll('#type-grid [data-type]').forEach(x => x.classList.toggle('selected', x === el));
    });
  });

  document.getElementById('add-custom-type-btn').addEventListener('click', async () => {
    const input = document.getElementById('custom-type-input');
    const val = input.value.trim();
    if (!val) return;
    if (!customContentTypes.includes(val)) {
      customContentTypes.push(val);
      const s = await DB.get('settings', 'app');
      s.customContentTypes = customContentTypes;
      await DB.put('settings', s);
    }
    modalState.contentType = val;
    input.value = '';
    drawContentModal();
  });

  document.querySelectorAll('#platform-grid [data-platform]').forEach(el => {
    el.addEventListener('click', () => {
      const p = el.dataset.platform;
      const idx = modalState.platforms.indexOf(p);
      if (idx >= 0) modalState.platforms.splice(idx, 1);
      else modalState.platforms.push(p);
      el.classList.toggle('selected');
    });
  });

  document.querySelectorAll('#status-group [data-status]').forEach(el => {
    el.addEventListener('click', () => {
      modalState.status = el.dataset.status;
      document.querySelectorAll('#status-group [data-status]').forEach(x => {
        x.classList.toggle('selected', x === el);
        x.className = 'status-pill' + (x === el ? ' selected ' + el.dataset.status.toLowerCase() : '');
      });
    });
  });

  document.getElementById('cm-title').addEventListener('input', (e) => modalState.title = e.target.value);
  document.getElementById('cm-campaign').addEventListener('input', (e) => modalState.campaignName = e.target.value);
  document.getElementById('cm-description').addEventListener('input', (e) => modalState.description = e.target.value);
  document.getElementById('cm-notes').addEventListener('input', (e) => modalState.notes = e.target.value);

  document.getElementById('cm-save').addEventListener('click', saveContentModal);

  const delBtn = document.getElementById('cm-delete');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this content piece?')) return;
    await deleteContentItem(modalState.id);
    closeContentModal();
  });
}

async function saveContentModal() {
  const saveBtn = document.getElementById('cm-save');
  if (!modalState.date) {
    showToast('This content is missing a date. Please reopen it from a calendar day.', 'error');
    return;
  }
  saveBtn.disabled = true;
  const originalLabel = saveBtn.innerHTML;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    pushUndo();

    if (modalState.id) {
      const idx = EditorCtx.items.findIndex(i => i.id === modalState.id);
      modalState.updatedAt = Date.now();
      await withTimeout(DB.put('contentItems', modalState), 10000, 'Saving is taking too long. Please try again.');
      if (idx >= 0) EditorCtx.items[idx] = modalState;
      else EditorCtx.items.push(modalState);
      showToast('Content updated', 'success');
    } else {
      modalState.id = uid();
      modalState.calendarId = EditorCtx.calendar.id;
      modalState.order = EditorCtx.items.filter(i => i.date === modalState.date).length;
      modalState.createdAt = Date.now();
      modalState.updatedAt = Date.now();
      await withTimeout(DB.put('contentItems', modalState), 10000, 'Saving is taking too long. Please try again.');
      EditorCtx.items.push(modalState);
      showToast('Content added', 'success');
    }

    EditorCtx.calendar.updatedAt = Date.now();
    await withTimeout(DB.put('calendars', EditorCtx.calendar), 10000, 'Saving is taking too long. Please try again.');

    closeContentModal();
    renderCalendarGrid();
    renderStatsPanel();
    updateUndoRedoButtons();
  } catch (err) {
    console.error('Failed to save content:', err);
    showToast('Could not save content: ' + describeDbError(err), 'error');
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalLabel;
  }
}

/** Turn common IndexedDB/storage errors into a helpful, human-readable message. */
function describeDbError(err) {
  const name = err && err.name;
  if (name === 'QuotaExceededError') return 'Your browser storage is full. Try removing some old creatives or clearing data in Settings.';
  if (name === 'InvalidStateError' || name === 'UnknownError') return 'The local database is unavailable right now (this can happen in private/incognito browsing). Try a normal browser window.';
  if (err && err.message) return err.message;
  return 'An unknown error occurred.';
}

/* ---------------- Edit calendar details modal ---------------- */

function openEditDetailsModal() {
  const { calendar, client, outlet } = EditorCtx;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <h2>Edit Calendar Details</h2>
        <button class="modal-close" data-close><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Client Name</label>
          <input type="text" id="ed-client-name" value="${QU.escapeHtml(client.name)}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Outlet / Branch Name</label>
            <input type="text" id="ed-outlet-name" value="${QU.escapeHtml(outlet.name || '')}" />
          </div>
          <div class="field">
            <label>Location Name</label>
            <input type="text" id="ed-location" value="${QU.escapeHtml(outlet.locationName || '')}" />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Month Start Date</label>
            <input type="date" id="ed-start" value="${calendar.startDate}" />
          </div>
          <div class="field">
            <label>Month End Date</label>
            <input type="date" id="ed-end" value="${calendar.endDate}" />
          </div>
        </div>
        <div class="field">
          <label>Week Start</label>
          <select id="ed-weekstart">
            <option value="monday" ${calendar.weekStartDay==='monday'?'selected':''}>Monday Start</option>
            <option value="sunday" ${calendar.weekStartDay==='sunday'?'selected':''}>Sunday Start</option>
            <option value="standard" ${calendar.weekStartDay==='standard'?'selected':''}>Standard Monthly</option>
          </select>
        </div>
        <div class="field">
          <label>Display Options</label>
          <div class="toggle-list">
            ${[
              ['showContentType','Show Content Type'],
              ['showPlatforms','Show Platforms'],
              ['showLocation','Show Client Location'],
              ['showStats','Show Content Statistics'],
              ['showBranding','Show Q-Mark Media Branding'],
              ['showMonthYear','Show Calendar Month and Year']
            ].map(([key,label]) => `
              <div class="toggle-row">
                <div class="tr-label">${label}</div>
                <label class="switch">
                  <input type="checkbox" data-ed-toggle="${key}" ${calendar.display[key] ? 'checked' : ''} />
                  <span class="slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close>Cancel</button>
        <button class="btn btn-primary" id="ed-save">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => overlay.remove()));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#ed-save').addEventListener('click', async () => {
    client.name = document.getElementById('ed-client-name').value.trim();
    if (!outlet.id) { outlet.id = uid(); client.outlets = [outlet]; calendar.outletId = outlet.id; }
    outlet.name = document.getElementById('ed-outlet-name').value.trim();
    outlet.locationName = document.getElementById('ed-location').value.trim();
    const newStart = document.getElementById('ed-start').value;
    const newEnd = document.getElementById('ed-end').value;
    if (QU.parseISODate(newEnd) < QU.parseISODate(newStart)) {
      showToast('End date must be after start date', 'error');
      return;
    }
    calendar.startDate = newStart;
    calendar.endDate = newEnd;
    const sd = QU.parseISODate(newStart);
    calendar.month = sd.getMonth();
    calendar.year = sd.getFullYear();
    calendar.weekStartDay = document.getElementById('ed-weekstart').value;
    overlay.querySelectorAll('[data-ed-toggle]').forEach(input => {
      calendar.display[input.dataset.edToggle] = input.checked;
    });
    calendar.updatedAt = Date.now();

    await DB.put('clients', client);
    await DB.put('calendars', calendar);
    overlay.remove();
    showToast('Calendar details updated', 'success');
    drawEditorShell();
  });
}

window.openContentModal = openContentModal;
window.openEditDetailsModal = openEditDetailsModal;
loadCustomTypes();
