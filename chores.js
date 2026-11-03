// Recurring chores (due ones land on today's page by themselves), day rollover, and the chore editor + hand-over modals.
import * as C from './content.js';
import { $, addDays, esc, modal, parse, shortDate, today } from './core.js';
import { S, ui } from './state.js';
import { pn } from './sync.js';

// ---------- recurring chores: due ones land on today's page by themselves ----------
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
export function choreDue(c, d) {
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
  c.moved = null;
}
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
  scheduleChores();
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
export function scheduleChores() {
  backfillCookLog();
  dedupeChoreItems();
  const d = today();
  let added = 0;
  for (const c of S.chores) {
    if (c.moved && c.moved.to < d) c.moved = null;   // the moved day is over (not done → it's just overdue, like any other)
    if (!choreDue(c, d) || S.items.some(i => i.chore === c.id) || S.log.some(e => e.day === d && e.chore === c.id)) continue;
    S.items.push({ id: choreItemId(c.id, d), text: c.name, where: 'heute', created: Date.now(), chore: c.id });
    added++;
  }
  return added;
}

export function rollover() {
  const d = today();
  if (S.today.day === d) return false;
  if (S.today.day) { // yesterday's leftovers go back to the top of the list, marked "von gestern" — chores just come back when due
    S.items = S.items.filter(i => !(i.chore && i.where === 'heute'));
    S.items.forEach(i => { i.carried = false; });
    const left = S.items.filter(i => i.where === 'heute');
    left.forEach(i => { i.where = 'liste'; i.carried = true; });
    S.items = [...left, ...S.items.filter(i => !left.includes(i))];
  }
  S.today = { day: d, planned: false, capShown: false, closed: false, celebrated: false };
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
  const open = [...S.items.filter(i => i.where === 'heute'), ...S.items.filter(i => i.where !== 'heute')];
  const n = ui.dpicks.size;
  modal(`<h2>An ${esc(pn())} abgeben</h2><p class="muted">Welche Aufgaben soll ${esc(pn())} übernehmen?</p>
    <div style="text-align:left">${open.map(i => `<button class="pick ${ui.dpicks.has(i.id) ? 'on' : ''}" data-a="dpick" data-id="${i.id}"><span class="box">${ui.dpicks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}</span></button>`).join('')}</div>
    <div class="chips" style="justify-content:center;margin-top:12px"><button class="chip ${ui.dtoday ? 'on' : ''}" data-a="dtoday">☀ Bitte heute erledigen</button></div>
    <div class="row"><button class="btn" data-a="dsend" ${n ? '' : 'disabled'}>Abgeben${n ? ' (' + n + ')' : ''} · +1 ⭐</button><button class="btn soft" data-a="close">Abbrechen</button></div>`);
}
