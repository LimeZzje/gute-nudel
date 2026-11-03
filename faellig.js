// FÄLLIG: optional due dates (G13, 2026-11-04.2) on to-dos (S.items) only (G16: her own 🛋️ rituals have none any more).
// Save shape: one optional field `due` = 'YYYY-MM-DD' on an item (absent = no date). Old versions ignore it; an old `due`
// on a ritual is simply ignored. The "day before" reminder: the in-app card (dueCard) on Home and HEUTE, plus (G16, opt-in)
// a real push at 18:00 through the Gute Nudel push worker (E:\GuteNudel-push). Only task texts + dates + the push
// subscription leave the phone; the device id is a random uuid.
import { closeModal, commit, esc, modal, parse, shortDate, toast, today, addDays, $ } from './core.js';
import { A, S } from './state.js';
import { render } from './app.js';

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
export const dueBtns = x => `<button class="mini-btn" data-a="duepick" data-id="${x.id}" aria-label="Fällig am" title="Fällig am">📅</button>`
  + (x.due && dueDays(x.due) <= 1 ? `<button class="mini-btn" data-a="snooze" data-id="${x.id}" aria-label="Eine Woche später" title="Eine Woche später">💤</button>` : '');
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
const find = el => S.items.find(x => x.id === el.dataset.id);
// every dated task (chores never carry one): text + date, the only thing the push worker gets
export const dueList = () => S.items.filter(i => i.due && !i.chore && ISO.test(i.due)).map(i => ({ t: String(i.text || '').slice(0, 80), k: i.due })).sort((a, b) => a.k.localeCompare(b.k));

// the "day before" reminder: due today / tomorrow / overdue, as one quiet card (+ the push opt-in the first time a date is set)
export function dueCard() {
  const all = dueList();
  const grp = (lbl, fn, cls) => { const l = all.filter(x => fn(dueDays(x.k))); return l.length ? `<div class="due-line ${cls}"><b>${lbl}</b> ${l.slice(0, 4).map(x => esc(x.t)).join(' · ')}${l.length > 4 ? ' …' : ''}</div>` : ''; };
  const h = grp('Überfällig:', n => n < 0, 'late') + grp('Heute fällig:', n => n === 0, 'soon') + grp('Morgen fällig:', n => n === 1, '');
  return pushOptin() + (h ? `<div class="card due-card">${h}</div>` : '');
}

Object.assign(A, {
  duepick(el) {
    const x = find(el); if (!x) return;
    modal(`<h2>📅 Fällig am</h2><p class="muted">${esc(x.text)}</p>
      <input type="date" id="dueIn" class="due-in big" value="${x.due || ''}" aria-label="Datum">
      <div class="row"><button class="btn green" data-a="duesave" data-id="${x.id}">Speichern</button></div>
      <div class="row">${x.due ? `<button class="btn soft" data-a="snooze" data-id="${x.id}">💤 Eine Woche später</button><button class="btn soft" data-a="dueclear" data-id="${x.id}">Kein Datum</button>` : ''}<button class="btn soft" data-a="close">Zu</button></div>`);
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

// ---------- push (G16): the day-before reminder as a real notification ----------
// Worker routes: POST /subscribe {id, sub, dues} · POST /dues {id, dues} · DELETE /subscribe {id}. It sends once a day
// (18:00 Berlin) "Morgen fällig: …" / "Heute fällig: …" / "Überfällig: …" and nothing when nothing is due.
// localStorage (this phone only, never in the save): gn_push = '' (not asked) | 'on' | 'off', gn_push_id = random uuid,
// gn_push_sent = what the worker already has (endpoint + dues), so only changes travel. Tests: gn_push_api / gn_push_key.
export const VAPID_PUBLIC = '';   // the worker's public key, set at the deploy (E:\GuteNudel-push\DEPLOY.md); empty = push stays hidden
const PUSH_API = () => localStorage.getItem('gn_push_api') || 'https://gute-nudel-push.gutenudel.workers.dev';
const pushKey = () => localStorage.getItem('gn_push_key') || VAPID_PUBLIC;
export const pushState = () => localStorage.getItem('gn_push') || '';
export const pushCan = () => !!pushKey() && 'Notification' in window && (!!window.__gnPushMgr || ('serviceWorker' in navigator && 'PushManager' in window));
const pushMgr = async () => window.__gnPushMgr   // tests hand in a fake push manager (headless Chrome has no push service)
  || (await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('no sw')), 8000))])).pushManager;
const devId = () => { let id = localStorage.getItem('gn_push_id'); if (!id) { id = crypto.randomUUID(); localStorage.setItem('gn_push_id', id); } return id; };
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const call = (method, path, body) => fetch(PUSH_API() + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// the friendly question: only once a task has a date (so never on first open), only until she answered
export function pushOptin() {
  if (pushState() || !pushCan() || !S.items.some(i => i.due && !i.chore)) return '';
  return `<div class="card push-optin"><p class="hand push-q">Soll ich dich am Tag vorher erinnern?</p>
    <p class="muted">Dann kommt am Abend vorher eine kleine Nachricht aufs Handy. Dafür gehen nur die Aufgabe und das Datum an den Erinnerungs-Dienst.</p>
    <div class="row"><button class="btn green" data-a="pushyes">Ja, gern 🔔</button><button class="btn soft" data-a="pushno">Nein danke</button></div></div>`;
}

// after every commit / at start: the due list to the worker, debounced, only when something changed. Never a toast:
// offline or a worker that is not deployed yet = silent, the next change or start tries again.
let pushT = 0;
export function pushSync() {
  if (pushState() !== 'on' || !pushCan()) return;
  clearTimeout(pushT); pushT = setTimeout(() => pushSend(false), 1500);
}
async function pushSend(ask) {
  try {
    const mgr = await pushMgr();
    let sub = await mgr.getSubscription();
    if (!sub) { if (!ask && Notification.permission !== 'granted') return false; sub = await mgr.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(pushKey()) }); }
    const j = sub.toJSON ? sub.toJSON() : sub, dues = dueList(), last = JSON.parse(localStorage.getItem('gn_push_sent') || 'null');
    if (last && last.e === j.endpoint && JSON.stringify(last.d) === JSON.stringify(dues)) return true;
    let r = last && last.e === j.endpoint ? await call('POST', '/dues', { id: devId(), dues }) : null;
    if (!r || r.status === 404) r = await call('POST', '/subscribe', { id: devId(), sub: { endpoint: j.endpoint, keys: j.keys }, dues });
    if (r.ok) localStorage.setItem('gn_push_sent', JSON.stringify({ e: j.endpoint, d: dues }));
    return r.ok;
  } catch (e) { return false; }
}
export async function pushOn() {
  let p = 'denied'; try { p = await Notification.requestPermission(); } catch (e) {}
  if (p !== 'granted') { localStorage.setItem('gn_push', 'off'); render(); toast('Okay – dann erinnert dich die Karte hier in der App 💛'); return false; }
  localStorage.setItem('gn_push', 'on'); localStorage.removeItem('gn_push_sent'); render();
  toast('Mach ich – am Abend vorher kommt eine Nachricht 🔔');
  pushSend(true);
  return true;
}
export async function pushOff() {
  localStorage.setItem('gn_push', 'off'); localStorage.removeItem('gn_push_sent'); clearTimeout(pushT);
  try { call('DELETE', '/subscribe', { id: devId() }).catch(() => {}); const s = await (await pushMgr()).getSubscription(); if (s) await s.unsubscribe(); } catch (e) {}
}
export const pushLabel = () => pushState() === 'on' ? '🔔 Erinnerung am Tag vorher: an' : '🔕 Erinnerung am Tag vorher: aus';
Object.assign(A, {
  pushyes() { pushOn(); },
  pushno() { localStorage.setItem('gn_push', 'off'); render(); toast('Alles klar – die Karte hier in der App reicht 💛'); },
  async pushtoggle(el) {
    if (pushState() === 'on') await pushOff(); else await pushOn();
    el.textContent = pushLabel();
  },
});
