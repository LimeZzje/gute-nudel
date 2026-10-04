// Nudel-Rush Turbo: a fast, beat-driven runner on Home (Geometry Dash meets crowd runner).
// Swipe = steer, tap = the whole troop jumps. Everything sits on the beat of a live-synthesized track.
// 5 learnable levels (identical every attempt) with a learning curve: each level first shows its NEW elements one at a
// time, then mixes them and gets denser towards the end. Then an endless mode. Instant restart, practice mode with
// checkpoints. Noodles are your life bar: gates multiply them, hazards cost them, 0 = crash.
// No stars, never compared with the partner: only your own progress (S.game via onSave).
//   openGame({ data, onSave, onClose }) → { back, close, sim, state, running, jump }

const MAXN = 60;   // the troop never gets bigger than this
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const muted = () => { try { return localStorage.getItem('gn_game_mute') === '1'; } catch (e) { return false; } };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

// ---------- the levels ----------
// bpm, length in bars, how hard (from → to), which patterns may appear, the boss finale, colours
const LEVELS = [
  { id: 'fruehstueck', name: 'Frühstück', stars: 1, bpm: 116, bars: 24, seed: 11, speed: 1, from: .05, to: .4, boss: 'laundry', tint: '#e8f1ec', line: '#d3e3da', root: 45,
    pool: ['gates', 'spikes', 'crate', 'stove', 'spikeHalf', 'swarm'] },
  { id: 'spuele', name: 'Spülmaschine', stars: 2, bpm: 124, bars: 28, seed: 23, speed: 1.1, from: .35, to: .75, boss: 'dishes', tint: '#e6eef6', line: '#cfdbe8', root: 47,
    pool: ['gates', 'spikes', 'spikeHalf', 'stove', 'swarm', 'crate', 'knife', 'pin', 'pad'] },
  { id: 'keller', name: 'Waschkeller', stars: 3, bpm: 130, bars: 30, seed: 37, speed: 1.2, from: .5, to: .9, boss: 'laundry', tint: '#ece8f3', line: '#d9d2e6', root: 43,
    pool: ['gates', 'spikes', 'spikeHalf', 'stove', 'swarm', 'knife', 'pin', 'pad', 'wall', 'orb', 'shooter'] },
  { id: 'disco', name: 'Staubsauger-Disco', stars: 4, bpm: 136, bars: 32, seed: 51, speed: 1.3, from: .65, to: 1.05, boss: 'vacuum', tint: '#f3e8ee', line: '#e6d1dc', root: 48,
    pool: ['gates', 'spikes', 'spikeHalf', 'stove', 'swarm', 'knife', 'pin', 'pad', 'wall', 'orb', 'shooter', 'mirror', 'tight'] },
  { id: 'sonntag', name: 'Sonntagsputz', stars: 5, bpm: 144, bars: 34, seed: 77, speed: 1.4, from: .8, to: 1.2, boss: 'dishes', tint: '#f4ece2', line: '#e6d7c4', root: 46,
    pool: ['gates', 'spikes', 'spikeHalf', 'stove', 'swarm', 'knife', 'pin', 'pad', 'wall', 'orb', 'shooter', 'mirror', 'tight', 'speed', 'double'] },
];
const ENDLESS = { id: 'endlos', name: 'Endlos', stars: 0, bpm: 132, bars: 9999, speed: 1.25, from: .5, to: 1.3, boss: null, tint: '#eaf0ea', line: '#d3e3da', root: 45, pool: LEVELS[4].pool };
const BOSSES = { laundry: { name: 'Der Wäscheberg', spr: 'laundry', w: 200, h: 175, shot: 'sock' }, dishes: { name: 'Der Geschirrturm', spr: 'dishes', w: 165, h: 190, shot: 'plate' }, vacuum: { name: 'Der Staubsauger', spr: 'vacuum', w: 190, h: 165, shot: 'dust' } };
const HINTS = { spikes: 'Gabeln! Tippen zum Springen', stove: 'Herdplatte – drüberspringen oder vorbei', crate: 'Kiste abschießen: mehr Nudeln', swarm: 'Wollmäuse – abschießen oder ausweichen', spikeHalf: 'Gabeln links oder rechts: lenken oder springen',
  knife: 'Messer – ausweichen, Springen hilft nicht', pin: 'Nudelholz – drüberspringen', pad: 'Sprungfeder: trägt dich weit', orb: 'Fleischbällchen in der Luft: nochmal tippen!', wall: 'Schranktür – durch die Lücke',
  tight: 'Zu eng? Erst durchs Mini-Portal', mirror: 'Spiegel-Portal: links und rechts vertauscht!', speed: 'Turbo-Portal!', shooter: 'Die Sprühflasche schießt zurück' };
const TEACH_ORDER = ['spikes', 'gates', 'crate', 'stove', 'spikeHalf', 'swarm', 'knife', 'pin', 'pad', 'wall', 'shooter', 'orb', 'mirror', 'tight', 'speed'];

// ---------- sound: a little synth band (no files) ----------
let AC = null, MASTER = null, NOISE = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); MASTER = AC.createGain(); MASTER.connect(AC.destination); const b = AC.createBuffer(1, AC.sampleRate * .3, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NOISE = b; } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  if (MASTER) MASTER.gain.value = muted() ? 0 : .9;
  return AC;
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function osc(at, f, d, type, vol, slide = 0) {
  if (!AC || muted()) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, at); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), at + d);
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(.0001, at + d);
  o.connect(g); g.connect(MASTER); o.start(at); o.stop(at + d + .02);
}
function noise(at, d, vol, hp = 6000) {
  if (!AC || muted() || !NOISE) return;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(.0001, at + d);
  s.connect(f); f.connect(g); g.connect(MASTER); s.start(at); s.stop(at + d + .02);
}
const now = () => AC ? AC.currentTime : 0;
const SFX = {
  jump: () => osc(now(), 440, .12, 'triangle', .07, 400),
  orb: () => osc(now(), 660, .14, 'triangle', .08, 600),
  pad: () => osc(now(), 300, .25, 'square', .05, 900),
  good: () => [72, 76, 79].forEach((m, i) => osc(now() + i * .05, hz(m), .1, 'triangle', .07)),
  bad: () => osc(now(), 300, .2, 'sawtooth', .045, -170),
  hurt: () => osc(now(), 170, .12, 'sawtooth', .05, -80),
  pop: () => osc(now(), rnd(500, 700), .05, 'square', .02, -200),
  portal: () => [60, 67, 72, 79].forEach((m, i) => osc(now() + i * .03, hz(m), .08, 'sine', .06)),
  chop: () => { osc(now(), 900, .05, 'square', .04, -600); osc(now() + .03, 120, .15, 'triangle', .07, -60); },
  crash: () => { noise(now(), .5, .25, 300); osc(now(), 120, .5, 'sawtooth', .06, -80); },
  win: () => [72, 76, 79, 84, 88].forEach((m, i) => osc(now() + i * .09, hz(m), .2, 'triangle', .08)),
  check: () => [79, 84].forEach((m, i) => osc(now() + i * .06, hz(m), .12, 'sine', .07)),
};
// one 16th step of the track (kick, hat; clap from bar 4; a lead in the second half)
const BASS = [0, 0, 12, 0, 0, 0, 10, 0, 0, 0, 12, 0, 7, 0, 5, 0], PROG = [0, 0, -4, -2], LEAD = [12, 15, 19, 15, 12, 15, 19, 22];
function playStep(at, step, lv, bar, part) {
  const s = step % 16, root = lv.root + PROG[bar % 4];
  if (s % 4 === 0) osc(at, 140, .16, 'sine', .32, -95);
  if (s % 4 === 2) noise(at, .04, .1);
  if (part > 0 && (s === 4 || s === 12)) noise(at, .12, .18, 1500);
  if (BASS[s] || s % 4 === 0) osc(at, hz(root + BASS[s] - 12), .13, 'sawtooth', .05);
  if (part > 1 && s % 2 === 0) osc(at, hz(root + 12 + LEAD[(s / 2 + bar) % 8]), .09, 'square', .018);
}

// ---------- sprites, drawn once ----------
function sprite(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function eyes(g, x, y, d, s = 1) {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x - d, y, 7 * s, 0, 7); g.arc(x + d, y, 7 * s, 0, 7); g.fill();
  g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(x - d + 1.5 * s, y + 1, 3.6 * s, 0, 7); g.arc(x + d + 1.5 * s, y + 1, 3.6 * s, 0, 7); g.fill();
  g.strokeStyle = '#2b2a33'; g.lineWidth = 3 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - d - 8 * s, y - 11 * s); g.lineTo(x - d + 5 * s, y - 6 * s); g.moveTo(x + d + 8 * s, y - 11 * s); g.lineTo(x + d - 5 * s, y - 6 * s); g.stroke();
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
  SPR.bunny = sprite(64, 64, (g, s) => {
    const c = s / 2; g.fillStyle = '#8f989d';
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; g.beginPath(); g.arc(c + Math.cos(a) * s * .24, c + Math.sin(a) * s * .24, s * .17, 0, 7); g.fill(); }
    g.fillStyle = '#b5bdc1'; g.beginPath(); g.arc(c, c, s * .27, 0, 7); g.fill(); eyes(g, c, c - 2, 7, .75);
  });
  SPR.fork = sprite(40, 64, g => {
    g.fillStyle = '#aab3b9'; g.strokeStyle = '#7d868c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(8, 60); g.lineTo(20, 4); g.lineTo(32, 60); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e1e6e9'; g.beginPath(); g.moveTo(17, 50); g.lineTo(20, 14); g.lineTo(23, 50); g.fill();
  });
  const emo = (e, px) => sprite(px * 1.3, px * 1.3, (g, s) => { g.font = px + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, s / 2, s / 2 + px * .06); });
  SPR.crate = emo('📦', 96); SPR.spray = emo('🧴', 96); SPR.sock = emo('🧦', 56); SPR.cheese = emo('🧀', 64);
  SPR.orb = sprite(80, 80, g => { const r = g.createRadialGradient(34, 32, 4, 40, 40, 34); r.addColorStop(0, '#d98a5f'); r.addColorStop(1, '#8b3f24'); g.fillStyle = r; g.beginPath(); g.arc(40, 40, 30, 0, 7); g.fill(); g.fillStyle = '#4f9a5b'; g.beginPath(); g.ellipse(46, 18, 9, 5, .6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(30, 30, 7, 0, 7); g.fill(); });
  SPR.laundry = sprite(240, 210, g => {
    const blobs = [['#e07a5f', 50, 150, 52], ['#81b29a', 190, 150, 54], ['#3d5a80', 120, 160, 64], ['#f2cc8f', 85, 100, 50], ['#e5989b', 160, 95, 50], ['#98c1d9', 120, 60, 46], ['#b56576', 40, 175, 34], ['#6d597a', 205, 180, 32]];
    for (const [c, x, y, r] of blobs) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * .78, (x - 120) / 160, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.beginPath(); g.arc(x - r * .2, y - r * .1, r * .55, .3, 1.8); g.stroke(); }
    g.fillStyle = '#f4f1de'; g.fillRect(150, 40, 26, 34); g.fillStyle = '#e07a5f'; g.fillRect(150, 40, 26, 8);
    eyes(g, 120, 118, 24, 1.5); g.strokeStyle = '#2b2a33'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(120, 168, 22, 3.6, 5.8); g.stroke();
  });
  SPR.dishes = sprite(200, 230, g => {
    for (let i = 0; i < 7; i++) { const y = 200 - i * 26, w = 150 - Math.abs(i - 3) * 8; g.fillStyle = i % 2 ? '#e9eef2' : '#d7dee3'; g.beginPath(); g.ellipse(100 + Math.sin(i * 1.7) * 8, y, w / 2, 16, 0, 0, 7); g.fill(); g.strokeStyle = '#9aa7b0'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(165,110,60,.45)'; g.beginPath(); g.arc(100 + Math.cos(i * 2.3) * 30, y - 3, 7, 0, 7); g.fill(); }
    g.fillStyle = '#c9a26b'; g.fillRect(150, 20, 8, 60); g.fillStyle = '#9aa3a8'; g.fillRect(40, 30, 6, 50);
    eyes(g, 100, 112, 26, 1.5); g.strokeStyle = '#2b2a33'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(100, 165, 18, 3.7, 5.7); g.stroke();
  });
  SPR.vacuum = sprite(230, 200, g => {
    g.fillStyle = '#d6453a'; g.beginPath(); g.ellipse(115, 95, 92, 70, 0, 0, 7); g.fill();
    g.fillStyle = '#ef6b5f'; g.beginPath(); g.ellipse(100, 75, 60, 35, -.2, 0, 7); g.fill();
    g.fillStyle = '#2b2a33'; g.beginPath(); g.arc(50, 160, 18, 0, 7); g.arc(180, 160, 18, 0, 7); g.fill();
    g.fillStyle = '#4a4f55'; g.fillRect(100, 150, 30, 46);
    eyes(g, 115, 90, 30, 1.6); g.fillStyle = '#2b2a33'; g.beginPath(); g.ellipse(115, 132, 24, 12, 0, 0, 7); g.fill();
  });
}

// ---------- building a level: one pattern per bar, on the beat; same seed = same level every attempt ----------
// learning curve: bars 0–1 warm up; then every element NEW in this level gets its own easy bar (followed by a gate to
// recover); then the mix starts gently and gets denser and harsher until the boss finale.
function buildLevel(lv, seed) {
  const R = rng(seed), pick = a => a[Math.floor(R() * a.length)], spb = 60 / lv.bpm, ev = [];
  const prev = LEVELS[LEVELS.indexOf(lv) - 1], teach = lv === ENDLESS ? [] : TEACH_ORDER.filter(p => lv.pool.includes(p) && !(prev && prev.pool.includes(p)));
  let mini = false, mirror = false, speed = 1, lastPortal = -9, taught = 0;
  const at = (bar, beat) => (bar * 4 + beat) * spb, side = () => (R() < .5 ? 'l' : 'r');
  const finale = lv.boss ? 4 : 0, bars = lv.bars, teachEnd = 2 + teach.length * 2;
  for (let bar = 0; bar < Math.min(bars, 400); bar++) {
    const t = b => at(bar, b);
    // difficulty 0..1+: flat while teaching, then rising
    const k = bars > 1000 ? Math.min(1.3, lv.from + bar * .012) : bar < teachEnd ? lv.from * .6 : lv.from + (lv.to - lv.from) * ((bar - teachEnd) / Math.max(1, bars - finale - teachEnd));
    if (bar === 0) { ev.push({ k: 'gates', t: t(2), l: { op: '+', v: 8 }, r: { op: '+', v: -3 } }); continue; }
    if (bar === 1) { ev.push({ k: 'cheese', t: t(1), x: .5, hidden: true }); continue; }
    if (finale && bar >= bars - finale) { if (bar === bars - finale) ev.push({ k: 'boss', t: t(0), dur: finale * 4 * spb }); continue; }
    if (bar % 8 === 0) ev.push({ k: 'check', t: t(0) });
    const gate = (b, harsh) => {
      const good = () => R() < .28 - k * .12 ? { op: '×', v: 2 } : { op: '+', v: 2 + Math.floor(R() * (5 - Math.min(2, k * 2))) };   // later levels refill less
      const bad = () => R() < .15 + k * .25 ? { op: '÷', v: 2 } : { op: '+', v: -(3 + Math.floor(R() * (4 + k * 12))) };
      let l = good(), r = bad();
      if (harsh || R() < k * .3) l = { op: '+', v: -(3 + Math.floor(R() * (3 + k * 5))) };   // both bad: one side is always a minus you can shoot into a plus
      if (k > .5 && R() < (k - .4) * .35) l = { op: '?', v: 0, is: [{ op: '×', v: 2 }, { op: '+', v: 10 }, { op: '+', v: -8 }, { op: '÷', v: 2 }][Math.floor(R() * 4)] };   // fixed per level: learnable
      if (R() < .5) [l, r] = [r, l];
      ev.push({ k: 'gates', t: t(b), l, r });
    };
    const P = {
      gates: () => gate(R() < .5 ? 0 : 2),
      spikes: () => { ev.push({ k: 'spikes', t: t(1), x0: 0, x1: 1 }); if (k > .45) ev.push({ k: 'spikes', t: t(2.5), x0: 0, x1: 1 }); if (k > .85) ev.push({ k: 'spikes', t: t(3.5), x0: 0, x1: 1 }); },
      spikeHalf: () => { const s = side(); ev.push({ k: 'spikes', t: t(1), x0: s === 'l' ? 0 : .5, x1: s === 'l' ? .5 : 1 }); ev.push({ k: 'spikes', t: t(k > .6 ? 2 : 2.5), x0: s === 'l' ? .5 : 0, x1: s === 'l' ? 1 : .5 }); },
      stove: () => { const s = side(), w = .5 + Math.min(.2, k * .2); ev.push({ k: 'stove', t: t(.5), dur: (1.5 + k) * spb, x0: s === 'l' ? 0 : 1 - w, x1: s === 'l' ? w : 1 }); },
      knife: () => { const s = side(); ev.push({ k: 'knife', t: t(1), side: s }); if (k > .4) ev.push({ k: 'knife', t: t(2), side: s === 'l' ? 'r' : 'l' }); if (k > .8) ev.push({ k: 'knife', t: t(3), side: s }); },
      pin: () => { ev.push({ k: 'pin', t: t(2), x: R() * .6, vx: (R() < .5 ? -1 : 1) * (.4 + k * .7) }); if (k > .7) ev.push({ k: 'spikes', t: t(3.5), x0: 0, x1: 1 }); },
      pad: () => { ev.push({ k: 'pad', t: t(0) }); ev.push({ k: 'spikes', t: t(.6), x0: 0, x1: 1, until: t(2.1) }); },
      orb: () => { ev.push({ k: 'spikes', t: t(1.4), x0: 0, x1: 1, until: t(2.9) }); ev.push({ k: 'orb', t: t(2.05), x: .5 }); },
      wall: () => { ev.push({ k: 'wall', t: t(2), gx: .2 + R() * .6, gw: mini ? .3 : .5 - k * .14 }); if (k > .7) ev.push({ k: 'wall', t: t(3.5), gx: .2 + R() * .6, gw: mini ? .3 : .5 - k * .14 }); },
      tight: () => ev.push({ k: 'wall', t: t(2), gx: .25 + R() * .5, gw: .24, tight: true }),
      swarm: () => ev.push({ k: 'swarm', t: t(1), x: .2 + R() * .6, m: Math.round(4 + k * 16) }),
      shooter: () => { ev.push({ k: 'shooter', t: t(0), x: .2 + R() * .6, hp: Math.round(5 + k * 10) }); ev.push({ k: 'spikes', t: t(3), x0: 0, x1: 1 }); },
      crate: () => ev.push({ k: 'crate', t: t(1), x: .2 + R() * .6, hp: Math.round(4 + k * 6), gift: Math.round(6 + k * 8) }),
      double: () => gate(1, true),
    };
    const portal = kind => {
      if (kind === 'mirror') { mirror = !mirror; ev.push({ k: 'portal', t: t(0), kind: 'mirror', on: mirror }); }
      if (kind === 'mini') { mini = true; ev.push({ k: 'portal', t: t(0), kind: 'mini' }); }
      if (kind === 'big') { mini = false; ev.push({ k: 'portal', t: t(0), kind: 'big' }); }
      if (kind === 'speed') { speed = speed > 1 ? 1 : (k > .9 ? 1.45 : 1.25); ev.push({ k: 'portal', t: t(0), kind: 'speed', v: speed }); }
      lastPortal = bar;
    };
    // teaching phase: each new element alone, then a gate bar to breathe
    if (bar < teachEnd) {
      const i = bar - 2;
      if (i % 2 === 0) {
        const el = teach[taught++];
        if (el === 'mirror') { portal('mirror'); gate(2); }
        else if (el === 'tight') { portal('mini'); P.tight(); }
        else if (el === 'speed') { portal('speed'); gate(2); }
        else (P[el] || P.gates)();
      } else { if (mini) portal('big'); else if (mirror) portal('mirror'); gate(2); }
      continue;
    }
    // portals at phrase starts (mini lasts a phrase; mirror toggles; speed toggles)
    if (bar % 4 === 0 && bar - lastPortal >= 4) {
      if (mini) portal('big');
      else if (lv.pool.includes('tight') && R() < .4) portal('mini');
      else if (lv.pool.includes('mirror') && R() < .3) portal('mirror');
      else if (lv.pool.includes('speed') && R() < .4) portal('speed');
    }
    const pool = lv.pool.filter(p => p !== 'tight' || mini);
    const patt = pick(pool), clean = ['pad', 'orb', 'wall', 'tight', 'stove'].includes(patt);   // jump/gap sections never get a second pattern on top
    const busy = !clean && (lv.pool.includes('double') ? R() < k - .45 : R() < k - .75);
    (P[patt] || P.gates)();
    if (busy && !['knife', 'spikes', 'spikeHalf', 'pin'].includes(patt)) (P[pick(['spikeHalf', 'knife', 'spikes'])])();   // extra danger only on quiet bars – never two timing dangers on the same beats
    if (bar % 3 === 2 && !['gates', 'pad', 'orb', 'double'].includes(patt)) gate(3.5, k > .9 && R() < .3);
  }
  const lenT = at(Math.min(bars, 400), 0);
  for (let t = 10 * spb * 4; t < lenT - 16 * spb; t += 10 * spb * 4) ev.push({ k: 'cheese', t: t + 3 * spb, x: .3 + R() * .4 });
  ev.sort((a, b) => a.t - b.t);
  // a portal never lands on a fork row: shift it half a beat earlier
  for (const e of ev) if (e.k === 'portal' && ev.some(o => o.k === 'spikes' && Math.abs(o.t - e.t) < spb * .4)) e.t -= spb * .5;
  ev.sort((a, b) => a.t - b.t);
  // fork rows closer than ~1/3 beat would hit twice: merge them into one row
  const out = [];
  for (const e of ev) {
    const p = out.length && [...out].reverse().find(o => o.k === 'spikes' && !o.until);
    if (e.k === 'spikes' && !e.until && p && e.t - p.t < spb * .35) { p.x0 = Math.min(p.x0, e.x0); p.x1 = Math.max(p.x1, e.x1); continue; }
    out.push(e);
  }
  return { ev: out, spb, len: lenT };
}

// ---------- the game ----------
export function openGame({ data = {}, onSave = () => {}, onClose = () => {} } = {}) {
  if (!SPR.noodle) makeSprites();
  const save = Object.assign({ levels: {}, endless: 0 }, data);
  const root = document.createElement('div'); root.id = 'gameov'; root.className = 'game';
  root.innerHTML = `<canvas class="g-cv" aria-label="Spielfeld Nudel-Rush"></canvas>
    <div class="g-hud" hidden>
      <div class="g-count"><span class="g-n">10</span><span class="g-lbl">Nudeln</span></div>
      <div class="g-mid"><div class="g-pct">0 %</div><div class="g-prog"><i></i></div><div class="g-buffs"></div></div>
      <div class="g-btns"><button class="g-ic g-mute" aria-label="Ton an/aus"></button><button class="g-ic g-pause" aria-label="Pause">❚❚</button></div>
    </div>
    <div class="g-banner" hidden></div>
    <div class="g-attempt" hidden></div>
    <div class="g-ov g-start"><div class="g-card wide">
      <div class="g-title">Nudel-Rush</div>
      <p class="g-sub">Wischen = lenken · Tippen = springen · alles im Takt</p>
      <div class="g-levels"></div>
      <label class="g-practice"><input type="checkbox" class="g-pr"> Übungsmodus (Checkpoints, zählt nicht)</label>
      <button class="g-link g-close">Zurück</button></div></div>
    <div class="g-ov g-paused" hidden><div class="g-card"><div class="g-title sm">Pause</div><button class="g-btn g-resume">Weiter</button><button class="g-link g-restart">Neu starten</button><button class="g-link g-menu">Level-Auswahl</button></div></div>
    <div class="g-ov g-done" hidden><div class="g-card"><div class="g-title sm g-dtitle">Geschafft!</div><div class="g-stats"></div><p class="g-best g-dbest"></p>
      <button class="g-btn g-next">Nächstes Level</button><button class="g-link g-restart">Nochmal</button><button class="g-link g-menu">Level-Auswahl</button></div></div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s), cv = $('.g-cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, raf = 0, last = 0, running = false, G = null, closed = false;
  const attempts = {};
  function resize() { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width || 400; H = r.height || 800; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  resize(); addEventListener('resize', resize);
  const setMute = () => { $('.g-mute').textContent = muted() ? '🔇' : '🔊'; if (MASTER) MASTER.gain.value = muted() ? 0 : .9; };
  setMute();
  const show = (s, on) => { $(s).hidden = !on; };
  function menu() {
    running = false; G = null; show('.g-attempt', false); show('.g-banner', false); show('.g-hud', false); show('.g-paused', false); show('.g-done', false); show('.g-start', true);
    $('.g-levels').innerHTML = LEVELS.map(l => { const b = save.levels[l.id] || 0; return `<button class="g-lv${b >= 100 ? ' done' : ''}" data-lv="${l.id}"><span class="g-lvn">${l.name}</span><span class="g-lvs">${'★'.repeat(l.stars)}<i>${'★'.repeat(5 - l.stars)}</i></span><span class="g-lvb"><i style="width:${b}%"></i></span><span class="g-lvp">${b >= 100 ? '✓ 100 %' : b + ' %'}</span></button>`; }).join('')
      + `<button class="g-lv endless" data-lv="endlos"><span class="g-lvn">∞ Endlos</span><span class="g-lvs">immer schneller</span><span class="g-lvb"></span><span class="g-lvp">${save.endless ? save.endless + ' m' : '–'}</span></button>`;
  }

  // ---------- a run ----------
  const Y = () => H * .78, BASE = () => Math.max(380, H * .55) * (G && G.lv ? G.lv.speed || 1 : 1);   // px per second at speed 1 (each level is faster)
  function startLevel(lv, fromCheck) {
    const practice = $('.g-pr').checked && lv !== ENDLESS;
    const keep = fromCheck && G && G.lv === lv;
    const L = keep ? G.L : buildLevel(lv, lv === ENDLESS ? Math.floor(Math.random() * 1e9) : lv.seed);
    const segs = [{ t: 0, v: 1, d: 0 }];      // distance along the course: integrate speed portals so everything stays on the beat
    const base = Math.max(380, H * .55) * (lv.speed || 1);
    for (const e of L.ev) if (e.k === 'portal' && e.kind === 'speed') { const p = segs[segs.length - 1]; segs.push({ t: e.t, v: e.v, d: p.d + (e.t - p.t) * p.v * base }); }
    const dist = t => { let s = segs[0]; for (const x of segs) if (x.t <= t) s = x; return s.d + (t - s.t) * s.v * base; };
    for (const e of L.ev) { e.d = dist(e.t); if (e.until) e.d2 = dist(e.until); e.done = false; e.used = false; e.hitNow = false; e.tick = 0; if (e.hp0 == null) e.hp0 = e.hp; e.hp = e.hp0; if (e.m0 == null) e.m0 = e.m; e.m = e.m0; if (e.px0 == null) { e.px0 = e.x; e.vx0 = e.vx; } e.px = e.px0; e.vx = e.vx0; if (e.l) { e.l = { ...(e.l0 || (e.l0 = { ...e.l })) }; e.r = { ...(e.r0 || (e.r0 = { ...e.r })) }; } }
    const cp = keep && G.check ? G.check : null;
    attempts[lv.id] = (attempts[lv.id] || 0) + 1;
    G = { lv, L, dist, practice, t: cp ? cp.t - .3 : -1.2, n: cp ? cp.n : 10, maxN: 10, x: W / 2, tx: W / 2, z: 0, vz: 0, air: 0, mini: cp ? cp.mini : false, mirror: cp ? cp.mirror : false,
      bullets: [], shots: [], lobs: [], parts: [], floats: [], fireT: 0, shake: 0, pulse: 0, beatFx: 0, shield: 0, crashed: 0, won: false, check: cp, step: Math.floor((cp ? cp.t - .3 : -1.2) / (L.spb / 4)), killed: 0, lastBeat: -1, boss: null };
    for (const e of L.ev) if (e.t < G.t) e.done = true;
    show('.g-start', false); show('.g-done', false); show('.g-paused', false); show('.g-hud', true);
    const a = $('.g-attempt'); a.textContent = (practice ? 'Übung · ' : '') + 'Versuch ' + attempts[lv.id]; a.hidden = false; a.style.animation = 'none'; void a.offsetWidth; a.style.animation = '';
    audio(); running = true;
  }
  // ---------- input: drag = steer (relative), tap = jump ----------
  let dragX = null;
  const GRAV = () => 2 * 90 / Math.pow((G ? G.L.spb : .5) * .5, 2);      // a jump lasts one beat, whatever the tempo
  const jumpV = beats => GRAV() * (G.L.spb * beats) / 2;
  function jump() {
    if (!G || G.crashed || !running) return;
    if (G.air <= 0) { G.vz = jumpV(1); G.air = 1; SFX.jump(); buzz(8); return; }
    const orb = G.L.ev.find(e => e.k === 'orb' && !e.used && Math.abs(e.t - G.t) < .25 && Math.abs(e.x * W - G.x) < 110);
    if (orb) { orb.used = true; G.vz = jumpV(1); SFX.orb(); burst(orb.x * W, Y() - G.z, '#d98a5f', 14); buzz(12); }
  }
  cv.addEventListener('pointerdown', e => { dragX = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (x) {} jump(); });
  cv.addEventListener('pointermove', e => { if (dragX == null || !G) return; G.tx = clamp(G.tx + (e.clientX - dragX) * 1.35 * (G.mirror ? -1 : 1), 24, W - 24); dragX = e.clientX; });
  const up = () => { dragX = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const keys = {}; const kd = e => { keys[e.key] = true; if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } }, ku = e => { keys[e.key] = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  // ---------- helpers ----------
  const crowdR = () => Math.min(W * .28, (14 + Math.sqrt(G.n) * 4.2) * (G.mini ? .5 : 1));
  const float = (x, y, txt, col, big) => G.floats.push({ x, y, txt, col, t: 0, big });
  function burst(x, y, col, k = 10, sp = 1) { if (reduced()) k = Math.min(k, 4); for (let i = 0; i < k; i++) G.parts.push({ x, y, vx: rnd(-180, 180) * sp, vy: rnd(-280, 40) * sp, t: 0, life: rnd(.35, .7), col, s: rnd(3, 7) }); }
  function shake(v) { if (!reduced()) G.shake = Math.min(18, G.shake + v); }
  function banner(txt, warn) { const b = $('.g-banner'); b.textContent = txt; b.className = 'g-banner' + (warn ? ' warn' : ''); b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 1500); }
  function hint(k) { if (!HINTS[k]) return; try { const s = JSON.parse(localStorage.getItem('gn_game_hint') || '[]'); if (s.includes(k)) return; s.push(k); localStorage.setItem('gn_game_hint', JSON.stringify(s)); banner(HINTS[k], true); } catch (e) {} }
  const harsh = () => G.lv === ENDLESS ? 2 : .9 + LEVELS.indexOf(G.lv) * .35;   // mistakes cost more in later levels
  function hurt(k, why) {
    if (k <= 0 || G.crashed || G.won) return;
    if (G.shield > 0) { burst(G.x, Y(), '#f6c945', 6); return; }
    k = Math.min(G.n, Math.round(k)); G.n -= k; shake(4 + Math.min(10, k * .3)); buzz(25); SFX.hurt();
    float(G.x + rnd(-20, 20), Y() - 60 - G.z, '−' + k + (why ? ' ' + why : ''), '#c0533f', true);
  }
  const label = g => g.op === '?' ? '?' : g.op === '+' ? (g.v >= 0 ? '+' + g.v : '−' + (-g.v)) : g.op + g.v;
  const isGood = g => g.op === '×' || (g.op === '+' && g.v >= 0);
  function gatePass(e) {
    const left = G.x < W / 2; let g = left ? e.l : e.r; e.side = left ? 'l' : 'r';
    const before = G.n;
    if (g.op === '?') g = g.is || { op: '+', v: 5 };
    if (g.op === '+') G.n += g.v; else if (g.op === '×') G.n *= g.v; else G.n = Math.ceil(G.n / g.v);
    G.n = clamp(Math.round(G.n), 0, MAXN); G.maxN = Math.max(G.maxN, G.n);   // capped: no invincible snowball
    const d = G.n - before;
    float(G.x, Y() - 70, (d >= 0 ? '+' : '−') + Math.abs(d), d >= 0 ? '#3d7d48' : '#c0533f', true);
    burst(left ? W * .25 : W * .75, Y(), d >= 0 ? '#7cc488' : '#ef8a76', 20, 1.2);
    if (d >= 0) { SFX.good(); G.pulse = 1; } else { SFX.bad(); shake(6); }
  }
  const progress = () => G.lv === ENDLESS ? 0 : clamp(G.t / G.L.len, 0, 1);
  const meters = () => Math.floor(G.dist(Math.max(0, G.t)) / 50);
  function crash() {
    if (G.crashed) return;
    G.crashed = .9; G.n = 0; SFX.crash(); buzz([60, 40, 120]); shake(16);
    for (let i = 0; i < 40; i++) G.parts.push({ x: G.x, y: Y() - G.z, vx: rnd(-320, 320), vy: rnd(-420, 60), t: 0, life: rnd(.6, 1.1), col: i % 3 ? '#f6c945' : '#c7932a', s: rnd(5, 10) });
    if (G.practice) return;
    if (G.lv === ENDLESS) { const m = meters(); if (m > save.endless) { save.endless = m; onSave(save); float(W / 2, H * .4, 'Neuer Rekord: ' + m + ' m', '#3d7d48', true); } }
    else { const pct = Math.floor(progress() * 100); if (pct > (save.levels[G.lv.id] || 0)) { save.levels[G.lv.id] = pct; onSave(save); float(W / 2, H * .4, 'Neuer Bestwert: ' + pct + ' %', '#3d7d48', true); } }
  }
  function finish() {
    G.won = true; running = false; SFX.win(); buzz([30, 30, 30, 30, 90]);
    const first = !G.practice && (save.levels[G.lv.id] || 0) < 100;
    if (!G.practice) { save.levels[G.lv.id] = 100; onSave(save); }
    const i = LEVELS.indexOf(G.lv);
    $('.g-dtitle').textContent = G.practice ? 'Übung geschafft!' : first ? 'Geschafft! 100 %' : 'Wieder geschafft!';
    $('.g-stats').innerHTML = `<div><b>${attempts[G.lv.id]}</b><span>${attempts[G.lv.id] === 1 ? 'Versuch' : 'Versuche'}</span></div><div><b>${G.n}</b><span>Nudeln übrig</span></div><div><b>${G.killed}</b><span>Chaos weg</span></div>`;
    $('.g-dbest').textContent = G.practice ? 'Jetzt ohne Checkpoints?' : i < LEVELS.length - 1 ? 'Weiter mit „' + LEVELS[i + 1].name + '“' : 'Alle Level geschafft! Jetzt: ∞ Endlos';
    $('.g-next').textContent = i < LEVELS.length - 1 ? 'Nächstes Level' : '∞ Endlos';
    show('.g-done', true); show('.g-hud', false); show('.g-attempt', false); show('.g-banner', false);
  }

  // ---------- update ----------
  function step(dt) {
    if (!G) return;
    if (G.crashed) { G.crashed -= dt; fx(dt); if (G.crashed <= 0) { G.crashed = 0; if (G.practice && G.check) startLevel(G.lv, true); else startLevel(G.lv); } return; }
    if (G.won) return;
    const L = G.L, spb = L.spb;
    G.t += dt;
    // music, scheduled slightly ahead on the game clock
    if (AC && !muted() && AC.state === 'running') { const sps = spb / 4; while ((G.step + 1) * sps < G.t + .12) { G.step++; if (G.step >= 0) { const bar = Math.floor(G.step / 16), part = bar < 4 ? 0 : bar * spb * 4 < L.len / 2 ? 1 : 2; playStep(AC.currentTime + Math.max(0, G.step * sps - G.t), G.step, G.lv, bar, part); } } }
    const beat = Math.floor(G.t / spb); if (beat !== G.lastBeat && G.t > 0) { G.lastBeat = beat; G.beatFx = 1; }
    G.beatFx = Math.max(0, G.beatFx - dt * 5);
    if (keys.ArrowLeft) G.tx = clamp(G.tx + (G.mirror ? 1 : -1) * 540 * dt, 24, W - 24);
    if (keys.ArrowRight) G.tx = clamp(G.tx + (G.mirror ? -1 : 1) * 540 * dt, 24, W - 24);
    G.x += (G.tx - G.x) * Math.min(1, dt * 18);
    if (G.air > 0) { G.z += G.vz * dt; G.vz -= GRAV() * dt; if (G.z <= 0) { G.z = 0; G.vz = 0; G.air = 0; burst(G.x, Y() + 10, '#d3c6a6', 5, .5); } }
    G.shield = Math.max(0, G.shield - dt);
    const dNow = G.dist(Math.max(0, G.t)), r = crowdR(), Yc = Y(), ground = G.z < 14, sy = e => Yc - (e.d - dNow);
    // forks fly
    G.fireT -= dt;
    if (G.fireT <= 0 && G.n > 0) { G.fireT = .17 / (1 + Math.log2(1 + G.n) * .15); const k = Math.min(4, 1 + Math.floor(G.n / 25)); for (let i = 0; i < k; i++) G.bullets.push({ x: G.x + (k === 1 ? 0 : (i / (k - 1) - .5) * r * 1.4), y: Yc - G.z - r * .5 }); }
    for (const b of G.bullets) b.y -= 1100 * dt;
    // the course
    for (const e of L.ev) {
      if (e.done) continue;
      const y = sy(e);
      if (y < -260) break;    // sorted by time: everything after is further away
      if (y > -40 && y < Yc - 100) hint(e.k === 'wall' && e.tight ? 'tight' : e.k === 'portal' ? (e.kind === 'mirror' && e.on ? 'mirror' : e.kind === 'speed' && e.v > 1 ? 'speed' : '') : e.k === 'spikes' && e.x1 - e.x0 < 1 ? 'spikeHalf' : e.k);
      if (e.k === 'gates' || e.k === 'swarm' || e.k === 'shooter' || e.k === 'crate') {
        for (const b of G.bullets) {
          if (b.hit) continue;
          if (e.k === 'gates') { if (Math.abs(b.y - y) < 28) { const g = b.x < W / 2 ? e.l : e.r; if (g.op === '+') { g.bump = (g.bump || 0) + 1; if (g.bump >= 3) { g.bump = 0; g.v++; g.pop = 1; } } b.hit = true; } continue; }
          const ex = e.x * W, rad = e.k === 'swarm' ? 16 + Math.sqrt(e.m) * 7 : 32;
          if (Math.abs(b.x - ex) < rad && Math.abs(b.y - y) < rad) {
            b.hit = true; SFX.pop();
            if (e.k === 'swarm') { e.m--; if (e.m <= 0) { e.done = true; G.killed++; burst(ex, y, '#a9b1b5', 16); } }
            else { e.hp--; e.flash = .08; if (e.hp <= 0) { e.done = true; burst(ex, y, e.k === 'crate' ? '#f6c945' : '#e0543f', 18); if (e.k === 'crate') { G.n = Math.min(MAXN, G.n + e.gift); G.maxN = Math.max(G.maxN, G.n); float(ex, y, '+' + e.gift, '#3d7d48', true); SFX.good(); } else G.killed++; } }
            if (e.done) break;
          }
        }
        if (e.done) continue;
      }
      if (e.k === 'shooter' && y > 0 && y < Yc - 120) { e.cd = (e.cd ?? .3) - dt; if (e.cd <= 0) { e.cd = spb * 2; const ex = e.x * W, a = Math.atan2(Yc - y, G.x - ex); G.shots.push({ x: ex, y: y + 20, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: 3 }); } }
      if (e.k === 'pin') { e.px += e.vx * dt * .9; if (e.px < 0 || e.px > .62) e.vx *= -1; }
      const xIn = (a, b) => G.x + r * .55 > a * W && G.x - r * .55 < b * W;
      if (e.k === 'spikes') {
        const over = e.until ? (G.t >= e.t && G.t <= e.until) : Math.abs(G.t - e.t) < .045;
        if (over && ground && xIn(e.x0, e.x1) && !e.hitNow) { e.hitNow = true; hurt((3 + G.n * .25) * harsh(), '🍴'); }
        if (G.t > (e.until || e.t) + .05) e.done = true;
        continue;
      }
      if (e.k === 'stove') { if (G.t >= e.t && G.t <= e.t + e.dur && ground && xIn(e.x0, e.x1)) { e.tick -= dt; if (e.tick <= 0) { e.tick = .15; hurt((1 + G.n * .03) * (.7 + harsh() * .3), ''); } } if (G.t > e.t + e.dur) e.done = true; continue; }
      if (G.t < e.t) continue;
      e.done = true;
      if (e.k === 'gates') gatePass(e);
      else if (e.k === 'knife') { SFX.chop(); shake(5); if ((e.side === 'l') === (G.x < W / 2) || Math.abs(G.x - W / 2) < r * .5) hurt((4 + G.n * .3) * harsh(), '🔪'); }
      else if (e.k === 'pin') { if (ground && G.x + r * .6 > e.px * W && G.x - r * .6 < (e.px + .38) * W) hurt((3 + G.n * .2) * harsh(), '🥖'); }
      else if (e.k === 'wall') { const a = (e.gx - e.gw / 2) * W, b = (e.gx + e.gw / 2) * W; if (G.x - r * .7 < a || G.x + r * .7 > b) { hurt((4 + G.n * .3) * harsh(), '🚪'); G.tx = clamp(G.x, a + r * .7, b - r * .7); } }
      else if (e.k === 'pad') { if (ground) { G.vz = jumpV(2.4); G.air = 1; SFX.pad(); buzz(15); burst(G.x, Yc, '#f6c945', 14); } }
      else if (e.k === 'portal') {
        SFX.portal(); G.pulse = 1; burst(W / 2, Yc, e.kind === 'mirror' ? '#8e6cc7' : e.kind === 'speed' ? '#e3a92b' : '#5bb6e8', 26, 1.4);
        if (e.kind === 'mini') { G.mini = true; banner('Mini!'); } if (e.kind === 'big') { G.mini = false; banner('Wieder groß'); }
        if (e.kind === 'mirror') { G.mirror = e.on; banner(e.on ? 'Spiegelverkehrt!' : 'Wieder normal', e.on); }
        if (e.kind === 'speed') banner(e.v > 1 ? 'Turbo ▶▶' : 'Normal ▶');
      }
      else if (e.k === 'swarm') { const ex = e.x * W; if (Math.abs(ex - G.x) < r + 16 + Math.sqrt(e.m) * 7) { hurt(e.m, ''); burst(ex, Yc, '#a9b1b5', 12); } }
      else if (e.k === 'shooter') { if (Math.abs(e.x * W - G.x) < r + 30) hurt(6, '🧴'); }
      else if (e.k === 'crate') { if (Math.abs(e.x * W - G.x) < r + 30) hurt(3, ''); }
      else if (e.k === 'cheese') { if (!e.hidden && Math.abs(e.x * W - G.x) < r + 34) { G.shield = spb * 6; banner('🧀 Käse-Schild!'); SFX.good(); } }
      else if (e.k === 'check') { G.check = { t: e.t, n: Math.max(G.n, 15), mini: G.mini, mirror: G.mirror }; if (G.practice) { SFX.check(); float(W / 2, Yc - 120, '◆ Checkpoint', '#5bb6e8', true); } }
      else if (e.k === 'boss') { G.boss = { ...BOSSES[G.lv.boss], t0: e.t, dur: e.dur, x: W / 2 }; banner(G.boss.name + '!', true); }
    }
    // the boss finale: survive its beat-synced attacks until 100 %
    if (G.boss) {
      const B = G.boss, bt = G.t - B.t0, b = Math.floor(bt / spb);
      B.x = W / 2 + Math.sin(bt * 1.7) * (W - B.w) * .4;
      if (b !== B.lastB && bt > spb && bt < B.dur - spb * 2) { B.lastB = b; const tx = b % 4 === 3 ? G.x : clamp(G.x + (b % 2 ? 1 : -1) * rnd(40, 110), 30, W - 30);
        if (B.shot === 'plate' && b % 2 === 0) { for (const off of [-1, 0, 1]) G.lobs.push({ x0: B.x, y0: H * .2, tx: clamp(tx + off * 95, 20, W - 20), t: 0, dur: spb * 2, k: 'plate' }); }
        else if (B.shot !== 'plate') G.lobs.push({ x0: B.x, y0: H * .2, tx, t: 0, dur: spb * 2, k: B.shot }); }
      if (B.shot === 'dust' && Math.abs(G.x - B.x) < 120) G.tx = clamp(G.tx + Math.sign(B.x - G.x) * 90 * dt, 24, W - 24);
    }
    for (const l of G.lobs) { l.t += dt; if (!l.landed && l.t >= l.dur) { l.landed = true; burst(l.tx, Yc, '#c98b4a', 12); if (Math.abs(G.x - l.tx) < r + 28 && G.z < 40) hurt(3 + Math.floor(G.n * .08), l.k === 'sock' ? '🧦' : l.k === 'plate' ? '🍽️' : '💨'); } }
    G.lobs = G.lobs.filter(l => !l.landed);
    for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; if (!s.hit && Math.abs(s.y - Yc) < 20 + r * .4 && Math.abs(s.x - G.x) < r + 8 && G.z < 30) { s.hit = true; hurt(s.dmg, '💦'); } }
    G.shots = G.shots.filter(s => !s.hit && s.y < H + 40);
    G.bullets = G.bullets.filter(b => !b.hit && b.y > -20);
    fx(dt);
    $('.g-n').textContent = G.n; $('.g-lbl').textContent = G.n >= MAXN ? 'max.' : 'Nudeln'; $('.g-count').style.transform = `scale(${1 + G.pulse * .22})`;
    if (G.lv === ENDLESS) { $('.g-pct').textContent = meters() + ' m'; $('.g-prog i').style.width = '0%'; }
    else { const p = progress(); $('.g-pct').textContent = Math.floor(p * 100) + ' %'; $('.g-prog i').style.width = p * 100 + '%'; }
    $('.g-buffs').innerHTML = (G.shield > 0 ? '<span>🧀 Schild</span>' : '') + (G.mini ? '<span>Mini</span>' : '') + (G.mirror ? '<span>⇄ Spiegel</span>' : '');
    if (G.n <= 0) crash();
    else if (G.lv !== ENDLESS && G.t >= L.len) finish();
    else if (G.lv === ENDLESS && G.t > L.len - 12) { const more = buildLevel(ENDLESS, Math.floor(Math.random() * 1e9)); for (const e of more.ev) { e.t += L.len; e.d = G.dist(e.t); if (e.until) { e.until += L.len; e.d2 = G.dist(e.until); } } L.ev.push(...more.ev); L.len += more.len; }
  }
  function fx(dt) {
    for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
    G.parts = G.parts.filter(p => p.t < p.life);
    for (const f of G.floats) { f.t += dt; f.y -= 60 * dt; }
    G.floats = G.floats.filter(f => f.t < 1);
    G.shake = Math.max(0, G.shake - dt * 34); G.pulse = Math.max(0, G.pulse - dt * 3);
  }

  // ---------- draw ----------
  const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  const img = (s, x, y, w, h = w) => ctx.drawImage(s, x - w / 2, y - h / 2, w, h);
  function tag(x, y, txt, col) { ctx.font = '900 15px Nunito, sans-serif'; const w = ctx.measureText(String(txt)).width + 14; ctx.fillStyle = '#fffdf8'; rr(x - w / 2, y - 11, w, 22, 11); ctx.fill(); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); }
  function floor(lv, dNow) {
    ctx.fillStyle = lv.tint; ctx.fillRect(0, 0, W, H);
    const b = G ? G.beatFx : 0, s = 56, o = dNow % s;
    ctx.strokeStyle = lv.line; ctx.lineWidth = 2 + b * 2.5;
    ctx.beginPath(); for (let y = o - s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); } for (let x = s / 2; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke();
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(0, 0, 7, H); ctx.fillRect(W - 7, 0, 7, H);
    if (G && G.L) { const sp = (G.dist(G.t + .1) - G.dist(G.t)) / .1; if (sp > BASE() * 1.1) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = (i * 97 + 13) % W, y = (i * 173 + dNow * 1.6) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 50); ctx.stroke(); } } }
  }
  function gateBox(g, x0, y, w, h) {
    const good = isGood(g), myst = g.op === '?';
    ctx.fillStyle = myst ? '#8e6cc7' : good ? '#5aa866' : '#e0644f'; rr(x0, y - h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = myst ? '#6a4fa3' : good ? '#3d7d48' : '#b5402f'; ctx.lineWidth = 3; ctx.stroke();
    const s = 1 + (g.pop || 0) * .35; g.pop = Math.max(0, (g.pop || 0) - .08);
    ctx.save(); ctx.translate(x0 + w / 2, y + 2); ctx.scale(s, s); ctx.fillStyle = '#fffdf8'; ctx.font = '900 30px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label(g), 0, 0); ctx.restore();
  }
  function drawEv(e, y, t) {
    const x = e.x != null ? e.x * W : 0;
    if (e.k === 'gates') { const w = W / 2 - 11; gateBox(e.l, 8, y, w, 54); gateBox(e.r, W / 2 + 3, y, w, 54); }
    else if (e.k === 'spikes') {
      const y2 = e.until ? y - (e.d2 - e.d) : y, x0 = e.x0 * W + 8, x1 = e.x1 * W - 8;
      if (e.until) { ctx.fillStyle = 'rgba(224,84,63,.12)'; ctx.fillRect(x0, y2 - 10, x1 - x0, y - y2 + 20); }
      for (let yy = y; yy >= y2 - 1; yy -= 46) for (let xx = x0 + 14; xx < x1; xx += 28) ctx.drawImage(SPR.fork, xx - 12, yy - 34, 24, 38);
    }
    else if (e.k === 'stove') {
      const y2 = y - (G.dist(e.t + e.dur) - e.d), x0 = e.x0 * W + 6, w = (e.x1 - e.x0) * W - 12;
      ctx.fillStyle = '#3a3a40'; rr(x0, y2, w, y - y2, 14); ctx.fill();
      const gr = ctx.createRadialGradient(x0 + w / 2, (y + y2) / 2, 6, x0 + w / 2, (y + y2) / 2, Math.max(w, y - y2) * .6); gr.addColorStop(0, `rgba(255,120,40,${.8 + G.beatFx * .2})`); gr.addColorStop(1, 'rgba(224,84,63,.2)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x0 + w / 2, (y + y2) / 2, w * .42, (y - y2) * .42, 0, 0, 7); ctx.fill();
    }
    else if (e.k === 'knife') {
      const tt = e.t - G.t, x0 = e.side === 'l' ? 8 : W / 2, w = W / 2 - 8, warn = tt < G.L.spb && tt > 0;
      ctx.fillStyle = warn ? `rgba(224,84,63,${.15 + (1 - tt / G.L.spb) * .45})` : 'rgba(43,42,51,.07)'; rr(x0, y - 30, w, 60, 8); ctx.fill();
      ctx.save(); ctx.translate(0, -(warn ? 50 * tt / G.L.spb : 50));
      ctx.fillStyle = '#c8cfd4'; ctx.beginPath(); ctx.moveTo(x0 + 12, y - 8); ctx.lineTo(x0 + w - 60, y - 8); ctx.lineTo(x0 + w - 60, y + 10); ctx.quadraticCurveTo(x0 + 40, y + 22, x0 + 6, y + 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8d979d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#6b4a2f'; rr(x0 + w - 62, y - 9, 56, 18, 6); ctx.fill(); ctx.restore();
    }
    else if (e.k === 'pin') { const px = e.px * W, w = W * .38; ctx.fillStyle = '#d9a86c'; rr(px + 18, y - 14, w - 36, 28, 14); ctx.fill(); ctx.strokeStyle = '#a97a44'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#a97a44'; rr(px, y - 6, 22, 12, 6); ctx.fill(); rr(px + w - 22, y - 6, 22, 12, 6); ctx.fill(); }
    else if (e.k === 'wall') { const a = (e.gx - e.gw / 2) * W, b = (e.gx + e.gw / 2) * W; ctx.fillStyle = '#a97a44'; rr(4, y - 16, Math.max(0, a - 4), 32, 6); ctx.fill(); rr(b, y - 16, Math.max(0, W - b - 4), 32, 6); ctx.fill(); ctx.fillStyle = '#d9a86c'; rr(10, y - 10, Math.max(0, a - 16), 20, 4); ctx.fill(); rr(b + 6, y - 10, Math.max(0, W - b - 16), 20, 4); ctx.fill(); ctx.fillStyle = '#6b4a2f'; ctx.beginPath(); ctx.arc(a - 14, y, 4, 0, 7); ctx.arc(b + 14, y, 4, 0, 7); ctx.fill(); }
    else if (e.k === 'pad') { ctx.fillStyle = '#e3a92b'; rr(W * .08, y - 13, W * .84, 26, 13); ctx.fill(); ctx.fillStyle = '#fffdf8'; ctx.font = '900 15px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('▲ ▲  SPRUNGFEDER  ▲ ▲', W / 2, y + 1); }
    else if (e.k === 'orb') { const s = 52 + G.beatFx * 8; ctx.globalAlpha = e.used ? .3 : 1; img(SPR.orb, x, y - 70, s); ctx.strokeStyle = 'rgba(217,138,95,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 70, s * .6 + Math.sin(t * 10) * 3, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (e.k === 'portal') {
      const col = e.kind === 'mirror' ? '#8e6cc7' : e.kind === 'speed' ? '#e3a92b' : e.kind === 'mini' ? '#5bb6e8' : '#4f9a5b';
      ctx.fillStyle = col; ctx.globalAlpha = .25 + G.beatFx * .2; ctx.fillRect(8, y - 18, W - 16, 36); ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.strokeRect(8, y - 18, W - 16, 36);
      ctx.fillStyle = '#2b2a33'; ctx.font = '900 17px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.kind === 'mirror' ? (e.on ? '⇄ SPIEGEL' : '⇄ NORMAL') : e.kind === 'speed' ? (e.v > 1.3 ? '▶▶▶ TURBO' : e.v > 1 ? '▶▶ SCHNELL' : '▶ NORMAL') : e.kind === 'mini' ? '● MINI' : '⬤ GROSS', W / 2, y + 1);
    }
    else if (e.k === 'swarm') { const n = Math.min(e.m, 30), rad = 16 + Math.sqrt(e.m) * 7; for (let i = 0; i < n; i++) { const a = i * 2.39996, d = rad * .78 * Math.sqrt((i + .5) / n); img(SPR.bunny, x + Math.cos(a) * d, y + Math.sin(a) * d * .7 + Math.sin(t * 9 + i) * 2, 28); } tag(x, y - rad - 12, e.m, '#6b6676'); }
    else if (e.k === 'shooter') { img(SPR.spray, x, y, e.flash > 0 ? 64 : 58); if (e.flash > 0) e.flash -= 1 / 60; tag(x, y - 42, e.hp, '#c0533f'); }
    else if (e.k === 'crate') { img(SPR.crate, x, y, 56); tag(x, y - 40, '+' + e.gift + ' 🍝', '#3d7d48'); }
    else if (e.k === 'cheese' && !e.hidden) { ctx.fillStyle = 'rgba(246,201,69,.35)'; ctx.beginPath(); ctx.arc(x, y, 30 + G.beatFx * 5, 0, 7); ctx.fill(); img(SPR.cheese, x, y, 44); }
    else if (e.k === 'check' && G.practice) { ctx.fillStyle = '#5bb6e8'; ctx.save(); ctx.translate(W - 30, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18); ctx.restore(); ctx.strokeStyle = 'rgba(91,182,232,.5)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke(); ctx.setLineDash([]); }
  }
  function drawCrowd() {
    const Yc = Y(), shown = Math.min(G.n, 110), r = crowdR(), s = Math.max(9, Math.min(20, 80 / Math.sqrt(shown + 4))) * (G.mini ? .6 : 1), z = G.z, bob = G.beatFx * 3;
    ctx.fillStyle = 'rgba(43,42,51,.12)'; ctx.beginPath(); ctx.ellipse(G.x, Yc + r * .55 + 6, (r + 10) * (1 - Math.min(.4, z / 400)), r * .35 + 6, 0, 0, 7); ctx.fill();
    if (G.shield > 0) { ctx.fillStyle = 'rgba(246,201,69,.3)'; ctx.beginPath(); ctx.ellipse(G.x, Yc - z, r + 22, r * .75 + 20, 0, 0, 7); ctx.fill(); }
    const sq = G.air ? 1 + Math.min(.15, G.vz / 3000) : 1 + G.beatFx * .06;
    for (let i = 0; i < shown; i++) { const a = i * 2.39996, d = r * Math.sqrt((i + .5) / shown); ctx.drawImage(SPR.noodle, G.x + Math.cos(a) * d - s, Yc + Math.sin(a) * d * .7 - z - bob * ((i % 3) / 2) - s * sq, s * 2, s * 2 * sq); }
  }
  function draw(t) {
    ctx.save();
    if (G && G.shake) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
    const lv = G ? G.lv : LEVELS[0], dNow = G ? G.dist(Math.max(0, G.t)) : t * 120;
    floor(lv, dNow);
    if (G) {
      if (G.boss) { const B = G.boss, by = H * .2 + Math.sin(t * 3) * 6; img(SPR[B.spr], B.x, by, B.w, B.h); ctx.fillStyle = '#2b2a33'; ctx.font = '700 28px Caveat, cursive'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(B.name, B.x, by - B.h / 2 - 6); }
      const Yc = Y(), list = [];
      for (const e of G.L.ev) { if (e.done && e.k !== 'spikes') continue; const y = Yc - (e.d - dNow); if (y < -160) break; if ((e.until ? y - (e.d2 - e.d) : y) > H + 80) continue; list.push([e, y]); }
      const layer = { stove: 0, pad: 0, spikes: 1, knife: 2, wall: 2, pin: 2, portal: 2, check: 2, gates: 3 };
      list.sort((a, b) => (layer[a[0].k] ?? 4) - (layer[b[0].k] ?? 4));
      for (const [e, y] of list) drawEv(e, y, t);
      for (const l of G.lobs) { const k = l.t / l.dur, x = l.x0 + (l.tx - l.x0) * k, y = l.y0 + (Yc - l.y0) * k - Math.sin(k * Math.PI) * 160;
        ctx.strokeStyle = `rgba(224,84,63,${.35 + k * .55})`; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(l.tx, Yc, 32, 13, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.save(); ctx.translate(x, y); ctx.rotate(k * 9);
        if (l.k === 'plate') { ctx.fillStyle = '#e9eef2'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 7, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#9aa7b0'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (l.k === 'dust') ctx.drawImage(SPR.bunny, -16, -16, 32, 32); else ctx.drawImage(SPR.sock, -18, -18, 36, 36);
        ctx.restore(); }
      ctx.fillStyle = '#5bb6e8'; for (const s of G.shots) { ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#e3a92b'; for (const b of G.bullets) { ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 9, 0, 0, 7); ctx.fill(); }
      if (G.n > 0 && !G.crashed) drawCrowd();
      for (const p of G.parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s); }
      ctx.globalAlpha = 1;
      for (const f of G.floats) { ctx.globalAlpha = Math.min(1, 2 - f.t * 2); ctx.fillStyle = f.col; ctx.font = `900 ${f.big ? 32 : 22}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 5; ctx.strokeStyle = '#fffdf8'; ctx.strokeText(f.txt, f.x, f.y); ctx.fillText(f.txt, f.x, f.y); }
      ctx.globalAlpha = 1;
      if (G.crashed) { ctx.fillStyle = `rgba(224,84,63,${G.crashed * .25})`; ctx.fillRect(0, 0, W, H); }
      if (G.mirror) { ctx.strokeStyle = 'rgba(142,108,199,.6)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); }
    }
    ctx.restore();
  }
  function frame(nowMs) {
    if (closed) return;
    const dt = Math.min(.04, (nowMs - last) / 1000 || 0); last = nowMs;
    if (running) step(dt);
    draw(nowMs / 1000);
    raf = requestAnimationFrame(frame);
  }

  // ---------- screens ----------
  function pause() { if (!running || !G) return false; running = false; if (AC && AC.state === 'running') AC.suspend(); show('.g-paused', true); return true; }
  function close() {
    if (closed) return; closed = true; running = false; cancelAnimationFrame(raf);
    removeEventListener('resize', resize); removeEventListener('keydown', kd); removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis);
    root.remove(); onClose();
  }
  const vis = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', vis);
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lv) { const lv = b.dataset.lv === 'endlos' ? ENDLESS : LEVELS.find(l => l.id === b.dataset.lv); attempts[lv.id] = 0; startLevel(lv); }
    else if (b.classList.contains('g-close')) close();
    else if (b.classList.contains('g-pause')) pause();
    else if (b.classList.contains('g-resume')) { show('.g-paused', false); audio(); running = true; }
    else if (b.classList.contains('g-restart')) { G.check = null; startLevel(G.lv); }
    else if (b.classList.contains('g-menu')) menu();
    else if (b.classList.contains('g-next')) { const i = LEVELS.indexOf(G.lv), lv = i < LEVELS.length - 1 ? LEVELS[i + 1] : ENDLESS; attempts[lv.id] = 0; startLevel(lv); }
    else if (b.classList.contains('g-mute')) { try { localStorage.setItem('gn_game_mute', muted() ? '0' : '1'); } catch (x) {} setMute(); audio(); }
  });
  menu();
  raf = requestAnimationFrame(frame);
  return {
    back() { if (running) { pause(); return; } if (!$('.g-start').hidden) close(); else menu(); }, close,
    get state() { return G; }, get running() { return running; },
    sim(dt, n) { for (let i = 0; i < n; i++) { if (!running) break; step(dt); } },
    jump, levels: LEVELS,
  };
}
