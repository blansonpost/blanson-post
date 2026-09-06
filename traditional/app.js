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
  `<a href="#/scholarships" data-sec="scholarships">Scholarships</a>`;

document.getElementById('foot-sections').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}">${esc(s.name)}</a>`).join('');

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
        <div class="col-head">Also Today</div>
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
        <div class="col-head">In This Issue</div>
        ${secondCol.map(a => `
          <a class="brief" href="#/a/${esc(a.slug)}">
            <div class="kicker">${esc(sectionName(a.section))}</div>
            <h3 class="brief-hed">${esc(a.title)}</h3>
            <div class="brief-by">${esc(byline(a))}${when(a) ? ' · ' + when(a) : ''}</div>
          </a>`).join('')}
        <div class="col-head" style="margin-top:22px">By the Numbers</div>
        <div class="stat"><b>${ARTICLES.length}</b> articles published</div>
        <div class="stat"><b>${new Set(ARTICLES.map(a => a.author).filter(Boolean)).size}</b> student writers</div>
        <div class="stat"><b>${SECTIONS.length}</b> sections</div>
      </aside>
    </div>
    ${bands}
  </div>`;
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
          <h3 class="ros-name">${esc(m.name)}</h3>
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
        ${also.map(c => `<a class="also" href="#/s/${esc((byAuthor(c.name)||{}).section||'campus')}">
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
  return `
  <div class="wrap">
    <div class="page-head">
      <h1>Scholarships</h1>
      <p>${open ? open + ' still open' : 'None open right now'}</p>
    </div>
    ${open ? '' : `<p class="sch-stale">Every deadline below has passed. These are
      the ones the paper listed last year, kept here so the list is not lost &mdash;
      a club member can put this year&rsquo;s dates in and they will show as open
      again on their own.</p>`}
    <table class="sch">
      <thead><tr><th>Scholarship</th><th>Award</th><th>Given</th><th>Deadline</th><th></th></tr></thead>
      <tbody>
        ${list.map(s => `
        <tr class="is-${esc(s.due.state)}">
          <td class="sch-name">${esc(s.name)}${s.provider ? ` <span>${esc(s.provider)}</span>` : ''}</td>
          <td class="sch-amt">${esc(s.amount || '\u2014')}</td>
          <td>${esc(String(s.awards))}</td>
          <td>${esc(s.due.when)}</td>
          <td class="sch-state"><span class="pill p-${esc(s.due.state)}">${esc(s.due.label)}</span>
            ${s.url ? ` <a class="sch-apply" href="${esc(s.url)}" rel="noopener">Apply</a>` : ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>
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
  const extra = slug === 'alumni' ? alumniBlock() : '';
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
          <h3>${esc(a.title)}</h3>
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
        <span>By <b>${esc(byline(a))}</b></span>
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
  else                         { app.innerHTML = renderHome(); }

  document.querySelectorAll('#nav a').forEach(el =>
    el.classList.toggle('on', el.dataset.sec === active));
  window.scrollTo(0, 0);
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
