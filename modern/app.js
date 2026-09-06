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
  SECTIONS.map(s => `<a href="#/s/${s.slug}" data-sec="${s.slug}">${esc(s.name)}</a>`).join('');
document.getElementById('foot-sections').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${s.slug}">${esc(s.name)}</a>`).join('');

addEventListener('scroll', () => {
  const max = document.body.scrollHeight - innerHeight;
  document.getElementById('progress').style.width =
    (max > 0 ? (scrollY / max) * 100 : 0) + '%';
}, { passive: true });

// ── pieces ───────────────────────────────────────────────────────────────────
const chip = a => `<span class="chip">${esc(sectionName(a.section))}</span>`;

const score = a => a.rating == null ? '' :
  `<span class="score"><b>${a.rating}</b><i>/${a.ratingMax}</i></span>`;

const meta = a => `<div class="meta">
    <span class="who">${esc(byline(a))}</span>
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
const inlineFig = b => `<figure class="inline-fig">
    <img src="${esc(imageUrl(b.src))}" alt="${esc(b.caption || '')}" loading="lazy">
    ${b.caption || b.credit ? `<figcaption>${esc(b.caption || '')}${
      b.credit ? ` <span>${esc(b.credit)}</span>` : ''}</figcaption>` : ''}
  </figure>`;

function bodyHTML(a) {
  if (isVerse(a)) {
    return `<div class="verse">${a.body.map(esc).join('<br>')}</div>` +
           (a.images || []).slice(1)
             .map((src, i) => inlineFig(photoOf(a, i + 1) || { src })).join('');
  }
  return layoutBlocks(a).map(b =>
    b.type === 'image' ? inlineFig(b) : textHTML(a, b.text)).join('');
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
  <section class="hero">
    <a class="hero-main" href="#/a/${lead.slug}">
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
        <a class="spot" href="#/a/${a.slug}">
          ${thumb(a, 'spot-img')}
          <div>
            ${chip(a)}
            <h3>${esc(a.title)}</h3>
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
        <a class="card" href="#/a/${a.slug}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h3>${esc(a.title)}</h3>
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
        <a href="#/s/${s.slug}">See all ${bySection(s.slug).length} →</a>
      </div>
      <div class="rail">
        ${items.map(a => `
          <a class="mini" href="#/a/${a.slug}">
            ${thumb(a, 'mini-img')}
            <h4>${esc(a.title)}</h4>
            <div class="mini-by">${esc(byline(a))}</div>
          </a>`).join('')}
      </div>
    </section>`;
  }).join('')}`;
}

function renderSection(slug) {
  const items = bySection(slug);
  if (!items.length) return `<section class="block"><h1>Nothing here yet</h1></section>`;
  return `
  <section class="sec-head">
    <h1>${esc(sectionName(slug))}</h1>
    <p>${items.length} ${items.length === 1 ? 'story' : 'stories'} by ${
      new Set(items.map(a => a.author).filter(Boolean)).size || '—'} writers</p>
  </section>
  <section class="block">
    <div class="cards">
      ${items.map(a => `
        <a class="card" href="#/a/${a.slug}">
          ${thumb(a, 'card-img')}
          <div class="card-body">
            ${chip(a)}
            <h3>${esc(a.title)}</h3>
            <p>${esc(a.excerpt.slice(0, 140))}…</p>
            ${meta(a)}
          </div>
        </a>`).join('')}
    </div>
  </section>`;
}

function renderArticle(slug) {
  const a = bySlug(slug);
  if (!a) return `<section class="block"><h1>Not found</h1></section>`;
  const more = bySection(a.section).filter(x => x.id !== a.id).slice(0, 3);
  const src = leadImage(a);

  return `
  <article class="read ${isVerse(a) ? 'is-verse' : ''} ${isQA(a) ? 'is-qa' : ''}">
    <div class="read-head">
      <a class="crumb" href="#/s/${a.section}">← ${esc(sectionName(a.section))}</a>
      <h1>${esc(a.title)}</h1>
      ${isVerse(a) ? '' : `<p class="standfirst">${esc(a.excerpt)}</p>`}
      <div class="read-meta">
        <div class="avatar">${esc((byline(a).match(/\b[A-Za-z]/g) || ['B']).slice(0, 2).join('').toUpperCase())}</div>
        <div>
          <div class="who">${esc(byline(a))}</div>
          <div class="sub">${esc(sectionName(a.section))} · ${readingTime(a)} min read</div>
        </div>
        ${a.rating != null ? `<div class="big-score">${stars(a)}<b>${a.rating}/${a.ratingMax}</b></div>` : ''}
      </div>
    </div>
    ${src ? `<figure class="read-hero"><img src="${esc(src)}" alt=""></figure>` : ''}
    <div class="read-body">
      ${facts(a)}
      ${bodyHTML(a)}
    </div>
  </article>

  ${more.length ? `
  <section class="block">
    <div class="block-head"><h2>More ${esc(sectionName(a.section))}</h2></div>
    <div class="rail">
      ${more.map(x => `
        <a class="mini" href="#/a/${x.slug}">
          ${thumb(x, 'mini-img')}
          <h4>${esc(x.title)}</h4>
          <div class="mini-by">${esc(byline(x))}</div>
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
  else                         { app.innerHTML = renderHome(); }
  document.querySelectorAll('#nav a').forEach(el =>
    el.classList.toggle('on', el.dataset.sec === active));
  scrollTo(0, 0);
}
addEventListener('hashchange', route);

// Merge in anything published from the newsroom, then draw.
Store.hydrate().catch(() => {}).then(route);
