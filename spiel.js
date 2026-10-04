// Nudel-Rush: a little runner game on Home. Lead a growing troop of noodles through math gates and clean the kitchen
// of household chaos (dust bunnies, sock monsters, the "Wäscheberg" boss). No stars, no comparison with the partner:
// only your own record, kept on your own devices (S.game.best via onBest).
//   openGame({ best, onBest, onClose })

const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const muted = () => { try { return localStorage.getItem('gn_game_mute') === '1'; } catch (e) { return false; } };

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
let popT = 0;
const SFX = {
  good: () => [523, 659, 784].forEach((f, i) => tone(f, .12, 'triangle', .07, 0, i * .06)),
  bad: () => { tone(330, .22, 'sawtooth', .045, -180); },
  pop: () => { const n = performance.now(); if (n - popT < 45) return; popT = n; tone(rnd(500, 700), .05, 'square', .025, -200); },
  hurt: () => tone(180, .14, 'sawtooth', .05, -90),
  crate: () => [660, 880].forEach((f, i) => tone(f, .1, 'triangle', .06, 0, i * .05)),
  boss: () => { tone(110, .5, 'sawtooth', .05, -50); tone(82, .6, 'triangle', .06, -30, .15); },
  thud: () => { const n = performance.now(); if (n - popT < 70) return; popT = n; tone(90, .07, 'triangle', .06, -30); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .08, 0, i * .1)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, .22, 'triangle', .07, 0, i * .14)),
};

// ---------- sprites, drawn once ----------
function sprite(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
const SPR = {};
function makeSprites() {
  SPR.noodle = sprite(64, (g, s) => {           // a round little noodle with a curl and a face
    const r = s * .4, c = s / 2;
    g.fillStyle = '#c7932a'; g.beginPath(); g.arc(c, c + 3, r, 0, 7); g.fill();
    g.fillStyle = '#f6c945'; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(199,147,42,.75)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, r * .6, .5, 3.1); g.stroke();
    g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(c - r * .35, c - r * .45, r * .22, 0, 7); g.fill();
    g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(c - r * .3, c - r * .05, 3, 0, 7); g.arc(c + r * .3, c - r * .05, 3, 0, 7); g.fill();
    g.strokeStyle = '#2b2a33'; g.lineWidth = 2.2; g.beginPath(); g.arc(c, c + r * .12, r * .22, .3, 2.8); g.stroke();
  });
  SPR.bunny = sprite(64, (g, s) => {            // a dust bunny
    const c = s / 2;
    g.fillStyle = '#8f989d';
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; g.beginPath(); g.arc(c + Math.cos(a) * s * .24, c + Math.sin(a) * s * .24, s * .17, 0, 7); g.fill(); }
    g.fillStyle = '#b5bdc1'; g.beginPath(); g.arc(c, c, s * .27, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(c - 7, c - 3, 5.5, 0, 7); g.arc(c + 7, c - 3, 5.5, 0, 7); g.fill();
    g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(c - 6, c - 2, 2.8, 0, 7); g.arc(c + 8, c - 2, 2.8, 0, 7); g.fill();
    g.strokeStyle = '#2b2a33'; g.lineWidth = 2; g.beginPath(); g.moveTo(c - 12, c - 11); g.lineTo(c - 3, c - 8); g.moveTo(c + 12, c - 11); g.lineTo(c + 3, c - 8); g.stroke();
  });
  const emo = (e, px) => sprite(px * 1.3, (g, s) => { g.font = px + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, s / 2, s / 2 + px * .06); });
  SPR.sock = emo('🧦', 96); SPR.crate = emo('📦', 96); SPR.boss = emo('🧺', 220); SPR.socky = emo('🧦', 56);
}

// ---------- the game ----------
const PERKS = [
  { id: 'rate', icon: '🍴', name: 'Schnellere Gabel', text: '+25 % Feuerrate' },
  { id: 'dmg', icon: '🌶️', name: 'Scharfe Soße', text: 'Jeder Schuss trifft doppelt' },
  { id: 'start', icon: '🍝', name: 'Extraportion', text: '+10 Nudeln zu Beginn jeder Küche' },
  { id: 'spread', icon: '🔱', name: 'Dreizack-Gabel', text: '+1 Schuss pro Salve' },
  { id: 'gate', icon: '🧂', name: 'Prise Salz', text: 'Schüsse verbessern Tore doppelt so schnell' },
  { id: 'shield', icon: '🧤', name: 'Topflappen', text: 'Ein Minus-Tor pro Küche prallt ab' },
  { id: 'magnet', icon: '🧲', name: 'Nudelmagnet', text: 'Kisten geben 50 % mehr Nudeln' },
];
const LOSE = ['Das Chaos hat gewonnen', 'Die Wollmäuse feiern', 'Alle Nudeln verkocht', 'Der Wäscheberg lacht'];

export function openGame({ best = 0, onBest = () => {}, onClose = () => {} } = {}) {
  if (!SPR.noodle) makeSprites();
  const root = document.createElement('div'); root.id = 'gameov'; root.className = 'game';
  root.innerHTML = `<canvas class="g-cv" aria-label="Spielfeld Nudel-Rush"></canvas>
    <div class="g-hud">
      <div class="g-count"><span class="g-n">10</span><span class="g-lbl">Nudeln</span></div>
      <div class="g-mid"><div class="g-lvl">Küche 1</div><div class="g-prog"><i></i><b>🧺</b></div></div>
      <div class="g-btns"><button class="g-ic g-mute" aria-label="Ton an/aus"></button><button class="g-ic g-pause" aria-label="Pause">❚❚</button></div>
    </div>
    <div class="g-banner" hidden></div>
    <div class="g-ov g-start"><div class="g-card">
      <div class="g-title">Nudel-Rush</div>
      <p>Das Chaos rückt an. Deine Nudeln halten die Küche sauber.</p>
      <ul class="g-how"><li><b>👉</b>Finger links & rechts ziehen</li><li><b>🚪</b>Durch das bessere Tor laufen</li><li><b>🎯</b>Auf Tore schießen macht sie besser</li><li><b>🧺</b>Am Ende: der Wäscheberg</li></ul>
      <button class="g-btn g-go">Los geht's</button>
      <p class="g-best">${best ? 'Dein Rekord: Küche ' + best : 'Noch kein Rekord – leg los!'}</p>
      <button class="g-link g-close">Zurück</button></div></div>
    <div class="g-ov g-perk" hidden><div class="g-card"><div class="g-title sm">Küche sauber! 🎉</div><p>Such dir was aus für die nächste Küche:</p><div class="g-perks"></div></div></div>
    <div class="g-ov g-paused" hidden><div class="g-card"><div class="g-title sm">Pause</div><button class="g-btn g-resume">Weiter</button><button class="g-link g-quit">Spiel beenden</button></div></div>
    <div class="g-ov g-over" hidden><div class="g-card"><div class="g-title sm g-otitle"></div><div class="g-stats"></div><p class="g-best g-obest"></p>
      <button class="g-btn g-again">Nochmal</button><button class="g-link g-close">Zurück zu Home</button></div></div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s), cv = $('.g-cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, raf = 0, last = 0, running = false, G = null, closed = false;
  function resize() { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  resize(); addEventListener('resize', resize);
  const setMute = () => { $('.g-mute').textContent = muted() ? '🔇' : '🔊'; };
  setMute();

  // ----- run & level -----
  function newRun() { G = { level: 1, n: 10, perks: Object.fromEntries(PERKS.map(p => [p.id, 0])), killed: 0, maxN: 10 }; startLevel(); }
  function startLevel() {
    const L = G.level;
    Object.assign(G, { x: W / 2, tx: W / 2, objs: [], bullets: [], shots: [], parts: [], floats: [], born: [], fireT: 0, shake: 0, done: false, won: false, shieldLeft: G.perks.shield, bossWarned: false, pulse: 0 });
    G.n = Math.max(G.n, 10) + G.perks.start * 10;
    G.speed = Math.min(190, 105 + L * 7);
    let y = H * .15;
    const rows = Math.min(26, 10 + L * 2);
    for (let i = 0; i < rows; i++) {
      const r = Math.random();
      if (i === 0 || i % 3 === 0 || r < .3) G.objs.push(gates(y, L, i === 0));
      else if (r < .7) G.objs.push(squad(y, L));
      else if (r < .84 && L > 1) G.objs.push(sock(y, L));
      else G.objs.push(crate(y, L));
      y -= rnd(250, 300);
    }
    const hp = 70 + L * 55;
    G.boss = { t: 'boss', y: y - 160, x: W / 2, hp, max: hp, r: 78, throwT: 2 };
    G.objs.push(G.boss);
    G.total = H * .8 - G.boss.y;
    $('.g-lvl').textContent = 'Küche ' + L;
    banner('Küche ' + L);
  }
  function gates(y, L, first) {
    const good = () => Math.random() < .28 ? { op: '×', v: Math.random() < .15 + L * .02 ? 3 : 2 } : { op: '+', v: ri(4, 7 + L * 2) };
    const bad = () => Math.random() < .2 ? { op: '÷', v: 2 } : { op: '+', v: -ri(3, 5 + L * 3) };
    let a = Math.random() < .5 ? good() : bad(), b = Math.random() < .55 ? bad() : good();
    if (first) { a = { op: '+', v: ri(5, 8) }; b = { op: '+', v: -ri(2, 4) }; if (Math.random() < .5) [a, b] = [b, a]; }
    return { t: 'gates', y, h: 54, l: a, r: b, used: false };
  }
  const squad = (y, L) => ({ t: 'squad', y, x: rnd(W * .2, W * .8), m: ri(5, 9) + L * ri(2, 4), wob: rnd(0, 6) });
  const sock = (y, L) => { const hp = 10 + L * 5; return { t: 'sock', y, x: rnd(W * .2, W * .8), hp, max: hp, dmg: 5 + L * 2, sway: rnd(0, 6) }; };
  const crate = (y, L) => { const hp = 6 + L * 2; return { t: 'crate', y, x: rnd(W * .2, W * .8), hp, max: hp, gift: Math.round((ri(6, 10) + L * 2) * (1 + G.perks.magnet * .5)) }; };

  // ----- input -----
  let dragX = null;
  cv.addEventListener('pointerdown', e => { dragX = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
  cv.addEventListener('pointermove', e => { if (dragX == null || !G) return; G.tx = Math.max(26, Math.min(W - 26, G.tx + (e.clientX - dragX) * 1.3)); dragX = e.clientX; });
  const up = () => { dragX = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const keys = {}; const kd = e => { keys[e.key] = true; }, ku = e => { keys[e.key] = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  // ----- helpers -----
  const cy = () => H * .8;
  const crowdR = () => Math.min(W * .3, 14 + Math.sqrt(G.n) * 4.4);
  const float = (x, y, txt, col, big) => G.floats.push({ x, y, txt, col, t: 0, big });
  function burst(x, y, col, k = 10, sp = 1) { if (reduced()) k = Math.min(k, 4); for (let i = 0; i < k; i++) G.parts.push({ x, y, vx: rnd(-170, 170) * sp, vy: rnd(-260, 40) * sp, t: 0, life: rnd(.4, .8), col, s: rnd(3, 7) }); }
  function shake(v) { if (!reduced()) G.shake = Math.min(16, G.shake + v); }
  function hurt(k) { G.n = Math.max(0, G.n - k); shake(4 + k * .3); buzz(30); SFX.hurt(); }
  function grow(d) { const shown = Math.min(G.n, 120); for (let i = 0; i < Math.min(d, 20); i++) G.born.push({ i: Math.max(0, shown - 1 - i), t: 0 }); G.pulse = 1; }
  function banner(txt, warn) { const b = $('.g-banner'); b.textContent = txt; b.className = 'g-banner' + (warn ? ' warn' : ''); b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 1700); }
  const label = g => g.op === '+' ? (g.v >= 0 ? '+' + g.v : '−' + (-g.v)) : g.op + g.v;
  const isGood = g => g.op === '×' || (g.op === '+' && g.v >= 0);
  function pass(o) {
    const g = G.x < W / 2 ? o.l : o.r, before = G.n, gx = G.x < W / 2 ? W * .25 : W * .75;
    o.used = true; o.side = G.x < W / 2 ? 'l' : 'r'; o.burstT = 0;
    if (g.op === '+' && g.v < 0 && G.shieldLeft > 0) { G.shieldLeft--; float(G.x, cy() - 60, '🧤 abgeprallt', '#4f9a5b'); SFX.good(); return; }
    if (g.op === '+') G.n += g.v; else if (g.op === '×') G.n *= g.v; else G.n = Math.ceil(G.n / g.v);
    G.n = Math.max(0, Math.round(G.n)); G.maxN = Math.max(G.maxN, G.n);
    const d = G.n - before;
    float(G.x, cy() - 70, (d >= 0 ? '+' : '−') + Math.abs(d), d >= 0 ? '#3d7d48' : '#c0533f', true);
    burst(gx, o.y, isGood(g) ? '#7cc488' : '#ef8a76', 22, 1.2);
    if (d > 0) { grow(d); SFX.good(); buzz(15); } else { shake(7); SFX.bad(); buzz([40, 30, 40]); }
  }

  // ----- update -----
  function step(dt) {
    if (!G || G.done) return;
    const L = G.level, Y = cy();
    if (keys.ArrowLeft) G.tx = Math.max(26, G.tx - 440 * dt);
    if (keys.ArrowRight) G.tx = Math.min(W - 26, G.tx + 440 * dt);
    G.x += (G.tx - G.x) * Math.min(1, dt * 16);
    const sc = G.speed * dt, B = G.boss;
    // fire: more noodles, more forks
    G.fireT -= dt;
    if (G.fireT <= 0 && G.n > 0) {
      G.fireT = (.3 / (1 + Math.log2(1 + G.n) * .2)) / (1 + G.perks.rate * .25);
      const k = Math.min(6, 1 + Math.floor(G.n / 15)) + G.perks.spread, r = crowdR();
      for (let i = 0; i < k; i++) G.bullets.push({ x: G.x + (k === 1 ? 0 : (i / (k - 1) - .5) * r * 1.5), y: Y - r * .6, dmg: 1 + G.perks.dmg });
    }
    for (const b of G.bullets) b.y -= 760 * dt;
    // the world comes down; the boss stops near the top and throws socks
    for (const o of G.objs) {
      if (o === B) { if (o.y < H * .16) o.y += sc; else { o.y += sc * .14; o.x += Math.sin(performance.now() / 800) * 40 * dt; } continue; }
      o.y += sc;
      if (o.t === 'squad' && o.y > 0) o.x += Math.sign(G.x - o.x) * Math.min(Math.abs(G.x - o.x), (24 + L * 3) * dt);
      if (o.t === 'sock') o.x += Math.sin(performance.now() / 500 + o.sway) * 50 * dt;
    }
    if (B && !B.dead && B.y > -40 && !G.bossWarned) { G.bossWarned = true; banner('Der Wäscheberg kommt!', true); SFX.boss(); buzz([60, 40, 60]); }
    if (B && !B.dead && !G.won && B.y >= H * .16) {
      B.throwT -= dt;
      if (B.throwT <= 0) { B.throwT = Math.max(.7, 1.9 - L * .12); G.shots.push({ x: B.x, y: B.y + 40, vx: (G.x - B.x) * .55, vy: 260 + L * 12, rot: 0 }); }
    }
    for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 8; }
    // hits
    for (const b of G.bullets) {
      for (const o of G.objs) {
        if (b.hit || o.dead || o.y < -80) continue;
        if (o.t === 'gates' && !o.used && Math.abs(b.y - o.y) < o.h / 2) {
          const g = b.x < W / 2 ? o.l : o.r;
          if (g.op === '+') { g.bump = (g.bump || 0) + 1 + G.perks.gate; while (g.bump >= 3) { g.bump -= 3; g.v++; g.pop = 1; } }
          b.hit = true; g.flash = .1;
        } else if (o.t === 'squad') {
          const r = 16 + Math.sqrt(o.m) * 7;
          if (Math.abs(b.x - o.x) < r && Math.abs(b.y - o.y) < r) { o.m -= b.dmg; b.hit = true; burst(b.x, b.y, '#a9b1b5', 3, .6); SFX.pop(); if (o.m <= 0) { o.dead = true; G.killed++; burst(o.x, o.y, '#a9b1b5', 18); } }
        } else if (o.t === 'sock' || o.t === 'crate') {
          if (Math.abs(b.x - o.x) < 32 && Math.abs(b.y - o.y) < 34) {
            o.hp -= b.dmg; b.hit = true; o.flash = .08; SFX.thud();
            if (o.hp <= 0) {
              o.dead = true;
              if (o.t === 'crate') { G.n += o.gift; G.maxN = Math.max(G.maxN, G.n); grow(o.gift); float(o.x, o.y, '+' + o.gift, '#3d7d48', true); burst(o.x, o.y, '#f6c945', 24); SFX.crate(); buzz(15); }
              else { G.killed++; burst(o.x, o.y, '#e0543f', 22); SFX.crate(); }
            }
          }
        } else if (o === B && Math.abs(b.x - o.x) < o.r && Math.abs(b.y - o.y) < o.r) {
          o.hp -= b.dmg; b.hit = true; o.flash = .05; SFX.thud();
          if (o.hp <= 0) { o.dead = true; burst(o.x, o.y, '#c7932a', 50, 1.5); burst(o.x, o.y, '#f6c945', 50, 1.5); shake(16); buzz([50, 40, 120]); SFX.win(); G.won = true; G.shots = []; banner('Küche sauber!'); setTimeout(win, 1300); }
        }
      }
    }
    G.bullets = G.bullets.filter(b => !b.hit && b.y > -20);
    // contact with the troop
    const r = crowdR();
    for (const o of G.objs) {
      if (o.dead) continue;
      if (o.t === 'gates' && !o.used && o.y > Y - 12) pass(o);
      if (o.t === 'squad' && o.y > Y - r - 12 && Math.abs(o.x - G.x) < r + 16 + Math.sqrt(o.m) * 7) {
        const k = Math.min(G.n, o.m); hurt(k); o.m -= k; burst(o.x, o.y, '#f6c945', 12); float(G.x, Y - 50, '−' + k, '#c0533f', true);
        if (o.m <= 0) { o.dead = true; G.killed++; }
      }
      if (o.t === 'sock' && o.y > Y - 34 && Math.abs(o.x - G.x) < r + 24) { o.dead = true; hurt(o.dmg); float(G.x, Y - 50, '−' + o.dmg, '#c0533f', true); }
      if (o === B && o.y > Y - r - o.r) { G.n = 0; }
      if (o.t !== 'boss' && o.y > H + 90) o.dead = true;
    }
    for (const s of G.shots) if (!s.hit && Math.abs(s.y - Y) < 24 && Math.abs(s.x - G.x) < r + 12) { s.hit = true; const k = 2 + L; hurt(k); float(G.x, Y - 50, '−' + k + ' 🧦', '#c0533f', true); }
    G.shots = G.shots.filter(s => !s.hit && s.y < H + 40);
    G.objs = G.objs.filter(o => !o.dead || (o.t === 'gates' && o.burstT < .5));
    if (G.n <= 0 && !G.done && !G.won) { G.n = 0; lose(); }
    // effects
    for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 560 * dt; }
    G.parts = G.parts.filter(p => p.t < p.life);
    for (const f of G.floats) { f.t += dt; f.y -= 55 * dt; }
    G.floats = G.floats.filter(f => f.t < 1);
    for (const b of G.born) b.t += dt * 4;
    G.born = G.born.filter(b => b.t < 1);
    for (const o of G.objs) if (o.t === 'gates' && o.used) o.burstT += dt;
    G.shake = Math.max(0, G.shake - dt * 32); G.pulse = Math.max(0, G.pulse - dt * 3);
    // HUD
    $('.g-n').textContent = G.n; $('.g-count').style.transform = `scale(${1 + G.pulse * .25})`;
    $('.g-prog i').style.width = Math.max(0, Math.min(100, (1 - (Y - B.y) / G.total) * 100)) + '%';
  }

  // ----- draw -----
  const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  function floor(off) {
    ctx.fillStyle = '#e8f1ec'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d3e3da'; ctx.lineWidth = 2; const s = 54, o = off % s;
    ctx.beginPath(); for (let y = o - s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); } for (let x = s / 2; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke();
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(0, 0, 7, H); ctx.fillRect(W - 7, 0, 7, H);
  }
  function drawGates(o) {
    for (const [g, side, x0] of [[o.l, 'l', 8], [o.r, 'r', W / 2 + 3]]) {
      const w = W / 2 - 11, good = isGood(g);
      if (o.used) { if (o.side !== side) continue; const k = o.burstT / .5; ctx.globalAlpha = Math.max(0, 1 - k); const sc = 1 + k * .5; ctx.save(); ctx.translate(x0 + w / 2, o.y); ctx.scale(sc, sc); ctx.translate(-(x0 + w / 2), -o.y); }
      ctx.fillStyle = g.flash > 0 ? '#fffdf8' : good ? '#5aa866' : '#e0644f';
      rr(x0, o.y - o.h / 2, w, o.h, 12); ctx.fill();
      ctx.strokeStyle = good ? '#3d7d48' : '#b5402f'; ctx.lineWidth = 3; ctx.stroke();
      const s = 1 + (g.pop || 0) * .35; g.pop = Math.max(0, (g.pop || 0) - .08);
      ctx.save(); ctx.translate(x0 + w / 2, o.y + 2); ctx.scale(s, s);
      ctx.fillStyle = g.flash > 0 ? (good ? '#3d7d48' : '#b5402f') : '#fffdf8'; ctx.font = '900 30px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label(g), 0, 0); ctx.restore();
      if (o.used) ctx.restore();
      ctx.globalAlpha = 1; if (g.flash > 0) g.flash -= 1 / 60;
    }
  }
  function drawCrowd(t) {
    const Y = cy(), shown = Math.min(G.n, 120), r = crowdR(), s = Math.max(11, Math.min(20, 80 / Math.sqrt(shown + 4)));
    ctx.fillStyle = 'rgba(43,42,51,.10)'; ctx.beginPath(); ctx.ellipse(G.x, Y + r * .55 + 6, r + 10, r * .35 + 6, 0, 0, 7); ctx.fill();
    const fresh = new Map(G.born.map(b => [b.i, b.t]));
    for (let i = 0; i < shown; i++) {
      const a = i * 2.39996, d = r * Math.sqrt((i + .5) / shown), k = fresh.has(i) ? .4 + fresh.get(i) * .6 : 1;
      const x = G.x + Math.cos(a) * d, y = Y + Math.sin(a) * d * .7 + Math.sin(t * 13 + i) * 1.4, z = s * 2 * k;
      ctx.drawImage(SPR.noodle, x - z / 2, y - z / 2, z, z);
    }
    if (G.n > 120) { ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = '#6b6676'; ctx.textAlign = 'center'; ctx.fillText('+' + (G.n - 120), G.x, Y + r + 22); }
  }
  function drawSquad(o, t) {
    const n = Math.min(o.m, 32), r = 16 + Math.sqrt(o.m) * 7, z = 30;
    for (let i = 0; i < n; i++) { const a = i * 2.39996, d = r * .78 * Math.sqrt((i + .5) / n), j = Math.sin(t * 9 + o.wob + i) * 2; ctx.drawImage(SPR.bunny, o.x + Math.cos(a) * d - z / 2, o.y + Math.sin(a) * d * .7 - z / 2 + j, z, z); }
    tag(o.x, o.y - r - 12, o.m, '#6b6676');
  }
  function tag(x, y, txt, col) { ctx.font = '900 15px Nunito, sans-serif'; const w = ctx.measureText(String(txt)).width + 14; ctx.fillStyle = '#fffdf8'; rr(x - w / 2, y - 11, w, 22, 11); ctx.fill(); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); }
  function bar(x, y, w, p, col) { ctx.fillStyle = 'rgba(43,42,51,.18)'; rr(x - w / 2, y, w, 7, 4); ctx.fill(); ctx.fillStyle = col; rr(x - w / 2, y, Math.max(0, w * p), 7, 4); ctx.fill(); }
  function draw(t) {
    ctx.save();
    if (G && G.shake) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
    floor(t * (G ? G.speed : 70));
    if (G) {
      for (const o of G.objs) {
        if (o.y < -170 || o.y > H + 120) continue;
        if (o.t === 'gates') drawGates(o);
        else if (o.t === 'squad') drawSquad(o, t);
        else if (o.t === 'sock') { const z = o.flash > 0 ? 70 : 64; ctx.drawImage(SPR.sock, o.x - z / 2, o.y - z / 2, z, z); bar(o.x, o.y + 34, 52, o.hp / o.max, '#e0543f'); if (o.flash > 0) o.flash -= 1 / 60; }
        else if (o.t === 'crate') { ctx.drawImage(SPR.crate, o.x - 30, o.y - 30, 60, 60); tag(o.x, o.y - 42, '+' + o.gift + ' 🍝', '#3d7d48'); bar(o.x, o.y + 32, 48, o.hp / o.max, '#4f9a5b'); }
        else if (o.t === 'boss' && !o.dead) {
          const z = (o.flash > 0 ? 176 : 168) + Math.sin(t * 3) * 4; if (o.flash > 0) o.flash -= 1 / 60;
          ctx.drawImage(SPR.boss, o.x - z / 2, o.y - z / 2, z, z);
          ctx.fillStyle = '#2b2a33'; ctx.font = '700 30px Caveat, cursive'; ctx.textAlign = 'center'; ctx.fillText('Der Wäscheberg', o.x, o.y - o.r - 18);
          bar(o.x, o.y + o.r - 4, 170, o.hp / o.max, '#e0543f');
        }
      }
      for (const s of G.shots) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.drawImage(SPR.socky, -20, -20, 40, 40); ctx.restore(); }
      ctx.fillStyle = '#e3a92b';
      for (const b of G.bullets) { ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 9, 0, 0, 7); ctx.fill(); }
      if (G.n > 0) drawCrowd(t);
      for (const p of G.parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s); }
      ctx.globalAlpha = 1;
      for (const f of G.floats) { ctx.globalAlpha = Math.min(1, 2 - f.t * 2); ctx.fillStyle = f.col; ctx.font = `900 ${f.big ? 34 : 22}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#fffdf8'; ctx.strokeText(f.txt, f.x, f.y); ctx.fillText(f.txt, f.x, f.y); }
      ctx.globalAlpha = 1;
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

  // ----- screens -----
  const show = (sel, on) => { $(sel).hidden = !on; };
  function setBest(level) { if (level > best) { best = level; onBest(best); return true; } return false; }
  function win() {
    if (closed) return;
    running = false; setBest(G.level + 1);
    const opts = PERKS.slice().sort(() => Math.random() - .5).slice(0, 3);
    $('.g-perks').innerHTML = opts.map(p => `<button class="g-pk" data-id="${p.id}"><span>${p.icon}</span><span><b>${p.name}</b><small>${p.text}${G.perks[p.id] ? ' · hast du schon ' + G.perks[p.id] + '×' : ''}</small></span></button>`).join('');
    show('.g-perk', true);
  }
  function lose() {
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
  // the app's back button: first pause, then leave
  return { back() { if (running) { pause(); return; } close(); }, close, get state() { return G; }, get running() { return running; } };
}
