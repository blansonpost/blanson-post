// The Blanson Post — article content model
//
// Every renderer goes through `Blocks.of(article)`, which returns an ordered
// list of typed blocks. Two kinds of article feed it:
//
//   * newsroom articles — already a block list; returned as-is
//   * the 41 archived articles — `body: string[]` + `images: string[]`,
//     converted by fromLegacy()
//
// So the designs only ever see blocks, and the archive keeps rendering exactly
// as it always has.
//
// Requires sections.js. One IIFE, one global (see the note in sections.js).

const Blocks = (() => {

  // ── text ────────────────────────────────────────────────────────────────
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const newId = () => 'b_' + Math.random().toString(36).slice(2, 10);

  // ── media paths ─────────────────────────────────────────────────────────
  // Archived articles store a bare filename; newsroom articles store a full
  // URL (or an object URL). Pass anything already absolute straight through.
  const isAbsolute = s => /^(https?:|data:|blob:|\/)/i.test(String(s));
  const mediaBase  = () => (typeof MEDIA_PATH !== 'undefined' ? MEDIA_PATH : '../assets/media/');
  const imageUrl   = f => (isAbsolute(f) ? String(f) : mediaBase() + f);
  const leadImage  = a => {
    if (a.cover && a.cover.src) return imageUrl(a.cover.src);
    return (a.images && a.images.length) ? imageUrl(a.images[0]) : null;
  };

  // ── article-level facts ─────────────────────────────────────────────────
  const byline = a => a.author || 'The Blanson Post';

  const plainText = a => {
    if (Array.isArray(a.blocks) && a.blocks.length) {
      return a.blocks.map(b =>
        b.type === 'verse' ? (b.lines || []).join(' ') : (b.text || '')).join(' ');
    }
    return (a.body || []).join(' ');
  };
  const readingTime = a =>
    Math.max(1, Math.round(plainText(a).split(/\s+/).filter(Boolean).length / 200));

  // Clamped deliberately: unclamped this throws RangeError inside the router,
  // before innerHTML is assigned, blanking every page of every design.
  const stars = a => {
    if (a.rating == null || !a.ratingMax) return '';
    const raw = Math.round((Number(a.rating) / Number(a.ratingMax)) * 5);
    if (!Number.isFinite(raw)) return '';
    const n = Math.max(0, Math.min(5, raw));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  };

  // ── shape ───────────────────────────────────────────────────────────────
  // `form` is explicit on anything the build or the newsroom produces. The
  // fallbacks reproduce the old guesswork exactly, so an article that predates
  // the field still renders identically — including the `A Thief` exception,
  // which is why that string survives here and nowhere else.
  const isVerse = a => (a.form ? a.form === 'verse'
                               : (a.section === 'poetry' && !/^A Thief/.test(a.title)));

  // Deliberately NOT widened to allow spaces. Widening it would make headings
  // like "Meet Mr. Jenkins:" parse as a speaker turn and change how the two
  // archived interviews render. New interviews use typed `qa` blocks and never
  // reach this regex.
  const SPEAKER_RE = /^([A-Z][A-Za-z.'-]{1,24}):\s*(.*)$/;
  const speakerOf  = line => {
    const m = String(line).match(SPEAKER_RE);
    return m ? { who: m[1], text: m[2] } : null;
  };
  const isQA = a => {
    if (a.form) return a.form === 'qa';
    return (a.body || []).filter(l => SPEAKER_RE.test(l)).length >= 4;
  };

  // Who is asking. Archived interviews name the interviewer; otherwise assume
  // whoever speaks first is the interviewer, which beats hardcoding a surname.
  const interviewerOf = a => {
    if (a.interviewer) return a.interviewer;
    for (const line of (a.body || [])) {
      const s = speakerOf(line);
      if (s) return s.who;
    }
    return null;
  };
  const isQuestion = (a, who) => {
    const iv = interviewerOf(a);
    return !!iv && String(who).toLowerCase().startsWith(String(iv).toLowerCase().slice(0, 7));
  };

  // ── photos ──────────────────────────────────────────────────────────────
  // Caption and credit belong to the placement, not the file, so the same photo
  // used twice is two blocks with two captions and one stored image.
  const photoOf = (a, i) => {
    const p = (a.photos || [])[i];
    if (p && p.src) return { src: p.src, alt: p.alt || '', caption: p.caption || '', credit: p.credit || '' };
    const src = (a.images || [])[i];
    return src ? { src, alt: '', caption: '', credit: '' } : null;
  };

  const PHOTO_MARKER_SRC = '\\[\\[photo:(\\d+)\\]\\]';
  const MARKER_ANY  = new RegExp(PHOTO_MARKER_SRC);
  const MARKER_ALL  = new RegExp(PHOTO_MARKER_SRC, 'g');
  const MARKER_ONLY = new RegExp('^\\s*' + PHOTO_MARKER_SRC + '\\s*$');

  // ── legacy conversion ───────────────────────────────────────────────────
  function fromLegacy(a) {
    const lines  = a.body || [];
    const extras = (a.images || []).slice(1);

    // Hand-placed photos: honour the positions exactly.
    if (lines.some(l => MARKER_ANY.test(l))) {
      const out = [];
      const used = new Set();
      lines.forEach(line => {
        const m = String(line).match(MARKER_ONLY);
        if (m) {
          const idx = Number(m[1]) - 1;
          // Index 0 is the cover, already shown at the top; emitting it again
          // is the "cover appears twice" bug.
          if (idx > 0) {
            const p = photoOf(a, idx);
            if (p) { out.push({ id: newId(), type: 'photo', ...p }); used.add(idx); }
          }
          return;
        }
        const text = String(line).replace(MARKER_ALL, '').trim();
        if (text) out.push({ id: newId(), type: 'text', text });
      });
      // Anything the writer uploaded but never placed used to vanish silently.
      (a.images || []).forEach((_, i) => {
        if (i > 0 && !used.has(i)) {
          const p = photoOf(a, i);
          if (p) out.push({ id: newId(), type: 'photo', ...p });
        }
      });
      return out;
    }

    const text = lines.map(t => ({ id: newId(), type: 'text', text: t }));
    if (!extras.length) return text;

    // A poem is one visual unit, and a very short piece has nowhere to put them.
    if (isVerse(a) || lines.length < 4 || extras.length >= lines.length) {
      return text.concat(extras.map((_, k) => {
        const p = photoOf(a, k + 1);
        return p ? { id: newId(), type: 'photo', ...p } : null;
      }).filter(Boolean));
    }

    // Space them evenly, clear of the opening and closing paragraphs, never two
    // together.
    const used = new Set();
    const step = lines.length / (extras.length + 1);
    const slots = extras.map((_, i) => {
      let at = Math.min(lines.length - 1, Math.max(2, Math.round(step * (i + 1))));
      while (used.has(at) && at < lines.length - 1) at++;
      used.add(at);
      return at;
    });

    const out = [];
    lines.forEach((t, i) => {
      const k = slots.indexOf(i);
      if (k !== -1) {
        const p = photoOf(a, k + 1);
        if (p) out.push({ id: newId(), type: 'photo', ...p });
      }
      out.push({ id: newId(), type: 'text', text: t });
    });
    return out;
  }

  // Give every block an id and a known type; drop anything unrecognised rather
  // than letting a bad shape reach a renderer.
  const KNOWN = new Set(['text', 'para', 'photo', 'verse', 'qa', 'quote', 'heading', 'sub']);
  function normalise(blocks) {
    return blocks
      .filter(b => b && KNOWN.has(b.type))
      .map(b => (b.id ? b : { ...b, id: newId() }))
      // 'para' and 'sub' are the newsroom's names; the designs render 'text'
      // and 'heading'. Normalise here so only one vocabulary reaches them.
      .map(b => b.type === 'para' ? { ...b, type: 'text' }
              : b.type === 'sub'  ? { ...b, type: 'heading' } : b);
  }

  function of(a) {
    if (Array.isArray(a.blocks) && a.blocks.length) return normalise(a.blocks);
    return fromLegacy(a);
  }

  // Plain text for excerpts, reading time and word counts.
  function toPlainText(a) {
    return of(a)
      .filter(b => b.type !== 'photo')
      .map(b => b.type === 'verse' ? (b.lines || []).join('\n') : (b.text || ''))
      .filter(Boolean);
  }

  // Cover first, then every placed photo, in order.
  function imageList(a) {
    const out = [];
    if (a.cover && a.cover.src) out.push(a.cover.src);
    of(a).forEach(b => { if (b.type === 'photo' && b.src) out.push(b.src); });
    return out;
  }

  return {
    esc, newId,
    isAbsolute, imageUrl, leadImage,
    byline, readingTime, stars,
    isVerse, isQA, speakerOf, interviewerOf, isQuestion, SPEAKER_RE,
    photoOf, of, fromLegacy, normalise, toPlainText, imageList
  };
})();
