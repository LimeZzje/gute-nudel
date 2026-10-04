// Nudel-Rush: a runner game on Home. Lead a growing troop of noodles through math gates and clean the kitchen of
// household chaos. Kitchen 1 teaches, from kitchen 2 it bites, after kitchen 10 it goes on endlessly.
// No stars, no comparison with the partner: only your own record (S.game.best via onBest).
//   openGame({ best, onBest, onClose }) → { back, close, sim, state }

const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const muted = () => { try { return localStorage.getItem('gn_game_mute') === '1'; } catch (e) { return false; } };
const seenGet = () => { try { return JSON.parse(localStorage.getItem('gn_game_seen') || '[]'); } catch (e) { return []; } };
const seenAdd = k => { try { const s = seenGet(); if (!s.includes(k)) { s.push(k); localStorage.setItem('gn_game_seen', JSON.stringify(s)); } } catch (e) {} };

// ---------- sound: tiny synthesized blips (no files) ----------
let AC = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d = .09, type = 'sine', vol = .06, slide = 0, delay = 0) {
  if (muted() || !AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
}
const lastT = {};
const once = (k, ms, f) => { const n = performance.now(); if (n - (lastT[k] || 0) < ms) return; lastT[k] = n; f(); };
const SFX = {
  good: () => [523, 659, 784].forEach((f, i) => tone(f, .12, 'triangle', .07, 0, i * .06)),
  bad: () => tone(330, .22, 'sawtooth', .045, -180),
  pop: () => once('pop', 45, () => tone(rnd(500, 700), .05, 'square', .022, -200)),
  hurt: () => once('hurt', 90, () => tone(180, .14, 'sawtooth', .05, -90)),
  chop: () => { tone(900, .05, 'square', .04, -600); tone(120, .15, 'triangle', .07, -60, .03); },
  sizzle: () => once('siz', 160, () => tone(rnd(2000, 2600), .08, 'sawtooth', .012, -800)),
  crate: () => [660, 880].forEach((f, i) => tone(f, .1, 'triangle', .06, 0, i * .05)),
  power: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, .1, 'triangle', .07, 0, i * .05)),
  boom: () => { tone(70, .5, 'sawtooth', .08, -30); tone(140, .3, 'square', .04, -90, .02); },
  boss: () => { tone(110, .5, 'sawtooth', .05, -50); tone(82, .6, 'triangle', .06, -30, .15); },
  thud: () => once('thud', 70, () => tone(90, .07, 'triangle', .06, -30)),
  shoot: () => once('sh', 120, () => tone(420, .06, 'square', .02, 300)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .08, 0, i * .1)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, .22, 'triangle', .07, 0, i * .14)),
};

// ---------- sprites, drawn once ----------
function sprite(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function eyes(g, x, y, d, angry = true, s = 1) {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x - d, y, 7 * s, 0, 7); g.arc(x + d, y, 7 * s, 0, 7); g.fill();
  g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(x - d + 1.5 * s, y + 1, 3.6 * s, 0, 7); g.arc(x + d + 1.5 * s, y + 1, 3.6 * s, 0, 7); g.fill();
  if (angry) { g.strokeStyle = '#2b2a33'; g.lineWidth = 3 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - d - 8 * s, y - 11 * s); g.lineTo(x - d + 5 * s, y - 6 * s); g.moveTo(x + d + 8 * s, y - 11 * s); g.lineTo(x + d - 5 * s, y - 6 * s); g.stroke(); }
}
const SPR = {};
function makeSprites() {
  SPR.noodle = sprite(64, 64, (g, s) => {
    const r = s * .4, c = s / 2;
    g.fillStyle = '#c7932a'; g.beginPath(); g.arc(c, c + 3, r, 0, 7); g.fill();
    g.fillStyle = '#f6c945'; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(199,147,42,.75)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, r * .6, .5, 3.1); g.stroke();
    g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(c - r * .35, c - r * .45, r * .22, 0, 7); g.fill();
    g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(c - r * .3, c - r * .05, 3, 0, 7); g.arc(c + r * .3, c - r * .05, 3, 0, 7); g.fill();
    g.strokeStyle = '#2b2a33'; g.lineWidth = 2.2; g.beginPath(); g.arc(c, c + r * .12, r * .22, .3, 2.8); g.stroke();
  });
  const bunny = helmet => sprite(64, 64, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#8f989d';
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; g.beginPath(); g.arc(c + Math.cos(a) * s * .24, c + Math.sin(a) * s * .24, s * .17, 0, 7); g.fill(); }
    g.fillStyle = '#b5bdc1'; g.beginPath(); g.arc(c, c, s * .27, 0, 7); g.fill();
    eyes(g, c, c - 2, 7, true, .75);
    if (helmet) { // a sieve as a helmet
      g.fillStyle = '#c9ced2'; g.beginPath(); g.arc(c, c - 8, 21, Math.PI, 0); g.fill();
      g.fillStyle = '#7d868c'; for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(c + i * 7, c - 14 - j * 6, 1.4, 0, 7); g.fill(); }
      g.fillStyle = '#7d868c'; g.fillRect(c + 18, c - 11, 12, 4);
    }
  });
  SPR.bunny = bunny(false); SPR.armor = bunny(true);
  const emo = (e, px) => sprite(px * 1.3, px * 1.3, (g, s) => { g.font = px + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, s / 2, s / 2 + px * .06); });
  SPR.sock = emo('🧦', 96); SPR.crate = emo('📦', 96); SPR.socky = emo('🧦', 56); SPR.toast = emo('🍞', 56); SPR.spray = emo('🧴', 96);
  SPR.cheese = emo('🧀', 64); SPR.tomato = emo('🍅', 64); SPR.bolt = emo('⚡', 64);
  SPR.toaster = sprite(110, 90, (g) => {
    g.fillStyle = '#9aa3a8'; g.beginPath(); g.roundRect ? g.roundRect(8, 22, 94, 62, 18) : g.rect(8, 22, 94, 62); g.fill();
    g.fillStyle = '#c9d0d4'; g.beginPath(); g.roundRect ? g.roundRect(14, 26, 82, 30, 12) : g.rect(14, 26, 82, 30); g.fill();
    g.fillStyle = '#4a4f55'; g.fillRect(28, 18, 22, 8); g.fillRect(60, 18, 22, 8);
    eyes(g, 55, 62, 16, true, .85);
    g.fillStyle = '#2b2a33'; g.fillRect(98, 48, 9, 5);
  });
  // the bosses, drawn as real monsters
  SPR.laundry = sprite(240, 210, (g) => {   // a heap of laundry with a face
    const blobs = [['#e07a5f', 50, 150, 52], ['#81b29a', 190, 150, 54], ['#3d5a80', 120, 160, 64], ['#f2cc8f', 85, 100, 50], ['#e5989b', 160, 95, 50], ['#98c1d9', 120, 60, 46], ['#b56576', 40, 175, 34], ['#6d597a', 205, 180, 32]];
    for (const [c, x, y, r] of blobs) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * .78, (x - 120) / 160, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.beginPath(); g.arc(x - r * .2, y - r * .1, r * .55, .3, 1.8); g.stroke(); }
    g.fillStyle = '#f4f1de'; g.fillRect(150, 40, 26, 34); g.fillStyle = '#e07a5f'; g.fillRect(150, 40, 26, 8);   // a sock sticking out
    eyes(g, 120, 118, 24, true, 1.5);
    g.strokeStyle = '#2b2a33'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(120, 168, 22, 3.6, 5.8); g.stroke();
  });
  SPR.dishes = sprite(200, 230, (g) => {    // a tower of dirty plates with a face
    for (let i = 0; i < 7; i++) { const y = 200 - i * 26, w = 150 - Math.abs(i - 3) * 8; g.fillStyle = i % 2 ? '#e9eef2' : '#d7dee3'; g.beginPath(); g.ellipse(100 + Math.sin(i * 1.7) * 8, y, w / 2, 16, 0, 0, 7); g.fill(); g.strokeStyle = '#9aa7b0'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(165,110,60,.45)'; g.beginPath(); g.arc(100 + Math.cos(i * 2.3) * 30, y - 3, 7, 0, 7); g.fill(); }
    g.fillStyle = '#c9a26b'; g.fillRect(150, 20, 8, 60); g.fillStyle = '#9aa3a8'; g.fillRect(40, 30, 6, 50);   // spoon & fork sticking out
    eyes(g, 100, 112, 26, true, 1.5);
    g.strokeStyle = '#2b2a33'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(100, 165, 18, 3.7, 5.7); g.stroke();
  });
  SPR.vacuum = sprite(230, 200, (g) => {    // a hungry vacuum cleaner
    g.fillStyle = '#d6453a'; g.beginPath(); g.ellipse(115, 95, 92, 70, 0, 0, 7); g.fill();
    g.fillStyle = '#ef6b5f'; g.beginPath(); g.ellipse(100, 75, 60, 35, -.2, 0, 7); g.fill();
    g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(50, 160, 18, 0, 7); g.arc(180, 160, 18, 0, 7); g.fill();
    g.fillStyle = '#4a4f55'; g.fillRect(100, 150, 30, 46); g.fillStyle = '#2b2a33'; g.beginPath(); g.roundRect ? g.roundRect(70, 186, 90, 14, 6) : g.rect(70, 186, 90, 14); g.fill();
    eyes(g, 115, 90, 30, true, 1.6);
    g.fillStyle = '#2b2a33'; g.beginPath(); g.ellipse(115, 132, 24, 12, 0, 0, 7); g.fill();
  });
}

// ---------- content ----------
const PERKS = [
  { id: 'rate', icon: '🍴', name: 'Schnellere Gabel', text: '+25 % Feuerrate' },
  { id: 'dmg', icon: '🌶️', name: 'Scharfe Soße', text: 'Jeder Schuss trifft doppelt' },
  { id: 'start', icon: '🍝', name: 'Extraportion', text: '+10 Nudeln zu Beginn jeder Küche' },
  { id: 'spread', icon: '🔱', name: 'Dreizack-Gabel', text: '+1 Schuss pro Salve' },
  { id: 'gate', icon: '🧂', name: 'Prise Salz', text: 'Schüsse verbessern Tore doppelt so schnell' },
  { id: 'shield', icon: '🧤', name: 'Topflappen', text: 'Ein Minus-Tor pro Küche prallt ab' },
  { id: 'sponge', icon: '🧽', name: 'Schwamm', text: 'Hindernisse kosten nur halb so viele Nudeln' },
  { id: 'magnet', icon: '🧲', name: 'Nudelmagnet', text: 'Kisten geben 50 % mehr Nudeln' },
];
const BOSSES = [
  { id: 'laundry', name: 'Der Wäscheberg', icon: '🧦', spr: 'laundry', w: 220, h: 192 },
  { id: 'dishes', name: 'Der Geschirrturm', icon: '🍽️', spr: 'dishes', w: 180, h: 207 },
  { id: 'vacuum', name: 'Der Staubsauger', icon: '🌪️', spr: 'vacuum', w: 210, h: 183 },
];
const HAZARD_NAMES = { knife: 'Achtung: Messer! Warte, bis es oben ist.', whisk: 'Achtung: Schneebesen!', stove: 'Heiß! Nicht auf der Herdplatte stehen.', pin: 'Achtung: Nudelholz!', spray: 'Die Sprühflasche schießt zurück!', toaster: 'Toast im Anflug! Weg vom roten Kreis.', armor: 'Wollmäuse mit Sieb-Helm: 3 Treffer pro Stück', mystery: '? = Überraschung. Kann gut … oder schlimm sein.', slide: 'Bewegliches Tor: triff es oder lass es.', flicker: 'Flacker-Tor: der Wert springt hin und her.', power: 'Kraftpakete abschießen: 🧀 Schild · 🍅 Bombe · ⚡ Dauerfeuer' };
const LOSE = ['Das Chaos hat gewonnen', 'Die Wollmäuse feiern', 'Alle Nudeln verkocht', 'Die Küche ist noch dreckig'];

export function openGame({ best = 0, onBest = () => {}, onClose = () => {} } = {}) {
  if (!SPR.noodle) makeSprites();
  const root = document.createElement('div'); root.id = 'gameov'; root.className = 'game';
  root.innerHTML = `<canvas class="g-cv" aria-label="Spielfeld Nudel-Rush"></canvas>
    <div class="g-hud">
      <div class="g-count"><span class="g-n">8</span><span class="g-lbl">Nudeln</span></div>
      <div class="g-mid"><div class="g-lvl">Küche 1</div><div class="g-prog"><i></i><b>🧦</b></div><div class="g-buffs"></div></div>
      <div class="g-btns"><button class="g-ic g-mute" aria-label="Ton an/aus"></button><button class="g-ic g-pause" aria-label="Pause">❚❚</button></div>
    </div>
    <div class="g-banner" hidden></div>
    <div class="g-ov g-start"><div class="g-card">
      <div class="g-title">Nudel-Rush</div>
      <p>Das Chaos rückt an. Deine Nudeln halten die Küche sauber.</p>
      <ul class="g-how"><li><b>👉</b>Finger links & rechts ziehen</li><li><b>🚪</b>Durch das bessere Tor – oder es besser schießen</li><li><b>🔪</b>Hindernissen ausweichen, Schützen zuerst abschießen</li><li><b>👑</b>Jede Küche endet mit einem Boss</li></ul>
      <button class="g-btn g-go">Los geht's</button>
      <p class="g-best">${best ? 'Dein Rekord: Küche ' + best : 'Noch kein Rekord – leg los!'}</p>
      <button class="g-link g-close">Zurück</button></div></div>
    <div class="g-ov g-perk" hidden><div class="g-card"><div class="g-title sm">Küche sauber! 🎉</div><p class="g-perkhint">Such dir was aus für die nächste Küche:</p><div class="g-perks"></div></div></div>
    <div class="g-ov g-paused" hidden><div class="g-card"><div class="g-title sm">Pause</div><button class="g-btn g-resume">Weiter</button><button class="g-link g-quit">Spiel beenden</button></div></div>
    <div class="g-ov g-over" hidden><div class="g-card"><div class="g-title sm g-otitle"></div><div class="g-stats"></div><p class="g-best g-obest"></p>
      <button class="g-btn g-again">Nochmal</button><button class="g-link g-close">Zurück zu Home</button></div></div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s), cv = $('.g-cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, raf = 0, last = 0, running = false, G = null, closed = false;
  function resize() { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width || 400; H = r.height || 800; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  resize(); addEventListener('resize', resize);
  const setMute = () => { $('.g-mute').textContent = muted() ? '🔇' : '🔊'; };
  setMute();

  // ---------- run & kitchens ----------
  function newRun() { G = { level: 1, n: 8, perks: Object.fromEntries(PERKS.map(p => [p.id, 0])), killed: 0, maxN: 8 }; startLevel(); }
  function startLevel() {
    const L = G.level, hard = L >= 2;
    Object.assign(G, { x: W / 2, tx: W / 2, objs: [], bullets: [], shots: [], lobs: [], parts: [], floats: [], born: [], fireT: 0, shake: 0, done: false, won: false,
      shieldLeft: G.perks.shield, bossWarned: false, pulse: 0, shieldT: 0, rapidT: 0, flash: 0, t: 0 });
    G.n = Math.max(G.n, 8) + G.perks.start * 10;
    G.speed = Math.min(240, 110 + L * 11);
    // the course: rows every ~270 px; a gate at least every 3 rows; the mix gets nastier per kitchen
    const rows = Math.min(30, 12 + L * 2), hz = hard ? ['knife', 'whisk', 'stove', 'pin'] : ['knife', 'stove'];
    let y = H * .12, sinceGate = 0;
    for (let i = 0; i < rows; i++) {
      const r = Math.random();
      let o;
      if (i === 0 || sinceGate >= 2 || r < .26) { o = gateRow(y, L, i === 0); sinceGate = 0; }
      else if (r < .52) o = enemyRow(y, L);
      else if (r < .8) o = hazard(pick(hz), y, L);
      else o = pickupRow(y, L);
      if (o.t !== 'gates' && o.t !== 'slide') sinceGate++;
      G.objs.push(o);
      y -= rnd(250, 300) + (o.t === 'stove' ? 60 : 0);
    }
    const kind = BOSSES[(L - 1) % 3], hp = Math.round((80 + L * 75) * (L > 10 ? 1 + (L - 10) * .15 : 1));
    G.boss = { t: 'boss', kind, y: y - 180, x: W / 2, hp, max: hp, r: 84, cd: 2.2, spawnT: 6, suckT: 0 };
    G.objs.push(G.boss);
    G.total = H * .8 - G.boss.y;
    $('.g-prog b').textContent = kind.icon;
    $('.g-lvl').textContent = 'Küche ' + L + (L > 10 ? ' ∞' : '');
    banner(L === 11 ? 'Ab jetzt: endlos!' : 'Küche ' + L);
  }
  function gateRow(y, L, first) {
    const hard = L >= 2, g = goodVal(L), b = badVal(L), r = Math.random();
    if (first) { const a = { op: '+', v: ri(5, 8) }, c = { op: '+', v: -ri(2, 4) }; return Math.random() < .5 ? pair(y, a, c) : pair(y, c, a); }
    if (hard && r < .14) return { t: 'slide', y, h: 54, w: W * .34, x: rnd(W * .2, W * .8), vx: (70 + L * 10) * (Math.random() < .5 ? -1 : 1), g: Math.random() < .7 ? goodVal(L, true) : b, used: false };
    if (hard && r < .3) { const m = { op: '?', v: 0 }; return Math.random() < .5 ? pair(y, m, b) : pair(y, g, m); }
    if (hard && r < .45) { const f = { op: '+', v: g.op === '+' ? g.v : ri(4, 9), alt: -ri(3, 6 + L * 2), fT: rnd(0, 1) }; return Math.random() < .5 ? pair(y, f, badVal(L)) : pair(y, badVal(L), f); }
    if (hard && r < .58) return pair(y, badVal(L), badVal(L));            // both bad: shoot one better!
    return Math.random() < .5 ? pair(y, g, b) : pair(y, b, g);
  }
  const pair = (y, l, r) => ({ t: 'gates', y, h: 56, l, r, used: false });
  function goodVal(L, small) { return !small && Math.random() < .26 ? { op: '×', v: Math.random() < .12 ? 3 : 2 } : { op: '+', v: ri(3, 5 + L) }; }
  function badVal(L) { const r = Math.random(); return L >= 3 && r < .22 ? { op: '÷', v: 2 } : L === 1 ? { op: '+', v: -ri(3, 6) } : { op: '+', v: -ri(4 + L, 7 + L * 3) }; }
  function enemyRow(y, L) {
    const hard = L >= 2, r = Math.random(), x = rnd(W * .22, W * .78);
    if (r < .35 || !hard && r < .65) {   // a swarm that grows with your troop
      const m = L === 1 ? ri(3, 7) : ri(5, 9) + L * ri(3, 5) + Math.floor((G.n || 0) * Math.min(.45, .1 * L));   // kitchen 1 teaches
      const armor = hard && Math.random() < .25 + L * .03;
      return { t: 'squad', y, x, m: armor ? Math.ceil(m * .5) : m, armor: armor ? 3 : 1, hits: 0, wob: rnd(0, 6) };
    }
    if (r < .55 || !hard) return { t: 'spray', y, x, hp: 10 + L * 6, max: 10 + L * 6, cd: rnd(.6, 1.2) };
    if (r < .78) return { t: 'toaster', y, x, hp: 14 + L * 6, max: 14 + L * 6, cd: rnd(.5, 1) };
    return { t: 'sock', y, x, hp: 12 + L * 5, max: 12 + L * 5, dmg: 6 + L * 2, sway: rnd(0, 6) };
  }
  function hazard(kind, y, L) {
    if (kind === 'knife') return { t: 'knife', y, side: Math.random() < .5 ? 'l' : 'r', ph: rnd(0, 1.8), hitDone: false };
    if (kind === 'whisk') return { t: 'whisk', y, ang: rnd(0, 6), spd: (1.6 + L * .12) * (Math.random() < .5 ? 1 : -1), cool: 0 };
    if (kind === 'stove') { const w = W * rnd(.38, .5); return { t: 'stove', y, w, x: Math.random() < .5 ? 8 : W - 8 - w, h: 120, tick: 0 }; }
    return { t: 'pin', y, w: W * .4, x: rnd(0, W * .6), vx: (110 + L * 14) * (Math.random() < .5 ? 1 : -1), hit: false };
  }
  function pickupRow(y, L) {
    if (L >= 2 && Math.random() < .45) { const kind = pick(['shield', 'bomb', 'rapid']); return { t: 'power', kind, y, x: rnd(W * .2, W * .8), hp: 6 + L * 2, max: 6 + L * 2 }; }
    const hp = 6 + L * 3; return { t: 'crate', y, x: rnd(W * .2, W * .8), hp, max: hp, gift: Math.round((ri(5, 9) + L * 2) * (1 + G.perks.magnet * .5)) };
  }

  // ---------- input ----------
  let dragX = null;
  cv.addEventListener('pointerdown', e => { dragX = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
  cv.addEventListener('pointermove', e => { if (dragX == null || !G) return; G.tx = clamp(G.tx + (e.clientX - dragX) * 1.3, 26, W - 26); dragX = e.clientX; });
  const up = () => { dragX = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const keys = {}; const kd = e => { keys[e.key] = true; }, ku = e => { keys[e.key] = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  // ---------- helpers ----------
  const cy = () => H * .8;
  const crowdR = () => Math.min(W * .3, 14 + Math.sqrt(G.n) * 4.4);
  const float = (x, y, txt, col, big) => G.floats.push({ x, y, txt, col, t: 0, big });
  function burst(x, y, col, k = 10, sp = 1) { if (reduced()) k = Math.min(k, 4); for (let i = 0; i < k; i++) G.parts.push({ x, y, vx: rnd(-170, 170) * sp, vy: rnd(-260, 40) * sp, t: 0, life: rnd(.4, .8), col, s: rnd(3, 7) }); }
  function shake(v) { if (!reduced()) G.shake = Math.min(18, G.shake + v); }
  // every loss goes through here: the cheese shield blocks it, the sponge halves obstacle damage
  function lose(k, src, label) {
    if (k <= 0 || G.won) return;
    if (G.shieldT > 0) { once('shieldfx', 150, () => { burst(G.x, cy(), '#f6c945', 6); float(G.x, cy() - 60, '🧀', '#c7932a'); }); return; }
    if (src === 'hazard' && G.perks.sponge) k = Math.ceil(k / (1 + G.perks.sponge));
    k = Math.min(G.n, Math.round(k));
    G.n -= k; shake(3 + Math.min(10, k * .3)); buzz(25); SFX.hurt();
    if (label !== false) float(G.x + rnd(-20, 20), cy() - 55, '−' + k + (label ? ' ' + label : ''), '#c0533f', true);
  }
  function grow(d) { const shown = Math.min(G.n, 120); for (let i = 0; i < Math.min(d, 20); i++) G.born.push({ i: Math.max(0, shown - 1 - i), t: 0 }); G.pulse = 1; }
  function banner(txt, warn) { const b = $('.g-banner'); b.textContent = txt; b.className = 'g-banner' + (warn ? ' warn' : ''); b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, warn ? 2200 : 1700); }
  function intro(kind) { if (seenGet().includes(kind)) return; seenAdd(kind); banner(HAZARD_NAMES[kind], true); }
  const label = g => g.op === '?' ? '?' : g.op === '+' ? (g.v >= 0 ? '+' + g.v : '−' + (-g.v)) : g.op + g.v;
  const isGood = g => g.op === '×' || (g.op === '+' && g.v >= 0);
  function applyGate(g, gx, gy) {
    const before = G.n;
    if (g.op === '?') { const roll = pick([{ op: '×', v: 3 }, { op: '×', v: 2 }, { op: '+', v: 15 + G.level * 3 }, { op: '+', v: -(10 + G.level * 3) }, { op: '÷', v: 2 }]); float(gx, gy - 40, label(roll), isGood(roll) ? '#3d7d48' : '#c0533f', true); g = roll; }
    if (g.op === '+' && g.v < 0 && G.shieldLeft > 0) { G.shieldLeft--; float(G.x, cy() - 60, '🧤 abgeprallt', '#4f9a5b'); SFX.good(); return; }
    if (g.op === '+') G.n += g.v; else if (g.op === '×') G.n *= g.v; else G.n = Math.ceil(G.n / g.v);
    G.n = Math.max(0, Math.round(G.n)); G.maxN = Math.max(G.maxN, G.n);
    const d = G.n - before;
    float(G.x, cy() - 70, (d >= 0 ? '+' : '−') + Math.abs(d), d >= 0 ? '#3d7d48' : '#c0533f', true);
    burst(gx, gy, isGood(g) ? '#7cc488' : '#ef8a76', 22, 1.2);
    if (d > 0) { grow(d); SFX.good(); buzz(15); } else { shake(7); SFX.bad(); buzz([40, 30, 40]); }
  }
  function bump(g) { if (g.op !== '+') return; g.bump = (g.bump || 0) + 1 + G.perks.gate; while (g.bump >= 3) { g.bump -= 3; g.v++; if (g.alt != null) g.alt++; g.pop = 1; } }
  function kill(o, col) { o.dead = true; G.killed++; burst(o.x, o.y, col, 22); SFX.crate(); }
  function powerUp(o) {
    o.dead = true; SFX.power(); buzz([20, 20, 20]);
    if (o.kind === 'shield') { G.shieldT = 5; banner('🧀 Käse-Schild: 5 Sekunden unverwundbar'); }
    if (o.kind === 'rapid') { G.rapidT = 6; banner('⚡ Dauerfeuer!'); }
    if (o.kind === 'bomb') {
      banner('🍅 Tomaten-Bombe!'); SFX.boom(); shake(14); G.flash = 1;
      for (const e of G.objs) if (!e.dead && e.y > -40 && e.y < cy() && ['squad', 'spray', 'toaster', 'sock'].includes(e.t)) kill(e, '#e0543f');
      G.shots = []; G.lobs = [];
      if (G.boss && G.boss.y > -60) G.boss.hp -= Math.round(G.boss.max * .12);
    }
  }

  // ---------- update ----------
  function step(dt) {
    if (!G || G.done) return;
    const L = G.level, Y = cy(), B = G.boss;
    G.t += dt;
    if (keys.ArrowLeft) G.tx = Math.max(26, G.tx - 460 * dt);
    if (keys.ArrowRight) G.tx = Math.min(W - 26, G.tx + 460 * dt);
    // the vacuum pulls your troop towards it
    if (B && !B.dead && B.kind.id === 'vacuum' && B.y > 0 && !G.won) G.tx = clamp(G.tx + Math.sign(B.x - G.x) * (55 + L * 7) * dt, 26, W - 26);
    G.x += (G.tx - G.x) * Math.min(1, dt * 16);
    G.shieldT = Math.max(0, G.shieldT - dt); G.rapidT = Math.max(0, G.rapidT - dt); G.flash = Math.max(0, G.flash - dt * 2.5);
    const sc = G.speed * dt;
    // fire: more noodles, more forks
    G.fireT -= dt;
    if (G.fireT <= 0 && G.n > 0 && !G.won) {
      G.fireT = (.3 / (1 + Math.log2(1 + G.n) * .18)) / (1 + G.perks.rate * .25) / (G.rapidT > 0 ? 2.5 : 1);
      const k = Math.min(6, 1 + Math.floor(G.n / 18)) + G.perks.spread, r = crowdR();
      for (let i = 0; i < k; i++) G.bullets.push({ x: G.x + (k === 1 ? 0 : (i / (k - 1) - .5) * r * 1.5), y: Y - r * .6, dmg: 1 + G.perks.dmg });
    }
    for (const b of G.bullets) b.y -= 780 * dt;
    // the world comes down
    for (const o of G.objs) {
      if (o === B) { if (o.y < H * .26) o.y += sc; else { o.y += sc * .1; o.x = W / 2 + Math.sin(G.t * .9) * Math.max(16, (W - o.kind.w) / 2 - 10); } continue; }
      o.y += sc;
      const on = o.y > 0 && o.y < Y - 60;
      if (o.t === 'squad' && o.y > 0) o.x += Math.sign(G.x - o.x) * Math.min(Math.abs(G.x - o.x), (26 + L * 4) * dt);
      if (o.t === 'sock') o.x += Math.sin(G.t * 2 + o.sway) * 55 * dt;
      if (o.t === 'slide') { o.x += o.vx * dt; if (o.x < o.w / 2 + 8 || o.x > W - o.w / 2 - 8) o.vx *= -1; }
      if (o.t === 'pin') { o.x += o.vx * dt; if (o.x < 8 || o.x + o.w > W - 8) o.vx *= -1; }
      if (o.t === 'whisk') o.ang += o.spd * dt;
      if (o.t === 'knife') o.ph = (o.ph + dt) % 1.8;
      if (o.t === 'gates') for (const g of [o.l, o.r]) if (g.alt != null) { g.fT += dt; if (g.fT > .75) { g.fT = 0; [g.v, g.alt] = [g.alt, g.v]; g.pop = .6; } }
      if (o.y > -10 && o.y < H && ['knife', 'whisk', 'stove', 'pin', 'spray', 'toaster'].includes(o.t)) intro(o.t);
      if (o.t === 'squad' && o.armor > 1 && o.y > 0) intro('armor');
      if (o.t === 'slide' && o.y > 0) intro('slide');
      if (o.t === 'power' && o.y > 0) intro('power');
      if (o.t === 'gates' && o.y > 0) { if (o.l.op === '?' || o.r.op === '?') intro('mystery'); if (o.l.alt != null || o.r.alt != null) intro('flicker'); }
      // shooters
      if (o.t === 'spray' && on) { o.cd -= dt; if (o.cd <= 0) { o.cd = Math.max(.55, 1.3 - L * .06); const a = Math.atan2(Y - o.y, G.x - o.x); G.shots.push({ k: 'drop', x: o.x, y: o.y + 20, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, dmg: 2 + Math.floor(L / 2) }); SFX.shoot(); } }
      if (o.t === 'toaster' && on) { o.cd -= dt; if (o.cd <= 0) { o.cd = Math.max(1, 2.1 - L * .08); G.lobs.push({ x0: o.x, y0: o.y - 20, tx: G.x + rnd(-20, 20), t: 0, dur: 1.15, dmg: 5 + L }); SFX.shoot(); } }
    }
    if (B && !B.dead && B.y > -60 && !G.bossWarned) { G.bossWarned = true; banner(B.kind.name + ' kommt!', true); SFX.boss(); buzz([60, 40, 60]); }
    // the boss attacks
    if (B && !B.dead && !G.won && B.y >= H * .26) {
      B.cd -= dt;
      if (B.kind.id === 'laundry' && B.cd <= 0) { B.cd = Math.max(.45, 1.3 - L * .07); G.shots.push({ k: 'sock', x: B.x, y: B.y + 50, vx: (G.x - B.x) * .7, vy: 280 + L * 14, rot: 0, dmg: 3 + L }); }
      if (B.kind.id === 'dishes' && B.cd <= 0) { B.cd = Math.max(1, 2.1 - L * .07); const n = 3 + Math.floor(L / 3); for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i / (n - 1) - .5) * 1.1; G.shots.push({ k: 'plate', x: B.x, y: B.y + 60, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, rot: 0, dmg: 3 + Math.floor(L / 2) }); } SFX.shoot(); }
      if (B.kind.id === 'vacuum' && Math.abs(G.x - B.x) < 120 + crowdR()) { B.suckT -= dt; if (B.suckT <= 0) { B.suckT = .2; if (G.shieldT <= 0 && G.n > 0) { G.n--; G.parts.push({ x: G.x, y: Y, vx: (B.x - G.x) * 1.4, vy: (B.y - Y) * 1.4, t: 0, life: .7, col: '#f6c945', s: 8 }); SFX.pop(); } } }
      if (L >= 3) { B.spawnT -= dt; if (B.spawnT <= 0) { B.spawnT = Math.max(3, 7 - L * .3); G.objs.push({ t: 'squad', y: B.y + 70, x: B.x, m: ri(4, 6) + L, armor: 1, hits: 0, wob: rnd(0, 6) }); } }
    }
    for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.rot = (s.rot || 0) + dt * 9; }
    for (const l of G.lobs) l.t += dt;
    // our forks hit things
    for (const b of G.bullets) {
      for (const o of G.objs) {
        if (b.hit || o.dead || o.y < -80) continue;
        if (o.t === 'gates' && !o.used && Math.abs(b.y - o.y) < o.h / 2) { const g = b.x < W / 2 ? o.l : o.r; bump(g); b.hit = true; g.flash = .1; }
        else if (o.t === 'slide' && !o.used && Math.abs(b.y - o.y) < o.h / 2 && Math.abs(b.x - o.x) < o.w / 2) { bump(o.g); b.hit = true; o.g.flash = .1; }
        else if (o.t === 'squad') {
          const r = 16 + Math.sqrt(o.m) * 7;
          if (Math.abs(b.x - o.x) < r && Math.abs(b.y - o.y) < r) {
            b.hit = true; o.hits += b.dmg; burst(b.x, b.y, o.armor > 1 ? '#c9ced2' : '#a9b1b5', 3, .6); SFX.pop();
            while (o.hits >= o.armor && o.m > 0) { o.hits -= o.armor; o.m--; }
            if (o.m <= 0) kill(o, '#a9b1b5');
          }
        } else if (['sock', 'crate', 'spray', 'toaster', 'power'].includes(o.t)) {
          if (Math.abs(b.x - o.x) < 34 && Math.abs(b.y - o.y) < 34) {
            o.hp -= b.dmg; b.hit = true; o.flash = .08; SFX.thud();
            if (o.hp <= 0) {
              if (o.t === 'crate') { o.dead = true; G.n += o.gift; G.maxN = Math.max(G.maxN, G.n); grow(o.gift); float(o.x, o.y, '+' + o.gift, '#3d7d48', true); burst(o.x, o.y, '#f6c945', 24); SFX.crate(); buzz(15); }
              else if (o.t === 'power') { burst(o.x, o.y, '#f6c945', 30); powerUp(o); }
              else kill(o, '#e0543f');
            }
          }
        } else if (o === B && Math.abs(b.x - o.x) < o.r && Math.abs(b.y - o.y) < o.r) {
          o.hp -= b.dmg; b.hit = true; o.flash = .05; SFX.thud();
        }
      }
    }
    if (B && !B.dead && B.hp <= 0 && !G.won) { B.dead = true; burst(B.x, B.y, '#c7932a', 50, 1.5); burst(B.x, B.y, '#f6c945', 50, 1.5); shake(16); buzz([50, 40, 120]); SFX.win(); G.won = true; G.shots = []; G.lobs = []; banner('Küche sauber!'); setTimeout(win, 1300); }
    G.bullets = G.bullets.filter(b => !b.hit && b.y > -20);
    // things hit the troop
    const r = crowdR(), inBand = (y, pad = 0) => Math.abs(y - Y) < r * .7 + pad;
    for (const o of G.objs) {
      if (o.dead) continue;
      if (o.t === 'gates' && !o.used && o.y > Y - 12) { o.used = true; o.side = G.x < W / 2 ? 'l' : 'r'; o.burstT = 0; applyGate(o.side === 'l' ? o.l : o.r, o.side === 'l' ? W * .25 : W * .75, o.y); }
      if (o.t === 'slide' && !o.used && o.y > Y - 12) { o.used = true; o.burstT = 0; if (Math.abs(G.x - o.x) < o.w / 2 + r * .3) applyGate(o.g, o.x, o.y); else o.missed = true; }
      if (o.t === 'squad' && o.y > Y - r - 12 && Math.abs(o.x - G.x) < r + 16 + Math.sqrt(o.m) * 7) {
        const k = Math.min(G.n, o.m); lose(k, 'enemy'); o.m -= k; burst(o.x, o.y, '#f6c945', 12); if (o.m <= 0) { o.dead = true; G.killed++; }
      }
      if (o.t === 'sock' && o.y > Y - 34 && Math.abs(o.x - G.x) < r + 24) { o.dead = true; lose(o.dmg, 'enemy', '🧦'); }
      if ((o.t === 'spray' || o.t === 'toaster') && o.y > Y - 30 && Math.abs(o.x - G.x) < r + 26) { o.dead = true; lose(6 + L * 2, 'enemy'); }
      // hazards
      if (o.t === 'knife') {
        const slam = o.ph > 1.45 && o.ph < 1.72, inHalf = o.side === 'l' ? G.x - r * .5 < W / 2 : G.x + r * .5 > W / 2;
        if (slam && !o.hitDone) { o.hitDone = true; SFX.chop(); shake(4); if (inBand(o.y, 30) && inHalf) lose(4 + Math.floor(G.n * .3), 'hazard', '🔪'); }
        if (!slam) o.hitDone = false;
      }
      if (o.t === 'whisk') {
        o.cool -= dt;
        if (o.cool <= 0 && inBand(o.y, W * .42)) {
          const ax = Math.cos(o.ang), ay = Math.sin(o.ang), dx = G.x - W / 2, dy = Y - o.y, along = dx * ax + dy * ay, perp = Math.abs(dx * ay - dy * ax);
          if (Math.abs(along) < W * .42 && perp < r * .8 + 12) { o.cool = .3; lose(3 + L, 'hazard', '🌀'); burst(G.x, Y, '#f6c945', 8); }
        }
      }
      if (o.t === 'stove' && G.x > o.x && G.x < o.x + o.w && Math.abs(Y - o.y) < o.h / 2) { o.tick -= dt; SFX.sizzle(); if (o.tick <= 0) { o.tick = .12; lose(1 + Math.floor(L / 3), 'hazard', false); G.parts.push({ x: G.x + rnd(-r, r), y: Y, vx: rnd(-30, 30), vy: -120, t: 0, life: .6, col: '#ff8c42', s: 6 }); } }
      if (o.t === 'pin' && !o.hit && inBand(o.y, 18) && G.x + r * .6 > o.x && G.x - r * .6 < o.x + o.w) { o.hit = true; lose(4 + Math.floor(G.n * .25), 'hazard', '🥖'); }
      if (o === B && o.y > Y - r - o.r) { lose(G.n, 'enemy'); }
      if (o.t !== 'boss' && o.y > H + 120) o.dead = true;
    }
    for (const s of G.shots) if (!s.hit && Math.abs(s.y - Y) < 22 + r * .4 && Math.abs(s.x - G.x) < r + 10) { s.hit = true; lose(s.dmg, 'enemy', s.k === 'sock' ? '🧦' : s.k === 'plate' ? '🍽️' : '💦'); }
    G.shots = G.shots.filter(s => !s.hit && s.y < H + 40 && s.x > -40 && s.x < W + 40);
    for (const l of G.lobs) if (!l.done && l.t >= l.dur) { l.done = true; burst(l.tx, Y, '#c98b4a', 14); SFX.thud(); if (Math.abs(G.x - l.tx) < r + 30) lose(l.dmg, 'enemy', '🍞'); }
    G.lobs = G.lobs.filter(l => !l.done);
    G.objs = G.objs.filter(o => !o.dead);
    if (G.n <= 0 && !G.done && !G.won) { G.n = 0; gameOver(); }
    // effects
    for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 560 * dt; }
    G.parts = G.parts.filter(p => p.t < p.life);
    for (const f of G.floats) { f.t += dt; f.y -= 55 * dt; }
    G.floats = G.floats.filter(f => f.t < 1);
    for (const b of G.born) b.t += dt * 4;
    G.born = G.born.filter(b => b.t < 1);
    for (const o of G.objs) if ((o.t === 'gates' || o.t === 'slide') && o.used) o.burstT += dt;
    G.shake = Math.max(0, G.shake - dt * 32); G.pulse = Math.max(0, G.pulse - dt * 3);
    // HUD
    $('.g-n').textContent = G.n; $('.g-count').style.transform = `scale(${1 + G.pulse * .25})`;
    $('.g-prog i').style.width = clamp((1 - (Y - B.y) / G.total) * 100, 0, 100) + '%';
    $('.g-buffs').innerHTML = (G.shieldT > 0 ? `<span>🧀 ${Math.ceil(G.shieldT)}</span>` : '') + (G.rapidT > 0 ? `<span>⚡ ${Math.ceil(G.rapidT)}</span>` : '') + (G.shieldLeft > 0 ? `<span>🧤 ${G.shieldLeft}</span>` : '');
  }

  // ---------- draw ----------
  const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  function floor(off) {
    ctx.fillStyle = '#e8f1ec'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d3e3da'; ctx.lineWidth = 2; const s = 54, o = off % s;
    ctx.beginPath(); for (let y = o - s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); } for (let x = s / 2; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke();
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(0, 0, 7, H); ctx.fillRect(W - 7, 0, 7, H);
  }
  function gateBox(g, x0, y, w, h, used, burstT, mystery) {
    const good = isGood(g);
    if (used) { const k = burstT / .5; ctx.globalAlpha = Math.max(0, 1 - k); ctx.save(); ctx.translate(x0 + w / 2, y); ctx.scale(1 + k * .5, 1 + k * .5); ctx.translate(-(x0 + w / 2), -y); }
    ctx.fillStyle = g.flash > 0 ? '#fffdf8' : mystery ? '#8e6cc7' : good ? '#5aa866' : '#e0644f';
    rr(x0, y - h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = mystery ? '#6a4fa3' : good ? '#3d7d48' : '#b5402f'; ctx.lineWidth = 3; ctx.stroke();
    if (g.alt != null) { ctx.fillStyle = 'rgba(255,255,255,.25)'; rr(x0 + 4, y + h / 2 - 9, (w - 8) * (g.fT / .75), 5, 3); ctx.fill(); }
    const s = 1 + (g.pop || 0) * .35; g.pop = Math.max(0, (g.pop || 0) - .08);
    ctx.save(); ctx.translate(x0 + w / 2, y + 2); ctx.scale(s, s);
    ctx.fillStyle = g.flash > 0 ? '#2b2a33' : '#fffdf8'; ctx.font = '900 30px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label(g), 0, 0); ctx.restore();
    if (used) ctx.restore();
    ctx.globalAlpha = 1; if (g.flash > 0) g.flash -= 1 / 60;
  }
  function drawGates(o) {
    const w = W / 2 - 11;
    if (!o.used || o.side === 'l') gateBox(o.l, 8, o.y, w, o.h, o.used, o.burstT, o.l.op === '?');
    if (!o.used || o.side === 'r') gateBox(o.r, W / 2 + 3, o.y, w, o.h, o.used, o.burstT, o.r.op === '?');
  }
  function drawCrowd(t) {
    const Y = cy(), shown = Math.min(G.n, 120), r = crowdR(), s = Math.max(11, Math.min(20, 80 / Math.sqrt(shown + 4)));
    ctx.fillStyle = 'rgba(43,42,51,.10)'; ctx.beginPath(); ctx.ellipse(G.x, Y + r * .55 + 6, r + 10, r * .35 + 6, 0, 0, 7); ctx.fill();
    if (G.shieldT > 0) { ctx.fillStyle = `rgba(246,201,69,${.25 + Math.sin(t * 12) * .08})`; ctx.beginPath(); ctx.ellipse(G.x, Y, r + 22, r * .75 + 20, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#e3a92b'; ctx.lineWidth = 3; ctx.stroke(); }
    const fresh = new Map(G.born.map(b => [b.i, b.t]));
    for (let i = 0; i < shown; i++) {
      const a = i * 2.39996, d = r * Math.sqrt((i + .5) / shown), k = fresh.has(i) ? .4 + fresh.get(i) * .6 : 1;
      const x = G.x + Math.cos(a) * d, y = Y + Math.sin(a) * d * .7 + Math.sin(t * 13 + i) * 1.4, z = s * 2 * k;
      ctx.drawImage(SPR.noodle, x - z / 2, y - z / 2, z, z);
    }
    if (G.n > 120) { ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = '#6b6676'; ctx.textAlign = 'center'; ctx.fillText('+' + (G.n - 120), G.x, Y + r + 22); }
  }
  function tag(x, y, txt, col) { ctx.font = '900 15px Nunito, sans-serif'; const w = ctx.measureText(String(txt)).width + 14; ctx.fillStyle = '#fffdf8'; rr(x - w / 2, y - 11, w, 22, 11); ctx.fill(); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); }
  function bar(x, y, w, p, col) { ctx.fillStyle = 'rgba(43,42,51,.18)'; rr(x - w / 2, y, w, 7, 4); ctx.fill(); ctx.fillStyle = col; rr(x - w / 2, y, Math.max(0, w * p), 7, 4); ctx.fill(); }
  const img = (s, x, y, w, h = w) => ctx.drawImage(s, x - w / 2, y - h / 2, w, h);
  function drawObj(o, t) {
    if (o.t === 'gates') return drawGates(o);
    if (o.t === 'slide') { if (!o.missed) gateBox(o.g, o.x - o.w / 2, o.y, o.w, o.h, o.used, o.burstT); else { ctx.globalAlpha = .25; gateBox(o.g, o.x - o.w / 2, o.y, o.w, o.h, false, 0); ctx.globalAlpha = 1; } ctx.fillStyle = 'rgba(43,42,51,.25)'; ctx.fillRect(8, o.y - 2, W - 16, 4); return; }
    if (o.t === 'squad') {
      const n = Math.min(o.m, 32), r = 16 + Math.sqrt(o.m) * 7, z = 30;
      for (let i = 0; i < n; i++) { const a = i * 2.39996, d = r * .78 * Math.sqrt((i + .5) / n), j = Math.sin(t * 9 + o.wob + i) * 2; img(o.armor > 1 ? SPR.armor : SPR.bunny, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * .7 + j, z); }
      return tag(o.x, o.y - r - 12, o.armor > 1 ? '🛡️ ' + o.m : o.m, '#6b6676');
    }
    if (o.t === 'sock') { img(SPR.sock, o.x, o.y, o.flash > 0 ? 70 : 64); bar(o.x, o.y + 34, 52, o.hp / o.max, '#e0543f'); }
    if (o.t === 'spray') { img(SPR.spray, o.x, o.y, o.flash > 0 ? 66 : 60); bar(o.x, o.y + 34, 52, o.hp / o.max, '#e0543f'); }
    if (o.t === 'toaster') { img(SPR.toaster, o.x, o.y, o.flash > 0 ? 78 : 72, o.flash > 0 ? 64 : 59); bar(o.x, o.y + 34, 52, o.hp / o.max, '#e0543f'); }
    if (o.t === 'crate') { img(SPR.crate, o.x, o.y, 60); tag(o.x, o.y - 42, '+' + o.gift + ' 🍝', '#3d7d48'); bar(o.x, o.y + 32, 48, o.hp / o.max, '#4f9a5b'); }
    if (o.t === 'power') {
      ctx.fillStyle = `rgba(246,201,69,${.35 + Math.sin(t * 6) * .1})`; ctx.beginPath(); ctx.arc(o.x, o.y, 34, 0, 7); ctx.fill(); ctx.strokeStyle = '#e3a92b'; ctx.lineWidth = 3; ctx.stroke();
      img(o.kind === 'shield' ? SPR.cheese : o.kind === 'bomb' ? SPR.tomato : SPR.bolt, o.x, o.y, 46); bar(o.x, o.y + 40, 48, o.hp / o.max, '#e3a92b');
    }
    if (o.t === 'knife') {
      const x0 = o.side === 'l' ? 8 : W / 2, w = W / 2 - 8, warn = o.ph > 1.1 && o.ph < 1.45, slam = o.ph > 1.45 && o.ph < 1.72;
      ctx.fillStyle = warn ? `rgba(224,84,63,${.15 + (o.ph - 1.1) * .8})` : slam ? 'rgba(224,84,63,.45)' : 'rgba(43,42,51,.07)'; rr(x0, o.y - 30, w, 60, 8); ctx.fill();
      const lift = slam ? 0 : warn ? 40 + (o.ph - 1.1) * 60 : 26;
      ctx.save(); ctx.translate(0, -lift);
      ctx.fillStyle = '#c8cfd4'; ctx.beginPath(); ctx.moveTo(x0 + 12, o.y - 8); ctx.lineTo(x0 + w - 60, o.y - 8); ctx.lineTo(x0 + w - 60, o.y + 10); ctx.quadraticCurveTo(x0 + 40, o.y + 22, x0 + 6, o.y + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8d979d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#6b4a2f'; rr(x0 + w - 62, o.y - 9, 56, 18, 6); ctx.fill();
      ctx.restore();
      if (slam) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x0, o.y + 12, w, 3); }
    }
    if (o.t === 'whisk') {
      const L = W * .42, cx = W / 2;
      ctx.save(); ctx.translate(cx, o.y); ctx.rotate(o.ang);
      ctx.strokeStyle = '#9aa3a8'; ctx.lineWidth = 3;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(s * L * .55, 0, L * .45, 6 + i * 6, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#6b4a2f'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
      ctx.restore();
    }
    if (o.t === 'stove') {
      const g = ctx.createRadialGradient(o.x + o.w / 2, o.y, 10, o.x + o.w / 2, o.y, o.w * .6);
      g.addColorStop(0, `rgba(255,120,40,${.75 + Math.sin(t * 8) * .1})`); g.addColorStop(1, 'rgba(224,84,63,.25)');
      ctx.fillStyle = '#3a3a40'; rr(o.x, o.y - o.h / 2, o.w, o.h, 14); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y, o.w * .42, o.h * .38, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,120,.6)'; ctx.lineWidth = 2; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y, o.w * .12 * i, o.h * .1 * i, 0, 0, 7); ctx.stroke(); }
    }
    if (o.t === 'pin') {
      ctx.fillStyle = '#d9a86c'; rr(o.x + 18, o.y - 14, o.w - 36, 28, 14); ctx.fill(); ctx.strokeStyle = '#a97a44'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#a97a44'; rr(o.x, o.y - 6, 22, 12, 6); ctx.fill(); rr(o.x + o.w - 22, o.y - 6, 22, 12, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(169,122,68,.4)'; for (let i = 1; i < 5; i++) { const x = o.x + 18 + (o.w - 36) * i / 5 + (G.t * 60 % ((o.w - 36) / 5)); ctx.beginPath(); ctx.moveTo(x, o.y - 12); ctx.lineTo(x, o.y + 12); ctx.stroke(); }
    }
    if (o.t === 'boss' && !o.dead) {
      const k = o.kind, wob = Math.sin(t * 3) * 4, f = o.flash > 0 ? 1.05 : 1; if (o.flash > 0) o.flash -= 1 / 60;
      if (k.id === 'vacuum') { ctx.fillStyle = 'rgba(43,42,51,.06)'; ctx.beginPath(); ctx.moveTo(o.x - 30, o.y + 90); ctx.lineTo(G.x - 90, cy()); ctx.lineTo(G.x + 90, cy()); ctx.lineTo(o.x + 30, o.y + 90); ctx.fill(); }
      img(SPR[k.spr], o.x, o.y + wob, k.w * f, k.h * f);
      ctx.fillStyle = '#2b2a33'; ctx.font = '700 30px Caveat, cursive'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(k.name, o.x, o.y - k.h / 2 - 8);
      bar(o.x, o.y + k.h / 2 + 4, 170, o.hp / o.max, '#e0543f');
    }
  }
  function draw(t) {
    ctx.save();
    if (G && G.shake) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
    floor(t * (G ? G.speed : 70));
    if (G) {
      const order = ['stove', 'knife', 'gates', 'slide', 'whisk', 'pin', 'crate', 'power', 'squad', 'sock', 'spray', 'toaster', 'boss'];
      for (const kind of order) for (const o of G.objs) if (o.t === kind && o.y > -200 && o.y < H + 140) drawObj(o, t);
      for (const l of G.lobs) {   // toast in the air + where it will land
        const k = l.t / l.dur, x = l.x0 + (l.tx - l.x0) * k, y = l.y0 + (cy() - l.y0) * k - Math.sin(k * Math.PI) * 140;
        ctx.strokeStyle = `rgba(224,84,63,${.4 + k * .5})`; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(l.tx, cy(), 34, 14, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.save(); ctx.translate(x, y); ctx.rotate(k * 8); img(SPR.toast, 0, 0, 38); ctx.restore();
      }
      for (const s of G.shots) {
        if (s.k === 'drop') { ctx.fillStyle = '#5bb6e8'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(s.x - 2, s.y - 2, 2.5, 0, 7); ctx.fill(); }
        else if (s.k === 'plate') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = '#e9eef2'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 7, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#9aa7b0'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
        else { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); img(SPR.socky, 0, 0, 40); ctx.restore(); }
      }
      ctx.fillStyle = G.rapidT > 0 ? '#ff9b3d' : '#e3a92b';
      for (const b of G.bullets) { ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 9, 0, 0, 7); ctx.fill(); }
      if (G.n > 0) drawCrowd(t);
      for (const p of G.parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s); }
      ctx.globalAlpha = 1;
      for (const f of G.floats) { ctx.globalAlpha = Math.min(1, 2 - f.t * 2); ctx.fillStyle = f.col; ctx.font = `900 ${f.big ? 34 : 22}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 5; ctx.strokeStyle = '#fffdf8'; ctx.strokeText(f.txt, f.x, f.y); ctx.fillText(f.txt, f.x, f.y); }
      ctx.globalAlpha = 1;
      if (G.flash > 0) { ctx.fillStyle = `rgba(224,84,63,${G.flash * .35})`; ctx.fillRect(0, 0, W, H); }
    }
    ctx.restore();
  }
  function frame(now) {
    if (closed) return;
    const dt = Math.min(.04, (now - last) / 1000 || 0); last = now;
    if (running) step(dt);
    draw(now / 1000);
    raf = requestAnimationFrame(frame);
  }

  // ---------- screens ----------
  const show = (sel, on) => { $(sel).hidden = !on; };
  function setBest(level) { if (level > best) { best = level; onBest(best); return true; } return false; }
  function win() {
    if (closed || !G) return;
    running = false; setBest(G.level + 1);
    const opts = PERKS.slice().sort(() => Math.random() - .5).slice(0, 3);
    $('.g-perkhint').textContent = G.level === 10 ? 'Alle 10 Küchen sauber! Ab jetzt wird es endlos schwerer. Such dir was aus:' : 'Such dir was aus für die nächste Küche:';
    $('.g-perks').innerHTML = opts.map(p => `<button class="g-pk" data-id="${p.id}"><span>${p.icon}</span><span><b>${p.name}</b><small>${p.text}${G.perks[p.id] ? ' · hast du schon ' + G.perks[p.id] + '×' : ''}</small></span></button>`).join('');
    show('.g-perk', true);
  }
  function gameOver() {
    G.done = true; running = false; SFX.lose(); buzz(150);
    const rec = setBest(G.level);
    $('.g-otitle').textContent = pick(LOSE);
    $('.g-stats').innerHTML = `<div><b>${G.level - 1}</b><span>${G.level - 1 === 1 ? 'Küche' : 'Küchen'} sauber</span></div><div><b>${G.killed}</b><span>Chaos weg&shy;geputzt</span></div><div><b>${G.maxN}</b><span>Nudeln max.</span></div>`;
    $('.g-obest').textContent = rec ? '🎉 Neuer Rekord: Küche ' + best + '!' : 'Dein Rekord: Küche ' + best;
    show('.g-over', true);
  }
  const start = () => { audio(); show('.g-start', false); show('.g-over', false); newRun(); running = true; };
  function pause() { if (!running) return false; running = false; show('.g-paused', true); return true; }
  function close() {
    if (closed) return; closed = true; running = false; cancelAnimationFrame(raf);
    removeEventListener('resize', resize); removeEventListener('keydown', kd); removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis);
    root.remove(); onClose();
  }
  const vis = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', vis);
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('g-go') || b.classList.contains('g-again')) start();
    else if (b.classList.contains('g-close') || b.classList.contains('g-quit')) close();
    else if (b.classList.contains('g-pause')) pause();
    else if (b.classList.contains('g-resume')) { show('.g-paused', false); audio(); running = true; }
    else if (b.classList.contains('g-mute')) { try { localStorage.setItem('gn_game_mute', muted() ? '0' : '1'); } catch (x) {} setMute(); audio(); }
    else if (b.classList.contains('g-pk')) { G.perks[b.dataset.id]++; G.level++; show('.g-perk', false); startLevel(); running = true; }
  });
  raf = requestAnimationFrame(frame);
  return {
    back() { if (running) { pause(); return; } close(); }, close,
    get state() { return G; }, get running() { return running; },
    sim(dt, n) { for (let i = 0; i < n; i++) { if (!running) break; step(dt); } },   // for tests: fast-forward
  };
}
