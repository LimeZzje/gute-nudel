// 🏃 G42 Sprint-Planung (his picks 2026-11-28): once a week at the table, one phone, card by card through BOTH open
// lists (mixed, oldest first): Diese Woche / Diesen Monat / Irgendwann / → the other / Weg. Decided together, so an
// item that changes hands leaves NO trace (no "übernommen", no request/accept, no note where it came from).
// Only the team total is shown, never a count per person.
// Wire: each phone posts its open list (post.open) and the decisions it made on the partner's items or gave away
// (post.sprint = [{k, id, v, ts, item?}], kept 14 days). The partner phone applies each k once (S.sprintSeen).
//   v 'woche'|'monat'|'spaeter' = pile for the partner's item · 'weg' = the partner's item is gone
//   'take' = I took the partner's item (they drop it) · 'give' = I gave my item (they add `item`)
import { closeModal, commit, esc, modal, monday, today, toast, uid } from './core.js';
import { A, S, ui } from './state.js';
import { setPile } from './piles.js';
import { pn } from './sync.js';
import { render } from './app.js';

const KEEP = 14 * 864e5, PILES = ['woche', 'monat', 'spaeter'];
const mineOpen = () => S.items.filter(i => i.where === 'liste' && !i.chore);
const strip = i => ({ id: i.id, text: String(i.text || '').slice(0, 160), pile: i.pile || null, due: i.due || null, heavy: !!i.heavy, joy: !!i.joy, created: i.created || 0 });
const pending = () => (S.sprintOut || []).filter(e => Date.now() - e.ts < KEEP);

// what travels
export const sprintPost = () => ({ open: mineOpen().slice(0, 200).map(strip), sprint: pending() });
// the partner's open list as I see it: their post, with my decisions not yet applied over there laid on top
export function partnerOpen() {
  const gone = new Set(), pile = {};
  for (const e of pending()) { if (e.v === 'weg' || e.v === 'take') gone.add(e.id); else if (PILES.includes(e.v)) pile[e.id] = e.v; }
  return (S.partnerOpen || []).filter(i => !gone.has(i.id) && !S.items.some(x => x.id === i.id)).map(i => pile[i.id] ? { ...i, pile: pile[i.id] } : i);
}
export function sprintReceive(p) {
  let ch = false;
  if (p.open && JSON.stringify(p.open) !== JSON.stringify(S.partnerOpen || null)) { S.partnerOpen = p.open; ch = true; }
  const seen = new Set(S.sprintSeen || []);
  for (const e of p.sprint || []) {
    if (!e || !e.k || seen.has(e.k)) continue;
    seen.add(e.k); ch = true;
    const it = S.items.find(i => i.id === e.id && !i.chore);
    if (PILES.includes(e.v)) { if (it) setPile(it, e.v); }
    else if (e.v === 'weg' || e.v === 'take') { if (it) S.items = S.items.filter(i => i !== it); }
    else if (e.v === 'give' && e.item && !S.items.some(i => i.id === e.item.id)) {
      const x = { id: e.item.id, text: e.item.text, where: 'liste', created: e.item.created || Date.now() };
      if (e.item.pile) { x.pile = e.item.pile; x.pileTs = Date.now(); }
      if (e.item.due) x.due = e.item.due; if (e.item.heavy) x.heavy = true; if (e.item.joy) x.joy = true;
      S.items.push(x);
    }
  }
  if (ch) S.sprintSeen = [...seen].slice(-400);
  return ch;
}
const teamTotal = () => { const po = partnerOpen(); return mineOpen().length + po.length + pending().filter(e => e.v === 'give' && !po.some(i => i.id === e.id)).length; };   // a gift still on its way counts

// ---------- the session ----------
export const sprintBtn = () => `<button class="btn wide sprint-btn${S.sprintWk === monday(today()) ? ' soft' : ''}" data-a="sprintstart">🏃 Sprint-Planung${S.sprintWk === monday(today()) ? ' <span class="muted">· diese Woche schon gemacht</span>' : ''}</button>`;
function queue() {
  const done = new Set(ui.sprint.done);
  const a = mineOpen().map(i => ({ id: i.id, mine: true, created: i.created || 0 })), b = partnerOpen().map(i => ({ id: i.id, mine: false, created: i.created || 0 }));
  return [...a, ...b].filter(x => !done.has(x.id)).sort((x, y) => x.created - y.created);
}
function step() {
  const q = queue();
  if (!q.length) return finish();
  const x = q[0], it = x.mine ? S.items.find(i => i.id === x.id) : partnerOpen().find(i => i.id === x.id);
  const owner = x.mine ? (S.name || 'Ich') : pn(), other = x.mine ? pn() : (S.name || 'mich');
  const btn = (v, l, cls = '') => `<button class="btn ${cls} wide" data-a="sprintdo" data-v="${v}">${l}</button>`;
  modal(`<div class="psort sprint"><p class="muted" style="margin:0">🏃 Sprint-Planung · noch ${q.length}</p>
    <p class="sp-who">${esc(owner)}</p><p class="psort-t">${esc(it.text)}</p>
    ${btn('woche', 'Diese Woche')}${btn('monat', 'Diesen Monat', 'blue')}${btn('spaeter', 'Irgendwann', 'soft')}
    ${btn('move', '→ ' + esc(other), 'soft')}${btn('weg', 'Brauchen wir nicht mehr', 'soft')}
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="sprintstop">Pause – später weiter</button></p></div>`);
}
function finish() {
  const n0 = ui.sprint.n0, n = teamTotal();
  S.sprintWk = monday(today()); S.sprintRun = null; ui.sprint = null; closeModal(); commit(true);
  toast(n < n0 ? `Eure Liste zusammen: ${n0} → ${n} ✨` : 'Alles durchgesprochen. ✨');
}
const out = e => { S.sprintOut = pending().concat([{ k: uid(), ts: Date.now(), ...e }]); };

Object.assign(A, {
  sprintstart() {   // a paused session of this week goes on where it stopped (S.sprintRun survives a reload)
    const wk = monday(today()), r = S.sprintRun && S.sprintRun.wk === wk && S.sprintWk !== wk ? S.sprintRun : { wk, done: [], n0: teamTotal() };
    S.sprintRun = r; ui.sprint = r; step();
  },
  sprintstop() { ui.sprint = null; closeModal(); render(); },
  sprintdo(el) {
    const x = ui.sprint && queue()[0]; if (!x) return;
    const v = el.dataset.v;
    if (x.mine) {
      const it = S.items.find(i => i.id === x.id); if (!it) return;
      if (PILES.includes(v)) setPile(it, v);
      else if (v === 'weg') S.items = S.items.filter(i => i !== it);
      else if (v === 'move') { out({ id: it.id, v: 'give', item: strip(it) }); S.items = S.items.filter(i => i !== it); }
    } else {
      const it = partnerOpen().find(i => i.id === x.id); if (!it) return;
      if (PILES.includes(v) || v === 'weg') out({ id: it.id, v });
      else if (v === 'move') {
        out({ id: it.id, v: 'take' });
        const y = { id: it.id, text: it.text, where: 'liste', created: it.created || Date.now() };
        if (it.pile) { y.pile = it.pile; y.pileTs = Date.now(); }
        if (it.due) y.due = it.due; if (it.heavy) y.heavy = true; if (it.joy) y.joy = true;
        S.items.push(y);
      }
    }
    ui.sprint.done.push(x.id);
    commit(true); step();
  },
});
