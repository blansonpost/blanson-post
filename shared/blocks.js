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

  // `idb:<id>` is how a newsroom photo is stored at rest. Store.resolvePhotos()
  // swaps those for blob: URLs before anything renders, so one arriving here
  // means the photo is no longer in this browser — swept, deleted, or the
  // article was opened somewhere it was never uploaded.
  const isStoredRef = s => /^idb:/i.test(String(s ?? ''));

  // Returns null when there is no usable picture, and every caller treats null
  // as "render no image at all". This is the choke point: previously an
  // unresolved reference was pasted onto the media path, so the page asked the
  // server for "/assets/media/idb:p_xxxxx", got a 404, and left a broken image
  // icon in the middle of a story someone was reading. A missing photo must
  // never be able to do that, so it is refused here rather than in each design.
  const imageUrl   = f => {
    const s = String(f ?? '').trim();
    if (!s || isStoredRef(s)) return null;
    return isAbsolute(s) ? s : mediaBase() + s;
  };

  // Falls through rather than giving up: if the cover has gone missing but a
  // photo further down the article survives, the story still gets a picture.
  const leadImage  = a => {
    if (a.cover && a.cover.src) {
      const u = imageUrl(a.cover.src);
      if (u) return u;
    }
    for (const f of (a.images || [])) {
      const u = imageUrl(f);
      if (u) return u;
    }
    return null;
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

  // ── dates ───────────────────────────────────────────────────────────────
  // Two shapes arrive here: a full ISO timestamp stamped by the newsroom the
  // moment an article is published, and a plain "2025-03-12" typed into
  // articles.tsv for an archived piece. They cannot be parsed the same way.
  //
  // `new Date('2025-03-12')` is specified as UTC midnight, which in Houston is
  // 7pm on the 11th — so a date-only string run through the usual formatting
  // prints the day *before* the one that was typed. Building it from its parts
  // keeps it local, and so keeps it the date the club actually meant.
  const parseDate = v => {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      // A rolled-over date is worse than no date. new Date(2025, 12, 45) is a
      // perfectly valid Date reading February 2026, so a typo like
      // "2025-13-45" — or a day and month swapped round — would print a
      // confident, wrong day rather than failing. Reject anything the
      // constructor had to normalise to make sense of.
      const y = +ymd[1], m = +ymd[2], day = +ymd[3];
      const dt = new Date(y, m - 1, day);
      return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === day)
        ? dt : null;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  // The old Wix site never recorded a publication date, so the 41 archived
  // articles have none until someone fills in the `date` column. Everything
  // below returns '' in that case: an article whose date nobody knows says
  // nothing, rather than quietly claiming today.
  const publishedOn = a => parseDate(a && (a.publishedAt || a.date));

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];
  // Spelled out rather than toLocaleDateString() so the paper reads the same on
  // a school Chromebook that someone has set to another language.
  const longDate  = d => MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  const shortDate = d => MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate();

  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  // Counted in calendar days, not elapsed hours: a story filed at 11pm reads
  // "Yesterday" at 1am, not "2 hours ago".
  const relative = d => {
    const n = Math.round((midnight(new Date()) - midnight(d)) / 86400000);
    if (n < 0)   return longDate(d);   // a mistyped or clock-skewed future date
    if (n === 0) return 'Today';
    if (n === 1) return 'Yesterday';
    if (n < 7)   return n + ' days ago';
    return d.getFullYear() === new Date().getFullYear() ? shortDate(d) : longDate(d);
  };

  // Every save touches updatedAt, so an "Updated" line is only worth printing
  // when the story changed on a later day than it ran — otherwise fixing one
  // typo brands the article as revised.
  const updatedOn = a => {
    const p = publishedOn(a), u = parseDate(a && a.updatedAt);
    return (p && u && midnight(u) > midnight(p)) ? u : null;
  };

  const dateText    = a => { const d = publishedOn(a); return d ? longDate(d) : ''; };
  const dateShort   = a => { const d = publishedOn(a); return d ? relative(d) : ''; };
  const updatedText = a => { const d = updatedOn(a);   return d ? 'Updated ' + longDate(d) : ''; };

  // A <time> element, so the date is machine-readable even when the visible
  // text is relative — and the exact date stays reachable in the tooltip.
  const dateTag = (a, cls, full) => {
    const d = publishedOn(a);
    if (!d) return '';
    const shown = full ? longDate(d) : relative(d);
    const exact = longDate(d);
    return '<time class="' + esc(cls || 'pubdate') + '" datetime="' + d.toISOString() + '"' +
           (shown === exact ? '' : ' title="' + exact + '"') + '>' + esc(shown) + '</time>';
  };

  // ── Video and audio ─────────────────────────────────────────────────────
  // Blanson's flagship programme is Audio/Video Production, so the paper has to
  // be able to carry the students' own work.
  //
  // The rule that matters: a link a student pastes is NEVER dropped into an
  // iframe as it arrived. It is matched against a short list of known hosts, the
  // id is pulled out with a strict pattern, and the embed address is rebuilt
  // here from a template. Anything that does not match is offered as an ordinary
  // link instead — so a pasted `javascript:` URL, or a look-alike domain, can
  // only ever end up as text.
  // The host is compared as a hostname, not matched inside the string. A regex
  // looking for "youtube.com/" anywhere would happily accept
  // https://evil.example/youtube.com/watch?v=ID, because that substring really
  // is in there. Parsing the URL and reading .hostname cannot be fooled that way.
  const HOSTS = {
    'youtube.com':      'YouTube',
    'm.youtube.com':    'YouTube',
    'youtu.be':         'YouTube',
    'vimeo.com':        'Vimeo',
    'player.vimeo.com': 'Vimeo',
    'drive.google.com': 'Google Drive'
  };

  // Pulls the id out of whichever shape of address the site uses.
  function idFrom(host, u) {
    if (host === 'YouTube') {
      if (u.hostname.replace(/^www\./, '') === 'youtu.be') return u.pathname.slice(1).split('/')[0];
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^\/?#]+)/);
      return m ? m[1] : '';
    }
    if (host === 'Vimeo') {
      const m = u.pathname.match(/(\d{6,12})/);
      return m ? m[1] : '';
    }
    if (host === 'Google Drive') {
      const m = u.pathname.match(/\/file\/d\/([^\/?#]+)/);
      return m ? m[1] : '';
    }
    return '';
  }

  const FRAME = {
    // youtube-nocookie so watching a school video does not follow a student
    // around the rest of the web.
    YouTube: id => 'https://www.youtube-nocookie.com/embed/' + id,
    Vimeo:   id => 'https://player.vimeo.com/video/' + id,
    'Google Drive': id => 'https://drive.google.com/file/d/' + id + '/preview'
  };
  const WATCH = {
    YouTube: id => 'https://www.youtube.com/watch?v=' + id,
    Vimeo:   id => 'https://vimeo.com/' + id,
    'Google Drive': id => 'https://drive.google.com/file/d/' + id + '/view'
  };

  // Returns { ok, host, id, frame, watch } for something the paper can play, or
  // { ok:false, reason } — in which case the renderer prints a plain link and
  // says so rather than showing an empty box.
  function embedOf(url) {
    const raw = String(url || '').trim();
    if (!raw) return { ok: false, reason: 'empty' };
    let u;
    try { u = new URL(raw); } catch (e) { return { ok: false, reason: 'not a web address', url: raw }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:')
      return { ok: false, reason: 'not a web address', url: raw };
    const host = HOSTS[u.hostname.replace(/^www\./, '').toLowerCase()];
    if (!host) return { ok: false, reason: 'unsupported site', url: raw };
    const id = idFrom(host, u);
    // The id goes into an address, so it must be an id and nothing else.
    if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id))
      return { ok: false, reason: 'no video in that link', url: raw };
    return { ok: true, host, id, frame: FRAME[host](id), watch: WATCH[host](id) };
  }

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
  const KNOWN = new Set(['text', 'para', 'photo', 'verse', 'qa', 'quote', 'heading', 'sub',
                         'embed']);
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
    isAbsolute, isStoredRef, imageUrl, leadImage,
    byline, readingTime, stars,
    parseDate, publishedOn, updatedOn, dateText, dateShort, updatedText, dateTag,
    isVerse, isQA, speakerOf, interviewerOf, isQuestion, SPEAKER_RE,
    embedOf,
    photoOf, of, fromLegacy, normalise, toPlainText, imageList
  };
})();
