// 🧺 G36 the app builds the day: no morning picker. Once a day (first scheduling of the day) it puts a small set of
// to-dos next to the routines, each with one short reason; 'heute nicht' swaps one for the next; after everything is
// ticked it offers one more at a time up to the 10 stars. Her own choice (☀, Aus der Liste holen, add field) still wins.
// State: S.today.built (done for today), S.today.picked = [{id, why}], S.today.nope = ids not again today.
import * as C from './content.js';
import { addDays, commit, scheinOn, today, toast, workToday } from './core.js';
import { planAhead } from './chores.js';
import { eisen, isUrg } from './flags.js';
import { A, S } from './state.js';
import { unsorted, weekPile } from './piles.js';
import { dueDays } from './faellig.js';
import { todayTerms } from './schein.js';
import { dogStarsToday } from './hund.js';

const onPage = () => S.items.filter(i => i.where === 'heute');
// what the app may pick from: Diese Woche (in its order), then not yet sorted ones (oldest first)
export function pool() {
  const week = weekPile().filter(i => !i.chore);
  const loose = S.items.filter(i => i.where === 'liste' && !i.chore && unsorted(i)).sort((a, b) => (a.created || 0) - (b.created || 0));
  return [...week, ...loose.filter(i => !week.includes(i))];
}
// how many to-dos: DAY_LINES minus the day's routine lines, within TODO_MIN..TODO_MAX; one fewer on a day with a fixed thing
export function places() {
  const routines = onPage().filter(i => i.chore).length, t = today();
  let n = Math.max(C.TODO_MIN, Math.min(C.TODO_MAX, C.DAY_LINES - routines));
  if (todayTerms().length || S.items.some(i => !i.chore && i.due === t)) n = Math.max(1, n - 1);
  return n;
}
const OLD = 7 * 864e5;
function whyOf(i) {
  if (i.due && dueDays(i.due) === 0) return '📅 heute fällig';
  if (i.due && dueDays(i.due) < 0) return '📅 wartet schon';
  if (i.due && dueDays(i.due) === 1) return '📅 morgen fällig';
  if (i.imp && isUrg(i)) return '❗⏰ wichtig + dringend';
  if (i.urg) return '⏰ dringend';
  if (i.imp) return '❗ wichtig';
  if (i.joy) return '💛 macht Freude';
  if (typeof i.rank === 'number') return 'zuerst gewählt';
  if (Date.now() - (i.created || Date.now()) > OLD) return 'wartet schon länger';
  return 'steht diese Woche an';
}
// the next n picks: due TODAY always comes along (outside n); overdue ones go first in line but share the n places
// (his pick 2026-11-27: her ~10 overdue must not make a wall); at most one heavy one a day
export function nextPicks(n, skip = new Set()) {
  let heavy = onPage().some(i => !i.chore && i.heavy);
  const list = pool().filter(i => !skip.has(i.id)), out = [];
  const take = i => { out.push({ it: i, why: whyOf(i) }); if (i.heavy) heavy = true; };
  list.filter(i => i.due && dueDays(i.due) === 0).forEach(take);
  const rest = list.filter(i => !out.some(o => o.it === i));
  const joy = rest.find(i => i.joy && !i.heavy) || rest.find(i => i.joy);
  const over = rest.filter(i => i.due && dueDays(i.due) < 0).sort((a, b) => a.due.localeCompare(b.due));
  const order = eisen([...over, ...rest.filter(i => i.due && dueDays(i.due) === 1), ...(joy ? [joy] : []), ...rest].filter((i, k, a) => a.indexOf(i) === k));   // 🏷️ G43 Eisenhower
  let got = 0;
  for (const i of order) { if (got >= n) break; if (i.heavy && heavy) continue; take(i); got++; }
  return out;
}
const put = (T, picks) => { picks.forEach(p => { p.it.where = 'heute'; p.it.carried = false; }); T.picked = (T.picked || []).concat(picks.map(p => ({ id: p.it.id, why: p.why }))); };

// 🏃 G44 (his pick 2026-11-28): NO auto-fill. The day = the routines + exactly what the Sprint-Planung put on today
// (item.sday). A plan date in the past is dropped: the item waits in the Liste again (no "von gestern").
export function buildDay() {
  const T = S.today, d = today();
  if (T.day !== d || T.built) return false;
  T.built = true;
  for (const i of S.items) if (i.sday && i.sday < d) delete i.sday;
  if (scheinOn(d)) return false;
  const planned = S.items.filter(i => !i.chore && i.where === 'liste' && i.sday === d);
  if (!planned.length && !pool().length) return false;   // nothing at all: the old quiet page with the add field
  T.planned = true;   // no morning picker (G36): the day is what the sprint planned
  if (!planned.length) return true;
  put(T, planned.map(it => ({ it, why: '🏃 geplant' })));
  T.planned = true;
  return true;
}
export const whyFor = id => ((S.today.picked || []).find(p => p.id === id) || {}).why || '';
// "Noch N bis zu deinen 10 Sternen": only once everything on the page is ticked
export function offerLeft() {
  const T = S.today; if (!T.built || scheinOn() || onPage().length) return 0;
  const n = C.CAP - workToday().length - dogStarsToday();
  if (n <= 0 || !workToday().length) return 0;
  return nextPicks(1, new Set(T.nope || [])).length ? n : 0;
}

Object.assign(A, {
  onemore() {
    const T = S.today, p = nextPicks(1, new Set(T.nope || []))[0]; if (!p) return;
    put(T, [p]); T.closed = false; commit();
  },
});
// 'heute nicht': back to the Liste (plan date dropped), nothing slides in (G44: no auto-fill), not again today
export function swapOut(it) {
  const T = S.today;
  it.where = 'liste'; delete it.sday;
  T.nope = (T.nope || []).concat([it.id]);
  T.picked = (T.picked || []).filter(p => p.id !== it.id);
  return null;
}

// 🗓️ Unsere Woche (G41 → G44): the next n days as PLANNED in the Sprint-Planung: routines (the routine rule played
// forward) + the to-dos with that plan date. `left` = open to-dos with no day yet.
export function weekAhead(n = 6, from = 1) {
  const t = today(), end = addDays(t, n), plan = planAhead(end), out = [];
  const mine = S.items.filter(i => !i.chore && (i.where === 'liste' || i.where === 'heute'));
  for (let k = addDays(t, from); k <= end; k = addDays(k, 1)) {
    const routines = (plan[k] || []).filter(x => x.c).map(x => ({ icon: x.c.icon, text: x.c.name, chore: true }));
    const todos = eisen(mine.filter(i => k === t ? i.where === 'heute' : i.sday === k)).map(i => ({ text: i.text, id: i.id }));
    out.push({ day: k, routines, todos });
  }
  return { days: out, left: mine.filter(i => !i.sday && i.where !== 'heute').length };
}
