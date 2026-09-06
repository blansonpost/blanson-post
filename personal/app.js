// The Blanson Post — PERSONAL
// School-spirit layout: Blanson blue & gold, warm paper, collage-style cards.

document.getElementById('banner-date').textContent =
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

document.getElementById('nav').innerHTML =
  `<a href="#/">Home</a>` +
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}" data-sec="${esc(s.slug)}">${esc(s.name)}</a>`).join('');
document.getElementById('foot-sections').innerHTML =
  SECTIONS.map(s => `<a href="#/s/${esc(s.slug)}">${esc(s.name)}</a>`).join('');

// A small emoji per section — this design leans friendly on purpose.
const ICON = {
  campus: '🏫', interviews: '🎙️', sports: '⚽', gaming: '🎮', books: '📚',
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
const inlineFig = b => `<figure class="inline-fig" style="--tilt:${[-1.2, 1, -.7, 1.4][tiltSeed++ % 4]}deg">
     <img src="${esc(imageUrl(b.src))}" alt="${esc(b.decorative ? '' : (b.alt || ''))}" loading="lazy">
     ${b.caption || b.credit ? `<figcaption>${esc(b.caption || '')}${
       b.credit ? ` <span>${esc(b.credit)}</span>` : ''}</figcaption>` : ''}
   </figure>`;

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
  <section class="welcome">
    <div class="welcome-txt">
      <div class="hi">Hey Jaguars 👋</div>
      <h1>This is <em>our</em> paper.</h1>
      <p>${ARTICLES.length} stories written by ${writers} students at Blanson CTE —
         game recaps, movie takes, poetry, interviews with the teachers you see every day.</p>
      <a class="btn" href="#/s/campus">Start reading →</a>
    </div>
    <div class="welcome-collage">
      ${ARTICLES.filter(a => a.images && a.images.length).slice(0, 4)
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
        <h3>${icon(s.slug)} ${esc(s.name)}</h3>
        <a href="#/s/${esc(s.slug)}">see all ${bySection(s.slug).length}</a>
      </div>
      <div class="shelf-row">
        ${items.map((a, i) => `
          <a class="pcard" href="#/a/${esc(a.slug)}">
            ${pic(a, 'pcard-pic', [-1.5, 1, -1][i])}
            <div class="pcard-body">
              <h4>${esc(a.title)}</h4>
              ${a.rating != null ? hearts(a) : ''}
              <p>${esc(a.excerpt.slice(0, 100))}…</p>
              ${who(a)}
            </div>
          </a>`).join('')}
      </div>
    </section>`;
  }).join('')}

  <section class="wall">
    <h3>✏️ Everyone who wrote for us</h3>
    <div class="names">
      ${[...new Set(ARTICLES.map(a => a.author).filter(Boolean))].sort()
        .map(n => `<span>${esc(n)}</span>`).join('')}
    </div>
  </section>`;
}

function renderSection(slug) {
  const items = bySection(slug);
  if (!items.length) return `<section class="shelf"><h3>Nothing here yet!</h3></section>`;
  return `
  <section class="sechead">
    <div class="sechead-icon">${icon(slug)}</div>
    <h1>${esc(sectionName(slug))}</h1>
    <p>${items.length} ${items.length === 1 ? 'story' : 'stories'}</p>
  </section>
  <section class="shelf">
    <div class="grid">
      ${items.map((a, i) => `
        <a class="pcard" href="#/a/${esc(a.slug)}">
          ${pic(a, 'pcard-pic', (i % 3) - 1)}
          <div class="pcard-body">
            <h4>${esc(a.title)}</h4>
            ${a.rating != null ? hearts(a) : ''}
            <p>${esc(a.excerpt.slice(0, 110))}…</p>
            ${who(a)}
          </div>
        </a>`).join('')}
    </div>
  </section>`;
}

function renderArticle(slug) {
  const a = bySlug(slug);
  if (!a) return `<section class="shelf"><h3>Can't find that one!</h3></section>`;
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
        <b>${esc(byline(a))}</b>
        <i>${when(a, true) ? when(a, true) + ' · ' : ''}${readingTime(a)} min read${
          updatedText(a) ? ' · ' + esc(updatedText(a)) : ''}</i>
      </div>
      ${a.rating != null ? `<div class="ratebox">${stars(a)}<b>${a.rating}/${a.ratingMax}</b></div>` : ''}
    </div>

    ${src ? `<div class="story-pic"><img src="${esc(src)}" alt=""></div>` : ''}
    ${facts(a)}
    <div class="story-body">${bodyHTML(a)}</div>

    <div class="thanks">Thanks for reading! 🐆</div>
  </article>

  ${more.length ? `
  <section class="shelf">
    <div class="shelf-head"><h3>More ${esc(sectionName(a.section))}</h3></div>
    <div class="shelf-row">
      ${more.map((x, i) => `
        <a class="pcard" href="#/a/${esc(x.slug)}">
          ${pic(x, 'pcard-pic', (i % 3) - 1)}
          <div class="pcard-body">
            <h4>${esc(x.title)}</h4>
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
  else                         { app.innerHTML = renderHome(); }
  document.querySelectorAll('#nav a').forEach(el =>
    el.classList.toggle('on', el.dataset.sec === active));
  scrollTo(0, 0);
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
