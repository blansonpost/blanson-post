// The Blanson Post — TRADITIONAL
// Broadsheet layout: multi-column front page, hairline rules, drop caps.

// ── chrome ───────────────────────────────────────────────────────────────────
document.getElementById('dateline').textContent =
  new Date().toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

document.getElementById('nav').innerHTML =
  `<a href="#/">Front Page</a>` +
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}" data-sec="${esc(s.slug)}">${esc(s.name)}</a>`).join('') +
  `<a href="#/staff" data-sec="staff">The Team</a>` +
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

// ── shared pieces ────────────────────────────────────────────────────────────
const kicker = a => `<div class="kicker">${esc(sectionName(a.section))}</div>`;

const rated = a => a.rating == null ? ''
  : `<span class="rating" title="${esc(a.rating)} out of ${esc(a.ratingMax)}">${stars(a)}</span>`;

// An archived article has no date, so `when()` is '' and the byline closes up
// around it instead of leaving a stray separator hanging.
const when = (a, full) => dateTag(a, 'pubdate', full);

const bylineOf = a => {
  const bits = [`By <b>${esc(byline(a))}</b>`];
  const d = when(a);
  if (d) bits.push(d);
  if (a.rating != null) bits.push(rated(a));
  return `<div class="byline">${bits.join(' &nbsp;·&nbsp; ')}</div>`;
};

function figure(a, cls) {
  const src = leadImage(a);
  return src ? `<div class="${cls}"><img src="${esc(src)}" alt="" loading="lazy"></div>` : '';
}

// Typeset the body according to its shape: verse keeps line breaks, interviews
// become a Q&A transcript, everything else is prose with a drop cap. Photos are
// interleaved through the text by layoutBlocks().
function textHTML(a, line) {
  if (isQA(a)) {
    const s = speakerOf(line);
    if (!s) return `<p class="qa-intro">${esc(line)}</p>`;
    const interviewer = /borrego|borrega/i.test(s.who);
    return `<div class="qa ${interviewer ? 'q' : 'a'}">
              <div class="qa-who">${esc(s.who)}</div>
              <div class="qa-text">${esc(s.text)}</div>
            </div>`;
  }
  return `<p>${esc(line)}</p>`;
}

// A photo that can no longer be found renders as nothing at all — no caption
// stranded under a broken image, no request for a file that isn't there.
const inlineFig = b => {
  const src = imageUrl(b.src);
  if (!src) return '';
  return `<figure class="inline-fig">
    <img src="${esc(src)}" alt="${esc(b.decorative ? '' : (b.alt || ''))}" loading="lazy">
    ${b.caption || b.credit ? `<figcaption>${esc(b.caption || '')}${
      b.credit ? ` <span>${esc(b.credit)}</span>` : ''}</figcaption>` : ''}
  </figure>`;
};

function bodyHTML(a) {
  if (isVerse(a)) {
    const verse = `<div class="verse">${a.body.map(l => esc(l)).join('<br>')}</div>`;
    return verse + (a.images || []).slice(1)
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
    case 'heading': return `<h2 class="subhead">${esc(b.text)}</h2>`;
    case 'quote':   return `<blockquote class="pullquote">${esc(b.text)}${b.attrib ? `<cite>${esc(b.attrib)}</cite>` : ''}</blockquote>`;
    case 'verse':   return `<div class="verse">${(b.lines || []).map(esc).join('<br>')}</div>`;
    case 'qa':      return `<div class="qa ${b.role === 'q' ? 'q' : 'a'}">
              <div class="qa-who">${esc(b.who)}</div>
              <div class="qa-text">${esc(b.text)}</div>
            </div>`;
    default:        return textHTML(a, b.text);
  }
}

function metaRow(a) {
  if (!a.meta) return '';
  const keys = Object.keys(a.meta);
  if (!keys.length) return '';
  return `<div class="art-facts">` + keys.map(k =>
    `<div><span>${esc(k)}</span>${esc(a.meta[k])}</div>`).join('') + `</div>`;
}

// ── views ────────────────────────────────────────────────────────────────────
function renderHome() {
  const lead = featured();
  const rest = ARTICLES.filter(a => a.id !== lead.id);
  const briefs = rest.slice(0, 4);
  const secondCol = rest.slice(4, 7);

  const bands = SECTIONS.map(s => {
    const items = bySection(s.slug).filter(a => a.id !== lead.id).slice(0, 3);
    if (!items.length) return '';
    return `
      <section class="band">
        <div class="band-head">
          <h2 class="band-title">${esc(s.name)}</h2>
          <a class="band-note" href="#/s/${esc(s.slug)}">All ${bySection(s.slug).length} &rarr;</a>
        </div>
        <div class="grid-3">
          ${items.map(a => `
            <article class="story">
              <a href="#/a/${esc(a.slug)}">
                ${figure(a, 'story-fig')}
                ${kicker(a)}
                <h3 class="story-hed">${esc(a.title)}</h3>
                <p class="story-dek">${esc(a.excerpt)}</p>
                ${bylineOf(a)}
              </a>
            </article>`).join('')}
        </div>
      </section>`;
  }).join('');

  return `
  <div class="ticker"><div class="ticker-label">Latest</div>
    <div class="ticker-track">${
      ARTICLES.slice(0, 12).map(a => `<span>${esc(a.title)} &nbsp;✦&nbsp;</span>`).join('').repeat(2)
    }</div>
  </div>
  <div class="wrap">
    <div class="front">
      <aside>
        <h2 class="col-head">Also Today</h2>
        ${briefs.map(a => `
          <a class="brief" href="#/a/${esc(a.slug)}">
            <h3 class="brief-hed">${esc(a.title)}</h3>
            <p class="brief-dek">${esc(a.excerpt.slice(0, 120))}…</p>
            <div class="brief-by">${esc(byline(a))}${when(a) ? ' · ' + when(a) : ''}</div>
          </a>`).join('')}
      </aside>

      <div>
        ${figure(lead, 'lead-fig')}
        ${kicker(lead)}
        <a href="#/a/${esc(lead.slug)}"><h1 class="lead-hed">${esc(lead.title)}</h1></a>
        <p class="lead-dek">${esc(lead.excerpt)}</p>
        ${bylineOf(lead)}
        <div class="lead-body">${lead.body.slice(0, 3).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <a class="more-link" href="#/a/${esc(lead.slug)}">Continue reading</a>
      </div>

      <aside>
        <h2 class="col-head">In This Issue</h2>
        ${secondCol.map(a => `
          <a class="brief" href="#/a/${esc(a.slug)}">
            <div class="kicker">${esc(sectionName(a.section))}</div>
            <h3 class="brief-hed">${esc(a.title)}</h3>
            <div class="brief-by">${esc(byline(a))}${when(a) ? ' · ' + when(a) : ''}</div>
          </a>`).join('')}
        <div id="whats-on"></div>
        <h2 class="col-head" style="margin-top:22px">By the Numbers</h2>
        <div class="stat"><b>${ARTICLES.length}</b> articles published</div>
        <div class="stat"><b>${new Set(ARTICLES.map(a => a.author).filter(Boolean)).size}</b> student writers</div>
        <div class="stat"><b>${SECTIONS.length}</b> sections</div>
      </aside>
    </div>
    ${bands}
  </div>`;
}

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
  <div class="wrap">
    <div class="page-head">
      <h1>${esc(q)}</h1>
      <p>${hits.length} ${hits.length === 1 ? 'result' : 'results'}</p>
    </div>
    ${hits.length ? hits.map((h, i) => `
      <a class="list-item" href="#/a/${esc(h.article.slug)}">
        <div class="list-num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="kicker">${esc(sectionName(h.article.section))}</div>
          <h2 class="list-hed">${Paper.highlight(esc(h.article.title), q)}</h2>
          <p>${Paper.highlight(esc(h.snippet), q)}</p>
          ${bylineOf(h.article)}
        </div>
        ${figure(h.article, 'list-fig')}
      </a>`).join('')
    : `<p class="no-hits">Nothing matched <b>${esc(q)}</b>. Try a writer&rsquo;s name,
        part of a headline, or a word from the story.</p>`}
  </div>`;
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

// A standing column of what is coming up, set like the rest of the front page.
function eventsHTML(list) {
  return `
    <h2 class="col-head">What&rsquo;s On</h2>
    ${list.map(e => {
      const b = Paper.dayBadge(e);
      return `<div class="ev-item">
        <div class="ev-cal"><span>${esc(b.top)}</span><b>${esc(b.bottom)}</b></div>
        <div>
          <h3>${esc(e.title)}</h3>
          <div class="ev-meta">${esc(Paper.whenText(e))}${
            e.place ? ' · ' + esc(e.place) : ''}</div>
          ${e.note ? `<p>${esc(e.note)}</p>` : ''}
        </div>
      </div>`; }).join('')}`;
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

// ── One writer ───────────────────────────────────────────────────────────────
function renderWriter(slug) {
  const w = Paper.writer(slug);
  if (!w) return `<div class="wrap"><div class="page-head"><h1>No such writer</h1></div></div>`;
  const p = w.profile;
  return `
  <div class="wrap">
    <div class="page-head">
      <h1>${esc(w.name)}</h1>
      <p>${w.stories.length} ${w.stories.length === 1 ? 'story' : 'stories'}${
        p ? ' · ' + esc(p.beats) : ''}</p>
    </div>
    ${p ? `<div class="writer-card">
      ${p.photo ? `<img src="${esc(imageUrl(p.photo))}" alt="${esc(p.name)}">` : ''}
      <p>${esc(p.bio)}</p>
    </div>` : `<p class="writer-none">We haven&rsquo;t got a profile up for
      ${esc(w.name)} yet &mdash; here is everything they have written.</p>`}
    ${w.stories.map((a, i) => `
      <a class="list-item" href="#/a/${esc(a.slug)}">
        <div class="list-num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="kicker">${esc(sectionName(a.section))}</div>
          <h2 class="list-hed">${esc(a.title)}</h2>
          <p>${esc(a.excerpt)}</p>
        </div>
        ${figure(a, 'list-fig')}
      </a>`).join('')}
  </div>`;
}

// ── Art & photography ────────────────────────────────────────────────────────
function renderGallery() {
  const gals = Paper.galleries();
  const art = Paper.artwork();
  return `
  <div class="wrap">
    <div class="page-head">
      <h1>Art &amp; Photography</h1>
      <p>${Paper.photoCount()} pictures by Blanson students and staff</p>
    </div>
    <div class="art-solo">
      ${art.map(a => `
        <figure class="solo">
          <img src="${esc(imageUrl(a.file))}" alt="${esc(a.title + ' by ' + a.by)}" loading="lazy">
          <figcaption><b>${esc(a.title)}</b><span>${esc(a.credit)}</span></figcaption>
        </figure>`).join('')}
    </div>
    ${gals.map(g => `
      <div class="page-head sub-head">
        <h2>${esc(g.title)}</h2>
        <p>${esc(g.year ? g.year + ' · ' : '')}${esc(g.credit)}${
          g.note ? ` <i>${esc(g.note)}</i>` : ''}</p>
      </div>
      <div class="gal">
        ${g.photos.map(f => `<a class="gal-item" href="${esc(imageUrl(f))}" target="_blank" rel="noopener">
           <img src="${esc(imageUrl(f))}" alt="${esc(g.title)}" loading="lazy"></a>`).join('')}
      </div>`).join('')}
  </div>`;
}

// ── Blanson F.C. ─────────────────────────────────────────────────────────────
// Shown on the Sports page. An outside link, marked as one.
function fcBlock() {
  const fc = Paper.fc();
  return `
    <a class="fc-card" href="${esc(fc.url)}" target="_blank" rel="noopener">
      <div class="fc-badge">⚽</div>
      <div>
        <b>${esc(fc.name)} has its own site ↗</b>
        <span>${esc(fc.blurb)}</span>
      </div>
    </a>`;
}

// ── The team ─────────────────────────────────────────────────────────────────
// Set as a masthead: who runs the paper, what they cover, and what they wrote.
function renderStaff() {
  const team = Paper.staff();
  const also = Paper.contributors();
  return `
  <div class="wrap">
    <div class="page-head">
      <h1>The News Team</h1>
      <p>2025 &ndash; 2026</p>
    </div>
    <p class="staff-intro">Get to know the people responsible for publishing all of
       the News Team&rsquo;s content from behind the scenes.</p>
    <div class="roster">
      ${team.map(m => {
        const mine = Paper.storiesBy(m.name);
        return `
        <div class="ros-person">
          ${m.photo ? `<img class="ros-face" src="${esc(imageUrl(m.photo))}"
             alt="${esc(m.name)}" loading="lazy">` : ''}
          <h2 class="ros-name"><a href="#/w/${esc(Paper.writerSlug(m.name))}">${esc(m.name)}</a></h2>
          <div class="ros-beat">${esc(m.beats)}</div>
          <p class="ros-bio">${esc(m.bio)}</p>
          ${mine.length ? `<div class="ros-work">
            ${mine.map(a => `<a href="#/a/${esc(a.slug)}">${esc(a.title)}</a>`).join('')}
          </div>` : ''}
        </div>`; }).join('')}
    </div>
    ${also.length ? `
      <div class="page-head sub-head"><h2>Also in this year&rsquo;s paper</h2>
        <p>Bylines we have not written a profile for yet</p></div>
      <div class="also-list">
        ${also.map(c => `<a class="also" href="#/w/${esc(Paper.writerSlug(c.name))}">
           <b>${esc(c.name)}</b><i>${c.count} ${c.count === 1 ? 'story' : 'stories'}</i></a>`).join('')}
      </div>` : ''}
  </div>`;
}

// First section a writer appears in — enough to point at their work when we have
// no profile page for them.
function byAuthor(name) { return ARTICLES.find(a => a.author === name) || null; }

// ── Scholarships ─────────────────────────────────────────────────────────────
function renderScholarships() {
  const list = Paper.scholarships();
  const open = Paper.openCount();
  const live = list.filter(s => !s.archived);
  const old  = list.filter(s => s.archived);

  const row = s => `
    <tr class="is-${esc(s.due.state)}">
      <td class="sch-name">
        ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`
                : esc(s.name)}
        ${s.org ? `<span>${esc(s.org)}</span>` : ''}
        ${s.who ? `<span class="sch-who">${esc(s.who)}</span>` : ''}
        ${s.note ? `<span class="sch-note">${esc(s.note)}</span>` : ''}
      </td>
      <td class="sch-amt">${esc(s.amount || '—')}</td>
      <td>${s.awards ? esc(String(s.awards)) : '—'}</td>
      <td class="sch-when">${esc(s.due.when || s.window || '—')}</td>
      <td class="sch-state"><span class="pill p-${esc(s.due.state)}">${esc(s.due.label)}</span></td>
    </tr>`;

  return `
  <div class="wrap">
    <div class="page-head">
      <h1>Scholarships</h1>
      <p>${open} open or opening soon · checked ${esc(Paper.dateChecked())}</p>
    </div>

    <div class="sch-warn">
      <b>Before you apply</b>
      <ul>${Paper.warnings().map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    </div>

    <table class="sch">
      <thead><tr><th>Scholarship</th><th>Award</th><th>Given</th><th>Deadline</th><th></th></tr></thead>
      <tbody>${live.map(row).join('')}</tbody>
    </table>

    <div class="page-head sub-head"><h2>Finding more</h2>
      <p>No page can hold every scholarship. These do the searching for you</p></div>
    <div class="finders">
      ${Paper.finders().map(f => `
        <a class="finder" href="${esc(f.url)}" target="_blank" rel="noopener">
          <b>${esc(f.name)} ↗</b>
          ${f.by ? `<i>${esc(f.by)}</i>` : ''}
          <span>${esc(f.note)}</span>
        </a>`).join('')}
    </div>

    ${old.length ? `
      <div class="page-head sub-head"><h2>From the old site</h2>
        <p>Carried over with no links, never checked, all long closed</p></div>
      <table class="sch is-old">
        <tbody>${old.map(row).join('')}</tbody>
      </table>` : ''}
  </div>`;
}

// ── Alumni directory ─────────────────────────────────────────────────────────
// Appended to the Alumni section page: the old site listed what graduates went
// on to do alongside the one article about it.
function alumniBlock() {
  const list = Paper.alumni();
  if (!list.length) return '';
  return `
    <div class="page-head sub-head"><h2>Where they are now</h2>
      <p>See what the graduates of Blanson are up to</p></div>
    <div class="alum-grid">
      ${list.map(v => `
        <div class="alum">
          <div class="alum-what">${esc(v.what)}</div>
          ${v.name ? `<div class="alum-who">${esc(v.name)}</div>` : ''}
          <p>${esc(v.note)}</p>
          ${v.handle ? `<div class="alum-at">${esc(v.handle)}</div>` : ''}
        </div>`).join('')}
    </div>`;
}

function renderSection(slug) {
  const items = bySection(slug);
  const extra = slug === 'alumni' ? alumniBlock() : (slug === 'sports' ? fcBlock() : '');
  if (!items.length) return `<div class="wrap"><div class="page-head"><h1>Nothing here yet</h1></div>${extra}</div>`;
  return `
  <div class="wrap">
    <div class="page-head">
      <h1>${esc(sectionName(slug))}</h1>
      <p>${items.length} ${items.length === 1 ? 'article' : 'articles'}</p>
    </div>
    ${items.map((a, i) => `
      <a class="list-item" href="#/a/${esc(a.slug)}">
        <div class="list-num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <h2 class="list-hed">${esc(a.title)}</h2>
          <p>${esc(a.excerpt)}</p>
          ${bylineOf(a)}
        </div>
        ${figure(a, 'list-fig')}
      </a>`).join('')}
    ${extra}
  </div>`;
}

function renderArticle(slug) {
  const a = bySlug(slug);
  if (!a) return `<div class="wrap"><div class="page-head"><h1>Article not found</h1></div></div>`;
  const more = bySection(a.section).filter(x => x.id !== a.id).slice(0, 3);

  return `
  <div class="wrap">
    <article class="article ${isVerse(a) ? 'is-verse' : ''} ${isQA(a) ? 'is-qa' : ''}">
      <a class="back" href="#/s/${esc(a.section)}">&larr; ${esc(sectionName(a.section))}</a>
      ${kicker(a)}
      <h1>${esc(a.title)}</h1>
      ${isVerse(a) ? '' : `<p class="standfirst">${esc(a.excerpt)}</p>`}
      <div class="art-meta">
        <span>By <b>${bylineLink(a)}</b></span>
        ${when(a, true) ? `<span>Published ${when(a, true)}</span>` : ''}
        <span>${readingTime(a)} min read</span>
        ${a.rating != null ? `<span>${rated(a)} <b>${a.rating}/${a.ratingMax}</b></span>` : ''}
      </div>
      ${updatedText(a) ? `<div class="art-updated">${esc(updatedText(a))}</div>` : ''}
      ${figure(a, 'art-fig')}
      ${metaRow(a)}
      <div class="art-body">${bodyHTML(a)}</div>
      <div class="endmark">❖</div>
    </article>

    ${more.length ? `
      <section class="band">
        <div class="band-head"><h2 class="band-title">More from ${esc(sectionName(a.section))}</h2></div>
        <div class="grid-3">
          ${more.map(x => `
            <article class="story"><a href="#/a/${esc(x.slug)}">
              <h3 class="story-hed">${esc(x.title)}</h3>
              <p class="story-dek">${esc(x.excerpt.slice(0, 130))}…</p>
              <div class="brief-by">${esc(byline(x))}${when(x) ? ' · ' + when(x) : ''}</div>
            </a></article>`).join('')}
        </div>
      </section>` : ''}
  </div>`;
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
  else                         { app.innerHTML = renderHome(); }

  document.querySelectorAll('#nav a').forEach(el =>
    el.classList.toggle('on', el.dataset.sec === active));
  window.scrollTo(0, 0);
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
