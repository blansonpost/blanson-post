// The Blanson Post — reading list
//
// A story someone means to come back to. Kept in this browser and nowhere else:
// there is no account behind it, nothing is sent anywhere, and a reading list
// made on a school Chromebook will not be there on somebody's phone. That is a
// real limit and the page says so rather than implying an account exists.
//
// Slugs only, plus when it was saved. Never a copy of the article: a saved
// headline would go stale the moment the story was corrected, and a saved photo
// would sit in storage the reader cannot see or clear.
//
// One IIFE, one global (see the note in sections.js).

const Saved = (() => {
  const KEY = 'bp-reading-list';
  const MAX = 300;              // a list nobody could read is a leak, not a feature

  // Every access is wrapped. localStorage is not merely empty in a private
  // window or with site data blocked — reading it *throws*, and an unguarded
  // read at module load would take the whole page down with it.
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows)) return [];
      // Anything that is not a plain slug is dropped rather than trusted: this
      // string ends up in a URL and in a lookup.
      return rows
        .filter(r => r && typeof r.slug === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(r.slug))
        .map(r => ({ slug: r.slug, at: Number(r.at) || 0 }));
    } catch (e) {
      return [];
    }
  }

  // Returns whether it stuck. A silent failure here would show a story as saved
  // that is gone on the next page.
  function write(rows) {
    try {
      localStorage.setItem(KEY, JSON.stringify(rows.slice(0, MAX)));
      return true;
    } catch (e) {
      return false;
    }
  }

  const has = slug => read().some(r => r.slug === slug);

  function add(slug) {
    if (!slug || has(slug)) return true;
    return write([{ slug, at: Date.now() }].concat(read()));
  }

  function remove(slug) {
    return write(read().filter(r => r.slug !== slug));
  }

  // Returns the state it ended up in, not the state it was asked for, so a
  // button that could not be saved does not go on to claim it was.
  function toggle(slug) {
    if (has(slug)) { remove(slug); return has(slug); }
    add(slug);
    return has(slug);
  }

  // Newest first, and only what still exists — a story taken off the site
  // should leave the list rather than sit there leading nowhere.
  function list() {
    if (typeof ARTICLES === 'undefined') return [];
    return read()
      .map(r => {
        const a = ARTICLES.find(x => x.slug === r.slug);
        return a ? { article: a, at: r.at } : null;
      })
      .filter(Boolean)
      .sort((x, y) => y.at - x.at);
  }

  // True when the browser will actually keep any of this. Checked by writing,
  // because Safari in private mode has the API and refuses every write.
  function usable() {
    try {
      localStorage.setItem(KEY + ':probe', '1');
      localStorage.removeItem(KEY + ':probe');
      return true;
    } catch (e) {
      return false;
    }
  }

  return { has, add, remove, toggle, list, usable, count: () => read().length };
})();
