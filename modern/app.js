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
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}">${esc(s.name)}</a>`).join('');

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

function eventsHTML(list) {
  return `
    <section class="sec-head"><h1>What&rsquo;s On</h1>
      <p>${list.length} coming up at Blanson</p></section>
    <section class="block">
      <div class="ev-strip">
        ${list.map(e => {
          const b = Paper.dayBadge(e);
          return `<div class="ev-card">
            <div class="ev-cal"><span>${esc(b.top)}</span><b>${esc(b.bottom)}</b></div>
            <h2 class="ev-hed">${esc(e.title)}</h2>
            <div class="ev-meta">${esc(Paper.whenText(e))}${
              e.place ? ' · ' + esc(e.place) : ''}</div>
            ${e.note ? `<p>${esc(e.note)}</p>` : ''}
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

// ── One writer ───────────────────────────────────────────────────────────────
function renderWriter(slug) {
  const w = Paper.writer(slug);
  if (!w) return `<section class="sec-head"><h1>No such writer</h1></section>`;
  const p = w.profile;
  return `
  <section class="sec-head">
    <h1>${esc(w.name)}</h1>
    <p>${w.stories.length} ${w.stories.length === 1 ? 'story' : 'stories'}${
      p ? ' · ' + esc(p.beats) : ''}</p>
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
      <p>${esc(g.year ? g.year + ' · ' : '')}${esc(g.credit)}${g.note ? ' · ' + esc(g.note) : ''}</p></section>
    <section class="block">
      <div class="gal">
        ${g.photos.map(f => `<a class="gal-item" href="${esc(imageUrl(f))}" target="_blank" rel="noopener">
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
    <p>${team.length} writers, photographers and editors &middot; 2025&ndash;2026</p>
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
  const more = bySection(a.section).filter(x => x.id !== a.id).slice(0, 3);
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
      </div>
    </div>
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
    <div class="block-head"><h2>More ${esc(sectionName(a.section))}</h2></div>
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
