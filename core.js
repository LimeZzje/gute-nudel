// Small helpers used everywhere: $, esc, uid, dates (a day ends at 3 a.m.), commit() = save + backup + post + render,
// toasts, modals, confetti, scroll lock.
import * as C from './content.js';
import * as D from './data.js';
import { S } from './state.js';
import { postObj, shopStamp } from './sync.js';
import { checkPromotion } from './rank.js';
import { myStats } from './home.js';
import { render } from './app.js';
import { dueTag } from './faellig.js';

export const VERSION = '2026-11-04.6';

export const $ = s => document.querySelector(s);
export const tags = i => (i.chore ? choreTag(i) : i.list ? toolBtns(null, i) : '') + (i.quest ? `<span class="tag">${i.quest} Doppel-Quest</span>` : '') + (i.from ? `<span class="tag">von ${esc(i.from)}</span>` : '') + (i.back ? `<span class="tag">zurück: ${esc(i.back)}</span>` : '') + (i.urgent ? '<span class="tag hot">bitte heute</span>' : '') + dueTag(i);
const choreTag = i => { const c = S.chores.find(x => x.id === i.chore); return c ? `<span class="tag">🔁${c.reward ? ' 🎁' : ''}</span>` + toolBtns(c, i) : ''; };
// a chore's helpers as small buttons; a handed-over shopping list travels on the item itself
export const toolBtns = (c, i) => (c && c.tools || []).filter(t => C.TOOLS[t]).map(t => `<button class="toolbtn" data-a="tool" data-t="${t}" data-c="${c.id}" aria-label="${C.TOOLS[t][1]}">${C.TOOLS[t][0]}</button>`).join('')
  + (i && i.list ? `<button class="toolbtn" data-a="itemlist" data-id="${i.id}" aria-label="Einkaufsliste">🛒 ${i.list.filter(x => !x.done).length}</button>` : '');
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- days & weeks (a day ends at 3 a.m., for late evenings) ----------
export const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const today = () => key(new Date(Date.now() - 3 * 3600e3));
export const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const monday = k => { const d = parse(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return key(d); };
export const weekDays = mon => Array.from({ length: 7 }, (_, i) => { const d = parse(mon); d.setDate(d.getDate() + i); return key(d); });
export const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
export const longDate = k => { const d = parse(k); return C.DAYNAMES[d.getDay()] + ', ' + d.getDate() + '. ' + C.MONTHS[d.getMonth()]; };
export const shortDate = k => { const d = parse(k); return d.getDate() + '. ' + C.MONTHS[d.getMonth()].slice(0, 3) + (C.MONTHS[d.getMonth()].length > 4 ? '.' : ''); };
export const isWork = e => e.kind === 'task' || e.kind === 'extra';
export const isRest = e => e.kind === 'rest';
export const dayLog = k => S.log.filter(e => e.day === k);
export const workToday = () => dayLog(today()).filter(isWork);
// "Tag geschafft" only in the evening: before S.endTime (default 18:00) a ticked-off page is just "Alles abgehakt"
export const endTime = () => S.endTime || '18:00';
export const evening = () => { const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); return n.getHours() < 3 || hm >= endTime(); };
export const allTicked = () => S.today.planned && !S.items.some(i => i.where === 'heute') && workToday().length > 0;
export const dayDone = () => S.today.planned && (S.today.closed || (allTicked() && evening()));

// ---------- saving ----------
export function commit(post = false) {
  checkPromotion();
  if (shopStamp()) post = true;   // the shopping list is shared: every change goes to the partner
  S.updatedAt = Date.now();
  D.saveLocal(S);
  D.scheduleBackup(S);
  const stats = JSON.stringify(myStats());
  if (post || S.postedName !== S.name || S.postedStats !== stats) { S.postedName = S.name; S.postedStats = stats; D.schedulePost(postObj()); }
  render();
}


// ---------- little effects ----------
export function floatStar(el, txt) {
  const r = (el || $('#stars')).getBoundingClientRect(), f = document.createElement('div');
  f.className = 'floatstar'; f.textContent = txt; f.style.left = (r.left + r.width / 2 - 14) + 'px'; f.style.top = (r.top - 4) + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
}
export function confetti(n = 60) {
  const cols = ['#e0864a', '#e3a92b', '#4f9a5b', '#2f5aa8', '#c86fb0', '#f6d6bd'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = pick(cols);
    c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * .4 + 's';
    c.style.borderRadius = Math.random() < .5 ? '50%' : '2px';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3800);
  }
}
let toastT = null;
export function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
}
// a toast with "↩ rückgängig" (6 s), e.g. after taking something out of the Vorrat from a recipe
export function undoToast(msg, undo) {
  toast(msg); const t = document.querySelector('.toast'); if (!t) return;
  clearTimeout(toastT); t.classList.add('toast-u');
  const b = document.createElement('button'); b.className = 'toast-undo'; b.textContent = '↩ rückgängig';
  b.addEventListener('click', e => { e.stopPropagation(); clearTimeout(toastT); t.remove(); undo(); });
  t.appendChild(b); toastT = setTimeout(() => t.remove(), 6000);
}
export function modal(html, cls = '', keep = false) {
  const cur = $('#ov');   // keep: the open one just gets new content (no close/open flicker, scroll stays)
  if (keep && cur) { cur.querySelector('.modal').innerHTML = html; return cur; }
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'ov';
  o.innerHTML = `<div class="modal ${cls}" role="dialog">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) closeModal(); });
  document.body.appendChild(o);
  lockScroll();
  return o;
}
export function closeModal() { const o = $('#ov'); if (o) o.remove(); unlockScroll(); }
let lockedY = null;
export function lockScroll() {
  if (lockedY != null) return;
  lockedY = scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: -lockedY + 'px', left: '0', right: '0', width: '100%', overflow: 'hidden' });
}
export function unlockScroll() {
  if (lockedY == null || $('#ov')) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '', overflow: '' });
  scrollTo(0, lockedY); lockedY = null;
}
