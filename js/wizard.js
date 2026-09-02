/* ==========================================================================
   Q-MARK MEDIA — Create New Calendar wizard (3 steps)
   ========================================================================== */

let wizardState = null;

function freshWizardState() {
  const now = new Date();
  return {
    step: 1,
    clientName: '',
    outlets: [{ id: uid(), name: '', locationName: '', latitude: '', longitude: '' }],
    activeOutletIndex: 0,
    month: now.getMonth(),
    year: now.getFullYear(),
    startDate: '',
    endDate: '',
    weekStart: 'monday',
    display: {
      showContentType: true,
      showPlatforms: true,
      showLocation: true,
      showStats: true,
      showBranding: true,
      showMonthYear: true
    }
  };
}

function renderWizard() {
  wizardState = freshWizardState();
  syncWizardDatesFromMonth();
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">New Calendar</p>
        <h1>Create Content Calendar</h1>
        <p>Set up client details, calendar period, and layout preferences.</p>
      </div>
      <button class="btn btn-ghost" onclick="navigate('/dashboard')"><i class="fa-solid fa-xmark"></i> Cancel</button>
    </div>
    <div class="wizard-steps" id="wizard-steps"></div>
    <div id="wizard-body" style="max-width:720px;"></div>
  `;
  renderWizardSteps();
  renderWizardStep();
}

function renderWizardSteps() {
  const labels = ['Client Details', 'Calendar Period', 'Calendar Settings'];
  const el = document.getElementById('wizard-steps');
  el.innerHTML = labels.map((label, i) => {
    const stepNum = i + 1;
    const cls = wizardState.step === stepNum ? 'active' : wizardState.step > stepNum ? 'done' : '';
    return `
      <div class="wizard-step ${cls}">
        <div class="dot">${wizardState.step > stepNum ? '<i class="fa-solid fa-check"></i>' : stepNum}</div>
        <div class="label">${label}</div>
      </div>
      ${stepNum < 3 ? '<div class="wizard-line"></div>' : ''}
    `;
  }).join('');
}

function renderWizardStep() {
  renderWizardSteps();
  const body = document.getElementById('wizard-body');
  if (wizardState.step === 1) body.innerHTML = wizardStep1Html();
  else if (wizardState.step === 2) body.innerHTML = wizardStep2Html();
  else body.innerHTML = wizardStep3Html();
  attachWizardStepListeners();
}

/* ---------- STEP 1 ---------- */
function wizardStep1Html() {
  return `
    <div class="section-card">
      <h3>Client Details</h3>
      <p class="hint">Enter the client name and add one or more outlets / branches.</p>
      <div class="field">
        <label>Client Name <span class="req">*</span></label>
        <input type="text" id="w-client-name" placeholder="e.g. Linen Club" value="${QU.escapeHtml(wizardState.clientName)}" />
      </div>
      <div id="outlets-container"></div>
      <button class="btn btn-secondary btn-sm" id="add-outlet-btn"><i class="fa-solid fa-plus"></i> Add Another Outlet</button>
    </div>
    <div class="wizard-footer">
      <div></div>
      <button class="btn btn-primary" id="wizard-next-1">Continue <i class="fa-solid fa-arrow-right"></i></button>
    </div>
  `;
}

function renderOutletsContainer() {
  const container = document.getElementById('outlets-container');
  if (!container) return;
  container.innerHTML = wizardState.outlets.map((o, idx) => `
    <div class="outlet-block" data-idx="${idx}">
      <div class="ob-head">
        <span>Outlet ${idx + 1}</span>
        ${wizardState.outlets.length > 1 ? `<button class="btn-ghost btn-sm" style="color:#c0392b;padding:4px 8px;" data-remove-outlet="${idx}"><i class="fa-regular fa-trash-can"></i></button>` : ''}
      </div>
      <div class="field-row">
        <div class="field">
          <label>Outlet / Branch / Sub Name</label>
          <input type="text" data-outlet-field="name" data-idx="${idx}" placeholder="e.g. Forum Mall Kochi" value="${QU.escapeHtml(o.name)}" />
        </div>
        <div class="field">
          <label>Location Name</label>
          <input type="text" data-outlet-field="locationName" data-idx="${idx}" placeholder="e.g. Kochi, Kerala" value="${QU.escapeHtml(o.locationName)}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Latitude <span class="opt">(optional)</span></label>
          <input type="text" data-outlet-field="latitude" data-idx="${idx}" placeholder="e.g. 10.0159" value="${QU.escapeHtml(o.latitude)}" />
        </div>
        <div class="field">
          <label>Longitude <span class="opt">(optional)</span></label>
          <input type="text" data-outlet-field="longitude" data-idx="${idx}" placeholder="e.g. 76.3419" value="${QU.escapeHtml(o.longitude)}" />
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-outlet-field]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.outletField;
      wizardState.outlets[idx][field] = e.target.value;
    });
  });
  container.querySelectorAll('[data-remove-outlet]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeOutlet);
      wizardState.outlets.splice(idx, 1);
      renderOutletsContainer();
    });
  });
}

/* ---------- STEP 2 ---------- */
function syncWizardDatesFromMonth() {
  const totalDays = QU.daysInMonth(wizardState.year, wizardState.month);
  wizardState.startDate = QU.toISODate(wizardState.year, wizardState.month + 1, 1);
  wizardState.endDate = QU.toISODate(wizardState.year, wizardState.month + 1, totalDays);
}

function wizardStep2Html() {
  const totalDays = QU.daysInMonth(wizardState.year, wizardState.month);
  const startWeekday = QU.weekdayName(wizardState.startDate);
  const endWeekday = QU.weekdayName(wizardState.endDate);
  const yearOptions = [];
  const curYear = new Date().getFullYear();
  for (let y = curYear - 1; y <= curYear + 5; y++) yearOptions.push(y);

  return `
    <div class="section-card">
      <h3>Calendar Period</h3>
      <p class="hint">Select the calendar month and year, or set custom start/end dates.</p>
      <div class="field">
        <label>Calendar Month &amp; Year</label>
        <div class="month-year-select">
          <select id="w-month">
            ${QU.MONTH_NAMES.map((m, i) => `<option value="${i}" ${i === wizardState.month ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select id="w-year">
            ${yearOptions.map(y => `<option value="${y}" ${y === wizardState.year ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Month Start Date</label>
          <input type="date" id="w-start-date" value="${wizardState.startDate}" />
        </div>
        <div class="field">
          <label>Month End Date</label>
          <input type="date" id="w-end-date" value="${wizardState.endDate}" />
        </div>
      </div>
      <div id="date-error" style="color:#c0392b;font-size:12.5px;font-weight:600;margin-bottom:8px;"></div>
      <div class="date-summary" id="date-summary">
        ${dateSummaryHtml(totalDays, startWeekday, endWeekday)}
      </div>
    </div>
    <div class="wizard-footer">
      <button class="btn btn-secondary" id="wizard-back-2"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <button class="btn btn-primary" id="wizard-next-2">Continue <i class="fa-solid fa-arrow-right"></i></button>
    </div>
  `;
}

function dateSummaryHtml(totalDays, startWeekday, endWeekday) {
  return `
    <div class="ds-item"><div class="ds-val">${totalDays}</div><div class="ds-lbl">Total Days</div></div>
    <div class="ds-item"><div class="ds-val">${startWeekday.slice(0,3)}</div><div class="ds-lbl">Starts</div></div>
    <div class="ds-item"><div class="ds-val">${endWeekday.slice(0,3)}</div><div class="ds-lbl">Ends</div></div>
    <div class="ds-item"><div class="ds-val">${Math.ceil(totalDays/7)}</div><div class="ds-lbl">Weeks</div></div>
  `;
}

function updateDateSummary() {
  const errEl = document.getElementById('date-error');
  const summaryEl = document.getElementById('date-summary');
  if (!wizardState.startDate || !wizardState.endDate) return;
  const start = QU.parseISODate(wizardState.startDate);
  const end = QU.parseISODate(wizardState.endDate);
  if (end < start) {
    errEl.textContent = 'End date must be on or after the start date.';
    summaryEl.style.opacity = '.4';
    return;
  }
  errEl.textContent = '';
  summaryEl.style.opacity = '1';
  const totalDays = QU.daysBetweenInclusive(wizardState.startDate, wizardState.endDate);
  summaryEl.innerHTML = dateSummaryHtml(totalDays, QU.weekdayName(wizardState.startDate), QU.weekdayName(wizardState.endDate));
}

/* ---------- STEP 3 ---------- */
function wizardStep3Html() {
  const layouts = [
    { key: 'monday', title: 'Monday Start', desc: 'Week begins Monday', icon: 'fa-calendar-week' },
    { key: 'sunday', title: 'Sunday Start', desc: 'Week begins Sunday', icon: 'fa-calendar-days' },
    { key: 'standard', title: 'Standard Monthly', desc: 'Classic monthly grid', icon: 'fa-table-cells' }
  ];
  const toggles = [
    { key: 'showContentType', label: 'Show Content Type', desc: 'Display content type label on each card' },
    { key: 'showPlatforms', label: 'Show Platforms', desc: 'Display platform badges on each card' },
    { key: 'showLocation', label: 'Show Client Location', desc: 'Display outlet location in calendar header' },
    { key: 'showStats', label: 'Show Content Statistics', desc: 'Display summary statistics panel' },
    { key: 'showBranding', label: 'Show Q-Mark Media Branding', desc: 'Display agency logo and footer branding' },
    { key: 'showMonthYear', label: 'Show Calendar Month and Year', desc: 'Display month/year heading' }
  ];
  return `
    <div class="section-card">
      <h3>Calendar Layout</h3>
      <p class="hint">Choose how weeks are arranged in the calendar grid.</p>
      <div class="layout-options">
        ${layouts.map(l => `
          <div class="layout-option ${wizardState.weekStart === l.key ? 'selected' : ''}" data-layout="${l.key}">
            <i class="fa-solid ${l.icon}" style="font-size:20px;color:var(--blue);"></i>
            <div class="lo-title">${l.title}</div>
            <div class="lo-desc">${l.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="section-card">
      <h3>Display Options</h3>
      <p class="hint">Choose what appears on the calendar and exported preview.</p>
      <div class="toggle-list">
        ${toggles.map(t => `
          <div class="toggle-row">
            <div>
              <div class="tr-label">${t.label}</div>
              <div class="tr-desc">${t.desc}</div>
            </div>
            <label class="switch">
              <input type="checkbox" data-toggle="${t.key}" ${wizardState.display[t.key] ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="wizard-footer">
      <button class="btn btn-secondary" id="wizard-back-3"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <button class="btn btn-primary btn-lg" id="wizard-finish"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate Calendar</button>
    </div>
  `;
}

/* ---------- Listeners ---------- */
function attachWizardStepListeners() {
  if (wizardState.step === 1) {
    renderOutletsContainer();
    document.getElementById('w-client-name').addEventListener('input', (e) => wizardState.clientName = e.target.value);
    document.getElementById('add-outlet-btn').addEventListener('click', () => {
      wizardState.outlets.push({ id: uid(), name: '', locationName: '', latitude: '', longitude: '' });
      renderOutletsContainer();
    });
    document.getElementById('wizard-next-1').addEventListener('click', () => {
      if (!wizardState.clientName.trim()) {
        showToast('Please enter a client name', 'error');
        return;
      }
      wizardState.step = 2;
      renderWizardStep();
    });
  } else if (wizardState.step === 2) {
    document.getElementById('w-month').addEventListener('change', (e) => {
      wizardState.month = Number(e.target.value);
      syncWizardDatesFromMonth();
      renderWizardStep();
    });
    document.getElementById('w-year').addEventListener('change', (e) => {
      wizardState.year = Number(e.target.value);
      syncWizardDatesFromMonth();
      renderWizardStep();
    });
    document.getElementById('w-start-date').addEventListener('change', (e) => {
      wizardState.startDate = e.target.value;
      updateDateSummary();
    });
    document.getElementById('w-end-date').addEventListener('change', (e) => {
      wizardState.endDate = e.target.value;
      updateDateSummary();
    });
    document.getElementById('wizard-back-2').addEventListener('click', () => { wizardState.step = 1; renderWizardStep(); });
    document.getElementById('wizard-next-2').addEventListener('click', () => {
      const start = QU.parseISODate(wizardState.startDate);
      const end = QU.parseISODate(wizardState.endDate);
      if (end < start) { showToast('End date must be after start date', 'error'); return; }
      wizardState.step = 3;
      renderWizardStep();
    });
  } else {
    document.querySelectorAll('[data-layout]').forEach(el => {
      el.addEventListener('click', () => {
        wizardState.weekStart = el.dataset.layout;
        renderWizardStep();
      });
    });
    document.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('change', (e) => {
        wizardState.display[el.dataset.toggle] = e.target.checked;
      });
    });
    document.getElementById('wizard-back-3').addEventListener('click', () => { wizardState.step = 2; renderWizardStep(); });
    document.getElementById('wizard-finish').addEventListener('click', finishWizard);
  }
}

async function finishWizard() {
  const btn = document.getElementById('wizard-finish');
  const originalLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating...';

  try {
    const client = {
      id: uid(),
      name: wizardState.clientName.trim(),
      outlets: wizardState.outlets.map(o => ({ ...o, name: o.name.trim(), locationName: o.locationName.trim() }))
    };
    await DB.put('clients', client);

    const start = QU.parseISODate(wizardState.startDate);
    const calendar = {
      id: uid(),
      clientId: client.id,
      outletId: client.outlets[0] ? client.outlets[0].id : null,
      month: start.getMonth(),
      year: start.getFullYear(),
      startDate: wizardState.startDate,
      endDate: wizardState.endDate,
      weekStartDay: wizardState.weekStart,
      display: { ...wizardState.display },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await DB.put('calendars', calendar);

    await refreshData();
    showToast('Calendar created successfully', 'success');
    navigate('/editor/' + calendar.id);
  } catch (err) {
    console.error('Failed to create calendar:', err);
    showToast('Could not create the calendar. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalLabel;
  }
}

window.renderWizard = renderWizard;
