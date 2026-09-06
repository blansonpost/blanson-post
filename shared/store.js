// The Blanson Post — data layer
//
// One interface, two backends. `local` keeps everything in this browser so the
// editor can be tried without any setup; `supabase` is the real thing. Both
// expose the same methods, so no page above this file cares which is running.
//
// Requires config.js (and, in supabase mode, the supabase-js UMD bundle).

const Store = (() => {
  const LS_ARTICLES = 'bp_articles';
  const LS_SESSION  = 'bp_session';
  const LS_USERS    = 'bp_users';

  const readLS  = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch (e) { return fallback; }
  };
  const writeLS = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }   // private mode, quota, blocked storage
  };

  const slugify = s => s.toLowerCase().trim()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  // ── local backend ──────────────────────────────────────────────────────────
  // Seeded with one demo account so the panel is usable straight away.
  const local = {
    name: 'local',

    async signIn(email, password) {
      const users = readLS(LS_USERS, [
        { email: 'editor@blansonpost.test', password: 'blanson', name: 'Demo Editor', role: 'editor' },
        { email: 'writer@blansonpost.test', password: 'blanson', name: 'Demo Writer', role: 'writer' }
      ]);
      writeLS(LS_USERS, users);
      const u = users.find(x =>
        x.email.toLowerCase() === String(email).toLowerCase() && x.password === password);
      if (!u) throw new Error('That email and password do not match an account.');
      const session = { email: u.email, name: u.name, role: u.role };
      writeLS(LS_SESSION, session);
      return session;
    },

    async signOut() { try { localStorage.removeItem(LS_SESSION); } catch (e) {} },
    async currentUser() { return readLS(LS_SESSION, null); },

    async listArticles() { return readLS(LS_ARTICLES, []); },

    async saveArticle(article) {
      const all = readLS(LS_ARTICLES, []);
      const i = all.findIndex(a => a.id === article.id);
      article.updatedAt = new Date().toISOString();
      if (i === -1) { article.createdAt = article.updatedAt; all.unshift(article); }
      else all[i] = article;
      if (!writeLS(LS_ARTICLES, all)) {
        throw new Error('Could not save — this browser is out of storage space. ' +
                        'Try smaller photos, or connect Supabase.');
      }
      return article;
    },

    async deleteArticle(id) {
      writeLS(LS_ARTICLES, readLS(LS_ARTICLES, []).filter(a => a.id !== id));
    },

    // Photos become data URLs. Fine for trying things; real storage is Supabase.
    async uploadPhoto(file) { return await shrink(file, 1600, 0.82); }
  };

  // ── supabase backend ───────────────────────────────────────────────────────
  const remote = {
    name: 'supabase',
    _c: null,
    client() {
      if (!this._c) {
        if (typeof supabase === 'undefined') {
          throw new Error('The Supabase library did not load. Check your internet connection.');
        }
        this._c = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return this._c;
    },

    async signIn(email, password) {
      const { data, error } = await this.client().auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return await this.currentUser();
    },

    async signOut() { await this.client().auth.signOut(); },

    async currentUser() {
      const { data } = await this.client().auth.getUser();
      if (!data || !data.user) return null;
      const { data: prof } = await this.client()
        .from('profiles').select('name, role').eq('id', data.user.id).single();
      return {
        id: data.user.id,
        email: data.user.email,
        name: (prof && prof.name) || data.user.email,
        role: (prof && prof.role) || 'writer'
      };
    },

    async listArticles() {
      const { data, error } = await this.client()
        .from('articles').select('*').order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(fromRow);
    },

    async saveArticle(article) {
      const { data, error } = await this.client()
        .from('articles').upsert(toRow(article)).select().single();
      if (error) throw new Error(error.message);
      return fromRow(data);
    },

    async deleteArticle(id) {
      const { error } = await this.client().from('articles').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    async uploadPhoto(file) {
      const small = await shrink(file, 1600, 0.82);
      const blob  = await (await fetch(small)).blob();
      const path  = `${Date.now()}-${slugify(file.name) || 'photo'}.jpg`;
      const { error } = await this.client().storage
        .from('photos').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw new Error(error.message);
      const { data } = this.client().storage.from('photos').getPublicUrl(path);
      return data.publicUrl;
    }
  };

  const toRow = a => ({
    id: a.id, slug: a.slug, title: a.title, section: a.section, author: a.author,
    body: a.body.join('\n'), excerpt: a.excerpt, rating: a.rating, rating_max: a.ratingMax,
    status: a.status, images: a.images, photos: a.photos, updated_at: a.updatedAt
  });

  const fromRow = r => ({
    id: r.id, slug: r.slug, title: r.title, section: r.section, author: r.author,
    body: (r.body || '').split('\n'), excerpt: r.excerpt,
    rating: r.rating, ratingMax: r.rating_max, status: r.status,
    images: r.images || [], photos: r.photos || [],
    createdAt: r.created_at, updatedAt: r.updated_at
  });

  // Downscale in the browser so a 5 MB phone photo doesn't reach the server.
  function shrink(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => { img.src = reader.result; };
      img.onerror = () => reject(new Error('That file does not look like an image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width  = Math.round(img.width  * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      reader.readAsDataURL(file);
    });
  }

  const backend = (typeof BACKEND !== 'undefined' && BACKEND === 'supabase') ? remote : local;

  return {
    mode: backend.name,
    slugify,
    signIn:  (e, p) => backend.signIn(e, p),
    signOut: ()     => backend.signOut(),
    currentUser:   () => backend.currentUser(),
    listArticles:  () => backend.listArticles(),
    saveArticle:   a  => backend.saveArticle(a),
    deleteArticle: id => backend.deleteArticle(id),
    uploadPhoto:   f  => backend.uploadPhoto(f),

    // Published articles from the store, shaped like the built-in ones so the
    // three designs can render both without knowing the difference.
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
      const articles = rows.filter(a => a.status === 'published').map(a => ({
        id: 'db-' + a.id, slug: a.slug, section: a.section, title: a.title,
        author: a.author || '', featured: !!a.featured,
        rating: a.rating == null ? undefined : a.rating,
        ratingMax: a.ratingMax == null ? undefined : a.ratingMax,
        images: a.images || [], photos: a.photos || [],
        excerpt: a.excerpt || (a.body.find(l => l.trim().length > 40) || ''),
        body: a.body.filter(l => l.trim().length)
      }));
      return { articles, error: null };
    },

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
        return { articles: ARTICLES, error };
      })());
    }
  };
})();
