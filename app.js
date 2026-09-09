/* ============================================================
   Sprite Animator — generate seamless looping animation from a
   single still sprite. 100% client-side. No network, no tracking.
   ============================================================ */
(function () {
var X={signature:"GIF",version:"89a",trailer:59,extensionIntroducer:33,applicationExtensionLabel:255,graphicControlExtensionLabel:249,imageSeparator:44,signatureSize:3,versionSize:3,globalColorTableFlagMask:128,colorResolutionMask:112,sortFlagMask:8,globalColorTableSizeMask:7,applicationIdentifierSize:8,applicationAuthCodeSize:3,disposalMethodMask:28,userInputFlagMask:2,transparentColorFlagMask:1,localColorTableFlagMask:128,interlaceFlagMask:64,idSortFlagMask:32,localColorTableSizeMask:7};function F(t=256){let e=0,s=new Uint8Array(t);return{get buffer(){return s.buffer},reset(){e=0},bytesView(){return s.subarray(0,e)},bytes(){return s.slice(0,e)},writeByte(r){n(e+1),s[e]=r,e++},writeBytes(r,o=0,i=r.length){n(e+i);for(let c=0;c<i;c++)s[e++]=r[c+o]},writeBytesView(r,o=0,i=r.byteLength){n(e+i),s.set(r.subarray(o,o+i),e),e+=i}};function n(r){var o=s.length;if(o>=r)return;var i=1024*1024;r=Math.max(r,o*(o<i?2:1.125)>>>0),o!=0&&(r=Math.max(r,256));let c=s;s=new Uint8Array(r),e>0&&s.set(c.subarray(0,e),0)}}var O=12,J=5003,lt=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function at(t,e,s,n,r=F(512),o=new Uint8Array(256),i=new Int32Array(J),c=new Int32Array(J)){let x=i.length,a=Math.max(2,n);o.fill(0),c.fill(0),i.fill(-1);let l=0,f=0,g=a+1,h=g,b=!1,w=h,_=(1<<w)-1,u=1<<g-1,k=u+1,B=u+2,p=0,A=s[0],z=0;for(let y=x;y<65536;y*=2)++z;z=8-z,r.writeByte(a),I(u);let d=s.length;for(let y=1;y<d;y++){t:{let m=s[y],v=(m<<O)+A,M=m<<z^A;if(i[M]===v){A=c[M];break t}let V=M===0?1:x-M;for(;i[M]>=0;)if(M-=V,M<0&&(M+=x),i[M]===v){A=c[M];break t}I(A),A=m,B<1<<O?(c[M]=B++,i[M]=v):(i.fill(-1),B=u+2,b=!0,I(u))}}return I(A),I(k),r.writeByte(0),r.bytesView();function I(y){for(l&=lt[f],f>0?l|=y<<f:l=y,f+=w;f>=8;)o[p++]=l&255,p>=254&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0),l>>=8,f-=8;if((B>_||b)&&(b?(w=h,_=(1<<w)-1,b=!1):(++w,_=w===O?1<<w:(1<<w)-1)),y==k){for(;f>0;)o[p++]=l&255,p>=254&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0),l>>=8,f-=8;p>0&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0)}}}var $=at;function D(t,e,s){return t<<8&63488|e<<2&992|s>>3}function G(t,e,s,n){return t>>4|e&240|(s&240)<<4|(n&240)<<8}function j(t,e,s){return t>>4<<8|e&240|s>>4}function R(t,e,s){return t<e?e:t>s?s:t}function T(t){return t*t}function tt(t,e,s){var n=0,r=1e100;let o=t[e],i=o.cnt,c=o.ac,x=o.rc,a=o.gc,l=o.bc;for(var f=o.fw;f!=0;f=t[f].fw){let h=t[f],b=h.cnt,w=i*b/(i+b);if(!(w>=r)){var g=0;s&&(g+=w*T(h.ac-c),g>=r)||(g+=w*T(h.rc-x),!(g>=r)&&(g+=w*T(h.gc-a),!(g>=r)&&(g+=w*T(h.bc-l),!(g>=r)&&(r=g,n=f))))}}o.err=r,o.nn=n}function Q(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function ut(t,e){let s=e==="rgb444"?4096:65536,n=new Array(s),r=t.length;if(e==="rgba4444")for(let o=0;o<r;++o){let i=t[o],c=i>>24&255,x=i>>16&255,a=i>>8&255,l=i&255,f=G(l,a,x,c),g=f in n?n[f]:n[f]=Q();g.rc+=l,g.gc+=a,g.bc+=x,g.ac+=c,g.cnt++}else if(e==="rgb444")for(let o=0;o<r;++o){let i=t[o],c=i>>16&255,x=i>>8&255,a=i&255,l=j(a,x,c),f=l in n?n[l]:n[l]=Q();f.rc+=a,f.gc+=x,f.bc+=c,f.cnt++}else for(let o=0;o<r;++o){let i=t[o],c=i>>16&255,x=i>>8&255,a=i&255,l=D(a,x,c),f=l in n?n[l]:n[l]=Q();f.rc+=a,f.gc+=x,f.bc+=c,f.cnt++}return n}function H(t,e,s={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:o=0,clearAlphaThreshold:i=0,oneBitAlpha:c=!1}=s;if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array)&&!(t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let x=new Uint32Array(t.buffer),a=s.useSqrt!==!1,l=n==="rgba4444",f=ut(x,n),g=f.length,h=g-1,b=new Uint32Array(g+1);for(var w=0,u=0;u<g;++u){let C=f[u];if(C!=null){var _=1/C.cnt;l&&(C.ac*=_),C.rc*=_,C.gc*=_,C.bc*=_,f[w++]=C}}T(e)/w<.022&&(a=!1);for(var u=0;u<w-1;++u)f[u].fw=u+1,f[u+1].bk=u,a&&(f[u].cnt=Math.sqrt(f[u].cnt));a&&(f[u].cnt=Math.sqrt(f[u].cnt));var k,B,p;for(u=0;u<w;++u){tt(f,u,!1);var A=f[u].err;for(B=++b[0];B>1&&(p=B>>1,!(f[k=b[p]].err<=A));B=p)b[B]=k;b[B]=u}var z=w-e;for(u=0;u<z;){for(var d;;){var I=b[1];if(d=f[I],d.tm>=d.mtm&&f[d.nn].mtm<=d.tm)break;d.mtm==h?I=b[1]=b[b[0]--]:(tt(f,I,!1),d.tm=u);var A=f[I].err;for(B=1;(p=B+B)<=b[0]&&(p<b[0]&&f[b[p]].err>f[b[p+1]].err&&p++,!(A<=f[k=b[p]].err));B=p)b[B]=k;b[B]=I}var y=f[d.nn],m=d.cnt,v=y.cnt,_=1/(m+v);l&&(d.ac=_*(m*d.ac+v*y.ac)),d.rc=_*(m*d.rc+v*y.rc),d.gc=_*(m*d.gc+v*y.gc),d.bc=_*(m*d.bc+v*y.bc),d.cnt+=y.cnt,d.mtm=++u,f[y.bk].fw=y.fw,f[y.fw].bk=y.bk,y.mtm=h}let M=[];var V=0;for(u=0;;++V){let L=R(Math.round(f[u].rc),0,255),C=R(Math.round(f[u].gc),0,255),Y=R(Math.round(f[u].bc),0,255),E=255;if(l){if(E=R(Math.round(f[u].ac),0,255),c){let st=typeof c=="number"?c:127;E=E<=st?0:255}r&&E<=i&&(L=C=Y=o,E=0)}let K=l?[L,C,Y,E]:[L,C,Y];if(xt(M,K)||M.push(K),(u=f[u].fw)==0)break}return M}function xt(t,e){for(let s=0;s<t.length;s++){let n=t[s],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],o=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&o)return!0}return!1}function U(t,e){var s=0,n;for(n=0;n<t.length;n++){let r=t[n]-e[n];s+=r*r}return s}function P(t,e){return e>1?Math.round(t/e)*e:t}function et(t,{roundRGB:e=5,roundAlpha:s=10,oneBitAlpha:n=null}={}){let r=new Uint32Array(t.buffer);for(let o=0;o<r.length;o++){let i=r[o],c=i>>24&255,x=i>>16&255,a=i>>8&255,l=i&255;if(c=P(c,s),n){let f=typeof n=="number"?n:127;c=c<=f?0:255}l=P(l,e),a=P(a,e),x=P(x,e),r[o]=c<<24|x<<16|a<<8|l<<0}}function nt(t,e,s="rgb565"){if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array)&&!(t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(t.buffer),r=n.length,o=s==="rgb444"?4096:65536,i=new Uint8Array(r),c=new Array(o),x=s==="rgba4444";if(s==="rgba4444")for(let a=0;a<r;a++){let l=n[a],f=l>>24&255,g=l>>16&255,h=l>>8&255,b=l&255,w=G(b,h,g,f),_=w in c?c[w]:c[w]=gt(b,h,g,f,e);i[a]=_}else{let a=s==="rgb444"?j:D;for(let l=0;l<r;l++){let f=n[l],g=f>>16&255,h=f>>8&255,b=f&255,w=a(b,h,g),_=w in c?c[w]:c[w]=bt(b,h,g,e);i[l]=_}}return i}function gt(t,e,s,n,r){let o=0,i=1e100;for(let c=0;c<r.length;c++){let x=r[c],a=x[3],l=q(a-n);if(l>i)continue;let f=x[0];if(l+=q(f-t),l>i)continue;let g=x[1];if(l+=q(g-e),l>i)continue;let h=x[2];l+=q(h-s),!(l>i)&&(i=l,o=c)}return o}function bt(t,e,s,n){let r=0,o=1e100;for(let i=0;i<n.length;i++){let c=n[i],x=c[0],a=q(x-t);if(a>o)continue;let l=c[1];if(a+=q(l-e),a>o)continue;let f=c[2];a+=q(f-s),!(a>o)&&(o=a,r=i)}return r}function rt(t,e,s=5){if(!t.length||!e.length)return;let n=t.map(i=>i.slice(0,3)),r=s*s,o=t[0].length;for(let i=0;i<e.length;i++){let c=e[i];c.length<o?c=[c[0],c[1],c[2],255]:c.length>o?c=c.slice(0,3):c=c.slice();let x=N(n,c.slice(0,3),U),a=x[0],l=x[1];l>0&&l<=r&&(t[a]=c)}}function q(t){return t*t}function W(t,e,s=U){let n=Infinity,r=-1;for(let o=0;o<t.length;o++){let i=t[o],c=s(e,i);c<n&&(n=c,r=o)}return r}function N(t,e,s=U){let n=Infinity,r=-1;for(let o=0;o<t.length;o++){let i=t[o],c=s(e,i);c<n&&(n=c,r=o)}return[r,n]}function ot(t,e,s=U){return t[W(t,e,s)]}function ct(t={}){let{initialCapacity:e=4096,auto:s=!0}=t,n=F(e),r=5003,o=new Uint8Array(256),i=new Int32Array(r),c=new Int32Array(r),x=!1;return{reset(){n.reset(),x=!1},finish(){n.writeByte(X.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:a,writeFrame(l,f,g,h={}){let{transparent:b=!1,transparentIndex:w=0,delay:_=0,palette:u=null,repeat:k=0,colorDepth:B=8,dispose:p=-1}=h,A=!1;if(s?x||(A=!0,a(),x=!0):A=Boolean(h.first),f=Math.max(0,Math.floor(f)),g=Math.max(0,Math.floor(g)),A){if(!u)throw new Error("First frame must include a { palette } option");pt(n,f,g,u,B),it(n,u),k>=0&&dt(n,k)}let z=Math.round(_/10);wt(n,p,z,b,w);let d=Boolean(u)&&!A;ht(n,f,g,d?u:null),d&&it(n,u),yt(n,l,f,g,B,o,i,c)}};function a(){ft(n,"GIF89a")}}function wt(t,e,s,n,r){t.writeByte(33),t.writeByte(249),t.writeByte(4),r<0&&(r=0,n=!1);var o,i;n?(o=1,i=2):(o=0,i=0),e>=0&&(i=e&7),i<<=2;let c=0;t.writeByte(0|i|c|o),S(t,s),t.writeByte(r||0),t.writeByte(0)}function pt(t,e,s,n,r=8){let o=1,i=0,c=Z(n.length)-1,x=o<<7|r-1<<4|i<<3|c,a=0,l=0;S(t,e),S(t,s),t.writeBytes([x,a,l])}function dt(t,e){t.writeByte(33),t.writeByte(255),t.writeByte(11),ft(t,"NETSCAPE2.0"),t.writeByte(3),t.writeByte(1),S(t,e),t.writeByte(0)}function it(t,e){let s=1<<Z(e.length);for(let n=0;n<s;n++){let r=[0,0,0];n<e.length&&(r=e[n]),t.writeByte(r[0]),t.writeByte(r[1]),t.writeByte(r[2])}}function ht(t,e,s,n){if(t.writeByte(44),S(t,0),S(t,0),S(t,e),S(t,s),n){let r=0,o=0,i=Z(n.length)-1;t.writeByte(128|r|o|0|i)}else t.writeByte(0)}function yt(t,e,s,n,r=8,o,i,c){$(s,n,e,r,t,o,i,c)}function S(t,e){t.writeByte(e&255),t.writeByte(e>>8&255)}function ft(t,e){for(var s=0;s<e.length;s++)t.writeByte(e.charCodeAt(s))}function Z(t){return Math.max(Math.ceil(Math.log2(t)),1)}var Bt=ct;
window.Gifenc = { GIFEncoder: ct, quantize: H, applyPalette: nt, prequantize: et };
})();


'use strict';

/* ---------- tiny helpers ---------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = (deg) => deg * Math.PI / 180;
const TAU = Math.PI * 2;

const DEMO_B64 = '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';

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
