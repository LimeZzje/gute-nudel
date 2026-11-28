// ☕ G38 Frühstücksplan → G41 "Unser Tag · Unsere Woche": one page for the two of them at breakfast, one phone on the
// table. Two tabs at the top (his pick 2026-11-28): Heute (today's fixed things, her lines, his lines, the Gelber
// Schein, open questions) and Woche (the next 6 days, the day builder's rule played forward, max C.DAY_LINES a day).
// Forward only. No reminder, no badge, no log that it happened. Each sees only their OWN list number falling.
// The partner's lines come from their post (post.today = {day, lines}, post.week = [{day, lines}]); stale = "noch nicht da".
import * as Car from './car.js';
import * as C from './content.js';
import { commit, esc, monday, parse, scheinOn, today } from './core.js';
import { A, S, ui } from './state.js';
import { pn } from './sync.js';
import { carAll, carDay, carTime, isCar, shared } from './termine.js';
import { scheinBtn } from './schein.js';
import { weekAhead, whyFor } from './builder.js';
import { bzOn } from './babyzeit.js';
import { seltenCard } from './daheim.js';
import { render } from './app.js';
import { sprintBtn, sprintPost, sprintReceive } from './sprint.js';

const label = i => { const c = i.chore && S.chores.find(x => x.id === i.chore); return (c ? c.icon + ' ' : '') + i.text; };
const openTodos = () => S.items.filter(i => !i.chore && (i.where === 'liste' || i.where === 'heute')).length;
// the week's starting number of my list: taken the first time this phone looks in a new week
function listWeek() {
  const wk = monday(today());
  if (!S.listWk || S.listWk.wk !== wk) S.listWk = { wk, n: openTodos() };
  return S.listWk;
}
// what travels: my lines of today + the next 6 days as plain text
export const fsPost = () => {
  listWeek();
  let week = [];
  try { week = weekAhead().days.map(d => ({ day: d.day, lines: [...d.routines.map(r => r.icon + ' ' + r.text), ...d.todos.map(x => x.text)].slice(0, C.DAY_LINES) })); } catch (e) {}
  return { today: { day: today(), schein: scheinOn(), lines: S.items.filter(i => i.where === 'heute').map(label).slice(0, 12) }, week, ...sprintPost() };   // 🏃 G42: open list + sprint decisions
};
export function fsReceive(p) {
  let ch = false;
  if (p.today && JSON.stringify(p.today) !== JSON.stringify(S.partnerToday || null)) { S.partnerToday = p.today; ch = true; }
  if (p.week && JSON.stringify(p.week) !== JSON.stringify(S.partnerWeek || null)) { S.partnerWeek = p.week; ch = true; }
  if (sprintReceive(p)) ch = true;   // 🏃 G42
  return ch;
}
export const fsTile = () => `<button class="card hcard fs-tile" data-a="fs"><span class="hc-txt"><b>🏃 Sprint</b><span class="muted">Wer macht was – heute und diese Woche</span></span><span class="hc-go">›</span></button>`;

const dayName = k => parse(k).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'numeric' });
function tabs() {
  const w = ui.fsTab === 'woche';
  return `<div class="chips fs-tabs"><button class="chip${w ? '' : ' on'}" data-a="fstab" data-v="heute">Heute</button><button class="chip${w ? ' on' : ''}" data-a="fstab" data-v="woche">Unsere Woche</button></div>`;
}

export function viewFs() {
  let h = `<button class="btn soft back-home" data-a="go" data-tab="home">‹ Zurück</button><section class="fs">${tabs()}`;
  return h + (ui.fsTab === 'woche' ? viewWeek() : viewDay()) + `</section>`;
}

function viewDay() {
  const t = today(), now = Car.localISO(new Date());
  const terms = carAll(Car.live, false).filter(b => shared(b) && !isCar(b) && carDay(b.start) <= t && carDay(b.end) >= t && b.end > now);
  const due = S.items.filter(i => !i.chore && i.due === t);
  let h = '';
  if (terms.length || due.length) h += `<div class="card fs-fix"><h3>Heute fest</h3>${terms.map(b => `<p>📅 <b>${esc(carDay(b.start) < t ? 'ganztags' : carTime(b.start))}</b> · ${esc(b.note || 'Termin')}</p>`).join('')}${due.map(i => `<p>📌 ${esc(i.text)}</p>`).join('')}</div>`;
  // mine (with 'heute nicht' and the Schein)
  const mine = S.items.filter(i => i.where === 'heute');
  h += `<div class="card fs-me"><h3>${esc(S.name || 'Ich')}</h3>`;
  if (scheinOn()) h += `<p class="fs-pause">🟡 Heute ist Pause.</p>`;
  else h += mine.length ? mine.map(i => `<div class="fs-line"><span>${esc(label(i))}</span>${i.chore ? `<button class="mini-btn" data-a="choreskip" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht">⏭</button>` : `<button class="mini-btn" data-a="later" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht">${whyFor(i.id) ? '↻' : '↩'}</button>`}</div>`).join('') : `<p class="muted">Noch nichts für heute.</p>`;
  h += scheinBtn() + `</div>`;
  // the partner's, read only
  const p = S.partnerToday;
  h += `<div class="card fs-you"><h3>${esc(pn())}</h3>${!p || p.day !== t ? `<p class="muted">noch nicht da</p>` : p.schein ? `<p class="fs-pause">🟡 Heute ist Pause.</p>` : p.lines.length ? p.lines.map(x => `<div class="fs-line"><span>${esc(x)}</span></div>`).join('') : `<p class="muted">Nichts geplant.</p>`}</div>`;
  // open questions, only if any
  h += seltenCard();
  if (bzOn()) h += `<button class="btn soft wide" data-a="go" data-tab="ruhe" data-q="haushalt">👶 Haushalt in der Baby-Zeit ansehen</button>`;
  if (S.fsWeek !== monday(t)) h += `<p class="fs-week"><button class="btn soft wide" data-a="fsweek">📚 Liste für die Woche durchgehen?</button></p>`;
  return h;
}

// 🗓️ G41: the next 6 days. Mine from the builder's forecast, the partner's from their post (read only, no counts)
function viewWeek() {
  const { days, left } = weekAhead(), n = openTodos(), lw = listWeek();
  const pw = new Map((S.partnerWeek || []).map(d => [d.day, d.lines]));
  let h = `<div class="card fs-count"><b>📉 Deine Liste: ${n} offen</b>${lw.n > n ? `<span class="muted">Montag waren es noch ${lw.n}.</span>` : ''}
    <span class="muted">${n === 0 ? 'Alles weg. 🎉' : left ? `${left} noch ohne Tag – in der Sprint-Planung verteilen.` : 'Alles hat einen Tag. ✨'}</span></div>`;
  h += sprintBtn();   // 🏃 G42: on demand, quiet once done this week
  h += `<p class="muted fs-wnote">Bis zu ${C.DAY_LINES} Sachen am Tag, so wie ihr es in der Sprint-Planung verteilt habt. Was liegen bleibt, geht zurück in die Liste.</p>`;
  for (const d of days) {
    const mine = [...d.routines.map(r => r.icon + ' ' + r.text), ...d.todos.map(x => x.text)], theirs = pw.get(d.day);
    h += `<div class="card fs-day"><h3>${esc(dayName(d.day))}</h3>
      <div class="fs-who">${esc(S.name || 'Ich')}</div>${mine.length ? mine.map(x => `<div class="fs-line"><span>${esc(x)}</span></div>`).join('') : '<p class="muted">Frei. 🛋️</p>'}
      <div class="fs-who">${esc(pn())}</div>${!theirs ? '<p class="muted">noch nicht da</p>' : theirs.length ? theirs.map(x => `<div class="fs-line fs-them"><span>${esc(x)}</span></div>`).join('') : '<p class="muted">Frei. 🛋️</p>'}</div>`;
  }
  return h;
}

Object.assign(A, {
  fs() { ui.tab = 'home'; ui.sub = 'fs'; render(); scrollTo(0, 0); },
  fstab(el) { ui.fsTab = el.dataset.v; render(); },
  fsweek() { S.fsWeek = monday(today()); commit(); A.psortstart(); },
});
