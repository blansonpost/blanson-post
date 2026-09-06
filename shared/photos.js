// The Blanson Post — photo pipeline
//
// Owns every step between "a student picked a file" and "an <img> shows it":
// validate, decode, downscale, store as a Blob, hand out object URLs, and revoke
// them again. Nothing else in the project may call URL.createObjectURL.
//
// Requires idb.js. One IIFE, one global (see the note in sections.js).

const Photos = (() => {
  const MAX_BYTES   = 25 * 1024 * 1024;   // refuse before decoding
  const MAX_SIDE    = 1600;               // long edge on the stored copy
  const THUMB_SIDE  = 320;                // for the editor list and card grids
  const JPEG_Q      = 0.82;
  const THUMB_Q     = 0.75;
  const MAX_PIXELS  = 50e6;               // a scan this big will not decode well

  const OK_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const fail = IDB.fail;
  const newId = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ── format sniffing ───────────────────────────────────────────────────────
  // Chromebooks frequently report an empty `type` for photos copied off a
  // phone, so the magic bytes are the reliable check, not the MIME string.
  async function sniff(file) {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const ascii = (a, b) => String.fromCharCode(...head.slice(a, b));

    if (ascii(4, 8) === 'ftyp') {
      const brand = ascii(8, 12);
      if (/^(heic|heix|hevc|hevx|mif1|msf1|heim|heis|avif)$/.test(brand)) return 'heic';
    }
    if (head[0] === 0xFF && head[1] === 0xD8) return 'image/jpeg';
    if (head[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
    if (ascii(0, 3) === 'GIF') return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
    if (/^\s*<(\?xml|svg)/i.test(ascii(0, 16))) return 'svg';
    return file.type || 'unknown';
  }

  // Returns null when the file is fine, or a message written for a student.
  async function reject(file) {
    if (!file.size) return `“${file.name}” is empty.`;
    if (file.size > MAX_BYTES) {
      return `“${file.name}” is ${(file.size / 1048576).toFixed(0)} MB — too big to use. ` +
             `Most photos are under 5 MB, so this is probably a video or a scan.`;
    }
    const kind = await sniff(file);

    if (kind === 'heic') {
      return `“${file.name}” is a HEIC photo, which web browsers can’t open. ` +
             `On an iPhone: Settings → Camera → Formats → Most Compatible, then take it again. ` +
             `Or email the photo to yourself and save the copy — email converts it to JPEG.`;
    }
    if (kind === 'svg' || /svg/i.test(file.type)) {
      // Not a preference: an SVG served from our own address can carry a script.
      return `“${file.name}” is an SVG drawing, which can’t be used as a photo. ` +
             `Open it and export a PNG or JPEG first.`;
    }
    if (!OK_MIME.includes(kind)) {
      return `“${file.name}” isn’t a photo we can use. JPEG, PNG, WebP and GIF all work.`;
    }
    return null;
  }

  // ── decode ────────────────────────────────────────────────────────────────
  // createImageBitmap applies EXIF orientation, so portrait phone photos stop
  // arriving sideways, and it avoids turning the whole file into a base64
  // string in memory first.
  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch (e) { /* older browser, or an image it won't decode this way */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(fail('DENIED',
          `“${file.name}” is damaged and wouldn’t open. Try downloading it again.`));
        i.src = url;
      });
      return img;
    } finally { URL.revokeObjectURL(url); }
  }

  const sizeOf = src => ({
    w: src.width || src.naturalWidth || 0,
    h: src.height || src.naturalHeight || 0
  });

  // Any transparency at all means the JPEG path would flatten it to black, so
  // the file has to stay PNG. Sampled small — a full-size scan is wasteful.
  function hasAlpha(canvas) {
    const s = document.createElement('canvas');
    s.width = Math.min(64, canvas.width); s.height = Math.min(64, canvas.height);
    const cx = s.getContext('2d', { willReadFrequently: true });
    cx.drawImage(canvas, 0, 0, s.width, s.height);
    const d = cx.getImageData(0, 0, s.width, s.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
    return false;
  }

  // Two passes when shrinking a lot: a single bilinear step from 12 MP aliases
  // badly, and five extra lines fixes it.
  function draw(src, w, h, opaque) {
    const { w: sw, h: sh } = sizeOf(src);
    let from = src, fw = sw, fh = sh;
    if (sw / w > 2) {
      const mid = document.createElement('canvas');
      mid.width = Math.round(w * 2); mid.height = Math.round(h * 2);
      mid.getContext('2d').drawImage(src, 0, 0, mid.width, mid.height);
      from = mid; fw = mid.width; fh = mid.height;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    // White underneath, so a transparent PNG saved as JPEG doesn't go black.
    if (opaque) { cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, w, h); }
    cx.drawImage(from, 0, 0, fw, fh, 0, 0, w, h);
    return c;
  }

  const toBlob = (canvas, mime, q) => new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(fail('DENIED',
      'This computer ran out of memory on that photo. Try adding them one at a time.')), mime, q));

  // ── the main entry point ──────────────────────────────────────────────────
  // Returns { id, name, mime, w, h, bytes } after storing the Blob.
  async function add(file) {
    const why = await reject(file);
    if (why) throw fail('DENIED', why);

    const bitmap = await decode(file);
    const { w: sw, h: sh } = sizeOf(bitmap);
    if (!sw || !sh) throw fail('DENIED', `“${file.name}” opened as an empty image.`);
    if (sw * sh > MAX_PIXELS) {
      // Not fatal — just say so, because the result will be heavily reduced.
      console.warn('[Photos] very large source', file.name, sw + '×' + sh);
    }

    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));

    const probe = draw(bitmap, Math.min(64, w), Math.min(64, h), false);
    const keepAlpha = hasAlpha(probe);
    const mime = keepAlpha ? 'image/png' : 'image/jpeg';

    const full  = draw(bitmap, w, h, !keepAlpha);
    const blob  = await toBlob(full, mime, JPEG_Q);

    const ts = Math.min(1, THUMB_SIDE / Math.max(w, h));
    const thumbCanvas = draw(full, Math.max(1, Math.round(w * ts)), Math.max(1, Math.round(h * ts)), !keepAlpha);
    const thumb = await toBlob(thumbCanvas, mime, THUMB_Q);

    if (bitmap.close) bitmap.close();

    const rec = { id: newId(), blob, thumb, mime, w, h,
                  bytes: blob.size, name: file.name, createdAt: new Date().toISOString() };
    await IDB.put('photos', rec);          // throws QUOTA if there is no room
    const { blob: _b, thumb: _t, ...meta } = rec;
    return meta;
  }

  // ── object URL lifecycle ──────────────────────────────────────────────────
  // Refcounted per scope so the editor can drop everything on article close
  // without yanking a URL the public page is still using.
  const live = new Map();                 // key -> { url, scopes:Set }
  const keyOf = (id, kind) => id + '|' + kind;

  async function url(id, scope, kind = 'full') {
    const key = keyOf(id, kind);
    const hit = live.get(key);
    if (hit) { hit.scopes.add(scope); return hit.url; }

    const rec = await IDB.get('photos', id);
    if (!rec) return null;
    const blob = kind === 'thumb' ? (rec.thumb || rec.blob) : rec.blob;
    const made = URL.createObjectURL(blob);
    live.set(key, { url: made, scopes: new Set([scope]) });
    return made;
  }

  function releaseScope(scope) {
    for (const [key, entry] of [...live.entries()]) {
      entry.scopes.delete(scope);
      if (!entry.scopes.size) { URL.revokeObjectURL(entry.url); live.delete(key); }
    }
  }

  // ── housekeeping ──────────────────────────────────────────────────────────
  // Removing a photo from an article marks the file, it does not delete it, so
  // an undo — or a save that fails right afterwards — can still get it back.
  async function markOrphans(liveIds) {
    const keep = new Set(liveIds);
    const now = Date.now();
    const all = await IDB.all('photos');
    for (const rec of all) {
      if (keep.has(rec.id) && rec.orphanedAt) { delete rec.orphanedAt; await IDB.put('photos', rec); }
      else if (!keep.has(rec.id) && !rec.orphanedAt) { rec.orphanedAt = now; await IDB.put('photos', rec); }
    }
  }

  async function sweep(maxAgeMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const rec of await IDB.all('photos')) {
      if (rec.orphanedAt && rec.orphanedAt < cutoff) { await IDB.del('photos', rec.id); removed++; }
    }
    return removed;
  }

  return { add, url, releaseScope, markOrphans, sweep, reject, sniff,
           MAX_SIDE, MAX_BYTES, OK_MIME };
})();
