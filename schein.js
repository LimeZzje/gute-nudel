// 🟡 G32 Gelber Schein: one tap covers today. Ticked things stay, open to-dos go back to the list (unmarked), routines
// slide to the next day under the ceiling, nothing new lands today. No stars, no count, no conclusions. The partner sees
// one quiet line on Home (no message). Data: S.scheine = [{id: 'YYYY-MM-DD', ts}], undo snapshot in S.today.schein.
import * as Car from './car.js';
import { addDays, closeModal, commit, dayDone, esc, modal, scheinOn, toast, today, workToday } from './core.js';
import { A, S } from './state.js';
import { choreDue, isDaily, planAhead, slide, slidUncount } from './chores.js';
import { carAll, carDay, carTime, carToday, forMe, isCar, shared } from './termine.js';
import { pn } from './sync.js';
import { render } from './app.js';

export const SCHEIN_KEEP = 120;

// the quiet button at the bottom of Heute (not on a finished day, not while one is on)
export const scheinBtn = () => scheinOn() || dayDone() ? '' : `<button class="btn soft wide schein-btn" data-a="schein">🟡 Gelber Schein – heute Pause</button>`;

// ☀ what must not get lost on a Schein day: today's appointments that concern me + to-dos due exactly today
function todayFixed() {
  const t = today(), now = Car.localISO(new Date());
  const terms = carAll(Car.live, false).filter(b => shared(b) && forMe(b) && !isCar(b) && carDay(b.start) <= t && carDay(b.end) >= t && b.end > now);
  const due = S.items.filter(i => !i.chore && i.due === t);
  return { terms, due };
}

export const todayTerms = () => todayFixed().terms;   // (G36: a day with an appointment gets one to-do fewer)

export function viewSchein() {
  const t = today(), tm = addDays(t, 1), done = workToday(), { terms, due } = todayFixed();
  let h = `<div class="card schein-card"><div class="sc-k">🟡 Gelber Schein</div><h2>Heute ist Pause.</h2>
    <p>Alles Offene ist zugedeckt und geht nicht verloren. Ausruhen ist heute deine Aufgabe.</p></div>`;
  h += carToday();
  if (terms.length) h += `<div class="card"><h3>📅 Heute fest</h3>${terms.map(b => `<p class="sc-term"><b>${esc(carDay(b.start) < t ? 'ganztags' : carTime(b.start))}</b> · ${esc(b.note || 'Termin')}</p>`).join('')}</div>`;
  if (due.length) h += `<p class="muted sc-due">📌 Heute fällig: ${due.map(i => esc(i.text)).join(' · ')}</p>`;
  const plan = (planAhead(tm)[tm] || []).filter(x => x.c), rt = plan.filter(x => !x.daily), dl = plan.filter(x => x.daily);
  h += `<div class="card sc-tm"><h3>Morgen bleibt machbar</h3>${rt.length ? `<p>${rt.map(x => esc(x.c.icon) + ' ' + esc(x.c.name)).join('<br>')}</p>` : '<p class="muted">Keine Routinen – frei. 🛋️</p>'}
    ${dl.length ? `<p class="muted" style="margin:6px 0 0">Dazu wie jeden Tag: ${dl.map(x => esc(x.c.icon)).join(' ')}</p>` : ''}</div>`;
  h += `<button class="btn wide" data-a="go" data-tab="ruhe" data-q="relax">🛋️ Etwas zum Entspannen</button>`;
  if (done.length) h += `<div class="donebox"><div class="muted" style="margin:14px 0 4px;font-weight:800">Heute schon geschafft (${done.length})</div>${done.slice().reverse().map(e => `<div class="item done"><span class="chk">✓</span><div class="txt"><span>${esc(e.text)}</span></div></div>`).join('')}</div>`;
  if (S.today.schein) h += `<p style="text-align:center;margin-top:18px"><button class="sc-undo" data-a="scheinundo">Doch kein Schein</button></p>`;
  return `<section class="pad">${h}</section>`;
}

// Home on a Schein day: a small yellow card instead of the ring
export const scheinHome = () => `<button class="card hcard schein-home" data-a="go" data-tab="heute"><span class="hc-txt"><b>🟡 Gelber Schein · heute ist Pause</b></span><span class="hc-go">›</span></button>`;
// the partner's phone: one quiet line while it is today
export const partnerScheinLine = () => S.partnerSchein && S.partnerSchein === today() ? `<p class="muted schein-partner">🟡 ${esc(pn())} hat heute einen Gelben Schein.</p>` : '';

export function takeSchein() {
  const d = today(); if (scheinOn(d)) return;
  const snap = { items: [], list: [], moved: {} };
  for (const i of S.items.filter(x => x.where === 'heute')) {
    if (i.chore) snap.items.push(JSON.parse(JSON.stringify(i)));
    else { snap.list.push({ id: i.id, carried: !!i.carried }); i.where = 'liste'; i.carried = false; }
  }
  S.items = S.items.filter(i => !(i.chore && i.where === 'heute'));
  for (const c of S.chores) {   // weekday routines of today try again tomorrow under the ceiling; "alle N Tage" just stay due
    if (isDaily(c) || !(c.week && c.week.length) || !choreDue(c, d) || S.log.some(e => e.day === d && e.chore === c.id)) continue;
    snap.moved[c.id] = c.moved ? Object.assign({}, c.moved) : null; slide(c, d);
  }
  S.chores.forEach(c => slidUncount(c, d));   // 🐢 G34: a Schein day never counts as "found no place"
  S.scheine = (S.scheine || []).filter(x => x.id !== d).concat([{ id: d, ts: Date.now() }]).slice(-SCHEIN_KEEP);
  S.today.schein = snap;
  commit(true);
}
export function undoSchein() {
  const d = today(), snap = S.today.schein;
  S.scheine = (S.scheine || []).filter(x => x.id !== d);
  if (snap) {
    for (const x of snap.list) { const i = S.items.find(y => y.id === x.id); if (i) { i.where = 'heute'; i.carried = x.carried; } }
    for (const it of snap.items) if (!S.items.some(i => i.id === it.id || (i.chore === it.chore && i.where === 'heute'))) S.items.push(it);
    for (const [cid, m] of Object.entries(snap.moved)) { const c = S.chores.find(x => x.id === cid); if (c) c.moved = m; }
  }
  delete S.today.schein;
  commit(true);
}

Object.assign(A, {
  schein() {
    modal(`<h2>🟡 Gelber Schein</h2><p>Heute ist Pause. Alles Offene wird zugedeckt und geht nicht verloren. Was du schon abgehakt hast, bleibt.</p>
      <div class="row"><button class="btn" data-a="scheinyes">Ja, heute Pause</button><button class="btn soft" data-a="close">Doch nicht</button></div>`);
  },
  scheinyes() { closeModal(); takeSchein(); render(); scrollTo(0, 0); },
  scheinundo() { undoSchein(); render(); toast('Okay – dein Tag ist wieder da.'); },
});
