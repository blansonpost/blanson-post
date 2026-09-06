// The Blanson Post — newsroom
//
// Sign in, write, place photos in the text, submit for review, publish.
// Storage comes from Store (shared/store.js) — local browser or Supabase.

const SECTION_LIST = [
  ['campus', 'Campus'], ['interviews', 'Interviews'], ['sports', 'Sports'],
  ['gaming', 'Gaming'], ['books', 'Books'], ['film', 'Film & TV'],
  ['poetry', 'Poetry'], ['alumni', 'Alumni'], ['houston', 'Houston']
];
const STATUSES = [
  ['all', 'Everything'], ['draft', 'Drafts'], ['review', 'In review'], ['published', 'Published']
];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let me = null;
let articles = [];
let current = null;
let filter = 'all';
let dirty = false;

// ── toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, kind) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
}

// ── auth ─────────────────────────────────────────────────────────────────────
async function boot() {
  $('mode-badge').textContent = Store.mode === 'supabase' ? 'Live' : 'Local only';
  $('mode-badge').className = 'badge ' + (Store.mode === 'supabase' ? 'live' : 'local');

  $('gate-note').innerHTML = Store.mode === 'supabase'
    ? 'Ask an editor to create your account.'
    : 'Not connected to a database yet, so anything you write stays in this browser.<br>' +
      'Try it with <b>editor@blansonpost.test</b> / <b>blanson</b>';

  try { me = await Store.currentUser(); } catch (e) { me = null; }
  me ? showShell() : showGate();
}

function showGate() { $('gate').hidden = false; $('shell').hidden = true; }

async function showShell() {
  $('gate').hidden = true;
  $('shell').hidden = false;
  $('me').textContent = `${me.name} · ${me.role}`;
  buildSectionOptions();
  buildFilters();
  await refresh();
}

$('login-form').onsubmit = async e => {
  e.preventDefault();
  const btn = $('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  $('login-error').hidden = true;
  try {
    me = await Store.signIn($('email').value.trim(), $('password').value);
    await showShell();
  } catch (err) {
    $('login-error').textContent = err.message;
    $('login-error').hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = 'Sign in';
  }
};

$('signout').onclick = async () => {
  if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
  await Store.signOut();
  me = null; current = null; dirty = false;
  showGate();
};

// ── list ─────────────────────────────────────────────────────────────────────
function buildSectionOptions() {
  $('f-section').innerHTML =
    SECTION_LIST.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
}

function buildFilters() {
  $('filters').innerHTML = STATUSES.map(([v, n]) =>
    `<button class="chip${v === filter ? ' on' : ''}" data-f="${v}">${esc(n)}</button>`).join('');
  $('filters').querySelectorAll('.chip').forEach(b => b.onclick = () => {
    filter = b.dataset.f; buildFilters(); renderList();
  });
}

async function refresh() {
  try { articles = await Store.listArticles(); }
  catch (e) { articles = []; toast(e.message, 'bad'); }
  renderList();
}

function visible() {
  const mine = me.role === 'writer'
    ? articles.filter(a => (a.author || '') === me.name || a.createdBy === me.email)
    : articles;
  return filter === 'all' ? mine : mine.filter(a => a.status === filter);
}

function renderList() {
  const items = visible();
  if (!items.length) {
    $('list').innerHTML = `<p class="list-empty">Nothing here yet.</p>`;
    return;
  }
  $('list').innerHTML = items.map(a => `
    <button class="item${current && current.id === a.id ? ' on' : ''}" data-id="${esc(a.id)}">
      <span class="item-status s-${esc(a.status)}"></span>
      <span class="item-txt">
        <b>${esc(a.title || 'Untitled')}</b>
        <i>${esc(sectionName(a.section))}${a.author ? ' · ' + esc(a.author) : ''}</i>
      </span>
    </button>`).join('');
  $('list').querySelectorAll('.item').forEach(b => b.onclick = () => open(b.dataset.id));
}

const sectionName = s => (SECTION_LIST.find(x => x[0] === s) || [, s])[1];

// ── editor ───────────────────────────────────────────────────────────────────
function blank() {
  return {
    id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    slug: '', title: '', section: 'campus', author: me.name, body: [''],
    excerpt: '', rating: null, ratingMax: 5, status: 'draft',
    images: [], photoMeta: {}, createdBy: me.email
  };
}

$('new-article').onclick = () => {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  current = blank();
  fill();
};

function open(id) {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  current = articles.find(a => a.id === id);
  if (current) fill();
}

function fill() {
  $('empty').hidden = true;
  $('form').hidden = false;
  $('f-title').value = current.title;
  $('f-section').value = current.section;
  $('f-author').value = current.author || '';
  $('f-rating').value = current.rating == null ? '' : current.rating;
  $('f-rating-max').value = current.ratingMax || 5;
  $('f-body').value = (current.body || []).join('\n');
  dirty = false;
  renderStatus();
  renderPhotos();
  renderPreview();
  renderList();
}

function renderStatus() {
  const pill = $('f-status-pill');
  pill.textContent = { draft: 'Draft', review: 'In review', published: 'Published' }[current.status];
  pill.className = 'status-pill s-' + current.status;

  const canPublish = me.role === 'editor' || me.role === 'advisor';
  $('btn-publish').hidden   = !(canPublish && current.status !== 'published');
  $('btn-unpublish').hidden = !(canPublish && current.status === 'published');
  $('btn-submit').hidden    = current.status !== 'draft';
}

['f-title', 'f-section', 'f-author', 'f-rating', 'f-rating-max', 'f-body'].forEach(id => {
  $(id).addEventListener('input', () => { dirty = true; renderPreview(); });
});

// ── photos ───────────────────────────────────────────────────────────────────
$('f-photo').onchange = async e => {
  const files = [...e.target.files];
  e.target.value = '';
  for (const f of files) {
    if (!f.type.startsWith('image/')) { toast(`${f.name} is not an image.`, 'bad'); continue; }
    try {
      toast(`Adding ${f.name}…`);
      const url = await Store.uploadPhoto(f);
      current.images.push(url);
      current.photoMeta[url] = { caption: '', credit: '' };
      dirty = true;
      renderPhotos(); renderPreview();
      toast(`Added ${f.name}`, 'good');
    } catch (err) { toast(err.message, 'bad'); }
  }
};

function renderPhotos() {
  const n = current.images.length;
  $('photos-empty').hidden = n > 0;
  $('photos').innerHTML = current.images.map((src, i) => {
    const m = current.photoMeta[src] || {};
    const used = new RegExp('\\[\\[photo:' + (i + 1) + '\\]\\]').test($('f-body').value);
    return `
    <div class="photo">
      <img src="${esc(src)}" alt="">
      <div class="photo-body">
        <div class="photo-top">
          <b>${i === 0 ? '★ Cover' : 'Photo ' + (i + 1)}</b>
          <span class="placed${used ? ' yes' : ''}">${
            used ? 'placed in text' : (i === 0 ? 'shown at the top' : 'not placed yet')}</span>
        </div>
        <input class="cap" data-i="${i}" data-k="caption" value="${esc(m.caption)}" placeholder="Caption">
        <input class="cap" data-i="${i}" data-k="credit"  value="${esc(m.credit)}"  placeholder="Photo by…">
        <div class="photo-actions">
          <button type="button" class="btn small" data-insert="${i + 1}">↓ Insert here</button>
          ${i > 0 ? `<button type="button" class="btn small ghost" data-cover="${i}">Make cover</button>` : ''}
          <button type="button" class="btn small ghost" data-remove="${i}">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');

  $('photos').querySelectorAll('.cap').forEach(inp => inp.oninput = () => {
    const src = current.images[+inp.dataset.i];
    current.photoMeta[src] = current.photoMeta[src] || { caption: '', credit: '' };
    current.photoMeta[src][inp.dataset.k] = inp.value;
    dirty = true; renderPreview();
  });
  $('photos').querySelectorAll('[data-insert]').forEach(b =>
    b.onclick = () => insertMarker(+b.dataset.insert));
  $('photos').querySelectorAll('[data-cover]').forEach(b => b.onclick = () => {
    const i = +b.dataset.cover;
    const [src] = current.images.splice(i, 1);
    current.images.unshift(src);
    renumberMarkers();
    dirty = true; renderPhotos(); renderPreview();
  });
  $('photos').querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
    const i = +b.dataset.remove;
    const src = current.images[i];
    if (!confirm('Remove this photo from the article?')) return;
    current.images.splice(i, 1);
    delete current.photoMeta[src];
    $('f-body').value = $('f-body').value
      .replace(new RegExp('^\\s*\\[\\[photo:' + (i + 1) + '\\]\\]\\s*$\\n?', 'gm'), '');
    renumberMarkers();
    dirty = true; renderPhotos(); renderPreview();
  });
}

// Markers reference photos by position, so reordering has to rewrite them.
function renumberMarkers() {
  // Nothing to remap reliably after a reorder, so drop stale markers rather than
  // silently pointing them at the wrong picture.
  const valid = current.images.length;
  $('f-body').value = $('f-body').value.replace(/\[\[photo:(\d+)\]\]/g,
    (m, n) => (+n <= valid ? m : ''));
}

function insertMarker(n) {
  const ta = $('f-body');
  const marker = `\n\n[[photo:${n}]]\n\n`;
  const at = ta.selectionStart ?? ta.value.length;
  ta.value = ta.value.slice(0, at) + marker + ta.value.slice(ta.selectionEnd ?? at);
  ta.focus();
  const pos = at + marker.length;
  ta.setSelectionRange(pos, pos);
  dirty = true;
  renderPhotos(); renderPreview();
  toast(`Photo ${n} placed`, 'good');
}

// ── preview ──────────────────────────────────────────────────────────────────
function renderPreview() {
  const lines = $('f-body').value.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const html = lines.map(l => {
    const m = l.match(/^\[\[photo:(\d+)\]\]$/);
    if (m) {
      const src = current.images[+m[1] - 1];
      if (!src) return `<div class="pv-missing">Photo ${esc(m[1])} is gone</div>`;
      const meta = current.photoMeta[src] || {};
      return `<figure class="pv-fig"><img src="${esc(src)}" alt="">${
        meta.caption || meta.credit
          ? `<figcaption>${esc(meta.caption)}${
              meta.credit ? ` <i>${esc(meta.credit)}</i>` : ''}</figcaption>`
          : ''}</figure>`;
    }
    return `<p>${esc(l)}</p>`;
  }).join('');

  const cover = current.images[0];
  $('preview').innerHTML =
    `<h4>${esc($('f-title').value || 'Untitled')}</h4>
     <div class="pv-by">${esc($('f-author').value || 'no byline yet')}</div>
     ${cover ? `<figure class="pv-fig"><img src="${esc(cover)}" alt=""></figure>` : ''}
     ${html || '<p class="pv-empty">Nothing written yet.</p>'}`;
}

// ── save / publish ───────────────────────────────────────────────────────────
function collect() {
  const body = $('f-body').value.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const rating = $('f-rating').value.trim();
  Object.assign(current, {
    title: $('f-title').value.trim(),
    section: $('f-section').value,
    author: $('f-author').value.trim(),
    body,
    excerpt: body.find(l => !/^\[\[photo:\d+\]\]$/.test(l) && l.length > 40) || body[0] || '',
    rating: rating === '' ? null : Number(rating),
    ratingMax: Number($('f-rating-max').value),
    slug: current.slug || Store.slugify($('f-title').value) || current.id
  });
  return current;
}

function problems() {
  const out = [];
  if (!$('f-title').value.trim()) out.push('a headline');
  if (!$('f-body').value.trim())  out.push('some article text');
  return out;
}

async function persist(status, msg) {
  const missing = problems();
  if (missing.length && status !== 'draft') {
    toast('Still needs ' + missing.join(' and ') + '.', 'bad');
    return;
  }
  collect();
  current.status = status;
  try {
    const saved = await Store.saveArticle(current);
    current = saved;
    dirty = false;
    await refresh();
    renderStatus();
    toast(msg, 'good');
  } catch (err) { toast(err.message, 'bad'); }
}

$('btn-save').onclick      = () => persist(current.status === 'published' ? 'published' : 'draft', 'Draft saved');
$('btn-submit').onclick    = () => persist('review', 'Sent to an editor for review');
$('btn-publish').onclick   = () => persist('published', 'Published — it is live on the site now');
$('btn-unpublish').onclick = () => persist('draft', 'Taken down, back to draft');

$('btn-delete').onclick = async () => {
  if (!confirm(`Delete “${current.title || 'Untitled'}” for good?`)) return;
  try {
    await Store.deleteArticle(current.id);
    current = null; dirty = false;
    $('form').hidden = true; $('empty').hidden = false;
    await refresh();
    toast('Deleted', 'good');
  } catch (err) { toast(err.message, 'bad'); }
};

addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

boot();
