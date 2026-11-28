// 🏷️ G43 to-do flags (his picks 2026-11-28, he is the PO): who can do it (🏠 Haushalt = either of us, 🙋 Nur ich = only
// the owner, like the routines' haus/eigen from G33) + ❗ wichtig + ⏰ dringend + 🥵 anstrengend (the old 🏋 'heavy' field,
// new emoji). Asked on one BIG card right after + (her phone is small: no chips), skippable; unflagged ones get the same
// card first in the Sprint-Planung. Order everywhere = Eisenhower: wichtig+dringend → dringend → wichtig → the rest.
// Fields on the item: own, imp, urg, heavy (all optional booleans), flagged (the card was answered once).
import { closeModal, commit, esc, modal } from './core.js';
import { A, S, ui } from './state.js';
import { dueDays } from './faellig.js';

export const URG_DAYS = 3;
export const isUrg = i => !!i.urg || (!!i.due && dueDays(i.due) <= URG_DAYS);
export const bucket = i => { const u = isUrg(i), w = !!i.imp || !!i.joy; return w && u ? 0 : u ? 1 : w ? 2 : 3; };   // joy counts as wichtig (his rule 11-27)
// stable Eisenhower sort: inside a bucket the old order (due, her rank, age) stays
export const eisen = list => list.map((i, n) => [i, n]).sort((a, b) => bucket(a[0]) - bucket(b[0]) || a[1] - b[1]).map(x => x[0]);
export const lowValue = i => i.flagged && !i.imp && !isUrg(i) && !i.joy;
// small read-only marks after the text (lists, Heute)
export const flagTags = i => i.chore ? '' : (i.imp ? '<span class="ftag" title="wichtig">❗</span>' : '') + (isUrg(i) ? '<span class="ftag" title="dringend">⏰</span>' : '')
  + (i.heavy ? '<span class="ftag" title="anstrengend">🥵</span>' : '') + (i.own ? '<span class="ftag" title="nur ich">🙋</span>' : '');

// ---------- the big card ----------
// opts: { item (own item or a plain copy of the partner's), whose (name, partner only), skip: 'Später' label or null, done(f) }
let cur = null;
const ROWS = [['own', '🙋 Kann nur ich', '🏠 Kann jeder von uns'], ['imp', '❗ Wichtig', '❗ Wichtig'], ['urg', '⏰ Dringend', '⏰ Dringend'], ['heavy', '🥵 Anstrengend', '🥵 Anstrengend']];
function draw() {
  const { it, f, whose, skip } = cur;
  modal(`<div class="flagcard">${whose ? `<p class="sp-who">${esc(whose)}</p>` : ''}<p class="psort-t">${esc(it.text)}</p>
    ${ROWS.map(([k, on, off]) => `<button class="flagrow${f[k] ? ' on' : ''}" data-a="flagtog" data-k="${k}" aria-pressed="${!!f[k]}"><span>${f[k] ? on : off}</span><b>${k === 'own' ? '⇄' : f[k] ? 'Ja' : 'Nein'}</b></button>`).join('')}
    <button class="btn wide" data-a="flagok">Passt</button>
    ${skip ? `<p style="text-align:center;margin:10px 0 0"><button class="sc-undo" data-a="flagskip">${esc(skip)}</button></p>` : ''}</div>`, '', true);
}
export function askFlags(it, opts = {}) {
  cur = { it, whose: opts.whose || '', skip: opts.skip === undefined ? 'Später' : opts.skip, done: opts.done || null,
    f: { own: !!it.own, imp: !!it.imp, urg: !!it.urg, heavy: !!it.heavy } };
  draw();
}
export const setFlags = (it, f) => { for (const k of ['own', 'imp', 'urg', 'heavy']) { if (f[k]) it[k] = true; else delete it[k]; } it.flagged = true; };

Object.assign(A, {
  flagtog(el) { if (!cur) return; const k = el.dataset.k; cur.f[k] = !cur.f[k]; draw(); },
  flagok() {
    if (!cur) return; const c = cur; cur = null;
    if (c.done) return c.done(c.f);
    const it = S.items.find(i => i.id === c.it.id); if (it) setFlags(it, c.f);
    closeModal(); commit();
  },
  flagedit(el) { const it = S.items.find(i => i.id === el.dataset.id); if (it && !it.chore) askFlags(it, { skip: 'Abbrechen' }); },   // tap a to-do's text: the same card
  flagskip() { if (!cur) return; const c = cur; cur = null; if (c.done) return c.done(null); closeModal(); },
});
// right after + on any to-do field
export function askNew(id) { const it = S.items.find(i => i.id === id); if (it && !ui.noFlagAsk) askFlags(it); }
