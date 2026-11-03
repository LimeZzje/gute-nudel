// The plant on the windowsill (Plant v2, 2026-11-04.5). Static SVG, no animation.
//   p = { v: veg weeks (1 unlock = 1 week, no limit), b: bloom weeks 0 … C.BLOOM_WEEKS (after she switched to 12/12) }
//   seed = which plant (the harvest number), deco = ids of the December pieces hanging (content.js ADVENT)
// Built in "world" units around the soil centre (0,0), y up = negative, then zoomed to fit the window.
// Every random choice is hashed from (seed, part, index), so week 21 is week 20 grown a bit, not a reshuffle.
// Shape (agreed): a bushy cannabis plant, NOT a cone: lower branches are the oldest and longest but bend upwards,
// so their tips end high up and the canopy is a wide, uneven dome; the pot stays the same and looks smaller as it grows.
import * as C from './content.js';

// ---------- state: migration + the old field for not-yet-updated devices ----------
// Old saves had plant.stage 0 … 7 (one 10-⭐ unlock each, 5–7 = flowering). New saves have v / b / sc.
// sc = the stage value we last wrote for old app versions; if an old device grew it since (stage > sc), those
// unlocks are added as weeks, if it harvested (stage < sc and a journal entry without grams) the new seed is taken over.
export function plantNorm(p) {
  if (!p || typeof p !== 'object') p = {};
  if (!Array.isArray(p.harvests)) p.harvests = [];
  const st = Math.max(0, Math.min(7, p.stage | 0));
  if (typeof p.v !== 'number') {                     // old save: stage n = n unlocks, no loss
    p.v = st; p.b = st >= 5 ? (st - 4) * 3 : 0;      // old flowering stages 5/6/7 = bloom week 3/6/9 (7 = ready to harvest)
    p.flip = st >= 5;
  } else if (typeof p.sc === 'number' && st !== p.sc) {
    const last = p.harvests[p.harvests.length - 1];
    if (st < p.sc && last && last.g == null) { p.v = st; p.b = 0; p.flip = false; }   // harvested on an old device
    else if (st > p.sc) { const n = st - p.sc; if (p.flip) p.b = Math.min(C.BLOOM_WEEKS, (p.b | 0) + n); else p.v += n; }
  }
  p.b = Math.max(0, Math.min(C.BLOOM_WEEKS, p.b | 0)); p.v = Math.max(0, p.v | 0); p.flip = !!p.flip;
  p.stage = p.sc = compatStage(p);
  return p;
}
// what an old app version should show (its grow button goes stage+1, 7 = its harvest button)
function compatStage(p) { return p.flip ? (p.b >= C.BLOOM_WEEKS ? 7 : p.b >= 5 ? 6 : 5) : Math.min(4, p.v); }
export const plantRipe = p => p.flip && p.b >= C.BLOOM_WEEKS;
export const plantGrams = p => Math.max(1, Math.round(C.GRAMS_PER_WEEK * p.v));   // the size reached = the veg weeks
// progress for the merge of two devices of one person: more harvests, then more weeks, wins
export const plantProgress = p => { p = p || {}; const v = typeof p.v === 'number' ? p.v : (p.stage | 0); return ((p.harvests || []).length * 1e4) + v * 20 + (p.b | 0) + (p.flip ? 1 : 0); };

// ---------- drawing helpers ----------
function hr(...a) { let h = 0x9e3779b9; for (const x of a) { h = Math.imul(h ^ (x | 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; } return (h >>> 0) / 4294967296; }
const f1 = n => n.toFixed(1), rad = Math.PI / 180;
const dir = a => [Math.sin(a * rad), -Math.cos(a * rad)];   // angle in degrees, 0 = up, + = clockwise (right)

// one serrated finger, unit length 100, pointing up
function finger(len) {
  const w = len * .16, n = 6, R = [], Lf = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), y = -len * t, half = w * Math.sin(Math.PI * Math.pow(t, .8)) * 1.15;
    R.push(`L${f1(half + w * .3)} ${f1(y + len * .03)}L${f1(half)} ${f1(y + len * .075)}`);
    Lf.unshift(`L${f1(-half)} ${f1(y + len * .075)}L${f1(-half - w * .3)} ${f1(y + len * .03)}`);
  }
  return `M0 0${R.join('')}L0 ${-len}${Lf.join('')}Z`;
}
// fan leaves with 1/3/5/7/9 fingers as <defs>, reused with <use> (cheap on the phone); fill comes from the <use>
function leafDef(f) {
  const spread = f >= 9 ? 220 : f >= 7 ? 200 : f >= 5 ? 170 : 110;
  let d = '';
  for (let i = 0; i < f; i++) {
    const a = f === 1 ? 0 : -spread / 2 + spread * i / (f - 1), l = 100 * (1 - Math.pow(Math.abs(a) / (spread / 2), 1.6) * .62);
    d += `<path transform="rotate(${f1(a)})" d="${finger(l)}"/>`;
  }
  return `<g id="pl-l${f}">${d}</g>`;
}
const DEFS = `<defs>${[1, 3, 5, 7, 9].map(leafDef).join('')}<radialGradient id="pl-glow"><stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#ffd34d" stop-opacity="0"/></radialGradient></defs>`;
const COL = { back: '#2c6f36', g1: '#3f8f45', g2: '#55a65a', young: '#7cc46a', yel: '#c9b84a', stem: '#357a3b' };
const use = (x, y, a, L, f, col) => `<use href="#pl-l${f}" fill="${col}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${(L / 100).toFixed(3)})"/>`;

// a flower cluster (cola) of small calyxes growing up from (0,0), unit size; g = 0..1 how far flowering is.
// Drawn once per picture as <defs> and reused with <use> (a few hundred buds stay cheap).
function budDef(g) {
  const s = 1, k = 1;
  const n = 3 + Math.round(g * 6), len = (5 + 18 * g) * s, ripe = g >= .78;
  const cal = ripe ? ['#7fae4a', '#93bf5c', '#86a85a', '#9d8fbf'] : ['#8cc35a', '#9fd06a', '#b5dc82', '#a6d474'], hair = g >= .55 ? '#e0862a' : '#fbf8ee';
  let h = `<g id="pl-bud${Math.round(g * 90)}">`;
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1), cy = -len * t, w = (2.4 + 3.2 * g) * s * (1 - t * .45);
    for (const dx of [-1, 1]) h += `<circle cx="${f1(dx * w * .55 + (hr(k, i, dx) - .5) * 2 * s)}" cy="${f1(cy)}" r="${f1(w)}" fill="${cal[Math.floor(hr(k, 5, i, dx) * (ripe ? 3.4 : 4))]}"/>`;
  }
  for (let i = 0; i < n * 2; i++) { // pistils (hairs)
    const cy = -len * hr(k, 9, i), a = (hr(k, 8, i) - .5) * 2.4, r = (3 + 3 * g) * s;
    h += `<path d="M0 ${f1(cy)}l${f1(Math.sin(a) * r)} ${f1(-Math.cos(a) * r)}" stroke="${hair}" stroke-width="${f1(.9 * s)}" stroke-linecap="round"/>`;
  }
  if (g > .5) for (let i = 0; i < n; i++) h += `<circle cx="${f1((hr(k, 7, i) - .5) * 6 * s)}" cy="${f1(-len * hr(k, 6, i))}" r="${f1(.7 * s)}" fill="#fff" opacity=".8"/>`; // frost
  return h + '</g>';
}
const bud = (x, y, s, g, k) => `<use href="#pl-bud${Math.round(g * 90)}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1((hr(k, 4) - .5) * 24)}) scale(${s.toFixed(2)})"/>`;

// ---------- the plant ----------
// returns { back, mid, front, buds, anchors, top, maxX, H, stemW }
function grow(v, b, seed) {
  const g = Math.min(1, b / C.BLOOM_WEEKS), st = 1 + .3 * Math.min(b, 3) / 3;   // stretch in the first bloom weeks
  const back = [], mid = [], front = [], buds = [], anchors = [];
  let maxX = 30, top = 20;
  const ext = (x, y) => { maxX = Math.max(maxX, Math.abs(x)); top = Math.max(top, -y); };
  const N = Math.min(1 + Math.floor(v * .75), 22), gapMax = 10 + Math.min(v, 60) * .34;
  const Lmax = 15 + Math.min(v, 12) * 2.2 + Math.max(0, Math.min(v, 60) - 12) * .9, stemW = Math.min(1.8 + v * .3, 11);
  // a fan leaf on a petiole: from (x,y) in direction a, then the blade drooping a little
  const fan = (out, x, y, a, L, f, col, aid) => {
    const P = L * .62, [dx, dy] = dir(a), ex = x + dx * P, ey = y + dy * P;
    const droop = Math.abs(a) > 60 ? Math.sign(a) * (3 + 10 * hr(aid, 3)) : 0, la = a + droop, [lx, ly] = dir(la);
    out.push(`<path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${COL.stem}" stroke-width="${f1(Math.max(.9, L * .04))}" stroke-linecap="round"/>` + use(ex, ey, la, L, f, col));
    ext(ex + lx * L, ey + ly * L); ext(ex + lx * L * .6 + ly * L * .4, ey + ly * L * .6);
    if (aid) anchors.push({ x: ex, y: ey, id: aid, k: 'hang', s: L });
  };
  const cluster = (out, x, y, a, s, aid) => { // the young growing tip: small upright leaves
    out.push(use(x, y, a - 30, s * .8, 5, COL.young) + use(x, y, a + 30, s * .8, 5, COL.young) + use(x, y, a, s, 5, COL.g2));
    ext(x, y - s); if (aid) anchors.push({ x, y: y - s * .3, id: aid, k: 'tip', s });
  };

  // main stem: nodes, each internode stretches while young; a short hypocotyl below the first node
  const nd = []; let y = -(7 + Math.min(v, 4) * 3.5);
  const coty = y;
  for (let i = 0; i < N; i++) {
    const age = Math.max(0, v - i / .75);
    y -= gapMax * (.3 + .7 * (1 - Math.exp(-age / 2.5))) * (.85 + .3 * hr(seed, 1, i)) * st;
    nd.push({ x: (hr(seed, 2, i) - .5) * 5, y, age, t: (i + 1) / (N + 1) });
  }
  const H = -y + gapMax * .5 * st, topX = (hr(seed, 2, 99) - .5) * 4;
  // stem in tapering pieces
  let px = 0, py = 0;
  [...nd, { x: topX, y: -H }].forEach((n, i) => {
    back.push(`<path d="M${f1(px)} ${f1(py)}L${f1(n.x)} ${f1(n.y)}" stroke="${COL.stem}" stroke-width="${f1(stemW * (1 - i / (N + 1) * .7))}" stroke-linecap="round"/>`);
    px = n.x; py = n.y;
  });
  ext(0, -H);
  if (v <= 4) { // the two round seed leaves stay for the first weeks
    const r = 6 + Math.min(v, 2) * 2;
    mid.push(`<ellipse cx="${-r}" cy="${f1(coty)}" rx="${r}" ry="${f1(r * .5)}" fill="${COL.g2}" transform="rotate(-18 ${-r} ${f1(coty)})"/><ellipse cx="${r}" cy="${f1(coty)}" rx="${r}" ry="${f1(r * .5)}" fill="${COL.g2}" transform="rotate(18 ${r} ${f1(coty)})"/>`);
    ext(r * 2, coty);
  }

  nd.forEach((n, i) => {
    const mat = 1 - Math.exp(-n.age / 1.5), t = n.t;
    const f = i === 0 ? (v < 2 ? 1 : 3) : i === 1 ? 5 : v > 14 && i > 2 && t < .7 ? 9 : 7;
    for (const side of [-1, 1]) {
      if (i >= 3 && side !== (i % 2 ? 1 : -1) && hr(seed, 15, i) < .75) continue;   // higher up mostly one fan leaf per node (alternating)
      if (i >= 1 && v >= 4 && n.age > 4 && hr(seed, 20, i, side) >= .2 && hr(seed, 16, i, side) < .45) continue;   // where a grown branch sits, its leaves do the job (no stacked column)
      const aid = Math.floor(hr(seed, 10, i, side) * 1e9) + 1;
      const L = Lmax * (.3 + .7 * mat) * (1.05 - t * .3) * (.88 + .24 * hr(seed, 11, i, side));
      const a = side * (84 - 42 * t + (hr(seed, 12, i, side) - .5) * 30);
      const yellow = g > .66 && t < .35 && hr(seed, 13, i, side) < .65;
      const isBack = hr(seed, 14, i, side) < .5;
      fan(isBack ? back : front, n.x, n.y, a, L, f, yellow ? COL.yel : isBack ? COL.back : (i % 2 ? COL.g1 : COL.g2), aid);
      if (g > 0 && t > .45) buds.push(bud(n.x + side * 3, n.y - 1, Lmax / 24 * (.5 + t * .4), g, aid));
    }
    // a dark leaf behind each side of the older nodes at a random angle: fills the middle (no see-through birdcage)
    if (i >= 1 && v >= 6) for (const side of [-1, 1]) if (hr(seed, 17, i, side) < .8)
      fan(back, n.x, n.y, side * (28 + 80 * hr(seed, 18, i, side)), Lmax * (.3 + .7 * mat) * (.75 + .3 * hr(seed, 19, i, side)), 7, COL.back, 0);
    // side branches from the 2nd node on, once the node is a few weeks old (some nodes miss one side: uneven)
    if (i === 0 || v < 4 || n.age < 1.5) return;
    for (const side of [-1, 1]) {
      if (hr(seed, 20, i, side) < .2) continue;
      const grow = 1 - Math.exp(-(n.age - 1.5) / 8);
      let BL = H * .88 * grow * (.75 + .45 * hr(seed, 21, i, side)) * (1 - t * .45) * st;
      if (BL < 7) continue;
      const a0 = 84 + 14 * hr(seed, 22, i, side) - t * 30, a1 = 8 + 18 * hr(seed, 23, i, side), K = 7;
      const path = len => { const pts = [[n.x, n.y - 2]]; for (let k = 1; k <= K; k++) { const u = k / K, [dx, dy] = dir(side * (a0 + (a1 - a0) * Math.pow(u, 1.5))); const [qx, qy] = pts[k - 1]; pts.push([qx + dx * len / K, qy + dy * len / K]); } return pts; };
      let pts = path(BL);
      const lim = -H * (.9 + .06 * hr(seed, 24, i, side)); // tips stay a bit below the main top
      if (pts[K][1] < lim) { BL *= (lim - n.y) / (pts[K][1] - n.y); pts = path(BL); }
      const bw = Math.max(1.1, stemW * .42 * (1 - t * .4));
      mid.push(`<path d="M${pts.map(q => f1(q[0]) + ' ' + f1(q[1])).join('L')}" stroke="${COL.stem}" stroke-width="${f1(bw)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
      const at = u => { const k = Math.min(K - 1, Math.floor(u * K)), r = u * K - k; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * r, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * r, side * (a0 + (a1 - a0) * Math.pow(u, 1.5))]; };
      const kn = Math.max(1, Math.min(7, Math.round(BL / (Lmax * .55)))), bm = Math.min(1, BL / 22);
      for (let j = 0; j < kn; j++) {
        const u = (j + .6) / (kn + .4), [bx, by, ba] = at(u);
        const Lb = Lmax * .8 * (1 - u * .3) * (.55 + .45 * bm) * (.85 + .3 * hr(seed, 25, i, side, j));
        const aid = Math.floor(hr(seed, 26, i, side, j) * 1e9) + 1, yellow = g > .8 && u < .5 && hr(seed, 27, i, side, j) < .4;
        fan(front, bx, by, ba + side * (52 + 22 * hr(seed, 28, i, side, j)), Lb, 7, yellow ? COL.yel : j % 2 ? COL.g2 : COL.g1, aid);
        fan(back, bx, by, ba - side * (48 + 20 * hr(seed, 29, i, side, j)), Lb * .8, 5, COL.back, 0);
        if (g > 0 && u > .6) buds.push(bud(bx, by - 1, Lmax / 34 * (.5 + u * .5), g, aid + 1));
      }
      const [tx, ty, ta] = at(1), tid = Math.floor(hr(seed, 30, i, side) * 1e9) + 1;
      cluster(front, tx, ty, ta, Lmax * (.22 + .12 * bm), tid);
      if (g > 0) buds.push(bud(tx, ty + 1, Lmax / 20 * (.7 + .9 * Math.min(1, BL / H)), g, tid));
      // a side shoot on the long lower branches (bushier from ~week 14)
      if (BL > H * .4 && v > 14) {
        const [sx, sy, sa] = at(.45), sl = BL * .34, ea = sa * .35, [dx, dy] = dir(ea), ex = sx + dx * sl, ey = sy + dy * sl;
        mid.push(`<path d="M${f1(sx)} ${f1(sy)}Q${f1(sx + dx * sl * .2 + side * sl * .25)} ${f1(sy + dy * sl * .5)} ${f1(ex)} ${f1(ey)}" stroke="${COL.stem}" stroke-width="${f1(bw * .7)}" fill="none" stroke-linecap="round"/>`);
        const sid = Math.floor(hr(seed, 31, i, side) * 1e9) + 1;
        fan(front, sx + dx * sl * .5, sy + dy * sl * .5, ea + side * 60, Lmax * .55, 7, COL.g2, sid + 2);
        cluster(front, ex, ey, ea, Lmax * .26, sid);
        if (g > 0) buds.push(bud(ex, ey + 1, Lmax / 20 * .8, g, sid));
      }
    }
  });
  // the main top
  if (v >= 2) { cluster(front, topX, -H, 0, Math.min(Lmax * .42, 24), 7); if (g > 0) buds.push(bud(topX, -H + 2, Lmax / 15 * (1 + Math.min(v, 30) / 40), g, 5)); }
  else front.push(use(topX, -H, -35, 6, 1, COL.g2) + use(topX, -H, 35, 6, 1, COL.g2));
  top += g ? Lmax * .9 * g : 0;
  return { back, mid, front, buds, anchors, top: top + 8, maxX: maxX + 6, H, topX };
}

// ---------- December decoration: unit shapes (1 = U world units ≈ 6 px on screen), hanging down from (0,0) ----------
const thread = l => `<path d="M0 0V${l}" stroke="#8b8378" stroke-width=".1"/>`;
const ball = c => thread(.9) + `<rect x="-.28" y=".75" width=".56" height=".45" rx=".1" fill="#d4b14a"/><circle cy="2.05" r="1" fill="${c}"/><circle cx="-.35" cy="1.72" r=".3" fill="#fff" opacity=".55"/>`;
const star5 = (r, c, s = 'none') => { let d = ''; for (let i = 0; i < 10; i++) { const a = i * 36 * rad, q = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + f1(Math.sin(a) * q) + ' ' + f1(-Math.cos(a) * q); } return `<path d="${d}Z" fill="${c}" stroke="${s}" stroke-width=".12" stroke-linejoin="round"/>`; };
const SHAPE = {
  red: () => ball('#d23a3a'), gold: () => ball('#e2b43c'), blue: () => ball('#3f6fd1'), silver: () => ball('#c6ccd6'), lila: () => ball('#9a63c9'), rosa: () => ball('#ee8fb0'),
  straw: () => thread(.6) + `<g transform="translate(0 1.7)">${star5(1.1, '#ecc979', '#b88f35')}<path d="M-1 0H1M0 -1V1" stroke="#b88f35" stroke-width=".08"/></g>`,
  cane: () => `<path d="M.55 3.3V.9a.55 .55 0 0 0 -1.1 0" stroke="#fff" stroke-width=".42" fill="none" stroke-linecap="round"/><path d="M.55 3.3V.9a.55 .55 0 0 0 -1.1 0" stroke="#d6262e" stroke-width=".42" stroke-dasharray=".35 .35" fill="none"/>`,
  boot: () => thread(.6) + `<path d="M-.6 .7H.5V2.3L1.5 2.6Q1.8 3.3 1.1 3.3H-.6Z" fill="#c8282e"/><rect x="-.8" y=".5" width="1.5" height=".55" rx=".25" fill="#fff"/>`,
  bell: () => thread(.6) + `<path d="M-.95 2.6Q-.95 .9 0 .75Q.95 .9 .95 2.6Z" fill="#e2b43c"/><circle cy="2.75" r=".28" fill="#b88f35"/><rect x="-1.05" y="2.45" width="2.1" height=".25" rx=".1" fill="#c99b2e"/>`,
  flake: () => thread(.5) + `<g transform="translate(0 1.6)" stroke="#fff" stroke-width=".2" stroke-linecap="round"><path d="M0 -1V1M-.87 -.5L.87 .5M-.87 .5L.87 -.5"/></g>`,
  heart: () => thread(.6) + `<path d="M0 3Q-1.5 2 -1.2 1.1Q-.8 .4 0 1.1Q.8 .4 1.2 1.1Q1.5 2 0 3Z" fill="#a8652f" stroke="#fff" stroke-width=".14" stroke-dasharray=".25 .15"/>`,
  bow: () => `<path d="M0 0L-1.2 -.6V.6ZM0 0L1.2 -.6V.6Z" fill="#d6262e"/><path d="M0 0L-.5 1.3M0 0L.5 1.3" stroke="#d6262e" stroke-width=".28"/><circle r=".3" fill="#a81d22"/>`,
  icicle: () => `<path d="M-.7 0L-.3 0L-.5 2.2ZM-.15 0L.35 0L.1 3ZM.5 0L.85 0L.68 1.8Z" fill="#e4f5ff" stroke="#9fc9e2" stroke-width=".06"/>`,
  cone: () => thread(.5) + `<ellipse cy="1.9" rx=".75" ry="1.25" fill="#8a5a33"/><path d="M-.6 1.4L.6 1.9M-.6 1.9L.6 2.4M-.5 2.4L.5 2.9M.6 1.4L-.6 1.9" stroke="#5e3b1f" stroke-width=".12"/>`,
  man: () => thread(.4) + `<g fill="#b8743a"><circle cy="1" r=".5"/><path d="M-.35 1.4H.35L1 1.8L.9 2.1L.4 1.9L.7 3.2L.3 3.3L0 2.5L-.3 3.3L-.7 3.2L-.4 1.9L-.9 2.1L-1 1.8Z"/></g><circle cx="0" cy="1.9" r=".09" fill="#fff"/><circle cx="0" cy="2.2" r=".09" fill="#fff"/>`,
  candle: () => `<rect x="-.25" y="-1.6" width=".5" height="1.6" fill="#d23a3a"/><path d="M0 -2.5Q.35 -1.95 0 -1.7Q-.35 -1.95 0 -2.5Z" fill="#ffb02e"/><circle cy="-2.05" r=".9" fill="url(#pl-glow)" opacity=".7"/>`,
};
// how many of a piece hang (share of the free anchor points, min/max)
const COUNT = { red: [.12, 2, 9], gold: [.12, 2, 9], blue: [.1, 2, 8], silver: [.1, 2, 8], lila: [.1, 2, 7], rosa: [.1, 2, 7], straw: [.08, 1, 6], cane: [.07, 1, 5], boot: [.04, 1, 3], bell: [.07, 1, 5], flake: [.09, 1, 7], heart: [.06, 1, 5], bow: [.07, 1, 6], icicle: [.08, 1, 6], cone: [.05, 1, 4], man: [.05, 1, 4], candle: [.08, 1, 6] };

function decorate(P, ids, U) {
  const on = new Set(ids), under = [], hang = [], over = [];
  if (!on.size) return { under: '', hang: '', over: '' };
  const pool = P.anchors.slice().sort((a, b) => (a.id % 9973) - (b.id % 9973)), used = new Set();
  const all = P.anchors.filter(a => a.k === 'hang' || a.k === 'tip');
  const g = (x, y, s, inner) => `<g class="dc" transform="translate(${f1(x)} ${f1(y)}) scale(${(U * s).toFixed(3)})">${inner}</g>`;
  // garlands across the plant at a few heights: through the anchors of that band, sagging between them
  const garland = (fr, stroke, w, bulbs) => {
    for (const f of fr) {
      const yb = -P.top * f, band = P.top * .09, pts = all.filter(a => Math.abs(a.y - yb) < band).sort((a, b) => a.x - b.x);
      const q = pts.filter((a, i) => i === 0 || a.x - pts[i - 1].x > U * 3);
      if (q.length < 2) continue;
      let d = `M${f1(q[0].x)} ${f1(q[0].y)}`, dots = [];
      for (let i = 1; i < q.length; i++) {
        const a = q[i - 1], b = q[i], mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + Math.min(U * 2.5, Math.abs(b.x - a.x) * .3);
        d += `Q${f1(mx)} ${f1(my + U)} ${f1(b.x)} ${f1(b.y)}`;
        dots.push([a.x, a.y], [mx, my - U * .1 + U * .5]);
      }
      dots.push([q[q.length - 1].x, q[q.length - 1].y]);
      under.push(`<path d="${d}" stroke="${stroke}" stroke-width="${f1(U * w)}" fill="none" stroke-linecap="round"/>`);
      if (bulbs) dots.forEach(([x, y], i) => { const c = bulbs[i % bulbs.length]; over.push(`<circle cx="${f1(x)}" cy="${f1(y + U * .3)}" r="${f1(U * 1.4)}" fill="url(#pl-glow)" opacity=".6"/><circle cx="${f1(x)}" cy="${f1(y + U * .3)}" r="${f1(U * .42)}" fill="${c}"/>`); });
    }
  };
  if (on.has('lights')) garland([.3, .55, .78], '#4a4a3a', .12, ['#ffd86b']);
  if (on.has('lights2')) garland([.42, .66], '#4a4a3a', .12, ['#ff5a5a', '#ffd86b', '#5ab0ff', '#7ee07e']);
  if (on.has('beads')) garland([.36, .6, .84], '#d9b44a', .3, null);
  if (on.has('lametta')) pool.filter((a, i) => i % 4 === 0).forEach(a => hang.push(g(a.x, a.y, 1, [-.4, 0, .4].map((dx, j) => `<path d="M${dx} 0q.25 .8 -.05 1.6q-.25 .8 .05 1.6" stroke="${j % 2 ? '#e9edf2' : '#b9c2cc'}" stroke-width=".09" fill="none"/>`).join(''))));
  C.ADVENT.map(x => x.id).forEach((id, n) => {
    if (!on.has(id) || !SHAPE[id] || !COUNT[id]) return;
    const cand = id === 'candle' ? pool.filter(a => a.k === 'tip') : pool.filter(a => a.k === 'hang');
    if (!cand.length) return;
    const [share, lo, hi] = COUNT[id], c = Math.max(lo, Math.min(hi, Math.round(cand.length * share * .7)));
    const start = Math.floor(hr(n, 77) * cand.length), step = cand.length / c;
    for (let j = 0; j < c; j++) {
      let k = (start + Math.round(j * step)) % cand.length, tries = 0;
      while (used.has(cand[k].id) && tries++ < cand.length) k = (k + 1) % cand.length;
      if (used.has(cand[k].id)) break;
      used.add(cand[k].id); const a = cand[k];
      hang.push(g(a.x, a.y, .9 + .25 * hr(a.id, n), SHAPE[id]()));
    }
  });
  if (on.has('snow')) pool.filter(a => a.k === 'tip' && a.id % 2).forEach(a => over.push(g(a.x, a.y - U * .2, 1, `<ellipse rx="1" ry=".38" fill="#fff" opacity=".95"/><ellipse cx="-.4" cy="-.12" rx=".4" ry=".25" fill="#fff"/>`)));
  if (on.has('gifts')) [[-1, '#d23a3a', '#e2b43c', 3.2], [1, '#3f6fd1', '#fff', 2.6], [1.6, '#7fae4a', '#d23a3a', 2]].forEach(([sx, c, r, s], i) => {
    const x = sx * (60 + i * 8 + U * 2), w = s * U, y0 = 14;
    under.push(`<rect x="${f1(x - w / 2)}" y="${f1(y0 - w)}" width="${f1(w)}" height="${f1(w)}" fill="${c}"/><path d="M${f1(x)} ${f1(y0 - w)}V${y0}M${f1(x - w / 2)} ${f1(y0 - w / 2)}H${f1(x + w / 2)}" stroke="${r}" stroke-width="${f1(U * .4)}"/><path d="M${f1(x)} ${f1(y0 - w)}q${f1(-U)} ${f1(-U)} ${f1(-U * .2)} ${f1(-U * .9)}M${f1(x)} ${f1(y0 - w)}q${f1(U)} ${f1(-U)} ${f1(U * .2)} ${f1(-U * .9)}" stroke="${r}" stroke-width="${f1(U * .35)}" fill="none"/>`);
  });
  if (on.has('star')) over.push(g(P.topX, -P.top + U * 1.2, 1, `<circle r="3.2" fill="url(#pl-glow)"/>${star5(2.1, '#ffd34d', '#c99b2e')}`));
  return { under: under.join(''), hang: hang.join(''), over: over.join('') };
}

export function plantSVG(p = {}, seed = 0, deco = []) {
  const v = Math.max(0, p.v | 0), b = p.flip ? Math.max(0, p.b | 0) : 0, g = Math.min(1, b / C.BLOOM_WEEKS);
  const W = 360, H = 300;
  let inner, s = 1, dec = { under: '', hang: '', over: '' };
  if (v === 0) {
    inner = `<ellipse cx="0" cy="-2" rx="7" ry="5" fill="#8a6a45"/><path d="M-4 -3q4 -4 8 0" stroke="#5b4630" fill="none"/>`;
  } else {
    const P = grow(v, b, seed * 7 + 3);
    s = Math.min(1.25, 212 / P.top, 168 / P.maxX);
    if (deco.length) dec = decorate(P, deco, 6 / s);
    inner = P.back.join('') + P.mid.join('') + dec.under + P.front.join('') + P.buds.join('') + dec.hang + dec.over;
  }
  const scene = `<g transform="translate(180 232) scale(${s.toFixed(3)})">` +
    `<rect x="${(-182 / s).toFixed(0)}" y="18" width="${(364 / s).toFixed(0)}" height="${(80 / s).toFixed(0)}" fill="#d9c3a0"/><rect x="${(-182 / s).toFixed(0)}" y="14" width="${(364 / s).toFixed(0)}" height="8" fill="#c7ab83"/>` +
    `<path d="M-52 0L52 0L42 60L-42 60Z" fill="#c8693e"/><rect x="-58" y="-8" width="116" height="16" rx="4" fill="#d97b4c"/><ellipse cx="0" cy="-2" rx="52" ry="7" fill="#5a3d2b"/>` +
    inner + '</g>';
  const light = b > 0 ? '<rect width="360" height="300" fill="#ffb347" opacity=".08"/>' : '';
  const sparkle = g >= 1 ? [[60, 60], [300, 90], [80, 150], [290, 170], [180, 26]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0 -8L2 -2L8 0L2 2L0 8L-2 2L-8 0L-2 -2Z" fill="#ffd34d"/>`).join('') : '';
  const hint = v === 0 ? `<text x="180" y="200" text-anchor="middle" font-family="Caveat, cursive" font-size="22" fill="#5a3d2b">psst… da tut sich was</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pflanze">${DEFS}${g > 0 ? '<defs>' + budDef(g) + '</defs>' : ''}<circle cx="305" cy="50" r="22" fill="#ffe08a" opacity=".85"/>${light}${scene}${sparkle}${hint}</svg>`;
}
