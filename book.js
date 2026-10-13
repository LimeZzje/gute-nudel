// 📖 The Kochbuch as a book (2026-10-11): one book, every page in its own style — easy recipes warm (Libra, botany, their
// poodle from the photo book, the rabbit Hase), fancy ones playfully occult (red on black, sigils, perfume, photography).
// All artwork is SVG drawn here and seeded per recipe, so a page always looks the same. app.js builds the pages.
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
// their poodle, just the head (user: minimal, aesthetic): a calm flat illustration in the photo's colours — cream face,
// apricot topknot, dark grey ears with an apricot top, blue-grey neck, tan harness strap. `sleep` closes the eyes.
// cloud(): an ellipse with soft scalloped edges = curly fur without the noise
function cloud(cx, cy, rx, ry, n, rot = 0) {
  const P = Array.from({ length: n }, (_, i) => { const a = (i / n * 360 + rot) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  return 'M' + P.map((p, i) => { const q = P[(i + 1) % n], d = Math.hypot(q[0] - p[0], q[1] - p[1]) * .56; return (i ? '' : f1(p[0]) + ',' + f1(p[1]) + ' ') + `A${f1(d)},${f1(d)} 0 0 1 ${f1(q[0])},${f1(q[1])}`; }).join(' ') + 'Z';
}
function poodle(seed = 7, mood = 'sit') {
  const sleep = mood === 'sleep', L = '#cdb898', W = 1.4;
  return `<svg viewBox="0 0 120 124" class="poodle${sleep ? ' sleep' : ''}" aria-hidden="true">
    <g class="${sleep ? 'breath' : 'head'}">
    <path d="M38,92 C46,104 76,106 86,92 L92,124 L32,124 Z" fill="#a9a7a8"/>
    <path d="${cloud(62, 108, 26, 9, 9, 10)}" fill="#a9a7a8" stroke="#8f8d90" stroke-width="1"/>
    <path d="M34,112 C48,121 76,121 90,112" fill="none" stroke="#c9a87e" stroke-width="7" stroke-linecap="round"/>
    <path d="M34,112 C48,121 76,121 90,112" fill="none" stroke="#e6d2b3" stroke-width="1" stroke-dasharray="2 2.4"/>
    <g class="ear2"><path d="${cloud(88, 66, 9, 19, 9, 0)}" fill="#55504f" stroke="#3d3939" stroke-width="${W}"/></g>
    <path d="${cloud(60, 64, 28, 29, 15, 6)}" fill="#f3eadb" stroke="${L}" stroke-width="${W}"/>
    <path d="${cloud(58, 36, 22, 13, 11, 0)}" fill="#e6cba5" stroke="#d2b48a" stroke-width="${W}"/>
    <path d="${cloud(77, 74, 15, 11, 9, 20)}" fill="#f6efe4" stroke="${L}" stroke-width="${W}"/>
    <ellipse cx="66" cy="77" rx="5" ry="3" fill="#eaa1aa" opacity=".35"/>
    <ellipse cx="89" cy="69" rx="6" ry="4.8" fill="#2a2422"/><ellipse cx="87.6" cy="67.6" rx="1.8" ry="1" fill="#fff" opacity=".55"/>
    ${sleep ? `<path d="M56,60 q4,3 8,0 M71,58 q3.4,2.6 6.8,0" fill="none" stroke="#2a2422" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M74,82 q5,2 9,-1" fill="none" stroke="#7a6a60" stroke-width="1.3" stroke-linecap="round"/>`
    : `<g class="eyes"><ellipse cx="60" cy="59" rx="3.2" ry="3.5" fill="#2a2422"/><circle cx="61.2" cy="57.8" r="1.1" fill="#fff"/>
      <ellipse cx="75" cy="57" rx="2.8" ry="3.1" fill="#2a2422"/><circle cx="76" cy="56" r=".9" fill="#fff"/></g>
      <path d="M70,82 C76,87 84,86 90,78" fill="#5a2c33" stroke="#2a2422" stroke-width="1.2" stroke-linecap="round"/>
      <path class="tongue" d="M77,84 C76,94 85,95 86,87 C86,84 83,82 80,83 Z" fill="#e88b98" stroke="#c9677a" stroke-width=".8"/>`}
    <g class="ear"><path d="${cloud(34, 72, 12, 23, 11, 0)}" fill="#55504f" stroke="#3d3939" stroke-width="${W}"/>
      <path d="${cloud(36, 50, 11, 8, 8, 0)}" fill="#e6cba5" stroke="#d2b48a" stroke-width="${W}"/></g>
    </g>${sleep ? `<g class="zzz" font-family="Caveat,cursive" fill="#8a7a70"><text x="96" y="36" font-size="13">z</text><text x="104" y="24" font-size="16">z</text><text x="110" y="10" font-size="19">Z</text></g>` : ''}</svg>`;
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
    ${!ring ? '' : p.map((q, i) => `<text x="${f1(cx + (q[0] - cx) * 1.06)}" y="${f1(cy + (q[1] - cy) * 1.06 + R * .05)}" font-size="${f1(R * .13)}" text-anchor="middle" fill="${c}" stroke="none">${['☿', '♄', '♃', '♂', '♀'][i]}</text>`).join('')}</g>`;
}
// a goat's head in red line art — the house mascot of the dark kitchen
const goat = (c = RED) => `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50,30 C62,30 66,42 64,56 C62,70 56,80 50,88 C44,80 38,70 36,56 C34,42 38,30 50,30 Z" fill="#160d0f"/>
  <path d="M43,32 C30,24 20,10 33,2 C29,12 33,20 46,28" fill="#160d0f"/><path d="M57,32 C70,24 80,10 67,2 C71,12 67,20 54,28" fill="#160d0f"/>
  <path d="M37,42 C28,38 16,42 11,50 C20,52 30,50 37,47"/><path d="M63,42 C72,38 84,42 89,50 C80,52 70,50 63,47"/>
  <path d="M46,78 Q50,82 54,78"/><path d="M45,86 Q50,100 55,86"/><path d="M50,36 L50,44" stroke-width="1.4"/>
  <path d="M41,49 l6,1.5 M59,49 l-6,1.5" stroke-width="2.6"/></g>
  <circle class="eye" cx="44" cy="51" r="1.4" fill="${c}"/><circle class="eye" cx="56" cy="51" r="1.4" fill="${c}"/>`;
// the Leviathan cross (sulfur's alchemical sign: a double cross on the infinity sign) in brimstone: compact, diamond tips,
// inside a ring of flame tongues, with a sulfur glow and embers drifting up
const leviathan = () => {
  const dia = (x, y) => `<path d="M${x},${y - 4.6} L${x + 4.6},${y} L${x},${y + 4.6} L${x - 4.6},${y} Z" fill="url(#brim)" stroke="none"/>`;
  const flames = Array.from({ length: 24 }, (_, i) => `<path d="M0,-55 Q2.6,-59 0,-64.5 Q-2.6,-59 0,-55 Z" transform="rotate(${i * 15})"/>`).join('');
  const embers = [[52, 4], [86, 1.2], [64, 2.4], [96, .6], [44, 3.2], [76, 1.8]].map(([x, d], i) => `<circle class="ember" style="--d:${d}s" cx="${x}" cy="${118 - i % 3 * 6}" r="${i % 2 ? 1.1 : 1.6}" fill="#ffb347"/>`).join('');
  return `<svg viewBox="0 0 140 140" class="levi" aria-hidden="true"><defs>
  <linearGradient id="brim" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="122"><stop offset="0" stop-color="#fff1a8"/><stop offset=".45" stop-color="#ffc23a"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".32"/><stop offset=".6" stop-color="#ff5a14" stop-opacity=".08"/><stop offset="1" stop-color="#ff5a14" stop-opacity="0"/></radialGradient>
  <filter id="brimglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <circle cx="70" cy="70" r="68" fill="url(#halo)"/>
  <g transform="translate(70 70)"><g fill="#ff8a2a" opacity=".55" class="flames">${flames}</g></g>
  <circle cx="70" cy="70" r="53" fill="none" stroke="url(#brim)" stroke-width="1.6" opacity=".85"/><circle cx="70" cy="70" r="49" fill="none" stroke="url(#brim)" stroke-width=".6" opacity=".55"/>
  <g filter="url(#brimglow)"><g fill="none" stroke="url(#brim)" stroke-width="5" stroke-linecap="butt">
  <path d="M70,27 V101"/><path d="M57,43 H83"/><path d="M50,59 H90"/>
  <path d="M70,101 C64,92 46,91 46,101 C46,111 64,110 70,101 C76,92 94,91 94,101 C94,111 76,110 70,101 Z" stroke-width="4.6" stroke-linejoin="round"/></g>
  ${dia(70, 24)}${dia(54.5, 43)}${dia(85.5, 43)}${dia(47.5, 59)}${dia(92.5, 59)}</g>${embers}</svg>`;
};
const candle = (x, y, h, i = 0) => `<g transform="translate(${x} ${y})">
  <ellipse class="glow" cx="0" cy="-${h + 10}" rx="26" ry="30" fill="url(#cglow)" style="--d:${i * .37}s"/>
  <path d="M-7,0 V-${h} Q-7,-${h + 3} -3,-${h + 2} Q0,-${h + 4} 3,-${h + 2} Q7,-${h + 3} 7,-${h} V0 Z" fill="${BONE}"/>
  <path d="M-7,-${h - 2} q2,8 0,14 M4,-${h - 1} q2,5 1,9" stroke="#cdbfa9" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M0,-${h + 2} v-4" stroke="#2a2124" stroke-width="1.2"/>
  <path class="flame" style="--d:${i * .29}s" d="M0,-${h + 21} C5,-${h + 13} 5,-${h + 7} 0,-${h + 5} C-5,-${h + 7} -5,-${h + 13} 0,-${h + 21} Z" fill="#ffcf6b"/>
  <path class="flame" style="--d:${i * .29}s" d="M0,-${h + 15} C2.4,-${h + 11} 2.4,-${h + 8} 0,-${h + 7} C-2.4,-${h + 8} -2.4,-${h + 11} 0,-${h + 15} Z" fill="#fff4d6"/></g>`;
// a real sigil, made the classic way (user's choice): the recipe's name without vowels and repeated letters; those letters
// drawn on top of each other (each one turned or mirrored) into a single glyph. The letters stand underneath.
// the sigil wheel: the consonants sit around a circle; the line runs from letter to letter in the name's order,
// starting with a small circle and ending with a bar
const WHEEL = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
// the "star" of the dish: what comes before "mit", "auf", "&", ":" … (Kirschtomaten-Confit mit … → KRSCHTMTN CNFT)
const starOf = title => String(title).split(/\s+(?:mit|auf|an|am|in|im|und|vom|von|aus|nach|zu|über|unter)\s+|\s*[,:–(]\s*|\s+&\s+/i)[0];
const sigilWords = title => starOf(title).toUpperCase().replace(/ß/g, 'S').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^A-Z]+/)
  .map(w => w.replace(/[AEIOU]/g, '').split('').filter(c => WHEEL.includes(c)).join('')).filter(Boolean);
function sigil(name, size = 92) {
  const W = sigilWords(name), L = W.join('').split('').filter((c, i, a) => c !== a[i - 1]), pos = c => { const a = (WHEEL.indexOf(c) / WHEEL.length * 360 - 90) * Math.PI / 180; return [50 + Math.cos(a) * 33, 50 + Math.sin(a) * 33]; };
  const P = L.map(pos), [s0, e] = [P[0] || [50, 50], P[P.length - 1] || [50, 50]], prev = P[P.length - 2] || [50, 50];
  const ang = Math.atan2(e[1] - prev[1], e[0] - prev[0]), bx = Math.cos(ang + Math.PI / 2) * 5, by = Math.sin(ang + Math.PI / 2) * 5;
  const rim = WHEEL.map((c, i) => { const a = (i / WHEEL.length * 360 - 90) * Math.PI / 180; return `<text x="${f1(50 + Math.cos(a) * 42)}" y="${f1(50 + Math.sin(a) * 42 + 2)}" text-anchor="middle" font-size="5.2" fill="${RED}" opacity="${L.includes(c) ? .95 : .35}">${c}</text>`; }).join('');
  return `<figure class="sigil-fig"><svg viewBox="0 0 100 100" width="${size}" height="${size}" class="sigil" aria-hidden="true"><g fill="none" stroke="${RED}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="50" r="47.5" stroke-width=".9"/><circle cx="50" cy="50" r="37" stroke-width=".5" opacity=".5"/>
    ${P.length > 1 ? `<polyline points="${P.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" stroke-width="1.8"/>` : ''}
    <circle cx="${f1(s0[0])}" cy="${f1(s0[1])}" r="3" stroke-width="1.5"/><path d="M${f1(e[0] - bx)},${f1(e[1] - by)} L${f1(e[0] + bx)},${f1(e[1] + by)}" stroke-width="1.8"/></g>
    <g font-family="Fell, Georgia, serif">${rim}</g></svg><figcaption>${W.join(' ')}</figcaption></figure>`;
}
// how the dish really smells: only aromas of what's in it (and how it's cooked), sorted by how fleeting they are —
// head notes fade first (citrus, herbs, onion), heart notes carry the dish (spices, meat, veg), base notes linger (roast, nut, cocoa)
const AROMA = [
  [/orange/, 'Orange', 0], [/zitron/, 'Zitrone', 0], [/limett/, 'Limette', 0], [/yuzu/, 'Yuzu', 0], [/basilikum/, 'Basilikum', 0], [/petersilie/, 'Petersilie', 0],
  [/schnittlauch/, 'Schnittlauch', 0], [/dill/, 'Dill', 0], [/minze/, 'Minze', 0], [/koriander/, 'Koriander', 0], [/ingwer/, 'Ingwer', 0], [/knoblauch/, 'Knoblauch', 0],
  [/zwiebel|lauch/, 'Zwiebel', 0], [/balsamico/, 'Balsamico', 0], [/essig/, 'Essig', 0], [/apfel/, 'Apfel', 0], [/tomate/, 'Tomate', 0], [/gurke/, 'Gurke', 0],
  [/garnele|lachs|fisch|thunfisch/, 'Meer', 0], [/pfeffer/, 'Pfeffer', 0], [/chili/, 'Chili', 0],
  [/lorbeer/, 'Lorbeer', 1], [/thymian/, 'Thymian', 1], [/rosmarin/, 'Rosmarin', 1], [/salbei/, 'Salbei', 1], [/curry/, 'Curry', 1], [/kreuzkümmel/, 'Kreuzkümmel', 1],
  [/kümmel/, 'Kümmel', 1], [/paprika/, 'Paprika', 1], [/zimt/, 'Zimt', 1], [/muskat/, 'Muskat', 1], [/spinat/, 'Spinat', 1], [/kohl|kraut/, 'Kohl', 1],
  [/hähnchen|huhn|pute/, 'Brathähnchen', 1], [/hack|rind|schwein|braten|wurst|würstchen|speck|schinken/, 'Gebratenes', 1], [/banane/, 'Banane', 1],
  [/honig/, 'Honig', 1], [/sahne|milch|frischkäse|quark|schmand/, 'Sahne', 1], [/\beier?\b/, 'Ei', 1], [/kokos/, 'Kokos', 1],
  [/schokolade|kakao/, 'Kakao', 2], [/vanille/, 'Vanille', 2], [/nüsse|nuss|mandel/, 'geröstete Nüsse', 2], [/champignon|pilz/, 'Pilze', 2],
  [/käse|parmesan|feta|mozzarella/, 'Käse', 2], [/kartoffel/, 'Kartoffel', 2], [/brot|toast|brötchen|knödel|baguette/, 'Brot', 2], [/butter/, 'Butter', 2], [/reis/, 'Reis', 2],
];
function pyramid(r) {
  const t = [[], [], []], add = (tier, n) => { if (!t[tier].includes(n)) t[tier].push(n); };
  for (const [, name] of r.ing) { const n = String(name).toLowerCase(); for (const [re, note, tier] of AROMA) if (re.test(n)) { add(tier, note); break; } }
  const steps = r.steps.map(s => s[0]).join(' ').toLowerCase();
  if (/nussbraun|beurre noisette|braune butter/.test(steps) && t[2].includes('Butter')) t[2][t[2].indexOf('Butter')] = 'Nussbutter';
  if (/anbrat|goldbraun|knusprig|rösten|röst|scharf an/.test(steps)) add(2, 'Röstaromen');
  if (/karamell/.test(steps)) add(2, 'Karamell');
  return t.map(x => x.slice(0, 4));
}

const seal = (text = 'PERACTUM', sub = '') => `<svg viewBox="0 0 120 120" class="seal" aria-hidden="true"><defs><radialGradient id="sg" cx="40%" cy="35%"><stop offset="0" stop-color="#d23a46"/><stop offset=".7" stop-color="#9c1424"/><stop offset="1" stop-color="#6e0b17"/></radialGradient></defs>
  <path d="${Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, rr = i % 2 ? 50 : 56; return (i ? 'L' : 'M') + f1(60 + Math.cos(a) * rr) + ',' + f1(60 + Math.sin(a) * rr); }).join(' ')} Z" fill="url(#sg)"/>
  <circle cx="60" cy="60" r="38" fill="none" stroke="#5e0912" stroke-width="2.5" opacity=".7"/><circle cx="60" cy="60" r="31" fill="none" stroke="#e86b76" stroke-width="1" opacity=".5"/>
  <path d="M46,42 L74,78 M74,42 L46,78" stroke="#5e0912" stroke-width="4" stroke-linecap="round" opacity=".7"/><path d="M71,40 q8,2 6,10 l-6,-6 M46,42 v6 M42,42 v5 M50,42 v5" stroke="#5e0912" stroke-width="2" fill="none" opacity=".7"/>
  <text x="60" y="${sub ? 98 : 101}" text-anchor="middle" font-family="Fell, serif" font-size="11" fill="#f3c9cd" letter-spacing="1.5">${esc(text)}</text>${sub ? `<text x="60" y="30" text-anchor="middle" font-size="14">${esc(sub)}</text>` : ''}</svg>`;
const MOTTO = [['Per ignem ad saporem.', 'Durchs Feuer zum Geschmack.'], ['Butyrum vincit omnia.', 'Butter besiegt alles.'], ['Memento mori, memento salis.', 'Denk an den Tod. Und ans Salz.'],
  ['Fames est optimus coquus.', 'Hunger ist der beste Koch.'], ['Coquo, ergo sum.', 'Ich koche, also bin ich.'], ['Ex tenebris sapor.', 'Aus der Dunkelheit: Geschmack.'],
  ['Nulla dies sine butyro.', 'Kein Tag ohne Butter.'], ['Carpe cenam.', 'Nutze das Abendessen.'], ['In nomine pfefferi.', 'Im Namen des Pfeffers.'],
  ['Ignis purgat, sal servat.', 'Feuer reinigt, Salz bewahrt.'], ['Ora et coque.', 'Bete und koche.'], ['Lux in culina.', 'Licht in der Küche.'], ['Gula non est peccatum hodie.', 'Völlerei ist heute keine Sünde.']];

// =====================================================================================================================
// the Kochbuch as ONE book (2026-10-11, user): thumb-index tabs Daheim · Jetzt · Nächstes Mal · Gekocht on the right edge,
// every page has its own style — easy recipes warm ("her"), fancy ones playfully occult ("him"). app.js makes the pages
// ({key, theme, html}); this module draws the frame and turns the pages (drag, tap the outer edges, ‹ ›, or Bk.flipTo).
// =====================================================================================================================
// the little extras on a recipe page, by style
export function deco(theme, r, o = {}) {
  const h = hash(r.id);
  if (theme === 'kid') return kidDeco(r, o, h);
  if (theme === 'her') {
    const P = PLANTS[h % PLANTS.length], k = (h >>> 3) % 3;
    return {
      side: `<figure class="bp-plant">${plant(h)}<figcaption>${P.n}<br><i>${P.l}</i></figcaption></figure>`,
      stamp: o.cooked ? `<div class="bp-stamp"><span>gekocht!</span><b>${o.taste || '✓'}</b></div>` : '',
      foot: `<div class="bp-horo"><b>♎︎ Waage-Horoskop</b><span>${HORO[(h >>> 4) % HORO.length]}</span></div>
        <div class="bp-doodle">${k === 0 ? `<div class="dd-dog">${poodle(h)}</div>` : k === 1 ? bunnyHop() : `<div class="dd-peek">${bunnyPeek()}</div>`}</div>`,
    };
  }
  const [top, heart, base] = pyramid(r), [mo, tr] = MOTTO[(h >>> 6) % MOTTO.length];
  return {
    side: `<div class="bp-sig">${sigil(r.title)}</div>`,
    stamp: o.cooked ? `<div class="bp-seal">${seal('PERACTUM', o.taste)}</div>` : '',
    foot: (top.length + heart.length + base.length ? `<div class="bp-perf"><b>✠ Duftpyramide</b><div class="pyr">${[['Kopf', top], ['Herz', heart], ['Basis', base]].filter(([, x]) => x.length).map(([l, x]) => `<span>${l}</span><em>${x.map(esc).join(' · ')}</em>`).join('')}</div><p class="pyr-note">So riecht es wirklich – aus den Zutaten, von flüchtig bis bleibend.</p></div>` : '')
      + `<p class="bp-motto">${mo} <span>${tr}</span></p>`,
  };
}
// ---------- 🖍️ picture book ("kid", 2026-10-12, user's pick): Claude's easy recipes + their shelf "Kinderleicht" (internal key 'herb'), their rows everywhere ----------
// crayon on drawing paper: a wobbly, waxy stroke (turbulence → displacement, speckled gaps), pastel crayons, Patrick Hand titles
const CRAY = ['#e8645f', '#4a90d9', '#f2b632', '#5bb36a', '#9b6bd0', '#f08a3c'];
const crayF = id => `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="3" result="d"/><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="7" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>`;
const sun = () => `<svg viewBox="0 0 120 90" class="kd-sun" aria-hidden="true"><defs>${crayF('crs')}</defs><g filter="url(#crs)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <g class="rays" stroke="${CRAY[2]}" stroke-width="3.4">${Array.from({ length: 10 }, (_, i) => `<path d="M0,-25 L0,-34" transform="translate(40 36) rotate(${i * 36})"/>`).join('')}</g>
  <circle cx="40" cy="36" r="18" fill="#ffe27a" stroke="${CRAY[5]}" stroke-width="3"/><path d="M33,33 v2 M47,33 v2 M33,41 Q40,47 47,41" stroke="#8a4b1d" stroke-width="2.4"/>
  <path class="cloud" d="M62,70 Q58,58 70,57 Q73,46 86,50 Q96,44 102,55 Q114,56 111,68 Q110,74 100,73 L70,74 Q62,75 62,70 Z" fill="#fff" stroke="${CRAY[1]}" stroke-width="3"/></g></svg>`;
const meadow = h => { const fl = [0, 1, 2, 3].map(i => { const x = 24 + i * 70 + (h >>> i * 3) % 30, c = CRAY[(h >>> i * 2) % CRAY.length], y = 30 + (h >>> i) % 10;
  return `<path d="M${x},74 Q${x - 3},${y + 20} ${x},${y}" stroke="${CRAY[3]}" stroke-width="2.6"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${x}" cy="${y - 7}" rx="4" ry="7" fill="${c}" stroke="${c}" stroke-width="1.5" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="3.6" fill="#ffe27a" stroke="${CRAY[5]}" stroke-width="1.5"/>`; }).join('');
  const grass = Array.from({ length: 30 }, (_, i) => `M${i * 11 + 2},76 l${3 + i % 3},-${8 + (h >>> i % 20) % 8}`).join(' ');
  return `<svg viewBox="0 0 330 80" class="kd-meadow" aria-hidden="true"><defs>${crayF('crm')}</defs><g filter="url(#crm)" fill="none" stroke-linecap="round"><path d="${grass}" stroke="${CRAY[3]}" stroke-width="2.6"/>${fl}
  <g class="bug" transform="translate(${200 + h % 60} 64)"><circle r="6" fill="${CRAY[0]}" stroke="#3d3a4a" stroke-width="1.6"/><path d="M0,-6 V6" stroke="#3d3a4a" stroke-width="1.4"/><circle cx="-2.5" cy="-1" r="1.2" fill="#3d3a4a"/><circle cx="2.6" cy="2" r="1.2" fill="#3d3a4a"/></g></g></svg>`; };
// the crayon box behind cards (border-image; works on iOS, no CSS filter needed)
const crayBox = c => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><defs>${crayF('c').replace(/"/g, "'")}</defs><rect x='4' y='4' width='52' height='52' rx='14' fill='none' stroke='${c}' stroke-width='3.6' filter='url(#c)'/></svg>`)}")`;
const kidDeco = (r, o, h) => ({
  side: `<div class="kd-pic"><span>${esc(r.icon || '🍽️')}</span></div>`,
  stamp: o.cooked ? `<div class="kd-sticker"><span>Lecker!</span><b>${o.taste || '★'}</b></div>` : '',
  foot: `<div class="kd-foot">${meadow(h)}</div>`,
});

// a little picture for the top of each section page
export const sectionArt = k => k === 'jetzt' ? `<div class="sa-dog">${poodle(7)}</div>` : k === 'gekocht' ? `<div class="sa-dog">${poodle(9, 'sleep')}</div>`
  : k === 'daheim' ? `<div class="sa-peek">${bunnyPeek()}</div>` : k === 'codex' ? `<div class="sa-pent">${leviathan()}</div>` : k === 'herb' ? `<div class="sa-sun">${sun()}</div>` : `<div class="sa-sc">${scales()}</div>`;

let A = null;                      // the app's side: at(i) → page, i(), n(), onTurn(i), label(), tab()
const keep = { key: '', top: 0 };  // the open page's scroll position survives re-renders
const pageEl = (p, cls) => `<div class="bk-page ${cls} bp-${p.theme}" data-key="${esc(p.key)}"><div class="bp">${p.html}</div></div>`;
export function frame({ tabs, cur, page, label }) {
  return `<div class="cbook" id="cbook"><div class="cb-body"><div class="bk-stage" id="bkstage">${pageEl(page, 'cur')}</div>
    <div class="cb-tabs">${tabs.map(([k, l, c, cl], i) => `${cl && !(tabs[i - 1] || [])[3] ? '<span class="cb-gap" aria-hidden="true"></span>' : ''}<button class="cb-tab ${k === cur ? 'on' : ''}${cl ? ' cl' : ''}" data-a="ktab" data-v="${k}" style="--tc:${c}"><span>${cl ? '<i class="tk">✦ </i>' : ''}${l}</span></button>`).join('')}</div></div>
    <div class="bk-foot"><button data-bk="prev" aria-label="Zurückblättern">‹</button><span id="bkno">${esc(label)}</span><button data-bk="next" aria-label="Weiterblättern">›</button></div></div>`;
}
function fit() {   // the book fills the screen between the sub-tabs and the bottom bar; its pages scroll inside
  const cb = document.getElementById('cbook'); if (!cb) return;
  const nav = document.getElementById('tabs'), top = cb.getBoundingClientRect().top + scrollY;
  cb.style.height = Math.max(300, innerHeight - top - (nav ? nav.offsetHeight : 0) - 6) + 'px';
  // small phones (user, 2026-10-13): side bookmarks ran off the bottom and squeezed the page → bookmarks along the top edge instead
  cb.classList.remove('cb-top');
  const tabs = cb.querySelector('.cb-tabs'), body = cb.querySelector('.cb-body');
  if (!(innerWidth < 390 || (tabs && body && tabs.scrollHeight > body.clientHeight))) return;
  cb.classList.add('cb-top');
  // labels shrink together until every one fits (no "Stöbe…")
  const spans = [...tabs.querySelectorAll('.cb-tab span')];
  for (let k = 1; k >= .7; k -= .05) { tabs.style.setProperty('--tk', k); if (!spans.some(x => x.scrollWidth > x.clientWidth + 1)) break; }
}
let resizeOn = false;
export function mount(api) {
  const st = document.getElementById('bkstage'); if (!st) return;
  A = api; fit();
  if (!resizeOn) { resizeOn = true; addEventListener('resize', fit); }
  const cur = st.querySelector('.bk-page.cur');
  if (cur.dataset.key === keep.key) { cur.classList.add('still'); cur.scrollTop = keep.top; } else { keep.key = cur.dataset.key; keep.top = 0; }
  cur.addEventListener('scroll', () => { keep.top = cur.scrollTop; }, { passive: true });
  syncChrome();
  if (st._m) return; st._m = true;
  const book = document.getElementById('cbook');
  book.addEventListener('click', e => {
    const b = e.target.closest('[data-bk]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); turn(b.dataset.bk === 'next' ? 1 : -1);
  }, true);
  let g = null;
  st.addEventListener('pointerdown', e => { if (busy || e.button || e.target.closest('input,textarea,select')) return; g = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, dir: 0 }; });
  st.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.dir) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.3) { if (Math.abs(dy) > 12) g = null; return; }
      const dir = dx < 0 ? 1 : -1, to = A.i() + dir; if (to < 0 || to >= A.n()) { g = null; return; }
      g.dir = dir; g.flip = start(dir, A.at(to), to); try { st.setPointerCapture(e.pointerId); } catch (x) {}
    }
    g.p = Math.max(0, Math.min(1, (g.dir > 0 ? -dx : dx) / (st.clientWidth * .9))); g.flip.set(g.p);
  });
  const up = e => {
    if (!g || e.pointerId !== g.id) return;
    const t = g; g = null;
    if (!t.dir) {   // a tap on the outer edges turns too (buttons and links inside keep working)
      if (Date.now() - t.t > 400 || e.target.closest('button,a,input,label,form')) return;
      const x = e.clientX - st.getBoundingClientRect().left, w = st.clientWidth;
      if (x > w * .86) turn(1); else if (x < w * .1) turn(-1);
      return;
    }
    t.flip.finish(t.p > .3 || Math.abs(e.clientX - t.x) / Math.max(1, Date.now() - t.t) > .6);
  };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', () => { if (g && g.flip) g.flip.finish(false); g = null; });
}
function syncChrome() {   // page label + which thumb tab sticks out
  const no = document.getElementById('bkno'); if (no && A) no.textContent = A.label();
  if (A) document.querySelectorAll('.cb-tab').forEach(b => b.classList.toggle('on', b.dataset.v === A.tab()));
  const p = document.querySelector('[data-bk="prev"]'), n = document.querySelector('[data-bk="next"]');
  if (p && A) p.disabled = A.i() <= 0; if (n && A) n.disabled = A.i() >= A.n() - 1;
}
let busy = false;
// dir 1: the open page turns away to the left, `page` lies under it · dir -1: `page` comes back over the open one
function start(dir, page, to, own) {
  busy = true;
  const st = document.getElementById('bkstage'), cur = st.querySelector('.bk-page.cur');
  const tmp = document.createElement('div'); tmp.innerHTML = pageEl(page, ''); const other = tmp.firstElementChild;
  const leaf = dir > 0 ? cur : other, under = dir > 0 ? other : cur;
  if (dir > 0) st.insertBefore(other, cur); else st.appendChild(other);
  leaf.classList.add('leaf'); under.classList.add('under');
  const back = document.createElement('div'); back.className = 'bk-back'; leaf.appendChild(back);
  const shade = document.createElement('div'); shade.className = 'bk-shade'; under.appendChild(shade);
  const set = p => {
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
        const stay = done ? other : cur, drop = done ? cur : other;
        drop.remove(); stay.className = stay.className.replace(/\b(leaf|under)\b/g, '').trim(); stay.classList.add('cur');
        stay.style.transform = ''; stay.style.transition = '';
        stay.querySelectorAll(':scope > .bk-back, :scope > .bk-shade').forEach(x => x.remove());
        if (done) {
          keep.key = stay.dataset.key; keep.top = 0; stay.scrollTop = 0;
          stay.addEventListener('scroll', () => { keep.top = stay.scrollTop; }, { passive: true });
          if (!own) A.onTurn(to);
        }
        busy = false; syncChrome();
      }, 400);
    },
  };
}
function turn(dir) { if (!A || busy) return; const to = A.i() + dir; if (to < 0 || to >= A.n()) return; start(dir, A.at(to), to).finish(true); }
// the app already moved on (a tab, a recipe from the list): show `page` with one turn
export function flipTo(page, dir) {
  if (busy || !document.getElementById('bkstage')) return false;
  start(dir, page, null, true).finish(true); return true;
}

// ---------- styles ----------
const NOISE = (a, c = '0 0 0') => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 ${c.split(' ')[0]} 0 0 0 0 ${c.split(' ')[1]} 0 0 0 0 ${c.split(' ')[2]} 0 0 0 ${a} 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`;
const HER_PAPER = `${NOISE(.07, '.35 .25 .1')}, linear-gradient(90deg, #efe3cf 0, #fbf5ea 4%, #fbf5ea 95%, #f2e8d6 100%)`;
const KID_PAPER = `${NOISE(.045, '.3 .3 .4')}, linear-gradient(180deg, #e9f4ff 0, #fbfdff 170px, #fffef9 100%)`;
const HIM_PAPER = `${NOISE(.16, '.5 .1 .12')}, radial-gradient(130% 100% at 30% 20%, #1e1517 0%, #141011 60%, #0d0a0b 100%)`;
const CSS = `
.cbook { display: flex; flex-direction: column; margin: 0 -6px; }
.cb-body { flex: 1; display: flex; min-height: 0; gap: 0; }
.bk-stage { position: relative; flex: 1; perspective: 1700px; touch-action: pan-y; min-width: 0; }
.bk-page { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; border-radius: 4px 10px 10px 4px; transform-origin: left center; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform-style: preserve-3d; overscroll-behavior: contain; }
.bk-page.cur, .bk-page.under { box-shadow: 0 6px 20px rgba(60,40,20,.2), inset 6px 0 10px -6px rgba(60,40,20,.35); }
.bk-page.leaf { z-index: 3; overflow: hidden; box-shadow: calc(var(--sh, 0) * 40px) 0 30px rgba(0,0,0,calc(var(--sh, 0) * .5)); }
.bk-page.leaf::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(0,0,0,calc(var(--sh,0) * .35)), transparent 40%, rgba(255,255,255,calc(var(--sh,0) * .25)) 85%, transparent); }
.bk-back { position: absolute; inset: 0; transform: rotateY(180deg); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.bk-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, #000 0%, rgba(0,0,0,.4) 60%, rgba(0,0,0,.1)); opacity: 0; z-index: 2; }
.bp { min-height: 100%; padding: 16px 14px 22px 18px; position: relative; box-sizing: border-box; }
.still .herb .stem, .still .herb .lf, .still .herb .fl, .still .bp-stamp, .still .bp-seal { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; }
/* thumb index */
.cb-tabs { display: flex; flex-direction: column; gap: 6px; padding-top: 18px; width: 34px; flex: none; }
.cb-tab { border: 0; cursor: pointer; padding: 12px 0; border-radius: 0 10px 10px 0; background: var(--tc); color: #fff; font: 800 13px/1 Nunito, sans-serif; letter-spacing: .03em;
  box-shadow: 2px 2px 6px rgba(0,0,0,.15); opacity: .72; transform: translateX(-6px); transition: transform .2s, opacity .2s; text-shadow: 0 1px 1px rgba(0,0,0,.25); }
.cb-tab span { writing-mode: vertical-rl; display: inline-block; }
.cb-tab.on { opacity: 1; transform: translateX(0); width: 34px; }
.cb-gap { height: 14px; flex: none; }   /* Claude's two shelves sit a little apart (user: no label, just space) */
.bk-foot { display: flex; align-items: center; justify-content: space-between; padding: 6px 2px 0; gap: 8px; }
.bk-foot button { border: 0; border-radius: 999px; width: 54px; height: 38px; font: 800 24px/1 Nunito, sans-serif; background: var(--paper2); color: var(--ink); cursor: pointer; }
.bk-foot button:disabled { opacity: .3; }
#bkno { font: 700 14px Nunito, sans-serif; color: var(--ink2); text-align: center; flex: 1; white-space: nowrap; overflow: hidden; }
/* section pages */
.sec-head { display: flex; align-items: flex-end; gap: 10px; margin: 0 0 10px; }
.sec-head h2 { flex: 1; margin: 0; font: 700 30px/1.1 'Dancing Script', Caveat, cursive; color: #5f7d5a; }
.sec-head .sa-dog { width: 74px; } .sec-head .sa-peek { width: 56px; } .sec-head .sa-sc { width: 70px; } .sec-head .sa-pent { width: 96px; margin: -10px -6px -8px 0; } .levi { overflow: visible; animation: bkSmoulder 3.6s ease-in-out infinite; } 
.levi .ember { opacity: 0; animation: bkEmber 4.4s var(--d, 0s) ease-out infinite; } @keyframes bkEmber { 0% { opacity: 0; transform: translateY(0); } 15% { opacity: .95; } 100% { opacity: 0; transform: translate(4px, -84px); } }
.levi .flames { transform-origin: 0 0; transform-box: view-box; animation: bkSpin 90s linear infinite; }   /* inner group: the spin must not replace the translate */
@keyframes bkSmoulder { 0%,100% { opacity: .85; filter: drop-shadow(0 0 3px rgba(255,140,30,.35)); } 50% { opacity: 1; filter: drop-shadow(0 0 9px rgba(255,150,40,.7)); } }
.sec-head.plain { margin: 4px 4px 12px; }
.sec-head.codex > div:first-child { flex: 1; } .bp-him .sec-head h2 { text-transform: uppercase; letter-spacing: .07em; line-height: 1.12; font: 400 30px Fell, Georgia, serif; color: #ff4a5c; text-shadow: 0 0 16px rgba(192,23,43,.35); }
.bp-him .sec-title { color: #ff6b7a; font-family: Fell, Georgia, serif; }
/* the Codex bookmark: black with a subtle brimstone glow */
.cb-tab[data-v="herb"] { background: linear-gradient(180deg, #7f9c6e, #5f7d5a); font-family: 'Dancing Script', Caveat, cursive; font-size: 16px; font-weight: 700; letter-spacing: .02em; animation: bkLeaf 4.2s ease-in-out infinite; }
@keyframes bkLeaf { 0%,100% { box-shadow: 2px 2px 6px rgba(0,0,0,.15), 0 0 5px rgba(170,210,140,.25); } 50% { box-shadow: 2px 2px 6px rgba(0,0,0,.15), 0 0 12px 2px rgba(170,215,140,.55); } }
.rstamp.herb { color: #5f8a4f; border-style: dashed; }
.cb-tab[data-v="codex"] { background: linear-gradient(180deg, #2a0f13, #12080a); color: #ff6a4a; font-family: Fell, Georgia, serif; font-weight: 400; font-size: 12.5px; letter-spacing: .06em; text-shadow: 0 0 6px rgba(255,90,40,.6); animation: bkBrim 3.2s ease-in-out infinite; }
@keyframes bkBrim { 0%,100% { box-shadow: 2px 2px 6px rgba(0,0,0,.2), 0 0 6px rgba(255,80,20,.25); } 50% { box-shadow: 2px 2px 6px rgba(0,0,0,.2), 0 0 14px 2px rgba(255,110,30,.45); } }
/* rows: his recipes in the occult look, stamps on the rows */
.recipe-row.row-him { background: linear-gradient(135deg, #1d1416, #110c0d); color: #f1e8dc; border: 1px solid rgba(192,23,43,.45); }
.recipe-row.row-him b { font-family: Fell, Georgia, serif; font-weight: 400; font-size: 1.08em; color: #ff8593; } .recipe-row.row-him .muted { color: #bba99b; }
.rstamp { display: inline-block; margin-top: 4px; padding: 1px 8px; border: 2px solid currentColor; border-radius: 6px; font-weight: 800; font-size: 12.5px; transform: rotate(-2deg); }
.rstamp.shop { color: #3f7fbf; } .rstamp.home { color: #4f9a5b; } .rstamp.pantry { color: #ff6a4a; border-style: double; border-width: 3px; font-family: Fell, Georgia, serif; font-weight: 400; font-size: 13.5px; }
.bp .ccats { flex-wrap: wrap; margin: 0 0 10px; } .bp .ccats .chip { white-space: nowrap; }
.rsrow { display: flex; gap: 6px; align-items: center; margin: 0 0 12px; } .rsrow .rsearch { margin: 0; flex: 1; min-width: 0; }
.rsrow .ricon { flex: none; width: 46px; height: 46px; border-radius: 14px; border: 2px solid var(--line); background: var(--card); font-size: 20px; cursor: pointer; }
.ccats .chip:disabled { opacity: .4; } .ccats .chip .cnt { font-size: .8em; opacity: .7; }
/* shared bits of a recipe page */
.bp-ing { list-style: none; padding: 0; margin: 0; }
.bp-go { display: block; width: 100%; margin: 14px 0 4px; }
.bp-head { display: flex; justify-content: space-between; align-items: baseline; }
.bp > .row .btn { flex: none; padding: 8px 16px; font-size: 15px; }

/* ---------------- warm (hers) ---------------- */
.bp-her { --card: rgba(255,253,248,.7); --ink: #4a3b36; --ink2: #85766c; --line: #e8dccb; --paper: #fbf5ea; --paper2: #f1e7d6; --shadow: none; color: var(--ink); background: ${HER_PAPER}; }
.bp-her .bk-back { background: ${HER_PAPER}; }
.bp-her .bp { font: 500 16px/1.5 Nunito, sans-serif; }
.bp-her .card { border: 1px solid #ecdfcc; }
.bp-her .bp-title { font: 700 30px/1.15 'Dancing Script', Caveat, cursive; color: #5f7d5a; margin: 4px 0 2px; }
.bp-her .bp-meta { margin: 0 0 6px; color: var(--ink2); font-weight: 700; }
.bp-her .card h3 { font: 700 23px Caveat, cursive; color: #c97f86; margin: 0 0 4px; }
.bp-her .bp-plant { float: right; width: 90px; margin: -4px -4px 4px 8px; text-align: center; transform: rotate(4deg); position: relative; }
.bp-her .bp-plant::before { content: ''; position: absolute; top: -2px; left: 26px; width: 40px; height: 13px; background: rgba(231,162,169,.45); transform: rotate(-6deg); z-index: 1; }
.bp-her .bp-plant svg { width: 90px; height: 140px; }
.bp-her .bp-plant figcaption { font: 600 15px/1.1 Caveat, cursive; color: #7a6a60; } .bp-her .bp-plant figcaption i { font-size: 13px; opacity: .8; }
.bp-her .herb .stem { stroke-dasharray: 1; stroke-dashoffset: 1; animation: bkDraw 1.4s .1s ease-out forwards; }
.bp-her .herb .lf, .bp-her .herb .fl { opacity: 0; transform-box: fill-box; transform-origin: 50% 100%; animation: bkGrow .6s var(--d, .3s) ease-out forwards; }
@keyframes bkDraw { to { stroke-dashoffset: 0; } } @keyframes bkGrow { from { opacity: 0; scale: .2; } to { opacity: 1; scale: 1; } }
.bp-her .bp-tape { display: inline-block; background: rgba(147,173,127,.4); padding: 2px 12px; font: 700 17px Caveat, cursive; transform: rotate(-2deg); margin: 2px 0 6px; }
.bp-her .bp-note { font: 600 19px/1.3 Caveat, cursive; color: #7a6a60; margin: 6px 0; }
.bp-her .bp-horo { clear: both; margin: 16px 0 4px; padding: 12px 14px; border-radius: 14px; background: linear-gradient(135deg, #f7e9ee, #efeaf7); border: 1px solid #ead8df; }
.bp-her .bp-horo b { display: block; font: 700 21px 'Dancing Script', cursive; color: #a77fb0; } .bp-her .bp-horo span { font: 600 18px/1.3 Caveat, cursive; }
.bp-her .bp-stamp { float: right; clear: right; margin: 2px 10px 8px 8px; width: 80px; height: 80px; border: 3px solid rgba(201,127,134,.75); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-14deg); color: rgba(201,127,134,.9); pointer-events: none; animation: bkStamp .5s .3s both cubic-bezier(.3,1.6,.5,1); }
.bp-her .bp-stamp span { font: 700 19px 'Dancing Script', cursive; } .bp-her .bp-stamp b { font-size: 20px; }
@keyframes bkStamp { from { opacity: 0; transform: rotate(-14deg) scale(1.8); } to { opacity: 1; transform: rotate(-14deg) scale(1); } }
.bp-her .bp-doodle { margin-top: 10px; height: 74px; position: relative; overflow: hidden; }
.bp-her .dd-dog { width: 60px; margin-left: auto; } .bp-her .dd-peek { width: 60px; margin: 18px auto 0; }
.hopline { position: absolute; inset: 0; } .bunny.hop { position: absolute; bottom: 4px; width: 54px; animation: bkHop 7s linear infinite; }
@keyframes bkHop { 0% { left: -60px; transform: translateY(0); } 4%,12%,20%,28%,36%,44%,52%,60%,68%,76%,84%,92% { transform: translateY(-16px); } 8%,16%,24%,32%,40%,48%,56%,64%,72%,80%,88%,96% { transform: translateY(0); } 100% { left: 105%; } }
.bunny .ears { transform-origin: 44px 44px; animation: bkTwitch 4s ease-in-out infinite; }
@keyframes bkTwitch { 0%,86%,100% { transform: rotate(0); } 90% { transform: rotate(-6deg); } 94% { transform: rotate(4deg); } }
.poodle .head { transform-origin: 60px 110px; animation: bkTilt 7s ease-in-out infinite; } @keyframes bkTilt { 0%,70%,100% { transform: rotate(0); } 78%,88% { transform: rotate(-6deg); } }
.poodle .eyes { transform-origin: 68px 58px; animation: bkBlink 5s infinite; } @keyframes bkBlink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
.poodle .ear { transform-origin: 36px 48px; animation: bkEar 7s ease-in-out infinite; } @keyframes bkEar { 0%,70%,100% { transform: rotate(0); } 80% { transform: rotate(6deg); } }
.poodle .tongue { animation: bkPant .45s ease-in-out infinite alternate; transform-origin: 81px 84px; } @keyframes bkPant { to { transform: scaleY(1.12); } }
.poodle.sleep .breath { transform-origin: 60px 120px; animation: bkBreath 3.4s ease-in-out infinite; } @keyframes bkBreath { 50% { transform: scale(1.015, 1.03); } }
.zzz text { animation: bkZ 3.4s ease-in-out infinite; opacity: 0; } .zzz text:nth-child(2) { animation-delay: .6s; } .zzz text:nth-child(3) { animation-delay: 1.2s; }
@keyframes bkZ { 20%,70% { opacity: .9; } 100% { opacity: 0; transform: translate(-6px,-8px); } }
.scales .beam { transform-origin: 60px 22px; animation: bkSwing 5s ease-in-out infinite; } @keyframes bkSwing { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

/* ---------------- occult (his): readable first — big serif on near-black, the old fonts only for decoration ---------------- */
.bp-him { --card: rgba(255,255,255,.035); --ink: #f1e8dc; --ink2: #bba99b; --line: #3d2a2f; --paper: #141011; --paper2: #2a1c20; --blue: #c0172b; --green: #a3122a; --accent: #c0172b; --shadow: none;
  color: var(--ink); background: ${HIM_PAPER}; }
.bp-him .bk-back { background: ${HIM_PAPER}; }
.bp-him .bp { font: 400 17px/1.55 Georgia, 'Times New Roman', serif; }
.bp-him .card { border: 1px solid rgba(192,23,43,.35); }
.bp-him .chip { background: #241618; color: #e9dccd; border: 1px solid #3d2a2f; } .bp-him .chip.on { background: #3a1410; color: #ffd27a; border-color: #ff8a2a; box-shadow: 0 0 10px rgba(255,120,30,.35); } .bp-him .chip .cnt { color: inherit; }
.bp-him .pick.on .box { background: #a3122a; border-color: #a3122a; color: #fff; }
.bp-him .btn:not(.soft) { color: #fff4e8; }   /* --card is nearly transparent here → filled buttons need their own text colour (the "+" was invisible) */
.bp-him .bp-kick { font: 400 15px Fraktur, serif; color: ${RED}; letter-spacing: .04em; }
.bp-him .bp-title { font: 400 30px/1.15 Fell, Georgia, serif; color: #ff4a5c; margin: 6px 0 4px; text-shadow: 0 0 16px rgba(192,23,43,.35); }
.bp-him .bp-meta { font-style: italic; color: var(--ink2); margin: 0 0 6px; }
.bp-him .card h3 { font: 400 22px Fell, Georgia, serif; color: #ff6b7a; margin: 0 0 4px; } .bp-him .card h3::before { content: '✠ '; color: ${RED}; }
.bp-him .bp-sig { float: right; margin: 0 -2px 6px 8px; } .sigil-fig { margin: 0; text-align: center; width: 96px; } .sigil-fig figcaption { font: 11px/1.35 Fell, Georgia, serif; letter-spacing: .06em; color: #b98f95; margin-top: 2px; }
.bp-him .pyr-note { margin: 6px 0 0; font-size: 13px; font-style: italic; color: var(--ink2); }
@keyframes bkSpin { to { transform: rotate(360deg); } }
.bp-him .bp-tape { display: inline-block; border: 1px solid rgba(192,23,43,.7); color: #f4c3c8; padding: 2px 10px; font-style: italic; margin: 2px 0 6px; }
.bp-him .bp-note { font-style: italic; color: #d9cbbd; }
.bp-him .bp-perf { clear: both; margin: 16px 0 8px; padding: 12px 14px; border: 1px solid rgba(192,23,43,.45); background: rgba(192,23,43,.07); }
.bp-him .bp-perf b { font: 400 21px Fell, serif; color: #ff6b7a; }
.bp-him .pyr { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; margin-top: 6px; } .bp-him .pyr span { font-style: italic; color: var(--ink2); } .bp-him .pyr em { font-style: normal; }
.bp-him .bp-exif { font: 13px/1.4 ui-monospace, Consolas, monospace; color: var(--ink2); margin: 8px 0; } .bp-him .bp-exif span { color: #ff6b7a; }
.bp-him .bp-motto { text-align: center; font: italic 19px Fell, serif; color: #e7d6c4; margin: 14px 0 4px; } .bp-him .bp-motto span { display: block; font-size: 14px; color: var(--ink2); }
.bp-him .bp-seal { float: right; clear: right; margin: 0 6px 8px 8px; width: 86px; transform: rotate(12deg); pointer-events: none; filter: drop-shadow(0 4px 6px #000); animation: bkSeal .55s .3s both cubic-bezier(.3,1.5,.5,1); }
@keyframes bkSeal { from { opacity: 0; transform: rotate(12deg) scale(1.9); } to { opacity: 1; transform: rotate(12deg) scale(1); } }
.bp-him .eye { animation: bkEye 5s ease-in-out infinite; } @keyframes bkEye { 0%,80%,100% { opacity: .5; } 85%,95% { opacity: 1; } }
.bp-him .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: bkFlick .18s var(--d) ease-in-out infinite alternate; }
@keyframes bkFlick { from { transform: scale(1, 1) skewX(-3deg); } to { transform: scale(.92, 1.08) skewX(3deg); } }
.bp-him .bp-candles { display: flex; justify-content: space-between; margin: 6px 10px -6px; } .bp-him .bp-candles svg { width: 40px; height: 70px; overflow: visible; }
/* 🖍️ picture book */
.bp-kid .sec-head { margin-bottom: 18px; }
.bp-kid { --card: #fff; --ink: #3d3a4a; --ink2: #6d6880; --line: #e6e1f0; --paper: #fffef9; --paper2: #f1effa; --shadow: none; color: var(--ink); background: ${KID_PAPER}; }
.bp-kid .bk-back { background: ${KID_PAPER}; }
.bp-kid .bp { font: 500 16px/1.5 Nunito, sans-serif; }
.bp-kid .sec-head h2, .bp-kid .bp-title { font: 400 36px/1.2 'Patrick Hand', Caveat, cursive; color: #3d3a4a; letter-spacing: .01em;
  text-decoration: underline wavy #f2b632; text-decoration-thickness: 3px; text-underline-offset: 9px; text-decoration-skip-ink: none; }
.bp-kid .bp-title { font-size: 32px; margin: 4px 0 6px; }
.bp-kid .card, .recipe-row.row-kid { background: #fff; border: 11px solid transparent; border-image: ${crayBox(CRAY[1])} 18 stretch; border-radius: 0; box-shadow: none; }
.recipe-row.row-kid:nth-of-type(4n+2), .bp-kid .card:nth-of-type(4n+2) { border-image-source: ${crayBox(CRAY[0])}; transform: rotate(.5deg); }
.recipe-row.row-kid:nth-of-type(4n+3), .bp-kid .card:nth-of-type(4n+3) { border-image-source: ${crayBox(CRAY[3])}; transform: rotate(-.4deg); }
.recipe-row.row-kid:nth-of-type(4n), .bp-kid .card:nth-of-type(4n) { border-image-source: ${crayBox(CRAY[4])}; }
.recipe-row.row-kid b { font: 400 19px/1.2 'Patrick Hand', cursive; }
.recipe-row.row-kid { padding: 5px 4px; }   /* inside the 11px crayon border ≈ a normal card's 12/14px padding (user: same height as the other cards) */
.bp-kid .card h3 { font: 400 25px 'Patrick Hand', cursive; color: #4a90d9; margin: 0 0 4px; }
.bp-kid .chip { font-family: 'Patrick Hand', Nunito, cursive; font-size: 17px; }
.bp-kid .chip.on { background: #ffe27a; color: #3d3a4a; border-color: #f2b632; box-shadow: none; }
.bp-kid .bp-meta { margin: 6px 0; color: var(--ink2); font-weight: 700; }
.bp-kid .bp-note { font: 400 20px/1.3 'Patrick Hand', cursive; color: #6d6880; margin: 6px 0; }
.bp-kid .bp-tape { display: inline-block; font: 400 19px 'Patrick Hand', cursive; padding: 0 10px; margin: 2px 0 6px; background: linear-gradient(100deg, transparent 2%, rgba(255,226,122,.85) 4%, rgba(255,226,122,.7) 96%, transparent 98%); transform: rotate(-1.5deg); }
.bp-kid .rstamp.herb { color: #3f8f4e; border: 2px solid #5bb36a; border-radius: 999px; font-family: 'Patrick Hand', cursive; font-size: 15px; }
.kstars { display: none; } .row-kid .kstars, .bp-kid .kstars { display: inline; color: var(--ink2); font-weight: 700; white-space: nowrap; }
.kstars em { font-style: normal; color: #f2a516; letter-spacing: 1px; } .kstars i { font-style: normal; color: #d9d4e4; letter-spacing: 1px; margin-right: 4px; }
.kd-pic { float: right; width: 92px; height: 92px; margin: 0 0 8px 10px; border: 11px solid transparent; border-image: ${crayBox(CRAY[2])} 18 stretch; background: #fff8dc; display: grid; place-items: center; transform: rotate(3deg); box-sizing: border-box; }
.kd-pic span { font-size: 40px; line-height: 1; animation: kdBob 3.4s ease-in-out infinite; } @keyframes kdBob { 50% { transform: translateY(-4px) rotate(-4deg); } }
.kd-sticker { float: right; clear: right; margin: 0 6px 8px 8px; width: 82px; height: 82px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-10deg);
  background: #ffe27a; clip-path: polygon(50% 0, 61% 13%, 77% 6%, 80% 23%, 97% 25%, 89% 40%, 100% 52%, 87% 62%, 93% 79%, 76% 80%, 70% 96%, 55% 88%, 41% 100%, 33% 85%, 16% 91%, 16% 74%, 0 66%, 11% 52%, 2% 37%, 18% 31%, 17% 13%, 34% 15%); }
.kd-sticker span { font: 400 19px 'Patrick Hand', cursive; color: #8a4b1d; } .kd-sticker b { font-size: 18px; }
.kd-foot { clear: both; margin-top: 12px; } .kd-meadow { width: 100%; display: block; } .kd-meadow .bug { animation: kdBug 9s ease-in-out infinite; } @keyframes kdBug { 50% { translate: -40px 0; } }
.sec-head .sa-sun { width: 104px; margin: -10px -4px -6px 0; } .kd-sun .rays { transform-origin: 40px 36px; animation: bkSpin 40s linear infinite; } .kd-sun .cloud { animation: kdCloud 6s ease-in-out infinite; } @keyframes kdCloud { 50% { translate: -6px 0; } }
.cb-tab[data-v="herb"] { background: linear-gradient(180deg, #8fd19a, #5bb36a); font: 400 18px/1 'Patrick Hand', cursive; letter-spacing: .03em; animation: none; text-shadow: 0 1px 0 rgba(0,0,0,.2); }
.recipe-row { position: relative; }
/* new = from the latest Vorrat set (user, 2026-10-12): a wax seal in the Culinarius, a crayon sticker in the picture book */
.rnew { position: absolute; z-index: 2; pointer-events: none; }
.rnew.wax { top: -9px; right: -7px; width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(14deg);
  border-radius: 47% 53% 50% 50% / 54% 46% 54% 46%; background: radial-gradient(circle at 36% 30%, #e0505c 0, #a8182a 45%, #6e0b17 100%);
  box-shadow: inset 0 0 0 4px rgba(0,0,0,.16), inset 0 0 0 5px rgba(255,140,140,.18), 0 3px 6px rgba(0,0,0,.55); color: #f3c3b0; font: 400 17px/1 Fell, Georgia, serif; text-shadow: 0 -1px 0 rgba(0,0,0,.45), 0 1px 0 rgba(255,190,170,.3); }
.rnew.wax b { font: 400 8px/1 Fell, Georgia, serif; letter-spacing: .12em; margin-top: 2px; }
.rnew.wax::after { content: ''; position: absolute; right: -4px; bottom: 6px; width: 10px; height: 9px; border-radius: 50% 60% 50% 40%; background: #8f1322; box-shadow: 0 2px 2px rgba(0,0,0,.4); }
.rnew.kidnew { display: none; }
.row-kid .rnew.kidnew { display: flex; top: -18px; right: -16px; width: 54px; height: 54px; align-items: center; justify-content: center; transform: rotate(-12deg); background: #ffe27a; color: #c0392b; font: 400 16px/1 'Patrick Hand', cursive;
  clip-path: polygon(50% 0, 61% 13%, 77% 6%, 80% 23%, 97% 25%, 89% 40%, 100% 52%, 87% 62%, 93% 79%, 76% 80%, 70% 96%, 55% 88%, 41% 100%, 33% 85%, 16% 91%, 16% 74%, 0 66%, 11% 52%, 2% 37%, 18% 31%, 17% 13%, 34% 15%); }
.rnew.wax { display: none; } .bp-him .rnew.wax { display: flex; }
/* small phones: bookmarks along the top edge, the page gets the full width, the floating pictures shrink */
.cb-top .cb-body { flex-direction: column; }
.cb-top .cb-tabs { order: -1; flex-direction: row; align-items: flex-end; width: auto; padding: 0 8px; gap: 3px; height: 38px; }
.cb-top .cb-tab { flex: 1 1 auto; min-width: 0; height: 38px; padding: 0 4px; border-radius: 10px 10px 0 0; transform: translateY(5px); font-size: calc(13px * var(--tk, 1)); letter-spacing: 0; box-shadow: 0 -1px 4px rgba(0,0,0,.12); }
.cb-top .cb-tab.on { transform: translateY(0); width: auto; }
.cb-top .cb-tab span { writing-mode: horizontal-tb; display: block; white-space: nowrap; overflow: hidden; }
.cb-tab .tk { font-style: normal; } .cb-top .cb-tab .tk { display: none; }
.cb-top .cb-tab[data-v="herb"] { font-size: calc(16px * var(--tk, 1)); letter-spacing: 0; } .cb-top .cb-tab[data-v="codex"] { font-size: calc(12.5px * var(--tk, 1)); letter-spacing: .02em; }
.cb-top .cb-gap { height: auto; width: 6px; }
.cb-top .bk-page { border-radius: 10px; }
.cb-top .bp { padding: 14px 12px 20px 14px; }
.cb-top .bp-title { font-size: 26px !important; }
.cb-top .bp-her .bp-plant { width: 64px; } .cb-top .bp-her .bp-plant svg { width: 64px; height: 100px; } .cb-top .bp-her .bp-plant::before { left: 14px; }
.cb-top .sigil-fig { width: 72px; } .cb-top .sigil-fig svg { width: 72px; height: auto; }
.cb-top .kd-pic { width: 70px; height: 70px; border-width: 9px; } .cb-top .kd-pic span { font-size: 30px; }
.cb-top .bp-her .bp-stamp, .cb-top .kd-sticker { width: 66px; height: 66px; } .cb-top .bp-him .bp-seal { width: 70px; }
@media (prefers-reduced-motion: reduce) { .cbook *, .cbook *::before { animation: none !important; } .bp-her .herb .lf, .bp-her .herb .fl { opacity: 1; } .bp-her .herb .stem { stroke-dashoffset: 0; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('bkcss')) { const st = document.createElement('style'); st.id = 'bkcss'; st.textContent = CSS; document.head.appendChild(st); }
export const candles = () => `<div class="bp-candles"><svg viewBox="-20 -80 40 80"><defs><radialGradient id="cglow"><stop offset="0" stop-color="#ffb347" stop-opacity=".45"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs>${candle(0, 0, 40, 0)}</svg><svg viewBox="-20 -80 40 80">${candle(0, 0, 30, 1)}</svg></div>`;
