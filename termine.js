// TERMINE: the shared calendar (car toggle, repeats), the month view, entry modal.
import * as C from './content.js';
import * as D from './data.js';
import * as Car from './car.js';
import { $, addDays, closeModal, commit, esc, key, longDate, modal, parse, pick, toast, uid } from './core.js';
import { A, S, ui } from './state.js';
import { pn, syncPost } from './sync.js';
import { render, start } from './app.js';

// ---------- TERMINE: one shared calendar for both of us; the car is a toggle on an appointment ----------
// Each phone keeps the entries it created (S.car) and posts them; the partner's come in via post (S.partnerCar).
// An entry: {id, start, end, note (what), who: 'stand'|'stefan'|'both' (missing = the creator), car (missing = true:
// the old car bookings), every/everyM/until/skip}. Only the creator edits or deletes. Car entries that overlap get a
// warning before saving and a red mark; nothing needs approving.
export const carDay = iso => iso.slice(0, 10);
export const carTime = iso => iso.slice(11, 16);
export function carDayLabel(k) {
  const now = new Date(), t = Car.localISO(now).slice(0, 10), d = parse(k);
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  if (k === t) return 'Heute';
  if (k === Car.localISO(tm).slice(0, 10)) return 'Morgen';
  return C.DAYNAMES[d.getDay()].slice(0, 2) + ', ' + d.getDate() + '. ' + C.MONTHS[d.getMonth()].slice(0, 3);
}
export function carRange(b) { // "09:00 – 12:00" or "09:00 – Sa, 6. Okt 18:00"
  if (carTime(b.start) === '00:00' && carTime(b.end) === '23:59' && carDay(b.start) === carDay(b.end)) return 'Ganzer Tag';
  return carTime(b.start) + ' – ' + (carDay(b.end) !== carDay(b.start) ? carDayLabel(carDay(b.end)) + ' ' : '') + carTime(b.end);
}
export const isCar = b => b.car !== false;
export const shared = b => b.who === 'both' || isCar(b);
export const forMe = b => b.who === 'both' || b.who === D.me();   // "Heute … / als Nächstes …": only what concerns me (not the partner's car trips)   // Termine only holds shared appointments and car entries (own ones go in your own calendar)
const whoColor = w => Car.COLORS[w] || '#4fd1a5';
const whoName = (w, du = 'Du') => w === 'both' ? 'Ihr beide' : w === D.me() ? du : pn();
const repTag = b => Car.isSeries(b) ? ` <span class="au-rep">🔁 ${Car.repLabel(b)}${b.until ? ' bis ' + esc(carDayLabel(b.until)) : ''}</span>` : '';
const termKey = b => b.sid || b.id;
// everyone's entries (upcoming, or with Car.recent also the last weeks), sorted; onlyCar for the Auto view
export function carAll(pick = Car.live, onlyCar = true) {
  const tag = (list, mine) => pick(list).map(b => { const who = b.who || (mine ? D.me() : D.partner()); return { ...b, mine, who, color: whoColor(who) }; });
  const all = tag(S.car, true).concat(tag(S.partnerCar, false));
  all.forEach(b => { b.clash = isCar(b) && all.some(o => o !== b && isCar(o) && (termKey(o) !== termKey(b) || o.mine !== b.mine) && Car.overlaps(o, b)); });
  return all.filter(b => !onlyCar || isCar(b)).sort((a, b) => a.start < b.start ? -1 : 1);
}
export function carToday() { // a slim line on To-Dos when the car is booked today
  const t = Car.localISO(new Date()).slice(0, 10);
  const list = carAll().filter(b => carDay(b.start) <= t && carDay(b.end) >= t);
  if (!list.length) return '';
  return `<button class="cartoday" data-a="go" data-tab="termine"><span class="ct-k">A1 HEUTE</span>${list.map(b => `<span class="ct-r${b.clash ? ' clash' : ''}"><b>${esc(whoName(b.who))}</b> ${esc(carRange(b))}${b.note ? ' · ' + esc(b.note) : ''}</span>`).join('')}<span class="ct-go">›</span></button>`;
}
const mark = (b, size) => isCar(b) ? Car.icon(b.color, size) : `<i class="tdot" style="background:${b.color};width:${size * .5}px;height:${size * .5}px"></i>`;
function termRow(b) { // one entry in a list (the next date of a series)
  return `<div class="au-row${b.clash ? ' clash' : ''}${b.mine ? ' mine' : ''}" style="--who:${b.color}">
      <div class="au-time">${esc(carRange(b))}</div>
      <div class="au-who">${mark(b, 22)} <b>${esc(b.note || (isCar(b) ? 'Auto' : 'Termin'))}</b> · ${esc(whoName(b.who))}${isCar(b) && ui.qtab === 'termine' ? ' · 🚗' : ''}${repTag(b)}${!b.mine ? `<div class="au-by">eingetragen von ${esc(pn())}</div>` : ''}${b.clash ? `<div class="au-warn">Auto doppelt verplant – kurz absprechen</div>` : ''}</div>
      ${b.mine ? termActs(b) : ''}
    </div>`;
}
const termActs = b => `<span class="au-acts"><button class="au-x" data-a="caredit" data-id="${termKey(b)}" aria-label="Ändern">✎</button><button class="au-x" data-a="cardel" data-id="${termKey(b)}" data-k="${carDay(b.start)}" aria-label="Löschen">✕</button></span>`;
function termList(all, empty) {
  const now = Car.localISO(new Date());
  if (!all.length) return `<p class="au-empty">${empty}</p>`;
  let h = '', day = '';
  const seen = new Set(), rows = all.filter(b => !b.sid || (!seen.has(b.sid) && seen.add(b.sid)));
  for (const b of rows) {
    const d = carDay(b.start) < now.slice(0, 10) ? now.slice(0, 10) : carDay(b.start);
    if (d !== day) { day = d; h += `<div class="au-day">${esc(carDayLabel(d))}</div>`; }
    h += termRow(b);
  }
  return h;
}
export function viewTermine() {
  const all = carAll(Car.live, false).filter(shared), t = Car.localISO(new Date()).slice(0, 10);
  const mine = all.filter(forMe), todays = mine.filter(b => carDay(b.start) <= t && carDay(b.end) >= t), next = mine.find(b => b.start > Car.localISO(new Date()));
  return `<section class="audi termine">
    <div class="au-hero tm-hero">
      <div class="au-kicker">Unser Kalender</div>
      <div class="au-model">Termine</div>
      <div class="au-trim">Was ihr zusammen vorhabt – und wer das Auto hat</div>
      <div class="au-status">${todays.length ? '<span class="au-dot busy"></span>' : '<span class="au-dot"></span>'}<span>${todays.length ? 'Heute ' + (todays.length === 1 ? 'ein Termin' : todays.length + ' Termine') : 'Heute nichts – herrlich'}${next ? ` · als Nächstes <b>${esc(next.note || 'Termin')}</b>, ${carDayLabel(carDay(next.start))} ${carTime(next.start)}` : ''}</span></div>
    </div>
    <button class="au-btn" data-a="carnew" data-car="0">Termin eintragen</button>
    ${carCalendar(false)}
    <div class="au-h">Alle kommenden Termine</div>
    ${termList(all, 'Nichts geplant. Genießt es.')}
    <p class="au-note">Hier stehen gemeinsame Termine und alles mit Auto. Eigene Termine ohne Auto gehören in euren eigenen Kalender. Ändern und löschen kann nur, wer eingetragen hat.</p></section>`;
}
// ---------- the calendar: a month, a mark per entry in its person's colour, a 24 h strip per day ----------
function carCalendar(onlyCar) {
  const todayK = Car.localISO(new Date()).slice(0, 10);
  const mon = ui.carMonth || todayK.slice(0, 7), sel = ui.carDay || todayK;
  const [y, m] = mon.split('-').map(Number), first = new Date(y, m - 1, 1);
  const startK = key(new Date(y, m - 1, 1 - (first.getDay() + 6) % 7));
  const all = carAll(Car.recent, onlyCar).filter(b => onlyCar || shared(b));
  const dayOf = k => all.map(b => ({ b, span: Car.onDay(b, k) })).filter(x => x.span);
  const strip = list => list.map(({ b, span }) => `<i style="left:${span[0] / 14.4}%;width:${Math.max(3, (span[1] - span[0]) / 14.4)}%;background:${b.color}"></i>`).join('');
  const legend = [D.me(), D.partner(), 'both'].map(w => `<span>${onlyCar ? Car.icon(whoColor(w), 22) : `<i class="tdot" style="background:${whoColor(w)}"></i>`} ${esc(w === D.me() ? (S.name || 'Du') : whoName(w))}</span>`).join('');
  let h = `<div class="au-h">Kalender</div>
    <div class="cal-head"><button class="cal-nav" data-a="carmonth" data-d="-1" aria-label="Vorheriger Monat">‹</button>
      <div class="cal-title">${C.MONTHS[m - 1]} ${y}</div>
      <button class="cal-nav" data-a="carmonth" data-d="1" aria-label="Nächster Monat">›</button></div>
    <div class="cal-legend">${legend}${onlyCar ? '' : '<span>🚗 = mit Auto</span>'}</div>
    <div class="cal">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<div class="cal-wd">${d}</div>`).join('')}`;
  for (let i = 0; i < 42; i++) {
    const k = addDays(startK, i);
    if (i === 35 && k.slice(0, 7) !== mon) break;          // no empty 6th row
    const list = dayOf(k), out = k.slice(0, 7) !== mon;
    const marks = list.length <= 3 ? list.map(x => mark(x.b, 17)).join('')
      : list.slice(0, 2).map(x => mark(x.b, 17)).join('') + `<span class="cal-more">+${list.length - 2}</span>`;
    const clash = list.some(x => x.b.clash);
    h += `<button class="cal-d${out ? ' out' : ''}${k < todayK ? ' past' : ''}${k === todayK ? ' today' : ''}${k === sel ? ' sel' : ''}" data-a="carday" data-k="${k}" aria-label="${longDate(k)}${list.length ? ', ' + list.length + (onlyCar ? ' Reservierung' + (list.length > 1 ? 'en' : '') : ' Termin' + (list.length > 1 ? 'e' : '')) : ', frei'}">
      <span class="cal-n">${parse(k).getDate()}</span>${clash ? '<span class="cal-clash"></span>' : ''}
      <span class="cal-cars">${marks}</span><span class="cal-strip">${strip(list)}</span></button>`;
  }
  h += `</div>`;
  // the chosen day in detail
  const list = dayOf(sel);
  h += `<div class="cal-detail"><div class="cal-dt">${esc(longDate(sel))}</div>
    <div class="cal-bar">${strip(list)}<b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b></div>
    <div class="cal-ticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
  h += list.length ? list.map(({ b }) => `<div class="cal-bk${b.clash ? ' clash' : ''}" style="--who:${b.color}">${mark(b, 26)}
      <div><div class="au-time sm">${esc(carRange(b))}${carDay(b.start) !== carDay(b.end) ? ` <span class="cal-span">${esc(carDayLabel(carDay(b.start)))} → ${esc(carDayLabel(carDay(b.end)))}</span>` : ''}</div>
      <div class="au-who"><b>${esc(b.note || (isCar(b) ? 'Auto' : 'Termin'))}</b> · ${esc(whoName(b.who))}${isCar(b) && !onlyCar ? ' · 🚗' : ''}${repTag(b)}${!b.mine ? `<div class="au-by">eingetragen von ${esc(pn())}</div>` : ''}${b.clash ? '<div class="au-warn">Auto doppelt verplant – kurz absprechen</div>' : ''}</div></div>
      ${b.mine && b.end > Car.localISO(new Date()) ? termActs(b) : ''}</div>`).join('')
    : `<p class="au-empty">${sel < todayK ? (onlyCar ? 'Da war das Auto frei.' : 'Da war nichts.') : (onlyCar ? 'Den ganzen Tag frei.' : 'Noch nichts geplant.')}</p>`;
  if (sel >= todayK) h += `<button class="au-btn ghost" data-a="carnew" data-car="${onlyCar ? 1 : 0}" data-k="${sel}">${onlyCar ? 'An diesem Tag reservieren' : 'An diesem Tag eintragen'}</button>`;
  return h + `</div>`;
}
Object.assign(A, {
  carmonth(el) {
    const [y, m] = (ui.carMonth || Car.localISO(new Date()).slice(0, 7)).split('-').map(Number);
    const d = new Date(y, m - 1 + +el.dataset.d, 1); ui.carMonth = key(d).slice(0, 7); render();
  },
  carday(el) {
    ui.carDay = el.dataset.k; if (el.dataset.k.slice(0, 7) !== (ui.carMonth || Car.localISO(new Date()).slice(0, 7))) ui.carMonth = el.dataset.k.slice(0, 7);
    render(); const d = $('.cal-detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
});
function carModal(keep = false) {
  const f = ui.carForm, auto = f.from === 'auto';
  const clash = f.clash ? `<div class="au-clash"><b>Das Auto ist da schon verplant</b>${f.clash.slice(0, 3).map(b => `<div>${esc(carDayLabel(carDay(b.start)))} · ${esc(carRange(b))} · ${esc(whoName(b.who))}${b.note ? ' · ' + esc(b.note) : ''}</div>`).join('')}${f.clash.length > 3 ? `<div>… und ${f.clash.length - 3} weitere Termine</div>` : ''}
      <div class="row"><button class="au-btn ghost" data-a="carclash">Andere Zeit</button><button class="au-btn red" data-a="carsave" data-force="1">${f.id ? 'Trotzdem speichern' : 'Trotzdem eintragen'}</button></div></div>` : '';
  const whoChips = [[D.me(), S.name || 'Mich'], [D.partner(), pn()], ['both', 'Uns beide']];
  modal(`<div class="audi au-modal"><div class="au-kicker">${auto ? 'A1 Sportback' : 'Unser Kalender'}</div><div class="au-model sm">${f.id ? (auto ? 'Reservierung ändern' : 'Termin ändern') : (auto ? 'Reservieren' : 'Neuer Termin')}</div>
    <label class="au-full"><span>${auto ? 'Wofür? (optional)' : 'Was?'}</span><input id="c-note" maxlength="40" placeholder="${auto ? 'z.B. Arzt, Einkaufen, Training' : 'z.B. Zahnarzt, Elternabend, Kino'}" value="${esc(f.note)}"></label>
    <div class="au-lbl">Für wen?</div>
    <div class="au-reps three">${whoChips.map(([v, l]) => `<button class="au-chip${f.who === v ? ' on' : ''}" type="button" data-a="termwho" data-v="${v}" style="--who:${whoColor(v)}"><i class="tdot" style="background:${whoColor(v)}"></i> ${esc(l)}</button>`).join('')}</div>
    <button class="au-chip au-cartgl${f.car ? ' on' : ''}" type="button" data-a="termcar"${f.who !== 'both' ? ' disabled' : ''}>🚗 ${f.car ? 'Braucht das Auto ✓' : 'Braucht das Auto?'}</button>
    ${f.who !== 'both' ? '<p class="au-hint">Für eine Person allein geht es hier nur ums Auto – eigene Termine kommen in euren eigenen Kalender.</p>' : ''}
    <div class="au-grid">
      <label><span>Von</span><input type="date" id="c-sd" value="${f.sd}" oninput="const e=document.getElementById('c-ed'); if(e.value<this.value) e.value=this.value"></label>
      <label><span>&nbsp;</span><input type="time" id="c-st" value="${f.st}"></label>
      <label><span>Bis</span><input type="date" id="c-ed" value="${f.ed}"></label>
      <label><span>&nbsp;</span><input type="time" id="c-et" value="${f.et}"></label>
    </div>
    <button class="au-chip" type="button" onclick="document.getElementById('c-st').value='00:00';document.getElementById('c-et').value='23:59';document.getElementById('c-ed').value=document.getElementById('c-sd').value">Ganzer Tag</button>
    <div class="au-lbl">Wiederholen</div>
    <div class="au-reps">${[['0', 'Einmal'], ['7', 'Jede Woche'], ['14', 'Alle 14 Tage'], ['c', 'Eigene…']].map(([v, l]) => `<button class="au-chip${String(f.rep || 0) === v ? ' on' : ''}" type="button" data-a="carrep" data-v="${v}">${l}</button>`).join('')}</div>
    ${f.rep === 'c' ? `<div class="au-custom"><span>Alle</span><input type="number" id="c-n" min="1" max="365" inputmode="numeric" value="${esc(f.n || 3)}">
      <select id="c-unit">${[['d', 'Tage'], ['w', 'Wochen'], ['m', 'Monate']].map(([v, l]) => `<option value="${v}"${(f.unit || 'w') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
    ${f.rep ? `<label class="au-full"><span>Bis (optional – leer = ohne Ende)</span><input type="date" id="c-until" value="${f.until || ''}"></label>` : ''}
    ${f.err ? `<div class="au-err">${esc(f.err)}</div>` : ''}
    ${clash || `<div class="row"><button class="au-btn ghost" data-a="close">Abbrechen</button><button class="au-btn" data-a="carsave">${f.id ? 'Speichern' : 'Eintragen'}</button></div>`}
  </div>`, 'au-wrap', keep);
}
// the form's repeat choice ↔ an entry's series fields
function repRule(f) {
  if (!f.rep) return {};
  if (f.rep !== 'c') return { every: f.rep };
  return f.unit === 'm' ? { everyM: f.n } : { every: f.unit === 'w' ? f.n * 7 : f.n };
}
function repForm(b) {
  if (b.everyM) return { rep: 'c', n: b.everyM, unit: 'm' };
  if (b.every === 7 || b.every === 14) return { rep: b.every };
  if (b.every) return b.every % 7 === 0 ? { rep: 'c', n: b.every / 7, unit: 'w' } : { rep: 'c', n: b.every, unit: 'd' };
  return { rep: 0 };
}
function carRead() {
  const v = id => (document.getElementById(id) || {}).value || '';
  Object.assign(ui.carForm, { sd: v('c-sd'), st: v('c-st'), ed: v('c-ed'), et: v('c-et'), note: v('c-note').trim(), until: ui.carForm.rep ? v('c-until') : '' });
  if (ui.carForm.rep === 'c' && document.getElementById('c-n')) Object.assign(ui.carForm, { n: Math.max(1, Math.min(365, Math.round(+v('c-n')) || 1)), unit: v('c-unit') || 'w' });
}
Object.assign(A, {
  carnew(el) {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    const k = el && el.dataset.k, car = !el || el.dataset.car !== '0';
    if (k && k > Car.localISO(d).slice(0, 10)) { const [y, m, dd] = k.split('-').map(Number); d.setFullYear(y, m - 1, dd); d.setHours(9); }
    const e = new Date(d); e.setHours(e.getHours() + (car ? 2 : 1));
    const a = Car.localISO(d), b = Car.localISO(e);
    ui.carForm = { sd: a.slice(0, 10), st: a.slice(11), ed: b.slice(0, 10), et: b.slice(11), note: '', who: car ? D.me() : 'both', car, from: car ? 'auto' : 'termine' };
    carModal(); syncPost();           // fresh partner entries while she fills it in
  },
  caredit(el) {
    const b = S.car.find(x => x.id === el.dataset.id && !x.del); if (!b) return;   // only what I entered lives in S.car
    ui.carForm = { id: b.id, sd: carDay(b.start), st: carTime(b.start), ed: carDay(b.end), et: carTime(b.end), note: b.note || '', until: b.until || '', who: b.who || D.me(), car: isCar(b), from: isCar(b) && b.who !== 'both' ? 'auto' : 'termine', ...repForm(b) };
    carModal(); syncPost();
  },
  carrep(el) { carRead(); const v = el.dataset.v; ui.carForm.rep = v === 'c' ? 'c' : +v; ui.carForm.clash = null; carModal(true); },
  termwho(el) { carRead(); ui.carForm.who = el.dataset.v; if (el.dataset.v !== 'both') ui.carForm.car = true; ui.carForm.clash = null; carModal(true); },
  termcar() { carRead(); if (ui.carForm.who !== 'both') return; ui.carForm.car = !ui.carForm.car; ui.carForm.clash = null; carModal(true); },
  carclash() { carRead(); ui.carForm.clash = null; carModal(true); },
  async carsave(el) {
    if (!el.dataset.force) carRead();
    const f = ui.carForm, start = f.sd + 'T' + f.st, end = f.ed + 'T' + f.et;
    const was0 = f.id && S.car.find(x => x.id === f.id && !x.del);
    const rep = repRule(f);
    const rule = { start, end, ...rep, ...(f.rep && f.until ? { until: f.until } : {}), ...(f.rep && was0 && was0.skip ? { skip: was0.skip } : {}) };
    const dates = Car.live([{ id: 'neu', ...rule }]);
    f.err = !f.sd || !f.st || !f.ed || !f.et ? 'Bitte Datum und Uhrzeit ausfüllen.' : end <= start ? 'Das Ende muss nach dem Anfang liegen.'
      : f.rep && f.until && f.until < f.sd ? 'Das „Bis“ liegt vor dem ersten Termin.' : !dates.length ? 'Das liegt schon in der Vergangenheit.'
      : !f.car && !f.note ? 'Was ist es denn? Ein Wort reicht.' : '';   // the car alone needs no title
    if (f.err) { carModal(true); return; }
    if (!el.dataset.force && f.car) {
      await syncPost();
      const clash = carAll().filter(b => !(b.mine && termKey(b) === f.id) && dates.some(d => Car.overlaps(b, d)));
      if (clash.length) { f.clash = clash; carModal(true); return; }
    }
    const old = Car.localISO(new Date(Date.now() - 30 * 864e5));
    S.car = S.car.filter(b => Car.isSeries(b) ? !b.until || b.until >= old.slice(0, 10) : !(b.end < old));        // forget long-past ones
    const was = f.id && S.car.find(x => x.id === f.id && !x.del);
    if (was) { ['every', 'everyM', 'until', 'skip'].forEach(k => delete was[k]); Object.assign(was, rule, { note: f.note, who: f.who, car: !!f.car, ts: Date.now() }); }
    else S.car.push({ id: uid(), ...rule, note: f.note, who: f.who, car: !!f.car, ts: Date.now() });
    ui.carForm = null; ui.carDay = f.sd; ui.carMonth = f.sd.slice(0, 7); closeModal(); commit(true);
    toast((f.car ? '🚗 ' : '📅 ') + (was ? 'Geändert: ' : f.from === 'auto' ? 'Reserviert: ' : 'Eingetragen: ') + (f.rep ? Car.repLabel(rep) + ' ab ' : '') + carDayLabel(f.sd) + ' ' + carRange({ start, end }));
  },
  cardel(el) {
    const b = S.car.find(x => x.id === el.dataset.id); if (!b) return;
    if (Car.isSeries(b) && el.dataset.k && !el.dataset.all) {
      const k = el.dataset.k;
      modal(`<div class="audi au-modal"><div class="au-kicker">Serie · ${esc(Car.repLabel(b))}</div><div class="au-model sm">Was löschen?</div>
        <p class="au-empty">${esc(b.note || 'Dieser Termin')} wiederholt sich ${esc(Car.repLabel(b))}.</p>
        <button class="au-btn" data-a="cardelone" data-id="${b.id}" data-k="${k}">Nur am ${esc(carDayLabel(k))}</button>
        <button class="au-btn ghost" data-a="cardel" data-all="1" data-id="${b.id}">Ganze Serie löschen</button>
        <button class="au-btn ghost" data-a="close">Abbrechen</button></div>`, 'au-wrap');
      return;
    }
    b.del = true; b.ts = Date.now();   // kept as deleted, so another device of mine can't bring it back
    closeModal(); commit(true); toast(Car.isSeries(b) ? 'Serie gelöscht' : 'Gelöscht');
  },
  cardelone(el) {
    const b = S.car.find(x => x.id === el.dataset.id); if (!b) return;
    b.skip = [...new Set([...(b.skip || []), el.dataset.k])]; b.ts = Date.now();
    closeModal(); commit(true); toast('Am ' + carDayLabel(el.dataset.k) + ' ausgelassen');
  },
});
// the partner entered something for me (or for both of us): say so once
export function newForMe() {
  const mine = [D.me(), 'both'], ids = Car.raw(S.partnerCar).map(b => b.id);
  if (!S.termSeen) { S.termSeen = ids; return []; }            // first time: no flood of old entries
  const fresh = Car.raw(S.partnerCar).filter(b => !S.termSeen.includes(b.id) && mine.includes(b.who));
  S.termSeen = [...new Set([...S.termSeen, ...ids])].slice(-300);
  return fresh;
}
