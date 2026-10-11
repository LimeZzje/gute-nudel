// 📖 The two recipe books (2026-10-11, user's wish):
//   hers – "Herbarium der Waage": warm, botanical, Libra ♎, their poodle (from the photo book: curly grey/caramel, dark ears,
//          red collar) and a rabbit called Hase. Her 💛 favourites + every easy recipe Claude writes from the Vorrat.
//   his  – "Codex Culinarius Infernalis": playfully occult, red ink on black paper, art, photography, perfume.
//          Every fancy recipe Claude writes.
// A real book that grows like a diary: cover → ex libris → contents → one recipe per page → "to be continued".
// Pages turn with a page-flip (drag, or tap the outer edges / the arrows). All artwork is SVG drawn here, seeded per recipe,
// so a page always looks the same. app.js renders Bk.html() and calls Bk.mount() after every render.

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (a, r) => a[Math.floor(r() * a.length)];
const f1 = n => Math.round(n * 10) / 10;
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const roman = n => { let s = ''; for (const [v, l] of ROMAN) while (n >= v) { s += l; n -= v; } return s || 'N'; };
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MENSES = ['Ianuarii', 'Februarii', 'Martii', 'Aprilis', 'Maii', 'Iunii', 'Iulii', 'Augusti', 'Septembris', 'Octobris', 'Novembris', 'Decembris'];
const dateDe = ts => { const d = new Date(ts); return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
const dateLat = ts => { const d = new Date(ts); return roman(d.getDate()) + '. ' + MENSES[d.getMonth()] + ' ' + roman(d.getFullYear()); };

// =====================================================================================================================
// HER BOOK — art
// =====================================================================================================================
const SAGE = ['#7f9c6e', '#93ad7f', '#6b8a5c', '#a5bb8f'], ROSE = '#e7a2a9', GOLD = '#c9a45c';

// a soft, curly blob of fur: overlapping curls on the outline and inside, two-tone like their poodle
function fluff(cx, cy, rx, ry, r, cols, curl = 0.3, dark = '#3d3430') {
  let s = '';
  const n = Math.max(8, Math.round((rx + ry) / 4.2));
  const base = cols[0];
  s += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx * .92)}" ry="${f1(ry * .92)}" fill="${base}"/>`;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * .3, rr = Math.min(rx, ry) * (.24 + r() * .12);
    const x = cx + Math.cos(a) * rx * .86, y = cy + Math.sin(a) * ry * .86;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="${cols[r() < .7 ? 0 : 1 + Math.floor(r() * (cols.length - 1))]}"/>`;
  }
  const m = Math.round(rx * ry / 120);
  for (let i = 0; i < m; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * .78, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, rr = 3 + r() * 2.6;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="${pick(cols, r)}" opacity=".45"/>`;
    if (r() < curl) s += `<path d="M${f1(x - rr * .6)},${f1(y)} a${f1(rr * .6)},${f1(rr * .6)} 0 1 1 ${f1(rr * .9)},${f1(rr * .5)}" fill="none" stroke="${dark}" stroke-opacity=".28" stroke-width=".9" stroke-linecap="round"/>`;
  }
  return s;
}
// their poodle, sitting, looking right, tongue out, red collar (photo 07). `mood`: 'sit' | 'sleep'
function poodle(seed = 7, mood = 'sit') {
  const r = rng(seed);
  const CAR = ['#c39a6b', '#b8905f', '#d0aa7d', '#a97f55'], GRY = ['#7b716a', '#867b73', '#6a605a', '#948980'], MIX = ['#bb9468', '#a98a6c', '#8d8279', '#c9a275', '#7b716a'];
  if (mood === 'sleep') {
    return `<svg viewBox="0 0 240 130" class="poodle sleep" aria-hidden="true">
      <ellipse cx="120" cy="118" rx="100" ry="8" fill="#000" opacity=".08"/>
      <g class="breath">${fluff(125, 85, 82, 34, r, CAR)}${fluff(58, 92, 30, 22, r, CAR)}${fluff(190, 96, 24, 18, r, CAR)}
      ${fluff(70, 70, 34, 30, r, GRY)}${fluff(60, 50, 22, 18, r, ['#6a605a', '#7b716a', '#574e48'])}
      ${fluff(38, 82, 18, 12, r, ['#d0aa7d', '#c39a6b'])}
      <path d="M86,62 C96,72 98,98 88,112 C80,106 76,86 80,66 Z" fill="#4a403a"/>${fluff(88, 92, 10, 22, r, ['#4a403a', '#574e48', '#3d3430'])}
      <path d="M48,72 q6,4 12,0" fill="none" stroke="#2b2420" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="25" cy="84" rx="5" ry="4" fill="#1e1a18"/>
      <path d="M62,98 C80,104 100,104 112,98" fill="none" stroke="#c0283a" stroke-width="5" stroke-linecap="round"/></g>
      <g class="zzz" font-family="Caveat,cursive" fill="#8a7a70"><text x="20" y="40" font-size="16">z</text><text x="8" y="26" font-size="20">z</text><text x="-4" y="10" font-size="24">Z</text></g></svg>`;
  }
  return `<svg viewBox="0 0 220 240" class="poodle" aria-hidden="true">
    <ellipse cx="110" cy="230" rx="78" ry="8" fill="#000" opacity=".08"/>
    <g class="tail">${fluff(40, 168, 15, 14, r, CAR)}</g>
    ${fluff(74, 186, 40, 32, r, MIX)}
    ${fluff(104, 142, 36, 54, r, MIX)}
    ${fluff(118, 198, 13, 30, r, CAR)}${fluff(142, 198, 13, 30, r, CAR)}
    ${fluff(118, 224, 15, 8, r, ['#a97f55', '#8d6a49'])}${fluff(144, 224, 15, 8, r, ['#a97f55', '#8d6a49'])}
    <g class="head">
      <path d="M96,104 C110,114 134,114 146,104 L146,96 C134,104 110,104 96,96 Z" fill="#c0283a"/>
      <path d="M96,102 C110,112 134,112 146,102" fill="none" stroke="#8e1424" stroke-width="1.2"/>
      <rect x="117" y="104" width="9" height="7" rx="2" fill="#1e1a18"/>
      ${fluff(122, 70, 32, 30, r, MIX)}
      ${fluff(112, 46, 26, 20, r, ['#6a605a', '#7b716a', '#574e48', '#8d8279'])}
      ${fluff(152, 80, 21, 14, r, ['#d0aa7d', '#c39a6b', '#b48a5e'])}
      <ellipse cx="170" cy="75" rx="6.5" ry="5.2" fill="#1e1a18"/><ellipse cx="168" cy="73" rx="2" ry="1.2" fill="#fff" opacity=".5"/>
      <path d="M150,88 C156,92 164,92 170,86" fill="none" stroke="#2b2420" stroke-width="1.6" stroke-linecap="round"/>
      <path class="tongue" d="M154,90 C153,101 162,104 164,96 C165,92 162,89 158,89 Z" fill="#e88b98" stroke="#c9677a" stroke-width=".8"/>
      <ellipse cx="141" cy="64" rx="3.4" ry="3.6" fill="#1e1a18"/><circle cx="142.2" cy="62.8" r="1.1" fill="#fff"/>
      <path d="M135,58 q6,-4 11,-1" fill="none" stroke="#3d3430" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>
      <g class="ear"><path d="M100,54 C88,64 86,96 92,118 C100,124 110,118 110,106 C112,86 108,64 100,54 Z" fill="#4a403a"/>
      ${fluff(98, 92, 11, 26, r, ['#4a403a', '#574e48', '#3d3430', '#62574f'])}</g>
    </g></svg>`;
}
// Hase peeking over an edge (ears twitch); or hopping along (side view)
const bunnyPeek = () => `<svg viewBox="0 0 90 80" class="bunny peek" aria-hidden="true">
  <g class="ears"><ellipse class="earL" cx="32" cy="24" rx="8" ry="22" fill="#bfae9f" transform="rotate(-12 32 44)"/><ellipse cx="32" cy="26" rx="4" ry="16" fill="#f0b8bf" transform="rotate(-12 32 44)"/>
  <ellipse class="earR" cx="56" cy="24" rx="8" ry="22" fill="#bfae9f" transform="rotate(14 56 44)"/><ellipse cx="56" cy="26" rx="4" ry="16" fill="#f0b8bf" transform="rotate(14 56 44)"/></g>
  <ellipse cx="44" cy="62" rx="27" ry="23" fill="#cdbdaf"/><ellipse cx="44" cy="70" rx="15" ry="11" fill="#efe6dc"/>
  <circle cx="34" cy="58" r="3.2" fill="#2b2420"/><circle cx="35" cy="57" r="1" fill="#fff"/><circle cx="54" cy="58" r="3.2" fill="#2b2420"/><circle cx="55" cy="57" r="1" fill="#fff"/>
  <path d="M41,66 l3,3 l3,-3 z" fill="#e88b98"/><path d="M44,69 v3 M44,72 q-3,3 -6,1 M44,72 q3,3 6,1" fill="none" stroke="#8a7a70" stroke-width="1"/>
  <path d="M30,68 l-14,-2 M30,71 l-13,3 M58,68 l14,-2 M58,71 l13,3" stroke="#8a7a70" stroke-width=".7"/>
  <ellipse cx="27" cy="66" rx="4" ry="2.4" fill="#f0b8bf" opacity=".6"/><ellipse cx="61" cy="66" rx="4" ry="2.4" fill="#f0b8bf" opacity=".6"/></svg>`;
const bunnyHop = () => `<div class="hopline"><svg viewBox="0 0 70 50" class="bunny hop" aria-hidden="true">
  <ellipse cx="34" cy="32" rx="20" ry="13" fill="#cdbdaf"/><circle cx="13" cy="28" r="6" fill="#fff"/>
  <circle cx="52" cy="22" r="10" fill="#cdbdaf"/><ellipse cx="50" cy="6" rx="4" ry="12" fill="#bfae9f" transform="rotate(-20 50 16)"/>
  <ellipse cx="50" cy="7" rx="2" ry="8" fill="#f0b8bf" transform="rotate(-20 50 16)"/><circle cx="56" cy="20" r="1.8" fill="#2b2420"/><circle cx="61" cy="24" r="1.3" fill="#e88b98"/>
  <ellipse cx="24" cy="43" rx="9" ry="4" fill="#bfae9f"/><ellipse cx="44" cy="44" rx="4" ry="3" fill="#bfae9f"/></svg></div>`;
// the scales of Libra, gently swinging
const scales = (c = GOLD) => `<svg viewBox="0 0 120 100" class="scales" aria-hidden="true" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round">
  <path d="M60,14 V88 M44,90 H76 M50,88 Q60,80 70,88"/><circle cx="60" cy="10" r="4"/>
  <g class="beam"><path d="M18,22 H102"/><path d="M22,22 L10,56 M22,22 L34,56 M98,22 L86,56 M98,22 L110,56"/>
  <path d="M6,56 Q22,70 38,56 Z M82,56 Q98,70 114,56 Z" fill="${c}" fill-opacity=".18"/></g></svg>`;
// the Libra constellation (Zubenelgenubi, Zubeneschamali, Brachium, Gamma, Upsilon, Tau), twinkling
const LIBRA = (() => { const P = [[8, 30], [30, 8], [52, 26], [46, 50], [62, 62], [66, 72]], E = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [0, 3]];
  return `<g stroke="#e9cf8f" stroke-width=".8" opacity=".75">${E.map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`).join('')}</g>` +
    P.map(([x, y], i) => `<circle class="lst" style="--d:${i * .4}s" cx="${x}" cy="${y}" r="${i < 3 ? 2.6 : 1.9}" fill="#f6e3a8"/>`).join('') + `<text x="6" y="-6" font-family="Caveat,cursive" font-size="17" fill="#e9cf8f" opacity=".85">Libra</text>`; })();
// a wreath of leaves and little flowers around the cover
function wreath(r, cx = 120, cy = 128, R = 84) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#9db58a" stroke-width="2.2" opacity=".85"/><circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="none" stroke="#7f9c6e" stroke-width="1" opacity=".6"/>`;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = i / n * 360 + r() * 3, out = i % 2 ? 1 : -1, len = 12 + r() * 7;
    s += `<g transform="rotate(${f1(a)} ${cx} ${cy}) translate(${cx} ${cy - R}) rotate(${f1(out * (55 + r() * 25) + 90)})"><path d="M0,0 Q${f1(len * .45)},${f1(-len * .45)} 0,${f1(-len)} Q${f1(-len * .45)},${f1(-len * .45)} 0,0 Z" fill="${pick(SAGE, r)}"/><path d="M0,-1 L0,${f1(-len * .85)}" stroke="#4f6c47" stroke-width=".6" opacity=".5"/></g>`;
  }
  for (let i = 0; i < 11; i++) {
    const a = (i / 11 * 360 + 8) * Math.PI / 180, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, col = i % 3 === 1 ? '#f7efe2' : i % 3 === 2 ? '#d9b8e3' : ROSE, rs = i % 2 ? .8 : 1.05;
    s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${rs}) rotate(${i * 23})">${[0, 72, 144, 216, 288].map(d => `<ellipse cx="0" cy="-5" rx="3.8" ry="5.8" fill="${col}" transform="rotate(${d})"/>`).join('')}<circle r="2.6" fill="${GOLD}"/></g>`;
  }
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2; s += `<circle cx="${f1(cx + Math.cos(a) * (R + (r() - .5) * 10))}" cy="${f1(cy + Math.sin(a) * (R + (r() - .5) * 10))}" r="1.8" fill="#e9cf8f"/>`; }
  return s;
}
// pressed plants for the pages: drawn from a few rules per species (the stem draws itself when the page opens)
const PLANTS = [
  { n: 'Lavendel', l: 'Lavandula angustifolia', leaf: 'narrow', lc: ['#8fa58a', '#9fb39a'], fl: 'spike', fc: ['#9b7bc4', '#b398d6', '#8a68b8'] },
  { n: 'Rosmarin', l: 'Salvia rosmarinus', leaf: 'needle', lc: ['#5f7d5a', '#6b8a64'], fl: 'dots', fc: ['#b8c8e8', '#a8bde0'] },
  { n: 'Basilikum', l: 'Ocimum basilicum', leaf: 'oval', lc: ['#6fa35a', '#7fb36a', '#5e9150'], fl: 'top', fc: ['#f4efe2'] },
  { n: 'Kamille', l: 'Matricaria chamomilla', leaf: 'feather', lc: ['#86a173', '#93ad7f'], fl: 'daisy', fc: ['#fffaf0'] },
  { n: 'Olivenzweig', l: 'Olea europaea', leaf: 'narrow', lc: ['#9aab8f', '#aab89e', '#8c9d83'], fl: 'olive', fc: ['#4f5a3a', '#5e6b42'] },
  { n: 'Minze', l: 'Mentha spicata', leaf: 'oval', lc: ['#7fbf8a', '#6fae7c', '#8dcb96'], fl: 'none' },
  { n: 'Thymian', l: 'Thymus vulgaris', leaf: 'tiny', lc: ['#748f68', '#82997a'], fl: 'dots', fc: ['#e3a7c4', '#d895b6'] },
  { n: 'Salbei', l: 'Salvia officinalis', leaf: 'soft', lc: ['#9fae96', '#aebaa5', '#93a38a'], fl: 'none' },
  { n: 'Kornblume', l: 'Centaurea cyanus', leaf: 'grass', lc: ['#8fa58a', '#9fb39a'], fl: 'star', fc: ['#4f73c9', '#6a8be0'] },
  { n: 'Farn', l: 'Polypodium vulgare', leaf: 'frond', lc: ['#5f8a55', '#6e9a62', '#7aa66c'], fl: 'none' },
  { n: 'Ringelblume', l: 'Calendula officinalis', leaf: 'soft', lc: ['#7f9c6e', '#8faa7c'], fl: 'daisy', fc: ['#f2a33a'] },
  { n: 'Schafgarbe', l: 'Achillea millefolium', leaf: 'feather', lc: ['#7f9c6e', '#8faa7c'], fl: 'dots', fc: ['#f6eee6', '#f0c9d2'] },
];
function plant(seed) {
  const r = rng(seed), P = PLANTS[seed % PLANTS.length];
  const x0 = 50, y0 = 150, x1 = 50 + (r() - .5) * 26, y1 = 18, cx = 50 + (r() - .5) * 40, cy = 80;
  const at = t => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; };
  const ang = t => { const [a, b] = at(Math.max(0, t - .01)), [c, d] = at(Math.min(1, t + .01)); return Math.atan2(d - b, c - a) * 180 / Math.PI; };
  let leaves = '', flowers = '', k = 0;
  const leafPath = (len, w) => `M0,0 Q${f1(w)},${f1(-len * .45)} 0,${f1(-len)} Q${f1(-w)},${f1(-len * .45)} 0,0 Z`;
  const L = { narrow: [28, 4.2, 13], needle: [14, 1.6, 34], oval: [26, 11, 9], feather: [21, 0, 12], tiny: [7, 3.2, 30], soft: [30, 12, 8], grass: [38, 2.6, 6], frond: [0, 0, 20] }[P.leaf];
  const top = P.fl === 'none' ? 1 : P.fl === 'spike' ? .62 : .86;
  for (let i = 0; i < L[2]; i++) {
    const t = .08 + i / L[2] * (top - .08), [x, y] = at(t), side = i % 2 ? 1 : -1, a = ang(t) + 90 + side * (48 + r() * 18);
    const sc = P.leaf === 'frond' ? 1 - t * .7 : 1 - t * .35, col = pick(P.lc, r), d = `style="--d:${f1(.25 + k++ * .05)}s"`;
    if (P.leaf === 'feather') {
      const len = L[0] * sc; leaves += `<g class="lf" ${d} transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><path d="M0,0 L0,${f1(-len)}" stroke="${col}" stroke-width="1.1"/>${[.3, .5, .7, .9].map(q => `<path d="M0,${f1(-len * q)} l${f1(-4 * sc)},${f1(-4 * sc)} M0,${f1(-len * q)} l${f1(4 * sc)},${f1(-4 * sc)}" stroke="${col}" stroke-width=".8"/>`).join('')}</g>`;
    } else if (P.leaf === 'frond') {
      const len = 27 * sc; leaves += `<g class="lf" ${d} transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang(t) + 90 + side * 75)})"><path d="${leafPath(len, 4.5 * sc)}" fill="${col}"/></g>`;
    } else {
      const len = L[0] * sc * (.85 + r() * .3); leaves += `<g class="lf" ${d} transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><path d="${leafPath(len, L[1] * sc)}" fill="${col}"/>${L[1] > 5 ? `<path d="M0,0 L0,${f1(-len * .9)}" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>` : ''}</g>`;
    }
  }
  const fl = (x, y, i) => `style="--d:${f1(1 + i * .08)}s"`;
  if (P.fl === 'spike') for (let i = 0; i < 16; i++) { const t = .64 + i / 16 * .36, [x, y] = at(t), s = i % 2 ? 1 : -1; flowers += `<ellipse class="fl" ${fl(x, y, i)} cx="${f1(x + s * 2.6)}" cy="${f1(y)}" rx="2.4" ry="3.3" fill="${pick(P.fc, r)}" transform="rotate(${s * 30} ${f1(x + s * 2.6)} ${f1(y)})"/>`; }
  if (P.fl === 'dots') for (let i = 0; i < 9; i++) { const t = .55 + r() * .45, [x, y] = at(t); flowers += `<circle class="fl" ${fl(x, y, i)} cx="${f1(x + (r() - .5) * 12)}" cy="${f1(y + (r() - .5) * 6)}" r="${f1(1.8 + r() * 1.4)}" fill="${pick(P.fc, r)}"/>`; }
  if (P.fl === 'top') { const [x, y] = at(1); flowers += `<g class="fl" ${fl(x, y, 0)}>${[0, 1, 2, 3, 4].map(i => `<circle cx="${f1(x + (r() - .5) * 8)}" cy="${f1(y - i * 3)}" r="1.8" fill="${P.fc[0]}"/>`).join('')}</g>`; }
  if (P.fl === 'olive') for (let i = 0; i < 3; i++) { const [x, y] = at(.35 + i * .2); flowers += `<ellipse class="fl" ${fl(x, y, i)} cx="${f1(x + (i % 2 ? 9 : -9))}" cy="${f1(y + 5)}" rx="4" ry="5.4" fill="${pick(P.fc, r)}"/>`; }
  const star = (x, y, rad, col, i) => `<g class="fl" ${fl(x, y, i)} transform="translate(${f1(x)} ${f1(y)})">${Array.from({ length: 10 }, (_, j) => `<path d="M0,0 L${f1(-1.6)},${f1(-rad)} L${f1(1.6)},${f1(-rad)} Z" fill="${col}" transform="rotate(${j * 36})"/>`).join('')}<circle r="2.4" fill="#3b4f8f"/></g>`;
  const daisy = (x, y, rad, col, i) => `<g class="fl" ${fl(x, y, i)} transform="translate(${f1(x)} ${f1(y)})">${Array.from({ length: 12 }, (_, j) => `<ellipse cx="0" cy="${f1(-rad * .62)}" rx="${f1(rad * .2)}" ry="${f1(rad * .42)}" fill="${col}" stroke="#e6dccb" stroke-width=".4" transform="rotate(${j * 30})"/>`).join('')}<circle r="${f1(rad * .32)}" fill="#e9b93c"/></g>`;
  if (P.fl === 'daisy') { const [x, y] = at(1); flowers += daisy(x, y, 12, P.fc[0], 0); const [a, b] = at(.62); flowers += `<path d="M${f1(a)},${f1(b)} q14,-8 18,-22" fill="none" stroke="${P.lc[0]}" stroke-width="1.3"/>` + daisy(a + 18, b - 22, 8, P.fc[0], 1); }
  if (P.fl === 'star') { const [x, y] = at(1); flowers += star(x, y, 12, P.fc[0], 0); }
  const [ex, ey] = at(1);
  return `<svg viewBox="0 0 100 160" class="herb" aria-hidden="true"><path class="stem" d="M${x0},${y0} Q${f1(cx)},${cy} ${f1(ex)},${f1(ey)}" fill="none" stroke="${P.lc[0]}" stroke-width="2.2" stroke-linecap="round" pathLength="1"/>${leaves}${flowers}</svg>`;
}
const HORO = ['Waagen lieben Balance – heute also: ein Löffel für dich, einer für den Hasen.', 'Venus steht günstig über der Pfanne. Was du heute anbrätst, wird goldbraun.',
  'Die Sterne sagen: Nachtisch zählt als Selbstfürsorge.', 'Harmonie im Haus: Wer kocht, muss nicht abspülen.', 'Dein Aszendent ist heute Butter.',
  'Guter Tag für große Entscheidungen. Fang mit „Nudeln oder Kartoffeln?“ an.', 'Der Pudel spürt es zuerst: Heute fällt etwas für ihn runter.',
  'Saturn rät: erst probieren, dann salzen.', 'Merkur ist nicht rückläufig – das Rezept klappt.', 'Waagen kochen am liebsten für zwei. Passt.',
  'Heute stehen die Sterne auf Gemütlichkeit und Soße.', 'Die Waage wiegt ab: zwei Teller, null Stress.', 'Sterne gucken geht auch durchs Backofenfenster.',
  'Mond in der Küche: Alles darf ein bisschen dauern.', 'Deine Glückszutat heute: Zwiebel. Weinen erlaubt.', 'Schönheit liegt im Anrichten – und ein bisschen im Schnittlauch.',
  'Venus empfiehlt: Musik an, Schürze um.', 'Das Universum hat nichts gegen Reste morgen.', 'Waagen und Rezepte haben eins gemeinsam: Es kommt aufs Gleichgewicht an.',
  'Jupiter bringt Fülle – vor allem auf den Teller.', 'Heute ganz ohne Perfektion. Lecker reicht.', 'Der Hase hat abgewogen: Er hilft beim Schnippeln.',
  'Kosmische Weisheit: Ein Klecks Butter löst viele Probleme.', 'Die Planeten stehen auf „gemütlicher Abend“.', 'Ein Tag für kleine Freuden: die knusprige Ecke gehört dir.',
  'Sternbild des Tages: der Kochlöffel. Leuchtet besonders hell.'];

// =====================================================================================================================
// HIS BOOK — art
// =====================================================================================================================
const RED = '#c0172b', BONE = '#e8dccb';
const starPts = (cx, cy, R, rot) => Array.from({ length: 5 }, (_, i) => { const a = (rot + i * 72) * Math.PI / 180; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
function pentagram(cx, cy, R, c = RED, ring = true) {
  const p = starPts(cx, cy, R * .86, 90), o = [0, 2, 4, 1, 3].map(i => p[i]);
  const words = 'SAL · PIPER · BUTYRUM · IGNIS · ET · TENEBRAE · ';
  return `<g fill="none" stroke="${c}" stroke-linejoin="round">
    <circle cx="${cx}" cy="${cy}" r="${R}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="${f1(R * .92)}" stroke-width="1"/>
    ${ring ? `<circle cx="${cx}" cy="${cy}" r="${f1(R * 1.2)}" stroke-width="1"/><path id="ringp" d="M${cx - R * 1.09},${cy} a${f1(R * 1.09)},${f1(R * 1.09)} 0 1 1 ${f1(R * 2.18)},0 a${f1(R * 1.09)},${f1(R * 1.09)} 0 1 1 ${f1(-R * 2.18)},0" stroke="none"/>
    <text font-family="Fell, serif" font-size="${f1(R * .13)}" fill="${c}" stroke="none" letter-spacing="2"><textPath href="#ringp">${words}${words}</textPath></text>` : ''}
    <path d="M${o.map(q => f1(q[0]) + ',' + f1(q[1])).join(' L')} Z" stroke-width="2"/>
    ${p.map((q, i) => `<text x="${f1(cx + (q[0] - cx) * 1.06)}" y="${f1(cy + (q[1] - cy) * 1.06 + R * .05)}" font-size="${f1(R * .13)}" text-anchor="middle" fill="${c}" stroke="none">${['☿', '♄', '♃', '♂', '♀'][i]}</text>`).join('')}</g>`;
}
// a goat's head in red line art — the house mascot of the dark kitchen
const goat = (c = RED) => `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50,30 C62,30 66,42 64,56 C62,70 56,80 50,88 C44,80 38,70 36,56 C34,42 38,30 50,30 Z" fill="#160d0f"/>
  <path d="M43,32 C30,24 20,10 33,2 C29,12 33,20 46,28" fill="#160d0f"/><path d="M57,32 C70,24 80,10 67,2 C71,12 67,20 54,28" fill="#160d0f"/>
  <path d="M37,42 C28,38 16,42 11,50 C20,52 30,50 37,47"/><path d="M63,42 C72,38 84,42 89,50 C80,52 70,50 63,47"/>
  <path d="M46,78 Q50,82 54,78"/><path d="M45,86 Q50,100 55,86"/><path d="M50,36 L50,44" stroke-width="1.4"/>
  <path d="M41,49 l6,1.5 M59,49 l-6,1.5" stroke-width="2.6"/></g>
  <circle class="eye" cx="44" cy="51" r="1.4" fill="${c}"/><circle class="eye" cx="56" cy="51" r="1.4" fill="${c}"/>`;
const candle = (x, y, h, i = 0) => `<g transform="translate(${x} ${y})">
  <ellipse class="glow" cx="0" cy="-${h + 10}" rx="26" ry="30" fill="url(#cglow)" style="--d:${i * .37}s"/>
  <path d="M-7,0 V-${h} Q-7,-${h + 3} -3,-${h + 2} Q0,-${h + 4} 3,-${h + 2} Q7,-${h + 3} 7,-${h} V0 Z" fill="${BONE}"/>
  <path d="M-7,-${h - 2} q2,8 0,14 M4,-${h - 1} q2,5 1,9" stroke="#cdbfa9" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M0,-${h + 2} v-4" stroke="#2a2124" stroke-width="1.2"/>
  <path class="flame" style="--d:${i * .29}s" d="M0,-${h + 21} C5,-${h + 13} 5,-${h + 7} 0,-${h + 5} C-5,-${h + 7} -5,-${h + 13} 0,-${h + 21} Z" fill="#ffcf6b"/>
  <path class="flame" style="--d:${i * .29}s" d="M0,-${h + 15} C2.4,-${h + 11} 2.4,-${h + 8} 0,-${h + 7} C-2.4,-${h + 8} -2.4,-${h + 11} 0,-${h + 15} Z" fill="#fff4d6"/></g>`;
// every recipe gets its own sigil, drawn from its name
function sigil(seed, size = 90) {
  const r = rng(seed), n = 5 + Math.floor(r() * 4), R = 34, c = 50;
  const pts = Array.from({ length: n }, (_, i) => { const a = (i / n * 360 + r() * 20 - 90) * Math.PI / 180, rr = R * (.45 + r() * .55); return [c + Math.cos(a) * rr, c + Math.sin(a) * rr]; });
  const order = pts.map((_, i) => i).sort(() => r() - .5), path = order.map((i, k) => (k ? 'L' : 'M') + f1(pts[i][0]) + ',' + f1(pts[i][1])).join(' ');
  const s = pts[order[0]], e = pts[order[order.length - 1]], ticks = Array.from({ length: 24 }, (_, i) => { const a = i * 15 * Math.PI / 180, r1 = i % 6 ? 44 : 41; return `M${f1(c + Math.cos(a) * r1)},${f1(c + Math.sin(a) * r1)} L${f1(c + Math.cos(a) * 46)},${f1(c + Math.sin(a) * 46)}`; }).join(' ');
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="sigil" aria-hidden="true"><g fill="none" stroke="${RED}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="50" r="47" stroke-width="1"/><path d="${ticks}" stroke-width="1"/><g class="spin"><path d="${path}" stroke-width="1.8"/>
    <circle cx="${f1(s[0])}" cy="${f1(s[1])}" r="3.2" stroke-width="1.4"/><path d="M${f1(e[0] - 4)},${f1(e[1] + 4)} L${f1(e[0] + 4)},${f1(e[1] - 4)}" stroke-width="1.8"/>
    ${r() < .6 ? `<path d="M${f1(c - 6)},${c} h12 M${c},${f1(c - 6)} v12" stroke-width="1"/>` : `<circle cx="50" cy="50" r="${f1(6 + r() * 6)}" stroke-width="1"/>`}</g></g></svg>`;
}
const seal = (text = 'PERACTUM', sub = '') => `<svg viewBox="0 0 120 120" class="seal" aria-hidden="true"><defs><radialGradient id="sg" cx="40%" cy="35%"><stop offset="0" stop-color="#d23a46"/><stop offset=".7" stop-color="#9c1424"/><stop offset="1" stop-color="#6e0b17"/></radialGradient></defs>
  <path d="${Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, rr = i % 2 ? 50 : 56; return (i ? 'L' : 'M') + f1(60 + Math.cos(a) * rr) + ',' + f1(60 + Math.sin(a) * rr); }).join(' ')} Z" fill="url(#sg)"/>
  <circle cx="60" cy="60" r="38" fill="none" stroke="#5e0912" stroke-width="2.5" opacity=".7"/><circle cx="60" cy="60" r="31" fill="none" stroke="#e86b76" stroke-width="1" opacity=".5"/>
  <path d="M46,42 L74,78 M74,42 L46,78" stroke="#5e0912" stroke-width="4" stroke-linecap="round" opacity=".7"/><path d="M71,40 q8,2 6,10 l-6,-6 M46,42 v6 M42,42 v5 M50,42 v5" stroke="#5e0912" stroke-width="2" fill="none" opacity=".7"/>
  <text x="60" y="${sub ? 98 : 101}" text-anchor="middle" font-family="Fell, serif" font-size="11" fill="#f3c9cd" letter-spacing="1.5">${esc(text)}</text>${sub ? `<text x="60" y="30" text-anchor="middle" font-size="14">${esc(sub)}</text>` : ''}</svg>`;
// a dish as a perfume: head / heart / base notes from what's in it
const NOTES = [[/orange/, 'Bergamotte', 0], [/zitron|limett/, 'Zitrone', 0], [/tomat/, 'Tomatenblatt', 0], [/basilikum/, 'Basilikum', 0], [/petersilie|schnittlauch|dill/, 'Galbanum', 0],
  [/apfel/, 'grüner Apfel', 0], [/garnele|fisch|lachs/, 'Meeresbrise', 0], [/pfeffer/, 'schwarzer Pfeffer', 0], [/knoblauch|zwiebel/, 'Schwefel (mutig)', 0], [/ei(er)?$|eier/, 'Aldehyde', 0],
  [/lorbeer/, 'Lorbeer', 1], [/butter/, 'Iris-Butter', 1], [/curry|kardamom/, 'Safran', 1], [/zimt/, 'Zimt', 1], [/spinat|feldsalat|salat/, 'Veilchenblatt', 1], [/kohl/, 'grüner Tee', 1],
  [/banane/, 'Banane', 1], [/honig/, 'Honig', 1], [/hähnchen|huhn/, 'Leder', 1], [/sahne|milch|quark|frischkäse/, 'Moschus', 1],
  [/schokolade|kakao/, 'Kakao-Absolue', 2], [/nüsse|nuss/, 'Haselnuss', 2], [/champignon|pilz/, 'Waldboden', 2], [/kartoffel/, 'Vetiver', 2], [/balsamico/, 'Perubalsam', 2],
  [/käse/, 'Ambra', 2], [/vanille/, 'Vanille', 2], [/kaffee/, 'Kaffee', 2], [/brot|toast|knödel|brötchen/, 'Toast-Akkord', 2], [/wurst|würstchen|speck/, 'Birkenteer', 2]];
function pyramid(r) {
  const t = [[], [], []];
  for (const [, name] of r.ing) { const n = String(name).toLowerCase(); for (const [re, note, tier] of NOTES) if (re.test(n) && !t[tier].includes(note)) { t[tier].push(note); break; } }
  const fb = [['Aldehyde', 'Rosa Pfeffer'], ['Weihrauch', 'Lorbeer'], ['Ambra', 'Labdanum']];
  return t.map((x, i) => (x.length ? x : fb[i]).slice(0, 3));
}
function exif(r) {
  const h = hash(r.id), F = ['1.4', '1.8', '2', '2.8', '4', '5.6'], T = ['1/30', '1/60', '1/125', '1/250'], I = [100, 200, 400, 800, 1600, 3200], L = [24, 35, 50, 85];
  return `f/${F[h % F.length]} · ${T[(h >>> 3) % T.length]} s · ISO ${I[(h >>> 5) % I.length]} · ${L[(h >>> 8) % L.length]} mm`;
}
const MOTTO = [['Per ignem ad saporem.', 'Durchs Feuer zum Geschmack.'], ['Butyrum vincit omnia.', 'Butter besiegt alles.'], ['Memento mori, memento salis.', 'Denk an den Tod. Und ans Salz.'],
  ['Fames est optimus coquus.', 'Hunger ist der beste Koch.'], ['Coquo, ergo sum.', 'Ich koche, also bin ich.'], ['Ex tenebris sapor.', 'Aus der Dunkelheit: Geschmack.'],
  ['Nulla dies sine butyro.', 'Kein Tag ohne Butter.'], ['Carpe cenam.', 'Nutze das Abendessen.'], ['In nomine pfefferi.', 'Im Namen des Pfeffers.'],
  ['Ignis purgat, sal servat.', 'Feuer reinigt, Salz bewahrt.'], ['Ora et coque.', 'Bete und koche.'], ['Lux in culina.', 'Licht in der Küche.'], ['Gula non est peccatum hodie.', 'Völlerei ist heute keine Sünde.']];

// =====================================================================================================================
// the book
// =====================================================================================================================
const META = {
  her: { name: 'Herbarium der Waage', sub: 'Rezepte, die sie mag', ing: 'Was du brauchst', steps: 'So geht’s', go: 'Kochen & einkaufen ›', toc: 'Inhalt' },
  him: { name: 'Codex Culinarius Infernalis', sub: 'Rezepte, die er mag', ing: 'Opfergaben', steps: 'Ritus', go: 'Das Ritual beginnen ›', toc: 'Index Operum' },
};
const TOC_PER = 11;
const tocCount = pages => Math.max(1, Math.ceil(pages.length / TOC_PER));
export const pageOf = (pages, ri) => 2 + tocCount(pages) + ri;   // leaf of a recipe: cover, ex libris, contents…, recipes
let B = null;   // the open book: {who, pages, i, n}

function coverSvg(who, big) {
  if (who === 'her') return `<svg viewBox="0 0 240 320" class="cov-svg" aria-hidden="true">
    <defs><linearGradient id="hc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f8d63"/><stop offset="1" stop-color="#4f6c47"/></linearGradient>
    <pattern id="hcl" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0,6 L6,0" stroke="#fff" stroke-opacity=".05"/></pattern></defs>
    <rect width="240" height="320" rx="10" fill="url(#hc)"/><rect width="240" height="320" rx="10" fill="url(#hcl)"/><rect x="0" y="0" width="16" height="320" fill="#000" opacity=".12"/>
    <rect x="26" y="14" width="200" height="292" rx="6" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity=".8"/>
    <g class="libra" transform="translate(182 26) scale(.56)">${LIBRA}</g>
    <g class="wreath">${wreath(rng(11))}</g>
    <g transform="translate(58 66) scale(.56)">${poodle(7).replace('<svg viewBox="0 0 220 240" class="poodle" aria-hidden="true">', '<svg viewBox="0 0 220 240" width="220" height="240" class="poodle">')}</g>
    ${big ? `<g class="stars" fill="#f3dfa6">${[[44, 40], [70, 28], [182, 36], [204, 58], [196, 250], [40, 236]].map(([x, y], i) => `<path style="--d:${i * .5}s" d="M${x},${y - 4} L${x + 1.2},${y - 1.2} L${x + 4},${y} L${x + 1.2},${y + 1.2} L${x},${y + 4} L${x - 1.2},${y + 1.2} L${x - 4},${y} L${x - 1.2},${y - 1.2} Z"/>`).join('')}</g>` : ''}
    <text x="128" y="256" text-anchor="middle" font-family="'Dancing Script',Caveat,cursive" font-size="30" font-weight="700" fill="#f3dfa6">Herbarium</text>
    <text x="128" y="284" text-anchor="middle" font-family="'Dancing Script',Caveat,cursive" font-size="22" fill="#f3dfa6">der Waage</text></svg>`;
  return `<svg viewBox="0 0 240 320" class="cov-svg" aria-hidden="true">
    <defs><radialGradient id="mc" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#2a1316"/><stop offset=".6" stop-color="#140b0d"/><stop offset="1" stop-color="#070405"/></radialGradient>
    <radialGradient id="cglow"><stop offset="0" stop-color="#ffb347" stop-opacity=".45"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
    <filter id="lth"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .05  0 0 0 0 .08  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
    <rect width="240" height="320" rx="8" fill="url(#mc)"/><rect width="240" height="320" rx="8" fill="#000" filter="url(#lth)"/><rect x="0" y="0" width="16" height="320" fill="#000" opacity=".35"/>
    <rect x="24" y="12" width="204" height="296" rx="3" fill="none" stroke="${RED}" stroke-width="1" opacity=".7"/><rect x="29" y="17" width="194" height="286" rx="2" fill="none" stroke="${RED}" stroke-width=".5" opacity=".5"/>
    <g class="penta">${pentagram(126, 128, 70)}</g>
    <g transform="translate(91 92) scale(.7)">${goat()}</g>
    ${big ? candle(40, 302, 34, 0) + candle(212, 302, 26, 1) : ''}
    <text x="126" y="246" text-anchor="middle" font-family="Fraktur, serif" font-size="23" fill="${RED}">Codex Culinarius</text>
    <text x="126" y="272" text-anchor="middle" font-family="Fraktur, serif" font-size="23" fill="${RED}">Infernalis</text></svg>`;
}
export const coverArt = who => coverSvg(who, false);

function pageHtml(i) {
  const { who, pages, n } = B, M = META[who], tn = tocCount(pages);
  if (i === 0) return `<div class="bp cover">${coverSvg(who, true)}${who === 'her' ? `<div class="cov-hase">${bunnyPeek()}</div>` : ''}<p class="cov-sub">${M.sub}${who === 'him' ? ' · Anno ' + roman(new Date().getFullYear()) : ''}</p><p class="cov-hint">wischen zum Aufschlagen ←</p></div>`;
  if (i === 1) return who === 'her'
    ? `<div class="bp exlib"><p class="ex-k">Ex Libris</p><div class="ex-dog">${poodle(7)}</div><p class="ex-t">Ein Herbarium voller Rezepte,<br>die sie mag.</p><p class="ex-s">Ihre Lieblinge von Anfang an – und jedes einfache Rezept, das Claude euch aus dem Vorrat schreibt. Das Buch wächst mit, Seite für Seite.</p><div class="ex-sc">${scales()}</div></div>`
    : `<div class="bp exlib"><p class="ex-k">Ex Libris</p><svg viewBox="0 0 100 100" class="ex-goat">${goat()}</svg><p class="ex-t">Hic sunt recepta,<br>quae ei placent.</p><p class="ex-s">(Hier stehen Rezepte, die ihm gefallen.) Jedes fancy Rezept, das Claude aus dem Vorrat beschwört, wird hier verewigt – mit Siegel, Duftpyramide und Belichtung.</p><div class="ex-sc">${sigil(666, 70)}</div></div>`;
  if (i < 2 + tn) {
    const k = i - 2, part = pages.slice(k * TOC_PER, (k + 1) * TOC_PER);
    const foot = who === 'her' ? `<div class="toc-foot"><div class="tf-sc">${scales()}</div><div class="tf-hase">${bunnyPeek()}</div></div>` : `<div class="toc-foot">${sigil(13 + k, 64)}</div>`;
    return `<div class="bp toc"><h2>${M.toc}${tn > 1 ? ` <span>${k + 1}/${tn}</span>` : ''}</h2>${part.length ? `<ol>${part.map((p, j) => { const ri = k * TOC_PER + j, no = pageOf(pages, ri);
      return `<li><button data-bk="goto" data-i="${pageOf(pages, ri)}"><span class="t">${who === 'her' ? '' : '✠ '}${esc(p.r.title)}${p.cur ? ` <em>${who === 'her' ? 'neu' : 'novum'}</em>` : ''}</span><i></i><b>${who === 'her' ? no : roman(no)}</b></button></li>`; }).join('')}</ol>` : `<p class="toc-empty">${who === 'her' ? 'Noch leer – die erste Seite schreibt Claude nach dem nächsten Einkauf.' : 'Noch leer. Das erste Werk wartet auf den nächsten Einkauf.'}</p>`}${foot}</div>`;
  }
  if (i === n - 1) return who === 'her'
    ? `<div class="bp fin"><p class="fin-t">Fortsetzung folgt …</p><p class="fin-s">Nach dem nächsten Einkauf wachsen hier neue Seiten.</p><div class="fin-dog">${poodle(9, 'sleep')}</div>${bunnyHop()}</div>`
    : `<div class="bp fin"><p class="fin-t">Finis.</p><p class="fin-s">Vorerst. Der nächste Einkauf beschwört neue Werke.</p><svg viewBox="0 0 240 200" class="fin-pent"><defs><radialGradient id="cglow"><stop offset="0" stop-color="#ffb347" stop-opacity=".45"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs>${pentagram(120, 90, 60, RED, false)}${candle(40, 196, 40, 0)}${candle(200, 196, 52, 1)}</svg></div>`;
  return recipePage(pages[i - 2 - tn], i);
}
function recipePage(p, no) {
  const { r } = p, who = B.who, M = META[who], h = hash(r.id), list = r.ing.filter(x => x[1]);
  const steps = r.steps.map(s => `<li>${esc(s[0])}${s[1] ? ` <span class="min">${who === 'her' ? '⏰' : '⧗'} ${s[1]} Min.</span>` : ''}</li>`).join('');
  const ing = `<ul class="bp-ing">${list.map(([q, t]) => `<li><span>${esc(t)}</span><i></i><b>${esc(q || '')}</b></li>`).join('')}</ul>`;
  const preg = p.preg ? `<p class="bp-preg">🤰 Erst ab Februar – flüssiges Ei oder kalter Räucherlachs</p>` : '';
  if (who === 'her') {
    const P = PLANTS[h % PLANTS.length];
    return `<article class="bp rec"><div class="bp-head"><span class="bp-date">${p.ts ? dateDe(p.ts) : '💛 Von Anfang an'}</span><span class="bp-no">${no}</span></div>
      <figure class="bp-plant">${plant(h)}<figcaption>${P.n}<br><i>${P.l}</i></figcaption></figure>
      <h2 class="bp-title">${esc(r.title)}</h2>
      <p class="bp-meta">${r.icon} ${r.min ? '⏱ ' + r.min + ' Min. · ' : ''}für ${esc(r.serves || 2)}${p.taste ? ' · ' + p.taste : ''}</p>
      ${p.cur ? `<span class="bp-tape">🧊 alles daheim</span>` : ''}${preg}
      ${r.note ? `<p class="bp-note">${esc(r.note)}</p>` : ''}
      <h3>${M.ing}</h3>${ing}<h3>${M.steps}</h3><ol class="bp-steps">${steps}</ol>
      <div class="bp-horo"><b>♎︎ Waage-Horoskop</b><span>${HORO[(h >>> 4) % HORO.length]}</span></div>
      ${p.cooked ? `<div class="bp-stamp"><span>gekocht!</span><b>${p.taste || '✓'}</b></div>` : ''}
      <button class="bp-go" data-a="bookrecipe" data-id="${esc(r.id)}">${M.go}</button>
      <div class="bp-doodle">${no % 3 === 0 ? `<div class="dd-dog">${poodle(h)}</div>` : no % 3 === 1 ? bunnyHop() : `<div class="dd-peek">${bunnyPeek()}</div>`}</div></article>`;
  }
  const [top, heart, base] = pyramid(r), [mo, tr] = MOTTO[(h >>> 6) % MOTTO.length];
  return `<article class="bp rec"><div class="bp-head"><span class="bp-date">${p.ts ? dateLat(p.ts) : ''}</span><span class="bp-no">Opus Nº ${roman(no)}</span></div>
    <div class="bp-sig">${sigil(h)}</div>
    <h2 class="bp-title">${esc(r.title)}</h2>
    <p class="bp-meta">${r.min ? '⧗ ' + r.min + ' Min. · ' : ''}für ${esc(r.serves || 2)} Seelen${p.taste ? ' · ' + p.taste : ''}</p>
    ${p.cur ? `<span class="bp-tape">✠ in der Speisekammer</span>` : ''}${preg}
    ${r.note ? `<p class="bp-note">${esc(r.note)}</p>` : ''}
    <h3>${M.ing}</h3>${ing}<h3>${M.steps}</h3><ol class="bp-steps">${steps}</ol>
    <div class="bp-perf"><b>Duftpyramide</b><div class="pyr"><span>Kopf</span><em>${top.map(esc).join(' · ')}</em><span>Herz</span><em>${heart.map(esc).join(' · ')}</em><span>Basis</span><em>${base.map(esc).join(' · ')}</em></div></div>
    <div class="bp-exif"><span>◉ Belichtung</span> ${exif(r)}</div>
    <p class="bp-motto">${mo} <span>${tr}</span></p>
    ${p.cooked ? `<div class="bp-seal">${seal('PERACTUM', p.taste)}</div>` : ''}
    <button class="bp-go" data-a="bookrecipe" data-id="${esc(r.id)}">${M.go}</button></article>`;
}
const pageLabel = i => i === 0 ? 'Umschlag' : `Seite ${i} von ${B.n - 1}`;

export function html(who, pages, i) {
  const n = 2 + tocCount(pages) + pages.length + 1;
  B = { who, pages, n, i: Math.max(0, Math.min(n - 1, i | 0)) };
  return `<div class="book bk-${who}" id="book"><div class="bk-bar"><button class="bk-x" data-a="bookclose" aria-label="Buch zuklappen">✕</button><span class="bk-name">${META[who].name}</span><button class="bk-tocb" data-bk="goto" data-i="2">☰ ${who === 'her' ? 'Inhalt' : 'Index'}</button></div>
    <div class="bk-stage" id="bkstage"><div class="bk-page cur">${pageHtml(B.i)}</div></div>
    <div class="bk-foot"><button data-bk="prev" aria-label="Zurückblättern">‹</button><span id="bkno">${pageLabel(B.i)}</span><button data-bk="next" aria-label="Weiterblättern">›</button></div></div>`;
}

// ---------- turning pages ----------
let onPage = () => {};
export function mount(cb) {
  const st = document.getElementById('bkstage'); if (!st || st._m) return;
  st._m = true; onPage = cb || onPage;
  const book = document.getElementById('book');
  book.addEventListener('click', e => {
    const b = e.target.closest('[data-bk]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.bk === 'next') turn(1); else if (b.dataset.bk === 'prev') turn(-1); else jump(+b.dataset.i);
  }, true);
  let g = null;
  st.addEventListener('pointerdown', e => { if (busy || e.button) return; g = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, dir: 0 }; });
  st.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.dir) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) { if (Math.abs(dy) > 12) g = null; return; }
      const dir = dx < 0 ? 1 : -1; if (B.i + dir < 0 || B.i + dir >= B.n) { g = null; return; }
      g.dir = dir; g.flip = start(dir); try { st.setPointerCapture(e.pointerId); } catch (x) {}
    }
    const w = st.clientWidth, p = Math.max(0, Math.min(1, (g.dir > 0 ? -dx : dx) / (w * .9)));
    g.p = p; g.flip.set(p);
  });
  const up = e => {
    if (!g || e.pointerId !== g.id) return;
    const t = g; g = null;
    if (!t.dir) {   // a tap on the outer edges turns too (buttons and links inside the page keep working)
      if (Date.now() - t.t > 400 || e.target.closest('button,a,input')) return;
      const x = e.clientX - st.getBoundingClientRect().left, w = st.clientWidth;
      if (x > w * .8) turn(1); else if (x < w * .2) turn(-1);
      return;
    }
    const fast = Math.abs(e.clientX - t.x) / Math.max(1, Date.now() - t.t) > .6;
    t.flip.finish(t.p > .33 || fast);
  };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', e => { if (g && g.flip) g.flip.finish(false); g = null; });
}
let busy = false;
function start(dir) {   // dir 1: the current page turns away to the left · dir -1: the previous page comes back over it
  busy = true;
  const st = document.getElementById('bkstage'), cur = st.querySelector('.bk-page.cur'), to = B.i + dir;
  const other = document.createElement('div'); other.className = 'bk-page'; other.innerHTML = pageHtml(to);
  const leaf = dir > 0 ? cur : other, under = dir > 0 ? other : cur;
  if (dir > 0) st.insertBefore(other, cur); else st.appendChild(other);
  leaf.classList.add('leaf'); under.classList.add('under');
  const back = document.createElement('div'); back.className = 'bk-back'; leaf.appendChild(back);
  const shade = document.createElement('div'); shade.className = 'bk-shade'; under.appendChild(shade);
  const set = p => {   // p: 0 = not turned, 1 = turned
    const a = dir > 0 ? -180 * p : -180 * (1 - p);
    leaf.style.transform = `rotateY(${f1(a)}deg)`; leaf.style.setProperty('--sh', f1(Math.sin(-a * Math.PI / 180) * .5));
    shade.style.opacity = f1((dir > 0 ? 1 - p : p) * .55);
  };
  set(0);
  return {
    set,
    finish(done) {
      leaf.style.transition = 'transform .38s cubic-bezier(.3,.7,.35,1)'; shade.style.transition = 'opacity .38s';
      requestAnimationFrame(() => set(done ? 1 : 0));
      setTimeout(() => {
        const keep = done ? other : cur, drop = done ? cur : other;
        drop.remove(); keep.className = 'bk-page cur'; keep.style.transform = ''; keep.style.transition = '';
        keep.querySelectorAll(':scope > .bk-back, :scope > .bk-shade').forEach(x => x.remove());
        if (done) { B.i = to; keep.scrollTop = 0; document.getElementById('bkno').textContent = pageLabel(B.i); onPage(B.i); }
        busy = false;
      }, 400);
    },
  };
}
function turn(dir) { if (busy || B.i + dir < 0 || B.i + dir >= B.n) return; start(dir).finish(true); }
function jump(i) {   // contents → straight to a page (one quick turn)
  if (busy || i === B.i || i < 0 || i >= B.n) return;
  const dir = i > B.i ? 1 : -1; B.i = i - dir; start(dir).finish(true);
}

// ---------- styles (both books, their own papers – independent of the app's light/dark theme) ----------
const NOISE = (a, c = '0 0 0') => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 ${c.split(' ')[0]} 0 0 0 0 ${c.split(' ')[1]} 0 0 0 0 ${c.split(' ')[2]} 0 0 0 ${a} 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`;
const CSS = `
.bkshelf { display: flex; gap: 14px; justify-content: center; margin: 4px 0 14px; }
.bkcover { position: relative; width: 44%; max-width: 170px; border: 0; padding: 0; background: none !important; color: inherit !important; cursor: pointer; filter: drop-shadow(0 6px 10px rgba(40,25,10,.28)); transition: transform .2s; }
.bkcover:active { transform: scale(.97) rotate(-1deg); }
.bkcover .cov-svg { display: block; width: 100%; height: auto; border-radius: 6px; }
.bkc-label { display: block; margin-top: 6px; font: 800 14px/1.2 Nunito, sans-serif; color: var(--ink); }
.bkcover[data-cur] .bkc-label::before { content: '✨ '; }
.book { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; overscroll-behavior: contain; }
.bk-bar, .bk-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; flex: none; }
.bk-bar { padding-top: max(8px, env(safe-area-inset-top)); }
.bk-foot { padding-bottom: max(10px, env(safe-area-inset-bottom)); }
.bk-bar button, .bk-foot button { border: 0; border-radius: 999px; min-width: 44px; height: 40px; padding: 0 12px; font: 800 16px Nunito, sans-serif; cursor: pointer; }
.bk-foot button { font-size: 26px; line-height: 1; width: 56px; }
.bk-name { flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#bkno { font: 700 15px Nunito, sans-serif; opacity: .8; }
.bk-stage { position: relative; flex: 1; margin: 0 10px; perspective: 1700px; touch-action: pan-y; }
.bk-page { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; border-radius: 4px 12px 12px 4px; transform-origin: left center; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform-style: preserve-3d; will-change: transform; }
.bk-page.leaf { z-index: 3; overflow: hidden; box-shadow: calc(var(--sh, 0) * 40px) 0 30px rgba(0,0,0,calc(var(--sh, 0) * .5)); }
.bk-page.leaf::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(0,0,0,calc(var(--sh,0) * .35)), transparent 40%, rgba(255,255,255,calc(var(--sh,0) * .25)) 85%, transparent); }
.bk-back { position: absolute; inset: 0; transform: rotateY(180deg); backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 12px 4px 4px 12px; }
.bk-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, #000 0%, rgba(0,0,0,.4) 60%, rgba(0,0,0,.1)); opacity: 0; z-index: 2; }
.bp { min-height: 100%; padding: 22px 20px 26px 26px; position: relative; box-sizing: border-box; }
.bp.cover { padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.bp.cover .cov-svg { width: min(92%, 62vh * .75); height: auto; filter: drop-shadow(0 14px 24px rgba(0,0,0,.35)); border-radius: 8px; }
.cov-sub { margin: 14px 0 0; text-align: center; } .cov-hint { margin: 6px 0 0; font: 700 13px Nunito, sans-serif; opacity: .6; animation: bkNudge 2.4s ease-in-out infinite; }
@keyframes bkNudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
.bp-ing { list-style: none; padding: 0; margin: 0 0 6px; } .bp-ing li { display: flex; align-items: baseline; gap: 6px; padding: 2px 0; }
.bp-ing li i { flex: 1; border-bottom: 2px dotted currentColor; opacity: .25; transform: translateY(-4px); } .bp-ing li b { white-space: nowrap; }
.bp-steps { padding-left: 22px; margin: 0; } .bp-steps li { margin: 0 0 8px; line-height: 1.45; } .bp-steps .min { white-space: nowrap; font-size: .85em; opacity: .75; }
.bp-go { display: block; width: 100%; margin: 18px 0 6px; border: 0; border-radius: 14px; padding: 13px; font: 800 17px Nunito, sans-serif; cursor: pointer; }
.bp-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.toc h2 span { font-size: .55em; opacity: .6; } .toc ol { list-style: none; padding: 0; margin: 10px 0 0; }
.toc li button { display: flex; width: 100%; align-items: baseline; gap: 6px; background: none; border: 0; padding: 7px 0; text-align: left; cursor: pointer; color: inherit; font: inherit; }
.toc li .t { max-width: 78%; } .toc li i { flex: 1; border-bottom: 2px dotted currentColor; opacity: .3; transform: translateY(-4px); } .toc li em { font-style: normal; font-size: .75em; padding: 0 6px; border-radius: 6px; }
.toc-empty { opacity: .7; margin-top: 20px; }
.bp.toc { display: flex; flex-direction: column; } .toc-foot { margin-top: auto; padding-top: 18px; display: flex; justify-content: center; align-items: flex-end; gap: 30px; opacity: .9; }
.bk-her .tf-sc { width: 86px; } .bk-her .tf-hase { width: 58px; }
.bp.exlib, .bp.fin { display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; }

/* ---------------- hers ---------------- */
.bk-her { background: radial-gradient(120% 90% at 50% 0%, #f6e7da 0%, #e6d6c4 55%, #cdb9a3 100%); color: #4a3b36; }
.bk-her .bk-bar button, .bk-her .bk-foot button { background: rgba(255,255,255,.65); color: #5c4a42; }
.bk-her .bk-name { font: 700 22px 'Dancing Script', Caveat, cursive; color: #5f7d5a; }
.bk-her .bk-page, .bk-her .bk-back { background: ${NOISE(.07, '.35 .25 .1')}, linear-gradient(90deg, #efe3cf 0, #fbf5ea 5%, #fbf5ea 94%, #f2e8d6 100%); }
.bk-her .bk-page.cur, .bk-her .bk-page.under { box-shadow: 0 10px 26px rgba(90,60,30,.22), inset 6px 0 10px -6px rgba(90,60,30,.35); }
.bk-her .bp { font: 500 16px/1.5 Nunito, sans-serif; }
.bk-her .cov-sub { font: 700 24px 'Dancing Script', cursive; color: #5f7d5a; }
.bk-her .cov-hase { position: absolute; right: 6%; bottom: 12%; width: 74px; }
.bk-her .bp-date { font: 700 20px Caveat, cursive; color: #8a7a70; } .bk-her .bp-no { font: 700 18px Caveat, cursive; color: #b9a99c; }
.bk-her .bp-title { font: 700 30px/1.15 'Dancing Script', Caveat, cursive; color: #5f7d5a; margin: 6px 0 4px; }
.bk-her .bp-meta { margin: 0 0 8px; color: #8a7a70; font-weight: 700; }
.bk-her h3 { font: 700 23px Caveat, cursive; color: #c97f86; margin: 14px 0 4px; border-bottom: 1px dashed #e3cfc4; }
.bk-her .bp-steps li::marker { font: 700 18px Caveat, cursive; color: #c97f86; }
.bk-her .bp-plant { float: right; width: 96px; margin: 0 -6px 4px 10px; text-align: center; transform: rotate(4deg); position: relative; }
.bk-her .bp-plant::before { content: ''; position: absolute; top: -4px; left: 30px; width: 40px; height: 14px; background: rgba(231,162,169,.45); transform: rotate(-6deg); z-index: 1; }
.bk-her .bp-plant svg { width: 96px; height: 150px; }
.bk-her .bp-plant figcaption { font: 600 15px/1.1 Caveat, cursive; color: #7a6a60; } .bk-her .bp-plant figcaption i { font-size: 13px; opacity: .8; }
.bk-her .herb .stem { stroke-dasharray: 1; stroke-dashoffset: 1; animation: bkDraw 1.4s .1s ease-out forwards; }
.bk-her .herb .lf, .bk-her .herb .fl { opacity: 0; transform-box: fill-box; transform-origin: 50% 100%; animation: bkGrow .6s var(--d, .3s) ease-out forwards; }
@keyframes bkDraw { to { stroke-dashoffset: 0; } } @keyframes bkGrow { from { opacity: 0; scale: .2; } to { opacity: 1; scale: 1; } }
.bk-her .bp-tape { display: inline-block; background: rgba(147,173,127,.4); padding: 3px 12px; font: 700 17px Caveat, cursive; transform: rotate(-2deg); margin: 2px 0 6px; }
.bk-her .bp-note { font: 600 19px/1.3 Caveat, cursive; color: #7a6a60; margin: 6px 0; }
.bk-her .bp-preg, .bk-him .bp-preg { font-weight: 800; font-size: 14px; color: #7b62b8; margin: 4px 0; }
.bk-her .bp-horo { clear: both; margin: 18px 0 4px; padding: 12px 14px; border-radius: 14px; background: linear-gradient(135deg, #f7e9ee, #efeaf7); border: 1px solid #ead8df; }
.bk-her .bp-horo b { display: block; font: 700 21px 'Dancing Script', cursive; color: #a77fb0; } .bk-her .bp-horo span { font: 600 18px/1.3 Caveat, cursive; }
.bk-her .bp-stamp { position: absolute; top: 150px; right: 118px; width: 92px; height: 92px; border: 3px solid rgba(201,127,134,.75); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-14deg); color: rgba(201,127,134,.9); pointer-events: none; animation: bkStamp .5s .3s both cubic-bezier(.3,1.6,.5,1); }
.bk-her .bp-stamp span { font: 700 20px 'Dancing Script', cursive; } .bk-her .bp-stamp b { font-size: 22px; }
@keyframes bkStamp { from { opacity: 0; transform: rotate(-14deg) scale(1.8); } to { opacity: 1; transform: rotate(-14deg) scale(1); } }
.bk-her .bp-go { background: #7f9c6e; color: #fff; box-shadow: 0 3px 0 #5f7d5a; }
.bk-her .bp-doodle { margin-top: 10px; height: 74px; position: relative; overflow: hidden; }
.bk-her .dd-dog { width: 70px; margin-left: auto; } .bk-her .dd-peek { width: 64px; margin: 18px auto 0; }
.bk-her .hopline { position: absolute; inset: 0; } .bk-her .bunny.hop { position: absolute; bottom: 4px; width: 56px; animation: bkHop 7s linear infinite; }
@keyframes bkHop { 0% { left: -60px; transform: translateY(0); } 4%,12%,20%,28%,36%,44%,52%,60%,68%,76%,84%,92% { transform: translateY(-16px); } 8%,16%,24%,32%,40%,48%,56%,64%,72%,80%,88%,96% { transform: translateY(0); } 100% { left: 105%; } }
.bk-her .bunny .ears { transform-origin: 44px 44px; animation: bkTwitch 4s ease-in-out infinite; }
@keyframes bkTwitch { 0%,86%,100% { transform: rotate(0); } 90% { transform: rotate(-6deg); } 94% { transform: rotate(4deg); } }
.bk-her .poodle .tail { transform-origin: 52px 172px; animation: bkWag .5s ease-in-out infinite alternate; }
@keyframes bkWag { from { transform: rotate(-10deg); } to { transform: rotate(12deg); } }
.bk-her .poodle .head { transform-origin: 120px 110px; animation: bkTilt 6s ease-in-out infinite; } @keyframes bkTilt { 0%,70%,100% { transform: rotate(0); } 78%,88% { transform: rotate(-7deg); } }
.bk-her .poodle .tongue { animation: bkPant .45s ease-in-out infinite alternate; transform-origin: 158px 90px; } @keyframes bkPant { to { transform: scaleY(1.12); } }
.bk-her .poodle.sleep .breath { transform-origin: 120px 120px; animation: bkBreath 3.4s ease-in-out infinite; } @keyframes bkBreath { 50% { transform: scale(1.025, 1.04); } }
.bk-her .zzz text { animation: bkZ 3.4s ease-in-out infinite; opacity: 0; } .bk-her .zzz text:nth-child(2) { animation-delay: .6s; } .bk-her .zzz text:nth-child(3) { animation-delay: 1.2s; }
@keyframes bkZ { 20%,70% { opacity: .9; } 100% { opacity: 0; transform: translate(-6px,-8px); } }
.bk-her .scales .beam { transform-origin: 60px 22px; animation: bkSwing 5s ease-in-out infinite; } @keyframes bkSwing { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
.bk-her .stars path { animation: bkTw 2.6s var(--d) ease-in-out infinite; transform-box: fill-box; transform-origin: center; } @keyframes bkTw { 0%,100% { opacity: .3; scale: .6; } 50% { opacity: 1; scale: 1.1; } }
.bk-her .libra .lst { animation: bkTw 3s var(--d) ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.bk-her .wreath { transform-origin: 120px 130px; animation: bkBreath 7s ease-in-out infinite; }
.bk-her .ex-k { font: 700 30px 'Dancing Script', cursive; color: #c97f86; margin: 0; } .bk-her .ex-dog { width: 62%; max-width: 240px; margin: 4px 0; }
.bk-her .ex-t { font: 700 26px/1.2 'Dancing Script', cursive; color: #5f7d5a; margin: 6px 0; } .bk-her .ex-s { font: 600 18px/1.35 Caveat, cursive; color: #7a6a60; max-width: 300px; }
.bk-her .ex-sc { width: 90px; margin-top: 8px; }
.bk-her .toc h2 { font: 700 34px 'Dancing Script', cursive; color: #5f7d5a; margin: 0; } .bk-her .toc li { font: 600 20px/1.2 Caveat, cursive; }
.bk-her .toc li .t::before { content: '❦ '; color: #93ad7f; } .bk-her .toc li em { background: #f2c9cf; color: #8d4b55; font-family: Nunito; font-weight: 800; }
.bk-her .fin-t { font: 700 34px 'Dancing Script', cursive; color: #5f7d5a; margin: 0; } .bk-her .fin-s { font: 600 19px Caveat, cursive; color: #7a6a60; }
.bk-her .fin-dog { width: 80%; max-width: 280px; margin-top: 26px; } .bk-her .bp.fin .hopline { position: relative; height: 60px; width: 100%; }

/* ---------------- his ---------------- */
.bk-him { background: radial-gradient(110% 80% at 50% 105%, #3a0b12 0%, #12080a 55%, #050304 100%); color: ${BONE}; }
.bk-him .bk-bar button, .bk-him .bk-foot button { background: rgba(192,23,43,.16); color: #e9b3b9; border: 1px solid rgba(192,23,43,.4); }
.bk-him .bk-name { font: 400 22px Fraktur, serif; color: ${RED}; }
.bk-him .bk-page, .bk-him .bk-back { background: ${NOISE(.18, '.5 .1 .12')}, radial-gradient(130% 100% at 30% 20%, #1d1416 0%, #110c0d 60%, #0a0708 100%); }
.bk-him .bk-page.cur, .bk-him .bk-page.under { box-shadow: 0 0 30px rgba(192,23,43,.18), inset 6px 0 12px -6px #000; border: 1px solid #2a1a1d; }
.bk-him .bp { font: 400 17px/1.5 Fell, Georgia, serif; }
.bk-him .bp.cover { background: none; } .bk-him .cov-sub { font: italic 18px Fell, serif; color: #b98f95; }
.bk-him .bp-date { font: italic 15px Fell, serif; color: #9d8579; } .bk-him .bp-no { font: 400 15px Fell, serif; letter-spacing: 2px; color: ${RED}; }
.bk-him .bp-title { font: 400 31px/1.12 Fraktur, serif; color: ${RED}; margin: 8px 0 4px; text-shadow: 0 0 18px rgba(192,23,43,.35); }
.bk-him .bp-title::first-letter { font-size: 1.5em; }
.bk-him .bp-meta { font-style: italic; color: #9d8579; margin: 0 0 8px; }
.bk-him h3 { font: 400 22px Fraktur, serif; color: ${RED}; margin: 16px 0 6px; display: flex; align-items: center; gap: 10px; }
.bk-him h3::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(192,23,43,.6), transparent); }
.bk-him .bp-steps { list-style: upper-roman; padding-left: 34px; } .bk-him .bp-steps li::marker { color: ${RED}; font-family: Fell, serif; }
.bk-him .bp-sig { float: right; margin: 0 -4px 6px 10px; } .bk-him .sigil .spin { transform-origin: 50px 50px; animation: bkSpin 60s linear infinite; }
@keyframes bkSpin { to { transform: rotate(360deg); } }
.bk-him .bp-tape { display: inline-block; border: 1px solid rgba(192,23,43,.6); color: #e9b3b9; padding: 2px 10px; font: italic 15px Fell, serif; margin: 2px 0 6px; }
.bk-him .bp-note { font-style: italic; color: #c8b8a6; }
.bk-him .bp-perf { clear: both; margin: 20px 0 8px; padding: 12px 14px; border: 1px solid rgba(192,23,43,.45); background: rgba(192,23,43,.06); }
.bk-him .bp-perf b { font: 400 21px Fraktur, serif; color: ${RED}; }
.bk-him .pyr { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; margin-top: 6px; } .bk-him .pyr span { font: italic 14px Fell, serif; color: #9d8579; } .bk-him .pyr em { font-style: normal; }
.bk-him .bp-exif { font: 13px/1.4 ui-monospace, Consolas, monospace; color: #9d8579; letter-spacing: .5px; margin: 8px 0; } .bk-him .bp-exif span { color: ${RED}; }
.bk-him .bp-motto { text-align: center; font: italic 19px Fell, serif; color: #d9c4b0; margin: 16px 0 4px; } .bk-him .bp-motto span { display: block; font-size: 13px; color: #8b7468; }
.bk-him .bp-seal { position: absolute; top: 126px; right: 18px; width: 96px; transform: rotate(12deg); pointer-events: none; filter: drop-shadow(0 4px 6px #000); animation: bkSeal .55s .3s both cubic-bezier(.3,1.5,.5,1); }
@keyframes bkSeal { from { opacity: 0; transform: rotate(12deg) scale(1.9); } to { opacity: 1; transform: rotate(12deg) scale(1); } }
.bk-him .bp-go { background: linear-gradient(#a3122a, #7c0c1e); color: #f6d9dc; font-family: Fell, serif; font-size: 19px; box-shadow: 0 0 22px rgba(192,23,43,.35); }
.bk-him .penta { transform-origin: 126px 128px; animation: bkSpin 120s linear infinite; }
.bk-him .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: bkFlick .18s var(--d) ease-in-out infinite alternate; }
@keyframes bkFlick { from { transform: scale(1, 1) skewX(-3deg); } to { transform: scale(.92, 1.08) skewX(3deg); } }
.bk-him .glow { animation: bkGlow 1.6s var(--d) ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; } @keyframes bkGlow { from { opacity: .7; } to { opacity: 1; scale: 1.08; } }
.bk-him .eye { animation: bkEye 5s ease-in-out infinite; } @keyframes bkEye { 0%,80%,100% { opacity: .5; } 85%,95% { opacity: 1; filter: drop-shadow(0 0 3px #ff2040); } }
.bk-him .ex-k { font: 400 34px Fraktur, serif; color: ${RED}; margin: 0; } .bk-him .ex-goat { width: 46%; max-width: 180px; margin: 10px 0; overflow: visible; }
.bk-him .ex-t { font: italic 24px/1.25 Fell, serif; color: #e3cfbb; margin: 6px 0; } .bk-him .ex-s { font: 16px/1.45 Fell, serif; color: #a8907f; max-width: 300px; }
.bk-him .toc h2 { font: 400 34px Fraktur, serif; color: ${RED}; margin: 0; } .bk-him .toc li { font: 18px/1.25 Fell, serif; }
.bk-him .toc li b { color: ${RED}; font-weight: 400; } .bk-him .toc li em { border: 1px solid ${RED}; color: #e9b3b9; font-style: italic; }
.bk-him .fin-t { font: 400 48px Fraktur, serif; color: ${RED}; margin: 0; } .bk-him .fin-s { font: italic 18px Fell, serif; color: #a8907f; } .bk-him .fin-pent { width: 86%; max-width: 300px; margin-top: 14px; }
@media (prefers-reduced-motion: reduce) { .book *, .book *::before { animation: none !important; } .bk-her .herb .lf, .bk-her .herb .fl { opacity: 1; } .bk-her .herb .stem { stroke-dashoffset: 0; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('bkcss')) { const st = document.createElement('style'); st.id = 'bkcss'; st.textContent = CSS; document.head.appendChild(st); }
