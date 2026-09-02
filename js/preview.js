/* ==========================================================================
   Q-MARK MEDIA — Preview & Export view
   ========================================================================== */

let exportSettings = { format: 'pdf', pdfSize: 'a4', resolution: 'high' };

async function renderPreview(params) {
  const root = document.getElementById('view-root');
  const ctx = await loadEditorCtx(params.id);
  if (!ctx) {
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Calendar not found</h4></div>`;
    return;
  }
  EditorCtx = ctx;
  const clientView = !!State.clientView;

  root.innerHTML = `
    <div class="preview-toolbar">
      <div>
        <p class="eyebrow">Preview &amp; Export</p>
        <h1 style="font-size:24px;margin:0;">Client-Ready Calendar Preview</h1>
        <p style="margin:4px 0 0;color:var(--text-2);font-size:13px;">Calendar Overview shown below. Full Content Details are included in the PDF export and Content Board.</p>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary" onclick="navigate('/editor/${EditorCtx.calendar.id}')"><i class="fa-solid fa-arrow-left"></i> Back to Editor</button>
        <button class="btn btn-secondary" onclick="navigate('/details/${EditorCtx.calendar.id}')"><i class="fa-solid fa-table-cells-large"></i> Content Details</button>
        <button class="btn ${clientView ? 'btn-lime' : 'btn-secondary'}" id="pv-client-view-btn"><i class="fa-solid fa-user-tie"></i> Client View: ${clientView ? 'ON' : 'OFF'}</button>
        <div class="export-menu">
          <button class="btn btn-primary btn-lg" id="export-toggle-btn"><i class="fa-solid fa-download"></i> Export Calendar</button>
          <div class="export-dropdown hidden" id="export-dropdown"></div>
        </div>
      </div>
    </div>
    <div class="preview-stage" id="preview-stage">
      <div id="export-scaler">
        <div id="export-root"></div>
      </div>
    </div>
  `;

  await renderExportRoot();
  buildExportDropdown();
  fitPreviewScale();
  setTimeout(fitPreviewScale, 200);
  window.addEventListener('resize', fitPreviewScale);

  document.getElementById('export-toggle-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('export-dropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', () => document.getElementById('export-dropdown')?.classList.add('hidden'));

  document.getElementById('pv-client-view-btn').addEventListener('click', async () => {
    State.clientView = !State.clientView;
    await renderPreview(params);
  });
}

function fitPreviewScale() {
  const stage = document.getElementById('preview-stage');
  const scaler = document.getElementById('export-scaler');
  const root = document.getElementById('export-root');
  if (!stage || !scaler || !root) return;
  const available = stage.clientWidth - 40; // account for stage padding
  const naturalWidth = 1400;
  const scale = Math.min(1, available / naturalWidth);
  scaler.style.width = (naturalWidth * scale) + 'px';
  scaler.style.height = (root.offsetHeight * scale) + 'px';
  root.style.transform = `scale(${scale})`;
  root.style.transformOrigin = 'top left';
}

function buildExportDropdown() {
  const dd = document.getElementById('export-dropdown');
  dd.innerHTML = `
    <div class="ed-sub">Export as</div>
    <div class="ed-item" data-export="pdf"><i class="fa-regular fa-file-pdf" style="color:#e74c3c;"></i> PDF Document <span class="ed-hint">Calendar + Content Details</span></div>
    <div class="ed-item" data-export="png"><i class="fa-regular fa-file-image" style="color:#2980b9;"></i> PNG Image <span class="ed-hint">Calendar Overview</span></div>
    <div class="ed-item" data-export="jpeg"><i class="fa-regular fa-file-image" style="color:#27ae60;"></i> JPEG Image <span class="ed-hint">Calendar Overview</span></div>
    <div class="ed-item" data-export="board"><i class="fa-solid fa-images" style="color:#8e44ad;"></i> Content Board PNG <span class="ed-hint">All creatives, large</span></div>
  `;
  dd.addEventListener('click', (e) => e.stopPropagation());
  dd.querySelectorAll('[data-export]').forEach(el => {
    el.addEventListener('click', () => {
      dd.classList.add('hidden');
      openExportOptionsModal(el.dataset.export);
    });
  });
}

function openExportOptionsModal(format) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const isPdf = format === 'pdf';
  const titleMap = { pdf: 'PDF', png: 'PNG', jpeg: 'JPEG', board: 'Content Board PNG' };
  overlay.innerHTML = `
    <div class="modal-panel" style="max-width:440px;">
      <div class="modal-header">
        <h2>Export as ${titleMap[format] || format.toUpperCase()}</h2>
        <button class="modal-close" data-close><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        ${isPdf ? `
          <div class="field">
            <label>Page Size</label>
            <div class="res-select-row">
              <div class="res-opt selected" data-pdfsize="a4">A4 Landscape</div>
              <div class="res-opt" data-pdfsize="a3">A3 Landscape</div>
            </div>
          </div>
          <p class="text-muted" style="font-size:12.5px;line-height:1.5;">Page 1: Branding, client info &amp; Calendar Overview. Page 2 onward: Content Details &mdash; only 2 content pieces per page, shown extra-large and fully readable.</p>
        ` : `
          <div class="field">
            <label>Resolution</label>
            <div class="res-select-row">
              <div class="res-opt selected" data-res="standard">Standard (1920px)</div>
              <div class="res-opt" data-res="high">High-Res (3840px)</div>
              <div class="res-opt" data-res="ultra">Ultra HD / Print</div>
            </div>
          </div>
        `}
        ${format === 'board' ? `<p class="text-muted" style="font-size:12.5px;line-height:1.5;">A single tall image with every scheduled creative shown large, one after another &mdash; ideal for WhatsApp, email, or presentations.</p>` : ''}
        <p class="text-muted" style="font-size:12.5px;line-height:1.5;">The exported file will be named automatically based on the client, outlet, and calendar month for easy sharing.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close>Cancel</button>
        <button class="btn btn-primary" id="do-export-btn"><i class="fa-solid fa-download"></i> Export</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => overlay.remove()));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('[data-pdfsize]').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('[data-pdfsize]').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      exportSettings.pdfSize = el.dataset.pdfsize;
    });
  });
  overlay.querySelectorAll('[data-res]').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('[data-res]').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      exportSettings.resolution = el.dataset.res;
    });
  });

  overlay.querySelector('#do-export-btn').addEventListener('click', async () => {
    const btn = overlay.querySelector('#do-export-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Exporting...';
    try {
      if (format === 'pdf') await exportAsPDF();
      else if (format === 'board') await exportContentBoard();
      else await exportAsImage(format);
      showToast('Export complete', 'success');
      overlay.remove();
    } catch (err) {
      console.error(err);
      showToast('Export failed: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-download"></i> Export';
    }
  });
}

function buildExportFilename(ext, suffix) {
  const { calendar, client, outlet } = EditorCtx;
  const monthLabel = `${QU.MONTH_NAMES[calendar.month]}-${calendar.year}`;
  const parts = [QU.slugify(client.name), QU.slugify(outlet.name || ''), suffix || 'Content-Calendar', monthLabel].filter(Boolean);
  return parts.join('_') + '.' + ext;
}

/** Wait for every <img> in a node to finish loading (data URLs resolve almost
 *  instantly, but this guards against any edge case before html2canvas runs). */
function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll('img'));
  return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
    img.onload = res; img.onerror = res;
  })));
}

async function exportAsImage(format) {
  const node = document.getElementById('export-root');
  const scaleMap = { standard: 1920 / 1400, high: 3840 / 1400, ultra: 5760 / 1400 };
  const scale = scaleMap[exportSettings.resolution] || 2;
  const canvas = await html2canvas(node, { scale, backgroundColor: '#ffffff', useCORS: true });
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mime, 0.95);
  downloadDataUrl(dataUrl, buildExportFilename(format === 'jpeg' ? 'jpg' : 'png'));
}

/* ---------------- Multi-page PDF export ----------------
   Page 1: Branding + Client/Outlet + Calendar Overview + Content/Platform Summary.
   Page 2+: CONTENT DETAILS — only 2 content pieces per page, side by side,
   shown extra-large & fully readable (deliberately few per page so tall
   portrait creatives especially have generous, undistorted room). */
async function exportAsPDF() {
  const { jsPDF } = window.jspdf;
  const format = exportSettings.pdfSize === 'a3' ? 'a3' : 'a4';
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format });
  const pageWidthMM = pdf.internal.pageSize.getWidth();
  const pageHeightMM = pdf.internal.pageSize.getHeight();

  // ---- Page 1: Calendar Overview ----
  const overviewNode = document.getElementById('export-root');
  const overviewCanvas = await html2canvas(overviewNode, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true });
  addCanvasToPdfPage(pdf, overviewCanvas, pageWidthMM, pageHeightMM);

  // ---- Page 2+: Content Details ----
  const ordered = QU.sortedByDate(EditorCtx.items);
  if (ordered.length > 0) {
    const idMap = QU.assignContentIds(EditorCtx.items);
    // Resolve every item's TRUE original image dimensions BEFORE building any
    // card markup. This is the authoritative source used to compute exact
    // proportional (never distorted) sizing for each creative in the PDF.
    await Promise.all(ordered.map(it => QU.ensureItemImageDims(it)));
    const perPage = 2; // only 2 content cards per Content Details export page — larger, more readable creatives
    const chunks = [];
    for (let i = 0; i < ordered.length; i += perPage) chunks.push(ordered.slice(i, i + perPage));

    for (let i = 0; i < chunks.length; i++) {
      const pageNode = buildDetailsExportPage(chunks[i], idMap, i + 1, chunks.length);
      document.body.appendChild(pageNode);
      await waitForImages(pageNode);
      const canvas = await html2canvas(pageNode, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      pageNode.remove();
      pdf.addPage(format, 'landscape');
      addCanvasToPdfPage(pdf, canvas, pageWidthMM, pageHeightMM);
    }
  }

  pdf.save(buildExportFilename('pdf'));
}

function addCanvasToPdfPage(pdf, canvas, pageWidthMM, pageHeightMM) {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const imgRatio = canvas.height / canvas.width;
  let renderWidth = pageWidthMM - 12;
  let renderHeight = renderWidth * imgRatio;
  if (renderHeight > pageHeightMM - 12) {
    renderHeight = pageHeightMM - 12;
    renderWidth = renderHeight / imgRatio;
  }
  const x = (pageWidthMM - renderWidth) / 2;
  const y = (pageHeightMM - renderHeight) / 2;
  pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight);
}

/**
 * Build one detached, fixed-size "Content Details" export page (1400 x ~990px,
 * matching the A-series landscape aspect ratio so it maps cleanly onto a PDF
 * page) containing up to 2 large, readable creative cards side by side —
 * kept deliberately few per page so each creative (especially tall portrait
 * images) has generous room and stays fully readable/legible when zoomed.
 */
function buildDetailsExportPage(items, idMap, pageNum, totalPages) {
  const { calendar, client, outlet } = EditorCtx;
  const clientView = !!State.clientView;
  const settings = State.settings;
  const logoSrc = settings.logo || DEFAULT_LOGO;

  const node = document.createElement('div');
  node.className = 'exp-details-page';
  node.style.position = 'absolute';
  node.style.left = '-99999px';
  node.style.top = '0';
  node.innerHTML = `
    <div class="exp-details-header">
      <div class="exp-details-header-left">
        <img src="${logoSrc}" alt="logo" />
        <div>
          <div class="exp-details-title">CONTENT DETAILS</div>
          <div class="exp-details-sub">${QU.escapeHtml(client.name)}${outlet.name ? ' · ' + QU.escapeHtml(outlet.name) : ''} — ${QU.MONTH_NAMES[calendar.month]} ${calendar.year}</div>
        </div>
      </div>
      <div class="exp-details-page-num">Page ${pageNum + 1} of ${totalPages + 1}</div>
    </div>
    <div class="exp-details-grid">
      ${items.map(item => expDetailCardHtml(item, idMap[item.id], clientView)).join('')}
    </div>
  `;
  return node;
}

function expDetailCardHtml(item, contentId, clientView) {
  const platforms = item.platforms || [];
  const img = item.image || item.thumbnail;
  const d = QU.parseISODate(item.date);
  const dateShort = `${String(d.getDate()).padStart(2, '0')} ${QU.MONTH_NAMES[d.getMonth()].toUpperCase()}`;
  // Orientation-adaptive PDF media area (see css .edc-media.edc-portrait /
  // .edc-landscape / .edc-square). Requires item.imageWidth/imageHeight to
  // already be resolved by the caller (buildDetailsExportPage awaits
  // QU.ensureItemImageDims for every item first). The <img> gets EXPLICIT
  // width/height attributes reflecting the true original aspect ratio so
  // html2canvas rasterizes it at the correct proportions — no CSS
  // object-fit/aspect-ratio combo relied on for the actual shape.
  const orientation = QU.orientationOf(item.imageWidth, item.imageHeight);
  return `
    <div class="exp-detail-card">
      <div class="edc-date-header">
        <span class="edc-date">${dateShort} <span class="edc-weekday">· ${QU.weekdayName(item.date)}</span></span>
        <span class="edc-cid">${contentId || ''}</span>
      </div>
      <div class="edc-media edc-${orientation}">
        ${img ? `<img src="${img}" alt="" width="${item.imageWidth || ''}" height="${item.imageHeight || ''}" />` : `<div class="edc-noimg"></div>`}
      </div>
      <div class="edc-body">
        <div class="edc-title">${QU.escapeHtml(item.title || item.contentType || 'Untitled')}</div>
        <div class="edc-type-row">
          <span class="edc-type">${QU.escapeHtml(item.contentType || '')}</span>
          ${platforms.map(p => `<span class="edc-platform">${QU.escapeHtml(p)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ---------------- Content Board export (all creatives, large, sequential) ---------------- */
async function exportContentBoard() {
  const ordered = QU.sortedByDate(EditorCtx.items);
  if (ordered.length === 0) {
    showToast('No content to include in the board yet.', 'error');
    return;
  }
  const idMap = QU.assignContentIds(EditorCtx.items);
  // Resolve TRUE original image dimensions for every item first so the board
  // can size/orient each creative exactly to its real aspect ratio.
  await Promise.all(ordered.map(it => QU.ensureItemImageDims(it)));
  const node = buildContentBoardNode(ordered, idMap);
  document.body.appendChild(node);
  await waitForImages(node);
  const scaleMap = { standard: 1.3, high: 1.8, ultra: 2.4 };
  const scale = scaleMap[exportSettings.resolution] || 1.8;
  const canvas = await html2canvas(node, { scale, backgroundColor: '#ffffff', useCORS: true });
  const dataUrl = canvas.toDataURL('image/png', 0.95);
  node.remove();
  downloadDataUrl(dataUrl, buildExportFilename('png', 'Detailed-Content-Board'));
}

function buildContentBoardNode(items, idMap) {
  const { calendar, client, outlet } = EditorCtx;
  const clientView = !!State.clientView;
  const settings = State.settings;
  const logoSrc = settings.logo || DEFAULT_LOGO;

  const node = document.createElement('div');
  node.className = 'exp-board';
  node.style.position = 'absolute';
  node.style.left = '-99999px';
  node.style.top = '0';
  node.innerHTML = `
    <div class="exp-board-header">
      <img src="${logoSrc}" alt="logo" />
      <div class="exp-board-title">CONTENT CALENDAR</div>
      <div class="exp-board-client">${QU.escapeHtml(client.name).toUpperCase()}${outlet.name ? ' · ' + QU.escapeHtml(outlet.name) : ''}</div>
      <div class="exp-board-month">${QU.MONTH_NAMES[calendar.month]} ${calendar.year}</div>
    </div>
    ${items.map(item => boardItemHtml(item, idMap[item.id], clientView)).join('')}
    <div class="exp-board-footer">
      <div>Created by ${QU.escapeHtml(settings.agencyName || 'Q-Mark Media')}</div>
      <div class="exp-board-tag">Make Your Brand Matter.</div>
    </div>
  `;
  return node;
}

function boardItemHtml(item, contentId, clientView) {
  const platforms = item.platforms || [];
  const img = item.image || item.thumbnail;
  const d = QU.parseISODate(item.date);
  const dateLabel = `${String(d.getDate()).padStart(2, '0')} ${QU.MONTH_NAMES[d.getMonth()].toUpperCase()}`;
  const orientation = QU.orientationOf(item.imageWidth, item.imageHeight);
  return `
    <div class="exp-board-divider"></div>
    <div class="exp-board-item">
      <div class="ebi-header">
        <span class="ebi-date">${dateLabel} <span class="ebi-weekday">· ${QU.weekdayName(item.date)}</span></span>
        <span class="ebi-cid">${contentId || ''}</span>
      </div>
      <div class="ebi-media ebi-${orientation}">
        ${img ? `<img src="${img}" alt="" width="${item.imageWidth || ''}" height="${item.imageHeight || ''}" />` : `<div class="ebi-noimg"></div>`}
      </div>
      <div class="ebi-title">${QU.escapeHtml(item.title || '')}</div>
      <div class="ebi-type-row">
        <span class="ebi-type">${QU.escapeHtml(item.contentType || '')}</span>
        ${platforms.map(p => `<span class="ebi-platform">${QU.escapeHtml(p)}</span>`).join('')}
      </div>
      ${(!clientView && item.status) ? `<div class="ebi-status">${QU.escapeHtml(item.status)}</div>` : ''}
    </div>
  `;
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---------------- Export root rendering (Calendar Overview — the client-facing design) ---------------- */

async function renderExportRoot() {
  const { calendar, client, outlet, items } = EditorCtx;
  const display = calendar.display || {};
  const weekStart = calendar.weekStartDay === 'sunday' ? 'sunday' : 'monday';
  const grid = QU.buildCalendarGrid(calendar.year, calendar.month, weekStart);
  const stats = computeStats(items, calendar);
  const idMap = QU.assignContentIds(items);
  // Calendar-thumbnail carve-out: the thumbnail box itself may stay a fixed
  // small size, but the creative inside must keep its true aspect ratio.
  // html2canvas does not reliably honor CSS object-fit:contain inside a
  // fixed box, so instead we compute the exact letterboxed pixel size in JS
  // (scale = min(boxW/imgW, boxH/imgH)) and set it as an EXPLICIT width/height
  // on the <img> itself — this renders correctly on screen AND in every
  // html2canvas-based export (PDF page 1, PNG, JPEG).
  await Promise.all(items.map(it => QU.ensureItemImageDims(it)));
  const THUMB_BOX_W = 156, THUMB_BOX_H = 96;

  const itemsByDate = {};
  items.forEach(it => {
    if (!itemsByDate[it.date]) itemsByDate[it.date] = [];
    itemsByDate[it.date].push(it);
  });

  const settings = State.settings;
  const logoSrc = settings.logo || DEFAULT_LOGO;

  // Exact-match counts (per the Content Summary spec): each metric counts only
  // items whose contentType is EXACTLY that named type — no substring guessing —
  // so renamed/custom types never accidentally double-count or miss.
  const staticCount = stats.byType['Static Post'] || 0;
  const reelCount = stats.byType['Reel'] || 0;
  const storyCount = stats.byType['Story'] || 0;
  const adCreativeCount = stats.byType['Ad Creative'] || 0;
  const festiveCount = stats.byType['Festive / Special Day Poster'] || 0;

  let bodyHtml = `
    ${display.showBranding !== false ? `
      <header class="exp-header">
        <div class="exp-header-left">
          <img src="${logoSrc}" alt="logo" />
          <div>
            <h1 class="exp-client-name">${QU.escapeHtml(client.name).toUpperCase()}</h1>
            ${display.showLocation !== false ? `<div class="exp-outlet-loc">${QU.escapeHtml(outlet.name || '')}${outlet.locationName ? ' · ' + QU.escapeHtml(outlet.locationName) : ''}</div>` : ''}
          </div>
        </div>
        ${display.showMonthYear !== false ? `
          <div class="exp-header-right">
            <div class="exp-cc-label">Content Calendar</div>
            <div class="exp-month">${QU.MONTH_NAMES[calendar.month]} ${calendar.year}</div>
          </div>
        ` : ''}
      </header>
    ` : `
      <header class="exp-header">
        <div><h1 class="exp-client-name">${QU.escapeHtml(client.name).toUpperCase()}</h1></div>
        ${display.showMonthYear !== false ? `<div class="exp-header-right"><div class="exp-month">${QU.MONTH_NAMES[calendar.month]} ${calendar.year}</div></div>` : ''}
      </header>
    `}

    <div class="exp-cal-weekdays">${grid.weekdayLabels.map(d => `<div>${d}</div>`).join('')}</div>
    <div class="exp-cal-grid">
  `;

  grid.weeks.forEach(week => {
    week.forEach(cell => {
      if (!cell) { bodyHtml += `<div class="exp-cell empty"></div>`; return; }
      const dayItems = itemsByDate[cell.iso] || [];
      bodyHtml += `
        <div class="exp-cell">
          <div class="exp-date-num">${cell.day}</div>
          ${dayItems.map(it => {
            const fit = QU.fitContain(it.imageWidth, it.imageHeight, THUMB_BOX_W, THUMB_BOX_H);
            return `
            <div class="exp-item">
              <div class="exp-item-media">
                ${it.thumbnail ? `<img src="${it.thumbnail}" alt="" width="${fit.width}" height="${fit.height}" />` : `<div class="exp-item-noimg"></div>`}
              </div>
              <div class="exp-item-txt">
                <div class="exp-item-idrow">
                  <span class="exp-item-cid">${idMap[it.id] || ''}</span>
                  ${display.showContentType !== false ? `<span class="exp-item-type">${QU.escapeHtml(it.contentType)}</span>` : ''}
                </div>
                ${display.showPlatforms !== false ? `<div class="exp-item-pf">${(it.platforms||[]).slice(0,3).map(p => `<span>${QU.escapeHtml(QU.shortPlatform(p))}</span>`).join('')}</div>` : ''}
              </div>
            </div>
          `;
          }).join('')}
        </div>
      `;
    });
  });
  bodyHtml += `</div>`;

  if (display.showStats !== false) {
    const allPlatforms = Object.keys(stats.byPlatform);
    bodyHtml += `
      <div class="exp-summary">
        <div class="exp-summary-block">
          <h4>Content Summary</h4>
          <div class="exp-summary-nums">
            <div><div class="n">${staticCount}</div><div class="l">Static Posts</div></div>
            <div><div class="n">${reelCount}</div><div class="l">Reels</div></div>
            <div><div class="n">${storyCount}</div><div class="l">Stories</div></div>
            <div><div class="n">${adCreativeCount}</div><div class="l">Ad Creatives</div></div>
            <div><div class="n">${festiveCount}</div><div class="l">Festive / Special Day Posters</div></div>
            <div><div class="n">${stats.total}</div><div class="l">Total Content</div></div>
            <div><div class="n">${stats.postingDays}</div><div class="l">Posting Days</div></div>
          </div>
        </div>
        <div class="exp-summary-block">
          <h4>Platforms</h4>
          <div class="exp-platform-tags">${allPlatforms.map(p => `<span>${QU.escapeHtml(p)}</span>`).join('') || '<span>None</span>'}</div>
        </div>
      </div>
    `;
  }

  if (display.showBranding !== false) {
    bodyHtml += `
      <div class="exp-footer">
        <div class="ef-brand">Created by ${QU.escapeHtml(settings.agencyName || 'Q-Mark Media')}</div>
        <div class="ef-tag">Make Your Brand Matter.</div>
      </div>
    `;
  }

  document.getElementById('export-root').innerHTML = bodyHtml;
}

window.renderPreview = renderPreview;
