// 🗓️ Wochenplan: up to 7 recipes on days, its banner and swipe view.
import * as C from './content.js';
import { addDays, closeModal, commit, esc, modal, parse, shortDate, toast, today } from './core.js';
import { A, S, ui } from './state.js';
import { cookedLog, recipeById } from './kochbuch.js';
import { deckCard, viewHome } from './home.js';
import { render, start } from './app.js';

// ---------- 🗓️ Wochenplan (Julia 2026-10-30): up to 7 recipes, each on a day, from the day the first one is pinned ----------
// Cooking a planned dish (either phone, any day of the plan) ticks it. Over after its 7th day, or when all 7 days are planned
// and cooked → "Neue Woche planen" / "Gleiche nochmal". Edits never move the start (user's pick). Shared like the Picnic slot:
// post.plan, the newer `u` wins (both phones may plan); a reset is {start: null}, so it travels too.
export const PLAN_N = 7;
export const dayStart = k => parse(k).getTime() + 3 * 3600e3;   // a day runs until 3 am, like today()
export function planNow() {   // → null (no plan) or {start, end, days[7], done[7], n, cooked, over}
  const p = S.plan; if (!p || !p.start) return null;
  const end = addDays(p.start, PLAN_N - 1), days = Array.from({ length: PLAN_N }, (_, i) => (p.days || [])[i] || null);
  const left = cookedLog().filter(x => x.day >= p.start && x.day <= end).map(x => x.rid);   // the same dish twice needs cooking twice
  const done = days.map(id => { const i = id ? left.indexOf(id) : -1; if (i >= 0) left.splice(i, 1); return i >= 0; });
  const n = days.filter(Boolean).length, cooked = done.filter(Boolean).length;
  return { start: p.start, end, days, done, n, cooked, over: today() > end || (n === PLAN_N && cooked === n) };
}
export const planLive = () => { const p = planNow(); return p && !p.over ? p : { start: today(), days: Array(PLAN_N).fill(null), done: [] }; };   // where a new pin goes
export const planDayName = (start, i) => { const k = addDays(start, i); return k === today() ? 'Heute' : k === addDays(today(), 1) ? 'Morgen' : C.DAYNAMES[parse(k).getDay()]; };
function planSet(i, rid) {
  const p = planLive(), days = p.days.slice(); days[i] = rid;
  S.plan = days.some(Boolean) ? { start: p.start, days, u: Date.now() } : { start: null, days: [], u: Date.now() };   // emptied = gone; the next pin starts a new week
}
export function planCard() {   // on the Kochbuch's "Kochen" page
  const p = planNow(), live = p && !p.over, i = live ? Math.round((parse(today()) - parse(p.start)) / 864e5) : -1, r = live && p.days[i] && recipeById(p.days[i]);
  return `<button class="card hcard plan-card" data-a="plan"><span class="hc-txt"><b>🗓️ Wochenplan</b><span class="muted">${r ? `Heute: ${r.icon} ${esc(r.title)}${p.done[i] ? ' ✅' : ''}` : live ? `${p.cooked} von ${p.n} gekocht` : 'Plan dir bis zu 7 Gerichte für die Woche'}</span></span><span class="hc-go">›</span></button>`;
}
export function viewPlan() {
  const p = planNow(), over = p && p.over, q = over ? p : planLive(), t = today();
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button><div class="sec-title" style="margin-top:0">🗓️ Wochenplan</div>`;
  if (over) h += `<div class="card"><h3>Die Woche ist rum 🎉</h3><p style="margin:4px 0 10px">${p.cooked} von ${p.n} ${p.n === 1 ? 'Gericht' : 'Gerichten'} gekocht.</p><div class="row"><button class="btn soft" data-a="planagain">🔁 Gleiche nochmal</button><button class="btn" data-a="plannew">🗓️ Neue Woche planen</button></div></div>`;
  else h += `<p class="muted" style="margin:0 4px 10px">${p ? `${shortDate(q.start)} – ${shortDate(q.end)} · ${p.cooked} von ${p.n} gekocht. Gekocht ist gekocht – egal an welchem Tag.` : 'Such dir bis zu 7 Gerichte aus, jedes bekommt seinen Tag. Die Woche startet mit dem ersten.'}</p>`;
  h += `<div data-ctx="${esc([...new Set(q.days.filter(Boolean))].join(','))}">` + q.days.map((id, i) => {
    const r = id && recipeById(id), k = addDays(q.start, i), d = parse(k), done = !!(q.done || [])[i];
    const dd = `<span class="dd">${d.toLocaleDateString('de-DE', { weekday: 'short' })}<b>${d.getDate()}.</b></span>`, cls = `card diaryrow${k === t ? ' plan-today' : ''}`;
    if (r) return `<div class="plan-row"><button class="${cls}" data-a="recipe" data-id="${esc(r.id)}">${dd}<span class="ri">${r.icon}</span><span class="rt"><b>${esc(r.title)}</b>${k === t ? '<br><span class="muted">heute</span>' : ''}</span><span class="dt">${done ? '✅' : ''}</span></button>${over ? '' : `<button class="mini-btn" data-a="planrm" data-i="${i}" aria-label="Aus dem Plan nehmen">✕</button>`}</div>`;
    if (over || k < t) return `<div class="plan-row"><div class="${cls} plan-empty">${dd}<span class="ri"></span><span class="rt muted">–</span></div>${over ? '' : '<span class="mini-btn plan-gap" aria-hidden="true"></span>'}</div>`;
    return `<div class="plan-row"><button class="${cls} plan-empty" data-a="planpick" data-i="${i}">${dd}<span class="ri">＋</span><span class="rt muted">Gericht aussuchen</span></button><span class="mini-btn plan-gap" aria-hidden="true"></span></div>`;
  }).join('') + '</div>';
  return h + `<p class="hint">Oder im Kochbuch bei einem Rezept auf „🗓️ Planen“.</p>`;
}
export const planBanner = () => ui.planPick == null ? '' : `<div class="plan-pick"><span>🗓️ Such dir ein Gericht für <b>${esc(planDayName(planLive().start, ui.planPick))}</b> aus</span><button class="mini-btn" data-a="planpickx" aria-label="Abbrechen">✕</button></div>`;
A.plan = () => { closeModal(); ui.tab = 'home'; ui.sub = 'plan'; render(); scrollTo(0, 0); };
Object.assign(A, {
  planpick(el) { ui.planPick = +el.dataset.i; ui.tab = 'hello'; ui.sub = null; ui.qtab = 'kochbuch'; ui.lastQ.hello = 'kochbuch'; ui.rid = null; ui.cstep = null; ui.ktab = 'next'; render(); scrollTo(0, 0); },
  planpickx() { ui.planPick = null; render(); },
  planask(el) {
    const r = recipeById(el.dataset.id), q = planLive(), t = today(); if (!r) return;
    modal(`<h2>🗓️ ${esc(r.title)}</h2><p>An welchem Tag?</p><div class="steps">${q.days.map((id, i) => { const k = addDays(q.start, i), o = id && recipeById(id); return k < t ? ''
      : `<button class="pick" data-a="planset" data-id="${esc(r.id)}" data-i="${i}"><span style="flex:1"><b>${esc(planDayName(q.start, i))}</b> <span class="muted">${esc(shortDate(k))}</span></span>${o ? `<span class="muted">${o.id === r.id ? '✓ schon da' : 'statt ' + o.icon}</span>` : ''}</button>`; }).join('')}</div>
      <div class="row"><button class="btn soft" data-a="close">Abbrechen</button></div>`);
  },
  planset(el) {
    const r = recipeById(el.dataset.id), i = +el.dataset.i; if (!r) return;
    planSet(i, r.id); ui.planPick = null; ui.rid = null; ui.cstep = null; commit(true);
    toast(`🗓️ ${planDayName(S.plan.start, i)}: ${r.title}`); A.plan();
  },
  planrm(el) { planSet(+el.dataset.i, null); commit(true); },
  plannew() { S.plan = { start: null, days: [], u: Date.now() }; commit(true); },
  planagain() { const p = planNow(); if (!p) return; S.plan = { start: today(), days: p.days, u: Date.now() }; commit(true); toast('🔁 Gleiche Woche nochmal – ab heute'); },
});
// 🍽️ the deck, full screen like Tinder (from its bubble); empty → back home
export function viewSwipe() {
  const c = deckCard();
  if (!c) { ui.sub = null; return viewHome(); }
  return `<div class="swipe-top"><button class="btn soft" data-a="babyback">← Zurück</button></div>` + c;
}
