// 📚 G35 three piles on the Liste: Diese Woche (open) · Diesen Monat · Irgendwann (closed doors, no counts).
// Item fields (additive, old versions just show everything as before): pile 'woche'|'monat'|'spaeter' (none = not sorted
// yet), pileTs (when it got its pile), heavy 🥵 (anstrengend, G43), joy 💛, rank (order inside Diese Woche, from "Was zuerst?"), oldAsked.
// A dated to-do follows its date: within 7 days it is in the week pile whatever its pile says.
import { closeModal, commit, esc, modal, monday, tags, today, toast, undoToast } from './core.js';
import { A, S, ui } from './state.js';
import * as D from './data.js';
import { dueBtns, dueDays, dueField, dueSort } from './faellig.js';
import { pn } from './sync.js';
import { render } from './app.js';
import { bzOn } from './babyzeit.js';

export const WEEK_DAYS = 7, OLD_DAYS = 21, PAIRS_MAX = 7;
const PILES = { woche: 'Diese Woche', monat: 'Diesen Monat', spaeter: 'Irgendwann' };
const listed = () => S.items.filter(i => i.where === 'liste');
export const inWeek = i => i.pile === 'woche' || !!i.chore || (!!i.due && dueDays(i.due) <= WEEK_DAYS);
export const unsorted = i => !i.pile && !inWeek(i);
const byRank = (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (a.created || 0) - (b.created || 0);
export const weekPile = () => dueSort(listed().filter(inWeek).sort(byRank));
export const pileOf = k => listed().filter(i => i.pile === k && !inWeek(i)).sort(byRank);
export const weekCount = () => listed().filter(inWeek).length;
const isOld = i => i.pile === 'woche' && !i.oldAsked && !i.due && Date.now() - (i.pileTs || i.created || Date.now()) > OLD_DAYS * 864e5;

const marks = () => '';   // 💛/🥵 live on the big card now (tap the to-do), no small buttons on her small phone (2026-11-28)
const row = (i, week) => `<div class="item"><button class="chk" data-a="toheute" data-id="${i.id}" aria-label="Für heute einplanen" title="Für heute">☀</button><div class="txt ${i.carried ? 'carried' : ''}"><span${i.chore ? '' : ` class="ftxt" data-a="flagedit" data-id="${i.id}"`}>${esc(i.text)}</span>${tags(i, true)}${week ? marks(i) : ''}</div>${dueBtns(i)}${week ? '' : `<button class="mini-btn" data-a="pmove" data-id="${i.id}" data-v="woche" aria-label="In diese Woche" title="In diese Woche">↑</button>`}<button class="mini-btn" data-a="del" data-id="${i.id}" aria-label="Löschen">✕</button></div>`;

export function viewPiles() {
  const week = weekPile(), loose = dueSort(listed().filter(unsorted)), monat = pileOf('monat');
  let h = `<section class="pad"><h2>Diese Woche</h2><p class="sub">Was diese Woche dran sein darf. Nichts davon muss heute passieren.</p>`;
  h += week.map(i => row(i, true)).join('');
  if (!week.length) h += `<p class="muted">Diese Woche ist nichts eingeplant. Wie schön.</p>`;
  h += `<form class="add" data-f="addlist"><input name="t" placeholder="Neue Aufgabe…" autocomplete="off" enterkeyhint="done">${dueField()}<button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
  if (week.filter(i => !i.chore).length >= 3) h += `<button class="btn soft wide" data-a="pairs" style="margin-top:10px">↕ Was zuerst?</button>`;
  if (monat.length && S.pileWeek !== monday(today())) h += `<p class="pweek"><button class="sc-undo" data-a="pweek">Etwas aus „Diesen Monat“ in diese Woche holen?</button></p>`;
  if (loose.length) {
    h += `<div class="ploose"><p class="muted" style="font-weight:800;margin:16px 0 4px">Noch nicht einsortiert</p>${loose.map(i => row(i, false)).join('')}
      <button class="btn soft wide" data-a="psortstart" style="margin-top:8px">📚 Liste sortieren</button></div>`;
  }
  for (const k of ['monat', 'spaeter']) {
    const open = ui.pileOpen === k, list = pileOf(k);
    h += `<button class="pdoor ${open ? 'open' : ''}" data-a="pdoor" data-v="${k}">${k === 'monat' ? '📦' : '🌙'} ${PILES[k]}<span>${open ? '▾' : '›'}</span></button>`;
    if (open) h += `<div class="ppile">${list.map(i => row(i, false)).join('') || '<p class="muted">Leer.</p>'}</div>`;
  }
  if (D.canPost() && S.items.length) h += bzOn() ? `<p style="text-align:center;margin:12px 0 0"><button class="sc-undo" data-a="delegate">🤝 An ${esc(pn())} abgeben</button></p>` : `<button class="btn soft wide" data-a="delegate" style="margin-top:12px">🤝 An ${esc(pn())} abgeben</button>`;
  h += `<p class="hint">Mit ☀ kommt eine Aufgabe auf die Seite von heute. Aufgabe antippen: 🙋 nur ich, ❗ wichtig, ⏰ dringend, 🥵 anstrengend, 💛 macht Freude.</p></section>`;
  return h;
}

// ---------- the sorting session: one card at a time, stop whenever ----------
function sortQueue() { return [...dueSort(listed().filter(unsorted)), ...listed().filter(isOld)].map(i => i.id); }
function sortStep() {
  const q = ui.psort.q.filter(id => S.items.some(i => i.id === id && i.where === 'liste'));
  ui.psort.q = q;
  if (!q.length) { closeModal(); ui.psort = null; toast('Alles einsortiert. ✨'); render(); return; }
  const it = S.items.find(i => i.id === q[0]), old = isOld(it);
  const btn = (v, l, cls = '') => `<button class="btn ${cls} wide" data-a="psort" data-v="${v}">${l}</button>`;
  modal(`<div class="psort"><p class="muted" style="margin:0">noch ${q.length}</p>
    <p class="psort-t">${esc(it.text)}</p>
    ${old ? `<p class="muted" style="margin:0 0 8px">Noch gewollt?</p>${btn('woche', 'Bleibt')}${btn('spaeter', 'Irgendwann', 'soft')}${btn('weg', 'Weg damit', 'soft')}`
      : `${btn('woche', 'Diese Woche')}${btn('monat', 'Diesen Monat', 'blue')}${btn('spaeter', 'Irgendwann', 'soft')}${btn('weg', 'Brauch ich nicht mehr', 'soft')}`}
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="psortstop">Pause – später weiter</button></p></div>`);
}
export function setPile(it, k) { it.pile = k; it.pileTs = Date.now(); }

// ---------- "Was zuerst?": two at a time, from the bottom up (at most PAIRS_MAX questions) ----------
function pairStep() {
  const P = ui.ppairs;
  if (P.i < 0 || P.asked >= PAIRS_MAX) {
    const ids = P.ids, rest = weekPile().filter(i => !ids.includes(i.id)).sort(byRank);
    ids.forEach((id, n) => { const i = S.items.find(x => x.id === id); if (i) i.rank = n; });
    rest.forEach((i, n) => { i.rank = ids.length + n; });
    ui.ppairs = null; closeModal(); commit(); toast('Reihenfolge gemerkt 💛'); return;
  }
  const a = S.items.find(i => i.id === P.ids[P.i]), b = S.items.find(i => i.id === P.ids[P.i + 1]);
  if (!a || !b) { P.i--; return pairStep(); }
  modal(`<div class="psort"><p class="muted" style="margin:0">Was zuerst?</p>
    <button class="btn wide ppair" data-a="ppick" data-v="a">${esc(a.text)}</button>
    <button class="btn wide ppair" data-a="ppick" data-v="b">${esc(b.text)}</button>
    <p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="ppairstop">Reicht für jetzt</button></p></div>`);
}

Object.assign(A, {
  pdoor(el) { ui.pileOpen = ui.pileOpen === el.dataset.v ? null : el.dataset.v; render(); },
  pweek() { S.pileWeek = monday(today()); ui.pileOpen = 'monat'; commit(); },
  pmove(el) { const i = S.items.find(x => x.id === el.dataset.id); if (!i) return; setPile(i, el.dataset.v); commit(); toast('In „' + PILES[el.dataset.v] + '“'); },
  pjoy(el) { const i = S.items.find(x => x.id === el.dataset.id); if (!i) return; if (i.joy) delete i.joy; else i.joy = true; commit(); },
  pheavy(el) { const i = S.items.find(x => x.id === el.dataset.id); if (!i) return; if (i.heavy) delete i.heavy; else i.heavy = true; commit(); },
  psortstart() { ui.psort = { q: sortQueue() }; sortStep(); },
  psortstop() { ui.psort = null; closeModal(); render(); },
  psort(el) {
    const id = ui.psort && ui.psort.q[0], it = id && S.items.find(i => i.id === id); if (!it) return;
    const v = el.dataset.v;
    if (isOld(it)) it.oldAsked = true;
    if (v === 'weg') {
      const at = S.items.indexOf(it); S.items = S.items.filter(i => i !== it); commit();
      undoToast('Weg: ' + it.text, () => { S.items.splice(Math.min(at, S.items.length), 0, it); commit(); });
    } else { setPile(it, v); commit(); }
    ui.psort.q.shift(); sortStep();
  },
  pairs() {
    const ids = weekPile().filter(i => !i.chore).slice(0, PAIRS_MAX + 1).map(i => i.id);
    ui.ppairs = { ids, i: ids.length - 2, asked: 0 }; pairStep();
  },
  ppick(el) {
    const P = ui.ppairs; if (!P) return;
    if (el.dataset.v === 'b') { const t = P.ids[P.i]; P.ids[P.i] = P.ids[P.i + 1]; P.ids[P.i + 1] = t; }
    P.i--; P.asked++; pairStep();
  },
  ppairstop() { if (ui.ppairs) { ui.ppairs.i = -1; pairStep(); } },
});
