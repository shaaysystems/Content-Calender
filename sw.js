/* ==========================================================================
   Q-MARK MEDIA — Service Worker
   Provides offline capability for the app shell.

   IMPORTANT: App code (HTML/CSS/JS) uses a NETWORK-FIRST strategy so that
   bug fixes and updates are picked up immediately whenever the device is
   online — falling back to the cached copy only when offline. Only large,
   rarely-changing static assets (the logo) use cache-first for fast offline
   loads. This avoids a stale/broken cached script ever being served forever.
   ========================================================================== */

// Bump this version on every deploy so old caches (which may hold outdated
// or buggy files) are always purged on activate.
const CACHE_VERSION = 'v9';
const CACHE_NAME = 'qmark-calendar-' + CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/db.js',
  './js/utils.js',
  './js/dashboard.js',
  './js/wizard.js',
  './js/editor.js',
  './js/content-modal.js',
  './js/library.js',
  './js/lightbox.js',
  './js/content-details.js',
  './js/preview.js',
  './js/settings.js',
  './js/app.js',
  './images/qmark-logo.png'
];

// Assets that rarely change and are safe to serve cache-first for speed.
const CACHE_FIRST_PATTERNS = [/\/images\//, /qmark-logo\.png$/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Let a page force-activate a waiting worker immediately (used after updates).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCacheFirstAsset = isSameOrigin && CACHE_FIRST_PATTERNS.some((re) => re.test(url.pathname));

  if (isCacheFirstAsset) {
    // Cache-first for stable static assets (images/logo) — fast offline loads.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  if (isSameOrigin) {
    // Network-first for app code (HTML/CSS/JS) so fixes/updates are always
    // used when online; fall back to cache only when the network fails
    // (offline support).
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // Third-party CDN resources (fonts, icon sets, export libraries): try
    // network first, fall back to cache for offline use.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
