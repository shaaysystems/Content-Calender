/* ==========================================================================
   Q-MARK MEDIA — Settings view
   ========================================================================== */

async function renderSettings() {
  const root = document.getElementById('view-root');
  const s = State.settings;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Settings</p>
        <h1>Agency Settings</h1>
        <p>Customize your agency branding, colors, and export preferences.</p>
      </div>
    </div>

    <div class="settings-grid">
      <div>
        <div class="section-card">
          <h3>Agency Identity</h3>
          <p class="hint">This information appears in the app header and on exported calendars.</p>
          <div class="field">
            <label>Agency Name</label>
            <input type="text" id="s-agency-name" value="${QU.escapeHtml(s.agencyName)}" />
          </div>
          <div class="field">
            <label>Agency Logo</label>
            <div class="logo-preview-box"><img id="s-logo-preview" src="${s.logo || DEFAULT_LOGO}" alt="logo" /></div>
            <div class="flex gap-8">
              <button class="btn btn-secondary btn-sm" id="s-upload-logo-btn"><i class="fa-solid fa-upload"></i> Upload New Logo</button>
              <button class="btn btn-ghost btn-sm" id="s-reset-logo-btn">Reset to Default</button>
            </div>
            <input type="file" id="s-logo-input" accept="image/*" style="display:none;" />
          </div>
        </div>

        <div class="section-card">
          <h3>Brand Colors</h3>
          <p class="hint">Adjust brand colors used throughout the app and exported calendars.</p>
          <div class="color-swatch-row">
            ${colorSwatch('blue', 'Primary Blue', s.colors.blue)}
            ${colorSwatch('lime', 'Accent Lime', s.colors.lime)}
            ${colorSwatch('offWhite', 'Off White', s.colors.offWhite)}
            ${colorSwatch('charcoal', 'Charcoal', s.colors.charcoal)}
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:16px;" id="s-reset-colors-btn">Reset to Q-Mark Defaults</button>
        </div>

        <div class="section-card">
          <h3>Export Branding</h3>
          <div class="toggle-row" style="border-bottom:none;">
            <div>
              <div class="tr-label">Show Q-Mark Media Branding</div>
              <div class="tr-desc">Display logo and "Make Your Brand Matter" footer on exported calendars</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="s-show-branding" ${s.showBranding ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <div class="section-card">
          <h3>Appearance</h3>
          <div class="toggle-row" style="border-bottom:none;">
            <div class="tr-label">Dark Mode</div>
            <label class="switch">
              <input type="checkbox" id="s-dark-mode" ${s.darkMode ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="section-card">
          <h3>Data &amp; Storage</h3>
          <p class="hint">All data is stored locally in your browser (IndexedDB). No cloud account is required and the app works fully offline.</p>
          <button class="btn btn-secondary btn-block" id="s-export-data-btn" style="margin-bottom:10px;"><i class="fa-solid fa-file-export"></i> Export All Data (JSON Backup)</button>
          <button class="btn btn-danger btn-block" id="s-clear-data-btn"><i class="fa-regular fa-trash-can"></i> Clear All Data</button>
        </div>
        <div class="section-card">
          <h3>About</h3>
          <p class="hint" style="margin-bottom:0;">Q-Mark Media Content Calendar v1.0<br/>Premium offline-first agency planning tool.</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('s-agency-name').addEventListener('input', QU.debounce(async (e) => {
    s.agencyName = e.target.value;
    await DB.put('settings', s);
    applySettingsToDOM();
  }, 300));

  document.getElementById('s-upload-logo-btn').addEventListener('click', () => document.getElementById('s-logo-input').click());
  document.getElementById('s-logo-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.match(/^image\//)) {
      showToast('Please upload an image file', 'error');
      return;
    }
    const btn = document.getElementById('s-upload-logo-btn');
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="border-top-color:var(--text-1);border-color:rgba(0,0,0,.2);"></span> Uploading...';
    try {
      const dataUrl = await QU.fileToDataURL(file);
      const resized = await QU.resizeImage(dataUrl, 600, 0.92);
      s.logo = resized;
      await DB.put('settings', s);
      applySettingsToDOM();
      document.getElementById('s-logo-preview').src = resized;
      showToast('Logo updated', 'success');
    } catch (err) {
      console.error('Failed to update logo:', err);
      showToast('Could not update the logo. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  });
  document.getElementById('s-reset-logo-btn').addEventListener('click', async () => {
    s.logo = DEFAULT_LOGO;
    await DB.put('settings', s);
    applySettingsToDOM();
    document.getElementById('s-logo-preview').src = DEFAULT_LOGO;
    showToast('Logo reset to default', 'success');
  });

  ['blue','lime','offWhite','charcoal'].forEach(key => {
    const input = document.getElementById('s-color-' + key);
    if (input) input.addEventListener('input', async (e) => {
      s.colors[key] = e.target.value;
      await DB.put('settings', s);
      applySettingsToDOM();
    });
  });

  document.getElementById('s-reset-colors-btn').addEventListener('click', async () => {
    s.colors = { blue: '#015EFE', lime: '#C4F016', offWhite: '#FAF9F6', charcoal: '#323131' };
    await DB.put('settings', s);
    applySettingsToDOM();
    renderSettings();
    showToast('Colors reset to defaults', 'success');
  });

  document.getElementById('s-show-branding').addEventListener('change', async (e) => {
    s.showBranding = e.target.checked;
    await DB.put('settings', s);
  });

  document.getElementById('s-dark-mode').addEventListener('change', async (e) => {
    s.darkMode = e.target.checked;
    await DB.put('settings', s);
    applySettingsToDOM();
  });

  document.getElementById('s-export-data-btn').addEventListener('click', exportAllDataBackup);
  document.getElementById('s-clear-data-btn').addEventListener('click', clearAllData);
}

function colorSwatch(key, label, value) {
  return `
    <div class="color-swatch">
      <input type="color" id="s-color-${key}" value="${value}" />
      <div class="sw-label">${label}</div>
    </div>
  `;
}

async function exportAllDataBackup() {
  const clients = await DB.getAll('clients');
  const calendars = await DB.getAll('calendars');
  const contentItems = await DB.getAll('contentItems');
  const settings = await DB.getAll('settings');
  const backup = { clients, calendars, contentItems, settings, exportedAt: Date.now() };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Qmark-Calendar-Backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Backup exported', 'success');
}

async function clearAllData() {
  if (!confirm('This will permanently delete ALL clients, calendars, and content. Continue?')) return;
  if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
  await DB.clear('clients');
  await DB.clear('calendars');
  await DB.clear('contentItems');
  showToast('All data cleared', 'success');
  await refreshData();
  navigate('/dashboard');
}

window.renderSettings = renderSettings;
