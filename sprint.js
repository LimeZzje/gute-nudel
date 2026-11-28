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
import { planAhead } from './chores.js';

const KEEP = 14 * 864e5, DAYS = 7;
const mineOpen = () => S.items.filter(i => !i.chore && (i.where === 'liste' || i.where === 'heute'));
const strip = i => ({ id: i.id, text: String(i.text || '').slice(0, 160), where: i.where, sday: i.sday || null, pile: i.pile || null, due: i.due || null, heavy: !!i.heavy, joy: !!i.joy, own: !!i.own, imp: !!i.imp, urg: !!i.urg, flagged: !!i.flagged, created: i.created || 0 });
const carry = (from, to) => { for (const k of ['due', 'heavy', 'joy', 'imp', 'urg', 'flagged', 'pile']) if (from[k]) to[k] = from[k]; return to; };
const pending = () => (S.sprintOut || []).filter(e => Date.now() - e.ts < KEEP);
const days = () => Array.from({ length: DAYS }, (_, n) => addDays(today(), n));
// my routines per day (today = what is really on the page or done), for the greyed lines + the load
function myRoutines() {
  const t = today(), plan = planAhead(addDays(t, DAYS - 1)), out = {};
  for (const d of days()) out[d] = (plan[d] || []).filter(x => x.c).map(x => x.c.icon + ' ' + x.c.name);
  return out;
}

// ---------- what travels ----------
export const sprintPost = () => {
  let rt = {}; try { rt = myRoutines(); } catch (e) {}
  return { open: mineOpen().slice(0, 250).map(strip), rt, sprint: pending() };
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
  const seen = new Set(S.sprintSeen || []);
  for (const e of p.sprint || []) {
    if (!e || !e.k || seen.has(e.k)) continue;
    seen.add(e.k); ch = true;
    const it = S.items.find(i => i.id === e.id && !i.chore);
    if (e.v === 'day') { if (it) setDay(it, e.day && e.day >= today() ? e.day : null); }
    else if (e.v === 'flags' && e.f) { if (it) setFlags(it, e.f); }
    else if (e.v === 'weg' || e.v === 'take') { if (it) S.items = S.items.filter(i => i !== it); }
    else if (e.v === 'give' && e.item && !S.items.some(i => i.id === e.item.id)) {
      const x = carry(e.item, { id: e.item.id, text: e.item.text, where: 'liste', created: e.item.created || Date.now() });
      S.items.push(x);
      if (e.item.sday && e.item.sday >= today()) setDay(x, e.item.sday);
    }
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
  const rt = { me: mine, you: S.partnerRt || {} };
  return { all, rt, liste: eisen(all.filter(i => !dayOf(i)).sort((a, b) => (a.created || 0) - (b.created || 0))) };
}
const load = (M, who, d) => ((M.rt[who] || {})[d] || []).length + M.all.filter(i => i.who === who && dayOf(i) === d).length;
const dayLabel = d => d === today() ? 'Heute' : parse(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });

// ---------- moving (one place for drag, phone sheet and trash) ----------
function move(id, toWho, d) {   // toWho 'me'|'you'|null (= stays with the owner), d = day or null (Liste)
  const M = model(), it = M.all.find(i => i.id === id); if (!it) return false;
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
    const n = load(M, who, d), rts = (M.rt[who] || {})[d] || [], its = eisen(M.all.filter(i => i.who === who && dayOf(i) === d));
    return `<div class="sp-day sp-drop${n >= C.DAY_LINES ? ' full' : ''}" data-who="${who}" data-day="${d}"><div class="sp-dh"><b>${esc(dayLabel(d))}</b><span>${n}/${C.DAY_LINES}</span></div>
      ${rts.length ? `<div class="sp-rt">${rts.map(r => esc(r)).join(' · ')}</div>` : ''}${its.map(i => chip(i, true)).join('')}</div>`;
  }).join('')}</div>`;
}
function middle(M, withTrash = true) {
  const top = M.liste.filter(i => i.imp || i.urg || i.joy || (i.due && i.due <= addDays(today(), 3))), rest = M.liste.filter(i => !top.includes(i));
  return `<div class="sp-col sp-mid"><div class="sp-liste sp-drop" data-zone="liste"><h3>Liste <span class="muted">${M.liste.length}</span></h3>
    ${M.liste.length ? '' : '<p class="muted">Alles hat einen Tag. ✨</p>'}${top.map(i => chip(i)).join('')}${top.length && rest.length ? '<div class="sp-sep">Rest</div>' : ''}${rest.map(i => chip(i)).join('')}</div>
    ${withTrash ? '<div class="sp-trash sp-drop" data-zone="trash">🗑 Hierher ziehen = brauchen wir nicht mehr</div>' : ''}</div>`;
}
export function viewSprint() {
  const M = model(), back = `<button class="btn soft back-home" data-a="spback">‹ Zurück</button>`;
  const head = `<div class="sp-head"><h2>🏃 Sprint-Planung</h2><span class="muted">Eure Liste zusammen: ${M.all.length}</span></div>`;
  if (wide()) return `${back}<section class="spboard wide">${head}<div class="sp-cols">${column(M, 'J')}${middle(M)}${column(M, 'S')}</div><p class="hint">Ziehen zum Verteilen · Antippen für Merkmale, Wer und Wann.</p></section>`;
  const tab = ui.spTab || 'L', t = (k, l) => `<button class="chip${tab === k ? ' on' : ''}" data-a="sptab" data-v="${k}">${l}</button>`;
  return `${back}<section class="spboard phone">${head}<div class="chips sp-tabs">${t('J', esc(nameOf(sideOf('J'))))}${t('L', 'Liste')}${t('S', esc(nameOf(sideOf('S'))))}</div>
    ${tab === 'L' ? middle(M, false) : column(M, tab)}<p class="hint">Antippen = Wer, Wann, Merkmale.</p></section>`;
}
export const sprintBtn = () => `<button class="btn wide sprint-btn" data-a="sprintstart">🏃 Sprint-Planung</button>`;

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
  else if (z.dataset.zone === 'liste') move(d.id, null, null);
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
  spitem(el) { if (Date.now() - dragEnd < 400) return; ui.spItem = el.dataset.id; ui.spWho = null; sheet(ui.spItem); },
  spwho(el) { ui.spWho = el.dataset.v; sheet(ui.spItem); },
  spday(el) { if (move(ui.spItem, ui.spWho, el.dataset.v || null)) { closeModal(); render(); } },
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
