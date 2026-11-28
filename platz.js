// 🍪 EVENT: Plätzchen-Rush (card G25, 2026-11-28, data in plaetzchen.js): the event page, the Plätzchenteller, stars per
// Advent, the party, the end. One tin per Advent Sunday (3 Plätzchen, 3 families); the first of them rated in cooking mode
// (either phone: S.cookLog + S.partnerCooked) puts that Advent on the plate → log 'pl-<event>-<n>' (kind 'event', +5 ⭐,
// outside the daily cap) on each phone by itself. A missed tin stays open. Four on the plate = party + S.events record.
import * as PL from './plaetzchen.js';
import { closeModal, confetti, esc, modal, today } from './core.js';
import { A, S, ui } from './state.js';
import { earn, pn, vorrat } from './sync.js';
import { endCookMode, haveFor, recipeById, recipePage, styleOf, viewCookMode } from './kochbuch.js';
import { viewHome } from './home.js';
import { render } from './app.js';

const plDone = () => (S.events || []).some(e => e.id === PL.ID);
export const plLive = () => !plDone() && Date.now() >= PL.START && Date.now() < PL.END;
// every Plätzchen baked + rated so far, both phones together (team, never per person), oldest first
function bakes() {
  return [...(S.cookLog || []), ...(S.partnerCooked || [])]
    .filter(x => x && PL.counts(x.rid) && (x.ts || 0) >= PL.openAt(PL.advOf(x.rid))).sort((a, b) => a.ts - b.ts);
}
// the plate: per Advent the first one baked from its tin → [{adv, rid, title, icon}]
export function plPlate() {
  const b = bakes(), out = [];
  for (let a = 0; a < 4; a++) { const x = b.find(y => PL.advOf(y.rid) === a); if (x) out.push({ adv: a, rid: x.rid, title: x.title, icon: x.icon }); }
  return out;
}
// a tin that is open and not on the plate yet (the bubble's coloured ring)
export const plWaiting = () => plLive() && plPlate().length < PL.opened();
export function plReconcile() {   // → true when something changed (stars granted / event done)
  if (!S || plDone() || Date.now() < PL.START) return false;
  const plate = plPlate(); let n = 0;
  for (const p of plate) {
    const lid = `pl-${PL.ID}-${p.adv + 1}`;
    if (!S.log.some(e => e.id === lid)) { S.log.push({ id: lid, text: `🍪 ${p.adv + 1}. Advent auf dem Plätzchenteller`, kind: 'event', day: today(), ts: Date.now(), stars: PL.STARS }); earn(PL.STARS); n++; ui.plNew = p; }
  }
  if (plate.length >= 4) {
    (S.events = S.events || []).push(PL.record(plate));
    ui.plParty = 'final'; if (ui.sub === 'plaetz') { ui.sub = null; ui.rid = null; }
    return true;
  }
  if (n) ui.plParty = 'adv';
  return n > 0;
}
const DAYN = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'], MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const advDate = a => { const d = new Date(PL.ADVENT[a]); return `${DAYN[d.getDay()]} ${d.getDate()}. ${MON[d.getMonth()]}`; };
export function plParty() {
  if (!ui.plParty) return;
  const kind = ui.plParty, p = ui.plNew; ui.plParty = null; ui.plNew = null;
  render(); confetti(kind === 'final' ? 180 : 110);
  const plate = plPlate();
  if (kind === 'final') {
    modal(`<div class="plparty">${plateSvg(plate)}</div><h2>Der Plätzchenteller ist voll! 🍪</h2><p>Vier Advents, vier Sorten – zusammen gebacken. 💛</p>
      <p class="muted">Alle zwölf Rezepte stehen ab jetzt im Kochbuch unter <b>🧁 Backen</b>.</p>
      <div class="row"><button class="btn" data-a="plbook">Zu den Plätzchen</button><button class="btn soft" data-a="close">Frohe Weihnachten 🎄</button></div>`);
    return;
  }
  const open = PL.opened(), left = open - plate.length, nx = open < 4 ? advDate(open) : '';
  modal(`<div class="plparty">${plateSvg(plate)}</div><h2>${p ? esc(p.icon + ' ' + p.title) : 'Plätzchen'} – ab auf den Teller!</h2>
    <p>${p ? `Der ${p.adv + 1}. Advent ist geschafft.` : ''} <b>+${PL.STARS} ⭐</b> für dich und für ${esc(pn())}.</p>
    <p class="muted">${left > 0 ? `Noch ${left === 1 ? 'eine Dose wartet' : left + ' Dosen warten'} auf euch – ganz ohne Eile.` : nx ? `Die nächste Dose geht am ${esc(nx)} auf.` : ''}</p>
    <div class="row"><button class="btn soft" data-a="close">Lecker 🍪</button></div>`);
}

// ---------- the Plätzchenteller: a plate seen from above, one cluster per Advent, four candles below ----------
const SHAPE = {
  'pl-vanillekipferl': ['moon', '#f3e3c3'], 'pl-pepparkakor': ['heart', '#9a5a2c'], 'pl-ausstecher': ['star', '#f0c95a'],
  'pl-kokosmakronen': ['round', '#f2e6cf'], 'pl-cantuccini': ['bar', '#d9a866'], 'pl-crossies': ['round', '#4a2c1d'],
  'pl-spitzbuben': ['jam', '#eed3a3'], 'pl-snickerdoodles': ['round', '#d8a77a'], 'pl-nussecken': ['tri', '#a8642e'],
  'pl-elisenlebkuchen': ['round', '#5b3a29'], 'pl-melomakarona': ['oval', '#b8742f'], 'pl-schneebaelle': ['round', '#ffffff'],
};
function cookie(rid, x, y) {
  const [s, c] = SHAPE[rid] || ['round', '#d8a77a'], st = 'class="pt-c" stroke="rgba(74,42,34,.35)" stroke-width="1"';
  if (s === 'moon') return `<path ${st} fill="${c}" d="M${x - 8} ${y + 2}a8 7 0 0 1 16 0a8 4 0 0 0 -16 0z"/>`;
  if (s === 'heart') return `<path ${st} fill="${c}" transform="translate(${x} ${y}) scale(1.6)" d="M0 4C-6 0-4-5 0-2C4-5 6 0 0 4z"/>`;
  if (s === 'star') return `<path ${st} fill="${c}" d="${starPath(x, y, 8.5, 3.8)}"/>`;
  if (s === 'bar') return `<rect ${st} fill="${c}" x="${x - 9}" y="${y - 3.5}" width="18" height="7" rx="2" transform="rotate(-18 ${x} ${y})"/>`;
  if (s === 'tri') return `<path ${st} fill="${c}" d="M${x - 8} ${y + 5}L${x + 8} ${y + 5}L${x} ${y - 7}z"/><path fill="#3b2418" d="M${x - 8} ${y + 5}l3.5 0l-1.8-3z M${x + 8} ${y + 5}l-3.5 0l1.8-3z"/>`;
  if (s === 'oval') return `<ellipse ${st} fill="${c}" cx="${x}" cy="${y}" rx="8.5" ry="5.5"/><path stroke="#6b4423" stroke-width="1.4" stroke-linecap="round" d="M${x - 3} ${y - 1}h1 M${x + 1} ${y + 1}h1 M${x + 3} ${y - 2}h1"/>`;
  if (s === 'jam') return `<circle ${st} fill="${c}" cx="${x}" cy="${y}" r="8"/><circle fill="#b5282f" cx="${x}" cy="${y}" r="2.8"/>`;
  return `<circle ${st} fill="${c}" cx="${x}" cy="${y}" r="7.5"/>`;
}
function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(1) + ' ' + (cy + q * Math.sin(a)).toFixed(1); }
  return d + 'z';
}
const SPOT = [[54, 52], [106, 52], [54, 80], [106, 80]];
function plateSvg(plate) {
  const on = new Set(plate.map(p => p.adv));
  const cl = plate.map(p => { const [x, y] = SPOT[p.adv]; return `<g transform="translate(${x} ${y}) scale(1.35) translate(${-x} ${-y})"><g class="pt-g" style="animation-delay:${p.adv * .12}s">${cookie(p.rid, x - 9, y - 2)}${cookie(p.rid, x + 9, y - 3)}${cookie(p.rid, x, y + 6)}</g></g>`; }).join('');
  const candles = [0, 1, 2, 3].map(a => { const x = 44 + a * 24;
    return `<rect class="pt-wax" x="${x - 4}" y="130" width="8" height="20" rx="1.5"/>${on.has(a) ? `<path class="pt-fl" d="M${x} 117q4 6 0 10q-4-4 0-10z"/>` : `<path class="pt-wick" d="M${x} 127v3"/>`}`; }).join('');
  return `<svg class="plplate" viewBox="0 0 160 158" aria-hidden="true"><ellipse class="pt-sh" cx="80" cy="70" rx="72" ry="46"/><ellipse class="pt-rim" cx="80" cy="66" rx="72" ry="46"/>
    <ellipse class="pt-in" cx="80" cy="66" rx="56" ry="34"/>${cl}${candles}<path class="pt-twig" d="M22 151q58 -5 116 0"/></svg>`;
}

// ---------- the event page ----------
export function viewPlaetzchen() {
  if (!plLive()) { ui.sub = null; ui.rid = null; return viewHome(); }
  const r = ui.rid ? recipeById(ui.rid) : null;
  if (r && ui.cstep != null) return viewCookMode();
  if (r) {
    return `<button class="btn soft" data-a="pllist" style="margin:4px 0 12px">← Zu den Plätzchendosen</button>
      <div class="cbook cb-top gb-cbook"><div class="cb-body"><div class="bk-stage"><div class="bk-page cur bp-${styleOf(r)}" data-key="r-${esc(r.id)}"><div class="bp">${recipePage(r)}</div></div></div></div></div>`;
  }
  const V = vorrat(), plate = plPlate(), byAdv = new Map(plate.map(p => [p.adv, p])), open = PL.opened();
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  h += `<div class="card plcard hero">${plateSvg(plate)}<span class="pl-eye">Gute-Nudel-Event · Advent</span><span class="pl-t">🍪 ${esc(PL.TITLE)}</span>
    <span class="pl-info">Jeden Adventssonntag geht eine neue Plätzchendose auf: drei Sorten aus drei Familien – ein Klassiker, eine aus aller Welt, eine kinderleichte. Sucht euch eine aus, backt sie und bewertet sie im Kochmodus: dann kommt der Advent auf den Teller, eine Kerze geht an, und es gibt <b>+${PL.STARS} ⭐ für dich und für ${esc(pn())}</b>. Eine Woche verpasst? Die Dose bleibt offen.</span>
    <span class="pl-made">${plate.length} von 4 Advents auf dem Teller</span></div>`;
  // open tins: the ones still waiting first (oldest first), then the ones already on the plate
  const order = [...Array(open).keys()].sort((a, b) => (byAdv.has(a) - byAdv.has(b)) || a - b);
  for (const a of order) {
    const got = byAdv.get(a);
    h += `<div class="sec-title">🕯️ ${a + 1}. Advent <span class="muted" style="font-weight:600">· ${esc(advDate(a))}${got ? ' · ✓ auf dem Teller' : ''}</span></div>`;
    if (got) h += `<p class="muted pl-extra">Noch Lust auf eine zweite Sorte? Geht immer – nur die Sterne gibt’s einmal pro Advent.</p>`;
    h += PL.TINS[a].map(id => recipeById(id)).filter(Boolean).map(c => plRow(c, V, got)).join('');
  }
  for (let a = open; a < 4; a++)
    h += `<div class="card pl-closed"><span class="pl-lock">🎁</span><span><b>${a + 1}. Advent</b><span class="muted">Die Dose geht am ${esc(advDate(a))} auf – was drin ist, bleibt bis dahin eine Überraschung.</span></span></div>`;
  return h;
}
function plRow(c, V, got) {
  const miss = V.length ? haveFor(c, V).missing : [], k = PL.kindOf(c.id), on = got && got.rid === c.id;
  return `<button class="card gbcake t-${styleOf(c)}${on ? ' pl-done' : got ? ' pl-dim' : ''}" data-a="plopen" data-id="${esc(c.id)}">${on ? '<span class="gbk-rib">✓ auf dem Teller</span>' : got ? '' : `<span class="gbk-rib pl-star">+${PL.STARS} ⭐</span>`}<span class="gbk-lv">${esc(k ? k[1] : '')} · ${esc(c.fam || '')}</span>
    <span class="gbk-t">${esc(c.icon + ' ' + c.title)}</span><span class="gbk-m">⏱ ${c.min} Min. · ${esc(c.serves)}${c.taste ? ' · ' + c.taste.map(esc).join(', ') : ''}</span>
    <span class="gbk-v">${!V.length ? '' : miss.length ? '🛒 fehlt: ' + esc(miss.slice(0, 5).join(', ')) + (miss.length > 5 ? ' …' : '') : '🧊 alles daheim'}</span><span class="gbk-go">Backen ›</span></button>`;
}
A.plaetz = () => { closeModal(); ui.tab = 'home'; ui.sub = 'plaetz'; ui.rid = null; ui.cstep = null; render(); scrollTo(0, 0); };
A.plopen = el => { ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = []; render(); scrollTo(0, 0); };
A.pllist = () => { endCookMode(); ui.rid = null; ui.sides = []; render(); scrollTo(0, 0); };
A.plbook = () => { closeModal(); ui.tab = 'hello'; ui.sub = null; ui.qtab = 'kochbuch'; ui.lastQ.hello = 'kochbuch'; ui.rid = null; ui.ktab = 'next'; ui.ccat = 'backen'; ui.kcat = 'backen'; ui.rq = ''; render(); scrollTo(0, 0); };
