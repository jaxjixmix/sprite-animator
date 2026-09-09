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
  islands: [],               // [{x,y,w,h,hash,area,dup}]
  sel: 0,
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

/* ============================================================
   Motion presets.
   u = cycle phase in [0,1). Every waveform is a sum of sin/cos
   harmonics of the loop frequency => mathematically seamless loop.
   p.* are the user-adjustable params (values already resolved to
   pixels/degrees). Returns {x, y, rot, sx, sy}.
   ============================================================ */
const PRESETS = {
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
const PRESET_ORDER = ['idle', 'bounce', 'hop', 'walk', 'run', 'float', 'sway', 'pulse', 'shake'];

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
  const counts = new Map();
  for (let i = 0; i < d.length; i += 4) {
    // quantize a little so near-equal checker shades merge
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k]) => [((k >> 8) & 15) * 17, ((k >> 4) & 15) * 17, (k & 15) * 17]);
  return top;
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
/* per-island 16x16 grayscale fingerprint (mean abs diff compares robustly
   against JPEG noise; distinct poses differ by >> 8/255) */
function islandPix(cv, isl) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.drawImage(cv, isl.x, isl.y, isl.w, isl.h, 0, 0, 16, 16);
  const d = x.getImageData(0, 0, 16, 16).data;
  const out = new Float32Array(256);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    out[p] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * (d[i + 3] / 255);
  }
  return out;
}
const pixDiff = (a, b) => { let s = 0; for (let i = 0; i < 256; i++) s += Math.abs(a[i] - b[i]); return s / 256; };
function tagDuplicates(islands) {
  for (let i = 0; i < islands.length; i++) {
    let dup = -1;
    for (let j = 0; j < i; j++) {
      if (pixDiff(islands[i].pix, islands[j].pix) <= 8) { dup = j; break; }
    }
    islands[i].dup = dup;
  }
  return islands.filter((a) => a.dup < 0).length;
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
  if (!S.spr) { S.layout = null; return; }
  const { w, h } = S.spr, preset = PRESETS[S.preset];
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
function drawAt(ctx, u, ox = 0, oy = 0) {
  const { spr, layout } = S;
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
  const P = S.N / S.fps; // seconds per loop (also drives preview pacing)
  if (S.playing) {
    const dt = (now - (rafT0 || now)) / 1000;
    rafT0 = now;
    S.u = (S.u + dt * S.tempo / P) % 1;
  } else rafT0 = now;
  renderPreview();
}
function renderPreview() {
  const { layout } = S;
  if (!layout) return;
  const u = S.smoothMode ? S.u : (Math.floor(S.u * S.N + 1e-6) % S.N) / S.N;
  if (pvCanvas.width !== layout.W) { pvCanvas.width = layout.W; pvCanvas.height = layout.H; }
  pvCtx.clearRect(0, 0, layout.W, layout.H);
  drawAt(pvCtx, u);
  const k = Math.floor(S.u * S.N + 1e-6) % S.N;
  $('#pvInfo').textContent =
    `${S.preset} · frame ${k + 1}/${S.N} @ ${S.fps} fps → ${(1000 / S.fps).toFixed(0)} ms/frame` +
    (S.smoothMode ? '' : ' (frames)');
}
function applyStage() {
  const stage = $('#stage');
  stage.classList.remove('checker', 'white', 'black');
  stage.classList.add(S.backdrop);
  $('#pv').classList.toggle('pix', S.pixel);
  const { W } = S.layout || { W: 0 };
  const cw = stage.clientWidth - 20;
  const z = S.zoom / 100;
  let cssW = W ? Math.min(W * z, cw) : 0;
  if (!W) return;
  $('#pv').style.width = cssW + 'px';
  $('#pv').style.height = Math.round(cssW * (S.layout.H / W)) + 'px';
}
new ResizeObserver(applyStage).observe($('#stage'));

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
  const { G } = window;
  const { W, H } = S.layout;
  const solid = S.backdrop === 'white' ? 'white' : S.backdrop === 'black' ? 'black' : null;
  const transparent = S.hasAlpha && !solid;
  const gif = G.GIFEncoder();
  let delay = Math.max(20, Math.round(1000 / S.fps));
  const uVals = [...Array(S.N)].map((_, k) => k / S.N);
  let first = true;
  for (const u of uVals) {
    const f = makeFrameCanvas(solid);
    drawAt(f.ctx, u);
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
    gif.writeFrame(index, W, H, { palette, delay, transparent: !!tIdx, transparentIndex: tIdx, dispose: 2 });
    await new Promise((r) => setTimeout(r, 0)); // let UI breathe
    first = false;
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
  const P = S.N / S.fps;
  const t0 = performance.now();
  await new Promise((res) => {
    (function render() {
      const t = (performance.now() - t0) / 1000;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      const u = (t * S.tempo / P) % 1;
      drawAt(ctx, u);
      if (t < P * 2.05) requestAnimationFrame(render); else { rec.stop(); res(); }
    })();
  });
  await done;
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  return new Blob(chunks, { type: mime.split(';')[0] });
}

/* --- sprite sheet + frames.json --- */
function exportSheet() {
  const { W, H } = S.layout;
  const cols = clamp(S.cols, 1, S.N);
  const rows = Math.ceil(S.N / cols);
  const cv = document.createElement('canvas');
  cv.width = W * cols; cv.height = H * rows;
  const ctx = cv.getContext('2d');
  for (let k = 0; k < S.N; k++) {
    const u = k / S.N;
    ctx.save();
    ctx.translate((k % cols) * W, Math.floor(k / cols) * H);
    drawAt(ctx, u);
    ctx.restore();
  }
  const meta = {
    app: 'sprite-animator', preset: S.preset, params: S.params,
    frameWidth: W, frameHeight: H, frames: S.N, fps: S.fps,
    cols, rows, loopSeconds: +(S.N / S.fps).toFixed(3),
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
    processCurrent();
    S.u = 0; S.playing = true; rafT0 = 0;
    $('#scrub').value = 0;
    toast(`Loaded ${cv.width}×${cv.height}${name ? ' · ' + name : ''}`);
  } catch (e) {
    toast('⚠ ' + e.message);
  } finally { S.busy = false; }
}
function processCurrent() {
  if (!S.orig) return;
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
  buildSprite();
  computeLayout();
  renderIslands(uniq);
  syncExportUI();
  applyStage();
}
function renderIslands(uniq) {
  const row = $('#islandsRow');
  row.innerHTML = '';
  $('#islandsWrap').style.display = S.islands.length > 1 ? 'block' : 'none';
  $('#dupNote').classList.toggle('show', S.islands.length > 1 && uniq === 1);
  if (S.islands.length > 1 && uniq === 1) {
    $('#dupNote').textContent =
      `${S.islands.length} near-identical copies detected — all show the same pose ` +
      `(typical of GPT Images "animation frames"). The animator synthesizes real motion from one copy.`;
  }
  S.islands.forEach((isl, i) => {
    const b = document.createElement('button');
    b.className = 'isl' + (i === S.sel ? ' sel' : '');
    b.title = `Island ${i + 1}: ${isl.w}×${isl.h}`;
    const img = document.createElement('img');
    img.src = cropDataURL(isl);
    const lab = document.createElement('small');
    lab.textContent = isl.dup >= 0 ? `copy of #${isl.dup + 1}` : `#${i + 1} · ${isl.w}×${isl.h}`;
    b.append(img, lab);
    b.onclick = () => { S.sel = i; buildSprite(); computeLayout(); renderIslands(S.islands.filter((x) => x.dup < 0).length); syncExportUI(); applyStage(); };
    row.appendChild(b);
  });
  $('#srcInfo').textContent =
    `Source ${S.orig.w}×${S.orig.h}${S.nativeAlpha ? ' · transparent PNG' : ''}` +
    ` → sprite ${S.spr.w}×${S.spr.h}, ${S.islands.length} island${S.islands.length > 1 ? 's' : ''} detected`;
  $('#sizeInfo').textContent = `frame canvas ${S.layout.W}×${S.layout.H}px`;
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
function syncExportUI() {
  $('#valFps').textContent = S.fps; $('#valN').textContent = S.N;
  $('#valCols').textContent = Math.min(S.cols, S.N);
  $('#rangeCols').max = Math.max(1, S.N);
  $('#rangeCols').value = Math.min(S.cols, S.N);
  $('#scrub').max = S.N - 1;
  $('#frameSizeInfo').textContent = S.layout ? `${S.layout.W}×${S.layout.H}px` : '—';
  const P = S.N / S.fps;
  $('#expNote').textContent = S.layout
    ? `${S.N} frames × ${(1000 / S.fps).toFixed(0)} ms = ${P.toFixed(2)} s per loop · sheet ${Math.min(S.cols, S.N)}×${Math.ceil(S.N / Math.min(S.cols, S.N))}` +
      (S.hasAlpha ? ' · GIF keeps transparency' : '')
    : '';
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
  $('#btnDemo').onclick = async () => {
    const b64 = DEMO_B64;
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    loadBlob(new Blob([u8], { type: 'image/png' }), 'demo-bloop.png');
  };
  window.addEventListener('paste', (e) => {
    const it = [...(e.clipboardData || {}).items || []].find((i) => i.type.startsWith('image/'));
    if (it) loadBlob(it.getAsFile(), 'pasted.png');
  });
  $('#chkBg').onchange = () => { S.bgOn = $('#chkBg').checked; updateTolVisibility(); processCurrent(); };
  $('#rangeTol').oninput = () => { S.tol = +$('#rangeTol').value; $('#valTol').textContent = S.tol; };
  $('#rangeTol').onchange = () => { processCurrent(); };
  $('#chkTrim').onchange = () => { S.trim = $('#chkTrim').checked; processCurrent(); };
  $('#rangeTempo').oninput = () => { S.tempo = +$('#rangeTempo').value / 100; $('#valTempo').textContent = S.tempo.toFixed(2) + '×'; };
  $('#rangeFps').oninput = () => { S.fps = +$('#rangeFps').value; $('#valFps').textContent = S.fps; syncExportUI(); };
  $('#rangeN').oninput = () => { S.N = +$('#rangeN').value; $('#valN').textContent = S.N; syncExportUI(); };
  $('#rangeCols').oninput = () => { S.cols = +$('#rangeCols').value; $('#valCols').textContent = S.cols; syncExportUI(); };
  $('#btnPlay').onclick = () => { S.playing = !S.playing; $('#btnPlay').textContent = S.playing ? '⏸' : '▶'; rafT0 = 0; };
  $('#btnPrev').onclick = () => step(-1);
  $('#btnNext').onclick = () => step(1);
  $('#scrub').oninput = () => { S.u = +$('#scrub').value / S.N; if (!S.playing) renderPreview(); };
  function step(d) { S.u = (S.u + d / S.N + 1) % 1; $('#scrub').value = Math.floor(S.u * S.N) % S.N; renderPreview(); }
  $$('#modeSeg button').forEach((b) => {
    b.onclick = () => {
      S.smoothMode = b.dataset.m === 'smooth';
      $$('#modeSeg button').forEach((x) => x.classList.toggle('active', x === b));
    };
  });
  $('#rangeZoom').oninput = () => { S.zoom = +$('#rangeZoom').value; $('#valZoom').textContent = S.zoom + '%'; applyStage(); };
  $('#chkPixel').onchange = () => { S.pixel = $('#chkPixel').checked; applyStage(); };
  $('#backdrop').onchange = () => { S.backdrop = $('#backdrop').value; applyStage(); };
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
  $('#pvInfo').textContent = 'Drop a sprite or press “Try demo sprite”';
  requestAnimationFrame(frameTick);
}
init();

/* test hook */
window.__SA = {
  load: (blob, name) => loadBlob(blob, name),
  setPreset, state: () => ({ preset: S.preset, params: S.params[S.preset], fps: S.fps, N: S.N,
    islands: S.islands.length, uniq: S.islands.filter(i => i.dup < 0).length, sel: S.sel,
    spr: S.spr ? { w: S.spr.w, h: S.spr.h } : null,
    layout: S.layout ? { W: S.layout.W, H: S.layout.H } : null,
    hasAlpha: S.hasAlpha, nativeAlpha: S.nativeAlpha, u: S.u }),
  gif: async () => { const b = await exportGIF(); const head = new Uint8Array(await b.slice(0, 6).arrayBuffer()); return { size: b.size, head: String.fromCharCode(...head) }; },
  sheet: () => { const r = exportSheet(); return { meta: r.meta }; },
};
