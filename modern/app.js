// The Blanson Post — MODERN
// Editorial/magazine layout: big type, card grid, light + dark themes.

// ── theme ────────────────────────────────────────────────────────────────────
const THEME_KEY = 'bp-modern-theme';
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode */ }
}
let theme = 'dark';
try { theme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) {}
applyTheme(theme);
document.getElementById('theme').onclick = () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
};

// ── chrome ───────────────────────────────────────────────────────────────────
document.getElementById('nav').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}" data-sec="${esc(s.slug)}">${esc(s.name)}</a>`).join('') +
  `<a href="#/staff" data-sec="staff">The Team</a>` +
  `<a href="#/gallery" data-sec="gallery">Art &amp; Photos</a>` +
  `<a href="#/topics" data-sec="topics">Topics</a>` +
  `<a href="#/scholarships" data-sec="scholarships">Scholarships</a>`;

document.getElementById('nav').insertAdjacentHTML('beforeend',
  `<form class="searchbox" role="search" onsubmit="return false">
     <input id="q" type="search" placeholder="Search" aria-label="Search the paper"
            autocomplete="off"></form>`);
document.getElementById('foot-sections').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}">${esc(s.name)}</a>`).join('') +
  // The pages that are not sections and are not worth another nav item.
  `<span class="foot-extra">
     <a href="#/about">About us</a>
     <a href="#/all">Every story</a>
     <a href="#/topics">Topics</a>
     <a href="#/best">Best reviewed</a>
     <a href="#/saved">Reading list</a>
     <a href="#/corrections">Corrections</a>
   </span>`;

addEventListener('scroll', () => {
  const max = document.body.scrollHeight - innerHeight;
  document.getElementById('progress').style.width =
    (max > 0 ? (scrollY / max) * 100 : 0) + '%';
}, { passive: true });

// Heading levels are the outline a screen-reader user navigates by, so a page
// must not jump from h1 straight to h3 — a listener stepping through headings
// hears the jump as a missing section. Card headlines therefore sit at h2 under
// the page's own h1, which is flat but never skips. Styling is by class, so the
// level is free to be whatever the outline needs.

// ── pieces ───────────────────────────────────────────────────────────────────
const chip = a => `<span class="chip">${esc(sectionName(a.section))}</span>`;

const score = a => a.rating == null ? '' :
  `<span class="score"><b>${a.rating}</b><i>/${a.ratingMax}</i></span>`;

// '' for the archived 41, which carry no date — the separator goes with it.
const when = (a, full) => dateTag(a, 'pubdate', full);

const meta = a => `<div class="meta">
    <span class="who">${esc(byline(a))}</span>
    ${when(a) ? `<span class="dot">·</span>${when(a)}` : ''}
    <span class="dot">·</span><span>${readingTime(a)} min</span>
    ${a.rating != null ? `<span class="dot">·</span>${score(a)}` : ''}
  </div>`;

function thumb(a, cls) {
  const src = leadImage(a);
  return src
    ? `<div class="${cls}"><img src="${esc(src)}" alt="" loading="lazy"></div>`
    : `<div class="${cls} ph"><span>${esc(sectionName(a.section))}</span></div>`;
}

function textHTML(a, line) {
  if (isQA(a)) {
    const s = speakerOf(line);
    if (!s) return `<p class="lede">${esc(line)}</p>`;
    const q = /borrego|borrega/i.test(s.who);
    return `<div class="turn ${q ? 'q' : 'a'}">
              <div class="turn-who">${esc(s.who)}</div>
              <div class="turn-txt">${esc(s.text)}</div>
            </div>`;
  }
  return `<p>${esc(line)}</p>`;
}

// Photos run through the article (see layoutBlocks), not stacked at the end.
// A photo that can no longer be found renders as nothing at all, rather than a
// broken image sitting in the middle of the story.
const inlineFig = b => {
  const src = imageUrl(b.src);
  if (!src) return '';
  return `<figure class="inline-fig">
    <img src="${esc(src)}" alt="${esc(b.decorative ? '' : (b.alt || ''))}" loading="lazy">
    ${b.caption || b.credit ? `<figcaption>${esc(b.caption || '')}${
      b.credit ? ` <span>${esc(b.credit)}</span>` : ''}</figcaption>` : ''}
  </figure>`;
};

// A video the students made. The address is rebuilt by Blocks.embedOf from a
// template — never taken straight from what was typed — so an unknown or unsafe
// link can only ever come out as a link, not an iframe.
function embedHTML(b) {
  const e = Blocks.embedOf(b.url);
  if (!e.ok) {
    return e.url
      ? `<p class="embed-fallback">Video: <a href="${esc(e.url)}" target="_blank" rel="noopener nofollow">${esc(e.url)}</a></p>`
      : '';
  }
  return `<figure class="embed">
    <div class="embed-frame">
      <iframe src="${esc(e.frame)}" title="${esc(b.caption || (e.host + ' video'))}"
        loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"></iframe>
    </div>
    ${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}
  </figure>`;
}

function bodyHTML(a) {
  if (isVerse(a)) {
    return `<div class="verse">${a.body.map(esc).join('<br>')}</div>` +
           (a.images || []).slice(1)
             .map((src, i) => inlineFig(Blocks.photoOf(a, i + 1) || { src })).join('');
  }
  return Blocks.of(a).map(b => renderBlock(a, b)).join('');
}

// One block in this design's own vocabulary. Archived articles arrive as
// text and photos only; the newsroom can also produce headings, pull quotes,
// verse and Q&A turns.
function renderBlock(a, b) {
  switch (b.type) {
    case 'photo':   return inlineFig(b);
    case 'embed':   return embedHTML(b);
    case 'heading': return `<h2 class="subhead">${esc(b.text)}</h2>`;
    case 'quote':   return `<blockquote class="pullquote">${esc(b.text)}${b.attrib ? `<cite>${esc(b.attrib)}</cite>` : ''}</blockquote>`;
    case 'verse':   return `<div class="verse">${(b.lines || []).map(esc).join('<br>')}</div>`;
    case 'qa':      return `<div class="turn ${b.role === 'q' ? 'q' : 'a'}">
              <div class="turn-who">${esc(b.who)}</div>
              <div class="turn-txt">${esc(b.text)}</div>
            </div>`;
    default:        return textHTML(a, b.text);
  }
}

function facts(a) {
  const k = a.meta ? Object.keys(a.meta) : [];
  if (!k.length) return '';
  return `<dl class="facts">${k.map(x =>
    `<div><dt>${esc(x)}</dt><dd>${esc(a.meta[x])}</dd></div>`).join('')}</dl>`;
}

// ── views ────────────────────────────────────────────────────────────────────
function renderHome() {
  const lead = featured();
  const rest = ARTICLES.filter(a => a.id !== lead.id);
  const spot = rest.slice(0, 2);
  const grid = rest.slice(2, 11);

  return `
  <div id="whats-on"></div>
  <section class="hero">
    <a class="hero-main" href="#/a/${esc(lead.slug)}">
      ${thumb(lead, 'hero-img')}
      <div class="hero-txt">
        ${chip(lead)}
        <h1>${esc(lead.title)}</h1>
        <p>${esc(lead.excerpt)}</p>
        ${meta(lead)}
      </div>
    </a>
    <div class="hero-side">
      ${spot.map(a => `
        <a class="spot" href="#/a/${esc(a.slug)}">
          ${thumb(a, 'spot-img')}
          <div>
            ${chip(a)}
            <h2 class="card-hed">${esc(a.title)}</h2>
            ${meta(a)}
          </div>
        </a>`).join('')}
    </div>
  </section>

  <section class="strip">
    <div><b>${ARTICLES.length}</b><span>articles</span></div>
    <div><b>${new Set(ARTICLES.map(a => a.author).filter(Boolean)).size}</b><span>student writers</span></div>
    <div><b>${SECTIONS.length}</b><span>sections</span></div>
    <div><b>${ARTICLES.reduce((n, a) => n + a.body.join(' ').split(/\s+/).length, 0).toLocaleString()}</b><span>words published</span></div>
  </section>

  <section class="block">
    <div class="block-head"><h2>Latest</h2></div>
    <div class="cards">
      ${grid.map(a => `
        <a class="card" href="#/a/${esc(a.slug)}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h2 class="card-hed">${esc(a.title)}</h2>
            <p>${esc(a.excerpt.slice(0, 120))}…</p>
            ${meta(a)}
          </div>
        </a>`).join('')}
    </div>
  </section>

  ${SECTIONS.map(s => {
    const items = bySection(s.slug).filter(a => a.id !== lead.id).slice(0, 4);
    if (items.length < 2) return '';
    return `
    <section class="block">
      <div class="block-head">
        <h2>${esc(s.name)}</h2>
        <a href="#/s/${esc(s.slug)}">See all ${bySection(s.slug).length} →</a>
      </div>
      <div class="rail">
        ${items.map(a => `
          <a class="mini" href="#/a/${esc(a.slug)}">
            ${thumb(a, 'mini-img')}
            <h2 class="mini-hed">${esc(a.title)}</h2>
            <div class="mini-by">${esc(byline(a))}${when(a) ? ' · ' + when(a) : ''}</div>
          </a>`).join('')}
      </div>
    </section>`;
  }).join('')}`;
}

// First section a writer appears in — enough to point at their work when the
// paper has no profile for them.
function byAuthor(name) { return ARTICLES.find(a => a.author === name) || null; }

// ── Search box ───────────────────────────────────────────────────────────────
// Typing updates the address, so a search can be bookmarked, shared, and gone
// back to. Debounced so every keystroke is not a new history entry.
let searchTimer = null;
function wireSearch() {
  const box = document.getElementById('q');
  if (!box) return;
  box.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const v = box.value.trim();
    searchTimer = setTimeout(() => {
      const want = v ? '#/q/' + encodeURIComponent(v) : '#/';
      if (location.hash !== want) location.replace(want);
    }, 180);
  });
  box.addEventListener('keydown', e => { if (e.key === 'Escape') { box.value = ''; location.replace('#/'); } });
}
wireSearch();

// After a re-render, put back what was typed without stealing the caret.
function syncSearchBox(q) {
  const box = document.getElementById('q');
  if (box && document.activeElement !== box && box.value !== q) box.value = q || '';
}

// The address is the real query, so read it back from there.
function currentQuery() {
  const h = location.hash.replace(/^#\/?/, '');
  return h.startsWith('q/') ? decodeURIComponent(h.slice(2)) : '';
}

// Browsers put back whatever was last typed in a search box when the page is
// reloaded or reached with the back button — and they do it *after* this script
// runs, so the box could sit there saying one thing while the results below it
// answered another. pageshow fires after that restoring, which is the only
// moment late enough to correct it.
addEventListener('pageshow', () => syncSearchBox(currentQuery()));
syncSearchBox(currentQuery());

// A byline that links to the writer's page. Only safe where the byline is not
// already inside a card's own link — an <a> inside an <a> is invalid HTML and
// the browser silently splits it, breaking both links. That is why the cards
// keep plain text and only the article page links.
const bylineLink = a => {
  const name = byline(a);
  if (!a.author) return esc(name);
  return `<a class="by-link" href="#/w/${esc(Paper.writerSlug(a.author))}">${esc(name)}</a>`;
};

// ── Search results ───────────────────────────────────────────────────────────
function renderSearch(q) {
  syncSearchBox(q);
  const hits = Paper.search(q);
  return `
  <section class="sec-head">
    <h1>${esc(q)}</h1>
    <p>${hits.length} ${hits.length === 1 ? 'result' : 'results'}</p>
  </section>
  <section class="block">
    ${hits.length ? `<div class="cards">${hits.map(h => `
      <a class="card" href="#/a/${esc(h.article.slug)}">
        ${thumb(h.article, 'card-img')}
        <div class="card-body">
          ${chip(h.article)}
          <h2 class="card-hed">${Paper.highlight(esc(h.article.title), q)}</h2>
          <p>${Paper.highlight(esc(h.snippet), q)}</p>
          ${meta(h.article)}
        </div>
      </a>`).join('')}</div>`
    : `<p class="no-hits">Nothing matched <b>${esc(q)}</b>. Try a writer&rsquo;s name,
        part of a headline, or a word from the story.</p>`}
  </section>`;
}

// ── What's On ────────────────────────────────────────────────────────────────
// Events come from storage, not from a file, so this renders after the page is
// already up rather than blocking the front page on it. If the calendar cannot
// be read the block simply does not appear — a broken calendar should never
// take the newspaper down with it.
let eventsCache = null;
async function loadEvents() {
  if (eventsCache) return eventsCache;
  try { eventsCache = await Store.listEvents(); }
  catch (e) { console.warn('[Blanson Post] calendar unavailable:', e); eventsCache = []; }
  return eventsCache;
}

// A strip, not a section. This used the same header as a section page — a 54px
// display heading with 70px of padding around it — for a five-item list sitting
// above the lead story, so the front page opened on the calendar instead of on
// the news. The date badge sat above each title too, which cost another 56px a
// card for no information.
//
// The heading is an h2 and the card titles are h3: the h1 on this page belongs
// to the lead story, not to the calendar. Styling hangs off .ev-hed rather than
// the tag, so the level stays free to be whatever the outline needs.
function eventsHTML(list) {
  return `
    <section class="ev-block">
      <div class="ev-head-row">
        <h2>What&rsquo;s On</h2>
        <span>Coming up at Blanson</span>
      </div>
      <div class="ev-strip">
        ${list.map(e => {
          const b = Paper.dayBadge(e);
          return `<div class="ev-card">
            <div class="ev-cal"><span>${esc(b.top)}</span><b>${esc(b.bottom)}</b></div>
            <div class="ev-txt">
              <h3 class="ev-hed">${esc(e.title)}</h3>
              <div class="ev-meta">${esc(Paper.whenText(e))}${
                e.place ? ' · ' + esc(e.place) : ''}</div>
              ${e.note ? `<p>${esc(e.note)}</p>` : ''}
            </div>
          </div>`; }).join('')}
      </div>
    </section>`;
}

async function paintEvents() {
  const soon = Paper.upcoming(await loadEvents(), 5);
  // Looked up AFTER the await, not before: hydrating the newsroom articles
  // re-runs route(), which replaces the page and with it this slot. Holding a
  // reference across the await wrote the calendar into a detached element and
  // left the real one empty.
  const slot = document.getElementById('whats-on');
  if (!slot) return;
  try { slot.innerHTML = soon.length ? eventsHTML(soon) : ''; }
  catch (e) {
    // A calendar that cannot draw must not take the front page down, but it
    // must not vanish without a word either.
    console.error('[Blanson Post] could not draw the calendar:', e);
    slot.innerHTML = '';
  }
}

// ── Best reviewed ────────────────────────────────────────────────────────────
function renderBest() {
  const list = Paper.bestReviews();
  return `
  <section class="sec-head">
    <h1>Best Reviewed</h1>
    <p>${list.length} rated ${list.length === 1 ? 'review' : 'reviews'}, highest first</p>
  </section>
  <section class="block">
    <div class="cards">
      ${list.map(x => { const a = x.article; return `
        <a class="card" href="#/a/${esc(a.slug)}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h2 class="card-hed">${esc(a.title)}</h2>
            <p>${esc(a.excerpt.slice(0, 130))}…</p>
            ${meta(a)}
          </div>
        </a>`; }).join('')}
    </div>
  </section>`;
}

// ── Share ──────────────────────────────────────────────────────────────────────
// The address in the bar is #/a/<slug> — a view of this one page, not a page of
// its own. Chat apps, Instagram and Google Classroom draw their preview by
// fetching the link on their own servers, and none of them runs our JavaScript,
// so pasting that address anywhere gets a bare link with no headline and no
// photo. Every archived story also has a small real page at a/<slug>/ carrying
// exactly those things, and that is the address worth handing out.
//
// A story published from the newsroom has no such page — the build never saw
// it — so its in-app address is shared instead. A working link with a plain
// preview beats a tidy-looking one that 404s.
const hasSharePage = slug => (window.SHARE_PAGES || []).indexOf(slug) !== -1;

const shareUrl = a => hasSharePage(a.slug)
  ? new URL('../a/' + encodeURIComponent(a.slug) + '/', location.href).href
  : location.href;

const shareButton = a =>
  `<button class="share-btn" type="button" data-share="${esc(a.slug)}">Share</button>`;

function shareSaid(btn, msg) {
  const was = btn.dataset.was || btn.textContent;
  btn.dataset.was = was;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = was; btn.disabled = false; }, 1600);
}

// Last resort: put the address on screen so it can be copied by hand. Not a
// prompt() — a browser that has been told to stop showing dialogs returns
// undefined from those without a word, and the button just stops working.
function shareShowLink(btn, url) {
  const box = document.createElement('input');
  box.className = 'share-link';
  box.readOnly = true;
  box.value = url;
  box.setAttribute('aria-label', 'Link to this story — copy it');
  btn.replaceWith(box);
  box.focus();
  box.select();
}

async function shareStory(btn) {
  const a = bySlug(btn.dataset.share);
  if (!a) return;
  const url = shareUrl(a);

  // The phone's own share sheet where there is one, because that is the thing
  // students actually use to put a link in a group chat.
  if (navigator.share) {
    try { await navigator.share({ title: a.title, url }); return; }
    catch (err) {
      // Closing the sheet is a decision, not a failure: do not go on to copy a
      // link they just chose not to send. Anything else falls through and tries
      // the clipboard instead.
      if (err && err.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    shareSaid(btn, 'Link copied');
  } catch (err) {
    // The clipboard is refused outside a secure page and under some school
    // browser policies. Showing the address is still useful; failing quietly
    // is not.
    shareShowLink(btn, url);
  }
}

// Delegated once, on the container: the article page is redrawn from scratch on
// every route, so a handler bound to the button itself would be thrown away
// with it.
document.getElementById('app').addEventListener('click', e => {
  const share = e.target.closest('.share-btn');
  if (share) { shareStory(share); return; }
  const save = e.target.closest('.save-btn');
  if (save) toggleSaved(save);
});

// ── Reading list ─────────────────────────────────────────────────────────────
// Kept in this browser and nowhere else. There is no account behind it, so a
// list made on a school Chromebook is not on anybody's phone — the page says
// that outright rather than letting a reader assume otherwise.
const savedButton = a => {
  const on = Saved.has(a.slug);
  return `<button class="save-btn${on ? ' on' : ''}" type="button"
    data-save="${esc(a.slug)}" aria-pressed="${on}">${on ? 'Saved' : 'Save'}</button>`;
};

function toggleSaved(btn) {
  const slug = btn.dataset.save;
  const was = Saved.has(slug);
  const now = Saved.toggle(slug);
  // toggle() reports where it ended up, not where it was aimed. A private
  // window has the storage API and refuses every write, and a button that went
  // on claiming "Saved" would be lying to the reader.
  if (now === was) {
    btn.textContent = 'Can’t save here';
    btn.disabled = true;
    btn.title = 'This browser is not letting the page remember anything — ' +
                'usually a private window, or site data turned off.';
    return;
  }
  btn.classList.toggle('on', now);
  btn.setAttribute('aria-pressed', String(now));
  btn.textContent = now ? 'Saved' : 'Save';
  // Un-saving from the list itself has to take the row away with it.
  if (location.hash.replace(/^#\/?/, '') === 'saved') route();
}

// ── Photographers ────────────────────────────────────────────────────────────
// The credit line is printed exactly as the old site printed it; only the name
// inside it becomes a link.
function creditLink(credit, by) {
  const c = esc(credit || '');
  if (!by) return c;
  const name = esc(by);
  const at = c.indexOf(name);
  if (at === -1) return c;
  return c.slice(0, at) +
    `<a href="#/p/${esc(Paper.writerSlug(by))}">${name}</a>` +
    c.slice(at + name.length);
}

// Gallery photos open in place rather than navigating away to a bare .jpg.
// Delegated on #app, so a gallery the router redraws keeps working.
Lightbox.wire(document.getElementById('app'), '.gal-item');

// The skip link must not travel through the router. Every address on this site
// is a hash, so following "#app" would put "app" in the bar, match no route,
// and drop the reader on the front page — sending someone who asked to skip the
// navigation to a different page entirely. Move the focus by hand instead and
// leave the address alone.
(function () {
  const link = document.querySelector('.skip');
  if (!link) return;
  link.addEventListener('click', e => {
    e.preventDefault();
    const main = document.getElementById('app');
    if (!main) return;
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  });
})();

// ── Topics ─────────────────────────────────────────────────────────────────────
// A section is where a story is filed; a topic is what it is about, and a story
// can carry more than one. Printed at the foot of the story, where a reader who
// has just finished it is looking for the next thing.
const topicChips = a => {
  const list = Paper.topicsOf(a);
  if (!list.length) return '';
  return `<div class="tchips"><span class="tchips-lab">Filed under</span>${
    list.map(t => `<a class="tchip" href="#/t/${esc(t.slug)}">${esc(t.name)}</a>`).join('')}</div>`;
};

function renderTopic(slug) {
  const items = Paper.byTopic(slug);
  const name = Paper.topicName(slug);
  const near = Paper.relatedTopics(slug);
  if (!items.length) return `
    <section class="sec-head"><h1>${esc(name)}</h1>
      <p>Nothing is filed under this yet · <a href="#/topics">all topics</a></p>
    </section>`;
  const secs = new Set(items.map(a => a.section)).size;
  return `
  <section class="sec-head">
    <h1>${esc(name)}</h1>
    <p>${items.length} ${items.length === 1 ? 'article' : 'articles'} across
       ${secs} ${secs === 1 ? 'section' : 'sections'} · <a href="#/topics">all topics</a></p>
  </section>
  <section class="block">
    <div class="cards">
      ${items.map(a => `
        <a class="card" href="#/a/${esc(a.slug)}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h2 class="card-hed">${esc(a.title)}</h2>
            <p>${esc(a.excerpt.slice(0, 130))}…</p>
            ${meta(a)}
          </div>
        </a>`).join('')}
    </div>
  </section>
  ${near.length ? `
  <section class="block">
    <div class="block-head"><h2>Often together with</h2></div>
    <div class="tchips">${near.map(t =>
      `<a class="tchip" href="#/t/${esc(t.slug)}">${esc(t.name)}</a>`).join('')}</div>
  </section>` : ''}`;
}

function renderTopics() {
  const all = Paper.allTopics();
  return `
  <section class="sec-head">
    <h1>Topics</h1>
    <p>${all.length} ${all.length === 1 ? 'topic' : 'topics'}, most written-about first</p>
  </section>
  <section class="block">
    ${all.length ? `<div class="topic-grid">
      ${all.map(t => `
        <a class="topic-card" href="#/t/${esc(t.slug)}">
          <b>${esc(t.name)}</b>
          <i>${t.count} ${t.count === 1 ? 'article' : 'articles'}</i>
        </a>`).join('')}
    </div>` : `<p>No topics yet. They are set on each article in the newsroom.</p>`}
  </section>`;
}

// ── Saved stories ────────────────────────────────────────────────────────────
function renderSaved() {
  const rows = Saved.list();
  return `
  <section class="sec-head">
    <h1>Reading List</h1>
    <p>${rows.length ? rows.length + (rows.length === 1 ? ' story' : ' stories') + ' saved'
                     : 'Nothing saved yet'}</p>
  </section>
  <section class="block">
    <p class="list-note">${Saved.usable()
      ? 'Kept in this browser on this computer. It is not an account, so it will not follow you to a phone or to the library machines.'
      : 'This browser will not let the page remember anything — usually a private window, or site data turned off — so nothing can be saved here.'}</p>
    ${rows.length ? `<div class="cards">
      ${rows.map(r => `
        <div class="card saved-card">
          <a href="#/a/${esc(r.article.slug)}">${thumb(r.article, 'card-img')}</a>
          <div class="card-body">
            ${chip(r.article)}
            <h2 class="card-hed"><a href="#/a/${esc(r.article.slug)}">${esc(r.article.title)}</a></h2>
            <p>${esc(r.article.excerpt.slice(0, 120))}…</p>
            ${savedButton(r.article)}
          </div>
        </div>`).join('')}
    </div>` : `<p>Press <b>Save</b> on any story and it will wait for you here.</p>`}
  </section>`;
}

// ── Corrections ──────────────────────────────────────────────────────────────
function renderCorrections() {
  const rows = Paper.corrections();
  return `
  <section class="sec-head">
    <h1>Corrections</h1>
    <p>${rows.length ? rows.length + (rows.length === 1 ? ' correction' : ' corrections')
                     : 'Nothing to correct so far'}</p>
  </section>
  <section class="block">
    <p class="list-note">When we get something wrong we say so here and at the foot
      of the story itself, rather than changing it quietly.</p>
    ${rows.length ? rows.map(c => `
      <div class="corr-row">
        <a class="corr-hed" href="#/a/${esc(c.article.slug)}">${esc(c.article.title)}</a>
        <p>${esc(c.text)}</p>
        <div class="corr-by">${esc(Blocks.dateText({ date: c.at }) || '')}${
          c.by ? ' · ' + esc(c.by) : ''}</div>
      </div>`).join('') : `<p>No corrections have been run yet.</p>`}
  </section>`;
}

// ── One photographer ─────────────────────────────────────────────────────────
function renderPhotographer(slug) {
  const p = Paper.photographer(slug);
  if (!p) return `<section class="sec-head"><h1>No such photographer</h1></section>`;
  const alsoWrites = Paper.writer(slug);
  return `
  <section class="sec-head">
    <h1>${esc(p.name)}</h1>
    <p>${p.count} ${p.count === 1 ? 'picture' : 'pictures'} in the paper${
      alsoWrites ? ` · <a href="#/w/${esc(slug)}">also writes for us</a>` : ''}</p>
  </section>
  ${p.artwork.length ? `<section class="block"><div class="art-solo">
    ${p.artwork.map(a => `
      <figure class="solo">
        <img src="${esc(imageUrl(a.file))}" alt="${esc(a.title + ' by ' + a.by)}" loading="lazy">
        <figcaption><b>${esc(a.title)}</b><span>${esc(a.credit)}</span></figcaption>
      </figure>`).join('')}
  </div></section>` : ''}
  ${p.galleries.map(g => `
    <section class="sec-head"><h1>${esc(g.title)}</h1>
      <p>${esc(g.year ? g.year + ' · ' : '')}${g.photos.length} photos${
        g.note ? ' · ' + esc(g.note) : ''}</p></section>
    <section class="block">
      <div class="gal">
        ${g.photos.map(f => `<a class="gal-item" href="${esc(imageUrl(f))}" target="_blank" rel="noopener" data-caption="${esc(g.title)}" data-credit="${esc(g.credit)}">
           <img src="${esc(imageUrl(f))}" alt="${esc(g.title)}" loading="lazy"></a>`).join('')}
      </div>
    </section>`).join('')}`;
}

// ── About the paper ──────────────────────────────────────────────────────────
// Content lives in Paper.about() so the club edits it once, not three times.
function renderAbout() {
  const a = Paper.about();
  return `
  <section class="sec-head">
    <h1>About The Blanson Post</h1>
    <p>${esc(a.motto)} · Est. ${esc(a.founded)}</p>
  </section>
  <section class="block about">
    ${a.what.map(p => `<p class="about-lede">${esc(p)}</p>`).join('')}

    <div class="block-head"><h2>How a story gets on the site</h2></div>
    <ol class="about-steps">
      ${a.how.map(s => `<li><b>${esc(s.title)}</b><span>${esc(s.text)}</span></li>`).join('')}
    </ol>

    <div class="block-head"><h2>Writing for us</h2></div>
    <p>${esc(a.join)}</p>
    <p>${esc(a.meet.text)}</p>
    <p>${esc(a.contact.text)}</p>

    <div class="block-head"><h2>The older stories</h2></div>
    <p>${esc(a.archive)}</p>

    <div class="block-head"><h2>Where to find us</h2></div>
    <p class="about-where">
      <b>${esc(a.school)}</b><br>${esc(a.district)}<br>
      ${esc(a.address)}<br>${esc(a.phone)}
    </p>
    <div class="about-links">
      <a href="#/staff">The people who make it →</a>
      <a href="#/corrections">Corrections →</a>
    </div>
  </section>`;
}

// ── Series ───────────────────────────────────────────────────────────────────
// Two stories that are parts of one thing. Printed under the byline rather than
// at the foot, because knowing you are halfway through something changes how
// you read it.
function seriesStrip(a) {
  const s = Paper.seriesOf(a);
  if (!s) return '';
  return `<nav class="series" aria-label="Part of a series">
    <b>Part ${s.part} of ${s.of} &middot; ${esc(s.name)}</b>
    <span>
      ${s.prev ? `<a href="#/a/${esc(s.prev.slug)}">&larr; ${esc(s.prev.title)}</a>` : ''}
      ${s.next ? `<a href="#/a/${esc(s.next.slug)}">${esc(s.next.title)} &rarr;</a>` : ''}
    </span>
  </nav>`;
}

// ── The whole paper ──────────────────────────────────────────────────────────
function renderAll() {
  const groups = Paper.everything();
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return `
  <section class="sec-head">
    <h1>Every Story</h1>
    <p>${total} in ${groups.length} ${groups.length === 1 ? 'section' : 'sections'}</p>
  </section>
  <section class="block">
    <nav class="all-jump" aria-label="Jump to a section">
      ${groups.map(g => `<a href="#/s/${esc(g.slug)}">${esc(g.name)} <i>${g.items.length}</i></a>`).join('')}
    </nav>
    ${groups.map(g => `
      <div class="block-head"><h2>${esc(g.name)}</h2>
        <a href="#/s/${esc(g.slug)}">${g.items.length} &rarr;</a></div>
      <ul class="all-list">
        ${g.items.map(a => `<li>
          <a href="#/a/${esc(a.slug)}">${esc(a.title)}</a>
          <i>${esc(byline(a))}${when(a) ? ' · ' + when(a) : ''}</i>
        </li>`).join('')}
      </ul>`).join('')}
  </section>`;
}

// ── One writer ───────────────────────────────────────────────────────────────
function renderWriter(slug) {
  const w = Paper.writer(slug);
  if (!w) return `<section class="sec-head"><h1>No such writer</h1></section>`;
  const p = w.profile;
  const shoots = Paper.photographer(slug);
  return `
  <section class="sec-head">
    <h1>${esc(w.name)}</h1>
    <p>${w.stories.length} ${w.stories.length === 1 ? 'story' : 'stories'}${
      p ? ' · ' + esc(p.beats) : ''}${
      shoots ? ` · <a href="#/p/${esc(slug)}">${shoots.count} photographs</a>` : ''}</p>
  </section>
  <section class="block">
    ${p ? `<div class="person writer-card">
      ${p.photo ? `<img class="avatar lg photo" src="${esc(imageUrl(p.photo))}" alt="${esc(p.name)}">`
                : `<div class="avatar lg">${esc(Paper.initials(p.name))}</div>`}
      <div class="person-in"><p class="person-bio">${esc(p.bio)}</p></div>
    </div>` : `<p class="writer-none">We haven&rsquo;t got a profile up for
      ${esc(w.name)} yet &mdash; here is everything they have written.</p>`}
    <div class="cards">
      ${w.stories.map(a => `
        <a class="card" href="#/a/${esc(a.slug)}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h2 class="card-hed">${esc(a.title)}</h2>
            <p>${esc(a.excerpt.slice(0, 140))}…</p>
          </div>
        </a>`).join('')}
    </div>
  </section>`;
}

// ── Art & photography ────────────────────────────────────────────────────────
function renderGallery() {
  const gals = Paper.galleries();
  const art = Paper.artwork();
  return `
  <section class="sec-head">
    <h1>Art &amp; Photography</h1>
    <p>${Paper.photoCount()} pictures by Blanson students and staff</p>
  </section>
  <section class="block">
    <div class="art-solo">
      ${art.map(a => `
        <figure class="solo">
          <img src="${esc(imageUrl(a.file))}" alt="${esc(a.title + ' by ' + a.by)}" loading="lazy">
          <figcaption><b>${esc(a.title)}</b><span>${esc(a.credit)}</span></figcaption>
        </figure>`).join('')}
    </div>
  </section>
  ${gals.map(g => `
    <section class="sec-head"><h1>${esc(g.title)}</h1>
      <p>${esc(g.year ? g.year + ' · ' : '')}${creditLink(g.credit, g.by)}${g.note ? ' · ' + esc(g.note) : ''}</p></section>
    <section class="block">
      <div class="gal">
        ${g.photos.map(f => `<a class="gal-item" href="${esc(imageUrl(f))}" target="_blank" rel="noopener" data-caption="${esc(g.title)}" data-credit="${esc(g.credit)}">
           <img src="${esc(imageUrl(f))}" alt="${esc(g.title)}" loading="lazy"></a>`).join('')}
      </div>
    </section>`).join('')}`;
}

// ── Blanson F.C., shown on the Sports page ───────────────────────────────────
function fcBlock() {
  const fc = Paper.fc();
  return `
  <section class="block">
    <a class="fc-card" href="${esc(fc.url)}" target="_blank" rel="noopener">
      <div class="fc-badge">⚽</div>
      <div>
        <b>${esc(fc.name)} has its own site ↗</b>
        <span>${esc(fc.blurb)}</span>
      </div>
    </a>
  </section>`;
}

// ── The team ─────────────────────────────────────────────────────────────────
function renderStaff() {
  const team = Paper.staff();
  const also = Paper.contributors();
  return `
  <section class="sec-head">
    <h1>The News Team</h1>
    <p>${team.length} writers, photographers and editors &middot; 2025&ndash;2026 ·
       <a href="#/about">about the paper</a></p>
  </section>
  <section class="block">
    <div class="people">
      ${team.map(m => {
        const mine = Paper.storiesBy(m.name);
        return `
        <article class="person">
          ${m.photo ? `<img class="avatar lg photo" src="${esc(imageUrl(m.photo))}"
              alt="${esc(m.name)}" loading="lazy">`
            : `<div class="avatar lg">${esc(Paper.initials(m.name))}</div>`}
          <div class="person-in">
            <h2 class="person-hed"><a href="#/w/${esc(Paper.writerSlug(m.name))}">${esc(m.name)}</a></h2>
            <div class="person-beat">${esc(m.beats)}</div>
            <p class="person-bio">${esc(m.bio)}</p>
            ${mine.length ? `<div class="person-work">
              ${mine.map(a => `<a href="#/a/${esc(a.slug)}">${esc(a.title)}</a>`).join('')}
            </div>` : `<div class="person-none">Behind the camera &mdash; no bylines this year</div>`}
          </div>
        </article>`; }).join('')}
    </div>
  </section>
  ${also.length ? `
  <section class="sec-head"><h1>Also in this year&rsquo;s paper</h1>
    <p>Bylines without a profile yet</p></section>
  <section class="block">
    <div class="chips">
      ${also.map(c => `<a class="chip-link" href="#/w/${esc(Paper.writerSlug(c.name))}">
         ${esc(c.name)} <b>${c.count}</b></a>`).join('')}
    </div>
  </section>` : ''}`;
}

// ── Scholarships ─────────────────────────────────────────────────────────────
function renderScholarships() {
  const list = Paper.scholarships();
  const open = Paper.openCount();
  const live = list.filter(s => !s.archived);
  const old  = list.filter(s => s.archived);

  const card = s => `
    <div class="card sch-card is-${esc(s.due.state)}">
      <div class="sch-top">
        <span class="sch-amt">${esc(s.amount || '—')}</span>
        <span class="pill p-${esc(s.due.state)}">${esc(s.due.label)}</span>
      </div>
      <h2 class="sch-hed">${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`
                  : esc(s.name)}</h2>
      ${s.org ? `<div class="sch-prov">${esc(s.org)}</div>` : ''}
      ${s.who ? `<p class="sch-who">${esc(s.who)}</p>` : ''}
      ${s.note ? `<p class="sch-note">${esc(s.note)}</p>` : ''}
      <div class="sch-foot">
        <span>${s.awards ? esc(String(s.awards)) + ' awarded' : ''}</span>
        <span>${esc(s.due.when || s.window || '')}</span>
      </div>
    </div>`;

  return `
  <section class="sec-head">
    <h1>Scholarships</h1>
    <p>${open} open or opening soon · checked ${esc(Paper.dateChecked())}</p>
  </section>
  <section class="block">
    <div class="sch-warn">
      <b>Before you apply</b>
      <ul>${Paper.warnings().map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    </div>
    <div class="cards">${live.map(card).join('')}</div>
  </section>
  <section class="sec-head"><h1>Finding more</h1>
    <p>No page can hold every scholarship. These do the searching for you</p></section>
  <section class="block">
    <div class="finders">
      ${Paper.finders().map(f => `
        <a class="finder" href="${esc(f.url)}" target="_blank" rel="noopener">
          <b>${esc(f.name)} ↗</b>
          ${f.by ? `<i>${esc(f.by)}</i>` : ''}
          <span>${esc(f.note)}</span>
        </a>`).join('')}
    </div>
  </section>
  ${old.length ? `
  <section class="sec-head"><h1>From the old site</h1>
    <p>Carried over with no links, never checked, all long closed</p></section>
  <section class="block"><div class="cards">${old.map(card).join('')}</div></section>` : ''}`;
}

// ── Alumni directory, shown on the Alumni section page ───────────────────────
function alumniBlock() {
  const list = Paper.alumni();
  if (!list.length) return '';
  return `
  <section class="sec-head"><h1>Where they are now</h1>
    <p>See what the graduates of Blanson are up to</p></section>
  <section class="block">
    <div class="cards">
      ${list.map(v => `
        <div class="card alum">
          <div class="alum-what">${esc(v.what)}</div>
          ${v.name ? `<h2 class="alum-hed">${esc(v.name)}</h2>` : ''}
          <p>${esc(v.note)}</p>
          ${v.handle ? `<div class="alum-at">${esc(v.handle)}</div>` : ''}
        </div>`).join('')}
    </div>
  </section>`;
}

// Offered on section pages that actually hold rated reviews, rather than as
// another nav item — that nav is already long enough to have overflowed once.
const bestLink = slug => bySection(slug).some(a => a.rating != null)
  ? `<a class="best-link" href="#/best">★ Best reviewed &rarr;</a>` : '';

function renderSection(slug) {
  const items = bySection(slug);
  const extra = slug === 'alumni' ? alumniBlock() : (slug === 'sports' ? fcBlock() : '');
  if (!items.length) return `<section class="block"><h1>Nothing here yet</h1></section>` + extra;
  return `
  <section class="sec-head">
    <h1>${esc(sectionName(slug))}</h1>
    <p>${items.length} ${items.length === 1 ? 'story' : 'stories'}${(() => {
      // Four archived articles still have no byline. When a section happens to
      // hold only those, "by — writers" is worse than saying nothing, and
      // "by 1 writers" is worse again.
      const n = new Set(items.map(a => a.author).filter(Boolean)).size;
      return n ? ` by ${n} ${n === 1 ? 'writer' : 'writers'}` : '';
    })()}</p>
    ${bestLink(slug)}
  </section>
  <section class="block">
    <div class="cards">
      ${items.map(a => `
        <a class="card" href="#/a/${esc(a.slug)}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h2 class="card-hed">${esc(a.title)}</h2>
            <p>${esc(a.excerpt.slice(0, 140))}…</p>
            ${meta(a)}
          </div>
        </a>`).join('')}
    </div>
  </section>` + extra;
}

// Printed at the foot of a story that has been corrected. A newspaper says what
// it got wrong rather than editing the past quietly, and the paper is the place
// students learn that.
function correctionsHTML(a) {
  const list = a.corrections || [];
  if (!list.length) return '';
  return `<aside class="corrections" aria-label="Corrections">
    <b>${list.length === 1 ? 'Correction' : 'Corrections'}</b>
    ${list.map(c => `<p>${esc(c.text)}${
      c.at ? ` <i>${esc(Blocks.dateText({ date: c.at }))}</i>` : ''}</p>`).join('')}
  </aside>`;
}

function renderArticle(slug) {
  const a = bySlug(slug);
  if (!a) return `<section class="block"><h1>Not found</h1></section>`;
  const near = Paper.related(a, 3);
  const more = near.items;
  const src = leadImage(a);

  return `
  <article class="read ${isVerse(a) ? 'is-verse' : ''} ${isQA(a) ? 'is-qa' : ''}">
    <div class="read-head">
      <a class="crumb" href="#/s/${esc(a.section)}">← ${esc(sectionName(a.section))}</a>
      <h1>${esc(a.title)}</h1>
      ${isVerse(a) ? '' : `<p class="standfirst">${esc(a.excerpt)}</p>`}
      <div class="read-meta">
        <div class="avatar">${esc((byline(a).match(/\b[A-Za-z]/g) || ['B']).slice(0, 2).join('').toUpperCase())}</div>
        <div>
          <div class="who">${bylineLink(a)}</div>
          <div class="sub">${esc(sectionName(a.section))} · ${readingTime(a)} min read${
            when(a, true) ? ' · ' + when(a, true) : ''}</div>
          ${updatedText(a) ? `<div class="sub upd">${esc(updatedText(a))}</div>` : ''}
        </div>
        ${a.rating != null ? `<div class="big-score">${stars(a)}<b>${a.rating}/${a.ratingMax}</b></div>` : ''}
        ${savedButton(a)}
        ${shareButton(a)}
      </div>
    </div>
    ${seriesStrip(a)}
    ${src ? `<figure class="read-hero"><img src="${esc(src)}" alt=""></figure>` : ''}
    <div class="read-body">
      ${facts(a)}
      ${bodyHTML(a)}
    </div>
  ${correctionsHTML(a)}
  ${topicChips(a)}
  </article>

  ${more.length ? `
  <section class="block">
    <div class="block-head"><h2>${
        near.by === 'topic' ? 'More on ' + esc(near.label) : 'More ' + esc(near.label)}</h2>
      <a href="#/${near.by === 'topic' ? 't' : 's'}/${esc(near.slug)}">All →</a></div>
    <div class="rail">
      ${more.map(x => `
        <a class="mini" href="#/a/${esc(x.slug)}">
          ${thumb(x, 'mini-img')}
          <h2 class="mini-hed">${esc(x.title)}</h2>
          <div class="mini-by">${esc(byline(x))}${when(x) ? ' · ' + when(x) : ''}</div>
        </a>`).join('')}
    </div>
  </section>` : ''}`;
}

// ── router ───────────────────────────────────────────────────────────────────
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const app = document.getElementById('app');
  let active = '';
  if (h.startsWith('a/'))      { const s = h.slice(2); app.innerHTML = renderArticle(s);
                                 const a = bySlug(s); active = a ? a.section : ''; }
  else if (h.startsWith('s/')) { active = h.slice(2); app.innerHTML = renderSection(active); }
  else if (h === 'staff')        { active = 'staff'; app.innerHTML = renderStaff(); }
  else if (h === 'scholarships') { active = 'scholarships'; app.innerHTML = renderScholarships(); }
  else if (h === 'gallery')      { active = 'gallery'; app.innerHTML = renderGallery(); }
  else if (h.startsWith('q/'))   { active = 'search';
                                   app.innerHTML = renderSearch(decodeURIComponent(h.slice(2))); }
  else if (h.startsWith('w/'))   { app.innerHTML = renderWriter(h.slice(2)); }
  else if (h === 'best')         { active = 'best'; app.innerHTML = renderBest(); }
  else if (h === 'topics')       { active = 'topics'; app.innerHTML = renderTopics(); }
  else if (h.startsWith('t/'))   { active = 'topics'; app.innerHTML = renderTopic(h.slice(2)); }
  else if (h === 'saved')        { active = 'saved'; app.innerHTML = renderSaved(); }
  else if (h === 'corrections')  { app.innerHTML = renderCorrections(); }
  else if (h.startsWith('p/'))   { active = 'gallery'; app.innerHTML = renderPhotographer(h.slice(2)); }
  else if (h === 'about')        { app.innerHTML = renderAbout(); }
  else if (h === 'all')          { active = 'all'; app.innerHTML = renderAll(); }
  else                         { app.innerHTML = renderHome(); }
  document.querySelectorAll('#nav a').forEach(el =>
    el.classList.toggle('on', el.dataset.sec === active));
  scrollTo(0, 0);
  paintEvents();
}
addEventListener('hashchange', route);

// Merge in anything published from the newsroom, then draw. If the newsroom
// couldn't be reached, say so rather than quietly serving only the archive —
// a silent fallback here is indistinguishable from a healthy site.
function loadNotice(msg) {
  const el = document.createElement('div');
  el.className = 'load-note';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.insertBefore(el, document.body.firstChild);
}

Store.hydrate()
  .then(({ error }) => {
    if (error) loadNotice('Couldn’t load the newest stories — showing the archive.');
  })
  .catch(err => { console.error('[Blanson Post]', err); })
  .finally(route);
