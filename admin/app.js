// The Blanson Post — newsroom
//
// Writers sign in, write in blocks, place photos where they want them, and send
// work to an editor. Editors publish.
//
// The whole point of the block model is that there is exactly one place an
// article's content lives: `Ed.doc.blocks`. Nothing is parsed out of the DOM,
// nothing is reassembled from a textarea, and a photo's position IS its index —
// so position cannot disagree with itself.

const $ = id => document.getElementById(id);
const esc = Blocks.esc;

const STATUSES = [['all','Everything'],['draft','Drafts'],['review','In review'],['published','Published']];

// ── state ────────────────────────────────────────────────────────────────────
// `doc` is always a private deep copy. `articles` is display-only: nothing may
// edit an object that lives in that list, or "discard changes" becomes a
// half-rollback that keeps some edits and drops others.
const Ed = {
  user: null,
  articles: [],
  doc: null,
  baseline: null,       // JSON of the doc as last successfully saved
  saveSeq: 0,
  saving: false,
  filter: 'all',
  tab: 'write',
  autosaveTimer: null,
  crashTimer: null
};

const clone = o => JSON.parse(JSON.stringify(o));

// Fields the save derives from the blocks, or that the store stamps on the way
// past. They are not things a student typed, so they must not count as unsaved
// work — comparing them made every article look dirty the instant it was saved,
// and "you have unsaved changes" fired on every article switch afterwards.
const DERIVED = ['body', 'images', 'excerpt', 'slug', 'status',
                 'createdAt', 'updatedAt', 'publishedAt'];
const editablePart = d => {
  if (!d) return null;
  const out = {};
  Object.keys(d).sort().forEach(k => { if (!DERIVED.includes(k)) out[k] = d[k]; });
  return out;
};
const snapshot = d => JSON.stringify(editablePart(d));

const isDirty = () => Ed.doc !== null && snapshot(Ed.doc) !== Ed.baseline;
const can = what => {
  const r = Ed.user ? Ed.user.role : 'writer';
  if (what === 'publish') return r === 'editor' || r === 'advisor';
  if (what === 'staff')   return r === 'advisor';
  if (what === 'seeAll')  return r === 'editor' || r === 'advisor';
  return true;
};

// Once a story is live it belongs to the paper, not to whoever typed it. A
// writer can still read their published work — they just can't change what the
// public is seeing without an editor. This is the one rule the whole review
// step exists to protect, so it is checked in three places: the buttons, the
// fields, and save() itself.
const canEditDoc = d => {
  if (!d) return false;
  if (can('publish')) return true;                 // editors and advisors
  if (d.authorId && d.authorId !== Ed.user.id) return false;
  return d.status !== 'published';
};

// ── toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, kind) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  // Errors stay put: a message telling a student their work did not save must
  // not disappear on a timer.
  if (kind !== 'bad') toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}
function explain(err) {
  const map = {
    QUOTA:  'This browser is full. Your writing is safe — the photo was not saved.',
    OFFLINE:'No internet right now. Your work is saved on this computer.',
    BLOCKED:'This browser will not let the newsroom save. It may be in private mode.',
    CONFLICT:'There is already an article at that web address.',
    DENIED: err && err.message
  };
  toast((err && map[err.code]) || (err && err.message) || 'Something went wrong.', 'bad');
}

// ── boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  $('mode-badge').textContent = Store.mode === 'supabase' ? 'Live' : 'Practice';
  $('mode-badge').className = 'badge ' + (Store.mode === 'supabase' ? 'live' : 'local');

  // Probe storage before a word is written, not after the article is finished.
  try { await IDB.open(); }
  catch (e) {
    document.body.innerHTML =
      `<div class="fatal"><h1>This browser can't save anything</h1>
       <p>${esc(e.message)}</p>
       <p>Try a normal window instead of a private one, or a different browser,
          before you start writing.</p></div>`;
    return;
  }
  IDB.persist();
  try { await Store.migrateFromLocalStorage(); } catch (e) { console.warn(e); }
  Photos.sweep().catch(() => {});

  try { Ed.user = await Store.currentUser(); } catch (e) { Ed.user = null; }
  Ed.user ? showShell() : showGate();
}

function showGate() { $('gate').hidden = false; $('shell').hidden = true; }

async function showShell() {
  $('gate').hidden = true;
  $('shell').hidden = false;
  $('me').textContent = `${Ed.user.name} · ${Ed.user.role}`;
  $('tabs').querySelector('[data-tab="staff"]').hidden = false;
  buildSelects();
  buildFilters();
  await refresh();
  showTab('write');
}

$('gate-form').onsubmit = async e => {
  e.preventDefault();
  const name = $('who').value.trim();
  const role = ($('gate-form').querySelector('input[name=role]:checked') || {}).value || 'writer';
  if (!name) return;
  try {
    Ed.user = await Store.signIn(name, role);
    await showShell();
  } catch (err) { $('gate-error').textContent = err.message; $('gate-error').hidden = false; }
};

$('signout').onclick = async () => {
  if (isDirty()) {
    const answer = confirm('You have unsaved changes.\n\nOK = save and sign out\nCancel = stay here');
    if (!answer) return;
    await save(null, true);
  }
  closeEditor();
  await Store.signOut();
  Ed.user = null; Ed.articles = [];
  showGate();
};

// ── tabs ─────────────────────────────────────────────────────────────────────
$('tabs').onclick = e => {
  const b = e.target.closest('.tab');
  if (b) showTab(b.dataset.tab);
};
function showTab(name) {
  Ed.tab = name;
  $('tabs').querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('on', on);
    on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current');
  });
  $('view-write').hidden = name !== 'write';
  $('view-staff').hidden = name !== 'staff';
  if (name === 'staff') renderStaff();
}

// ── article list ─────────────────────────────────────────────────────────────
function buildSelects() {
  $('f-section').innerHTML = Sections.all()
    .map(s => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join('');
  $('f-form').innerHTML = [
    ['story','Story'], ['review','Review'], ['verse','Poem'], ['qa','Interview']
  ].map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
}

function buildFilters() {
  $('filters').innerHTML = STATUSES.map(([v, n]) =>
    `<button class="chip${v === Ed.filter ? ' on' : ''}" data-f="${v}"
       aria-pressed="${v === Ed.filter}">${esc(n)}</button>`).join('');
  $('filters').querySelectorAll('.chip').forEach(b => b.onclick = () => {
    Ed.filter = b.dataset.f; buildFilters(); renderList();
  });
}

async function refresh() {
  try { Ed.articles = await Store.listArticles(); }
  catch (e) { Ed.articles = []; explain(e); }
  renderList();
  renderSpace();
}

// Ownership is by stable id, never by the typed byline — changing your byline
// must not hide your own article from you.
function mine(a) {
  return can('seeAll') || a.authorId === Ed.user.id;
}
function visible() {
  const rows = Ed.articles.filter(mine);
  return Ed.filter === 'all' ? rows : rows.filter(a => a.status === Ed.filter);
}

function renderList() {
  const items = visible();
  if (!items.length) {
    $('list').innerHTML = `<p class="list-empty">Nothing here yet.</p>`;
    return;
  }
  $('list').innerHTML = items.map(a => `
    <button class="item${Ed.doc && Ed.doc.id === a.id ? ' on' : ''}" data-id="${esc(a.id)}"
            ${Ed.doc && Ed.doc.id === a.id ? 'aria-current="true"' : ''}>
      <span class="item-status s-${esc(a.status)}" title="${esc(a.status)}"></span>
      <span class="item-txt">
        <b>${esc(a.title || 'Untitled')}</b>
        <i>${esc(Sections.name(a.section))}${a.author ? ' · ' + esc(a.author) : ''}</i>
      </span>
    </button>`).join('');
  $('list').querySelectorAll('.item').forEach(b => b.onclick = () => open(b.dataset.id));
}

async function renderSpace() {
  const s = await Store.space();
  if (!s) { $('space').textContent = ''; return; }
  const used = (s.usage / 1048576).toFixed(0);
  const pct  = Math.round(s.ratio * 100);
  // A rough count is more useful to a student than a percentage.
  const room = Math.max(0, Math.floor(s.free / 400000));
  $('space').innerHTML = pct >= 90
    ? `<span class="warn">Storage almost full (${pct}%). Publish or export soon.</span>`
    : `${used} MB used · room for about ${room} more photos`;
}

// ── open / close ─────────────────────────────────────────────────────────────
function blankDoc() {
  return {
    id: 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    slug: '', title: '', section: 'campus', form: 'story',
    author: Ed.user.name, authorId: Ed.user.id, interviewer: '',
    rating: null, ratingMax: 5, status: 'draft', featured: false,
    cover: null, blocks: [{ id: Blocks.newId(), type: 'para', text: '' }],
    assets: [], meta: {}, body: [], images: []
  };
}

$('new-article').onclick = async () => {
  if (!(await confirmDiscard())) return;
  Ed.doc = blankDoc();
  // A brand-new empty article isn't "unsaved work" until something is typed.
  Ed.baseline = snapshot(Ed.doc);
  mount();
  focusBlock(Ed.doc.blocks[0].id);
};

async function open(id) {
  if (Ed.doc && Ed.doc.id === id) return;
  if (!(await confirmDiscard())) return;
  const found = Ed.articles.find(a => a.id === id);
  if (!found) return;

  // A crash draft is newer than the saved copy when a tab closed mid-sentence.
  const crash = await IDB.kvGet('autosave:' + id);
  let doc = clone(found);
  if (crash && crash.at && crash.at > new Date(found.updatedAt || 0).getTime()) {
    const when = new Date(crash.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (confirm(`Unsaved changes from ${when} were found.\n\nOK = use them\nCancel = throw them away`)) {
      doc = crash.doc;
    } else {
      await IDB.kvDel('autosave:' + id);
    }
  }
  Ed.doc = doc;
  Ed.baseline = snapshot(found);
  mount();
}

async function confirmDiscard() {
  if (!isDirty()) return true;
  return confirm('You have unsaved changes. Discard them?');
}

function closeEditor() {
  clearTimeout(Ed.autosaveTimer); clearTimeout(Ed.crashTimer);
  Photos.releaseScope('editor');
  Ed.doc = null; Ed.baseline = null;
  $('editor').hidden = true;
  $('empty').hidden = false;
  // Every field, not just the block list. On a shared school laptop the next
  // student must not find the previous one's headline sitting in the box.
  ['f-title', 'f-author', 'f-rating'].forEach(id => { $(id).value = ''; });
  $('f-section').selectedIndex = 0;
  $('f-form').selectedIndex = 0;
  $('f-ratingmax').value = '5';
  $('blocks').innerHTML = '';
  $('preview').innerHTML = '';
  $('cover').innerHTML = '';
  $('slugline').innerHTML = '';
  $('warnings').innerHTML = '';
  $('warnings-panel').hidden = true;
  $('saved').textContent = '';
  $('locked').hidden = true;
  setReadOnly(false);          // don't leave the lock on for the next article
  nodes.clear(); adders.clear();
  renderList();
}

// ── mount / render ───────────────────────────────────────────────────────────
function mount() {
  $('empty').hidden = true;
  $('editor').hidden = false;
  $('f-title').value = Ed.doc.title;
  $('f-section').value = Ed.doc.section;
  $('f-author').value = Ed.doc.author || '';
  $('f-form').value = Ed.doc.form || 'story';
  $('f-rating').value = Ed.doc.rating == null ? '' : Ed.doc.rating;
  $('f-ratingmax').value = Ed.doc.ratingMax || 5;
  syncRatingMax();
  renderBlocks(true);
  renderCover();
  renderChrome();
  renderPreview();
  renderList();
}

// Every field writes straight into the doc. There is no collect() step and no
// parsing, so nothing can be lost or reshaped between typing and saving.
function bindField(id, key, transform) {
  $(id).addEventListener('input', () => {
    if (!Ed.doc) return;
    Ed.doc[key] = transform ? transform($(id).value) : $(id).value;
    touched();
  });
}
bindField('f-title', 'title');
bindField('f-author', 'author');
bindField('f-section', 'section');
bindField('f-form', 'form');
$('f-section').addEventListener('change', () => { if (Ed.doc) { Ed.doc.section = $('f-section').value; touched(); } });
$('f-form').addEventListener('change', () => { if (Ed.doc) { Ed.doc.form = $('f-form').value; touched(); } });
$('f-rating').addEventListener('input', () => {
  if (!Ed.doc) return;
  const v = $('f-rating').value.trim();
  Ed.doc.rating = v === '' ? null : Number(v);
  touched();
});
$('f-ratingmax').addEventListener('change', () => {
  if (!Ed.doc) return;
  Ed.doc.ratingMax = Number($('f-ratingmax').value);
  syncRatingMax(); touched();
});

// Bind the rating's ceiling to the chosen denominator. Unbounded, a student
// entering 10 against /5 used to blank every page of the public site.
function syncRatingMax() {
  $('f-rating').max = String(Ed.doc ? (Ed.doc.ratingMax || 5) : 5);
}

function touched() {
  scheduleAutosave();
  scheduleCrashDraft();
  renderChrome();
  renderPreview();
  updateSlugline();
}

// ── slug ─────────────────────────────────────────────────────────────────────
// Follows the title until first publish, then freezes: changing a published
// address breaks every link that already points at it.
function computeSlug() {
  if (!Ed.doc) return '';
  if (Ed.doc.status === 'published' && Ed.doc.slug) return Ed.doc.slug;
  const base = Store.slugify(Ed.doc.title) || Ed.doc.id;
  return uniqueSlug(base, Ed.doc.id);
}
function uniqueSlug(base, exceptId) {
  const taken = new Set([
    ...Ed.articles.filter(a => a.id !== exceptId).map(a => a.slug),
    ...(window.RESERVED_SLUGS || [])
  ].filter(Boolean));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) if (!taken.has(base + '-' + n)) return base + '-' + n;
  return base + '-' + Date.now().toString(36);
}
function updateSlugline() {
  if (!Ed.doc) return;
  const slug = computeSlug();
  const base = Store.slugify(Ed.doc.title) || Ed.doc.id;
  const clash = slug !== base;
  const owner = clash ? (Ed.articles.find(a => a.slug === base) || {}).title : null;
  $('slugline').innerHTML =
    `<span class="slug">Web address: <code>#/a/${esc(slug)}</code></span>` +
    (clash ? `<span class="slug-note">There is already an article at
       <code>${esc(base)}</code>${owner ? ' — “' + esc(owner) + '”' : ''}, so this one
       will live at <code>${esc(slug)}</code>.</span>` : '');
}

// ── blocks ───────────────────────────────────────────────────────────────────
const BLOCK_KINDS = [
  ['para',  '¶',  'Paragraph'],
  ['sub',   'H',  'Subheading'],
  ['photo', '📷', 'Photo'],
  ['quote', '❝',  'Pull quote'],
  ['qa',    '💬', 'Interview line'],
  ['verse', '✍',  'Poem']
];

function makeBlock(type) {
  const b = { id: Blocks.newId(), type };
  if (type === 'verse') b.lines = [''];
  else if (type === 'photo') { b.src = ''; b.alt = ''; b.caption = ''; b.credit = ''; b.decorative = false; }
  else if (type === 'qa') { b.who = ''; b.text = ''; b.role = 'q'; }
  else if (type === 'quote') { b.text = ''; b.attrib = ''; }
  else b.text = '';
  return b;
}

function insertBlock(type, index) {
  const b = makeBlock(type);
  Ed.doc.blocks.splice(index, 0, b);
  touched();
  renderBlocks();
  if (type === 'photo') pickPhotosFor(b.id);
  else focusBlock(b.id);
  return b;
}

function removeBlock(id) {
  const i = Ed.doc.blocks.findIndex(b => b.id === id);
  if (i === -1) return;
  const [gone] = Ed.doc.blocks.splice(i, 1);
  if (!Ed.doc.blocks.length) Ed.doc.blocks.push(makeBlock('para'));
  touched(); renderBlocks();
  toast('Block removed', 'good');
  // Undo restores it exactly where it was, so a mis-click costs nothing.
  const t = $('toast');
  const undo = document.createElement('button');
  undo.className = 'toast-undo'; undo.textContent = 'Undo';
  undo.onclick = () => { Ed.doc.blocks.splice(i, 0, gone); touched(); renderBlocks(); t.hidden = true; };
  t.appendChild(undo);
}

function moveBlock(id, dir) {
  const i = Ed.doc.blocks.findIndex(b => b.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= Ed.doc.blocks.length) return;

  // Moving a node in the DOM blurs whatever inside it had focus, so remember
  // exactly where the caret was and put it back — otherwise pressing Alt+Up
  // twice in a row silently stops working after the first press.
  const active = document.activeElement;
  const hadFocus = active && active.closest && active.closest('.block')
                   && active.closest('.block').dataset.id === id;
  const caret = hadFocus && active.selectionStart != null ? active.selectionStart : null;
  const role = hadFocus ? active.getAttribute('data-role') : null;

  const [b] = Ed.doc.blocks.splice(i, 1);
  Ed.doc.blocks.splice(j, 0, b);
  touched(); renderBlocks();
  announce(`Moved to position ${j + 1} of ${Ed.doc.blocks.length}`);
  if (hadFocus) focusBlock(id, caret, role);
}

function announce(msg) { $('saved').textContent = msg; }

// Keyed reconcile. Rebuilding innerHTML would throw focus to <body> on every
// keystroke, which is fatal in an editor — so a block's node is created once and
// only moved, and a field is never written to while it has focus.
const nodes = new Map();
function renderBlocks(force) {
  const host = $('blocks');
  if (force) { nodes.clear(); host.innerHTML = ''; }

  const wanted = Ed.doc.blocks;
  const seen = new Set();

  wanted.forEach((b, i) => {
    seen.add(b.id);
    let node = nodes.get(b.id);
    if (!node) { node = buildBlockNode(b); nodes.set(b.id, node); }
    updateBlockNode(node, b, i, wanted.length);
    const at = host.children[i * 2];       // adder, block, adder, block…
    const adder = adderFor(i);
    if (host.children[i * 2] !== adder) host.insertBefore(adder, host.children[i * 2] || null);
    if (host.children[i * 2 + 1] !== node) host.insertBefore(node, host.children[i * 2 + 1] || null);
  });

  // trailing adder
  const tail = adderFor(wanted.length);
  if (host.lastElementChild !== tail) host.appendChild(tail);

  for (const [id, node] of [...nodes.entries()]) {
    if (!seen.has(id)) { node.remove(); nodes.delete(id); }
  }
}

const adders = new Map();
function adderFor(index) {
  let el = adders.get(index);
  if (!el) {
    el = document.createElement('div');
    el.className = 'adder';
    el.innerHTML = BLOCK_KINDS.map(([t, icon, label]) =>
      `<button type="button" class="add" data-type="${t}" title="Add ${esc(label.toLowerCase())} here">
         <span aria-hidden="true">${icon}</span> ${esc(label)}</button>`).join('');
    adders.set(index, el);
  }
  el.dataset.index = String(index);
  el.querySelectorAll('.add').forEach(btn => btn.onclick = () =>
    insertBlock(btn.dataset.type, Number(el.dataset.index)));
  return el;
}

function buildBlockNode(b) {
  const el = document.createElement('div');
  el.className = 'block is-' + b.type;
  el.dataset.id = b.id;
  el.innerHTML = `
    <div class="b-side">
      <button type="button" class="mini" data-act="up"   aria-label="Move up">↑</button>
      <button type="button" class="mini" data-act="down" aria-label="Move down">↓</button>
      <button type="button" class="mini del" data-act="del" aria-label="Delete this block">×</button>
    </div>
    <div class="b-body"></div>`;
  el.querySelector('[data-act=up]').onclick   = () => moveBlock(b.id, -1);
  el.querySelector('[data-act=down]').onclick = () => moveBlock(b.id, +1);
  el.querySelector('[data-act=del]').onclick  = () => removeBlock(b.id);
  return el;
}

function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

function updateBlockNode(node, b, index, total) {
  node.className = 'block is-' + b.type;
  const body = node.querySelector('.b-body');
  const active = document.activeElement;
  const holdsFocus = body.contains(active);

  if (b.type === 'photo') { renderPhotoBlock(body, b); return; }

  if (!body.firstChild || body.dataset.kind !== b.type) {
    body.dataset.kind = b.type;
    body.innerHTML = photoless(b);
    wireTextBlock(body, b);
  }
  if (holdsFocus) return;            // never overwrite what someone is typing
  const main = body.querySelector('[data-role=main]');
  if (main) {
    const v = b.type === 'verse' ? (b.lines || []).join('\n') : (b.text || '');
    if (main.value !== v) main.value = v;
    if (main.tagName === 'TEXTAREA') autoGrow(main);
  }
  const who = body.querySelector('[data-role=who]');
  if (who && who.value !== (b.who || '')) who.value = b.who || '';
  const at = body.querySelector('[data-role=attrib]');
  if (at && at.value !== (b.attrib || '')) at.value = b.attrib || '';
}

function photoless(b) {
  switch (b.type) {
    case 'sub':
      return `<input class="b-sub" data-role="main" placeholder="Subheading" aria-label="Subheading">`;
    case 'quote':
      return `<textarea class="b-quote" data-role="main" rows="2" placeholder="A line worth pulling out"
                aria-label="Pull quote"></textarea>
              <input class="b-attrib" data-role="attrib" placeholder="Who said it (optional)"
                aria-label="Quote attribution">`;
    case 'verse':
      return `<textarea class="b-verse" data-role="main" rows="4"
                placeholder="One line per line — every line break is kept exactly as you type it"
                aria-label="Poem"></textarea>`;
    case 'qa':
      return `<div class="qa-row">
                <input class="b-who" data-role="who" placeholder="Who's speaking" aria-label="Speaker">
                <label class="qa-kind"><input type="checkbox" data-role="isq"> This is the question</label>
              </div>
              <textarea class="b-text" data-role="main" rows="2" placeholder="What they said"
                aria-label="What they said"></textarea>`;
    default:
      return `<textarea class="b-para" data-role="main" rows="2" placeholder="Write here…"
                aria-label="Paragraph"></textarea>`;
  }
}

function wireTextBlock(body, b) {
  const main = body.querySelector('[data-role=main]');
  const who  = body.querySelector('[data-role=who]');
  const at   = body.querySelector('[data-role=attrib]');
  const isq  = body.querySelector('[data-role=isq]');

  if (isq) {
    isq.checked = b.role === 'q';
    isq.onchange = () => { b.role = isq.checked ? 'q' : 'a'; touched(); };
  }
  if (who) who.oninput = () => { b.who = who.value; touched(); };
  if (at)  at.oninput  = () => { b.attrib = at.value; touched(); };

  if (!main) return;
  main.oninput = () => {
    if (b.type === 'verse') b.lines = main.value.split('\n');
    else b.text = main.value;
    if (main.tagName === 'TEXTAREA') autoGrow(main);
    touched();
  };

  // The typing model students already know from Google Docs.
  main.onkeydown = e => {
    if (b.type === 'verse') return;                     // Enter is a line break in a poem
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const at2 = main.selectionStart;
      const before = main.value.slice(0, at2), after = main.value.slice(main.selectionEnd);
      b.text = before;
      main.value = before;
      const i = Ed.doc.blocks.findIndex(x => x.id === b.id);
      const nb = makeBlock(b.type === 'sub' ? 'para' : b.type);
      if (nb.type === 'qa') { nb.who = b.who; nb.role = b.role === 'q' ? 'a' : 'q'; }
      nb.text = after;
      Ed.doc.blocks.splice(i + 1, 0, nb);
      touched(); renderBlocks(); focusBlock(nb.id, 0);
      return;
    }
    if (e.key === 'Backspace' && main.selectionStart === 0 && main.selectionEnd === 0) {
      const i = Ed.doc.blocks.findIndex(x => x.id === b.id);
      if (i > 0) {
        const prev = Ed.doc.blocks[i - 1];
        if (prev.type === 'photo') return;
        e.preventDefault();
        const cut = (prev.text || '').length;
        prev.text = (prev.text || '') + (b.text || '');
        Ed.doc.blocks.splice(i, 1);
        touched(); renderBlocks(); focusBlock(prev.id, cut);
      }
    }
  };

  // They draft in Google Docs. Pasting several paragraphs has to make several
  // paragraphs, or the block model is worse than the textarea it replaced.
  main.onpaste = e => {
    if (b.type === 'verse') return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text || !/\n\s*\n/.test(text)) return;
    e.preventDefault();
    const parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    const i = Ed.doc.blocks.findIndex(x => x.id === b.id);
    b.text = (b.text || '').slice(0, main.selectionStart) + parts[0];
    const made = parts.slice(1).map(t => Object.assign(makeBlock('para'), { text: t }));
    Ed.doc.blocks.splice(i + 1, 0, ...made);
    touched(); renderBlocks();
    focusBlock(made.length ? made[made.length - 1].id : b.id);
    toast(`Pasted ${parts.length} paragraphs`, 'good');
  };

  // Photos can also be pasted straight in — how a Chromebook student adds a
  // screenshot, which was previously impossible.
  main.addEventListener('paste', e => {
    const files = [...((e.clipboardData || {}).files || [])];
    if (!files.length) return;
    e.preventDefault();
    const i = Ed.doc.blocks.findIndex(x => x.id === b.id);
    addPhotos(files, i + 1);
  });
}

// Deliberately not requestAnimationFrame: rAF is throttled or paused whenever
// the tab isn't visible, which would silently drop focus restoration. A
// microtask-then-timeout pair always runs.
function focusBlock(id, caret, role) {
  const place = () => {
    const node = nodes.get(id);
    if (!node || !node.isConnected) return false;
    const f = node.querySelector(`[data-role="${role || 'main'}"]`)
           || node.querySelector('[data-role="main"]');
    // A photo block has no text field; land on its first control rather than
    // dropping focus to the document.
    const el = f || node.querySelector('input, button');
    if (!el) return false;
    el.focus();
    if (f && typeof caret === 'number' && f.setSelectionRange) {
      const at = Math.min(caret, (f.value || '').length);
      try { f.setSelectionRange(at, at); } catch (e) { /* not a text field */ }
    }
    if (el.tagName === 'TEXTAREA') autoGrow(el);
    return document.activeElement === el;
  };
  if (!place()) setTimeout(place, 0);
}

// Alt+arrow moves the block you're in, so reordering never needs a mouse.
document.addEventListener('keydown', e => {
  if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  const node = e.target.closest && e.target.closest('.block');
  if (!node) return;
  e.preventDefault();
  moveBlock(node.dataset.id, e.key === 'ArrowUp' ? -1 : +1);
});

// ── photos ───────────────────────────────────────────────────────────────────
let pendingPhotoTarget = null;

function pickPhotosFor(blockId) {
  pendingPhotoTarget = { blockId };
  $('file-input').click();
}
function pickPhotosAt(index) {
  pendingPhotoTarget = { index };
  $('file-input').click();
}
// The cover is a field on the article, not a block in the body. Routing it
// through addPhotos() inserted a photo block as well, so one chosen file turned
// into both a cover and a picture in the story.
function pickCover() {
  pendingPhotoTarget = { cover: true };
  $('file-input').click();
}

$('file-input').onchange = async e => {
  const files = [...e.target.files];
  e.target.value = '';
  const target = pendingPhotoTarget; pendingPhotoTarget = null;
  if (!files.length) return;

  if (target && target.cover) { await setCoverFromFile(files[0]); return; }

  if (target && target.blockId) {
    const b = Ed.doc.blocks.find(x => x.id === target.blockId);
    if (b) { await fillPhotoBlock(b, files[0]); await addPhotos(files.slice(1), indexOf(b) + 1); }
    return;
  }
  await addPhotos(files, target ? target.index : Ed.doc.blocks.length);
};

async function setCoverFromFile(file) {
  $('cover').innerHTML = `<div class="cover-empty"><b>Adding ${esc(file.name)}…</b></div>`;
  try {
    const meta = await Store.uploadPhoto(file);
    Ed.doc.cover = { src: meta.src, assetId: meta.id, alt: '', caption: '', credit: '' };
    Ed.doc.assets = Ed.doc.assets.filter(a => a.id !== meta.id).concat([meta]);
    touched(); renderCover(); renderSpace();
    toast('Cover photo set', 'good');
  } catch (err) {
    explain(err);
    renderCover();               // put the chooser back, not a stuck message
  }
}

const indexOf = b => Ed.doc.blocks.findIndex(x => x.id === b.id);

async function fillPhotoBlock(b, file) {
  const node = nodes.get(b.id);
  const body = node && node.querySelector('.b-body');
  if (body) {
    body.innerHTML = `<div class="ph-loading">Adding ${esc(file.name)}…</div>`;
    // renderPhotoBlock only rebuilds when this marker doesn't match. Leaving it
    // set means the "Adding…" placeholder is never replaced, so a *successful*
    // upload sticks on the loading message forever.
    body.dataset.kind = 'loading';
  }
  try {
    const meta = await Store.uploadPhoto(file);
    b.src = meta.src; b.assetId = meta.id;
    b.w = meta.w; b.h = meta.h; b.bytes = meta.bytes; b.name = meta.name;
    Ed.doc.assets = Ed.doc.assets.filter(a => a.id !== meta.id).concat([meta]);
    // Deliberately does NOT set the cover. Adding a picture to the story is not
    // the same decision as choosing the one that headlines the page — and doing
    // it automatically made the photo appear twice: once at the top and once
    // where it was actually placed. Use the cover slot, or "★ Use as cover".
    touched(); renderBlocks(); renderCover(); renderSpace();
  } catch (err) {
    explain(err);
    // A failed photo leaves an empty block rather than a broken one.
    if (body) { body.dataset.kind = ''; renderBlocks(); }
  }
}

async function addPhotos(files, index) {
  let at = index;
  for (const f of files) {
    const b = makeBlock('photo');
    Ed.doc.blocks.splice(at++, 0, b);
    renderBlocks();
    await fillPhotoBlock(b, f);          // committed one at a time: a failure at
  }                                       // photo 4 never loses photos 1–3
}

async function renderPhotoBlock(body, b) {
  if (body.dataset.kind !== 'photo' || body.dataset.for !== b.id) {
    body.dataset.kind = 'photo'; body.dataset.for = b.id;
    body.innerHTML = `
      <div class="ph">
        <div class="ph-thumb"><img alt="" ${b.src ? '' : 'hidden'}></div>
        <div class="ph-fields">
          <label class="ph-lab">Describe this photo
            <span class="hint">Someone using a screen reader hears this instead of the picture.
              Say what is happening, not “photo of”.</span>
            <input data-role="alt" placeholder="e.g. Students pack donation cups in the CTE room"></label>
          <input data-role="caption" placeholder="Caption (printed under the photo)">
          <input data-role="credit" placeholder="Photo by…">
          <label class="ph-dec"><input type="checkbox" data-role="dec"> This photo is just decoration</label>
          <div class="ph-actions">
            <button type="button" class="btn small" data-role="replace">Choose a photo</button>
            <button type="button" class="btn small ghost" data-role="cover">★ Use as cover</button>
            <span class="ph-meta" data-role="meta"></span>
          </div>
        </div>
      </div>`;
    const alt = body.querySelector('[data-role=alt]');
    const cap = body.querySelector('[data-role=caption]');
    const cre = body.querySelector('[data-role=credit]');
    const dec = body.querySelector('[data-role=dec]');
    alt.oninput = () => { b.alt = alt.value; touched(); };
    cap.oninput = () => {
      b.caption = cap.value;
      // Most student captions are a fine description; offer it rather than
      // making them type it twice.
      if (!b.alt && cap.value.trim()) { b.alt = cap.value; alt.value = cap.value; }
      touched();
    };
    cre.oninput = () => { b.credit = cre.value; touched(); };
    dec.onchange = () => { b.decorative = dec.checked; touched(); };
    body.querySelector('[data-role=replace]').onclick = () => pickPhotosFor(b.id);
    body.querySelector('[data-role=cover]').onclick = () => {
      Ed.doc.cover = { src: b.src, assetId: b.assetId, alt: b.alt, caption: b.caption, credit: b.credit };
      touched(); renderCover(); renderBlocks();
      toast('Cover photo set', 'good');
    };
  }

  const img = body.querySelector('img');
  if (b.src) {
    img.hidden = false;
    const url = Store.isIdbRef(b.src) ? await Photos.url(b.src.slice(4), 'editor', 'thumb') : b.src;
    if (url && img.getAttribute('src') !== url) img.src = url;
  } else { img.hidden = true; }

  const active = document.activeElement;
  const set = (sel, v) => { const el = body.querySelector(sel); if (el && el !== active) el.value = v || ''; };
  set('[data-role=alt]', b.alt); set('[data-role=caption]', b.caption); set('[data-role=credit]', b.credit);
  const dec = body.querySelector('[data-role=dec]'); if (dec) dec.checked = !!b.decorative;
  const meta = body.querySelector('[data-role=meta]');
  if (meta) {
    const isCover = Ed.doc.cover && Ed.doc.cover.assetId === b.assetId;
    meta.textContent = (b.w ? `${b.w}×${b.h} · ${Math.round((b.bytes || 0) / 1024)} KB` : '') +
                       (isCover ? ' · also the cover' : '');
    meta.className = 'ph-meta' + (isCover ? ' dup' : '');
  }
}

async function renderCover() {
  const c = $('cover');
  if (!Ed.doc.cover || !Ed.doc.cover.src) {
    c.innerHTML = `<div class="cover-empty">
      <b>No cover photo</b>
      <span>The cover is the big picture at the top of the page.</span>
      <button type="button" class="btn small" id="pick-cover">Choose one</button></div>`;
    const pick = $('pick-cover');
    if (pick) pick.onclick = pickCover;
    return;
  }
  const src = Store.isIdbRef(Ed.doc.cover.src)
    ? await Photos.url(Ed.doc.cover.src.slice(4), 'editor', 'thumb') : Ed.doc.cover.src;
  c.innerHTML = `<div class="cover-set">
      <img src="${esc(src || '')}" alt="">
      <div><b>Cover photo</b><span>Shown big at the top of the article.</span></div>
      <button type="button" class="btn small" id="change-cover">Change</button>
      <button type="button" class="btn small ghost" id="clear-cover">Remove</button></div>`;
  $('change-cover').onclick = pickCover;
  $('clear-cover').onclick = () => { Ed.doc.cover = null; touched(); renderCover(); renderBlocks(); };
}

// ── preview ──────────────────────────────────────────────────────────────────
async function renderPreview() {
  if (!Ed.doc) return;
  const doc = await Store.resolvePhotos(Ed.doc, 'editor');
  const parts = [];
  if (doc.cover && doc.cover.src) parts.push(`<figure><img src="${esc(doc.cover.src)}" alt=""></figure>`);
  for (const b of Blocks.of(doc)) {
    switch (b.type) {
      case 'photo':
        parts.push(`<figure><img src="${esc(b.src || '')}" alt="${esc(b.alt || '')}">${
          b.caption || b.credit ? `<figcaption>${esc(b.caption || '')}${
            b.credit ? ` <i>${esc(b.credit)}</i>` : ''}</figcaption>` : ''}</figure>`);
        break;
      case 'heading': parts.push(`<h4>${esc(b.text)}</h4>`); break;
      case 'quote':   parts.push(`<blockquote>${esc(b.text)}${
        b.attrib ? `<cite>${esc(b.attrib)}</cite>` : ''}</blockquote>`); break;
      case 'verse':   parts.push(`<div class="pv-verse">${(b.lines || []).map(esc).join('<br>')}</div>`); break;
      case 'qa':      parts.push(`<p class="pv-qa ${b.role === 'q' ? 'q' : 'a'}"><b>${esc(b.who)}</b> ${esc(b.text)}</p>`); break;
      default:        if ((b.text || '').trim()) parts.push(`<p>${esc(b.text)}</p>`);
    }
  }
  $('preview').innerHTML =
    `<h3>${esc(Ed.doc.title || 'Untitled')}</h3>
     <div class="pv-by">${esc(Ed.doc.author || 'no byline yet')}</div>` +
    (parts.join('') || '<p class="pv-empty">Nothing written yet.</p>');
}

// ── status, saving ───────────────────────────────────────────────────────────
const LABEL = { draft: 'Draft', review: 'With an editor', published: 'Published' };

function renderChrome() {
  if (!Ed.doc) return;
  const s = Ed.doc.status;
  const editable = canEditDoc(Ed.doc);
  $('f-status').textContent = LABEL[s] || s;
  $('f-status').className = 'status-pill s-' + s;

  // Every status change is its own labelled button. "Save" never moves an
  // article between states, so nothing can be published by accident and a
  // story cannot silently drop out of the review queue.
  const pub = can('publish');
  $('btn-save').textContent = s === 'published' ? 'Update the live story' : 'Save';
  $('btn-save').hidden      = !editable;
  // "Send to an editor" is for people who need one. If you can publish, you are
  // the editor — asking yourself for permission is noise, and Publish is
  // already sitting next to it.
  $('btn-submit').hidden    = !(editable && s === 'draft' && !pub);
  // A writer who submitted by accident, or isn't finished after all, can pull
  // their own story back out of the queue. Deliberate and labelled — the old
  // behaviour did this silently as a side effect of pressing Save, so articles
  // disappeared from review with nothing to show for it.
  $('btn-withdraw').hidden  = !(editable && s === 'review' && !pub);
  $('btn-publish').hidden   = !(pub && s !== 'published');
  $('btn-unpublish').hidden = !(pub && s === 'published');
  $('btn-sendback').hidden  = !(pub && s === 'review');
  $('btn-delete').hidden    = !(pub || (s === 'draft' && Ed.doc.authorId === Ed.user.id));
  $('btn-save').disabled = $('btn-publish').disabled = Ed.saving;
  $('saved').textContent = Ed.saving ? 'Saving…' : (editable && isDirty() ? 'Unsaved changes' : '');

  setReadOnly(!editable);
  $('locked').hidden = editable;
  if (!editable) {
    $('locked').innerHTML = s === 'published'
      ? `<b>This story is live, so it can’t be edited here.</b>
         Ask an editor to take it down first if something needs changing —
         that way nothing on the public site changes without a second person seeing it.`
      : `<b>This is someone else’s article.</b> You can read it, but only its
         writer or an editor can change it.`;
  }
  renderWarnings();
}

// Read-only means read-only: fields, the block controls, and the buttons that
// add or remove blocks. Leaving the inputs live and only hiding Save would let
// a writer type into a published story and lose the work when they navigated
// away, which is worse than refusing the edit.
function setReadOnly(on) {
  $('editor').classList.toggle('readonly', on);
  ['f-title','f-author','f-rating'].forEach(id => { $(id).readOnly = on; });
  ['f-section','f-form','f-ratingmax'].forEach(id => { $(id).disabled = on; });
  $('blocks').querySelectorAll('textarea, input').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') el.disabled = on;
    else el.readOnly = on;
  });
  $('blocks').querySelectorAll('button').forEach(b => { b.disabled = on; });
  $('cover').querySelectorAll('button').forEach(b => { b.disabled = on; });
}

function problems() {
  const out = [];
  if (!Ed.doc.title.trim()) out.push('a headline');
  const hasText = Ed.doc.blocks.some(b =>
    (b.type === 'verse' ? (b.lines || []).join('') : (b.text || '')).trim());
  if (!hasText) out.push('some writing');
  return out;
}

function warnings() {
  const out = [];
  const noAlt = Ed.doc.blocks.filter(b => b.type === 'photo' && b.src && !b.decorative && !(b.alt || '').trim());
  if (noAlt.length) out.push(`${noAlt.length} photo${noAlt.length > 1 ? 's have' : ' has'} no description.
    People using a screen reader will not know what ${noAlt.length > 1 ? 'they show' : 'it shows'}.`);
  const empty = Ed.doc.blocks.filter(b => b.type === 'photo' && !b.src);
  if (empty.length) out.push(`${empty.length} photo block${empty.length > 1 ? 's have' : ' has'} no picture in ${empty.length > 1 ? 'them' : 'it'}.`);
  if (Ed.doc.rating != null && Ed.doc.rating > (Ed.doc.ratingMax || 5)) {
    out.push(`The rating (${Ed.doc.rating}) is higher than the maximum (${Ed.doc.ratingMax}).`);
  }
  if (!Ed.doc.author.trim()) out.push('There is no byline, so this will publish as “The Blanson Post”.');
  return out;
}

function renderWarnings() {
  const w = warnings();
  $('warnings-panel').hidden = !w.length;
  $('warnings').innerHTML = w.map(t => `<p class="warn-item">${t}</p>`).join('');
}

function scheduleAutosave() {
  clearTimeout(Ed.autosaveTimer);
  if (!Ed.doc || Ed.doc.status === 'published') return;   // live stories save deliberately
  Ed.autosaveTimer = setTimeout(() => { if (isDirty()) save(null, true); }, 2500);
}
function scheduleCrashDraft() {
  clearTimeout(Ed.crashTimer);
  Ed.crashTimer = setTimeout(() => {
    if (Ed.doc) IDB.kvSet('autosave:' + Ed.doc.id, { doc: clone(Ed.doc), at: Date.now() }).catch(() => {});
  }, 800);
}

async function save(nextStatus, quiet, message) {
  if (!Ed.doc || Ed.saving) return false;

  // The buttons are hidden and the fields are read-only, but neither is a rule.
  // A writer must not be able to change a live story by any route — including
  // autosave firing on a stale timer, or the console.
  const changingStatus = nextStatus && nextStatus !== Ed.doc.status;
  if (!canEditDoc(Ed.doc) && !(can('publish') && changingStatus)) {
    if (!quiet) toast('This story is live — an editor has to take it down before it can be changed.', 'bad');
    return false;
  }

  if (nextStatus && nextStatus !== 'draft') {
    const missing = problems();
    if (missing.length) { toast('Still needs ' + missing.join(' and ') + '.', 'bad'); return false; }
  }

  const seq = ++Ed.saveSeq;
  // The status moves on the snapshot, never on the live doc — so a failed
  // publish cannot leave a phantom "Published" behind.
  const snap = clone(Ed.doc);
  if (nextStatus) snap.status = nextStatus;
  snap.slug = computeSlug();
  snap.body = Blocks.toPlainText(snap);
  snap.images = Blocks.imageList(snap);
  snap.excerpt = (snap.body.find(l => l.length > 40) || snap.body[0] || '');
  if (snap.status === 'published' && !snap.publishedAt) snap.publishedAt = new Date().toISOString();

  Ed.saving = true; renderChrome();
  try {
    const saved = await Store.saveArticle(snap);
    if (seq !== Ed.saveSeq) return true;        // a newer save has superseded this
    Ed.doc.slug = saved.slug;
    Ed.doc.status = saved.status;
    Ed.doc.updatedAt = saved.updatedAt;
    if (saved.publishedAt) Ed.doc.publishedAt = saved.publishedAt;
    // The baseline is what was SENT, so anything typed during a slow save stays
    // dirty and gets picked up by the next one instead of being discarded.
    Ed.baseline = snapshot(snap);
    await IDB.kvDel('autosave:' + Ed.doc.id).catch(() => {});
    await Photos.markOrphans(liveAssetIds()).catch(() => {});
    await refresh();
    renderChrome(); updateSlugline();
    // Three different actions land on 'draft' — taking a live story down,
    // sending one back, and a writer withdrawing their own — so the caller says
    // which one it was rather than everyone reading "Saved".
    if (!quiet) toast(message
                    || (nextStatus === 'published' ? 'Published — it is on the site now'
                      : nextStatus === 'review'    ? 'Sent to an editor'
                      : 'Saved'), 'good');
    else $('saved').textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return true;
  } catch (err) {
    explain(err);
    return false;
  } finally {
    if (seq === Ed.saveSeq) { Ed.saving = false; renderChrome(); }
  }
}

function liveAssetIds() {
  const ids = new Set();
  Ed.articles.forEach(a => {
    (a.blocks || []).forEach(b => { if (b.assetId) ids.add(b.assetId); });
    if (a.cover && a.cover.assetId) ids.add(a.cover.assetId);
  });
  (Ed.doc ? Ed.doc.blocks : []).forEach(b => { if (b.assetId) ids.add(b.assetId); });
  if (Ed.doc && Ed.doc.cover && Ed.doc.cover.assetId) ids.add(Ed.doc.cover.assetId);
  return [...ids];
}

$('btn-save').onclick      = () => save(null);
$('btn-submit').onclick    = () => save('review');
$('btn-withdraw').onclick  = () => {
  // An editor may already be reading it, so make this a decision rather than a
  // stray click.
  if (!confirm('Take this back from the editors?\n\nIt goes back to being your draft, and they will no longer see it waiting.')) return;
  save('draft', false, 'Taken back — it is your draft again');
};
$('btn-publish').onclick   = () => save('published');
$('btn-unpublish').onclick = () => save('draft', false, 'Taken down — it is no longer on the site');
$('btn-sendback').onclick  = () => save('draft', false, 'Sent back to the writer');
$('btn-delete').onclick = async () => {
  if (!confirm(`Delete “${Ed.doc.title || 'Untitled'}” for good?`)) return;
  try {
    await Store.deleteArticle(Ed.doc.id);
    await IDB.kvDel('autosave:' + Ed.doc.id).catch(() => {});
    closeEditor(); await refresh(); toast('Deleted', 'good');
  } catch (err) { explain(err); }
};

addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

// ── staff ────────────────────────────────────────────────────────────────────
async function renderStaff() {
  const host = $('view-staff');
  let people = [];
  try { people = await Store.listUsers(); } catch (e) { explain(e); }
  const advisors = people.filter(p => p.role === 'advisor').length;

  host.innerHTML = `
    <div class="staff-wrap">
      <h2>Who's on staff</h2>
      <p class="staff-note">${can('staff')
        ? 'You can change what people are allowed to do.'
        : 'Only an advisor can change roles.'}</p>

      ${advisors <= 1 && can('staff') ? `<p class="staff-nudge">
        There is only one advisor. Add a second, so the paper isn't locked out if
        that person leaves.</p>` : ''}

      <table class="staff">
        <thead><tr><th>Name</th><th>Role</th><th>Articles</th></tr></thead>
        <tbody>${people.map(p => {
          const count = Ed.articles.filter(a => a.authorId === p.email).length;
          const self = Ed.user.email === p.email;
          return `<tr>
            <td><b>${esc(p.name)}</b>${self ? ' <span class="you">you</span>' : ''}</td>
            <td>${can('staff') && !self
              ? `<select data-who="${esc(p.email)}">${['writer','editor','advisor']
                  .map(r => `<option value="${r}"${p.role === r ? ' selected' : ''}>${r}</option>`).join('')}</select>`
              : esc(p.role) + (self ? ' <span class="hint">— ask another advisor to change yours</span>' : '')}</td>
            <td>${count}</td></tr>`;
        }).join('')}</tbody>
      </table>

      <div class="invite">
        <h3>Invite someone</h3>
        <p>Inviting people by email needs the website connected to a database.
           While the newsroom is in practice mode, use the sign-in screen to try
           a different role.</p>
        <button class="btn" disabled>Send an invitation</button>
      </div>

      <div class="invite">
        <h3>Export everything</h3>
        <p>Downloads every article as one file — worth doing before anyone graduates.</p>
        <button class="btn" id="export">Download a backup</button>
      </div>
    </div>`;

  host.querySelectorAll('select[data-who]').forEach(sel => sel.onchange = async () => {
    const who = sel.dataset.who, role = sel.value;
    const person = people.find(p => p.email === who);
    // The last advisor must not be able to step down and lock everyone out.
    if (person.role === 'advisor' && role !== 'advisor' && advisors <= 1) {
      toast('There has to be at least one advisor.', 'bad');
      sel.value = 'advisor';
      return;
    }
    if (!confirm(`Make ${person.name} ${role === 'advisor' ? 'an' : 'a'} ${role}?`)) {
      sel.value = person.role; return;
    }
    try { await Store.setRole(who, role); toast(`${person.name} is now ${role}`, 'good'); renderStaff(); }
    catch (e) { explain(e); }
  });

  const ex = $('export');
  if (ex) ex.onclick = async () => {
    const data = { exportedAt: new Date().toISOString(), articles: await Store.listArticles(), staff: people };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `blanson-post-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
}

boot();
