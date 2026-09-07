// The Blanson Post — the suggestion box, and the dropdown
//
// Replaces <datalist>. A datalist is drawn by the operating system, not by the
// page: it ignores every colour in this stylesheet, looks different on a school
// Chromebook and a teacher's Mac, can't show which part of a word matched, and
// on some browsers can't be reached from the keyboard at all.
//
// Two fields use it. "Part of a series" holds one value. "What it's about"
// holds several separated by commas, so the term being completed is whatever
// comes after the last comma, and picking one replaces just that.
//
// One IIFE, one global (see the note in sections.js).

const Combobox = (() => {
  const esc = Blocks.esc;

  // Same folding the site's search uses, so "sci-fi" finds "Sci-Fi" and an
  // accented name matches what somebody typed without the accent.
  const fold = s => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Marks the matched run so it is obvious why a suggestion is being offered.
  function mark(text, term) {
    const at = fold(text).indexOf(fold(term));
    if (!term || at === -1) return esc(text);
    return esc(text.slice(0, at)) +
           '<b>' + esc(text.slice(at, at + term.length)) + '</b>' +
           esc(text.slice(at + term.length));
  }

  function attach(input, spec) {
    if (!input) return;
    const multi = !!spec.multi;
    const options = spec.options || (() => []);

    // The field keeps its place in the layout; the wrapper only exists to give
    // the list something to be positioned against.
    const wrap = document.createElement('div');
    wrap.className = 'cbx';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const list = document.createElement('ul');
    list.className = 'cbx-list';
    list.id = input.id + '-suggestions';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.appendChild(list);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('autocomplete', 'off');
    input.removeAttribute('list');          // no datalist left to fall back to

    let shown = [];
    let at = -1;                            // which suggestion is highlighted

    // For the comma-separated field, everything before the last comma is
    // already settled and only the tail is being completed.
    const head = () => multi ? input.value.slice(0, input.value.lastIndexOf(',') + 1) : '';
    const term = () => (multi ? input.value.slice(head().length) : input.value).trim();

    const taken = () => new Set(
      (multi ? head().split(',') : []).map(t => fold(t.trim())).filter(Boolean));

    function close() {
      list.hidden = true;
      list.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      shown = []; at = -1;
    }

    function paint() {
      list.innerHTML = shown.map((t, i) => `
        <li role="option" id="${esc(list.id)}-${i}" data-i="${i}"
            class="cbx-item${i === at ? ' on' : ''}"
            aria-selected="${i === at}">${mark(t, term())}</li>`).join('');
      if (at >= 0) input.setAttribute('aria-activedescendant', list.id + '-' + at);
      else input.removeAttribute('aria-activedescendant');
    }

    function open() {
      if (input.readOnly || input.disabled) return close();
      const t = term();
      const already = taken();
      shown = options()
        .filter(o => o && !already.has(fold(o)))
        .filter(o => !t || fold(o).includes(fold(t)))
        // A word that starts with what was typed is the likelier one.
        .sort((x, y) => {
          const sx = fold(x).startsWith(fold(t)) ? 0 : 1;
          const sy = fold(y).startsWith(fold(t)) ? 0 : 1;
          return sx - sy || x.localeCompare(y);
        })
        .slice(0, 8);
      // An empty box floating under the field says nothing useful.
      if (!shown.length) return close();
      at = -1;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      paint();
    }

    function choose(i) {
      const pick = shown[i];
      if (pick == null) return;
      input.value = multi ? (head() ? head() + ' ' : '') + pick + ', ' : pick;
      // The editor writes straight into the document on `input`. Setting .value
      // from script fires nothing, so without this the pick would show in the
      // box and never reach the article.
      input.dispatchEvent(new Event('input', { bubbles: true }));
      close();
      input.focus();
    }

    input.addEventListener('input', open);
    input.addEventListener('focus', open);

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) { open(); return; }
        e.preventDefault();
        at = e.key === 'ArrowDown'
          ? (at + 1) % shown.length
          : (at <= 0 ? shown.length - 1 : at - 1);
        paint();
        const el = list.children[at];
        if (el) el.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (e.key === 'Enter' && !list.hidden && at >= 0) {
        // Only swallow Return when something is actually highlighted, so the
        // key still does whatever it normally would otherwise.
        e.preventDefault();
        choose(at);
        return;
      }
      if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') close();
    });

    // mousedown, not click: the field blurs first on a click, and a blur that
    // closes the list would take the option out from under the pointer.
    list.addEventListener('mousedown', e => {
      const li = e.target.closest('.cbx-item');
      if (!li) return;
      e.preventDefault();
      choose(Number(li.dataset.i));
    });

    input.addEventListener('blur', () => setTimeout(close, 0));
  }

  // ── A dropdown, in place of the browser's own ──────────────────────────────
  // Same problem as the datalist: the open list of a <select> is drawn by the
  // operating system, so Section and Kind of piece dropped a grey Windows menu
  // over a dark newsroom.
  //
  // The <select> itself stays exactly where it was and remains the value. It is
  // only taken out of the tab order and hidden from assistive tech, which now
  // sees the button instead. Everything already reading `.value` or listening
  // for `change` carries on working, including code written after this.
  const syncs = [];

  function select(el) {
    if (!el || el.dataset.cbx) return;
    el.dataset.cbx = '1';

    const wrap = document.createElement('div');
    wrap.className = 'cbx cbx-sel';
    el.parentNode.insertBefore(wrap, el);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cbx-button';
    btn.innerHTML = '<span class="cbx-value"></span><span class="cbx-arrow" aria-hidden="true"></span>';

    const list = document.createElement('ul');
    list.className = 'cbx-list';
    list.id = (el.id || 'sel-' + syncs.length) + '-options';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    // Button first: these sit inside a <label>, and a label drives its first
    // labelable descendant. Leaving the select first would send a click on the
    // word "Section" to a control nobody can see.
    wrap.append(btn, el, list);

    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', list.id);
    if (el.getAttribute('aria-label')) btn.setAttribute('aria-label', el.getAttribute('aria-label'));

    let at = -1;
    let typed = '', typedAt = 0;

    // Read from the live <select> every time, so options rebuilt elsewhere —
    // the section list, a staff row redrawn — need no telling.
    const opts = () => [...el.options];

    const sync = () => {
      const o = el.selectedOptions[0];
      btn.querySelector('.cbx-value').textContent = o ? o.textContent : '';
      btn.disabled = el.disabled;
    };
    syncs.push(sync);
    sync();

    function close() {
      list.hidden = true;
      list.innerHTML = '';
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
      wrap.classList.remove('open');
      at = -1;
    }

    function paint() {
      list.innerHTML = opts().map((o, i) => `
        <li role="option" id="${esc(list.id)}-${i}" data-i="${i}"
            class="cbx-item${i === at ? ' on' : ''}"
            aria-selected="${o.selected}">${esc(o.textContent)}</li>`).join('');
      if (at >= 0) {
        btn.setAttribute('aria-activedescendant', list.id + '-' + at);
        const el2 = list.children[at];
        if (el2) el2.scrollIntoView({ block: 'nearest' });
      }
    }

    function open() {
      if (el.disabled) return;
      at = Math.max(0, el.selectedIndex);
      list.hidden = false;
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      paint();
    }

    function choose(i) {
      const o = opts()[i];
      if (!o) return;
      el.selectedIndex = i;
      sync();
      // Assigning selectedIndex fires nothing. Everything downstream of these
      // dropdowns listens for change, so it has to be sent by hand.
      el.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      btn.focus();
    }

    btn.addEventListener('click', () => (list.hidden ? open() : close()));

    btn.addEventListener('keydown', e => {
      const n = opts().length;
      if (list.hidden) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); open();
        }
        return;
      }
      if (e.key === 'ArrowDown')  { e.preventDefault(); at = (at + 1) % n; paint(); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); at = at <= 0 ? n - 1 : at - 1; paint(); return; }
      if (e.key === 'Home')       { e.preventDefault(); at = 0; paint(); return; }
      if (e.key === 'End')        { e.preventDefault(); at = n - 1; paint(); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(at); return; }
      if (e.key === 'Escape')     { e.preventDefault(); close(); return; }
      if (e.key === 'Tab')        { close(); return; }
      // Typing jumps, the way a real dropdown does. Letters pressed close
      // together build up a word rather than each starting again.
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const now = Date.now();
        typed = (now - typedAt < 900 ? typed : '') + e.key.toLowerCase();
        typedAt = now;
        const hit = opts().findIndex(o => o.textContent.toLowerCase().startsWith(typed));
        if (hit !== -1) { at = hit; paint(); }
      }
    });

    // mousedown for the same reason as the suggestion list: the button blurs
    // first on a click, and the blur would close the list under the pointer.
    list.addEventListener('mousedown', e => {
      const li = e.target.closest('.cbx-item');
      if (!li) return;
      e.preventDefault();
      choose(Number(li.dataset.i));
    });

    btn.addEventListener('blur', () => setTimeout(() => {
      if (!wrap.contains(document.activeElement)) close();
    }, 0));
  }

  // Nothing fires when code assigns `.value`, so the button's label is brought
  // back in step by hand after the editor loads, clears or locks a story.
  const refresh = () => syncs.forEach(f => f());

  // Every <select> inside a container, for the ones built at runtime.
  const selectsIn = root =>
    (root || document).querySelectorAll('select:not([data-cbx])').forEach(select);

  return { attach, select, selectsIn, refresh };
})();
