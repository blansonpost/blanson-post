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
  // Anyone can write a story; the calendar speaks for the whole school, so it
  // is kept to the people who already decide what gets published.
  const evTab = $('tabs').querySelector('[data-tab="events"]');
  if (evTab) evTab.hidden = !can('publish');
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
  // Guarded: a missing panel should hide a tab, not throw partway through and
  // leave the whole newsroom blank. This bites when a browser is holding a
  // cached copy of index.html from before a panel was added.
  const panel = (id, on) => { const el = $(id); if (el) el.hidden = !on; };
  panel('view-write', name === 'write');
  panel('view-staff', name === 'staff');
  panel('view-events', name === 'events');
  panel('view-board', name === 'board');
  if (name === 'staff') renderStaff();
  if (name === 'events') renderEvents();
  if (name === 'board') renderBoard();
}

// ── article list ─────────────────────────────────────────────────────────────
function buildSelects() {
  $('f-section').innerHTML = Sections.all()
    .map(s => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join('');
  $('f-form').innerHTML = [
    ['story','Story'], ['review','Review'], ['verse','Poem'], ['qa','Interview']
  ].map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
}

// Every topic anyone has used, from the archive and from the newsroom, offered
// as you type. Near-miss spellings are the way a topic quietly splits in two —
// "Sci-Fi" and "Sci Fi" would end up as one address with one of the two labels,
// and neither writer would ever see it happen.
function buildTopicList() {
  const list = $('topic-list');
  if (!list) return;
  const seen = new Map();
  const add = name => {
    const t = String(name || '').trim();
    const key = Paper.topicSlug(t);
    if (key && !seen.has(key)) seen.set(key, t);
  };
  Paper.allTopics().forEach(t => add(t.name));
  Ed.articles.forEach(a => (a.topics || []).forEach(add));
  list.innerHTML = [...seen.values()].sort((a, b) => a.localeCompare(b))
    .map(t => `<option value="${esc(t)}">`).join('');
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
  buildTopicList();
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
        <i>${esc(Sections.name(a.section))}${a.author ? ' · ' + esc(a.author) : ''}${
          Blocks.dateShort(a) ? ' · ' + esc(Blocks.dateShort(a)) : ''}</i>
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
    topics: [],
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
  ['f-title', 'f-author', 'f-rating', 'f-topics'].forEach(id => { $(id).value = ''; });
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
  $('f-topics').value = (Ed.doc.topics || []).join(', ');
  $('f-rating').value = Ed.doc.rating == null ? '' : Ed.doc.rating;
  $('f-ratingmax').value = Ed.doc.ratingMax || 5;
  syncRatingMax();
  renderBlocks(true);
  renderCover();
  renderChrome();
  renderPreview();
  // Opening an article showed a blank slugline until you typed a character.
  // That was already odd for the web address, and it hid the run date entirely
  // on a published story, which is the one place you would go looking for it.
  updateSlugline();
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
// Stored as a list, typed as one line. Split, trimmed and de-duplicated on the
// way in, so "Horror, horror" and a stray trailing comma cannot become two
// topics or an empty one.
bindField('f-topics', 'topics', v => {
  const seen = new Set();
  return String(v).split(',').map(t => t.trim()).filter(t => {
    if (!t) return false;
    const key = Paper.topicSlug(t);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});
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
  // A story keeps its run date after it is taken down, so the label has to
  // follow the status: saying "Published" next to something that is currently
  // off the site would be plainly untrue.
  const ran = Blocks.dateText(Ed.doc);
  const ranLabel = Ed.doc.status === 'published' ? 'Published' : 'Last ran';
  const upd = Blocks.updatedText(Ed.doc);
  $('slugline').innerHTML =
    `<span class="slug">Web address: <code>#/a/${esc(slug)}</code></span>` +
    (ran ? `<span class="slug-date">${ranLabel} ${esc(ran)}${
       upd ? ' · ' + esc(upd) : ''}</span>` : '') +
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
  ['verse', '✍',  'Poem'],
  ['embed', '▶',  'Video']
];

function makeBlock(type) {
  const b = { id: Blocks.newId(), type };
  if (type === 'verse') b.lines = [''];
  else if (type === 'photo') { b.src = ''; b.alt = ''; b.caption = ''; b.credit = ''; b.decorative = false; }
  else if (type === 'embed') { b.url = ''; b.caption = ''; }
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
    // Place the node first, then fill it in — never the other way round.
    // updateBlockNode measures the textarea to size it, and a node that is not
    // yet in the document measures zero, which collapsed every paragraph to an
    // invisible sliver with the writing still inside it. Reopening a story then
    // looked like the work had gone.
    const adder = adderFor(i);             // adder, block, adder, block…
    if (host.children[i * 2] !== adder) host.insertBefore(adder, host.children[i * 2] || null);
    if (host.children[i * 2 + 1] !== node) host.insertBefore(node, host.children[i * 2 + 1] || null);
    updateBlockNode(node, b, i, wanted.length);
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

// Grows a textarea to fit what is typed in it. Two things it must not do:
// measure a textarea that is not on the page yet (scrollHeight is 0 there), or
// write a zero height back, either of which hides the writing completely while
// leaving it in the box.
function autoGrow(ta) {
  if (!ta.isConnected) return;
  ta.style.height = 'auto';
  const h = ta.scrollHeight;
  if (h > 0) ta.style.height = h + 'px';
  else ta.style.removeProperty('height');   // fall back to the rows= default
}

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

  const url = body.querySelector('[data-role=url]');
  if (url) {
    if (url.value !== (b.url || '')) url.value = b.url || '';
    const cap = body.querySelector('[data-role=caption]');
    if (cap && cap.value !== (b.caption || '')) cap.value = b.caption || '';
    showEmbedNote(body, b);
  }
}

// Says straight away whether a pasted link will actually play, rather than
// leaving an empty box on the page for a reader to find.
function showEmbedNote(body, b) {
  const note = body.querySelector('[data-role=note]');
  if (!note) return;
  if (!b.url) { note.className = 'embed-note'; note.textContent =
    'YouTube, Vimeo or a Google Drive video. Drive files have to be shared with anyone at the school, or nobody else can watch.'; return; }
  const e = Blocks.embedOf(b.url);
  note.className = 'embed-note ' + (e.ok ? 'good' : 'bad');
  note.textContent = e.ok
    ? 'Will play here as a ' + e.host + ' video.'
    : (e.reason === 'not a web address'
        ? 'That does not look like a link. Copy the whole address, starting with https://'
        : 'The paper cannot play links from that site, so it will show as a plain link instead.');
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
    case 'embed':
      return `<input class="b-embed" data-role="url"
                placeholder="Paste a YouTube, Vimeo or Google Drive link"
                aria-label="Video link">
              <input class="b-cap" data-role="caption" placeholder="Caption (optional)"
                aria-label="Caption">
              <div class="embed-note" data-role="note"></div>`;
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
  const url = body.querySelector('[data-role=url]');
  if (url) {
    url.addEventListener('input', () => { b.url = url.value.trim(); showEmbedNote(body, b); touched(); });
    const cap = body.querySelector('[data-role=caption]');
    if (cap) cap.addEventListener('input', () => { b.caption = cap.value; touched(); });
  }
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
        <div class="ph-thumb"><img alt="" ${b.src ? '' : 'hidden'}
          ><span class="ph-gone" data-role="gone" hidden>Photo missing</span></div>
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

  const img  = body.querySelector('img');
  const gone = body.querySelector('[data-role=gone]');
  if (b.src) {
    const url = Store.isIdbRef(b.src) ? await Photos.url(b.src.slice(4), 'editor', 'thumb') : b.src;
    // A reference with no file behind it any more. The newsroom says so out
    // loud — unlike the public site, which simply leaves the photo out — because
    // the writer is the only person who can put it back, and an empty frame
    // reads as a slow load rather than a problem.
    img.hidden = !url;
    if (gone) gone.hidden = !!url;
    if (url && img.getAttribute('src') !== url) img.src = url;
  } else { img.hidden = true; if (gone) gone.hidden = true; }

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
      ${src ? `<img src="${esc(src)}" alt="">` : '<span class="cover-gone">!</span>'}
      <div><b>Cover photo</b><span>${src
        ? 'Shown big at the top of the article.'
        : 'This photo is not saved on this computer any more, so it will not ' +
          'appear on the site. Choose it again.'}</span></div>
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
        // Matches the site: no picture, no figure, no orphaned caption.
        if (!b.src) break;
        parts.push(`<figure><img src="${esc(b.src)}" alt="${esc(b.alt || '')}">${
          b.caption || b.credit ? `<figcaption>${esc(b.caption || '')}${
            b.credit ? ` <i>${esc(b.credit)}</i>` : ''}</figcaption>` : ''}</figure>`);
        break;
      case 'heading': parts.push(`<h4>${esc(b.text)}</h4>`); break;
      case 'quote':   parts.push(`<blockquote>${esc(b.text)}${
        b.attrib ? `<cite>${esc(b.attrib)}</cite>` : ''}</blockquote>`); break;
      case 'embed': {
        const e = Blocks.embedOf(b.url);
        parts.push(e.ok
          ? `<div class="pv-embed"><b>▶ ${esc(e.host)} video</b>${
              b.caption ? `<span>${esc(b.caption)}</span>` : ''}</div>`
          : `<div class="pv-embed bad">▶ ${b.url ? 'This link will not play' : 'No video link yet'}</div>`);
        break;
      }
      case 'verse':   parts.push(`<div class="pv-verse">${(b.lines || []).map(esc).join('<br>')}</div>`); break;
      case 'qa':      parts.push(`<p class="pv-qa ${b.role === 'q' ? 'q' : 'a'}"><b>${esc(b.who)}</b> ${esc(b.text)}</p>`); break;
      default:        if ((b.text || '').trim()) parts.push(`<p>${esc(b.text)}</p>`);
    }
  }
  $('preview').innerHTML =
    `<h3>${esc(Ed.doc.title || 'Untitled')}</h3>
     <div class="pv-by">${esc(Ed.doc.author || 'no byline yet')}${
       Blocks.dateText(Ed.doc) ? ' · ' + esc(Blocks.dateText(Ed.doc)) : ''}</div>` +
    (parts.join('') || '<p class="pv-empty">Nothing written yet.</p>');
}

// ── Asking for something ─────────────────────────────────────────────────────
// A real form, not prompt(). Browsers offer "prevent this page from creating
// more dialogs" after a couple of prompts, and once that is ticked every later
// prompt() returns undefined without showing anything — the button simply stops
// working, with no error a person can see. A <dialog> cannot be switched off,
// takes more than one field, works on a touchscreen, and can say what it wants.
function ask(spec) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'ask';
    dlg.innerHTML = `
      <form method="dialog">
        <h2>${esc(spec.title)}</h2>
        ${spec.intro ? `<p class="ask-intro">${esc(spec.intro)}</p>` : ''}
        ${spec.fields.map(f => `
          <label class="ask-field">
            <span>${esc(f.label)}${f.required ? '' : ' <i>optional</i>'}</span>
            ${f.type === 'textarea'
              ? `<textarea name="${esc(f.name)}" rows="3" placeholder="${esc(f.placeholder || '')}"></textarea>`
              : f.type === 'select'
              ? `<select name="${esc(f.name)}">${(f.options || []).map(o =>
                  `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`
              : `<input name="${esc(f.name)}" type="${esc(f.type || 'text')}"
                   placeholder="${esc(f.placeholder || '')}">`}
            ${f.hint ? `<i class="ask-hint">${esc(f.hint)}</i>` : ''}
          </label>`).join('')}
        <p class="ask-error" hidden></p>
        <div class="ask-actions">
          <button value="cancel" class="btn ghost" type="submit">Cancel</button>
          <button value="ok" class="btn primary" type="submit">${esc(spec.confirm || 'Done')}</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);

    const done = value => { dlg.close(); dlg.remove(); resolve(value); };
    const form = dlg.querySelector('form');
    const err = dlg.querySelector('.ask-error');

    form.addEventListener('submit', e => {
      // Which button was pressed. Escape closes with no submitter at all.
      const how = e.submitter && e.submitter.value;
      if (how !== 'ok') { e.preventDefault(); done(null); return; }
      const out = {};
      for (const f of spec.fields) out[f.name] = (form.elements[f.name].value || '').trim();
      const missing = spec.fields.find(f => f.required && !out[f.name]);
      if (missing) {
        e.preventDefault();
        err.hidden = false;
        err.textContent = missing.emptyMessage || ('Please fill in ' + missing.label.toLowerCase() + '.');
        form.elements[missing.name].focus();
        return;
      }
      const bad = spec.check && spec.check(out);
      if (bad) { e.preventDefault(); err.hidden = false; err.textContent = bad; return; }
      e.preventDefault();
      done(out);
    });
    // Escape, or the browser closing it some other way.
    dlg.addEventListener('cancel', e => { e.preventDefault(); done(null); });

    dlg.showModal();
    const first = form.querySelector('input, textarea, select');
    if (first) first.focus();
  });
}

// ── Story Board ──────────────────────────────────────────────────────────────
// How a newsroom actually runs: an editor puts up what needs covering, a writer
// claims one, and it turns into a draft with their name on it. Everyone can see
// what is still going.

async function renderBoard() {
  const host = $('view-board');
  let tasks;
  try { tasks = await Store.listAssignments(); }
  catch (err) {
    host.innerHTML = `<div class="bd-wrap"><p class="ev-error">${
      esc(err.message || 'The story board could not be opened.')}</p></div>`;
    return;
  }
  const open = tasks.filter(t => !t.takenBy);
  const taken = tasks.filter(t => t.takenBy);
  const canAssign = can('publish');

  host.innerHTML = `
    <div class="bd-wrap">
      <div class="ev-head">
        <div>
          <h2>Story Board</h2>
          <p>What the paper still needs. ${open.length
            ? open.length + (open.length === 1 ? ' story going spare.' : ' stories going spare.')
            : 'Nothing waiting to be claimed.'}</p>
        </div>
        ${canAssign ? `<button class="btn primary" id="bd-add">＋ Put up a story</button>` : ''}
      </div>

      <div class="bd-list">
        ${open.map(t => taskCard(t, canAssign)).join('') ||
          `<p class="ev-empty">${canAssign
            ? 'Nothing on the board. Put up a story and whoever wants it can claim it.'
            : 'Nothing needs covering right now. Check back, or just start your own story.'}</p>`}
      </div>

      ${taken.length ? `
        <h3 class="ev-past-head">Claimed</h3>
        <div class="bd-list is-taken">${taken.map(t => taskCard(t, canAssign)).join('')}</div>` : ''}
    </div>`;

  const add = $('bd-add');
  if (add) add.onclick = addTask;
  host.querySelectorAll('.bd').forEach(wireTask);
}

function taskCard(t, canAssign) {
  const due = t.due ? Paper.deadline(t.due) : null;
  const mine = t.takenBy && t.takenById === Ed.user.id;
  return `
    <div class="bd${t.takenBy ? ' taken' : ''}" data-id="${esc(t.id)}">
      <div class="bd-main">
        <b>${esc(t.title || 'Untitled assignment')}</b>
        ${t.brief ? `<p>${esc(t.brief)}</p>` : ''}
        <div class="bd-meta">
          ${t.section ? `<span>${esc(Sections.name(t.section))}</span>` : ''}
          ${due ? `<span class="pill p-${esc(due.state)}">${esc(due.label)}${
            due.when ? ' · ' + esc(due.when) : ''}</span>` : ''}
          ${t.takenBy ? `<span class="bd-who">Claimed by ${esc(t.takenBy)}</span>` : ''}
        </div>
      </div>
      <div class="bd-actions">
        ${!t.takenBy ? `<button class="btn small primary" data-act="claim">Claim it</button>` : ''}
        ${mine ? `<button class="btn small ghost" data-act="drop">Give it back</button>` : ''}
        ${canAssign ? `<button class="btn small ghost" data-act="del">Remove</button>` : ''}
      </div>
    </div>`;
}

function wireTask(row) {
  const id = row.dataset.id;
  const on = (act, fn) => { const b = row.querySelector(`[data-act=${act}]`); if (b) b.onclick = fn; };
  on('claim', () => claimTask(id));
  on('drop', () => dropTask(id));
  on('del', () => removeTask(id, row));
}

async function addTask() {
  const got = await ask({
    title: 'Put a story on the board',
    intro: 'Anyone can claim it, and it turns into a draft with their name on it.',
    confirm: 'Put it up',
    fields: [
      { name: 'title', label: 'What needs covering', required: true,
        placeholder: 'e.g. Blood drive on Friday',
        emptyMessage: 'Say what the story is, or nobody will know what to write.' },
      { name: 'brief', label: 'Anything the writer should know', type: 'textarea',
        placeholder: 'Who to talk to, what angle, how long' },
      { name: 'section', label: 'Section', type: 'select',
        options: Sections.all().map(x => ({ value: x.slug, label: x.name })) },
      { name: 'due', label: 'Due date', type: 'date' }
    ],
    check: out => (out.due && !Blocks.parseDate(out.due)) ? 'That is not a real date.' : ''
  });
  if (!got) return;
  try {
    await Store.saveAssignment({ id: Paper.newTaskId(), title: got.title,
      brief: got.brief, due: got.due, section: got.section || 'campus',
      takenBy: '', takenById: '', by: Ed.user.name });
  } catch (err) { return explain(err); }
  await renderBoard();
  toast('On the board', 'good');
}

// Claiming turns the assignment into a real draft, so the writer lands in
// something they can type into rather than a note telling them to start one.
async function claimTask(id) {
  const t = (await Store.listAssignments()).find(x => x.id === id);
  if (!t) return;
  if (t.takenBy) { toast(t.takenBy + ' already claimed that one.', 'bad'); await renderBoard(); return; }
  const doc = blankDoc();
  doc.title = t.title;
  doc.section = t.section || 'campus';
  if (t.brief) doc.blocks = [{ id: Blocks.newId(), type: 'para', text: '' }];
  try {
    await Store.saveArticle(doc);
    await Store.saveAssignment({ ...t, takenBy: Ed.user.name, takenById: Ed.user.id, articleId: doc.id });
  } catch (err) { return explain(err); }
  await refresh();
  toast('Yours — it is in your drafts now', 'good');
  showTab('write');
  open(doc.id);
}

async function dropTask(id) {
  const t = (await Store.listAssignments()).find(x => x.id === id);
  if (!t) return;
  try { await Store.saveAssignment({ ...t, takenBy: '', takenById: '', articleId: '' }); }
  catch (err) { return explain(err); }
  await renderBoard();
  toast('Back on the board', 'good');
}

async function removeTask(id, row) {
  const name = row.querySelector('b').textContent.trim();
  if (!confirm(`Take "${name}" off the board?`)) return;
  try { await Store.deleteAssignment(id); } catch (err) { return explain(err); }
  await renderBoard();
}

// ── What's On ────────────────────────────────────────────────────────────────
// A calendar the club keeps itself. Each event is a row you edit in place —
// there is no separate "edit" mode to get stuck in, and no save button to
// forget, because a half-typed event nobody saved is worse than no event.

async function renderEvents() {
  const host = $('view-events');
  let events;
  try { events = await Store.listEvents(); }
  catch (err) {
    host.innerHTML = `<div class="ev-wrap"><p class="ev-error">${
      esc(err.message || 'The calendar could not be opened.')}</p></div>`;
    return;
  }

  const soon = Paper.upcoming(events);
  const past = events.filter(e => !soon.some(u => u.id === e.id))
                     .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  host.innerHTML = `
    <div class="ev-wrap">
      <div class="ev-head">
        <div>
          <h2>What&rsquo;s On</h2>
          <p>Games, deadlines, spirit weeks &mdash; anything the school should know about.
             ${soon.length ? soon.length + ' coming up.' : 'Nothing coming up yet.'}</p>
        </div>
        <button class="btn primary" id="ev-add">＋ Add an event</button>
      </div>
      <div class="ev-list" id="ev-list">
        ${soon.map(e => eventRow(e)).join('') ||
          `<p class="ev-empty">No events yet. Add the next game or deadline and it
            shows up on the front page straight away.</p>`}
      </div>
      ${past.length ? `
        <h3 class="ev-past-head">Already happened</h3>
        <p class="ev-past-note">These drop off the website on their own the day after
           they happen. Delete them whenever you like.</p>
        <div class="ev-list is-past">${past.map(e => eventRow(e)).join('')}</div>` : ''}
    </div>`;

  $('ev-add').onclick = addEvent;
  host.querySelectorAll('.ev').forEach(wireEventRow);
}

function eventRow(e) {
  return `
    <div class="ev" data-id="${esc(e.id)}">
      <div class="ev-when">${esc(Paper.whenText(e) || 'No date')}</div>
      <div class="ev-fields">
        <input data-f="title" class="ev-title" value="${esc(e.title || '')}"
               placeholder="What is happening?" aria-label="Event name">
        <div class="ev-row">
          <label>Date <input data-f="date" type="date" value="${esc(e.date || '')}"
                 aria-label="Date"></label>
          <label>Time <span class="hint">optional</span>
                 <input data-f="time" value="${esc(e.time || '')}"
                 placeholder="e.g. 7 p.m." aria-label="Time"></label>
          <label>Where <span class="hint">optional</span>
                 <input data-f="place" value="${esc(e.place || '')}"
                 placeholder="e.g. Main gym" aria-label="Place"></label>
        </div>
        <input data-f="note" value="${esc(e.note || '')}"
               placeholder="Anything else worth saying (optional)" aria-label="Note">
      </div>
      <button class="btn ghost small ev-del" data-act="del" aria-label="Delete this event">Delete</button>
    </div>`;
}

// Saves as you type, debounced. The row keeps its own timer so typing in one
// event never cancels the save of another.
const evTimers = new Map();
function wireEventRow(row) {
  const id = row.dataset.id;
  row.querySelectorAll('[data-f]').forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(evTimers.get(id));
      evTimers.set(id, setTimeout(() => saveEventRow(row), 500));
    });
  });
  row.querySelector('[data-act=del]').onclick = () => removeEvent(id, row);
}

async function saveEventRow(row) {
  const id = row.dataset.id;
  const ev = { id };
  row.querySelectorAll('[data-f]').forEach(i => { ev[i.dataset.f] = i.value.trim(); });
  if (!ev.title && !ev.date) return;          // an empty row is not worth saving
  try {
    const existing = (await Store.listEvents()).find(e => e.id === id) || {};
    await Store.saveEvent({ ...existing, ...ev });
    row.querySelector('.ev-when').textContent = Paper.whenText(ev) || 'No date';
    row.classList.toggle('needs-date', !ev.date);
    toast('Calendar saved', 'good');
  } catch (err) { explain(err); }
}

async function addEvent() {
  const ev = { id: Paper.newEventId(), title: '', date: '', time: '', place: '', note: '' };
  try { await Store.saveEvent(ev); } catch (err) { return explain(err); }
  await renderEvents();
  const row = $('view-events').querySelector(`.ev[data-id="${ev.id}"]`);
  if (row) row.querySelector('[data-f=title]').focus();
}

async function removeEvent(id, row) {
  const name = row.querySelector('[data-f=title]').value.trim();
  if (name && !confirm(`Delete “${name}” from the calendar?`)) return;
  try { await Store.deleteEvent(id); } catch (err) { return explain(err); }
  await renderEvents();
  toast('Event deleted', 'good');
}

// The editor's note, shown above the story until it is sent back for review.
function renderEditorNote() {
  const slot = $('editor-note');
  if (!slot) return;
  const d = Ed.doc;
  if (!d || !d.editorNote) { slot.hidden = true; slot.innerHTML = ''; return; }
  slot.hidden = false;
  slot.innerHTML = `<b>Sent back${d.editorNoteBy ? ' by ' + esc(d.editorNoteBy) : ''}${
    d.editorNoteAt ? ' · ' + esc(Blocks.dateText({ date: d.editorNoteAt })) : ''}</b>
    <p>${esc(d.editorNote)}</p>`;
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
  // Only worth offering on a story that is actually in front of readers.
  $('btn-correct').hidden   = !(pub && s === 'published');
  $('btn-save').disabled = $('btn-publish').disabled = Ed.saving;
  $('saved').textContent = Ed.saving ? 'Saving…' : (editable && isDirty() ? 'Unsaved changes' : '');
  const words = Blocks.toPlainText(Ed.doc).join(' ').split(/\s+/).filter(Boolean).length;
  $('wordcount').textContent = words
    ? words.toLocaleString() + (words === 1 ? ' word' : ' words') +
      ' · about ' + Math.max(1, Math.round(words / 200)) + ' min to read'
    : '';

  renderEditorNote();
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
  ['f-title','f-author','f-rating','f-topics'].forEach(id => { $(id).readOnly = on; });
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

  // Going live, or coming back down, is the transition the buttons hide from a
  // writer — but hiding a button is not the same as refusing the action. The
  // hidden button still clicks from the console, and a stale handler can still
  // fire. Say no here as well.
  if ((nextStatus === 'published' || (nextStatus === 'draft' && Ed.doc.status === 'published'))
      && !can('publish')) {
    if (!quiet) toast('Only an editor or an advisor can put a story on the site or take it down.', 'bad');
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
  // Deliberately NOT cleared when a story is taken down. Taking down is the
  // normal way to fix a live story — a writer cannot edit one in place — so
  // clearing it here would re-date every corrected article to the day of the
  // correction. The original run date stands; "Updated ..." carries the revision.

  Ed.saving = true; renderChrome();
  try {
    const saved = await Store.saveArticle(snap);
    if (seq !== Ed.saveSeq) return true;        // a newer save has superseded this
    Ed.doc.slug = saved.slug;
    Ed.doc.status = saved.status;
    Ed.doc.updatedAt = saved.updatedAt;
    Ed.doc.publishedAt = saved.publishedAt || '';
    // The baseline is what was SENT, so anything typed during a slow save stays
    // dirty and gets picked up by the next one instead of being discarded.
    Ed.baseline = snapshot(snap);
    await IDB.kvDel('autosave:' + Ed.doc.id).catch(() => {});
    await Photos.markOrphans(liveAssetIds()).catch(() => {});
    await refresh();
    // renderPreview too: the preview carries the run date, so publishing
    // changes it even though not a word of the story moved.
    renderChrome(); updateSlugline(); renderPreview();
    // Three different actions land on 'draft' — taking a live story down,
    // sending one back, and a writer withdrawing their own — so the caller says
    // which one it was rather than everyone reading "Saved".
    if (!quiet) toast(message
                    || (nextStatus === 'published'
                        ? 'Published ' + Blocks.dateText(snap) + ' — it is on the site now'
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
$('btn-submit').onclick = () => {
  // The note was about the last version. Once it goes back for review it has
  // been dealt with, so it should not still be sitting on top of the story.
  Ed.doc.editorNote = ''; Ed.doc.editorNoteBy = ''; Ed.doc.editorNoteAt = '';
  return save('review', false, 'Sent to an editor');
};
$('btn-withdraw').onclick  = () => {
  // An editor may already be reading it, so make this a decision rather than a
  // stray click.
  if (!confirm('Take this back from the editors?\n\nIt goes back to being your draft, and they will no longer see it waiting.')) return;
  save('draft', false, 'Taken back — it is your draft again');
};
$('btn-publish').onclick   = () => save('published');
$('btn-unpublish').onclick = () => save('draft', false, 'Taken down — it is no longer on the site');
// Sending a story back used to flip it to draft in silence: the writer found it
// in their drafts with no idea what was wrong, which is the opposite of what a
// review is for. The note is required — an empty one cancels.
$('btn-sendback').onclick = async () => {
  const got = await ask({
    title: 'Send it back',
    intro: (Ed.doc.author || 'The writer') + ' will see this at the top of the story.',
    confirm: 'Send it back',
    fields: [{ name: 'why', label: 'What needs changing', type: 'textarea', required: true,
      placeholder: 'e.g. The second quote needs a name — who said it?',
      emptyMessage: 'Say what needs changing — that is the point of sending it back.' }]
  });
  if (!got) return;
  const why = got.why;
  Ed.doc.editorNote = why.trim();
  Ed.doc.editorNoteBy = Ed.user.name;
  Ed.doc.editorNoteAt = new Date().toISOString();
  await save('draft', false, 'Sent back with your note');
};
// A published story that got something wrong should say so, not change quietly
// behind the reader's back. That is the habit a newspaper is supposed to teach.
$('btn-correct').onclick = async () => {
  const got = await ask({
    title: 'Add a correction',
    intro: 'This is printed at the foot of the story, where readers can see it.',
    confirm: 'Add it',
    fields: [{ name: 'what', label: 'What was wrong', type: 'textarea', required: true,
      placeholder: 'e.g. An earlier version spelled Mr. Harvatine\'s name wrong.',
      emptyMessage: 'A correction needs to say what was wrong.' }]
  });
  if (!got) return;
  Ed.doc.corrections = (Ed.doc.corrections || []).concat({
    text: got.what, at: new Date().toISOString(), by: Ed.user.name });
  save(null, false, 'Correction added');
};

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

// Anything boot() throws used to land nowhere: both the sign-in card and the
// newsroom start hidden, so a failure left a blank page with no clue what went
// wrong. Say what happened instead, and say what usually fixes it.
boot().catch(err => {
  console.error('[Newsroom] could not start:', err);
  document.body.innerHTML =
    `<div class="fatal"><h1>The newsroom didn't start</h1>
     <p>${esc(err && err.message ? err.message : String(err))}</p>
     <p>Reload the page while holding <b>Shift</b> — that fetches a fresh copy
        rather than the one this browser saved. If it keeps happening, close any
        other tabs with the paper open and try again.</p></div>`;
});
