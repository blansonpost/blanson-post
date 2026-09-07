// The Blanson Post — PERSONAL
// School-spirit layout: Blanson blue & gold, warm paper, collage-style cards.

document.getElementById('banner-date').textContent =
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

document.getElementById('nav').innerHTML =
  `<a href="#/">Home</a>` +
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}" data-sec="${esc(s.slug)}">${esc(s.name)}</a>`).join('') +
  `<a href="#/staff" data-sec="staff">Our Team</a>` +
  `<a href="#/gallery" data-sec="gallery">Art &amp; Photos</a>` +
  `<a href="#/scholarships" data-sec="scholarships">Scholarships</a>`;

document.getElementById('nav').insertAdjacentHTML('beforeend',
  `<form class="searchbox" role="search" onsubmit="return false">
     <input id="q" type="search" placeholder="Search the paper" aria-label="Search the paper"
            autocomplete="off"></form>`);
document.getElementById('foot-sections').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}">${esc(s.name)}</a>`).join('');

// Heading levels are the outline a screen-reader user navigates by, so a page
// must not jump from h1 straight to h3 — a listener stepping through headings
// hears the jump as a missing section. Card headlines therefore sit at h2 under
// the page's own h1, which is flat but never skips. Styling is by class, so the
// level is free to be whatever the outline needs.

// A small emoji per section — this design leans friendly on purpose.
const ICON = {
  campus: '🏫', life: '🐾', interviews: '🎙️', sports: '⚽', gaming: '🎮', books: '📚',
  film: '🎬', poetry: '✍️', alumni: '🎓', houston: '🌆'
};
const icon = s => ICON[s] || '📰';

const tag = a => `<span class="tag">${icon(a.section)} ${esc(sectionName(a.section))}</span>`;

const hearts = a => a.rating == null ? '' :
  `<span class="stars" title="${esc(a.rating)} out of ${esc(a.ratingMax)}">${stars(a)}</span>`;

const who = a => `<span class="who"><span class="dot"></span>${esc(byline(a))}${
  when(a) ? `<span class="when">${when(a)}</span>` : ''}</span>`;

// '' for the archived 41 — nobody wrote the dates down on the old site.
const when = (a, full) => dateTag(a, 'pubdate', full);

function pic(a, cls, tilt) {
  const src = leadImage(a);
  const t = tilt ? ` style="--tilt:${tilt}deg"` : '';
  return src
    ? `<div class="${cls}"${t}><img src="${esc(src)}" alt="" loading="lazy"></div>`
    : `<div class="${cls} noimg"${t}><span>${icon(a.section)}</span></div>`;
}

function textHTML(a, line) {
  if (isQA(a)) {
    const s = speakerOf(line);
    if (!s) return `<p class="intro">${esc(line)}</p>`;
    const q = /borrego|borrega/i.test(s.who);
    return `<div class="bubble ${q ? 'ask' : 'say'}">
              <div class="bubble-who">${esc(s.who)}</div>
              <div class="bubble-txt">${esc(s.text)}</div>
            </div>`;
  }
  return `<p>${esc(line)}</p>`;
}

// Photos run through the story (see layoutBlocks), each tilted a little so the
// page keeps the scrapbook feel.
let tiltSeed = 0;
// A photo that can no longer be found renders as nothing at all. The tilt
// counter advances only for a picture actually drawn, so a missing one does
// not change the angle of every photo after it.
const inlineFig = b => {
  const src = imageUrl(b.src);
  if (!src) return '';
  const tilt = [-1.2, 1, -.7, 1.4][tiltSeed++ % 4];
  return `<figure class="inline-fig" style="--tilt:${tilt}deg">
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
  tiltSeed = 0;
  if (isVerse(a)) {
    return `<div class="poem">${a.body.map(esc).join('<br>')}</div>` +
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
    case 'verse':   return `<div class="poem">${(b.lines || []).map(esc).join('<br>')}</div>`;
    case 'qa':      return `<div class="bubble ${b.role === 'q' ? 'ask' : 'say'}">
              <div class="bubble-who">${esc(b.who)}</div>
              <div class="bubble-txt">${esc(b.text)}</div>
            </div>`;
    default:        return textHTML(a, b.text);
  }
}

function facts(a) {
  const k = a.meta ? Object.keys(a.meta) : [];
  if (!k.length) return '';
  return `<div class="stickynote">
    ${k.map(x => `<div><b>${esc(x)}</b> ${esc(a.meta[x])}</div>`).join('')}
  </div>`;
}

// ── views ────────────────────────────────────────────────────────────────────
function renderHome() {
  const lead = featured();
  const rest = ARTICLES.filter(a => a.id !== lead.id);
  const writers = new Set(ARTICLES.map(a => a.author).filter(Boolean)).size;

  return `
  <div id="whats-on"></div>
  <section class="welcome">
    <div class="welcome-txt">
      <div class="hi">Hey Jaguars 👋</div>
      <h1>This is <em>our</em> paper.</h1>
      <p>${ARTICLES.length} stories written by ${writers} students at Blanson CTE —
         game recaps, movie takes, poetry, interviews with the teachers you see every day.</p>
      <a class="btn" href="#/s/campus">Start reading →</a>
    </div>
    <div class="welcome-collage">
      ${ARTICLES.filter(a => leadImage(a)).slice(0, 4)
        .map((a, i) => pic(a, 'collage-pic', [-4, 3, -2, 5][i])).join('')}
    </div>
  </section>

  <section class="topstory">
    <div class="ribbon">⭐ Top Story</div>
    <a class="topstory-in" href="#/a/${esc(lead.slug)}">
      ${pic(lead, 'topstory-pic')}
      <div class="topstory-txt">
        ${tag(lead)}
        <h2>${esc(lead.title)}</h2>
        <p>${esc(lead.excerpt)}</p>
        ${who(lead)}
      </div>
    </a>
  </section>

  ${SECTIONS.map(s => {
    const items = bySection(s.slug).filter(a => a.id !== lead.id).slice(0, 3);
    if (!items.length) return '';
    return `
    <section class="shelf">
      <div class="shelf-head">
        <h2>${icon(s.slug)} ${esc(s.name)}</h2>
        <a href="#/s/${esc(s.slug)}">see all ${bySection(s.slug).length}</a>
      </div>
      <div class="shelf-row">
        ${items.map((a, i) => `
          <a class="pcard" href="#/a/${esc(a.slug)}">
            ${pic(a, 'pcard-pic', [-1.5, 1, -1][i])}
            <div class="pcard-body">
              <h2 class="pcard-hed">${esc(a.title)}</h2>
              ${a.rating != null ? hearts(a) : ''}
              <p>${esc(a.excerpt.slice(0, 100))}…</p>
              ${who(a)}
            </div>
          </a>`).join('')}
      </div>
    </section>`;
  }).join('')}

  <section class="wall">
    <h2>✏️ Everyone who wrote for us</h2>
    <div class="names">
      ${[...new Set(ARTICLES.map(a => a.author).filter(Boolean))].sort()
        .map(n => `<span>${esc(n)}</span>`).join('')}
    </div>
  </section>`;
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
  <section class="sechead">
    <div class="sechead-icon">\u{1F50E}</div>
    <h1>${esc(q)}</h1>
    <p>${hits.length} ${hits.length === 1 ? 'story' : 'stories'} found</p>
  </section>
  <section class="shelf">
    ${hits.length ? `<div class="grid">${hits.map((h, i) => `
      <a class="pcard" href="#/a/${esc(h.article.slug)}">
        ${pic(h.article, 'pcard-pic', (i % 3) - 1)}
        <div class="pcard-body">
          <h2 class="pcard-hed">${Paper.highlight(esc(h.article.title), q)}</h2>
          <p>${Paper.highlight(esc(h.snippet), q)}</p>
          ${who(h.article)}
        </div>
      </a>`).join('')}</div>`
    : `<p class="no-hits">Nothing matched <b>${esc(q)}</b> \u{1F937} Try a writer&rsquo;s name,
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
    <section class="sechead"><div class="sechead-icon">\u{1F4C5}</div>
      <h1>What&rsquo;s On</h1>
      <p>Coming up at Blanson</p></section>
    <section class="shelf">
      <div class="ev-strip">
        ${list.map((e, i) => {
          const b = Paper.dayBadge(e);
          return `<div class="ev-card" style="--tilt:${[-1, .8, -.6, 1][i % 4]}deg">
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
  <section class="sechead">
    <div class="sechead-icon">\u2B50</div>
    <h1>Best Reviewed</h1>
    <p>${list.length} rated ${list.length === 1 ? 'review' : 'reviews'}, highest first</p>
  </section>
  <section class="shelf">
    <div class="grid">
      ${list.map((x, i) => { const a = x.article; return `
        <a class="pcard" href="#/a/${esc(a.slug)}">
          ${pic(a, 'pcard-pic', (i % 3) - 1)}
          <div class="pcard-body">
            <h2 class="pcard-hed">${esc(a.title)}</h2>
            ${hearts(a)}
            <p>${esc(a.excerpt.slice(0, 100))}…</p>
            ${who(a)}
          </div>
        </a>`; }).join('')}
    </div>
  </section>`;
}

// ── One writer ───────────────────────────────────────────────────────────────
function renderWriter(slug) {
  const w = Paper.writer(slug);
  if (!w) return `<section class="sechead"><h1>No such writer</h1></section>`;
  const p = w.profile;
  return `
  <section class="sechead">
    <div class="sechead-icon">\u{1F58A}\uFE0F</div>
    <h1>${esc(w.name)}</h1>
    <p>${w.stories.length} ${w.stories.length === 1 ? 'story' : 'stories'}${
      p ? ' · ' + esc(p.beats) : ''}</p>
  </section>
  <section class="shelf">
    ${p ? `<div class="mate writer-card">
      <div class="mate-top">
        ${p.photo ? `<img class="face lg photo" src="${esc(imageUrl(p.photo))}" alt="${esc(p.name)}">`
                  : `<div class="face lg">${esc(Paper.initials(p.name))}</div>`}
        <div><b>${esc(p.name)}</b><i>${esc(p.beats)}</i></div>
      </div>
      <p>${esc(p.bio)}</p>
    </div>` : `<p class="writer-none">We haven&rsquo;t got a profile up for
      ${esc(w.name)} yet &mdash; here is everything they have written.</p>`}
    <div class="grid">
      ${w.stories.map((a, i) => `
        <a class="pcard" href="#/a/${esc(a.slug)}">
          ${pic(a, 'pcard-pic', (i % 3) - 1)}
          <div class="pcard-body">
            <h2 class="pcard-hed">${esc(a.title)}</h2>
            <p>${esc(a.excerpt.slice(0, 110))}…</p>
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
  <section class="sechead">
    <div class="sechead-icon">\u{1F3A8}</div>
    <h1>Art &amp; Photos</h1>
    <p>${Paper.photoCount()} pictures by Blanson students and staff</p>
  </section>
  <section class="shelf">
    <div class="art-solo">
      ${art.map((a, i) => `
        <figure class="solo" style="--tilt:${[-1, .8, -.6][i % 3]}deg">
          <img src="${esc(imageUrl(a.file))}" alt="${esc(a.title + ' by ' + a.by)}" loading="lazy">
          <figcaption><b>${esc(a.title)}</b><span>${esc(a.credit)}</span></figcaption>
        </figure>`).join('')}
    </div>
  </section>
  ${gals.map(g => `
    <section class="sechead"><div class="sechead-icon">\u{1F4F7}</div>
      <h1>${esc(g.title)}</h1>
      <p>${esc(g.year ? g.year + ' · ' : '')}${esc(g.credit)}${g.note ? ' · ' + esc(g.note) : ''}</p></section>
    <section class="shelf">
      <div class="gal">
        ${g.photos.map((f, i) => `<a class="gal-item" style="--tilt:${[-1.4,1.1,-.7,1.3][i%4]}deg"
           href="${esc(imageUrl(f))}" target="_blank" rel="noopener">
           <img src="${esc(imageUrl(f))}" alt="${esc(g.title)}" loading="lazy"></a>`).join('')}
      </div>
    </section>`).join('')}`;
}

// ── Blanson F.C., shown on the Sports page ───────────────────────────────────
function fcBlock() {
  const fc = Paper.fc();
  return `
  <section class="shelf">
    <a class="fc-card" href="${esc(fc.url)}" target="_blank" rel="noopener">
      <div class="fc-badge">\u26BD</div>
      <div>
        <b>${esc(fc.name)} has its own site \u2197</b>
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
  <section class="sechead">
    <div class="sechead-icon">\u{1F44B}</div>
    <h1>Our Team</h1>
    <p>Get to know the people who put the paper together</p>
  </section>
  <section class="shelf">
    <div class="team">
      ${team.map((m, i) => {
        const mine = Paper.storiesBy(m.name);
        return `
        <div class="mate" style="--tilt:${[-1.1, .9, -.6, 1.2][i % 4]}deg">
          <div class="mate-top">
            ${m.photo ? `<img class="face lg photo" src="${esc(imageUrl(m.photo))}"
                alt="${esc(m.name)}" loading="lazy">`
              : `<div class="face lg">${esc(Paper.initials(m.name))}</div>`}
            <div>
              <b><a href="#/w/${esc(Paper.writerSlug(m.name))}">${esc(m.name)}</a></b>
              <i>${esc(m.beats)}</i>
            </div>
          </div>
          <p>${esc(m.bio)}</p>
          ${mine.length ? `<div class="mate-work">
            ${mine.map(a => `<a href="#/a/${esc(a.slug)}">${esc(a.title)}</a>`).join('')}
          </div>` : `<div class="mate-none">Behind the camera \u{1F4F8}</div>`}
        </div>`; }).join('')}
    </div>
  </section>
  ${also.length ? `
  <section class="sechead"><div class="sechead-icon">\u{270D}\uFE0F</div>
    <h1>Also wrote for us</h1>
    <p>We haven&rsquo;t got a profile up for them yet</p></section>
  <section class="shelf">
    <div class="alsos">
      ${also.map(c => `<a class="also" href="#/w/${esc(Paper.writerSlug(c.name))}">
        <span class="face sm">${esc(Paper.initials(c.name))}</span>
        <b>${esc(c.name)}</b><i>${c.count} ${c.count === 1 ? 'story' : 'stories'}</i></a>`).join('')}
    </div>
  </section>` : ''}`;
}

// ── Scholarships ─────────────────────────────────────────────────────────────
function renderScholarships() {
  const list = Paper.scholarships();
  const open = Paper.openCount();
  const live = list.filter(s => !s.archived);
  const old  = list.filter(s => s.archived);

  const row = (s, i) => `
    <div class="sch is-${esc(s.due.state)}" style="--tilt:${[-.7, .6, -.4, .8][i % 4]}deg">
      <div class="sch-amt">${esc(s.amount || '—')}</div>
      <div class="sch-mid">
        <b>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} \u2197</a>`
                   : esc(s.name)}</b>
        ${s.org ? `<i>${esc(s.org)}</i>` : ''}
        ${s.who ? `<span class="sch-who">${esc(s.who)}</span>` : ''}
        ${s.note ? `<span class="sch-note">${esc(s.note)}</span>` : ''}
        <span>${s.awards ? esc(String(s.awards)) + ' awarded · ' : ''}${
          esc(s.due.when || s.window || '')}</span>
      </div>
      <span class="pill p-${esc(s.due.state)}">${esc(s.due.label)}</span>
    </div>`;

  return `
  <section class="sechead">
    <div class="sechead-icon">\u{1F393}</div>
    <h1>Scholarships</h1>
    <p>${open} open or opening soon · checked ${esc(Paper.dateChecked())}</p>
  </section>
  <section class="shelf">
    <div class="sch-warn">
      <b>Before you apply</b>
      <ul>${Paper.warnings().map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    </div>
    <div class="schs">${live.map(row).join('')}</div>
  </section>
  <section class="sechead"><div class="sechead-icon">\u{1F50D}</div>
    <h1>Finding more</h1>
    <p>No page can hold every scholarship — these do the searching for you</p></section>
  <section class="shelf">
    <div class="finders">
      ${Paper.finders().map(f => `
        <a class="finder" href="${esc(f.url)}" target="_blank" rel="noopener">
          <b>${esc(f.name)} \u2197</b>
          ${f.by ? `<i>${esc(f.by)}</i>` : ''}
          <span>${esc(f.note)}</span>
        </a>`).join('')}
    </div>
  </section>
  ${old.length ? `
  <section class="sechead"><div class="sechead-icon">\u{1F4E6}</div>
    <h1>From the old site</h1>
    <p>Carried over with no links, never checked, all long closed</p></section>
  <section class="shelf"><div class="schs">${old.map(row).join('')}</div></section>` : ''}`;
}

// ── Alumni directory, shown on the Alumni section page ───────────────────────
function alumniBlock() {
  const list = Paper.alumni();
  if (!list.length) return '';
  return `
  <section class="sechead"><div class="sechead-icon">\u{1F393}</div>
    <h1>Where they are now</h1>
    <p>See what the graduates of Blanson are up to</p></section>
  <section class="shelf">
    <div class="alum-grid">
      ${list.map((v, i) => `
        <div class="alum" style="--tilt:${[-1, .8, -.6, 1.1][i % 4]}deg">
          <div class="alum-what">${esc(v.what)}</div>
          ${v.name ? `<b>${esc(v.name)}</b>` : ''}
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
  if (!items.length) return `<section class="shelf"><h1>Nothing here yet!</h1></section>` + extra;
  return `
  <section class="sechead">
    <div class="sechead-icon">${icon(slug)}</div>
    <h1>${esc(sectionName(slug))}</h1>
    <p>${items.length} ${items.length === 1 ? 'story' : 'stories'}</p>
    ${bestLink(slug)}
  </section>
  <section class="shelf">
    <div class="grid">
      ${items.map((a, i) => `
        <a class="pcard" href="#/a/${esc(a.slug)}">
          ${pic(a, 'pcard-pic', (i % 3) - 1)}
          <div class="pcard-body">
            <h2 class="pcard-hed">${esc(a.title)}</h2>
            ${a.rating != null ? hearts(a) : ''}
            <p>${esc(a.excerpt.slice(0, 110))}…</p>
            ${who(a)}
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
  if (!a) return `<section class="shelf"><h1>Can't find that one!</h1></section>`;
  const more = bySection(a.section).filter(x => x.id !== a.id).slice(0, 3);
  const src = leadImage(a);

  return `
  <article class="story ${isVerse(a) ? 'is-poem' : ''} ${isQA(a) ? 'is-chat' : ''}">
    <a class="crumb" href="#/s/${esc(a.section)}">← back to ${esc(sectionName(a.section))}</a>
    ${tag(a)}
    <h1>${esc(a.title)}</h1>
    ${isVerse(a) ? '' : `<p class="kicker">${esc(a.excerpt)}</p>`}

    <div class="signoff">
      <div class="face">${esc((byline(a).match(/\b[A-Za-z]/g) || ['B']).slice(0, 2).join('').toUpperCase())}</div>
      <div>
        <b>${bylineLink(a)}</b>
        <i>${when(a, true) ? when(a, true) + ' · ' : ''}${readingTime(a)} min read${
          updatedText(a) ? ' · ' + esc(updatedText(a)) : ''}</i>
      </div>
      ${a.rating != null ? `<div class="ratebox">${stars(a)}<b>${a.rating}/${a.ratingMax}</b></div>` : ''}
    </div>

    ${src ? `<div class="story-pic"><img src="${esc(src)}" alt=""></div>` : ''}
    ${facts(a)}
    <div class="story-body">${bodyHTML(a)}</div>

    ${correctionsHTML(a)}
    <div class="thanks">Thanks for reading! 🐆</div>
  </article>

  ${more.length ? `
  <section class="shelf">
    <div class="shelf-head"><h2>More ${esc(sectionName(a.section))}</h2></div>
    <div class="shelf-row">
      ${more.map((x, i) => `
        <a class="pcard" href="#/a/${esc(x.slug)}">
          ${pic(x, 'pcard-pic', (i % 3) - 1)}
          <div class="pcard-body">
            <h2 class="pcard-hed">${esc(x.title)}</h2>
            ${who(x)}
          </div>
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
