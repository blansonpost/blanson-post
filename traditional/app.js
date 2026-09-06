// The Blanson Post — TRADITIONAL
// Broadsheet layout: multi-column front page, hairline rules, drop caps.

// ── chrome ───────────────────────────────────────────────────────────────────
document.getElementById('dateline').textContent =
  new Date().toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

document.getElementById('nav').innerHTML =
  `<a href="#/">Front Page</a>` +
  SECTIONS.map(s => `<a href="#/s/${s.slug}" data-sec="${s.slug}">${esc(s.name)}</a>`).join('');

document.getElementById('foot-sections').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${s.slug}">${esc(s.name)}</a>`).join('');

// ── shared pieces ────────────────────────────────────────────────────────────
const kicker = a => `<div class="kicker">${esc(sectionName(a.section))}</div>`;

const rated = a => a.rating == null ? ''
  : `<span class="rating" title="${a.rating} out of ${a.ratingMax}">${stars(a)}</span>`;

const bylineOf = a => `<div class="byline">By <b>${esc(byline(a))}</b>${
  a.rating != null ? ' &nbsp;·&nbsp; ' + rated(a) : ''}</div>`;

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

function bodyHTML(a) {
  if (isVerse(a)) {
    const verse = `<div class="verse">${a.body.map(l => esc(l)).join('<br>')}</div>`;
    return verse + (a.images || []).slice(1).map(src =>
      `<figure class="inline-fig"><img src="${esc(imageUrl(src))}" alt="" loading="lazy"></figure>`).join('');
  }
  return layoutBlocks(a).map(b => b.type === 'image'
    ? `<figure class="inline-fig"><img src="${esc(imageUrl(b.src))}" alt="" loading="lazy"></figure>`
    : textHTML(a, b.text)).join('');
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
          <a class="band-note" href="#/s/${s.slug}">All ${bySection(s.slug).length} &rarr;</a>
        </div>
        <div class="grid-3">
          ${items.map(a => `
            <article class="story">
              <a href="#/a/${a.slug}">
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
          <a class="brief" href="#/a/${a.slug}">
            <h3 class="brief-hed">${esc(a.title)}</h3>
            <p class="brief-dek">${esc(a.excerpt.slice(0, 120))}…</p>
            <div class="brief-by">${esc(byline(a))}</div>
          </a>`).join('')}
      </aside>

      <div>
        ${figure(lead, 'lead-fig')}
        ${kicker(lead)}
        <a href="#/a/${lead.slug}"><h1 class="lead-hed">${esc(lead.title)}</h1></a>
        <p class="lead-dek">${esc(lead.excerpt)}</p>
        ${bylineOf(lead)}
        <div class="lead-body">${lead.body.slice(0, 3).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <a class="more-link" href="#/a/${lead.slug}">Continue reading</a>
      </div>

      <aside>
        <div class="col-head">In This Issue</div>
        ${secondCol.map(a => `
          <a class="brief" href="#/a/${a.slug}">
            <div class="kicker">${esc(sectionName(a.section))}</div>
            <h3 class="brief-hed">${esc(a.title)}</h3>
            <div class="brief-by">${esc(byline(a))}</div>
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

function renderSection(slug) {
  const items = bySection(slug);
  if (!items.length) return `<div class="wrap"><div class="page-head"><h1>Nothing here yet</h1></div></div>`;
  return `
  <div class="wrap">
    <div class="page-head">
      <h1>${esc(sectionName(slug))}</h1>
      <p>${items.length} ${items.length === 1 ? 'article' : 'articles'}</p>
    </div>
    ${items.map((a, i) => `
      <a class="list-item" href="#/a/${a.slug}">
        <div class="list-num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.excerpt)}</p>
          ${bylineOf(a)}
        </div>
        ${figure(a, 'list-fig')}
      </a>`).join('')}
  </div>`;
}

function renderArticle(slug) {
  const a = bySlug(slug);
  if (!a) return `<div class="wrap"><div class="page-head"><h1>Article not found</h1></div></div>`;
  const more = bySection(a.section).filter(x => x.id !== a.id).slice(0, 3);

  return `
  <div class="wrap">
    <article class="article ${isVerse(a) ? 'is-verse' : ''} ${isQA(a) ? 'is-qa' : ''}">
      <a class="back" href="#/s/${a.section}">&larr; ${esc(sectionName(a.section))}</a>
      ${kicker(a)}
      <h1>${esc(a.title)}</h1>
      ${isVerse(a) ? '' : `<p class="standfirst">${esc(a.excerpt)}</p>`}
      <div class="art-meta">
        <span>By <b>${esc(byline(a))}</b></span>
        <span>${readingTime(a)} min read</span>
        ${a.rating != null ? `<span>${rated(a)} <b>${a.rating}/${a.ratingMax}</b></span>` : ''}
      </div>
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
            <article class="story"><a href="#/a/${x.slug}">
              <h3 class="story-hed">${esc(x.title)}</h3>
              <p class="story-dek">${esc(x.excerpt.slice(0, 130))}…</p>
              <div class="brief-by">${esc(byline(x))}</div>
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
  else                         { app.innerHTML = renderHome(); }

  document.querySelectorAll('#nav a').forEach(el =>
    el.classList.toggle('on', el.dataset.sec === active));
  window.scrollTo(0, 0);
}

addEventListener('hashchange', route);
route();
