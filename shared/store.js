// The Blanson Post — data layer
//
// One interface, two backends. `local` keeps everything in this browser using
// IndexedDB, so the newsroom works with no setup at all; `supabase` is the real
// thing. No page above this file cares which is running.
//
// Requires config.js, idb.js, photos.js. In supabase mode also vendor/supabase.js.
// One IIFE, one global (see the note in sections.js).

const Store = (() => {

  const fail = IDB.fail;

  const slugify = s => String(s).toLowerCase().trim()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  // A photo living in this browser is referenced as `idb:<id>` rather than a
  // blob: URL, because a blob: URL is only valid for one page load. Persisting
  // one would produce an article whose photos vanish on refresh.
  const IDB_REF = /^idb:(.+)$/;
  const isIdbRef = s => IDB_REF.test(String(s || ''));

  // ── local backend ─────────────────────────────────────────────────────────
  const local = {
    name: 'local',

    // Practice accounts. These are not a security boundary and nothing may
    // treat them as one: in local mode there is no server and no shared state,
    // so "signing in" only decides what this one browser shows you.
    seedUsers: [
      { email: 'advisor@practice', name: 'Practice Advisor', role: 'advisor' },
      { email: 'editor@practice',  name: 'Practice Editor',  role: 'editor'  },
      { email: 'writer@practice',  name: 'Practice Writer',  role: 'writer'  }
    ],

    async ensureSeeded() {
      const done = await IDB.kvGet('seeded');
      if (done) return;
      for (const u of this.seedUsers) await IDB.put('users', u);
      await IDB.kvSet('seeded', true);
    },

    async listUsers() {
      await this.ensureSeeded();
      return IDB.all('users');
    },

    async signIn(name, role) {
      await this.ensureSeeded();
      const clean = String(name || '').trim() || 'Practice User';
      const id = 'local:' + slugify(clean);
      const session = { id, name: clean, role: role || 'writer', email: id };
      await IDB.put('users', { email: id, name: clean, role: session.role });
      await IDB.kvSet('session', session);
      return session;
    },

    async signOut() { await IDB.kvDel('session'); },
    async currentUser() { return (await IDB.kvGet('session')) || null; },

    async setRole(email, role) {
      // Roles decide who can publish, so this is the last thing that should be
      // guarded only by which buttons happen to be on screen. Checked here,
      // where the console reaches too.
      const me = await IDB.kvGet('session');
      if (!me || me.role !== 'advisor') {
        throw fail('DENIED', 'Only an advisor can change what someone is allowed to do.');
      }
      const u = await IDB.get('users', email);
      if (!u) throw fail('NOTFOUND', 'No such person on the staff list.');
      u.role = role;
      await IDB.put('users', u);
      const session = await IDB.kvGet('session');
      if (session && session.email === email) {
        session.role = role;
        await IDB.kvSet('session', session);
      }
      return u;
    },

    async listArticles() {
      const rows = await IDB.all('articles');
      return rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    },

    async saveArticle(doc) {
      doc.updatedAt = new Date().toISOString();
      if (!doc.createdAt) doc.createdAt = doc.updatedAt;
      await IDB.put('articles', doc);        // throws code QUOTA when full
      return doc;
    },

    async deleteArticle(id) { await IDB.del('articles', id); },

    async listEvents() {
      const rows = await IDB.all('events');
      return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    },

    async saveEvent(ev) {
      ev.updatedAt = new Date().toISOString();
      if (!ev.createdAt) ev.createdAt = ev.updatedAt;
      await IDB.put('events', ev);
      return ev;
    },

    async deleteEvent(id) { await IDB.del('events', id); },

    async listAssignments() {
      const rows = await IDB.all('assignments');
      return rows.sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')));
    },

    async saveAssignment(a) {
      a.updatedAt = new Date().toISOString();
      if (!a.createdAt) a.createdAt = a.updatedAt;
      await IDB.put('assignments', a);
      return a;
    },

    async deleteAssignment(id) { await IDB.del('assignments', id); },

    // Returns a reference, never a data URL — see IDB_REF above.
    async uploadPhoto(file) {
      const meta = await Photos.add(file);
      return { ...meta, src: 'idb:' + meta.id };
    },

    async deletePhoto(ref) {
      const m = String(ref || '').match(IDB_REF);
      if (m) await IDB.del('photos', m[1]);
    }
  };

  // ── supabase backend ──────────────────────────────────────────────────────
  const remote = {
    name: 'supabase',
    _c: null,
    client() {
      if (!this._c) {
        if (typeof supabase === 'undefined') {
          throw fail('BLOCKED',
            'The Supabase library did not load, so the newsroom cannot reach the database.');
        }
        this._c = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return this._c;
    },

    async signIn(email, password) {
      const { error } = await this.client().auth.signInWithPassword({ email, password });
      if (error) throw fail('DENIED', error.message);
      return await this.currentUser();
    },

    async signOut() { await this.client().auth.signOut(); },

    async currentUser() {
      const { data } = await this.client().auth.getUser();
      if (!data || !data.user) return null;
      const { data: prof, error } = await this.client()
        .from('profiles').select('name, role').eq('id', data.user.id).maybeSingle();
      // A missing profile must not silently demote an advisor to writer.
      if (error) console.warn('[Store] could not read profile:', error.message);
      return {
        id: data.user.id,
        email: data.user.email,
        name: (prof && prof.name) || data.user.email,
        role: (prof && prof.role) || 'writer',
        profileMissing: !prof
      };
    },

    async listUsers() {
      const { data, error } = await this.client().from('profiles').select('id, name, role');
      if (error) throw fail('DENIED', error.message);
      return (data || []).map(p => ({ email: p.id, name: p.name, role: p.role }));
    },

    async setRole(id, role) {
      const { error } = await this.client().from('profiles').update({ role }).eq('id', id);
      if (error) throw fail('DENIED', error.message);
      return { email: id, role };
    },

    async listArticles() {
      const { data, error } = await this.client()
        .from('articles').select('*').order('updated_at', { ascending: false });
      if (error) throw fail('DENIED', error.message);
      return (data || []).map(fromRow);
    },

    async saveArticle(doc) {
      const { data, error } = await this.client()
        .from('articles').upsert(toRow(doc)).select().single();
      if (error) {
        if (/duplicate key/i.test(error.message)) {
          throw fail('CONFLICT', 'There is already an article at that web address.');
        }
        throw fail('DENIED', error.message);
      }
      return fromRow(data);
    },

    async deleteArticle(id) {
      const { error } = await this.client().from('articles').delete().eq('id', id);
      if (error) throw fail('DENIED', error.message);
    },

    async uploadPhoto(file) {
      const meta = await Photos.add(file);              // same validation and resizing
      const rec  = await IDB.get('photos', meta.id);
      const ext  = meta.mime === 'image/png' ? 'png' : 'jpg';
      const path = `${Date.now()}-${slugify(file.name) || 'photo'}.${ext}`;
      const { error } = await this.client().storage
        .from('photos').upload(path, rec.blob, { contentType: meta.mime });
      if (error) throw fail('OFFLINE', error.message);
      const { data } = this.client().storage.from('photos').getPublicUrl(path);
      await IDB.del('photos', meta.id);                  // the bucket owns it now
      return { ...meta, src: data.publicUrl, path };
    },

    async deletePhoto(ref, path) {
      if (!path) return;
      await this.client().storage.from('photos').remove([path]);
    },

    // Events are not in the SQL schema yet, so say so plainly instead of
    // throwing something cryptic the day this backend is switched on. The
    // newsroom shows the message; nothing silently disappears.
    async listEvents() { return []; },
    async saveEvent() {
      throw fail('DENIED', 'The calendar is not connected to the database yet. ' +
        'Ask whoever set the website up to add the events table.');
    },
    async deleteEvent() {
      throw fail('DENIED', 'The calendar is not connected to the database yet.');
    },

    async listAssignments() { return []; },
    async saveAssignment() {
      throw fail('DENIED', 'Story assignments are not connected to the database yet. ' +
        'Ask whoever set the website up to add the assignments table.');
    },
    async deleteAssignment() {
      throw fail('DENIED', 'Story assignments are not connected to the database yet.');
    }
  };

  const toRow = a => ({
    id: a.id, slug: a.slug, title: a.title, section: a.section, form: a.form,
    author: a.author, author_id: a.authorId, interviewer: a.interviewer,
    body: (a.body || []).join('\n'), excerpt: a.excerpt,
    rating: a.rating, rating_max: a.ratingMax, status: a.status,
    featured: !!a.featured, blocks: a.blocks, assets: a.assets, cover: a.cover,
    meta: a.meta, images: a.images, updated_at: a.updatedAt
  });

  const fromRow = r => ({
    id: r.id, slug: r.slug, title: r.title, section: r.section, form: r.form,
    author: r.author, authorId: r.author_id, interviewer: r.interviewer,
    body: (r.body || '').split('\n'), excerpt: r.excerpt,
    rating: r.rating, ratingMax: r.rating_max, status: r.status,
    featured: !!r.featured, blocks: r.blocks || [], assets: r.assets || [],
    cover: r.cover || null, meta: r.meta || {}, images: r.images || [],
    createdAt: r.created_at, updatedAt: r.updated_at
  });

  const backend = (typeof BACKEND !== 'undefined' && BACKEND === 'supabase') ? remote : local;

  // ── moving off the old localStorage format ────────────────────────────────
  // Runs once. The old keys are deliberately left in place: if this conversion
  // is wrong, the student's work still exists to try again from.
  async function migrateFromLocalStorage() {
    if (await IDB.kvGet('migratedFromLS')) return { migrated: 0 };
    let raw = null;
    try { raw = localStorage.getItem('bp_articles'); } catch (e) { return { migrated: 0 }; }
    if (!raw) { await IDB.kvSet('migratedFromLS', true); return { migrated: 0 }; }

    let old = [];
    try { old = JSON.parse(raw) || []; } catch (e) { old = []; }

    let migrated = 0;
    for (const a of old) {
      try {
        const assets = [];
        for (const p of (a.photos || [])) {
          if (!/^data:/.test(p.src || '')) { assets.push(p); continue; }
          const blob = await (await fetch(p.src)).blob();
          const file = new File([blob], 'migrated.jpg', { type: blob.type || 'image/jpeg' });
          const meta = await Photos.add(file);
          assets.push({ ...p, src: 'idb:' + meta.id, id: meta.id });
        }
        const doc = {
          ...a,
          assets,
          blocks: Array.isArray(a.blocks) && a.blocks.length ? a.blocks
                : Blocks.fromLegacy({ ...a, images: assets.map(p => p.src) }),
          images: assets.map(p => p.src),
          authorId: a.authorId || a.createdBy || '',
          form: a.form || 'story'
        };
        delete doc.photos;
        await backend.saveArticle(doc);
        migrated++;
      } catch (e) {
        console.warn('[Store] could not migrate an article:', a && a.title, e);
      }
    }
    await IDB.kvSet('migratedFromLS', true);
    return { migrated };
  }

  // ── photo references → usable URLs ────────────────────────────────────────
  // Article documents hold `idb:<id>`; the browser needs a blob: URL. Resolved
  // per page load into a named scope so they can all be revoked together.
  async function resolvePhotos(article, scope) {
    // null, not the reference itself, when the photo cannot be found. Handing
    // back the raw `idb:` reference used to send it downstream to be rendered
    // as a URL, which 404d and showed the reader a broken image. null tells
    // every renderer there is no picture here.
    const swap = async ref => (isIdbRef(ref)
      ? (await Photos.url(ref.slice(4), scope)) || null
      : ref);

    const out = { ...article };
    if (out.cover && out.cover.src) out.cover = { ...out.cover, src: await swap(out.cover.src) };
    if (Array.isArray(out.blocks)) {
      out.blocks = await Promise.all(out.blocks.map(async b =>
        b.type === 'photo' && b.src ? { ...b, src: await swap(b.src) } : b));
    }
    // Dead references are dropped from the list entirely, so anything counting
    // or picking from `images` sees only photos that actually exist. (The list
    // is rebuilt from the blocks on every save, so nothing is lost by this.)
    if (Array.isArray(out.images)) {
      out.images = (await Promise.all(out.images.map(swap))).filter(Boolean);
    }
    return out;
  }

  // Sorted in place rather than handed back as a copy: the designs, bySection(),
  // featured() and the front page all read the one ARTICLES, and a second
  // sorted list would be a second source of truth to keep in step.
  function orderByDate() {
    if (typeof ARTICLES === 'undefined') return;
    const when = a => {
      const d = Blocks.publishedOn(a);
      return d ? d.getTime() : null;
    };
    ARTICLES.sort((a, b) => {
      const x = when(a), y = when(b);
      if (x === null && y === null) return 0;   // both undated: leave them be
      if (x === null) return 1;                 // undated sinks below dated
      if (y === null) return -1;
      return y - x;                             // newest first
    });
  }

  return {
    mode: backend.name,
    slugify, isIdbRef, resolvePhotos, migrateFromLocalStorage,

    signIn:  (a, b) => backend.signIn(a, b),
    signOut: ()     => backend.signOut(),
    currentUser:   () => backend.currentUser(),
    listUsers:     () => backend.listUsers(),
    setRole:  (e, r) => backend.setRole(e, r),
    listArticles:  () => backend.listArticles(),
    saveArticle:   a  => backend.saveArticle(a),
    deleteArticle: id => backend.deleteArticle(id),
    listEvents:    () => backend.listEvents(),
    saveEvent:     e  => backend.saveEvent(e),
    deleteEvent:   id => backend.deleteEvent(id),
    listAssignments: () => backend.listAssignments(),
    saveAssignment:  a  => backend.saveAssignment(a),
    deleteAssignment: id => backend.deleteAssignment(id),
    uploadPhoto:   f  => backend.uploadPhoto(f),
    deletePhoto: (ref, path) => backend.deletePhoto(ref, path),
    space: () => IDB.space(),
    persist: () => IDB.persist(),

    // Published articles, shaped like the built-in ones so the three designs
    // render both without knowing the difference.
    //
    // Returns { articles, error } — never swallows. An empty catch here used to
    // make five separate whole-site failures (missing library, bad key, a
    // free-tier project auto-paused over a holiday, broken RLS, offline) all
    // render as a perfectly healthy-looking site showing only the archive.
    async published() {
      let rows;
      try {
        rows = await backend.listArticles();
      } catch (e) {
        console.warn('[Blanson Post] could not load published articles:', e);
        return { articles: [], error: e };
      }
      const live = rows.filter(a => a.status === 'published');
      const articles = [];
      for (const a of live) {
        const r = await resolvePhotos(a, 'site');
        articles.push({
          id: 'db-' + r.id, slug: r.slug, section: r.section, title: r.title,
          form: r.form || 'story', interviewer: r.interviewer || '',
          author: r.author || '', featured: !!r.featured,
          // Topics cut across sections, so they have to survive the trip to the
          // public site or a newsroom story simply never joins one.
          topics: Array.isArray(r.topics) ? r.topics : [],
          // No `part` alongside it: the archive's numbers come from the order
          // its rows are written in the TSV, and a newsroom story has no row.
          // Paper.seriesOf falls back to the publication date for those.
          series: r.series || '',
          rating: r.rating == null ? undefined : r.rating,
          ratingMax: r.ratingMax == null ? undefined : r.ratingMax,
          meta: r.meta || {}, cover: r.cover || null,
          // Carried through so the site can print "Published March 12, 2025".
          // Dropping these here was why the newsroom stamped a publish date
          // that no reader ever saw.
          publishedAt: r.publishedAt || '', updatedAt: r.updatedAt || '',
          corrections: r.corrections || [],
          blocks: r.blocks || [], images: r.images || [],
          excerpt: r.excerpt || '',
          body: (r.body || []).filter(l => String(l).trim().length)
        });
      }
      return { articles, error: null };
    },

    // Newest first — but only among the stories whose date anybody actually
    // knows. The 41 carried over from the old Wix site have none, so they keep
    // the order the archive is written in rather than being shuffled by a date
    // we would have had to invent. Array.sort is stable, so that order holds.
    //
    // Nothing visible moves until the club fills the `date` column in
    // content/articles.tsv. The day one gets filled in, that story goes where
    // it belongs on its own, and so does everything published after it.
    //
    // Called by each design before its first render.
    //
    // Memoised: without a guard this is one re-entrant call away from showing
    // every published article twice (the chooser page already embeds all three
    // designs as iframes). Deduped by slug so a newsroom article that collides
    // with a built-in replaces it rather than shadowing it — otherwise the
    // built-in stays visible in listings while its link opens the other one.
    _hydrated: null,
    hydrate() {
      return this._hydrated || (this._hydrated = (async () => {
        const { articles: extra, error } = await this.published();
        if (extra.length) {
          const incoming = new Set(extra.map(a => a.slug));
          for (let i = ARTICLES.length - 1; i >= 0; i--) {
            if (incoming.has(ARTICLES[i].slug)) ARTICLES.splice(i, 1);
          }
          ARTICLES.unshift(...extra);
        }
        orderByDate();
        return { articles: ARTICLES, error };
      })());
    }
  };
})();
