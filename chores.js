// Recurring chores (due ones land on today's page by themselves), day rollover, and the chore editor + hand-over modals.
import * as C from './content.js';
import { $, addDays, esc, modal, parse, scheinOn, shortDate, today } from './core.js';
import { S, ui } from './state.js';
import { pn } from './sync.js';
import { buildDay } from './builder.js';
import { bzEditorChip, bzOn } from './babyzeit.js';

// ---------- recurring chores: due ones land on today's page by themselves ----------
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
export function choreDue(c, d) {
  if (c.giveTo && c.giveAt && d >= c.giveAt) return false;   // 👶 G37: moving to the partner from that day on (hidden here, never lost)
  if (c.moved) {   // ⏭ moved one day on: due on the new day, not in between; the rhythm itself stays untouched
    if (d === c.moved.to) return c.last !== d;
    if (d >= c.moved.orig && d < c.moved.to) return false;
  }
  if ((c.skip && c.skip > d) || c.last === d) return false;
  if (c.week && c.week.length) return c.week.includes(parse(d).getDay());
  return !c.last || daysBetween(c.last, d) >= (c.every || 7);
}
export function choreWhen(c) { // "heute", "morgen", "in 3 Tagen", "Mo"
  const d = today();
  if (choreDue(c, d)) return S.log.some(e => e.day === d && e.chore === c.id) ? 'heute erledigt ✓' : 'heute fällig';
  for (let n = 1; n <= 120; n++) {
    const k = addDays(d, n), x = Object.assign({}, c, { last: c.last === d ? d : c.last });
    if (choreDue(x, k)) return n === 1 ? 'morgen' : c.week && c.week.length ? C.DOW[parse(k).getDay()] + ', ' + shortDate(k) : 'in ' + n + ' Tagen';
  }
  return '–';
}
// done on day d: a moved one counts for its planned day, so "alle N Tage" keeps its gaps (weekday plans just go on)
export function choreDone(c, d) {
  c.last = c.moved && c.moved.to === d && !(c.week && c.week.length) ? c.moved.orig : d;
  if (c.moved && c.moved.pin && c.moved.to === d && c.moved.to < c.moved.orig && c.week && c.week.length) c.skip = addDays(c.moved.orig, 1);   // 🏃 G45: pulled earlier = its own weekday is covered
  c.moved = null;
  if (c.round && c.round.length) c.round = [];   // 🧩 G33: a new round of parts starts next time
  if (c.slid) { delete c.slid; delete c.slidOn; }   // 🐢 G34: done = the count starts over
}
// ---------- 🐢 G34 'seltener?': a routine that found no place (or was skipped) 3 times since it was last done ----------
// c.slid = count, c.slidOn = the day it last counted (once a day). Gelber Schein days never count.
export function slidCount(c, d) { if (c.slidOn === d) return; c.slid = (c.slid || 0) + 1; c.slidOn = d; }
export function slidUncount(c, d) { if (c.slidOn === d) { c.slid = Math.max(0, (c.slid || 0) - 1); c.slidOn = null; if (!c.slid) { delete c.slid; delete c.slidOn; } } }
export const SELTEN_AT = 3;
// what a lower rhythm would be: alle N → about 1.5 N; weekdays → one day less (she picks; a single day → every 2 weeks); every day → every 2nd day
export function seltenOf(c) {
  const w = c.week && c.week.length ? [...new Set(c.week)] : null;
  if (w && w.length >= 7 || (!w && (c.every || 7) === 1)) return { kind: 'daily', text: 'jeden 2. Tag statt jeden Tag' };
  if (w && w.length === 1) return { kind: 'single', text: 'alle 2 Wochen statt jede Woche' };
  if (w) return { kind: 'week', days: w.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)), text: 'einen Tag weniger' };
  const n = c.every || 7, m = Math.max(n + 1, Math.round(n * 1.5));
  return { kind: 'every', to: m, text: 'alle ' + m + ' statt alle ' + n + ' Tage' };
}
// the open proposals, the one waiting longest first (Meine Woche shows one; G38's breakfast page reads the same)
export const seltenProposals = () => S.chores.filter(c => (c.slid || 0) >= SELTEN_AT).sort((a, b) => (b.slid || 0) - (a.slid || 0)).map(c => ({ c, p: seltenOf(c) }));
export function seltenApply(c, day) {
  const p = seltenOf(c), d = today();
  if (p.kind === 'every') c.every = p.to;
  else if (p.kind === 'daily') { delete c.week; c.every = 2; if (!c.last) c.last = d; }
  else if (p.kind === 'single') { const wd = c.week[0]; delete c.week; c.every = 14; let k = d; while (parse(k).getDay() !== wd) k = addDays(k, 1); c.last = addDays(k, -14); c.moved = null; }
  else { if (day === undefined || !c.week.includes(day)) return false; c.week = c.week.filter(x => x !== day); planChanged(c); }
  delete c.slid; delete c.slidOn;
  return true;
}
export function seltenKeep(c) { delete c.slid; delete c.slidOn; }
// 🧩 G33 parts inside a routine: c.parts = [{id, name}], c.round = part ids ticked in the running round
export const partsOf = c => (c && Array.isArray(c.parts) ? c.parts.filter(p => p && p.name) : []);
export const openParts = c => partsOf(c).filter(p => !(c.round || []).includes(p.id)).map(p => p.id);
export const partLabel = c => { const n = partsOf(c).length, o = openParts(c).length; return n ? (o === n ? n + ' Teile' : 'noch ' + o + ' von ' + n) : ''; };
export function choreNext(c) { // the next day it is due (today, if it still is)
  const d = today(), doneToday = S.log.some(e => e.day === d && e.chore === c.id);
  for (let n = doneToday ? 1 : 0; n <= 400; n++) { const k = addDays(d, n); if (choreDue(c, k)) return k; }
  return addDays(d, c.every || 7);
}
// "alle N Tage" from a chosen day: due on that day, then every N days (as if it was last done N days before)
export function setChoreNext(c, k) {
  if (c.moved && c.moved.to === k && !(c.week && c.week.length)) return scheduleChores();   // still the moved day → plan untouched
  c.last = addDays(k, -(c.every || 7)); c.skip = null; c.moved = null;
  if (!choreDue(c, today())) S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute'));
  scheduleChores(k === today() ? c.id : undefined);   // her own pick for today beats the ceiling
}
export const choreRhythm = c => c.week && c.week.length ? 'jeden ' + c.week.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => C.DOW[x]).join(' & ') : c.every === 1 ? 'jeden Tag' : 'alle ' + c.every + ' Tage';
// a changed plan never touches today's page: not there yet → from tomorrow; there but today no longer chosen → off again
export function planChanged(c) {
  const on = S.items.find(i => i.chore === c.id && i.where === 'heute');
  if (!on) c.skip = addDays(today(), 1);
  else if (Array.isArray(c.week) && !c.week.includes(parse(today()).getDay())) S.items = S.items.filter(i => i !== on);
}
export const choreItemId = (cid, d) => 'ch-' + cid + '-' + d;
function dedupeChoreItems() { // one open to-do per chore; none for chores that no longer exist
  const cids = new Set(S.chores.map(c => c.id)), one = new Set();
  S.items = S.items.filter(i => !i.chore || (cids.has(i.chore) && !(i.where === 'heute' && (one.has(i.chore) || !one.add(i.chore)))));
}
// 📅 Gekocht (2026-10-11): before the diary existed only "last cooked" was kept per dish → one "zuletzt" entry each, once
function backfillCookLog() {
  if (S.cookLog) return;
  S.cookLog = Object.entries(S.cook || {}).filter(([, c]) => c && c.last).map(([rid, c]) => ({ id: 'old-' + rid, rid, day: c.last, ts: new Date(c.last + 'T19:00').getTime(), taste: c.taste, old: true }));
}
// ---------- 🔁 G30 day ceiling: every-day routines always, at most C.ROUTINE_CAP others; what doesn't fit waits ----------
export const isDaily = c => c.week && c.week.length ? new Set(c.week).size >= 7 : (c.every || 7) === 1;
const waitOf = (c, d) => c.moved ? daysBetween(c.moved.orig, d) : c.week && c.week.length ? 0 : c.last ? daysBetween(c.last, d) - (c.every || 7) : 0;
// 🧱 G39: how much of the day a routine takes (absent = normal)
export const weightOf = c => (c && C.SIZE_W[c.size]) || 1;
// the waiting ones that get a place: longest waiting first (her list order on a tie), each while its size still fits;
// one too big is passed over for a smaller one behind it and keeps its turn. On an empty day the first always lands.
// 👶 his pick 2026-11-27: a weekday routine marked 🌱 Für mich lands FIRST on its own day (Büro, Homeoffice …); the rest after
const anchored = c => c.kind === 'eigen' && !!(c.week && c.week.length) && !c.moved;
const pinnedOn = (c, d) => !!(c.moved && c.moved.pin && c.moved.to === d);   // 🏃 G45: planned in the Sprint-Planung
function pick(list, d, room, empty) {
  const pins = list.filter(c => pinnedOn(c, d)); list = list.filter(c => !pinnedOn(c, d));
  room -= pins.reduce((a, c) => a + weightOf(c), 0); if (pins.length) empty = false;
  const sorted = list.map((c, i) => [c, waitOf(c, d), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
  const order = [...sorted.filter(anchored), ...sorted.filter(c => !anchored(c))];
  const take = [...pins], rest = []; let left = room;
  for (const c of order) { const w = weightOf(c); if (w <= left + 1e-9 || (empty && !take.length && room > 0)) { take.push(c); left -= w; } else rest.push(c); }
  return { take, rest };
}
// no place today: a weekday routine tries again tomorrow (one line, the chain keeps its first day); "alle N Tage" just stays due
export function slide(c, d) { if (c.week && c.week.length) c.moved = { orig: c.moved && c.moved.to === d ? c.moved.orig : d, to: addDays(d, 1) }; }

// force = a routine id she explicitly wants today ("Nächstes Mal: heute", new one "ab heute"): beats the ceiling
export function scheduleChores(force) {
  backfillCookLog();
  dedupeChoreItems();
  const d = today(), T = S.today;
  for (const c of S.chores) if (c.moved && c.moved.to < d) c.moved = null;   // the moved day is over (not done → it's just overdue, like any other)
  const onPage = c => S.items.some(i => i.chore === c.id), doneToday = c => S.log.some(e => e.day === d && e.chore === c.id);
  if (T.day === d && !Array.isArray(T.rplaced)) {   // upgrade in the middle of a day: what is there stays, nothing more today
    T.rplaced = S.chores.filter(c => !isDaily(c) && (onPage(c) || doneToday(c))).map(c => c.id); T.rfull = true;
  }
  const rp = T.day === d ? T.rplaced : null;
  let added = 0;
  if (scheinOn(d)) return 0;   // 🟡 G32 Gelber Schein: nothing lands today
  const put = c => { S.items.push({ id: choreItemId(c.id, d), text: c.name, where: 'heute', created: Date.now(), chore: c.id }); added++; };
  const free = c => choreDue(c, d) && !onPage(c) && !doneToday(c);
  if (!T.closed) S.chores.filter(c => isDaily(c) && free(c)).forEach(put);   // "Für heute Schluss" = nothing new today
  if (rp) {
    S.chores.filter(c => c.id === force && !isDaily(c) && free(c)).forEach(c => { put(c); if (!rp.includes(c.id)) rp.push(c.id); });
    const cand = S.chores.filter(c => !isDaily(c) && free(c) && !rp.includes(c.id));
    const used = rp.reduce((a, id) => a + weightOf(S.chores.find(c => c.id === id)), 0);
    const { take, rest } = pick(cand.filter(c => c.id !== force), d, T.rfull || T.closed ? 0 : C.DAY_BUDGET - used, !rp.length);
    take.forEach(c => { put(c); rp.push(c.id); });
    rest.forEach(c => { slide(c, d); slidCount(c, d); });   // 🐢 G34: found no place today
  }
  buildDay();   // 🧺 G36: once a day the app adds her small set of to-dos
  return added;
}

// 🏃 G45 Sprint-Planung: one occurrence of a routine moved from day `from` to day `to` (pinned there, beats the
// day budget). The rhythm goes on from its original day. Moving off today takes it off the page; onto today puts it on.
export function moveRoutine(c, from, to) {
  const d = today(), T = S.today;
  if (!c || !to || to < d || from === to) return false;
  if (from === d) { S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute')); if (Array.isArray(T.rplaced)) T.rplaced = T.rplaced.filter(id => id !== c.id); }
  const orig = c.moved && c.moved.to === from ? c.moved.orig : from;
  c.moved = { orig, to, pin: true };
  scheduleChores(to === d ? c.id : undefined);
  return true;
}
// play the days forward from today as if everything placed gets done: { day: [{ c, st: 'done'|'open'|'plan', daily }] }
// (Meine Woche, the Gelber Schein's "morgen", and the ⏭ toast all read the same plan that fills the days)
export function planAhead(until) {
  const d = today(), out = {};
  const sim = S.chores.map(c => Object.assign({}, c, { moved: c.moved ? Object.assign({}, c.moved) : null }));
  const real = new Map(S.chores.map(c => [c.id, c]));
  const row = (x, st) => ({ c: real.get(x.id), st, daily: isDaily(x) });
  out[d] = [];   // today = what really is on the page or done
  for (const x of sim) {
    const done = S.log.some(e => e.day === d && e.chore === x.id), open = S.items.some(i => i.chore === x.id && i.where === 'heute');
    if (done) out[d].push(row(x, 'done'));
    else if (open) { out[d].push(row(x, 'open')); choreDone(x, d); }
  }
  for (let k = addDays(d, 1); k <= until; k = addDays(k, 1)) {
    out[k] = [];
    for (const x of sim) if (x.moved && x.moved.to < k) x.moved = null;
    sim.filter(x => isDaily(x) && choreDue(x, k)).forEach(x => { out[k].push(row(x, 'plan')); choreDone(x, k); });
    const { take, rest } = pick(sim.filter(x => !isDaily(x) && choreDue(x, k)), k, C.DAY_BUDGET, true);
    take.forEach(x => { out[k].push(row(x, 'plan')); choreDone(x, k); });
    rest.forEach(x => slide(x, k));
  }
  return out;
}
// the first day from `from` on where the plan puts this routine
export function plannedDay(id, from, max = 60) {
  const p = planAhead(addDays(today(), max));
  return Object.keys(p).sort().find(k => k >= from && p[k].some(r => r.c && r.c.id === id)) || null;
}

export function rollover() {
  const d = today();
  if (S.today.day === d) return false;
  if (S.today.day) { // yesterday's leftovers go back to the top of the list, marked "von gestern" — chores just come back when due
    const old = S.today.day;   // 🧩 G33: a started round still open → back as ONE line with the open parts (a weekday one slides like G30)
    for (const c of S.chores) if ((c.round || []).length && openParts(c).length && !S.log.some(e => e.day === old && e.chore === c.id) && !(c.moved && c.moved.to > old)) slide(c, old);
    S.items = S.items.filter(i => !(i.chore && i.where === 'heute'));
    S.items.forEach(i => { i.carried = false; });
    const left = S.items.filter(i => i.where === 'heute');
    left.forEach(i => { i.where = 'liste'; });   // 🧺 G36: back to their pile, WITHOUT a "von gestern" mark
    S.items = [...left, ...S.items.filter(i => !left.includes(i))];
  }
  S.today = { day: d, planned: false, capShown: false, closed: false, celebrated: false, rplaced: [] };
  S.quest = null;
  if (S.combo && S.combo.day !== d) S.combo = null;   // the reward belongs to its day
  S.gifts = S.gifts.filter(g => g.day === d);
  scheduleChores();
  return true;
}


// the chore editor (a modal that keeps what's typed when a chip is tapped)
// its symbol: shown in Meine Woche and on the to-do; picked here, any own emoji, or guessed from the name
const CE_ICONS = ['🧹', '🧽', '🪣', '🧺', '👕', '🚽', '🛁', '🚿', '🪟', '🗑️', '🍳', '🍽️', '🛒', '🛏️', '🪴', '🐕', '🚗', '🧊', '💊', '💸', '📬', '🏃', '📞', '✂️'];
const CE_GUESS = [[/fenster/i, '🪟'], [/klo|toilette|wc/i, '🚽'], [/bad|wanne/i, '🛁'], [/dusch/i, '🚿'], [/wäsche|waschen/i, '🧺'], [/bügel/i, '👕'],
  [/müll|abfall|tonne/i, '🗑️'], [/saug|staub|kehr|fegen/i, '🧹'], [/wisch|boden|putz/i, '🧽'], [/koch/i, '🍳'], [/spül|geschirr/i, '🍽️'], [/einkauf/i, '🛒'],
  [/bett/i, '🛏️'], [/pflanz|gieß|blume/i, '🪴'], [/hund|gassi|monti/i, '🐕'], [/auto|tank/i, '🚗'], [/kühlschrank|gefrier/i, '🧊'], [/medi|tablett/i, '💊'],
  [/rechnung|geld|bank/i, '💸'], [/post|brief/i, '📬'], [/sport|lauf|joggen/i, '🏃'], [/anruf|telefon/i, '📞'], [/haare|nägel/i, '✂️']];
export const guessIcon = name => (CE_GUESS.find(([re]) => re.test(name || '')) || [0, '🔁'])[1];
export const firstEmoji = t => { t = (t || '').trim(); if (!t) return ''; try { return [...new Intl.Segmenter().segment(t)][0].segment; } catch (e) { return [...t].slice(0, 2).join(''); } };
export function ceRead() {
  const ic = $('#ce-icon'); if (ic && ic.value.trim()) { ui.ce.icon = firstEmoji(ic.value); ui.ce.iconSet = true; }
  const n = $('#ce-name'), ev = $('#ce-every'), r = $('#ce-own');
  if (n) ui.ce.name = n.value.trim();
  if (ev) ui.ce.every = ev.value;
  if (r && ui.ce.own) ui.ce.reward = r.value.trim();
  const m = $('#ce-music'); if (m) ui.ce.music = m.value.trim();
  document.querySelectorAll('#ov .ce-part').forEach(i => { const p = (ui.ce.parts || []).find(x => x.id === i.dataset.pid); if (p) p.name = i.value.trim(); });
  const np = $('#ce-newpart'); if (np) ui.ce.newPart = np.value;
  const dt = document.getElementById('ce-date'); if (dt) ui.ce.startDate = dt.value;
  const nx = document.getElementById('ce-next'); if (nx) { ui.ce.next = nx.value; if (nx.dataset.auto === '0') ui.ce.nextTouched = true; }
}
export function choreModal() {
  const e = ui.ce;
  const opts = C.CHORE_REWARDS.concat(S.wishes.map(w => w.text)).filter((x, i, a) => a.indexOf(x) === i);
  modal(`<div style="text-align:left"><h2 style="text-align:center">${e.id ? 'Aufgabe ändern' : 'Neue Aufgabe'}</h2>
    <label class="field"><span>Was ist dran?</span><input id="ce-name" value="${esc(e.name)}" placeholder="z.B. Wäsche waschen" autocomplete="off"></label>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">Symbol${e.iconSet || e.id ? ': <span style="font-size:22px">' + esc(e.icon) + '</span>' : ' <span style="font-weight:400">(sonst passend zum Namen)</span>'}</p>
    <div class="chips ce-icons">${CE_ICONS.map(ic => `<button class="chip ${(e.iconSet || e.id) && e.icon === ic ? 'on' : ''}" data-a="ceicon" data-v="${ic}" aria-label="Symbol ${ic}">${ic}</button>`).join('')}</div>
    <label class="field"><span>…oder ein eigenes Emoji</span><input id="ce-icon" value="${(e.iconSet || e.id) && !CE_ICONS.includes(e.icon) && e.icon !== '🔁' ? esc(e.icon) : ''}" placeholder="z.B. 🦆" autocomplete="off" style="max-width:7em;font-size:20px"></label>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">Wie oft?</p>
    <div class="chips"><button class="chip ${e.mode === 'days' ? 'on' : ''}" data-a="cemode" data-v="days">Alle paar Tage</button><button class="chip ${e.mode === 'week' ? 'on' : ''}" data-a="cemode" data-v="week">An Wochentagen</button></div>
    ${e.mode === 'days' ? `<label class="field"><span>Alle wie viele Tage?</span><input id="ce-every" type="number" min="1" max="90" inputmode="numeric" value="${esc(e.every)}" oninput="const l=document.getElementById('ce-later'); if(l) l.textContent='In '+(this.value||7)+' Tagen'; const f=document.getElementById('ce-from'); if(f) f.textContent='Von diesem Tag an alle '+(this.value||7)+' Tage.'; const d=new Date(Date.now()-3*3600e3); d.setDate(d.getDate()+(+this.value||7)); const t=document.getElementById('ce-next'); if(t&&t.dataset.auto==='1') t.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');"></label>
      <label class="field"><span>${e.id ? 'Nächstes Mal am' : 'Beginnt am'}</span><input type="date" id="ce-next" min="${today()}" value="${esc(e.next || addDays(today(), +e.every || 7))}" data-auto="${e.nextTouched ? 0 : 1}" oninput="this.dataset.auto='0'"></label>
      <div class="chips">${[[0, 'Heute'], [1, 'Morgen']].map(([n, l]) => `<button class="chip" data-a="cenext" data-v="${n}">${l}</button>`).join('')}<button class="chip" data-a="cenext" data-v="every" id="ce-later">In ${esc(e.every)} Tagen</button></div>
      <p class="hint" id="ce-from">Von diesem Tag an alle ${esc(e.every)} Tage.</p>`
      : `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${e.week.includes(d) ? 'on' : ''}" data-a="ceday" data-v="${d}">${C.DOW[d]}</button>`).join('')}</div>`}
    ${e.id || e.mode === 'days' ? '' : `<p class="muted" style="font-weight:800;margin:12px 0 4px">Ab wann?</p><div class="chips"><button class="chip ${e.start === 'heute' ? 'on' : ''}" data-a="cestart" data-v="heute">Ab heute</button><button class="chip ${e.start === 'morgen' ? 'on' : ''}" data-a="cestart" data-v="morgen">Ab morgen</button><button class="chip ${e.start === 'datum' ? 'on' : ''}" data-a="cestart" data-v="datum">📅 Datum wählen</button></div>
      ${e.start === 'datum' ? `<label class="field"><span>Beginnt am</span><input type="date" id="ce-date" min="${today()}" value="${e.startDate || addDays(today(), 1)}" oninput="const h=document.getElementById('ce-datehint'); if(h) h.textContent=''"></label><p class="hint" id="ce-datehint">${e.startDate ? 'beginnt ' + esc(C.DAYNAMES[parse(e.startDate).getDay()]) + ', ' + esc(shortDate(e.startDate)) : ''}</p>` : ''}`}
    <p class="muted" style="font-weight:800;margin:12px 0 4px">Wie viel vom Tag?</p>
    <div class="chips">${C.SIZES.map(([k, l]) => `<button class="chip ${(e.size || 'n') === k ? 'on' : ''}" data-a="cesize" data-v="${k}">${l}</button>`).join('')}</div>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">🧩 Teile <span style="font-weight:400">(optional)</span></p>
    ${(e.parts || []).map(p => `<div class="ce-prow"><input class="ce-part" data-pid="${p.id}" value="${esc(p.name)}" autocomplete="off"><button class="mini-btn" data-a="cepartdel" data-v="${p.id}" aria-label="Teil entfernen">✕</button></div>`).join('')}
    <div class="ce-prow"><input id="ce-newpart" value="${esc(e.newPart || '')}" placeholder="${(e.parts || []).length ? 'Noch ein Teil…' : 'z.B. Wanne'}" autocomplete="off"><button class="mini-btn" data-a="cepartadd" aria-label="Teil hinzufügen">+</button></div>
    <p class="hint">Fertig, wenn alle Teile abgehakt sind. Jeder Teil gibt einen Stern.</p>
    <div class="chips" style="margin-top:8px"><button class="chip ${e.kind === 'haus' ? 'on' : ''}" data-a="cekind" data-v="haus">🏠 Haushalt</button><button class="chip ${e.kind === 'eigen' ? 'on' : ''}" data-a="cekind" data-v="eigen">🌱 Für mich</button><button class="chip ${e.again ? 'on' : ''}" data-a="ceagain">➕ Mehrmals am Tag</button></div>
    ${bzEditorChip(e)}
    <p class="muted" style="font-weight:800;margin:12px 0 4px">🎁 Belohnung danach (am selben Tag)</p>
    <div class="chips">${opts.map(r => `<button class="chip ${e.reward === r && !e.own ? 'on' : ''}" data-a="cerew" data-v="${esc(r)}">${esc(r)}</button>`).join('')}<button class="chip ${e.own ? 'on' : ''}" data-a="ceown">✏️ Eigene…</button></div>
    ${e.own ? `<label class="field"><span>Deine Belohnung</span><input id="ce-own" value="${esc(e.reward)}" placeholder="Was gönnst du dir?" autocomplete="off"></label>` : ''}
    <p class="hint">Keine ausgewählt = einfach eine Aufgabe ohne Belohnung.</p>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">🛠 Helfer dazu</p>
    <div class="chips">${Object.entries(C.TOOLS).map(([k, [ic, l]]) => `<button class="chip ${e.tools.includes(k) ? 'on' : ''}" data-a="cetool" data-v="${k}">${ic} ${l}</button>`).join('')}</div>
    ${e.tools.includes('music') ? `<label class="field"><span>Link zu deiner Playlist (Spotify, YouTube Music …)</span><input id="ce-music" value="${esc(e.music)}" placeholder="https://…" autocapitalize="off" autocomplete="off" spellcheck="false"></label>` : ''}
    <p class="muted" id="ce-msg" style="color:var(--danger)"></p>
    <div class="row"><button class="btn" data-a="cesave">Speichern</button><button class="btn soft" data-a="close">Abbrechen</button></div></div>`);
}

export function delegateModal() {
  const open = [...S.items.filter(i => i.where === 'heute'), ...S.items.filter(i => i.where !== 'heute')].filter(i => !(i.chore && bzOn()));   // 👶 G37: routines never change hands during a day
  const n = ui.dpicks.size;
  modal(`<h2>An ${esc(pn())} abgeben</h2><p class="muted">Welche Aufgaben soll ${esc(pn())} übernehmen?</p>
    <div style="text-align:left">${open.map(i => `<button class="pick ${ui.dpicks.has(i.id) ? 'on' : ''}" data-a="dpick" data-id="${i.id}"><span class="box">${ui.dpicks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}</span></button>`).join('')}</div>
    <div class="chips" style="justify-content:center;margin-top:12px"><button class="chip ${ui.dtoday ? 'on' : ''}" data-a="dtoday">☀ Bitte heute erledigen</button></div>
    <div class="row"><button class="btn" data-a="dsend" ${n ? '' : 'disabled'}>Abgeben${n ? ' (' + n + ')' : ''} · +1 ⭐</button><button class="btn soft" data-a="close">Abbrechen</button></div>`);
}
