// 🏃 G44 Sprint-Planung as a BOARD (his design 2026-11-28, he is the PO): Julia | Liste | Stefan. The middle = every open
// to-do of both (❗⏰ first, Eisenhower), the sides = each person's next 7 days (today first) with the routines greyed
// and a quiet "x/10". Drag an item from the Liste onto a person's day, between days or people, back into the Liste,
// or onto 🗑. 🙋 Nur-ich items never go to the other person. No auto-fill anywhere: a day holds what you put there.
// Phone mode (same job, no dragging): tabs Julia | Liste | Stefan, tap an item → one big sheet: who, which day,
// back to the Liste, 🗑, Merkmale. Moving between people leaves NO trace (G42 rule).
// Wire: each phone posts its open to-dos (post.open, incl. sday + where) and its routine load per day (post.rt);
// decisions on the partner's items travel in post.sprint = [{k, id, v, ts, day?, item?, f?}] (14 days), applied once
// on the partner phone (S.sprintSeen):  v 'day' (day or null = back to the Liste) · 'weg' · 'take' · 'give' · 'flags'.
import { addDays, closeModal, commit, esc, modal, parse, today, toast, uid } from './core.js';
import * as C from './content.js';
import * as D from './data.js';
import { A, S, ui } from './state.js';
import { pn } from './sync.js';
import { render } from './app.js';
import { askFlags, eisen, flagTags, setFlags } from './flags.js';
import { choreDone, choreDue, choreNext, isDaily, moveRoutine, planAhead } from './chores.js';
import { setWalks, walkCount, walksPost } from './walks.js';

const KEEP = 14 * 864e5, DAYS = 7;
const mineOpen = () => S.items.filter(i => !i.chore && (i.where === 'liste' || i.where === 'heute'));
const strip = i => ({ id: i.id, text: String(i.text || '').slice(0, 160), where: i.where, sday: i.sday || null, pile: i.pile || null, due: i.due || null, heavy: !!i.heavy, joy: !!i.joy, own: !!i.own, imp: !!i.imp, urg: !!i.urg, flagged: !!i.flagged, created: i.created || 0 });
const carry = (from, to) => { for (const k of ['due', 'heavy', 'joy', 'imp', 'urg', 'flagged', 'pile']) if (from[k]) to[k] = from[k]; return to; };
const pending = () => (S.sprintOut || []).filter(e => Date.now() - e.ts < KEEP);
const days = () => Array.from({ length: DAYS }, (_, n) => addDays(today(), n));
// my routines per day (today = what is really on the page or done), for the greyed lines + the load
function myRoutines() {
  const t = today(), plan = planAhead(addDays(t, DAYS - 1)), out = {}, placed = new Set();
  for (const d of days()) out[d] = (plan[d] || []).filter(x => x.c).map(x => { placed.add(x.c.id); const a = (x.c.hh || []).find(y => y.who === D.me() && y.day === d);
    return { id: x.c.id, t: x.c.icon + ' ' + x.c.name, fix: !!x.daily || x.st === 'done', daily: !!x.daily, done: x.st === 'done', hh: x.c.kind !== 'eigen', asg: a ? a.k : null, due: a ? a.due : d, walk: !!x.c.walks }; });
  // 🏃 G45: due (or overdue) but no place in these 7 days → it waits in the Liste
  out._w = S.chores.filter(c => !isDaily(c) && !placed.has(c.id) && choreDue(c, t)).map(c => ({ id: c.id, t: c.icon + ' ' + c.name }));
  // 🗓️ his ask 2026-11-28: every household routine NOT in these 7 days, plannable anyway (doing it early restarts its rhythm)
  out._x = S.chores.filter(c => c.kind !== 'eigen' && !isDaily(c) && !placed.has(c.id) && !choreDue(c, t)).map(c => ({ id: c.id, t: c.icon + ' ' + c.name, next: choreNext(c) }));
  return out;
}
// an older phone posts plain labels / rows without the 🏠 info: treat them as household (all of hers were unmarked), so the
// central planning on ONE device still sees every chore (his point 2026-11-28)
const rtNorm = r => (r || []).map(x => typeof x === 'string' ? { t: x, fix: true, hh: true, daily: true } : 'hh' in x ? x : { ...x, hh: true, daily: !!x.fix, due: x.due });

// ---------- what travels ----------
export const sprintPost = () => {
  let rt = {}; try { rt = myRoutines(); } catch (e) {}
  const hhDone = S.log.filter(e => e.hh && Date.now() - (e.ts || 0) < KEEP).map(e => ({ k: e.hh, cid: e.hhc, day: e.day }));
  return { open: mineOpen().slice(0, 250).map(i => i.hh ? { ...strip(i), hh: i.hh } : strip(i)), rt, sprint: pending(), hhDone, walks: walksPost() };
};
// the partner's open list as I see it: their post with my decisions not yet applied over there laid on top
export function partnerOpen() {
  const gone = new Set(), day = {}, fl = {};
  for (const e of pending()) {
    if (e.v === 'weg' || e.v === 'take') gone.add(e.id);
    else if (e.v === 'day') day[e.id] = e.day || null;
    else if (e.v === 'flags' && e.f) fl[e.id] = e.f;
  }
  const out = (S.partnerOpen || []).filter(i => !gone.has(i.id) && !S.items.some(x => x.id === i.id)).map(i => {
    const y = { ...i };
    if (i.id in day) { y.sday = day[i.id]; y.where = day[i.id] === today() ? 'heute' : 'liste'; }
    if (fl[i.id]) setFlags(y, fl[i.id]);
    return y;
  });
  // my gifts still on their way: already theirs
  for (const e of pending()) if (e.v === 'give' && e.item && !out.some(i => i.id === e.item.id) && !(S.partnerOpen || []).some(i => i.id === e.item.id)) out.push({ ...e.item });
  return out;
}
// plan an item of MINE on a day (null = back to the Liste)
export function setDay(it, d) {
  const t = today(), T = S.today;
  if (d) it.sday = d; else delete it.sday;
  if (d === t) {
    if (it.where !== 'heute') { it.where = 'heute'; it.carried = false; T.planned = true; T.picked = (T.picked || []).filter(p => p.id !== it.id).concat([{ id: it.id, why: '🏃 geplant' }]); T.nope = (T.nope || []).filter(x => x !== it.id); T.closed = false; }
  } else if (it.where === 'heute') { it.where = 'liste'; T.picked = (T.picked || []).filter(p => p.id !== it.id); }
}
export function sprintReceive(p) {
  let ch = false;
  if (p.open && JSON.stringify(p.open) !== JSON.stringify(S.partnerOpen || null)) { S.partnerOpen = p.open; ch = true; }
  if (p.rt && JSON.stringify(p.rt) !== JSON.stringify(S.partnerRt || null)) { S.partnerRt = p.rt; ch = true; }
  if (p.walks && JSON.stringify(p.walks) !== JSON.stringify(S.partnerWalks || null)) { S.partnerWalks = p.walks; ch = true; }
  const seen = new Set(S.sprintSeen || []);
  for (const e of p.sprint || []) {
    if (!e || !e.k || seen.has(e.k)) continue;
    seen.add(e.k); ch = true;
    const it = S.items.find(i => i.id === e.id && !i.chore);
    if (e.v === 'day') { if (it) setDay(it, e.day && e.day >= today() ? e.day : null); }
    else if (e.v === 'flags' && e.f) { if (it) setFlags(it, e.f); }
    else if (e.v === 'walks') { const c = S.chores.find(x => x.id === e.id); if (c) setWalks(c, e.days || [], e.n || {}); }
    else if (e.v === 'hh') applyHH(e);
    else if (e.v === 'hhx') applyHHX(e);
    else if (e.v === 'rkind') { const c = S.chores.find(x => x.id === e.id); if (c) c.kind = e.kind; }
    else if (e.v === 'rmove') { const c = S.chores.find(x => x.id === e.id); if (c && e.to >= today()) moveRoutine(c, e.from || today(), e.to); }
    else if (e.v === 'weg' || e.v === 'take') { if (it) S.items = S.items.filter(i => i !== it); }
    else if (e.v === 'give' && e.item && !S.items.some(i => i.id === e.item.id)) {
      const x = carry(e.item, { id: e.item.id, text: e.item.text, where: 'liste', created: e.item.created || Date.now() });
      S.items.push(x);
      if (e.item.sday && e.item.sday >= today()) setDay(x, e.item.sday);
    }
  }
  for (const x of p.hhDone || []) {   // 🏠 G46: the other one did my routine → its rhythm starts over here
    if (!x || !x.k || seen.has('d:' + x.k)) continue;
    seen.add('d:' + x.k); ch = true;
    const c = S.chores.find(y => y.id === x.cid); if (!c) continue;
    if (!(c.last && c.last >= x.day)) choreDone(c, x.day);
    if (c.hh) { c.hh = c.hh.filter(a => a.k !== x.k); if (!c.hh.length) delete c.hh; }
  }
  if (ch) S.sprintSeen = [...seen].slice(-400);
  return ch;
}
const out = e => { S.sprintOut = pending().concat([{ k: uid(), ts: Date.now(), ...e }]); };

// ---------- the model the board draws ----------
const julia = () => D.me() === 'stand' ? 'me' : 'you';   // left column = Julia, right = Stefan, on every device
const nameOf = w => w === 'me' ? (S.name || 'Ich') : pn();
const sideOf = col => col === 'J' ? julia() : (julia() === 'me' ? 'you' : 'me');
const dayOf = i => i.where === 'heute' ? today() : (i.sday && i.sday >= today() ? i.sday : null);
function model() {
  const me = mineOpen().map(i => ({ ...i, who: 'me' })), you = partnerOpen().map(i => ({ ...i, who: 'you' }));
  const all = [...me, ...you];
  let mine = {}; try { mine = myRoutines(); } catch (e) {}
  const yrt = {}; for (const [k, v] of Object.entries(S.partnerRt || {})) yrt[k] = rtNorm(v);
  for (const e of pending()) if (e.v === 'rmove') {
    const src = e.from ? (yrt[e.from] || []) : (yrt._w || []), r = src.find(x => x.id === e.id);
    if (!r || !days().includes(e.to)) continue;
    if (e.from) yrt[e.from] = src.filter(x => x !== r); else yrt._w = src.filter(x => x !== r);
    yrt[e.to] = (yrt[e.to] || []).concat([{ ...r, fix: false }]);
  }
  const took = {};   // rows handed to me (gone from her side) – kept, so an undo can put them back
  for (const e of pending()) {   // 🏠 G46: my household decisions on HER routines, until her phone posts them back
    if (e.v === 'hh' && e.home === D.partner()) for (const d of Object.keys(yrt)) {   // planned: it leaves its old day and sits on the planned one at once
      if (d === '_w' || !Array.isArray(yrt[d])) continue;
      const r = yrt[d].find(x => x.id === e.id && (x.due || d) === e.due); if (!r) continue;
      yrt[d] = yrt[d].filter(x => x !== r); took[e.a] = { ...r, due: e.due };
      if (e.who === D.partner()) yrt[e.day] = (yrt[e.day] || []).concat([{ ...r, asg: e.a, due: e.due, fix: false }]);
      break;
    }
    if (e.v === 'hhx' && e.home === D.partner()) for (const d of Object.keys(yrt)) {   // back into the week view, on its due day
      if (d === '_w' || !Array.isArray(yrt[d])) continue;
      const r = yrt[d].find(x => x.asg === e.a); if (!r) continue;
      yrt[d] = yrt[d].filter(x => x !== r); const due = r.due || d;
      if (days().includes(due)) yrt[due] = (yrt[due] || []).concat([{ ...r, asg: null, gone: false }]);
      delete took[e.a]; break;
    }
    if (e.v === 'hhx' && e.home === D.partner() && took[e.a]) { const r = took[e.a]; delete took[e.a]; if (days().includes(r.due)) yrt[r.due] = (yrt[r.due] || []).concat([{ ...r, asg: null, gone: false }]); }
  }
  for (const d of Object.keys(yrt)) if (Array.isArray(yrt[d])) yrt[d] = yrt[d].filter(x => !x.gone);
  for (const e of pending()) if (e.v === 'hh' && e.home === D.partner() && Array.isArray(yrt._x) && yrt._x.some(x => x.id === e.id && x.next === e.due)) { yrt._x = yrt._x.filter(x => !(x.id === e.id && x.next === e.due)); if (e.who === D.partner()) yrt[e.day] = (yrt[e.day] || []).concat([{ id: e.id, t: e.t, hh: true, asg: e.a, due: e.due, fix: false }]); }
  const rt = { me: mine, you: yrt };
  return { all, rt, liste: eisen(all.filter(i => !dayOf(i)).sort((a, b) => (a.created || 0) - (b.created || 0))) };
}
const load = (M, who, d) => rtNorm((M.rt[who] || {})[d]).filter(r => !r.walk).length + M.all.filter(i => i.who === who && dayOf(i) === d).length + walksOf(M).reduce((a, w) => a + walkCount(w, abs(who), d), 0);
const dayLabel = d => d === today() ? 'Heute' : parse(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });

// ---------- moving (one place for drag, phone sheet and trash) ----------
function move(id, toWho, d) {   // toWho 'me'|'you'|null (= stays with the owner), d = day or null (Liste)
  if (id.startsWith('x:')) return moveX(id, toWho, d);
  if (id.startsWith('s:') || id.startsWith('w:')) return moveS(id, toWho, d);
  if (id.startsWith('r:')) return moveR(id, toWho, d);
  const M = model(), it = M.all.find(i => i.id === id); if (!it) return false;
  if (it.hh) return moveHH(M, it, toWho, d);
  const who = toWho || it.who;
  if (who !== it.who && it.own) { toast('🙋 Das kann nur ' + nameOf(it.who) + '.'); return false; }
  if (d && (dayOf(it) !== d || who !== it.who) && load(M, who, d) >= C.DAY_LINES) { toast(dayLabel(d) + ' ist voll (' + C.DAY_LINES + ').'); return false; }
  if (it.who === 'me' && who === 'me') { const x = S.items.find(i => i.id === id); setDay(x, d); }
  else if (it.who === 'you' && who === 'you') out({ id, v: 'day', day: d });
  else if (it.who === 'me') { const x = S.items.find(i => i.id === id); out({ id, v: 'give', item: { ...strip(x), sday: d, where: d === today() ? 'heute' : 'liste' } }); S.items = S.items.filter(i => i !== x); }
  else { out({ id, v: 'take' }); const x = carry(it, { id, text: it.text, where: 'liste', created: it.created || Date.now() }); S.items.push(x); if (d) setDay(x, d); }
  commit(true); return true;
}
function trash(id) {
  if (id.startsWith('r:') || id.startsWith('s:') || id.startsWith('w:')) { toast('Routinen änderst du unter Daheim → Routinen.'); return; }
  { const M0 = model(), h = M0.all.find(i => i.id === id && i.hh); if (h) { moveHH(M0, h, null, null); return; } }
  const M = model(), it = M.all.find(i => i.id === id); if (!it) return;
  if (it.who === 'me') S.items = S.items.filter(i => i.id !== id); else out({ id, v: 'weg' });
  commit(true); toast('Weg: ' + it.text);
}

// ---------- drawing ----------
const wide = () => innerWidth >= 900;
const chip = (i, small) => `<div class="sp-item${i.own ? ' own' : ''}${small ? ' small' : ''}" data-a="spitem" data-id="${esc(i.id)}"><span class="sp-t">${esc(i.text)}</span><span class="sp-m">${flagTags(i)}${small ? '' : `<span class="sp-o">${esc(nameOf(i.who).slice(0, 1))}</span>`}</span></div>`;
function column(M, col) {
  const who = sideOf(col);
  return `<div class="sp-col sp-p" data-col="${col}"><h3>${esc(nameOf(who))}</h3>${days().map(d => {
    const n = load(M, who, d), rts = rtNorm((M.rt[who] || {})[d]), its = eisen(M.all.filter(i => i.who === who && dayOf(i) === d));
    return `<div class="sp-day sp-drop${n >= C.DAY_LINES ? ' full' : ''}" data-who="${who}" data-day="${d}"><div class="sp-dh"><b>${esc(dayLabel(d))}</b><span>${n}/${C.DAY_LINES}</span></div>
      ${(() => { const n = walksOf(M).map(w => [w, walkCount(w, abs(who), d)]).filter(x => x[1] > 0); return n.length ? `<div class="sp-rt">${n.map(([w, k]) => esc(w.t) + ' ×' + k).join(' · ')}</div>` : ''; })()}${rtFix(rts.filter(r => !inStrip(r) && !r.walk))}${rts.filter(r => !r.fix && !inStrip(r) && !r.walk).map(r => rchip(r, d)).join('')}${its.map(i => i.hh ? hchip(i) : chip(i, true)).join('')}</div>`;
  }).join('')}</div>`;
}
function middle(M, withTrash = true) {
  const top = M.liste.filter(i => i.imp || i.urg || i.joy || (i.due && i.due <= addDays(today(), 3))), rest = M.liste.filter(i => !top.includes(i));
  const wait = [...rtNorm(M.rt.me._w).map(r => ({ ...r, who: 'me' })), ...rtNorm(M.rt.you._w).map(r => ({ ...r, who: 'you' }))];
  return `<div class="sp-col sp-mid"><div class="sp-liste sp-drop" data-zone="liste"><h3>Liste <span class="muted">${M.liste.length + wait.length}</span></h3>
    ${wait.length ? `<div class="sp-sep">🔁 Routinen ohne Tag</div>${wait.map(r => rchip(r, '', r.who)).join('')}` : ''}
    ${M.liste.length || wait.length ? '' : '<p class="muted">Alles hat einen Tag. ✨</p>'}${top.map(i => chip(i)).join('')}${top.length && rest.length ? '<div class="sp-sep">Rest</div>' : ''}${rest.map(i => chip(i)).join('')}</div>
    ${withTrash ? '<div class="sp-trash sp-drop" data-zone="trash">🗑 Hierher ziehen = brauchen wir nicht mehr</div>' : ''}</div>`;
}
export function viewSprint() {
  const M = model(), back = `<button class="btn soft back-home" data-a="spback">‹ Zurück</button>`;
  const head = `<div class="sp-head"><h2>🏃 Sprint-Planung</h2><span class="muted">Eure Liste zusammen: ${M.all.length}</span></div>`;
  if (wide()) return `${back}<section class="spboard wide">${head}${stripView(M)}<div class="sp-cols">${column(M, 'J')}${middle(M)}${column(M, 'S')}</div><p class="hint">Ziehen zum Verteilen · Antippen für Merkmale, Wer und Wann.</p></section>`;
  const tab = ui.spTab || 'L', t = (k, l) => `<button class="chip${tab === k ? ' on' : ''}" data-a="sptab" data-v="${k}">${l}</button>`;
  return `${back}<section class="spboard phone">${head}<div class="chips sp-tabs four">${t('H', '🏠')}${t('J', esc(nameOf(sideOf('J'))))}${t('L', 'Liste')}${t('S', esc(nameOf(sideOf('S'))))}</div>
    ${tab === 'H' ? stripView(M) : tab === 'L' ? middle(M, false) : column(M, tab)}<p class="hint">Antippen = Wer, Wann, Merkmale.</p></section>`;
}
export const sprintBtn = () => `<button class="btn wide sprint-btn" data-a="sprintstart">🏃 Sprint-Planung</button>`;

// ---------- 🏃 G45 routines on the board: one occurrence at a time, only within its own person ----------
const rtFix = rts => { const f = rtNorm(rts).filter(r => r.fix); return f.length ? `<div class="sp-rt">${f.map(r => esc(r.t)).join(' · ')}</div>` : ''; };
const rchip = (r, d, who) => `<div class="sp-item small r" data-a="spitem" data-id="r:${esc(r.id)}:${esc(d)}"${who ? ` data-owner="${who}"` : ''}><span class="sp-t">${esc(r.t)}</span><span class="sp-m"><span class="ftag">🔁</span>${who ? `<span class="sp-o">${esc(nameOf(who).slice(0, 1))}</span>` : ''}</span></div>`;
function rOwner(M, cid, from) {
  for (const w of ['me', 'you']) { const list = from ? rtNorm((M.rt[w] || {})[from]) : rtNorm(M.rt[w]._w); if (list.some(r => r.id === cid && !r.fix)) return w; }
  return null;
}
function moveR(id, toWho, d) {
  const [, cid, from] = id.split(':'), M = model(), who = rOwner(M, cid, from || '');
  if (!who) return false;
  const row = from && rtNorm(M.rt[who][from]).find(r => r.id === cid);
  if (row && row.hh && row.asg) {   // 🏠 a planned household one: plan it again (or back into the strip)
    hhUndo({ a: row.asg, id: cid, home: abs(who), who: abs(who) });
    if (d) assign(who, cid, row.due || from, toWho || who, d, row.t); else commit(true);
    return true;
  }
  if (toWho && toWho !== who) { toast('🔁 Routinen bleiben bei ' + nameOf(who) + '.'); return false; }
  if (!d) { toast('🔁 Eine Routine braucht einen Tag.'); return false; }
  if (d === from) return true;
  if (load(M, who, d) >= C.DAY_LINES) { toast(dayLabel(d) + ' ist voll (' + C.DAY_LINES + ').'); return false; }
  if (who === 'me') { const c = S.chores.find(x => x.id === cid); if (!c || !moveRoutine(c, from || today(), d)) return false; }
  else out({ id: cid, v: 'rmove', from: from || null, to: d });
  commit(true); return true;
}
function rsheet(id) {
  const [, cid, from] = id.split(':'), M = model(), who = rOwner(M, cid, from || ''); if (!who) return closeModal();
  const r = (from ? rtNorm(M.rt[who][from]) : rtNorm(M.rt[who]._w)).find(x => x.id === cid);
  modal(`<div class="sp-sheet"><p class="sp-who">${esc(nameOf(who))} · 🔁 Routine</p><p class="psort-t">${esc(r ? r.t : '')}</p>
    <p class="muted" style="margin:0 0 10px">Nur dieses eine Mal verschieben – der Rhythmus läuft danach weiter.</p>
    <div class="sp-days">${days().map(d => { const here = d === from, n = load(M, who, d), full = !here && n >= C.DAY_LINES;
      return `<button class="btn ${here ? '' : 'soft'} sp-dbtn" data-a="spday" data-v="${d}" ${full ? 'disabled' : ''}><b>${esc(dayLabel(d))}</b><small>${n}/${C.DAY_LINES}</small></button>`; }).join('')}</div>
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="close">Fertig</button></p></div>`, '', true);
}

// ---------- 🏠 G46 Haushalt strip (his design 2026-11-28): every household routine occurrence of both phones in the
// next 7 days that nobody planned yet. Drag one onto a person's day = that person does it THIS time (no trace).
// Daily ones (Kochen, Gassi …) can go for the whole week at once (the routine name chip). Nobody planned it → it
// lands with its owner as before. Handed to the other one and not done → due again at home the next day.
// Home phone: c.hh = [{k, due, who, day}] (who = 'stand'|'stefan'). Doer phone: a to-do 'hh-<k>' with it.hh = {k, cid, home, due}.
const abs = r => r === 'me' ? D.me() : D.partner();
const rel = a => a === D.me() ? 'me' : 'you';
const inStrip = r => !!r.hh && !r.asg && !r.done && !!r.id && !r.walk;   // 🐶 walks have their own counter
function stripRows(M) {
  const g = new Map();
  for (const who of ['me', 'you']) for (const d of days()) for (const r of rtNorm((M.rt[who] || {})[d])) if (inStrip(r)) {
    const key = who + ':' + r.id; if (!g.has(key)) g.set(key, { who, id: r.id, t: r.t, daily: !!r.daily, days: [] });
    g.get(key).days.push(d);
  }
  return [...g.values()];
}
const dshort = d => d === today() ? 'heute' : parse(d).toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
// 🗓️ his ask 2026-11-28: a WEEK VIEW (7 day columns, what is up each day); the every-day ones also get one
// "ganze Woche" chip each in the line on top
function stripView(M) {
  const rows = stripRows(M), daily = rows.filter(g => g.daily && g.days.length > 1);
  const occ = (g, d) => `<div class="sp-item small sp-occ${g.daily ? ' daily' : ''}" data-a="spitem" data-id="s:${g.who}:${esc(g.id)}:${d}"><span class="sp-t">${esc(g.t)}</span><span class="sp-m"><span class="sp-o">${esc(nameOf(g.who).slice(0, 1))}</span></span></div>`;
  return `<div class="sp-strip sp-drop" data-zone="strip"><h3>🏠 Haushalt diese Woche</h3>
    ${daily.length ? `<div class="sp-hrow"><span class="sp-hname">Jeden Tag:</span>${daily.map(g => `<div class="sp-item small sp-week" data-a="spitem" data-id="w:${g.who}:${esc(g.id)}"><span class="sp-t">${esc(g.t)}</span><span class="sp-m">ganze Woche</span></div>`).join('')}</div>` : ''}
    ${rows.length ? `<div class="sp-hweek">${days().map(d => { const here = rows.filter(g => g.days.includes(d)).sort((a, b) => a.daily - b.daily);
      return `<div class="sp-hday"><div class="sp-dh"><b>${esc(dayLabel(d))}</b><span>${here.length}</span></div>${walksOf(M).map(w => wchip(w, d)).join('')}${here.map(g => occ(g, d)).join('') || (walksOf(M).length ? '' : '<p class="muted" style="margin:0">–</p>')}</div>`; }).join('')}</div>`
    : '<p class="muted">Alles verteilt. ✨</p>'}
    ${(() => { const xs = [...(M.rt.me._x || []).map(r => ({ ...r, who: 'me' })), ...(M.rt.you._x || []).map(r => ({ ...r, who: 'you' }))].filter(r => !(M.hidX || new Set()).has(r.who + ':' + r.id));
      return xs.length ? `<div class="sp-hrow sp-xrow"><span class="sp-hname">Weitere Routinen:</span>${xs.map(r => `<div class="sp-item small sp-occ" data-a="spitem" data-id="x:${r.who}:${esc(r.id)}:${esc(r.next || '')}"><span class="sp-t">${esc(r.t)}</span><span class="sp-m"><span class="sp-o">${esc(nameOf(r.who).slice(0, 1))}</span></span></div>`).join('')}</div>` : ''; })()}</div>`;
}
const hchip = i => `<div class="sp-item small r hhi" data-a="spitem" data-id="${esc(i.id)}"><span class="sp-t">${esc(i.text)}</span><span class="sp-m"><span class="ftag">🏠</span></span></div>`;
function assign(home, cid, due, to, day, t) {   // home/to relative ('me'|'you')
  const e = { v: 'hh', a: uid(), id: cid, home: abs(home), who: abs(to), due, day, t };
  applyHH(e); out(e); commit(true); return true;
}
function hhUndo(e) { const x = { v: 'hhx', a: e.a, id: e.id, home: e.home, who: e.who }; applyHHX(x); out(x); }   // own sprint key k (out), the hand-over key a
export function applyHH(e) {
  const me = D.me();
  if (e.home === me) {
    const c = S.chores.find(x => x.id === e.id); if (!c) return;
    c.hh = (c.hh || []).filter(a => a.due !== e.due && a.k !== e.a).concat([{ k: e.a, due: e.due, who: e.who, day: e.day }]);
    if (e.who === me) { if (e.day !== e.due) moveRoutine(c, e.due, e.day); }
    else { if (c.moved && c.moved.pin) c.moved = null; if (e.due <= today() && today() <= e.day) S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute')); }
  }
  if (e.who === me && e.home !== me && !S.items.some(i => i.id === 'hh-' + e.a)) {
    const x = { id: 'hh-' + e.a, text: e.t || 'Haushalt', where: 'liste', created: Date.now(), hh: { k: e.a, cid: e.id, home: e.home, due: e.due } };
    S.items.push(x); setDay(x, e.day);
  }
}
export function applyHHX(e) {
  const me = D.me();
  if (e.home === me) { const c = S.chores.find(x => x.id === e.id); if (c && c.hh) { c.hh = c.hh.filter(a => a.k !== e.a); if (!c.hh.length) delete c.hh; } }
  if (e.who === me) S.items = S.items.filter(i => i.id !== 'hh-' + e.a);
}
function rowOf(M, who, cid, d) { return rtNorm((M.rt[who] || {})[d]).find(r => r.id === cid); }
function moveS(id, toWho, d) {   // a strip chip (one day 's:' or the whole week 'w:') dropped somewhere
  const p = id.split(':'), home = p[1], cid = p[2];
  if (!d) return false;   // dropped on the Liste / strip: stays unplanned
  const M = model(), to = toWho || home;
  if (id.startsWith('w:')) return weekTo(home, cid, to);
  const r = rowOf(M, home, cid, p[3]); if (!r) return false;
  const due = r.due || p[3];
  if (load(M, to, d) - (to === home && d === due ? 1 : 0) >= C.DAY_LINES && !(to === home && d === due)) { toast(dayLabel(d) + ' ist voll (' + C.DAY_LINES + ').'); return false; }
  return assign(home, cid, due, to, d, r.t);
}
function moveX(id, toWho, d) {   // a routine not due this week, planned anyway
  const [, home, cid, next] = id.split(':'); if (!d) return false;
  const M = model(), to = toWho || home, r = [...(M.rt[home]._x || [])].find(x => x.id === cid); if (!r) return false;
  if (load(M, to, d) >= C.DAY_LINES) { toast(dayLabel(d) + ' ist voll (' + C.DAY_LINES + ').'); return false; }
  return assign(home, cid, next || d, to, d, r.t);
}
function weekTo(home, cid, to) {   // a daily household routine: the whole week to one person, each on its own day
  const M = model(), g = stripRows(M).find(x => x.who === home && x.id === cid); if (!g) return false;
  let n = 0;
  for (const d of g.days) { if (to !== home && load(M, to, d) >= C.DAY_LINES) continue; const e = { v: 'hh', a: uid(), id: cid, home: abs(home), who: abs(to), due: d, day: d, t: g.t }; applyHH(e); out(e); n++; }
  commit(true);
  if (n < g.days.length) toast(`${n} von ${g.days.length} Tagen – die vollen Tage bleiben oben.`);
  return n > 0;
}
function moveHH(M, it, toWho, d) {   // a hand-over line on the doer's side, moved again (or back into the strip)
  const h = it.hh, who = toWho || it.who;
  hhUndo({ a: h.k, id: h.cid, home: h.home, who: abs(it.who) });
  if (d) assign(rel(h.home), h.cid, h.due, who, d, it.text); else commit(true);
  return true;
}
function hsheet(id, item, xid) {
  const p = id.split(':'), home = p[1], cid = p[2], due = p[3], M = model();
  ui.spItem = xid || id; ui.spHH = item ? item.id : null;
  const r = xid ? (M.rt[home]._x || []).find(x => x.id === cid) : due ? rowOf(M, home, cid, due) : null, g = stripRows(M).find(x => x.who === home && x.id === cid);
  const name = item ? item.text : r ? r.t : g ? g.t : '';
  const who = ui.spWho || (item ? item.who : home), daily = (r && r.daily) || (g && g.daily) || id.startsWith('w:');
  const whoBtn = w => `<button class="btn wide ${who === w ? '' : 'soft'}" data-a="spwho" data-v="${w}">${esc(nameOf(w))}</button>`;
  modal(`<div class="sp-sheet"><p class="sp-who">🏠 Haushalt${due ? ' · fällig ' + esc(dayLabel(due)) : ''}</p><p class="psort-t">${esc(name)}</p>
    <p class="muted" style="margin:0 0 8px">Wer macht es dieses Mal?</p>
    <div class="sp-whos">${whoBtn(julia())}${whoBtn(julia() === 'me' ? 'you' : 'me')}</div>
    ${id.startsWith('w:') ? '' : `<div class="sp-days">${days().map(d => { const n = load(M, who, d), full = n >= C.DAY_LINES && !(d === due && who === home);
      return `<button class="btn soft sp-dbtn" data-a="spday" data-v="${d}" ${full ? 'disabled' : ''}><b>${esc(dayLabel(d))}</b><small>${n}/${C.DAY_LINES}</small></button>`; }).join('')}</div>`}
    ${daily && g && g.days.length > 1 ? `<div class="sp-whos">${['me', 'you'].map(w => `<button class="btn soft wide" data-a="spweek" data-v="${w}">Ganze Woche: ${esc(nameOf(w))}</button>`).join('')}</div>` : ''}
    ${item || (r && r.asg) ? '<button class="btn soft wide" data-a="sphhback">Zurück in den Haushalt</button>' : ''}
    ${item ? '' : `<button class="btn soft wide" data-a="spown">🙋 Eigene Routine von ${esc(nameOf(home))}</button>`}
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="close">Fertig</button></p></div>`, '', true);
}

// ---------- 🐶 Gassi walks on the board: a counter per day "J 1 · S 2"; tap = steppers for that day or the whole week ----------
function walksOf(M) {   // [{id, t, per, day, home}] for both phones, my pending changes laid on top
  if (M._walks) return M._walks;
  const mine = walksPost().map(w => ({ ...w, home: 'me' })), theirs = (S.partnerWalks || []).map(w => ({ ...w, day: { ...(w.day || {}) }, home: 'you' }));
  for (const e of pending()) if (e.v === 'walks') { const w = theirs.find(x => x.id === e.id); if (w) for (const d of e.days || []) w.day[d] = { stand: walkCount(w, 'stand', d), stefan: walkCount(w, 'stefan', d), ...(e.n || {}) }; }
  return (M._walks = [...mine, ...theirs]);
}
const wchip = (w, d) => `<div class="sp-item small sp-walk" data-a="spitem" data-id="g:${w.home}:${esc(w.id)}:${d}"><span class="sp-t">${esc(w.t)}</span><span class="sp-m">${['stand', 'stefan'].map(p => `<span class="sp-o">${esc(nameOf(rel(p)).slice(0, 1))} ${walkCount(w, p, d)}</span>`).join('')}</span></div>`;
function wsheet(id) {
  const [, home, cid, d] = id.split(':'), M = model(), w = walksOf(M).find(x => x.id === cid && x.home === home); if (!w) return closeModal();
  ui.spItem = id;
  const row = p => `<div class="sp-wrow"><b>${esc(nameOf(rel(p)))}</b><button class="btn soft" data-a="spwalk" data-p="${p}" data-v="-1" aria-label="weniger">−</button><span class="sp-wn">${walkCount(w, p, d)}</span><button class="btn soft" data-a="spwalk" data-p="${p}" data-v="1" aria-label="mehr">+</button></div>`;
  modal(`<div class="sp-sheet"><p class="sp-who">🐶 ${esc(dayLabel(d))}</p><p class="psort-t">${esc(w.t)}</p>${row(julia() === 'me' ? D.me() : D.partner())}${row(julia() === 'me' ? D.partner() : D.me())}
    <button class="btn soft wide" data-a="spwalkweek">So für die ganze Woche</button>
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="close">Fertig</button></p></div>`, '', true);
}
function walkSet(cid, home, ds, n) {
  if (home === 'me') { const c = S.chores.find(x => x.id === cid); if (c) setWalks(c, ds, n); }
  else out({ id: cid, v: 'walks', days: ds, n });
  commit(true);
}

// the sheet (phone + tap on the board): who → which day / Liste / 🗑 / Merkmale
function sheet(id) {
  const M = model(), it = M.all.find(i => i.id === id); if (!it) return closeModal();
  const who = ui.spWho || it.who, cur = dayOf(it);
  const whoBtn = w => `<button class="btn wide ${who === w ? '' : 'soft'}" data-a="spwho" data-v="${w}" ${it.own && w !== it.who ? 'disabled' : ''}>${esc(nameOf(w))}${it.own && w !== it.who ? ' · 🙋 nur ' + esc(nameOf(it.who)) : ''}</button>`;
  modal(`<div class="sp-sheet"><p class="sp-who">${esc(nameOf(it.who))}</p><p class="psort-t">${esc(it.text)}</p><p class="sp-flags">${flagTags(it) || '<span class="muted">kein Merkmal</span>'} <button class="sc-undo" data-a="spflags">Merkmale ändern</button></p>
    <div class="sp-whos">${whoBtn(julia())}${whoBtn(julia() === 'me' ? 'you' : 'me')}</div>
    <div class="sp-days">${days().map(d => { const here = who === it.who && cur === d, n = load(M, who, d) - (here ? 1 : 0), full = n >= C.DAY_LINES;
      return `<button class="btn ${here ? '' : 'soft'} sp-dbtn" data-a="spday" data-v="${d}" ${full ? 'disabled' : ''}><b>${esc(dayLabel(d))}</b><small>${n}/${C.DAY_LINES}</small></button>`; }).join('')}</div>
    <button class="btn soft wide" data-a="spday" data-v="">Zurück in die Liste</button>
    <button class="btn soft wide" data-a="sptrash">🗑 Brauchen wir nicht mehr</button>
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="close">Fertig</button></p></div>`, '', true);
}

// ---------- drag & drop (pointer events; on touch: hold still a moment, then drag) ----------
let drag = null, dragEnd = 0, press = null;
function startDrag(x, y, item) {
  const r = item.getBoundingClientRect(), g = item.cloneNode(true);
  g.classList.add('sp-ghost'); g.style.width = r.width + 'px'; document.body.appendChild(g);
  drag = { id: item.dataset.id, g, dx: x - r.left, dy: y - r.top, src: item };
  item.classList.add('dragging'); moveGhost(x, y);
}
function moveGhost(x, y) {
  if (!drag) return; drag.g.style.transform = `translate(${x - drag.dx}px, ${y - drag.dy}px)`;
  document.querySelectorAll('.sp-drop.over').forEach(z => z.classList.remove('over'));
  const el = document.elementFromPoint(x, y), z = el && el.closest('.sp-drop'); if (z) z.classList.add('over');
}
function endDrag(x, y) {
  const d = drag; drag = null; if (!d) return;
  d.g.remove(); d.src.classList.remove('dragging'); document.querySelectorAll('.sp-drop.over').forEach(z => z.classList.remove('over'));
  dragEnd = Date.now();
  const el = document.elementFromPoint(x, y), z = el && el.closest('.sp-drop'); if (!z) return;
  if (z.dataset.zone === 'trash') trash(d.id);
  else if (z.dataset.zone === 'liste' || z.dataset.zone === 'strip') move(d.id, null, null);
  else move(d.id, z.dataset.who, z.dataset.day);
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => {
    const item = e.target.closest('.spboard.wide .sp-item'); if (!item || e.button > 0) return;
    press = { item, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', timer: null };
    if (press.touch) press.timer = setTimeout(() => { if (press) { startDrag(press.x, press.y, press.item); press = null; if (navigator.vibrate) navigator.vibrate(15); } }, 220);
  });
  document.addEventListener('pointermove', e => {
    if (drag) { moveGhost(e.clientX, e.clientY); return; }
    if (!press) return;
    const far = Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 8;
    if (far && !press.touch) { startDrag(press.x, press.y, press.item); press = null; moveGhost(e.clientX, e.clientY); }
    else if (far) { clearTimeout(press.timer); press = null; }   // a swipe before the hold = scrolling
  });
  document.addEventListener('pointerup', e => { if (press) { clearTimeout(press.timer); press = null; } if (drag) endDrag(e.clientX, e.clientY); });
  document.addEventListener('pointercancel', () => { if (press) { clearTimeout(press.timer); press = null; } if (drag) { drag.g.remove(); drag.src.classList.remove('dragging'); drag = null; } });
  document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
}

Object.assign(A, {
  sprintstart() { ui.tab = 'heute'; ui.htab = 'sprint'; ui.spOpen = true; ui.sub = null; ui.spTab = 'L'; render(); scrollTo(0, 0); },
  spback() { ui.tab = 'heute'; ui.htab = 'sprint'; ui.spOpen = false; ui.fsTab = 'woche'; render(); scrollTo(0, 0); },
  sptab(el) { ui.spTab = el.dataset.v; render(); },
  spitem(el) { if (Date.now() - dragEnd < 400) return; ui.spItem = el.dataset.id; ui.spWho = null; const id = ui.spItem;
    if (id.startsWith('s:') || id.startsWith('w:')) return hsheet(id);
    if (id.startsWith('g:')) return wsheet(id);
    if (id.startsWith('x:')) { const p = id.split(':'); return hsheet('s:' + p[1] + ':' + p[2] + ':' + (p[3] || today()), null, id); }
    if (id.startsWith('r:')) { const [, cid, from] = id.split(':'), M = model(), w = rOwner(M, cid, from || ''), row = w && from && rtNorm(M.rt[w][from]).find(r => r.id === cid); return row && row.hh ? hsheet('s:' + w + ':' + cid + ':' + from) : rsheet(id); }
    const it = model().all.find(i => i.id === id); if (it && it.hh) return hsheet('s:' + rel(it.hh.home) + ':' + it.hh.cid + ':' + it.hh.due, it); sheet(id); },
  spown() { const [, w, cid] = ui.spItem.split(':'); if (w === 'me') { const c = S.chores.find(x => x.id === cid); if (c) c.kind = 'eigen'; } else out({ id: cid, v: 'rkind', kind: 'eigen' }); commit(true); closeModal(); render(); toast('🙋 Gehört jetzt zu ' + nameOf(w) + '.'); },
  spwalk(el) {
    const [, home, cid, d] = ui.spItem.split(':'), M = model(), w = walksOf(M).find(x => x.id === cid && x.home === home); if (!w) return;
    const p = el.dataset.p, n = Math.max(0, Math.min(5, walkCount(w, p, d) + (+el.dataset.v)));
    walkSet(cid, home, [d], { stand: walkCount(w, 'stand', d), stefan: walkCount(w, 'stefan', d), [p]: n }); wsheet(ui.spItem);
  },
  spwalkweek() {
    const [, home, cid, d] = ui.spItem.split(':'), M = model(), w = walksOf(M).find(x => x.id === cid && x.home === home); if (!w) return;
    walkSet(cid, home, days(), { stand: walkCount(w, 'stand', d), stefan: walkCount(w, 'stefan', d) }); closeModal(); render(); toast('🐶 So für die ganze Woche.');
  },
  spweek(el) { const [, w, cid] = ui.spItem.split(':'); if (weekTo(w, cid, el.dataset.v)) { closeModal(); render(); } },
  sphhback() {
    const M = model(), it = ui.spHH && M.all.find(i => i.id === ui.spHH);
    if (it) moveHH(M, it, null, null);
    else { const [, w, cid, due] = ui.spItem.split(':'), r = due && rtNorm((M.rt[w] || {})[due]).find(x => x.id === cid); if (r && r.asg) { hhUndo({ a: r.asg, id: cid, home: abs(w), who: abs(w) }); commit(true); } }
    ui.spHH = null; closeModal(); render();
  },
  spwho(el) { ui.spWho = el.dataset.v; sheet(ui.spItem); },
  spday(el) { const id = ui.spHH || ui.spItem; if (move(id, ui.spWho, el.dataset.v || null)) { ui.spHH = null; closeModal(); render(); } },
  sptrash() { trash(ui.spItem); closeModal(); render(); },
  spflags() {
    const M = model(), it = M.all.find(i => i.id === ui.spItem); if (!it) return;
    askFlags(it, { whose: nameOf(it.who), skip: 'Abbrechen', done: f => {
      if (f) { if (it.who === 'me') { const x = S.items.find(i => i.id === it.id); if (x) setFlags(x, f); } else out({ id: it.id, v: 'flags', f }); commit(true); }
      sheet(ui.spItem);
    } });
  },
});
export const _move = move;   // test hook: the same move as a drop
