/* ==========================================================================
   Q-MARK MEDIA — IndexedDB data layer
   Offline-first local storage for clients, calendars, content items, settings.
   ========================================================================== */

const DB_NAME = 'qmark_calendar_db';
const DB_VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  if (!('indexedDB' in window)) {
    _dbPromise = Promise.reject(new Error('This browser does not support local storage (IndexedDB), so the app cannot save data. Please use a standard, non-private browser window.'));
    return _dbPromise;
  }
  _dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('calendars')) {
        const store = db.createObjectStore('calendars', { keyPath: 'id' });
        store.createIndex('clientId', 'clientId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('contentItems')) {
        const store = db.createObjectStore('contentItems', { keyPath: 'id' });
        store.createIndex('calendarId', 'calendarId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      // If the DB connection is closed unexpectedly (e.g. another tab upgraded it),
      // drop the cached promise so the next call reopens a fresh connection
      // instead of reusing a dead one and hanging forever.
      db.onclose = () => { _dbPromise = null; };
      db.onversionchange = () => { db.close(); _dbPromise = null; };
      resolve(db);
    };
    req.onerror = (e) => { _dbPromise = null; reject(e.target.error || new Error('Failed to open local database.')); };
    req.onblocked = () => { _dbPromise = null; reject(new Error('Local database is blocked by another open tab. Please close other tabs of this app and try again.')); };
  });
  return _dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => {
    try {
      return db.transaction(storeName, mode).objectStore(storeName);
    } catch (err) {
      // e.g. connection was closed/invalidated between calls — force a fresh reopen next time.
      _dbPromise = null;
      throw err;
    }
  });
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Local database operation failed.'));
  });
}

const DB = {
  async getAll(storeName) {
    const store = await tx(storeName);
    return promisifyRequest(store.getAll());
  },
  async get(storeName, id) {
    const store = await tx(storeName);
    return promisifyRequest(store.get(id));
  },
  async put(storeName, value) {
    const store = await tx(storeName, 'readwrite');
    return promisifyRequest(store.put(value));
  },
  async delete(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return promisifyRequest(store.delete(id));
  },
  async getByIndex(storeName, indexName, value) {
    const store = await tx(storeName);
    const idx = store.index(indexName);
    return promisifyRequest(idx.getAll(value));
  },
  async clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return promisifyRequest(store.clear());
  }
};

function uid() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

window.DB = DB;
window.uid = uid;
