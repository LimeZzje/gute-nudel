// Home flowers (G15, 2026-11-04.4): one step of growth per task done today, up to C.CAP (10) steps, drawn BEHIND the
// whole Home screen. STATIC on purpose (phone heat): plain inline SVG built once per render(), no animation, no timers.
// Placement is seeded by the date, so it is the same on every render and every phone; step n+1 only ADDS to step n.
import * as C from './content.js';

const f1 = n => n.toFixed(1);
// small seeded random numbers (mulberry32), seed from the day key "2026-11-04"
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = k => [...String(k)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

const PETALS = ['#f2a0b3', '#f6c453', '#b79be0', '#ffffff', '#f08a6b', '#8fc1e8'];
// the three flower kinds of the roadmap board (daisy, five round petals, tulip), same shapes
function flower(kind, col, r) {
  let p = '';
  if (kind === 0) {
    for (let i = 0; i < 8; i++) p += `<ellipse cx="0" cy="${f1(-r * .55)}" rx="${f1(r * .3)}" ry="${f1(r * .55)}" fill="${col}" transform="rotate(${i * 45})"/>`;
    p += `<circle r="${f1(r * .32)}" fill="#ffe9a8"/>`;
  } else if (kind === 1) {
    for (let i = 0; i < 5; i++) p += `<circle cx="0" cy="${f1(-r * .52)}" r="${f1(r * .5)}" fill="${col}" transform="rotate(${i * 72})"/>`;
    p += `<circle r="${f1(r * .3)}" fill="#fff3c4"/><circle r="${f1(r * .12)}" fill="#e8a85f"/>`;
  } else {
    p += `<path d="M${f1(-r * .55)} 0 Q${f1(-r * .6)} ${f1(-r * .95)} ${f1(-r * .22)} ${f1(-r * .7)} L0 ${f1(-r * 1.05)} L${f1(r * .22)} ${f1(-r * .7)} Q${f1(r * .6)} ${f1(-r * .95)} ${f1(r * .55)} 0 Q0 ${f1(r * .55)} ${f1(-r * .55)} 0Z" fill="${col}"/>`;
  }
  return p;
}

// done = tasks done today (workToday().length), k = today's day key → '' at 0, else the garden for min(done, CAP) steps
export function flowerGarden(done, k) {
  const n = Math.min(Math.max(done | 0, 0), C.CAP);
  const rnd = rng(seedOf(k));
  // the whole garden is laid out for the full 10 steps first (fixed random sequence), then only the first n steps are drawn
  const W = 100, H = 170, per = 3;
  const steps = [];
  for (let s = 0; s < C.CAP; s++) {
    const items = [];
    for (let j = 0; j < per; j++) {
      const side = (s * per + j) % 4;   // spread over the width: left edge, right edge, two inner bays
      const x = [2 + rnd() * 14, 84 + rnd() * 14, 30 + rnd() * 16, 54 + rnd() * 16][side];
      const top = 50 + rnd() * 100 - s * 3.2;   // later steps are a little taller
      items.push({ x, top, bend: (rnd() - .5) * 14, kind: Math.floor(rnd() * 3), col: PETALS[Math.floor(rnd() * PETALS.length)], r: 5.5 + rnd() * 3 + s * .25, leaf: rnd() < .5 ? -1 : 1 });
    }
    steps.push({ items, tx: 4 + rnd() * 92, th: 9 + rnd() * 9 });
  }
  let g = '';
  for (let s = 0; s < n; s++) {
    const st = steps[s];
    // a grass tuft per step along the bottom
    g += `<path d="M${f1(st.tx - 3)} ${H} Q${f1(st.tx - 2)} ${f1(H - st.th)} ${f1(st.tx - 5)} ${f1(H - st.th - 3)} Q${f1(st.tx + 1)} ${f1(H - st.th * .6)} ${f1(st.tx)} ${H} Q${f1(st.tx + 1)} ${f1(H - st.th - 4)} ${f1(st.tx + 5)} ${f1(H - st.th)} Q${f1(st.tx + 3)} ${f1(H - st.th * .5)} ${f1(st.tx + 3)} ${H}Z" fill="#6fae6b"/>`;
    for (const it of st.items) {
      const x2 = it.x + it.bend, my = (H + it.top) / 2, lx = it.x + it.bend * .4;
      g += `<path d="M${f1(it.x)} ${H} Q${f1(it.x - it.bend)} ${f1(my)} ${f1(x2)} ${f1(it.top)}" stroke="#5d9a5e" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
      g += `<ellipse cx="${f1(lx + it.leaf * 3)}" cy="${f1(my + 6)}" rx="3.4" ry="1.4" fill="#6fae6b" transform="rotate(${it.leaf * -30} ${f1(lx)} ${f1(my + 6)})"/>`;
      g += `<g transform="translate(${f1(x2)} ${f1(it.top)})">${flower(it.kind, it.col, it.r)}</g>`;
    }
  }
  if (!n) return '';
  return `<div class="gn-flowers" data-n="${n}" aria-hidden="true"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">${g}</svg></div>`;
}
