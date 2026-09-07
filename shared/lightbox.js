// The Blanson Post — photo viewer
//
// Clicking a gallery photo used to navigate away to the raw .jpg: a picture on
// a white background, no caption, no credit, no way to reach the next one, and
// the back button as the only exit. This opens it in place instead.
//
// The links keep their href, and only a plain left click is intercepted. So
// ctrl-click, middle-click, "open in new tab" and right-click-save all still do
// what they have always done, and the gallery still works with JavaScript off.
//
// One IIFE, one global (see the note in sections.js).

const Lightbox = (() => {
  let items = [];        // [{ href, caption, credit }]
  let at = 0;
  let box = null;
  let cameFrom = null;   // the element to hand focus back to on close

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function build() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'lb';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML = `
      <button class="lb-close" type="button" aria-label="Close">&times;</button>
      <button class="lb-prev" type="button" aria-label="Previous photo">&#8249;</button>
      <button class="lb-next" type="button" aria-label="Next photo">&#8250;</button>
      <figure class="lb-stage">
        <img alt="">
        <figcaption><span class="lb-cap"></span><span class="lb-count"></span></figcaption>
      </figure>`;
    document.body.appendChild(box);

    box.querySelector('.lb-close').onclick = close;
    box.querySelector('.lb-prev').onclick = () => step(-1);
    box.querySelector('.lb-next').onclick = () => step(1);
    // Clicking the backdrop closes; clicking the photo or the buttons does not.
    box.addEventListener('click', e => { if (e.target === box) close(); });
    return box;
  }

  function show() {
    const it = items[at];
    if (!it) return;
    const img = box.querySelector('img');
    img.src = it.href;
    // The caption describes the picture, so it is the alt text too. Without a
    // caption the image is decorative here — the reader already chose to open
    // it, and "photo" read aloud is noise.
    img.alt = it.caption || '';
    box.querySelector('.lb-cap').innerHTML =
      esc(it.caption || '') + (it.credit ? ` <i>${esc(it.credit)}</i>` : '');
    box.querySelector('.lb-count').textContent =
      items.length > 1 ? `${at + 1} of ${items.length}` : '';
    const many = items.length > 1;
    box.querySelector('.lb-prev').hidden = !many;
    box.querySelector('.lb-next').hidden = !many;
  }

  // Wraps around, because reaching the end of a gallery and finding the arrow
  // dead is a worse surprise than looping.
  function step(by) {
    if (!items.length) return;
    at = (at + by + items.length) % items.length;
    show();
  }

  function onKey(e) {
    if (e.key === 'Escape')     { e.preventDefault(); close(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  }

  function open(list, index, opener) {
    if (!list || !list.length) return;
    items = list; at = index || 0; cameFrom = opener || null;
    build().hidden = false;
    document.body.classList.add('lb-open');
    show();
    addEventListener('keydown', onKey);
    box.querySelector('.lb-close').focus();
  }

  function close() {
    if (!box) return;
    box.hidden = true;
    // Drop the source so a large photo is not held in memory, and so reopening
    // never shows the previous picture for a frame.
    box.querySelector('img').removeAttribute('src');
    document.body.classList.remove('lb-open');
    removeEventListener('keydown', onKey);
    if (cameFrom && cameFrom.isConnected) cameFrom.focus();
    cameFrom = null;
  }

  // Delegated on a container, so a gallery redrawn by the router keeps working
  // without rebinding. Every `selector` match inside `root` becomes one strip:
  // the arrows walk the run of photos the reader is actually looking at.
  function wire(root, selector) {
    if (!root) return;
    root.addEventListener('click', e => {
      const link = e.target.closest(selector);
      if (!link || !root.contains(link)) return;
      // Leave every deliberate "open it somewhere else" gesture alone.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
          e.shiftKey || e.altKey) return;
      const strip = [...(link.closest('.gal') || root).querySelectorAll(selector)];
      const list = strip.map(el => ({
        href: el.getAttribute('href'),
        caption: el.dataset.caption || '',
        credit: el.dataset.credit || ''
      }));
      const i = strip.indexOf(link);
      if (i === -1 || !list[i].href) return;
      e.preventDefault();
      open(list, i, link);
    });
  }

  return { open, close, wire };
})();
