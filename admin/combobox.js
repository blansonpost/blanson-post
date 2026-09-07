// The Blanson Post — the suggestion box under a text field
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

  return { attach };
})();
