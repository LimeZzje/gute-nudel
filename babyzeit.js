// 👶 G37 Baby-Zeit: each household routine belongs to ONE of the two, decided ahead, valid from the next morning.
// No handover moment, no "übernommen", no trace on her phone: a routine simply lives in exactly one person's S.chores.
// Moving one = an offer through the post (c.giveTo / c.giveAt / c.gv on the giver's copy, hidden there from giveAt on);
// the other phone adopts it on or after giveAt (same id, rhythm, last date, parts) and confirms (adopted {id, gv});
// only then the giver drops its copy. So it can pause for a day if a phone is offline, but it is never lost.
// He asks for one of hers with a "want" (her phone turns it into an offer). He can tick one of hers: "doneFor".
// State: S.bz = {on, review, u} (the newer of both phones wins), S.partnerBz, S.partnerHaus, S.adopted, S.bzWant, S.bzDone, S.pdoneSeen.
import * as D from './data.js';
import { addDays, commit, esc, longDate, shortDate, today, toast, uid, workToday } from './core.js';
import { A, S, ui } from './state.js';
import * as C from './content.js';
import { choreDone, choreNext, isDaily, plannedDay } from './chores.js';
import { earn, pn } from './sync.js';

export const BZ_REVIEW = '2027-02-15';   // a few weeks after the birth (10 Jan 2027)
const bzState = () => { const a = S.bz || {}, b = S.partnerBz || {}; return (b.u || 0) > (a.u || 0) ? b : a; };
export const bzOn = () => !!bzState().on;
export const isHaus = c => !!c && c.kind === 'haus';   // marked 🏠 Haushalt (G33 chip); own routines never move
export const leaving = (c, d = today()) => !!(c && c.giveTo && c.giveAt && d >= c.giveAt);
const isHim = () => D.me() !== 'stand';
const nm = who => who === D.me() ? (S.name || 'Ich') : pn();

// ---------- what travels in the post ----------
export function bzPost() {
  const t = today();
  return {
    bz: S.bz || null,
    haus: S.chores.filter(c => isHaus(c) && !leaving(c)).map(c => ({ id: c.id, name: c.name, icon: c.icon, next: plannedDay(c.id, t) || choreNext(c) })),
    give: S.chores.filter(c => c.giveTo && c.giveTo !== D.me()).map(c => { const x = JSON.parse(JSON.stringify(c)); return x; }),
    adopted: (S.adopted || []).slice(-60),
    want: (S.bzWant || []).filter(w => Date.now() - w.ts < 30 * 864e5),
    doneFor: (S.bzDone || []).filter(x => x.day >= addDays(t, -3)),
  };
}
// ---------- the partner's post arrives ----------
export function bzReceive(p) {
  let ch = false; const t = today(), me = D.me();
  if ('bz' in p && JSON.stringify(p.bz || null) !== JSON.stringify(S.partnerBz || null)) { S.partnerBz = p.bz || null; ch = true; }
  if (p.haus && JSON.stringify(p.haus) !== JSON.stringify(S.partnerHaus || [])) { S.partnerHaus = p.haus; ch = true; }
  // adopt offers made to me, from their day on (exactly once per offer)
  for (const o of p.give || []) {
    if (!o || o.giveTo !== me || !o.giveAt || t < o.giveAt) continue;
    if ((S.adopted || []).some(a => a.id === o.id && a.gv === o.gv)) continue;
    const mine = S.chores.find(c => c.id === o.id), copy = JSON.parse(JSON.stringify(o));
    delete copy.giveTo; delete copy.giveAt; delete copy.gv;
    if (mine) { Object.keys(mine).forEach(k => { if (k !== 'id') delete mine[k]; }); Object.assign(mine, copy); } else S.chores.push(copy);
    S.adopted = (S.adopted || []).concat([{ id: o.id, gv: o.gv }]).slice(-60);
    S.bzWant = (S.bzWant || []).filter(w => w.id !== o.id);
    ch = true;
  }
  // my offers the partner confirmed: now my copy goes (never before)
  const conf = new Set((p.adopted || []).map(a => a.id + '|' + a.gv));
  const drop = S.chores.filter(c => c.giveTo && c.giveTo !== me && conf.has(c.id + '|' + c.gv));
  if (drop.length) { const ids = new Set(drop.map(c => c.id)); S.chores = S.chores.filter(c => !ids.has(c.id)); S.items = S.items.filter(i => !(i.chore && ids.has(i.chore) && i.where === 'heute')); ch = true; }
  // he asked for one of mine → it becomes an offer from tomorrow
  for (const w of p.want || []) {
    const c = S.chores.find(x => x.id === w.id);
    if (!c || w.to === me || c.gv === w.ts || (c.giveTo && c.giveTo === w.to)) continue;
    c.giveTo = w.to; c.giveAt = w.at > t ? w.at : addDays(t, 1); c.gv = w.ts; ch = true;
  }
  // he did one of mine: done here too, without a name, no star on my side
  for (const x of p.doneFor || []) {
    if ((S.pdoneSeen || []).includes(x.id)) continue;
    S.pdoneSeen = (S.pdoneSeen || []).concat([x.id]).slice(-200); ch = true;
    const c = S.chores.find(y => y.id === x.cid);
    if (!c || S.log.some(e => e.day === x.day && e.chore === c.id)) continue;
    S.log.push({ id: x.id, text: c.name, kind: 'pdone', day: x.day, ts: Date.now(), stars: 0, chore: c.id, prevLast: c.last || null, prevMoved: c.moved || null });
    choreDone(c, x.day);
    if (x.day === t) S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute'));
  }
  return ch;
}

// ---------- his Routinen page: every household routine of both, with a two-way chip ----------
export function bzCard() {
  if (!bzOn() || !isHim()) return '';
  const t = today(), tm = addDays(t, 1), me = D.me(), her = D.partner();
  const chips = (id, own, who, pend) => [her, me].map(w => `<button class="chip ${who === w ? 'on' : ''}" data-a="bzto" data-id="${esc(id)}" data-own="${own ? 1 : 0}" data-v="${w}">${esc(nm(w))}</button>`).join('') + (pend ? `<span class="muted bz-pend">ab ${esc(shortDate(pend))}</span>` : '');
  const mine = S.chores.filter(isHaus);
  const rows = mine.map(c => { const pend = c.giveTo && c.giveTo !== me ? c.giveAt : null;
    return `<li><span class="bz-n">${esc(c.icon)} ${esc(c.name)}</span><span class="chips">${chips(c.id, true, pend ? c.giveTo : me, pend)}</span></li>`; });
  const hers = (S.partnerHaus || []).map(h => { const w = (S.bzWant || []).find(x => x.id === h.id);
    const doneNow = (S.bzDone || []).some(x => x.cid === h.id && x.day === t);
    return `<li><span class="bz-n">${esc(h.icon)} ${esc(h.name)} <span class="muted">· ${esc(h.next === t ? 'heute' : h.next === tm ? 'morgen' : shortDate(h.next || t))}</span></span><span class="chips">${chips(h.id, false, w ? me : her, w ? w.at : null)}${doneNow ? '<span class="muted">✓</span>' : `<button class="mini-btn" data-a="bzdone" data-id="${esc(h.id)}" aria-label="Hab ich erledigt" title="Hab ich erledigt">✓</button>`}</span></li>`; });
  const review = bzState().review && t >= bzState().review ? `<div class="bz-review"><b>Baby-Zeit: passt die Aufteilung noch?</b><button class="btn soft" data-a="bzreview">Passt so</button></div>` : '';
  return `<div class="card bz">${review}<h3>👶 Haushalt in der Baby-Zeit</h3><p class="muted" style="margin-top:0">Wer macht was – gilt ab dem nächsten Morgen.</p>
    <ul class="list-plain bz-list">${rows.join('')}${hers.join('')}</ul>${!rows.length && !hers.length ? '<p class="muted">Noch keine Haushalts-Routinen.</p>' : ''}</div>`;
}
// ---------- her routine editor: one quiet choice ----------
export const bzEditorChip = e => bzOn() && e.id && e.kind === 'haus' ? `<div class="chips" style="margin-top:8px"><button class="chip ${e.bz ? 'on' : ''}" data-a="cebz">👶 läuft in der Baby-Zeit über ${esc(pn())}</button></div>` : '';
export function bzEditorSave(c, want) {
  const t = today();
  if (want && !c.giveTo) { c.giveTo = D.partner(); c.giveAt = addDays(t, 1); c.gv = Date.now(); }
  else if (!want && c.giveTo && c.giveAt > t) { delete c.giveTo; delete c.giveAt; delete c.gv; }
}
// ---------- settings ----------
export const bzSettings = () => `<div class="row"><button class="btn soft" data-a="bztoggle" id="s-bz">👶 Baby-Zeit: ${bzOn() ? 'an' : 'aus'}</button></div>
  <label class="field"><span>Baby-Zeit überprüfen am</span><input id="s-bzrev" type="date" value="${esc(bzState().review || BZ_REVIEW)}" data-ch="bzrev"></label>`;

Object.assign(A, {
  bztoggle() { const on = !bzOn(); S.bz = { on, review: bzState().review || BZ_REVIEW, u: Date.now() }; commit(true); const b = document.getElementById('s-bz'); if (b) b.textContent = '👶 Baby-Zeit: ' + (on ? 'an' : 'aus'); },
  bzrev(el) { if (!el.value) return; S.bz = Object.assign({}, bzState(), { review: el.value, u: Date.now() }); commit(true); },
  bzreview() { S.bz = Object.assign({}, bzState(), { review: addDays(today(), 28), u: Date.now() }); commit(true); },
  bzto(el) {
    const id = el.dataset.id, v = el.dataset.v, me = D.me(), t = today(), tm = addDays(t, 1);
    if (el.dataset.own === '1') {
      const c = S.chores.find(x => x.id === id); if (!c) return;
      if (v !== me && !c.giveTo) { c.giveTo = v; c.giveAt = tm; c.gv = Date.now(); }
      else if (v === me && c.giveTo) { if (c.giveAt > t) { delete c.giveTo; delete c.giveAt; delete c.gv; } else { toast('Läuft schon – ab morgen bei ' + nm(c.giveTo) + '.'); return; } }
    } else {
      S.bzWant = (S.bzWant || []).filter(w => w.id !== id);
      if (v === me) S.bzWant.push({ id, to: me, at: tm, ts: Date.now() });
    }
    commit(true);
  },
  bzdone(el) {   // he did one of hers: his star (inside the cap), her phone marks it done without a name
    const h = (S.partnerHaus || []).find(x => x.id === el.dataset.id); if (!h) return;
    const t = today(), stars = workToday().length < C.CAP ? 1 : 0;
    S.log.push({ id: uid(), text: h.name, kind: 'task', day: t, ts: Date.now(), stars });
    earn(stars);
    S.bzDone = (S.bzDone || []).concat([{ id: uid(), cid: h.id, day: t }]).slice(-60);
    commit(true); toast('✓ ' + h.name);
  },
});
