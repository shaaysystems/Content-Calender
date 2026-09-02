/* ==========================================================================
   Q-MARK MEDIA — Core app shell: routing, header, global state, settings
   ========================================================================== */

const DEFAULT_LOGO = 'images/qmark-logo.png';

const State = {
  settings: null,
  clients: [],
  calendars: [],
  route: { name: 'dashboard', params: {} },
  searchQuery: '',
  clientView: false
};

async function loadSettings() {
  let s = await DB.get('settings', 'app');
  if (!s) {
    s = {
      id: 'app',
      agencyName: 'Q-Mark Media',
      logo: DEFAULT_LOGO,
      colors: { blue: '#015EFE', lime: '#C4F016', offWhite: '#FAF9F6', charcoal: '#323131' },
      showBranding: true,
      darkMode: false
    };
    await DB.put('settings', s);
  }
  State.settings = s;
  applySettingsToDOM();
}

function applySettingsToDOM() {
  const s = State.settings;
  if (!s) return;
  const root = document.documentElement;
  root.style.setProperty('--blue', s.colors.blue);
  root.style.setProperty('--lime', s.colors.lime);
  root.style.setProperty('--off-white', s.colors.offWhite);
  root.style.setProperty('--charcoal', s.colors.charcoal);
  document.body.classList.toggle('dark', !!s.darkMode);
  document.querySelectorAll('.logo-img').forEach(img => img.src = s.logo || DEFAULT_LOGO);
  document.title = `${s.agencyName} — Content Calendar`;
}

/* ---------------- Router ---------------- */

const routes = {
  dashboard: () => renderDashboard(),
  create: (params) => renderWizard(params),
  editor: (params) => renderEditor(params),
  library: (params) => renderLibrary(params),
  details: (params) => renderContentDetails(params),
  preview: (params) => renderPreview(params),
  settings: () => renderSettings()
};
window.routes = routes;

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = hash.split('/').filter(Boolean);
  const params = {};
  if (rest.length) params.id = rest[0];
  return { name: name || 'dashboard', params };
}

async function router() {
  const { name, params } = parseHash();
  State.route = { name, params };
  updateHeaderNav(name);
  const root = document.getElementById('view-root');
  root.classList.add('hidden');
  await refreshData();
  const fn = routes[name] || routes.dashboard;
  try {
    await fn(params);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Something went wrong</h4><p>${QU.escapeHtml(err.message || '')}</p></div>`;
  }
  root.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navigate(hash) {
  location.hash = hash;
}

async function refreshData() {
  State.clients = await DB.getAll('clients');
  State.calendars = await DB.getAll('calendars');
}

function updateHeaderNav(active) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === active || (active==='editor'&&btn.dataset.route==='dashboard'&&false));
  });
}

/* ---------------- Header ---------------- */

function renderHeader() {
  const header = document.getElementById('app-header');
  header.innerHTML = `
    <div class="header-left">
      <img class="logo-img" src="${DEFAULT_LOGO}" alt="Q-Mark Media" />
      <div class="header-title">Content Calendar<small>Q-Mark Media</small></div>
      <nav class="header-nav">
        <button class="nav-btn" data-route="dashboard">Dashboard</button>
        <button class="nav-btn" data-route="settings">Settings</button>
      </nav>
    </div>
    <div class="header-right">
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="global-search" type="text" placeholder="Search clients, outlets, months..." />
      </div>
      <button class="icon-btn" id="theme-toggle-btn" title="Toggle dark mode"><i class="fa-solid fa-moon"></i></button>
      <button class="icon-btn" data-route="settings" title="Settings"><i class="fa-solid fa-gear"></i></button>
      <button class="btn btn-primary" id="header-create-btn"><i class="fa-solid fa-plus"></i> Create New Calendar</button>
    </div>
  `;
  header.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => navigate('/' + btn.dataset.route));
  });
  document.getElementById('header-create-btn').addEventListener('click', () => navigate('/create'));
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleDarkMode);

  const searchInput = document.getElementById('global-search');
  searchInput.addEventListener('input', QU.debounce((e) => {
    State.searchQuery = e.target.value.trim().toLowerCase();
    if (State.searchQuery) navigate('/dashboard');
    if (State.route.name === 'dashboard') renderDashboard();
  }, 250));
}

async function toggleDarkMode() {
  State.settings.darkMode = !State.settings.darkMode;
  await DB.put('settings', State.settings);
  applySettingsToDOM();
}

/* ---------------- Init ---------------- */

async function initApp() {
  renderHeader();
  await loadSettings();
  await refreshData();
  router();
  window.addEventListener('hashchange', router);

  const loader = document.getElementById('loading-screen');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 400);
  }
}

document.addEventListener('DOMContentLoaded', initApp);

/* Register service worker for offline PWA support.
   Any waiting/updated worker is activated immediately and the page reloads
   once, so users always run the latest app code (bug fixes included)
   instead of getting stuck on a stale cached version indefinitely. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // If there's already a worker waiting to activate, activate it now.
      if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });
    }).catch(() => {});

    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      location.reload();
    });
  });
}

window.State = State;
window.navigate = navigate;
window.refreshData = refreshData;
window.applySettingsToDOM = applySettingsToDOM;
window.DEFAULT_LOGO = DEFAULT_LOGO;
