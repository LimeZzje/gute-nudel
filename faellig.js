// FÄLLIG: optional due dates (G13, 2026-11-04.2) on to-dos (S.items) and her own rewards (S.myRituals, the 🛋️ rituals).
// Save shape: one optional field `due` = 'YYYY-MM-DD' on an item / ritual (absent = no date). Old versions ignore it.
// No push / Notification API: the "day before" reminder is an in-app card (dueCard) on Home and HEUTE.
import { closeModal, commit, esc, modal, parse, shortDate, toast, today, addDays, $ } from './core.js';
import { A, S } from './state.js';

const ISO = /^\d{4}-\d\d-\d\d$/;
export const SNOOZE_DAYS = 7;
export const SOON = 2;   // the builder puts things due within this many days on top (suggestion only)

// days from today to k (negative = overdue)
export const dueDays = k => Math.round((parse(k) - parse(today())) / 864e5);
export function dueWord(k) {
  const n = dueDays(k);
  return n < -1 ? 'überfällig seit ' + shortDate(k) : n === -1 ? 'seit gestern überfällig' : n === 0 ? 'heute fällig' : n === 1 ? 'morgen fällig' : 'fällig ' + shortDate(k);
}
// the date chip (a plain span: it also sits inside the builder's pick buttons)
export const dueTag = x => x && x.due ? `<span class="tag due ${dueDays(x.due) < 0 ? 'late' : dueDays(x.due) <= 1 ? 'soon' : ''}">📅 ${esc(dueWord(x.due))}</span>` : '';
// small buttons next to a row: 📅 set/change the date, 💤 a week later (only when it is due soon or overdue)
export const dueBtns = (x, kind = 'item') => `<button class="mini-btn" data-a="duepick" data-id="${x.id}" data-k="${kind}" aria-label="Fällig am" title="Fällig am">📅</button>`
  + (x.due && dueDays(x.due) <= 1 ? `<button class="mini-btn" data-a="snooze" data-id="${x.id}" data-k="${kind}" aria-label="Eine Woche später" title="Eine Woche später">💤</button>` : '');
// the builder's order: due soon / overdue first (earliest first), everything else keeps its order — a suggestion, never a rule
export const dueSort = list => {
  const hot = x => x.due && dueDays(x.due) <= SOON;
  return list.filter(hot).sort((a, b) => a.due.localeCompare(b.due)).concat(list.filter(x => !hot(x)));
};
// the date input next to an add field; read it (and clear it) on submit
export const dueField = () => `<input type="date" name="due" class="due-in" aria-label="Fällig am (optional)" title="Fällig am (optional)">`;
export function readDue(form) {
  const f = form && form.elements && form.elements.due; if (!f) return undefined;
  const v = ISO.test(f.value) ? f.value : undefined; f.value = ''; return v;
}
const find = el => (el.dataset.k === 'ritual' ? S.myRituals || [] : S.items).find(x => x.id === el.dataset.id);   // k: item | ritual (her own 🛋️ rewards)

// the "day before" reminder: due today / tomorrow / overdue, as one quiet card (no permission prompt, no notification)
export function dueCard() {
  const all = S.items.filter(i => i.due && !i.chore).map(i => ({ t: i.text, k: i.due })).concat((S.myRituals || []).filter(r => r.due).map(r => ({ t: r.icon + ' ' + r.title, k: r.due })));
  const grp = (lbl, fn, cls) => { const l = all.filter(x => fn(dueDays(x.k))); return l.length ? `<div class="due-line ${cls}"><b>${lbl}</b> ${l.slice(0, 4).map(x => esc(x.t)).join(' · ')}${l.length > 4 ? ' …' : ''}</div>` : ''; };
  const h = grp('Überfällig:', n => n < 0, 'late') + grp('Heute fällig:', n => n === 0, 'soon') + grp('Morgen fällig:', n => n === 1, '');
  return h ? `<div class="card due-card">${h}</div>` : '';
}

Object.assign(A, {
  duepick(el) {
    const x = find(el); if (!x) return;
    modal(`<h2>📅 Fällig am</h2><p class="muted">${esc(x.text || x.title)}</p>
      <input type="date" id="dueIn" class="due-in big" value="${x.due || ''}" aria-label="Datum">
      <div class="row"><button class="btn green" data-a="duesave" data-id="${x.id}" data-k="${el.dataset.k}">Speichern</button></div>
      <div class="row">${x.due ? `<button class="btn soft" data-a="snooze" data-id="${x.id}" data-k="${el.dataset.k}">💤 Eine Woche später</button><button class="btn soft" data-a="dueclear" data-id="${x.id}" data-k="${el.dataset.k}">Kein Datum</button>` : ''}<button class="btn soft" data-a="close">Zu</button></div>`);
  },
  duesave(el) {
    const x = find(el), v = ($('#dueIn') || {}).value; closeModal(); if (!x) return;
    if (ISO.test(v || '')) x.due = v; else delete x.due;
    commit();
  },
  dueclear(el) { const x = find(el); closeModal(); if (x) { delete x.due; commit(); } },
  // one tap: due + 7 days (an overdue one counts from today, so it does not stay overdue)
  snooze(el) {
    const x = find(el); closeModal(); if (!x || !x.due) return;
    x.due = addDays(dueDays(x.due) < 0 ? today() : x.due, SNOOZE_DAYS); commit();
    toast('Eine Woche später – ' + dueWord(x.due) + ' 💤');
  },
});
