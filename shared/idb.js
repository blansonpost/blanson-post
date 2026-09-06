// The Blanson Post — IndexedDB wrapper
//
// Small on purpose. IndexedDB is used instead of localStorage because
// localStorage is capped around 5 MB no matter how much room the browser has,
// and photos stored as base64 fill that after roughly a dozen pictures across
// the entire newsroom. IndexedDB gets the real quota (measured ~2.9 GB here)
// and stores Blobs natively, which are also a third smaller than base64.
//
// One IIFE, one global (see the note in sections.js).

const IDB = (() => {
  const DB_NAME = 'blanson-post';
  // 2 added `events`. The upgrade below only creates stores that are missing,
  // so raising this never touches what is already saved.
  const VERSION = 2;

  const STORES = {
    articles: { keyPath: 'id', indexes: [['status', 'status'], ['updatedAt', 'updatedAt']] },
    photos:   { keyPath: 'id' },
    users:    { keyPath: 'email' },
    kv:       { keyPath: 'k' },
    events:   { keyPath: 'id', indexes: [['date', 'date']] }
  };

  // Errors carry a code so callers can react to the situation rather than
  // pattern-matching an English message.
  const fail = (code, message, cause) =>
    Object.assign(new Error(message), { code, cause });

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(fail('BLOCKED', 'This browser has no storage available for the newsroom.'));
      }
      let req;
      try { req = indexedDB.open(DB_NAME, VERSION); }
      catch (e) { return reject(fail('BLOCKED', 'This browser blocked storage.', e)); }

      req.onupgradeneeded = e => {
        const db = e.target.result;
        for (const [name, spec] of Object.entries(STORES)) {
          if (db.objectStoreNames.contains(name)) continue;
          const os = db.createObjectStore(name, { keyPath: spec.keyPath });
          (spec.indexes || []).forEach(([n, path]) => os.createIndex(n, path));
        }
      };
      // Private browsing and "block site data" surface here rather than throwing.
      req.onerror   = () => reject(fail('BLOCKED',
        'This browser will not let the newsroom save anything. It may be in private mode.',
        req.error));
      req.onblocked = () => reject(fail('BLOCKED',
        'Another tab is holding the newsroom open. Close it and reload.'));
      req.onsuccess = () => resolve(req.result);
    });
    return dbPromise;
  }

  function run(storeNames, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      let tx;
      try { tx = db.transaction(storeNames, mode); }
      catch (e) { return reject(fail('BLOCKED', 'Could not open the newsroom database.', e)); }

      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => {
        const err = tx.error || {};
        // QuotaExceededError arrives here, not at the request.
        const quota = err.name === 'QuotaExceededError' || err.code === 22;
        reject(fail(quota ? 'QUOTA' : 'BLOCKED',
          quota ? 'There is no room left in this browser to save that.'
                : 'The newsroom database refused that write.', err));
      };

      const stores = (Array.isArray(storeNames) ? storeNames : [storeNames])
        .reduce((acc, n) => (acc[n] = tx.objectStore(n), acc), {});
      // fn resolves its value into `result`; the transaction's completion is
      // what we actually wait for, so a write is never reported before it lands.
      Promise.resolve(fn(stores, tx)).then(v => { result = v; }, reject);
    }));
  }

  const wrap = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

  return {
    open, run, wrap, fail,

    get:  (store, key)   => run(store, 'readonly',  s => wrap(s[store].get(key))),
    all:  (store)        => run(store, 'readonly',  s => wrap(s[store].getAll())),
    put:  (store, value) => run(store, 'readwrite', s => wrap(s[store].put(value))),
    del:  (store, key)   => run(store, 'readwrite', s => wrap(s[store].delete(key))),
    clear:(store)        => run(store, 'readwrite', s => wrap(s[store].clear())),

    // kv is a tiny settings table: session, migration flags, autosaves.
    kvGet: async k => {
      const row = await IDB.get('kv', k);
      return row ? row.v : undefined;
    },
    kvSet: (k, v) => IDB.put('kv', { k, v }),
    kvDel: k => IDB.del('kv', k),

    // How much room is left, so the newsroom can warn before a save fails
    // rather than after the article is written.
    async space() {
      if (!navigator.storage || !navigator.storage.estimate) return null;
      try {
        const { quota = 0, usage = 0 } = await navigator.storage.estimate();
        return { quota, usage, free: Math.max(0, quota - usage),
                 ratio: quota ? usage / quota : 0 };
      } catch (e) { return null; }
    },

    // Ask the browser not to evict us under disk pressure. On a shared school
    // laptop this is the difference between work surviving the week and not.
    async persist() {
      if (!navigator.storage || !navigator.storage.persist) return null;
      try {
        if (await navigator.storage.persisted()) return true;
        return await navigator.storage.persist();
      } catch (e) { return null; }
    }
  };
})();
