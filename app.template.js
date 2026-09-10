/* ============================================================
   Sprite Animator — generate seamless looping animation from a
   single still sprite. 100% client-side. No network, no tracking.
   ============================================================ */
/*__GIFENC_SRC__*/

'use strict';

/* ---------- tiny helpers ---------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = (deg) => deg * Math.PI / 180;
const TAU = Math.PI * 2;

const DEMO_B64 = '__DEMO_B64__';

/* ---------- state ---------- */
const S = {
  name: 'sprite',            // base download name
  orig: null,                // {cv, w, h} original image
  nativeAlpha: false,        // source PNG already had transparency
  bgOn: true,                // remove baked background
  tol: 26,                   // flood tolerance
  trim: true,
  islands: [],               // [{x,y,w,h,pix,area,dup}]
  sel: 0,                    // single mode: chosen island index
  mode: 'single',            // 'single' (synthetic motion) | 'frames' (real poses)
  frameSource: 'islands',    // 'islands' (auto/manual selection) | 'grid' (manual slice)
  frameSel: null,            // islands source: chosen island indexes
  frameCrops: [],            // frames mode: [{cv,w,h}] in playback order
  durations: [],             // ms per frame (per-frame timing)
  useDurations: true,
  grid: { mode: 'auto', cols: 6, rows: 1, cw: 200, ch: 300, ox: 0, oy: 0, keepLargest: true },
  tMs: 0,                    // playback position within the loop (ms)
  selFrame: 0,               // frame highlighted on the timeline
  thumbs: [],                // timeline block thumbnails (data URLs)
  loaded: false,
  zoomFit: true,             // preview fills the stage until the user drags the zoom slider
  spr: null,                 // {cv, w, h} chosen, trimmed sprite
  layout: null,              // {W,H,ax,ay,pad}
  hasAlpha: false,
  preset: 'idle',
  params: {},
  tempo: 1,
  fps: 12, N: 16, cols: 8,
  playing: true, smoothMode: true,
  u: 0,
  backdrop: 'checker',
  zoom: 100, pixel: false,
  busy: false,
};
const effN = () => (S.mode === 'frames' ? S.frameCrops.length : S.N);
/* ---- frame timing ---- */
function totalMs() {
  if (!S.useDurations || !S.durations.length) return Math.max(1, effN() * 1000 / S.fps);
  return S.durations.reduce((a, b) => a + b, 0);
}
function frameAtMs(ms) {
  const n = effN();
  if (!n) return 0;
  if (!S.useDurations || S.durations.length !== n) return Math.min(n - 1, Math.floor(ms / (1000 / S.fps)) % n);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += S.durations[i]; if (ms < acc) return i; }
  return n - 1;
}
function frameStartMs(i) {
  if (!S.useDurations || S.durations.length !== effN()) return i * (1000 / S.fps);
  let acc = 0;
  for (let k = 0; k < i; k++) acc += S.durations[k];
  return acc;
}
function resetDurations(uniformMs) {
  const n = effN();
  S.durations = Array.from({ length: n }, () => (uniformMs !== undefined ? uniformMs : Math.round(1000 / S.fps)));
  S.tMs = 0;
}

/* ============================================================
   Motion presets.
   u = cycle phase in [0,1). Every waveform is a sum of sin/cos
   harmonics of the loop frequency => mathematically seamless loop.
   p.* are the user-adjustable params (values already resolved to
   pixels/degrees). Returns {x, y, rot, sx, sy}.
   ============================================================ */
const PRESETS = {
  none:  { label: 'None', anchor: 'center',
    params: {},
    fn(u, p, w, h) { return { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; } },
  idle:  { label: 'Idle', anchor: 'base',
    params: { bob:   { label: 'Bob height', min: 0, max: 18, def: 5, unit: '% h' },
              breath:{ label: 'Breath',     min: 0, max: 12, def: 4, unit: '%' } },
    fn(u, p, w, h) {
      const c = Math.cos(TAU * u);
      return { x: 0, y: -h * p.bob / 100 * (0.5 - 0.5 * c),
               rot: 0, sx: 1 - p.breath / 100 * c * 0.35, sy: 1 + p.breath / 100 * c * 0.5 };
    } },
  bounce:{ label: 'Bounce', anchor: 'base',
    params: { height: { label: 'Height', min: 0, max: 40, def: 10, unit: '% h' },
              squash: { label: 'Squash', min: 0, max: 25, def: 10, unit: '%' } },
    fn(u, p, w, h) {
      const c = Math.cos(TAU * u);
      const q = Math.pow(Math.max(0, c), 3) * p.squash / 100;
      return { x: 0, y: -h * p.height / 100 * (0.5 - 0.5 * c), rot: 0,
               sx: 1 + q * 0.9, sy: 1 - q };
    } },
  hop:   { label: 'Hop', anchor: 'base',
    params: { height: { label: 'Height', min: 0, max: 60, def: 26, unit: '% h' },
              squash: { label: 'Landing squash', min: 0, max: 30, def: 14, unit: '%' },
              hang:   { label: 'Air time',       min: 20, max: 80, def: 50, unit: '%' } },
    fn(u, p, w, h) {
      // contact on the ground for (1-hang) of the cycle
      const air = p.hang / 100;
      const a = u / air;                       // 0..1 inside air phase
      const inAir = u < air;
      const y = inAir ? -h * p.height / 100 * Math.sin(Math.PI * a) : 0;
      // squash pulses at the two contacts (u=0 and u=air)
      const q = p.squash / 100 * (
        Math.pow(Math.max(0, Math.cos(TAU * u)), 3) +
        Math.pow(Math.max(0, Math.cos(TAU * (u - air))), 3));
      return { x: 0, y, rot: 0, sx: 1 + q * 0.9, sy: 1 - q };
    } },
  walk:  { label: 'Walk', anchor: 'base',
    params: { bob:   { label: 'Bob', min: 0, max: 18, def: 7, unit: '% h' },
              rock:  { label: 'Body rock', min: 0, max: 14, def: 4, unit: '°' },
              squash:{ label: 'Squash', min: 0, max: 15, def: 6, unit: '%' } },
    fn(u, p, w, h) {
      const c = Math.cos(TAU * u);
      const q = Math.pow(Math.max(0, c), 3) * p.squash / 100;
      return { x: 0, y: -h * p.bob / 100 * (0.5 - 0.5 * Math.cos(TAU * 2 * u)),
               rot: rad(p.rock) * Math.sin(TAU * 2 * u), sx: 1 + q * 0.9, sy: 1 - q };
    } },
  run:   { label: 'Run', anchor: 'base',
    params: { bob:   { label: 'Bob', min: 0, max: 26, def: 16, unit: '% h' },
              rock:  { label: 'Lean rock', min: 0, max: 20, def: 9, unit: '°' },
              squash:{ label: 'Squash', min: 0, max: 20, def: 12, unit: '%' } },
    fn(u, p, w, h) {
      const c = Math.cos(TAU * u);
      const q = Math.pow(Math.max(0, c), 3) * p.squash / 100;
      return { x: 0, y: -h * p.bob / 100 * (0.5 - 0.5 * Math.cos(TAU * 2 * u)),
               rot: rad(p.rock) * Math.sin(TAU * 2 * u), sx: 1 + q, sy: 1 - q * 0.95 };
    } },
  float: { label: 'Float', anchor: 'base',
    params: { bob: { label: 'Bob', min: 0, max: 26, def: 9, unit: '% h' },
              drift:{ label: 'Drift', min: 0, max: 16, def: 4, unit: '% w' },
              rock: { label: 'Rock', min: 0, max: 10, def: 2, unit: '°' } },
    fn(u, p, w, h) {
      return { x: w * p.drift / 100 * Math.sin(TAU * u),
               y: -h * p.bob / 100 * (0.5 - 0.5 * Math.cos(TAU * u)),
               rot: rad(p.rock) * Math.sin(TAU * u + 1.2), sx: 1, sy: 1 };
    } },
  sway:  { label: 'Sway', anchor: 'base',
    params: { angle: { label: 'Lean', min: 0, max: 25, def: 9, unit: '°' },
              slide: { label: 'Slide', min: 0, max: 12, def: 3, unit: '% w' } },
    fn(u, p, w, h) {
      const s = Math.sin(TAU * u);
      return { x: w * p.slide / 100 * s * 0.6,
               y: -Math.max(0, s) * h * 0.012,
               rot: rad(p.angle) * s, sx: 1, sy: 1 };
    } },
  pulse: { label: 'Pulse', anchor: 'center',
    params: { amount: { label: 'Pulse', min: 0, max: 22, def: 9, unit: '%' } },
    fn(u, p, w, h) {
      const a = Math.cos(TAU * u) * p.amount / 100;
      return { x: 0, y: 0, rot: 0, sx: 1 / (1 + a), sy: 1 + a };
    } },
  shake: { label: 'Shake', anchor: 'center',
    params: { power: { label: 'Power', min: 0, max: 10, def: 1.6, step: 0.1, unit: '% w' },
              wild:  { label: 'Wildness', min: 0, max: 12, def: 4, unit: '°' } },
    fn(u, p, w, h) {
      return { x: w * p.power / 100 * (0.75 * Math.sin(TAU * 3 * u) + 0.25 * Math.sin(TAU * 5 * u + 2.1)),
               y: w * p.power / 100 * 0.35 * Math.sin(TAU * 4 * u + 0.6),
               rot: rad(p.wild) * 0.5 * Math.sin(TAU * 5 * u + 0.9), sx: 1, sy: 1 };
    } },
};
const PRESET_ORDER = ['none', 'idle', 'bounce', 'hop', 'walk', 'run', 'float', 'sway', 'pulse', 'shake'];

function defaultParams(preset) {
  const o = {};
  for (const k in PRESETS[preset].params) o[k] = PRESETS[preset].params[k].def;
  return o;
}
/* resolve param (% of sprite size) into pixels; fn receives px + deg */
function resolveParams(params, preset, w, h) {
  const defs = PRESETS[preset].params, p = {};
  for (const k in defs) {
    let v = params[k];
    const u = defs[k].unit;
    p[k] = u === '% h' ? v * h / 100 : u === '% w' ? v * w / 100 : v; // '%' or '°' raw
  }
  return p;
}

/* ============================================================
   Image IO
   ============================================================ */
function imgFromBlob(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not decode image')); };
    im.src = url;
  });
}
function canvasOf(im) {
  const cv = document.createElement('canvas');
  cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  cv.getContext('2d').drawImage(im, 0, 0);
  return cv;
}

/* ============================================================
   Background removal (baked checkerboard / flat bg from JPEG)
   Strategy: find the two most common colors of a downscaled copy
   (= the two checker shades, or a single flat bg), then 8-way
   flood-fill from the image borders removing any pixel within
   tolerance of those shades. Interior pixels are unreachable, so
   e.g. white eyes survive.
   ============================================================ */
function dominantShades(cv, n = 2) {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0, 48, 48);
  const d = x.getImageData(0, 0, 48, 48).data;
  const counts = new Map(); // quantized key -> averaged true color
  for (let i = 0; i < d.length; i += 4) {
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    let e = counts.get(key);
    if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; counts.set(key, e); }
    e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
  }
  return [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, n)
    .map(([, e]) => [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]);
}
function near(c, shade, tol) {
  return Math.abs(c[0] - shade[0]) <= tol && Math.abs(c[1] - shade[1]) <= tol && Math.abs(c[2] - shade[2]) <= tol;
}
/* returns Uint8 keep-mask: 1 = opaque/content */
function contentMask(cv, tol) {
  const { width: w, height: h } = cv;
  const ctx = cv.getContext('2d');
  const d = ctx.getImageData(0, 0, w, h).data;
  const keep = new Uint8Array(w * h);
  const alphaNative = S.nativeAlpha;
  if (!alphaNative && S.bgOn) {
    const shades = dominantShades(cv);
    const q = new Int32Array(w * h).fill(-1);   // -1 = unvisited/content, 1 = bg reached
    const stack = [];
    const push = (i) => { if (q[i] < 0) { q[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop();
      const px = i * 4;
      const c = [d[px], d[px + 1], d[px + 2]];
      if (!shades.some((s) => near(c, s, tol))) continue; // content edge reached
      const cx = i % w, cy = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) push(ny * w + nx);
      }
    }
    // keep = 1 means CONTENT (pixels the flood never reached)
    for (let i = 0; i < keep.length; i++) if (q[i] === -1) keep[i] = 1;
    return { keep, alpha: false, fillAlpha(d) {
      for (let i = 0; i < keep.length; i++) if (!keep[i]) { d[i * 4 + 3] = 0; }
    } };
  }
  // native alpha (or bg removal off): content = visible pixels
  const alpha = true;
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 140) keep[i] = 1;
  return { keep, alpha, fillAlpha(d) {} };
}

/* islands = connected components of content */
function findIslands(cv, keep) {
  const w = cv.width, h = cv.height;
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let i = 0; i < keep.length; i++) {
    if (!keep[i] || seen[i]) continue;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    const stack = [i]; seen[i] = 1;
    while (stack.length) {
      const j = stack.pop();
      area++;
      const cx = j % w, cy = (j / w) | 0;
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const k = ny * w + nx;
        if (keep[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
      }
    }
    if (area < 8 || (maxX - minX) < 3 || (maxY - minY) < 3) continue;
    out.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
  }
  out.sort((a, b) => b.area - a.area);
  return out;
}
/* per-island 16x16 grayscale fingerprint, computed on the INTERIOR (inset 3px,
   so per-cell halo/bbox jitter doesn't desync the comparison). Duplicate test
   uses mean AND max pixel diff: identical copies match everywhere (noise-level
   max), while distinct-but-subtle poses always differ sharply on some edge
   (high max even when the mean is small). */
function islandPix(cv, isl) {
  const x = Math.min(isl.x + 3, cv.width - 8), y = Math.min(isl.y + 3, cv.height - 8);
  const w = Math.max(8, Math.min(isl.w - 6, cv.width - x)), h = Math.max(8, Math.min(isl.h - 6, cv.height - y));
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const xc = c.getContext('2d');
  xc.imageSmoothingEnabled = true;
  xc.drawImage(cv, x, y, w, h, 0, 0, 16, 16);
  const d = xc.getImageData(0, 0, 16, 16).data;
  const out = new Float32Array(256);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    out[p] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * (d[i + 3] / 255);
  }
  return out;
}
/* ---- duplicate/same-pose detection ----
   How do "identical copies" differ from "real poses"? By the SPATIAL
   structure of their pixel differences:
   - real poses: differences sit in a few structured regions (head tilt,
     limb shift)  -> 3..11 diff clusters
   - exact copies / re-renders: differences are spread uniformly as
     surface noise or are zero -> >=12 or <=2 clusters
   So: dup iff clusters(outside 3..11). */
function diffClusters(a, b, thr = 28) {
  const m = new Uint8Array(256);
  for (let i = 0; i < 256; i++) m[i] = Math.abs(a[i] - b[i]) > thr ? 1 : 0;
  const seen = new Uint8Array(256);
  let cl = 0;
  const stack = [];
  for (let i = 0; i < 256; i++) {
    if (!m[i] || seen[i]) continue;
    cl++; seen[i] = 1; stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      const x = j % 16, y = (j / 16) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx > 15 || ny < 0 || ny > 15) continue;
        const k = ny * 16 + nx;
        if (m[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
      }
    }
  }
  return cl;
}
function tagDuplicates(islands) {
  for (let i = 0; i < islands.length; i++) {
    let dup = -1;
    for (let j = 0; j < i; j++) {
      const c = diffClusters(islands[i].pix, islands[j].pix);
      if (c <= 2 || c >= 12) { dup = j; break; }
    }
    islands[i].dup = dup;
  }
  return islands.filter((a) => a.dup < 0).length;
}

/* ============================================================
   Frame-strip auto-detect: when several islands of similar size
   sit on a common baseline (a row of poses with captions below),
   treat them as REAL animation frames (left → right).
   Requires at least 2 distinct poses (otherwise it's just copies
   of one pose and synthetic motion applies instead).
   ============================================================ */
function findFrameStrip(islands) {
  if (islands.length < 3) return null;
  const maxH = Math.max(...islands.map((i) => i.h));
  const row = islands.filter((i) => i.h >= maxH * 0.55);
  if (row.length < 3) return null;
  const b0 = row[0].y + row[0].h;
  const tol = Math.max(10, S.orig.h * 0.03);
  const near = row.filter((i) => Math.abs(i.y + i.h - b0) <= tol);
  if (near.length < 3) return null;
  const uniq = near.filter((i) => i.dup < 0).length;
  if (uniq < 2) return null; // all identical copies -> no real frames
  near.sort((a, b) => a.x - b.x);
  return near.map((i) => S.islands.indexOf(i));
}
/* pick a flood tolerance that actually finds figures: try 26 → 13 → 8 and
   keep the first whose largest island looks like a real sprite (>= 4% of the
   image). Prevents dark content that matches the bg shade from being eaten. */
function autoTolerance() {
  if (S.nativeAlpha || !S.bgOn) return S.tol;
  const total = S.orig.w * S.orig.h;
  for (const t of [26, 13, 8]) {
    const keep = contentMask(S.orig.cv, t);
    const isl = findIslands(S.orig.cv, keep.keep);
    if (!isl.length) continue;
    if (isl[0].area >= total * 0.04 && isl.length <= 120) return t;
  }
  return 26;
}
/* crop one island (bg removed, tiny pad) to its own canvas */
function islandCrop(idx) {
  const isl = S.islands[idx];
  const pad = 4;
  const x = Math.max(0, isl.x - pad), y = Math.max(0, isl.y - pad);
  const w = Math.min(S.orig.w - x, isl.w + pad * 2), h = Math.min(S.orig.h - y, isl.h + pad * 2);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(S.orig.cv, x, y, w, h, 0, 0, w, h);
  const keep = contentMask(cv, S.tol);
  const id = cv.getContext('2d').getImageData(0, 0, w, h);
  keep.fillAlpha(id.data);
  cv.getContext('2d').putImageData(id, 0, 0);
  return { cv, w, h };
}
function buildFrames() {
  if (S.frameSource === 'islands') S.frameCrops = S.frameSel.map(islandCrop);
  let mw = 0, mh = 0;
  for (const f of S.frameCrops) { if (f.w > mw) mw = f.w; if (f.h > mh) mh = f.h; }
  S.frameBox = { w: mw, h: mh };
  if (S.durations.length !== S.frameCrops.length) resetDurations();
}

/* ---- manual slicing: equal grid cells or fixed cell size ---- */
function bboxOfMask(keep, w, h) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < keep.length; i++) {
    if (!keep[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
/* one grid cell -> frame crop (largest figure, or everything) */
function cellCrop(cell) {
  const cw = cell.w, chh = cell.h;
  const tmp = document.createElement('canvas');
  tmp.width = cw; tmp.height = chh;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(S.orig.cv, cell.x, cell.y, cw, chh, 0, 0, cw, chh);
  const keep = contentMask(tmp, S.tol);
  const id = tctx.getImageData(0, 0, cw, chh);
  keep.fillAlpha(id.data);
  tctx.putImageData(id, 0, 0);
  let box = null;
  if (S.grid.keepLargest) {
    const isl = findIslands(tmp, keep.keep);
    if (isl.length) box = { x: isl[0].x, y: isl[0].y, w: isl[0].w, h: isl[0].h };
  }
  if (!box) box = bboxOfMask(keep.keep, cw, chh);
  if (!box) return { cv: tmp, w: cw, h: chh };
  const pad = 4;
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const w = Math.min(cw - x, box.w + pad * 2), h = Math.min(chh - y, box.h + pad * 2);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(tmp, x, y, w, h, 0, 0, w, h);
  return { cv, w, h };
}
function sliceGrid() {
  if (!S.orig) return;
  const g = S.grid;
  let cols, rows, cw, ch;
  if (g.mode === 'cell') {
    cw = Math.max(8, Math.round(g.cw)); ch = Math.max(8, Math.round(g.ch));
    cols = Math.max(1, Math.floor((S.orig.w - g.ox) / cw));
    rows = Math.max(1, Math.floor((S.orig.h - g.oy) / ch));
  } else {
    cols = Math.max(1, Math.min(24, Math.round(g.cols)));
    rows = Math.max(1, Math.min(24, Math.round(g.rows)));
    cw = Math.floor((S.orig.w - g.ox) / cols);
    ch = Math.floor((S.orig.h - g.oy) / rows);
  }
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = g.ox + c * cw, y = g.oy + r * ch;
    const w = Math.min(cw, S.orig.w - x), h = Math.min(ch, S.orig.h - y);
    if (w >= 8 && h >= 8) cells.push({ x, y, w, h });
  }
  if (!cells.length) { toast('⚠ Grid produced no cells — check size/offsets'); return; }
  S.frameSource = 'grid';
  S.mode = 'frames';
  S.frameSel = null;
  S.frameCrops = cells.map(cellCrop);
  let mw = 0, mh = 0;
  for (const f of S.frameCrops) { if (f.w > mw) mw = f.w; if (f.h > mh) mh = f.h; }
  S.frameBox = { w: mw, h: mh };
  if (S.durations.length !== S.frameCrops.length) resetDurations();
  S.preset = 'none'; setPreset('none');
  computeLayout(); renderIslands(); refreshAll({ thumbs: true });
  toast(`Sliced ${cells.length} frames (${cols}×${rows})`);
}

/* ============================================================
   Processing pipeline: mask -> islands -> chosen sprite -> layout
   ============================================================ */
function buildSprite() {
  const orig = S.orig, isl = S.islands[S.sel];
  const pad = S.trim ? 4 : 0;
  const x = Math.max(0, isl.x - pad), y = Math.max(0, isl.y - pad);
  const w = Math.min(orig.w - x, isl.w + pad * 2), h = Math.min(orig.h - y, isl.h + pad * 2);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  // composite the island pixels with their (bg-removed) alpha
  ctx.drawImage(orig.cv, x, y, w, h, 0, 0, w, h);
  // re-apply removal on the copy (cheap, keeps alpha correct after crop)
  const keep = contentMask(cv, S.tol);      // uses nativeAlpha/bgOn of S
  const id = cv.getContext('2d').getImageData(0, 0, w, h);
  keep.fillAlpha(id.data);
  cv.getContext('2d').putImageData(id, 0, 0);
  S.spr = { cv, w, h };
  // hasAlpha: any visible pixel below full opacity? (only matters for transparent GIF)
  const d = id.data; let any = false, anySemi = false;
  for (let i = 3; i < d.length; i += 4) { if (d[i] < 250) { any = true; if (d[i] > 0) anySemi = true; } }
  S.hasAlpha = any && !anySemi; // fully transparent corners => alpha, no fringe
  S.hasAlpha = any;
}
function computeLayout() {
  if (!S.spr && S.mode !== 'frames') { S.layout = null; return; }
  const { w, h } = S.spr || { w: S.frameBox.w, h: S.frameBox.h };
  if (S.mode === 'frames') {
    const M = 6;
    S.layout = { W: w + M * 2, H: h + M * 2, ax: w / 2 + M, ay: h / 2 + M, pad: M };
    return;
  }
  const preset = PRESETS[S.preset];
  const p = resolveParams(S.params[S.preset], S.preset, w, h);
  const anchorBase = preset.anchor === 'base';
  // scan a dense grid of the continuous motion; measures how far the sprite
  // extends BEYOND its static rect (0,0,w,h) at any point in the cycle
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  const ax = w / 2, ay = anchorBase ? h : h / 2;
  const K = 96;
  for (let k = 0; k <= K; k++) {
    const u = k / K;
    const t = preset.fn(u, p, w, h);
    const co = Math.cos(t.rot), si = Math.sin(t.rot);
    for (const [lx, ly] of [[-ax, -ay], [w - ax, -ay], [-ax, h - ay], [w - ax, h - ay]]) {
      const rx = lx * co - ly * si, ry = lx * si + ly * co;
      const px = rx * t.sx + t.x + ax, py = ry * t.sy + t.y + ay;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
  }
  const m = Math.ceil(Math.max(Math.max(-minX, maxX - w), Math.max(-minY, maxY - h))) + 6;
  const M = Math.max(16, m);
  S.layout = { W: w + M * 2, H: h + M * 2, ax: ax + M, ay: ay + M, pad: M };
}

/* ============================================================
   Rendering
   ============================================================ */
function drawAt(ctx, u, ox = 0, oy = 0, frameIdx = null) {
  const { layout } = S;
  if (S.mode === 'frames') {
    const n = effN();
    if (!n) return;
    const k = frameIdx === null
      ? Math.min(n - 1, Math.floor(u * n)) % n
      : Math.max(0, Math.min(n - 1, Math.round(frameIdx)));
    const f = S.frameCrops[k];
    // bottom-align frames so feet stay on the same baseline
    ctx.drawImage(f.cv, layout.ax + ox - f.w / 2, layout.pad + S.frameBox.h - f.h);
    return;
  }
  const { spr } = S;
  const preset = PRESETS[S.preset];
  const p = resolveParams(S.params[S.preset], S.preset, spr.w, spr.h);
  const t = preset.fn(u, p, spr.w, spr.h);
  ctx.save();
  ctx.translate(layout.ax + ox + t.x, layout.ay + oy + t.y);
  ctx.rotate(t.rot);
  ctx.scale(t.sx, t.sy);
  if (preset.anchor === 'base') ctx.drawImage(spr.cv, -spr.w / 2, -spr.h);
  else ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2);
  ctx.restore();
}
function makeFrameCanvas(backdrop) {
  const { W, H } = S.layout;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (backdrop === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
  else if (backdrop === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  return { cv, ctx, W, H };
}

/* preview loop */
const pvCanvas = $('#pv');
const pvCtx = pvCanvas.getContext('2d');
let rafT0 = 0;
function frameTick(now) {
  requestAnimationFrame(frameTick);
  const dt = (now - (rafT0 || now)) / 1000;
  rafT0 = now;
  if (S.playing) {
    if (S.mode === 'frames') {
      const T = Math.max(1, totalMs());
      S.tMs = (S.tMs + dt * 1000 * S.tempo) % T;
      S.u = frameAtMs(S.tMs) / Math.max(1, effN());
    } else {
      S.u = (S.u + dt * S.tempo * S.fps / Math.max(1, effN())) % 1;
    }
  }
  renderPreview();
}
function renderPreview() {
  const { layout } = S;
  if (!layout) return;
  const N = effN();
  const idx = S.mode === 'frames' ? frameAtMs(S.tMs) : Math.floor(S.u * N + 1e-6) % Math.max(1, N);
  const u = (S.mode === 'frames' || !S.smoothMode) ? (idx + 0.5) / N : S.u;
  if (pvCanvas.width !== layout.W) { pvCanvas.width = layout.W; pvCanvas.height = layout.H; }
  pvCtx.clearRect(0, 0, layout.W, layout.H);
  drawAt(pvCtx, u, 0, 0, S.mode === 'frames' ? idx : null);
  const dur = (S.useDurations && S.durations[idx]) ? S.durations[idx] : Math.round(1000 / S.fps);
  const src = S.mode === 'frames' ? (S.frameSource === 'grid' ? 'manual grid' : 'detected poses') : `synthetic · ${S.fps} fps`;
  $('#pvInfo').textContent = `Frame ${idx + 1}/${N} · ${dur} ms · ${src}`;
  pvCanvas.setAttribute('aria-label', `Animation preview, frame ${idx + 1} of ${N}, ${dur} milliseconds`);
  highlightTimeline(idx);
}
function applyStage() {
  const stage = $('#stage');
  stage.classList.remove('checker', 'white', 'black');
  stage.classList.add(S.backdrop);
  $('#pv').classList.toggle('pix', S.pixel);
  const L = S.layout;
  if (!L) { $('#pv').style.width = ''; $('#pv').style.height = ''; return; }
  const availW = Math.max(60, stage.clientWidth - 18);
  const availH = Math.max(60, stage.clientHeight - 18);
  const fit = Math.min(availW / L.W, availH / L.H, 4);
  const scale = S.zoomFit ? fit : Math.min(S.zoom / 100, availW / L.W);
  $('#pv').style.width = Math.round(L.W * scale) + 'px';
  $('#pv').style.height = Math.round(L.H * scale) + 'px';
  // hug the sprite's aspect so wide screens don't show a sea of empty checkerboard
  stage.style.maxWidth = S.loaded ? Math.max(240, Math.round(stage.clientHeight * (L.W / L.H))) + 'px' : '';
  $('#valZoom').textContent = S.zoomFit ? Math.round(scale * 100) + '% fit' : Math.round(scale * 100) + '%';
}
new ResizeObserver(() => { applyStage(); renderTimeline(); }).observe($('#stage'));

/* ============================================================
   Exports
   ============================================================ */
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

/* --- GIF --- */
async function exportGIF() {
  const G = window.Gifenc;
  const { W, H } = S.layout;
  const solid = S.backdrop === 'white' ? 'white' : S.backdrop === 'black' ? 'black' : null;
  const transparent = S.hasAlpha && !solid;
  const gif = G.GIFEncoder();
  const n = effN();
  const delayFor = (k) => {
    const d = (S.useDurations && S.durations.length === n) ? S.durations[k] : 1000 / S.fps;
    return Math.max(20, Math.round(d));
  };
  for (let k = 0; k < n; k++) {
    const f = makeFrameCanvas(solid);
    drawAt(f.ctx, k / n, 0, 0, S.mode === 'frames' ? k : null);
    const id = f.ctx.getImageData(0, 0, W, H).data;
    let palette, index;
    if (transparent) {
      const q = G.quantize(id, 255, { format: 'rgba4444', oneBitAlpha: true });
      palette = q; index = G.applyPalette(id, q, 'rgba4444');
    } else {
      const q = G.quantize(id, 256);
      palette = q; index = G.applyPalette(id, q);
    }
    let tIdx = null;
    if (transparent) {
      tIdx = palette.findIndex((c) => c[3] === 0);
      if (tIdx < 0) {
        if (palette.length >= 256) palette.pop();
        palette.push([0, 0, 0, 0]); tIdx = palette.length - 1;
      }
      for (let i = 0; i < index.length; i++) if (id[i * 4 + 3] < 128) index[i] = tIdx;
    }
    gif.writeFrame(index, W, H, { palette, delay: delayFor(k), transparent: !!tIdx, transparentIndex: tIdx, dispose: 2 });
    await new Promise((r) => setTimeout(r, 0)); // let UI breathe
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

/* --- WebM / MP4 video --- */
async function exportVideo() {
  const { W, H } = S.layout;
  const solid = S.backdrop === 'black' ? 'black' : 'white';
  const cv = makeFrameCanvas(solid).cv;
  const stream = cv.captureStream && cv.captureStream(S.fps);
  if (!stream) throw new Error('canvas capture not supported in this browser');
  const mimes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  let mime = null;
  for (const m of mimes) { if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) { mime = m; break; } }
  if (!mime) throw new Error('no recordable video codec found');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise((res) => { rec.onstop = res; });
  rec.start();
  const T = Math.max(1, totalMs()); // loop length, ms (per-frame durations honoured)
  const t0 = performance.now();
  await new Promise((res) => {
    (function render() {
      const el = (performance.now() - t0) * S.tempo; // ms of animation elapsed
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      const k = frameAtMs(el % T);
      drawAt(ctx, (el % T) / T, 0, 0, S.mode === 'frames' ? k : null);
      if (el < T * 2.05) requestAnimationFrame(render); else { rec.stop(); res(); }
    })();
  });
  await done;
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  return new Blob(chunks, { type: mime.split(';')[0] });
}

/* --- sprite sheet + frames.json --- */
function exportSheet() {
  const { W, H } = S.layout;
  const N = effN();
  const cols = clamp(S.cols, 1, N);
  const rows = Math.ceil(N / cols);
  const cv = document.createElement('canvas');
  cv.width = W * cols; cv.height = H * rows;
  const ctx = cv.getContext('2d');
  for (let k = 0; k < N; k++) {
    ctx.save();
    ctx.translate((k % cols) * W, Math.floor(k / cols) * H);
    drawAt(ctx, k / N, 0, 0, S.mode === 'frames' ? k : null);
    ctx.restore();
  }
  const meta = {
    app: 'sprite-animator', preset: S.preset, params: S.params[S.preset],
    mode: S.mode, frameSource: S.frameSource,
    frameWidth: W, frameHeight: H, frames: N, fps: S.fps,
    timing: (S.useDurations && S.durations.length === N) ? 'per-frame' : 'uniform',
    durations: (S.useDurations && S.durations.length === N) ? S.durations.slice() : null,
    loopMs: Math.round(totalMs()),
    cols, rows, loopSeconds: +(totalMs() / 1000).toFixed(3),
  };
  return {
    sheet: new Promise((res) => cv.toBlob((b) => res(b), 'image/png')),
    json: new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' }),
    meta,
  };
}

/* ============================================================
   Loading
   ============================================================ */
async function loadBlob(blob, name) {
  if (S.busy) return;
  S.busy = true; toast('Loading image…');
  try {
    const im = await imgFromBlob(blob);
    const cv = canvasOf(im);
    S.orig = { cv, w: cv.width, h: cv.height };
    S.name = (name || 'sprite').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
    // native alpha?
    const ctx = cv.getContext('2d');
    const probe = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let a = 0, anyA = false;
    for (let i = 3; i < probe.length; i += 8) if (probe[i] < 128) { anyA = true; break; }
    S.nativeAlpha = anyA;
    $('#chkBg').checked = !anyA;
    updateTolVisibility();
    S._autoTol = true;
    processCurrent();
    if (S.grid.mode !== 'auto') sliceGrid();   // honour an active manual grid on new images
    S.u = 0; S.tMs = 0; S.selFrame = 0; S.playing = true; rafT0 = 0;
    $('#btnPlay').textContent = '⏸';
    setLoaded(true);
    refreshAll({ thumbs: true });
    toast(`Loaded ${cv.width}×${cv.height}${name ? ' · ' + name : ''}`);
  } catch (e) {
    toast('⚠ ' + e.message);
  } finally { S.busy = false; }
}
function processCurrent() {
  if (!S.orig) return;
  if (S._autoTol) {
    S.tol = autoTolerance();
    $('#rangeTol').value = S.tol; $('#valTol').textContent = S.tol;
    S._autoTol = false;
  }
  const keep = contentMask(S.orig.cv, S.tol);
  // apply alpha to a copy used for island cropping/hashes
  const wk = document.createElement('canvas');
  wk.width = S.orig.w; wk.height = S.orig.h;
  const wctx = wk.getContext('2d');
  wctx.drawImage(S.orig.cv, 0, 0);
  const id = wctx.getImageData(0, 0, wk.width, wk.height);
  keep.fillAlpha(id.data);
  wctx.putImageData(id, 0, 0);
  const islands = findIslands(wk, keep.keep);
  if (!islands.length) { toast('⚠ No sprite found in image'); return; }
  for (const isl of islands) isl.pix = islandPix(wk, isl);
  const uniq = tagDuplicates(islands);
  S.islands = islands; S.sel = 0;
  // frames mode: auto-detect a strip of real poses (needs >=2 distinct)
  const strip = findFrameStrip(islands);
  if (strip && strip.length >= 2) {
    S.mode = 'frames'; S.frameSource = 'islands'; S.frameSel = strip; buildFrames();
    S.preset = 'none'; setPreset('none');
  } else {
    S.mode = 'single'; S.frameSel = null; S.frameCrops = [];
  }
  buildSprite();
  computeLayout();
  renderIslands(uniq);
  setLoaded(true);
  S.selFrame = 0;
  refreshAll({ thumbs: true });
}
function renderIslands(_u) {
  const uniq = _u !== undefined ? _u : S.islands.filter((x) => x.dup < 0).length;
  const row = $('#islandsRow');
  row.innerHTML = '';
  if (S.mode === 'frames' && S.frameSource === 'grid') {
    // manual grid: islands aren't the frames, show the sliced cells as chips
    $('#islandsWrap').style.display = 'block';
    $('#dupNote').classList.remove('show');
    S.frameCrops.forEach((f, i) => {
      const b = document.createElement('button');
      b.className = 'isl sel';
      b.title = `Cell ${i + 1}: ${f.w}×${f.h}`;
      const img = document.createElement('img');
      img.src = f.cv.toDataURL();
      const lab = document.createElement('small');
      lab.textContent = `#${i + 1} · ${f.w}×${f.h}`;
      b.append(img, lab);
      row.appendChild(b);
    });
  } else {
  const showRow = S.islands.length > 1 && (S.mode === 'frames' || S.islands.length > 2);
  $('#islandsWrap').style.display = showRow ? 'block' : 'none';
  const manyCopies = S.islands.length >= 4 && uniq <= 3 && uniq < S.islands.length;
  $('#dupNote').classList.toggle('show', manyCopies);
  if (manyCopies) {
    $('#dupNote').textContent =
      `${S.islands.length} figures detected but only ${uniq} look distinct — most are copies of the same pose ` +
      `(typical of GPT Images "animation frames"). The animator synthesizes real motion from one copy; ` +
      `use the chips to rotate through figures.`;
  }
  S.islands.forEach((isl, i) => {
    const on = S.mode === 'frames' ? !!(S.frameSel && S.frameSel.includes(i)) : i === S.sel;
    const b = document.createElement('button');
    b.className = 'isl' + (on ? ' sel' : '');
    b.title = `Island ${i + 1}: ${isl.w}×${isl.h}`;
    const img = document.createElement('img');
    img.src = cropDataURL(isl);
    const lab = document.createElement('small');
    const dupTag = isl.dup >= 0 ? `copy of #${isl.dup + 1}` : `frame #${i + 1}`;
    lab.textContent = dupTag + ` · ${isl.w}×${isl.h}`;
    b.append(img, lab);
    b.onclick = () => {
      if (S.mode === 'frames') {
        const idx = S.frameSel.indexOf(i);
        if (idx >= 0) {
          if (S.frameSel.length <= 2) { toast('Need ≥ 2 frames — deselect another first'); return; }
          S.frameSel.splice(idx, 1);
        } else S.frameSel.push(i);
        S.frameSel.sort((a, c) => S.islands[a].x - S.islands[c].x);
        S.frameSource = 'islands';
        buildFrames(); computeLayout(); renderIslands(uniq); refreshAll({ thumbs: true });
      } else {
        S.sel = i; buildSprite(); computeLayout(); renderIslands(uniq); syncExportUI(); applyStage();
      }
    };
    row.appendChild(b);
  });
  }  // end island-chips branch
  const modeTxt = S.mode === 'frames'
    ? (S.frameSource === 'grid'
        ? `Frame mode (manual grid): ${S.frameCrops.length} cells sliced from the image — edit Columns/Rows or Cell size to re-slice, and set durations below.`
        : `Frame mode: playing ${S.frameCrops.length} detected poses in order (click chips to exclude/include — manual set).`)
    : `Single sprite mode — synthetic motion. Click a chip to switch which sprite to animate.`;
  $('#islandsRow').insertAdjacentHTML('beforeend',
    `<div style="width:100%;font-size:12px;color:var(--mut);padding-top:2px">${modeTxt}</div>`);
  $('#frameModeRow').style.display = S.islands.length >= 2 ? 'flex' : 'none';
  $('#btnFramesOn').style.display = S.mode === 'single' ? '' : 'none';
  $('#btnFramesOff').style.display = S.mode === 'frames' ? '' : 'none';
  $('#srcInfo').textContent =
    `Source ${S.orig.w}×${S.orig.h}${S.nativeAlpha ? ' · transparent PNG' : ''}` +
    (S.mode === 'frames'
      ? ` → ${S.frameCrops.length} frames (${S.frameSource === 'grid' ? 'manual grid' : 'detected figures'}, ${S.frameBox.w}×${S.frameBox.h})`
      : ` → sprite ${S.spr.w}×${S.spr.h}, ${S.islands.length} island${S.islands.length > 1 ? 's' : ''} detected`);
}
function cropDataURL(isl) {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 48;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.drawImage(S.orig.cv, isl.x, isl.y, isl.w, isl.h, 0, 0, 48, 48);
  return c.toDataURL();
}

/* ============================================================
   UI wiring
   ============================================================ */
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function buildPresetButtons() {
  const box = $('#presets');
  PRESET_ORDER.forEach((key) => {
    const b = el('button', key === S.preset ? 'active' : '', PRESETS[key].label);
    b.onclick = () => setPreset(key);
    box.appendChild(b);
  });
}
function setPreset(key) {
  S.preset = key;
  $$('#presets button').forEach((b, i) => b.classList.toggle('active', PRESET_ORDER[i] === key));
  if (!(S.preset in S.params)) S.params[S.preset] = defaultParams(key);
  buildParams();
  if (S.spr) { computeLayout(); applyStage(); renderPreview(); }
}
function buildParams() {
  const box = $('#paramsBox');
  box.innerHTML = '';
  const preset = S.preset;
  for (const key in PRESETS[preset].params) {
    const d = PRESETS[preset].params[key];
    const v = S.params[preset][key];
    const wrap = el('div', 'ctl');
    const lab = el('span', '', d.label);
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = d.min; inp.max = d.max; inp.step = d.step || 1; inp.value = v;
 inp.setAttribute('aria-label', `${d.label}${d.unit ? ' in ' + (d.unit.includes('°') ? 'degrees' : 'percent') : ''}`);
    const out = el('output', '', v + (d.unit || ''));
    inp.oninput = () => {
      S.params[preset][key] = +inp.value;
      out.textContent = inp.value + (d.unit || '');
      if (S.spr) { computeLayout(); applyStage(); if (!S.playing) renderPreview(); }
    };
    wrap.append(lab, inp, out);
    box.appendChild(wrap);
  }
}
/* ---------- timeline: proportional blocks, tap to select, drag to retime ---------- */
function frameThumb(k) {
  const L = S.layout;
  if (!L) return null;
  const c = document.createElement('canvas');
  const scale = Math.min(2, 72 / Math.max(1, L.H));
  c.width = Math.max(8, Math.round(L.W * scale));
  c.height = Math.max(8, Math.round(L.H * scale));
  const x = c.getContext('2d');
  if (S.mode === 'frames') {
    const f = S.frameCrops[k];
    if (!f) return null;
    const s = Math.min(c.width / f.w, c.height / f.h);
    x.drawImage(f.cv, (c.width - f.w * s) / 2, c.height - f.h * s, f.w * s, f.h * s);
  } else {
    x.save(); x.scale(scale, scale); drawAt(x, k / Math.max(1, effN())); x.restore();
  }
  return c.toDataURL();
}
function buildThumbs() { S.thumbs = Array.from({ length: effN() }, (_, k) => frameThumb(k)); }
function timelineDurs() {
  const N = effN();
  return (S.useDurations && S.durations.length === N) ? S.durations : Array(N).fill(Math.round(1000 / S.fps));
}
function renderTimeline() {
  const tl = $('#timeline');
  const N = effN();
  if (!S.loaded || !S.layout || !N) {
    tl.className = 'timeline empty';
    tl.textContent = S.loaded ? 'No frames in this image' : 'Load a sprite to see its timeline';
    return;
  }
  const durs = timelineDurs();
  const T = Math.max(1, durs.reduce((a, b) => a + b, 0));
  const gap = 3, pad = 10;
  const inner = Math.max(60, tl.clientWidth - pad - (N - 1) * gap);
  const editable = S.mode === 'frames' && S.useDurations;
  tl.className = 'timeline';
  tl.innerHTML = '';
  for (let k = 0; k < N; k++) {
    const w = Math.max(42, Math.round(inner * (durs[k] / T)));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tl-block' + (k === S.selFrame ? ' sel' : '');
    b.style.width = w + 'px';
    b.style.flexBasis = w + 'px';
    if (S.thumbs[k]) b.style.backgroundImage = `url(${S.thumbs[k]})`;
    b.dataset.k = k;
    b.setAttribute('aria-label', `Frame ${k + 1}, ${Math.round(durs[k])} milliseconds`);
    const num = el('span', 'num', String(k + 1));
    const ms = el('span', 'ms', Math.round(durs[k]) + ' ms');
    b.append(num, ms);
    if (editable) {
      const h = el('span', 'tl-handle');
      h.title = 'Drag to change this frame’s duration';
      b.appendChild(h);
    }
    b.addEventListener('click', (e) => {
      if (e.target.classList.contains('tl-handle')) return;
      selectFrame(k);
    });
    tl.appendChild(b);
  }
}
function syncTimelineSel() {
  $$('#timeline .tl-block').forEach((b) => b.classList.toggle('sel', +b.dataset.k === S.selFrame));
  const cur = $(`#timeline .tl-block[data-k="${S.selFrame}"]`);
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function highlightTimeline(idx) {
  if (idx === S._lastHi) return;
  S._lastHi = idx;
  syncTimelineSel();
}
function selectFrame(k) {
  const N = effN();
  if (!N) return;
  S.selFrame = clamp(k, 0, N - 1);
  S.tMs = frameStartMs(S.selFrame);
  if (S.mode !== 'frames') S.u = S.selFrame / N;
  S.playing = false;
  $('#btnPlay').textContent = '▶';
  buildFrameEditor();
  syncTimelineSel();
  renderPreview();
}
function buildFrameEditor() {
  const N = effN();
  const durs = timelineDurs();
  const editable = S.mode === 'frames' && S.useDurations;
  $('#selIdx').textContent = N ? String(S.selFrame + 1) : '–';
  $('#selTotal').textContent = String(N);
  const inp = $('#durSel');
  inp.value = Math.round(durs[S.selFrame] || 0);
  inp.disabled = !editable;
  ['#btnDurMinus', '#btnDurPlus', '#btnDurAll', '#btnDurEven', '#btnDurPaste'].forEach((s) => { $(s).disabled = !editable; });
  $('#tlHint').textContent = N
    ? `${N} frames · ${(totalMs() / 1000).toFixed(2)} s loop${editable ? ' · tap a frame, drag its right edge to retime' : ''}`
    : 'load a sprite to begin';
  $('#durBulk').disabled = !editable;
}
function setFrameDuration(k, ms) {
  const N = effN();
  if (S.mode !== 'frames') return;
  if (S.durations.length !== N) resetDurations();
  S.durations[clamp(k, 0, N - 1)] = clamp(Math.round(ms), 20, 10000);
  S.tMs = Math.min(S.tMs, Math.max(0, totalMs() - 1));
  buildFrameEditor();
  renderTimeline();
  syncExportUI();
}
function syncExportUI() {
  const N = effN();
  const T = totalMs();
  const perFrame = S.useDurations && S.durations.length === N && S.mode === 'frames';
  $('#valFps').textContent = S.fps;
  $('#valN').textContent = N;
  $('#rangeCols').max = Math.max(1, N);
  $('#rangeCols').value = Math.min(S.cols, N);
  $('#valCols').textContent = Math.min(S.cols, N);
  $('#frameSizeInfo').textContent = S.layout ? `${S.layout.W}×${S.layout.H}px` : '—';
  // synthetic sampling only matters for single-sprite mode; per-frame timing owns the timeline otherwise
  $('#nWrap').style.display = S.mode === 'frames' ? 'none' : 'flex';
  $('#uniformRow').style.display = (S.mode === 'frames' && perFrame) ? 'none' : 'flex';
  $('#loopInfo').textContent = S.loaded
    ? `Loop ${(T / 1000).toFixed(2)} s${perFrame ? ` · per-frame timing (${N} entries)` : ` · uniform ${Math.round(1000 / S.fps)} ms/frame`}`
    : '—';
  const gifBg = S.backdrop === 'checker'
    ? (S.hasAlpha ? 'transparent background (alpha preserved)' : 'no alpha to keep — composited as-is')
    : `composited on ${S.backdrop}`;
  $('#expMap').textContent = S.layout ? `GIF: ${gifBg} · WebM: ${S.backdrop === 'black' ? 'black' : 'white'} backdrop · Sheet: transparent PNG + JSON timings.` : '';
  $('#expNote').textContent = S.layout
    ? `${N} frames · ${Math.min(S.cols, N)}×${Math.ceil(N / Math.min(S.cols, N))} sheet · GIF delay ${perFrame ? 'per frame' : Math.round(1000 / S.fps) + ' ms'}.`
    : '';
}
function setLoaded(on) {
  S.loaded = !!on;
  $('#stageHint').classList.toggle('hide', S.loaded);
  $$('.gateable').forEach((sec) => sec.classList.toggle('off', !S.loaded));
  if (S.loaded) {
    $('#btnPlay').disabled = false;
  } else {
    $('#btnPlay').disabled = true;
    $('#pv').setAttribute('aria-label', 'Animation preview — no sprite loaded');
  }
}
/* one call to refresh everything that depends on frames/timing */
function refreshAll(opts = {}) {
  if (opts.thumbs) buildThumbs();
  S.selFrame = clamp(S.selFrame, 0, Math.max(0, effN() - 1));
  renderTimeline();
  buildFrameEditor();
  syncExportUI();
  applyStage();
}
function updateTolVisibility() {
  $('#tolWrap').style.display = S.bgOn && !S.nativeAlpha ? 'flex' : 'none';
}

/* events */
function bindUI() {
  buildPresetButtons();
  const dz = $('#dz'), fi = $('#fileInput');
  dz.onclick = () => fi.click();
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => {
    e.preventDefault(); dz.classList.remove('drag');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadBlob(f, f.name);
  };
  fi.onchange = () => { if (fi.files[0]) loadBlob(fi.files[0], fi.files[0].name); fi.value = ''; };
  $('#btnUpload').onclick = () => fi.click();
  $('#btnFramesOn').onclick = () => {
    if (S.islands.length < 2) return;
    const maxA = Math.max(...S.islands.map((i) => i.area));
    S.mode = 'frames';
    S.frameSel = S.islands.map((_, idx) => idx)
      .filter((idx) => S.islands[idx].area >= maxA * 0.35);
    if (S.frameSel.length < 2) S.frameSel = [0, 1];
    S.frameSel.sort((a, c) => S.islands[a].x - S.islands[c].x);
    S.preset = 'none'; setPreset('none');
    buildFrames(); computeLayout(); setLoaded(true); refreshAll({ thumbs: true });
  };
  $('#btnFramesOff').onclick = () => {
    S.mode = 'single'; S.frameSource = 'islands'; S.frameSel = null; S.frameCrops = [];
    buildSprite(); computeLayout(); renderIslands(); setLoaded(true); refreshAll({ thumbs: true });
  };
  /* timing: timeline + selected-frame editor */
  $('#chkPerFrame').onchange = () => {
    S.useDurations = $('#chkPerFrame').checked;
    if (!S.useDurations) resetDurations(Math.round(1000 / S.fps));
    buildFrameEditor(); renderTimeline(); syncExportUI(); renderPreview();
  };
  $('#durSel').oninput = () => setFrameDuration(S.selFrame, +$('#durSel').value || 20);
  $('#btnDurMinus').onclick = () => setFrameDuration(S.selFrame, (timelineDurs()[S.selFrame] || 0) - 100);
  $('#btnDurPlus').onclick = () => setFrameDuration(S.selFrame, (timelineDurs()[S.selFrame] || 0) + 100);
  $('#btnDurAll').onclick = () => {
    const d = +(($('#durSel').value) || 100);
    resetDurations(clamp(Math.round(d), 20, 10000));
    buildFrameEditor(); renderTimeline(); syncExportUI(); renderPreview();
  };
  $('#btnDurEven').onclick = () => {
    const N = effN(); if (!N) return;
    resetDurations(Math.max(20, Math.round(totalMs() / N)));
    buildFrameEditor(); renderTimeline(); syncExportUI(); renderPreview();
  };
  $('#btnDurPaste').onclick = () => {
    const parts = ($('#durBulk').value || '').split(/[\s,;]+/).filter(Boolean).map(Number).filter((v) => v > 0);
    if (!parts.length) { toast('Paste timecodes like 1.5, 1.5, 1, 0.3'); return; }
    const asMs = parts.every((v) => v <= 20) ? parts.map((v) => v * 1000) : parts;
    const N = effN();
    const durs = asMs.slice(0, N);
    while (durs.length < N) durs.push(durs[durs.length - 1] || Math.round(1000 / S.fps));
    S.durations = durs.map((v) => clamp(Math.round(v), 20, 10000));
    S.useDurations = true; $('#chkPerFrame').checked = true;
    buildFrameEditor(); renderTimeline(); syncExportUI(); renderPreview();
    toast(`Applied ${parts.length} timecodes · loop ${(totalMs() / 1000).toFixed(2)} s`);
  };
  /* timeline interactions: drag a block's right edge to retime, arrow keys to navigate */
  const tl = $('#timeline');
  tl.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest && e.target.closest('.tl-handle');
    if (!handle) return;
    const block = handle.closest('.tl-block');
    if (!block) return;
    e.preventDefault();
    const k = +block.dataset.k;
    const startX = e.clientX;
    const startMs = timelineDurs()[k];
    const N = effN();
    const inner = Math.max(60, tl.clientWidth - 10 - (N - 1) * 3);
    const T = Math.max(1, totalMs());
    const perPx = T / inner;
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    const move = (ev) => setFrameDuration(k, Math.max(20, Math.round(startMs + (ev.clientX - startX) * perPx)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  tl.addEventListener('keydown', (e) => {
    const N = effN();
    if (!N) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); selectFrame((S.selFrame + 1) % N); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); selectFrame((S.selFrame - 1 + N) % N); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFrameDuration(S.selFrame, (timelineDurs()[S.selFrame] || 0) + (e.key === 'ArrowUp' ? 50 : -50));
    }
  });
  const gridInputs = ['#gCols', '#gRows', '#gCw', '#gCh', '#gOx', '#gOy', '#gKeep'];
  function readGrid() {
    S.grid.cols = Math.max(1, Math.min(24, +$('#gCols').value || 1));
    S.grid.rows = Math.max(1, Math.min(24, +$('#gRows').value || 1));
    S.grid.cw = Math.max(8, +$('#gCw').value || 8);
    S.grid.ch = Math.max(8, +$('#gCh').value || 8);
    S.grid.ox = +$('#gOx').value || 0;
    S.grid.oy = +$('#gOy').value || 0;
    S.grid.keepLargest = $('#gKeep').checked;
  }
  $('#gridMode').onchange = () => {
    const m = $('#gridMode').value;
    S.grid.mode = m;
    const manual = m !== 'auto';
    $('#gridOpts').style.display = manual ? 'block' : 'none';
    $('#gridRows').style.display = m === 'grid' ? 'flex' : 'none';
    $('#gridCells').style.display = m === 'cell' ? 'flex' : 'none';
    if (!S.orig) return;
    readGrid();
    if (manual) sliceGrid(); else processCurrent();
  };
  gridInputs.forEach((sel) => {
    const el2 = $(sel);
    el2.onchange = () => { if (!S.orig || S.grid.mode === 'auto') return; readGrid(); sliceGrid(); };
  });
  $('#btnDemo').onclick = () => loadDemo();
  $('#btnDemo2').onclick = () => loadDemo();
  $('#btnPick2').onclick = () => fi.click();
  $('#stageHint').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    fi.click();
  });
  function loadDemo() {
    const b64 = DEMO_B64;
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    loadBlob(new Blob([u8], { type: 'image/png' }), 'demo-bloop.png');
  }
  window.addEventListener('paste', (e) => {
    const it = [...(e.clipboardData || {}).items || []].find((i) => i.type.startsWith('image/'));
    if (it) loadBlob(it.getAsFile(), 'pasted.png');
  });
  $('#chkBg').onchange = () => { S.bgOn = $('#chkBg').checked; updateTolVisibility(); processCurrent(); };
  $('#rangeTol').oninput = () => { S.tol = +$('#rangeTol').value; S._autoTol = false; $('#valTol').textContent = S.tol; };
  $('#rangeTol').onchange = () => { processCurrent(); };
  $('#chkTrim').onchange = () => { S.trim = $('#chkTrim').checked; processCurrent(); };
  $('#rangeTempo').oninput = () => { S.tempo = +$('#rangeTempo').value / 100; $('#valTempo').textContent = S.tempo.toFixed(2) + '×'; };
  $('#rangeFps').oninput = () => { S.fps = +$('#rangeFps').value; $('#valFps').textContent = S.fps; syncExportUI(); };
  $('#rangeN').oninput = () => { S.N = +$('#rangeN').value; $('#valN').textContent = S.N; syncExportUI(); };
  $('#rangeCols').oninput = () => { S.cols = +$('#rangeCols').value; $('#valCols').textContent = S.cols; syncExportUI(); };
  $('#btnPlay').onclick = () => { S.playing = !S.playing; $('#btnPlay').textContent = S.playing ? '⏸' : '▶'; rafT0 = 0; };
  $('#btnPrev').onclick = () => step(-1);
  $('#btnNext').onclick = () => step(1);
  function step(d) {
    const N = effN();
    if (!N) return;
    const cur = S.mode === 'frames' ? S.selFrame : Math.floor(S.u * N);
    selectFrame(cur + d);
  }
  $$('#modeSeg button').forEach((b) => {
    b.onclick = () => {
      S.smoothMode = b.dataset.m === 'smooth';
      $$('#modeSeg button').forEach((x) => x.classList.toggle('active', x === b));
    };
  });
  $('#btnFit').onclick = () => { S.zoomFit = true; applyStage(); };
  $('#rangeZoom').oninput = () => {
    S.zoomFit = false;
    S.zoom = +$('#rangeZoom').value;
    applyStage();
  };
  $('#chkPixel').onchange = () => { S.pixel = $('#chkPixel').checked; applyStage(); };
  $('#backdrop').onchange = () => { S.backdrop = $('#backdrop').value; applyStage(); syncExportUI(); };
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      e.preventDefault(); $('#btnPlay').click();
    }
  });
  $('#btnGif').onclick = async () => {
    if (!S.layout || S.busy) return;
    S.busy = true; const b = $('#btnGif'); b.disabled = true; b.textContent = 'Encoding…'; toast('Encoding GIF…');
    try { const blob = await exportGIF(); download(blob, S.name + '-anim.gif'); toast('GIF saved'); }
    catch (e) { toast('⚠ ' + e.message); }
    finally { b.disabled = false; b.textContent = '⬇ Animated GIF'; S.busy = false; }
  };
  $('#btnWebm').onclick = async () => {
    if (!S.layout || S.busy) return;
    S.busy = true; const b = $('#btnWebm'); b.disabled = true; b.textContent = 'Recording…'; toast('Recording 2 loops…');
    try {
      const blob = await exportVideo();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      download(blob, S.name + '-anim.' + ext); toast('Video saved');
    } catch (e) { toast('⚠ Video: ' + e.message); }
    finally { b.disabled = false; b.textContent = '⬇ Video (WebM)'; S.busy = false; }
  };
  $('#btnSheet').onclick = async () => {
    if (!S.layout || S.busy) return;
    S.busy = true; const b = $('#btnSheet'); b.disabled = true; b.textContent = 'Building…';
    try {
      const { sheet, json, meta } = exportSheet();
      const s = await sheet;
      download(s, S.name + '-sheet.png');
      download(json, S.name + '-frames.json');
      toast(`Sheet ${meta.cols}×${meta.rows} of ${meta.frames} frames (${meta.frameWidth}×${meta.frameHeight})`);
    } catch (e) { toast('⚠ ' + e.message); }
    finally { b.disabled = false; b.textContent = '⬇ Sprite sheet + JSON'; S.busy = false; }
  };
}
function init() {
  bindUI();
  setPreset(S.preset);          // sets defaults + builds the param sliders
  // on phones/tablets keep the deep control sections collapsed so the page stays short
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
    ['#secMotion', '#secExport'].forEach((s) => $(s).removeAttribute('open'));
  }
  setLoaded(false);
  renderTimeline();
  buildFrameEditor();
  syncExportUI();
  requestAnimationFrame(frameTick);
}
init();

/* test hook */
window.__SA = {
  load: (blob, name) => loadBlob(blob, name),
  setPreset, state: () => ({ preset: S.preset, params: S.params[S.preset], fps: S.fps, N: S.N,
    mode: S.mode, frameSource: S.frameSource, frameSel: S.frameSel ? S.frameSel.length : 0,
    frames: S.frameCrops.length, durations: S.durations.slice(), loopMs: Math.round(totalMs()),
    gridMode: S.grid.mode, grid: { ...S.grid }, tol: S.tol,
    islands: S.islands.length, uniq: S.islands.filter(i => i.dup < 0).length, sel: S.sel,
    spr: S.spr ? { w: S.spr.w, h: S.spr.h } : null,
    layout: S.layout ? { W: S.layout.W, H: S.layout.H } : null,
    hasAlpha: S.hasAlpha, nativeAlpha: S.nativeAlpha, u: S.u }),
  gif: async () => { const b = await exportGIF(); const head = new Uint8Array(await b.slice(0, 6).arrayBuffer()); return { size: b.size, head: String.fromCharCode(...head) }; },
  sheet: () => { const r = exportSheet(); return { meta: r.meta }; },
};
