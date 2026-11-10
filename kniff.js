// 💡 EVENT: KNIFFlicheNudel (2026-11-10, card G22, data in kniffe.js): the event page, the 💡 chip on chores, the
// verdict after ticking a chore, the end (party + record), Vergangene-Events card numbers.
// Save: S.knMine = my own actions {id: [v, ts]} (Kniff W1…: 1 = behalten, 0 = nö · Einrichten E1…: 1 = done, 0 = undone),
// S.partnerKn = the partner's (post.kn). Shared state = the newest action per id (B.state), like the baby ticks.
// Stars: a log entry 'kn-<id>' (kind 'kniff', +2) on the phone that judged it, once per Kniff, only while the event runs.
import * as B from './baby.js';
import * as KN from './kniffe.js';
import { $, closeModal, commit, confetti, esc, floatStar, modal, toast, today, undoToast } from './core.js';
import { A, S, ui } from './state.js';
import { earn } from './sync.js';
import { addToShop, onList } from './kochbuch.js';
import { viewHome } from './home.js';
import { render } from './app.js';

const kDone = () => (S.events || []).some(e => e.id === KN.ID);
export const knLive = () => !kDone() && Date.now() >= KN.START && Date.now() < KN.END;
const st = id => B.state(S.knMine, S.partnerKn, id);
const verdict = id => { const x = st(id); return x ? x[0] : null; };   // 1 kept · 0 dropped · null = not tried yet
const setupOn = id => verdict(id) === 1;
const routineDone = r => KN.tricksOf(r).some(t => verdict(t.id) != null);
const routineHere = r => S.chores.some(c => KN.routineOf(c.name) === r);
export function knCounts() {
  const t = KN.TRICKS.filter(x => verdict(x.id) != null);
  return { tested: t.length, kept: t.filter(x => verdict(x.id) === 1).length, setup: KN.SETUP.filter(x => setupOn(x.id)).length, routines: KN.ROUTINES.filter(r => routineDone(r.k)).length };
}
// the Kniff a chore brings along today: the first untried one of its routine (only while the event runs)
export function knChoreTrick(c) {
  if (!c || !knLive()) return null;
  const r = KN.routineOf(c.name); if (!r) return null;
  const t = KN.tricksOf(r).find(x => verdict(x.id) == null);
  return t ? t.id : null;
}
const keptOf = r => KN.tricksOf(r).filter(x => verdict(x.id) === 1);
// 💡 next to 🛒 📖 🎵 on a chore (Heute + Routinen): gold "Kniff" while one waits to be tried, plain 💡 for kept ones
export function knBtn(c) {
  if (!c || Date.now() < KN.START) return '';
  const r = KN.routineOf(c.name); if (!r) return '';
  if (knChoreTrick(c)) return `<button class="toolbtn knbtn new" data-a="kntip" data-c="${c.id}" aria-label="Kniff für heute">💡 Kniff</button>`;
  const open = !knLive() && KN.tricksOf(r).some(x => verdict(x.id) == null);
  return keptOf(r).length || open ? `<button class="toolbtn knbtn" data-a="kntip" data-c="${c.id}" aria-label="Kniffe">💡${keptOf(r).length ? ' ' + keptOf(r).length : ''}</button>` : '';
}
const trickCard = (t, cls = '') => `<div class="kn-trick ${cls}"><b>${esc(t.t)}</b><span>${esc(t.x)}</span></div>`;
// after ticking a chore that carried a Kniff (heute.js tick): Behalten / Nö / Diesmal nicht; then → what tick would show next
export function knAsk(id, then) {
  const t = KN.trick(id); if (!t) { if (then) then(); return; }
  ui.knThen = then || null;
  modal(`<div class="kn-ask"><span class="kn-eye">💡 ${esc(KN.TITLE)}</span><h2>Hast du’s so gemacht?</h2>${trickCard(t)}
    <p class="muted">Ausprobiert? Dann sag, ob er bleiben darf: <b>+${KN.STARS} ⭐</b> so oder so.</p>
    <div class="row"><button class="btn green" data-a="knv" data-id="${t.id}" data-v="1">💚 Behalten</button><button class="btn soft" data-a="knv" data-id="${t.id}" data-v="0">👋 Nö</button></div>
    <button class="btn soft wide" data-a="knv" data-id="${t.id}" data-v="skip" style="margin-top:8px">Diesmal nicht probiert</button></div>`);
}
function setV(id, v) { (S.knMine = S.knMine || {})[id] = [v, Date.now()]; }
export function knReconcile() {   // → true when the event ended just now (all ten routines have a verdict)
  if (!S || kDone() || Date.now() < KN.START || Date.now() >= KN.END) return false;
  if (!KN.ROUTINES.every(r => routineDone(r.k))) return false;
  const c = knCounts();
  (S.events = S.events || []).push(KN.record(c.tested, c.kept, c.setup));
  ui.knParty = true; if (ui.sub === 'kniff') ui.sub = null;
  return true;
}
export function knParty() {
  if (!ui.knParty) return;
  ui.knParty = false; render(); confetti(150);
  const c = knCounts();
  modal(`<div class="kn-party">${bulb(10)}</div><h2>Alle Routinen probiert! 💡</h2><p>${c.tested} Kniffe zusammen ausprobiert, ${c.kept} davon bleiben. 💛</p>
    <p class="muted">Was ihr behalten habt, wartet ab jetzt als 💡 bei der Routine. Die übrigen Kniffe könnt ihr dort jederzeit nachlesen.</p>
    <div class="row"><button class="btn" data-a="events">Ansehen</button><button class="btn soft" data-a="close">Hach 💛</button></div>`);
}
// a little light bulb with ten rays: one ray lights up per routine that has been tried
function bulb(n) {
  const rays = Array.from({ length: 10 }, (_, i) => { const a = (-162 + i * 36) * Math.PI / 180, x1 = 60 + Math.cos(a) * 40, y1 = 52 + Math.sin(a) * 40, x2 = 60 + Math.cos(a) * 52, y2 = 52 + Math.sin(a) * 52;
    return `<path class="kb-ray${i < n ? ' on' : ''}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; }).join('');
  return `<svg class="knbulb" viewBox="0 0 120 120" aria-hidden="true">${rays}
    <path class="kb-glass${n ? ' lit' : ''}" d="M60 26a26 26 0 0 0-15 47c3 3 5 7 5 11v4h20v-4c0-4 2-8 5-11a26 26 0 0 0-15-47z"/>
    <path class="kb-fil" d="M53 74q3-14 7-6q4-8 7 6"/><rect class="kb-base" x="50" y="90" width="20" height="5" rx="2"/><rect class="kb-base" x="52" y="97" width="16" height="5" rx="2"/>
    <text x="60" y="117" class="kb-t">${n}/10</text></svg>`;
}

export function viewKniffe() {
  if (!knLive()) { ui.sub = null; return viewHome(); }
  const c = knCounts();
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  h += `<div class="card kncard hero">${bulb(c.routines)}<span class="kn-eye">Gute-Nudel-Event</span><span class="kn-t">💡 ${esc(KN.TITLE)}</span>
    <span class="kn-info">Weniger Arbeit im Haushalt – mit den richtigen Handgriffen. Jede Routine bringt, wenn sie dran ist, einen <b>💡 Kniff</b> mit. Probier ihn beim Erledigen aus; beim Abhaken entscheidest du: <b>behalten</b> oder <b>nö</b>. Das gibt <b>+${KN.STARS} ⭐</b>. Was bleibt, steht danach für immer als 💡 bei der Routine.</span>
    <span class="kn-made">${c.routines} von 10 Routinen probiert · ${c.kept} ${c.kept === 1 ? 'Kniff bleibt' : 'Kniffe bleiben'}</span>
    <span class="kn-until">Wenn jede Routine einmal dran war, wird gefeiert – spätestens am 21. Dezember ist Schluss.</span></div>`;
  // Teil 1
  const sn = KN.SETUP.filter(x => setupOn(x.id)).length;
  h += `<div class="sec-title">🧰 Teil 1: Einmal einrichten <small class="kn-n">${sn}/${KN.SETUP.length}</small></div>
    <p class="muted" style="margin:0 4px 10px">Einmal gemacht, spart es jede Woche Wege. 🛒 setzt es auf die Einkaufsliste.</p><div class="card knsetup">`;
  h += KN.SETUP.map(x => { const on = setupOn(x.id), inList = x.buy && onList(x.buy);
    return `<div class="bitem kn-row${on ? ' done' : ''}"><button class="bchk" data-a="knsetup" data-id="${x.id}" aria-pressed="${on}" aria-label="${esc(x.t)} ${on ? 'nicht mehr abhaken' : 'abhaken'}"></button>
      <span class="kn-rt"><b>${esc(x.t)}</b><small>${esc(x.x)}</small></span>${x.buy && !on ? `<button class="toolbtn kn-buy${inList ? ' on' : ''}" data-a="knbuy" data-id="${x.id}" aria-label="${esc(x.buy)} auf die Einkaufsliste">🛒</button>` : ''}</div>`; }).join('');
  h += `</div>`;
  // goldene Regeln
  h += `<div class="sec-title">✨ Die goldenen Regeln</div><div class="card"><ol class="kn-rules">${KN.RULES.map(([t, x]) => `<li><b>${esc(t)}</b> <span>${esc(x)}</span></li>`).join('')}</ol></div>`;
  // die Kniffe
  h += `<div class="sec-title">💡 Die Kniffe</div><p class="muted" style="margin:0 4px 10px">Sie kommen der Reihe nach, immer mit der Routine. Tipp auf einen probierten, um ihn umzuentscheiden.</p>`;
  for (const r of KN.ROUTINES) {
    const ts = KN.tricksOf(r.k), next = ts.find(t => verdict(t.id) == null), here = routineHere(r.k);
    h += `<div class="card kngroup${routineDone(r.k) ? ' tried' : ''}"><div class="bg-head"><span class="bg-ic">${r.icon}</span><span class="bg-tt"><b>${esc(r.name)}</b>${here ? '' : '<span class="muted">keine passende Routine auf diesem Handy</span>'}</span><span class="bg-n${routineDone(r.k) ? ' full' : ''}">${routineDone(r.k) ? '✓' : '○'}</span></div>
      ${ts.map(t => { const v = verdict(t.id);
        if (v == null) return `<div class="kn-tr open${t === next ? ' next' : ''}"><span class="kn-st">${t === next ? '💡' : '·'}</span><span class="kn-rt"><b>${esc(t.t)}</b>${t === next ? '<small>kommt mit der nächsten Runde</small>' : ''}</span></div>`;
        return `<button class="kn-tr ${v ? 'kept' : 'nope'}" data-a="knflip" data-id="${t.id}"><span class="kn-st">${v ? '💚' : '👋'}</span><span class="kn-rt"><b>${esc(t.t)}</b><small>${esc(t.x)}</small></span></button>`; }).join('')}</div>`;
  }
  return h;
}
// the 💡 on a chore: today's Kniff (event) + the kept ones; after the event also the untried ones (readable, no stars)
function tipModal(c) {
  const r = KN.routineOf(c.name), cur = knChoreTrick(c), kept = keptOf(r), rest = !knLive() ? KN.tricksOf(r).filter(x => verdict(x.id) == null) : [];
  let h = `<h2>💡 ${esc(c.icon)} ${esc(c.name)}</h2>`;
  if (cur) h += `<p class="kn-eye">Heute ausprobieren</p>${trickCard(KN.trick(cur), 'now')}<p class="muted">Beim Abhaken fragt die App: behalten oder nö? +${KN.STARS} ⭐.</p>`;
  if (kept.length) h += `<p class="kn-eye">Eure Kniffe</p>${kept.map(t => trickCard(t, 'kept')).join('')}`;
  if (rest.length) h += `<p class="kn-eye">Noch nicht probiert</p>${rest.map(t => `${trickCard(t)}<div class="row kn-late"><button class="btn soft" data-a="knset" data-id="${t.id}" data-c="${c.id}" data-v="1">💚 Behalten</button><button class="btn soft" data-a="knset" data-id="${t.id}" data-c="${c.id}" data-v="0">👋 Nö</button></div>`).join('')}`;
  h += `<div class="row">${knLive() ? '<button class="btn soft" data-a="kniff">Zum Event</button>' : ''}<button class="btn" data-a="close">Alles klar</button></div>`;
  modal(h, '', !!$('#ov'));
}

Object.assign(A, {
  kniff() { closeModal(); ui.tab = 'home'; ui.sub = 'kniff'; render(); scrollTo(0, 0); },
  kntip(el) { const c = S.chores.find(x => x.id === el.dataset.c); if (c) tipModal(c); },
  knv(el) {
    const id = el.dataset.id, v = el.dataset.v, then = ui.knThen; ui.knThen = null;
    closeModal();
    if (v !== 'skip') {
      setV(id, +v);
      const lid = 'kn-' + id;
      if (knLive() && !S.log.some(e => e.id === lid)) { S.log.push({ id: lid, text: '💡 Kniff: ' + KN.trick(id).t, kind: 'kniff', day: today(), ts: Date.now(), stars: KN.STARS }); earn(KN.STARS); floatStar(null, `+${KN.STARS} ⭐`); }
      knReconcile();
    }
    commit(v !== 'skip');
    if (then) then();
    if (v === '1') setTimeout(() => { if (!$('#ov')) undoToast('💚 Der Kniff bleibt – als 💡 bei der Routine', () => { setV(id, 0); commit(true); }); }, 50);
    knParty();
  },
  knset(el) { setV(el.dataset.id, +el.dataset.v); commit(true); const c = S.chores.find(x => x.id === el.dataset.c); if (c) tipModal(c); },
  knflip(el) { const id = el.dataset.id; setV(id, verdict(id) ? 0 : 1); commit(true); },
  knsetup(el) { const id = el.dataset.id; setV(id, setupOn(id) ? 0 : 1); commit(true); },
  knbuy(el) {
    const x = KN.SETUP.find(s => s.id === el.dataset.id); if (!x || !x.buy) return;
    if (onList(x.buy)) { toast('🛒 ' + x.buy + ' steht schon auf der Liste'); return; }
    const had = new Set(S.shop.map(s => s.id)); addToShop(x.buy, null, '', null);
    const added = new Set(S.shop.filter(s => !had.has(s.id)).map(s => s.id));
    commit();
    undoToast(`🛒 ${x.buy} steht auf der Liste`, () => { S.shop = S.shop.filter(s => !added.has(s.id)); commit(); });
  },
});
