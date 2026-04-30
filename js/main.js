// ─── THEME ───────────────────────────────────────────────────────────────────
const root = document.documentElement;
let darkMode = localStorage.getItem('blanson_theme') !== 'light';
applyTheme();

function applyTheme() {
  root.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = darkMode ? '☀ Light' : '☾ Dark';
}

function toggleTheme() {
  darkMode = !darkMode;
  localStorage.setItem('blanson_theme', darkMode ? 'dark' : 'light');
  applyTheme();
}

// ─── DATE ────────────────────────────────────────────────────────────────────
function setDate() {
  const el = document.getElementById('date-display');
  if (el) el.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ─── CATEGORY ICONS ──────────────────────────────────────────────────────────
const catIcon = {
  campus: '🏫', skillsusa: '🏅', interviews: '🎙', alumni: '🎓',
  'blanson f.c.': '⚽', sports: '⚽', 'life at blanson': '📸',
  gaming: '🎮', 'book reviews': '📚', 'movie & show reviews': '🎬',
  'movie reviews': '🎬', 'poetry & short stories': '✍',
  'art & photography': '🎨', houston: '🌆', scholarships: '📋',
  default: '📰'
};
function getIcon(cat) {
  if (!cat) return catIcon.default;
  return catIcon[cat.toLowerCase()] || catIcon.default;
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
let currentPage = 'home';
let currentArticleId = null;
let currentSection = null;

function navigate(page, data) {
  currentPage = page;
  if (page === 'article') currentArticleId = data;
  if (page === 'section') currentSection = data;
  render();
  window.scrollTo(0, 0);
}

function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  const articles = loadArticles();
  setDate();

  if (currentPage === 'home') {
    setActiveNav('home');
    app.innerHTML = renderHome(articles);
  } else if (currentPage === 'article') {
    const art = articles.find(a => a.id === currentArticleId);
    app.innerHTML = art ? renderArticle(art, articles) : '<div class="site-wrap" style="padding:40px 20px">Article not found.</div>';
  } else if (currentPage === 'section') {
    setActiveNav(currentSection);
    app.innerHTML = renderSection(currentSection, articles);
  }

  bindEvents();
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function renderHome(articles) {
  const featured = articles.find(a => a.featured) || articles[0];
  const sidebar = articles.filter(a => a.id !== featured.id).slice(0, 4);
  const latest = articles.filter(a => a.id !== featured.id).slice(0, 6);
  const campus = articles.filter(a => a.category === 'campus');
  const mostRead = articles.slice(0, 5);

  const tickerItems = articles.map(a => `<span>${a.title} &nbsp;✦&nbsp;&nbsp;</span>`).join('');

  return `
  <!-- TICKER -->
  <div class="ticker">
    <div class="ticker-label">Latest</div>
    <div class="ticker-track">${tickerItems}${tickerItems}</div>
  </div>

  <div class="site-wrap">
    <!-- HERO -->
    <div style="padding: 32px 0 0">
      <div class="hero">
        <div class="hero-main">
          <div class="hero-img-block">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#003087" stroke-width="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div class="hero-category-badge">${featured.subcategory || featured.category}</div>
          <div class="hero-hed" onclick="navigate('article', ${featured.id})" style="cursor:pointer">${featured.title}</div>
          <div class="hero-dek">${featured.excerpt}</div>
          <div class="byline">By <strong>${featured.author}</strong> &nbsp;·&nbsp; ${featured.date}</div>
        </div>
        <div class="hero-sidebar">
          <div class="section-label">Also Today</div>
          ${sidebar.map(a => `
            <div class="sidebar-story" onclick="navigate('article', ${a.id})">
              <div class="sidebar-cat">${a.subcategory || a.category}</div>
              <div class="sidebar-hed">${a.title}</div>
              <div class="sidebar-byline">By ${a.author}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="rule"></div>

    <!-- LATEST -->
    <div class="section-label">Latest Articles</div>
    <div class="cards-grid">
      ${latest.slice(0, 3).map(a => `
        <div class="card" onclick="navigate('article', ${a.id})">
          <div class="card-img">${getIcon(a.subcategory || a.category)}</div>
          <div class="card-cat">${a.subcategory || a.category}</div>
          <div class="card-hed">${a.title}</div>
          <div class="card-dek">${a.excerpt}</div>
          <div class="card-byline">By ${a.author} · ${a.date}</div>
        </div>
      `).join('')}
    </div>

    <div class="rule"></div>

    <!-- CAMPUS + SIDEBAR -->
    <div class="two-col">
      <div>
        <div class="section-label">Campus</div>
        ${campus.map(a => `
          <div class="wide-card" onclick="navigate('article', ${a.id})">
            <div class="wide-card-img">${getIcon(a.subcategory || a.category)}</div>
            <div>
              <div class="wide-card-cat">${a.subcategory || a.category}</div>
              <div class="wide-card-hed">${a.title}</div>
              <div class="wide-card-dek">${a.excerpt}</div>
              <div class="card-byline" style="margin-top:8px">By ${a.author} · ${a.date}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div>
        <div class="section-label">Most Read</div>
        ${mostRead.map((a, i) => `
          <div class="ranked-item" onclick="navigate('article', ${a.id})">
            <div class="ranked-num">${i + 1}</div>
            <div>
              <div class="ranked-hed">${a.title}</div>
              <div class="ranked-meta">By ${a.author} · ${a.subcategory || a.category}</div>
            </div>
          </div>
        `).join('')}

        <div style="margin-top:24px">
          <div class="callout-houston">
            <div class="callout-title">Houston</div>
            <div class="callout-dek">News, events, and culture from the city Blanson students call home.</div>
            <div class="callout-link" onclick="navigate('section','houston')" style="cursor:pointer;color:var(--yellow)">Read More →</div>
          </div>
          <div class="callout-scholarships">
            <div class="callout-title">Scholarship Opportunities</div>
            <div class="callout-dek">Deadlines are approaching. See the latest opportunities for Blanson students.</div>
            <div class="callout-link" onclick="navigate('section','scholarships')" style="cursor:pointer">View All →</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rule"></div>

    <!-- MORE ARTICLES -->
    <div class="section-label">More Articles</div>
    <div class="cards-grid">
      ${latest.slice(3, 6).map(a => `
        <div class="card" onclick="navigate('article', ${a.id})">
          <div class="card-img">${getIcon(a.subcategory || a.category)}</div>
          <div class="card-cat">${a.subcategory || a.category}</div>
          <div class="card-hed">${a.title}</div>
          <div class="card-dek">${a.excerpt}</div>
          <div class="card-byline">By ${a.author} · ${a.date}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ─── ARTICLE PAGE ─────────────────────────────────────────────────────────────
function renderArticle(art, articles) {
  const related = articles.filter(a => a.id !== art.id && (a.category === art.category || a.subcategory === art.subcategory)).slice(0, 3);
  const paragraphs = art.content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');

  return `
  <div class="section-hero">
    <div class="site-wrap">
      <div class="article-back" onclick="navigate('home')">← Back to Home</div>
    </div>
  </div>
  <div class="site-wrap">
    <div class="article-wrap">
      <div>
        <div class="article-header">
          <div class="article-category-badge">${art.subcategory || art.category}</div>
          <div class="article-title">${art.title}</div>
          <div class="article-byline-block">
            <div class="author-avatar">${initials(art.author)}</div>
            <div>
              <div style="font-weight:600;color:var(--text);font-size:13px">${art.author}</div>
              <div style="font-size:11px;color:var(--text3)">${art.date} &nbsp;·&nbsp; The Blanson Post</div>
            </div>
          </div>
        </div>
        <div class="article-body">${paragraphs}</div>
        <div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:4px">
          ${(art.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
      <div>
        <div class="section-label" style="margin-top:4px">Related</div>
        ${related.length ? related.map(a => `
          <div class="sidebar-story" onclick="navigate('article', ${a.id})">
            <div class="sidebar-cat">${a.subcategory || a.category}</div>
            <div class="sidebar-hed">${a.title}</div>
            <div class="sidebar-byline">By ${a.author}</div>
          </div>
        `).join('') : '<p style="font-size:13px;color:var(--text3);font-family:var(--sans)">No related articles yet.</p>'}
        <div style="margin-top:24px">
          <div class="callout-scholarships">
            <div class="callout-title">Scholarships</div>
            <div class="callout-dek">See the latest opportunities for Blanson students.</div>
            <div class="callout-link" onclick="navigate('section','scholarships')" style="cursor:pointer">View All →</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── SECTION PAGE ─────────────────────────────────────────────────────────────
const sectionMeta = {
  campus:           { label: 'Campus',               sub: 'Life at Blanson CTE High School' },
  gaming:           { label: 'Gaming',               sub: 'Reviews and news from the gaming world' },
  'book reviews':   { label: 'Book Reviews',          sub: 'Student-written book reviews' },
  'movie & show reviews': { label: 'Movie & Show Reviews', sub: 'Film and TV from a student perspective' },
  'poetry & short stories': { label: 'Poetry & Short Stories', sub: 'Creative writing from Blanson students' },
  sports:           { label: 'Sports',               sub: 'Athletics at Blanson and beyond' },
  houston:          { label: 'Houston',              sub: 'News and culture from our city' },
  scholarships:     { label: 'Scholarships',         sub: 'Opportunities for Blanson students' },
  alumni:           { label: 'Alumni',               sub: 'Where are they now?' },
  'art & photography': { label: 'Art & Photography', sub: 'Visual work by Blanson students' },
  'blanson f.c.':   { label: 'Blanson F.C.',         sub: 'Soccer at Blanson CTE' },
  interviews:       { label: 'Interviews',           sub: 'Conversations with people who matter at Blanson' },
};

function renderSection(section, articles) {
  const meta = sectionMeta[section] || { label: section, sub: '' };
  const filtered = articles.filter(a =>
    a.category === section ||
    (a.subcategory || '').toLowerCase() === section ||
    (a.category === 'articles' && (a.subcategory || '').toLowerCase() === section)
  );

  return `
  <div class="section-hero">
    <div class="site-wrap">
      <div class="article-back" onclick="navigate('home')">← Back to Home</div>
      <div class="section-hero-title">${meta.label}</div>
      <div class="section-hero-sub">${meta.sub}</div>
    </div>
  </div>
  <div class="site-wrap">
    ${filtered.length === 0 ? `
      <div style="text-align:center;padding:60px 0;font-family:var(--body-serif);color:var(--text3);font-size:18px">
        No articles in this section yet. <br>
        <span style="font-size:13px;font-family:var(--sans)">Check back soon or add one via the <a href="admin.html" style="color:var(--blue)">admin panel</a>.</span>
      </div>
    ` : `
      <div class="cards-grid">
        ${filtered.map(a => `
          <div class="card" onclick="navigate('article', ${a.id})">
            <div class="card-img">${getIcon(a.subcategory || a.category)}</div>
            <div class="card-cat">${a.subcategory || a.category}</div>
            <div class="card-hed">${a.title}</div>
            <div class="card-dek">${a.excerpt}</div>
            <div class="card-byline">By ${a.author} · ${a.date}</div>
          </div>
        `).join('')}
      </div>
    `}
  </div>`;
}

// ─── EVENT BINDING ────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.nav;
      if (target === 'home') navigate('home');
      else navigate('section', target);
    });
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  render();
});
