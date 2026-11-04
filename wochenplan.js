// 🗓️ Wochenplan: up to 7 recipes on days, its banner and swipe view.
import * as C from './content.js';
import { addDays, closeModal, commit, esc, modal, parse, shortDate, toast, today } from './core.js';
import { A, S, ui } from './state.js';
import { addToShop, cookableNow, cookedLog, ingWanted, isBake, recipeById } from './kochbuch.js';
import { parseQty, splitAmount } from './sync.js';
import { shopModal } from './einkauf.js';
import { deckCard, viewHome } from './home.js';
import { render, start } from './app.js';

// ---------- 🗓️ Wochenplan (Julia 2026-10-30): up to 7 recipes, each on a day, from the day the first one is pinned ----------
// Cooking a planned dish (either phone, any day of the plan) ticks it. Over after its 7th day, or when all 7 days are planned
// and cooked → "Neue Woche planen" / "Gleiche nochmal". Edits never move the start (user's pick). Shared like the Picnic slot:
// post.plan, the newer `u` wins (both phones may plan); a reset is {start: null}, so it travels too.
export const PLAN_N = 7;
export const dayStart = k => parse(k).getTime() + 3 * 3600e3;   // a day runs until 3 am, like today()
// a slot value (plan.s["<day><f|b|r>"]) is a string (free text) or {r: recipeId} (a recipe from the Kochbuch, G18)
export const slotRec = v => v && typeof v === 'object' && v.r ? v.r : null;
const slotText = v => typeof v === 'string' ? v : '';
export function planNow() {   // → null (no plan) or {start, end, days[7], s, done[7], sdone{key}, n, cooked, over}
  const p = S.plan; if (!p || !p.start) return null;
  const end = addDays(p.start, PLAN_N - 1), days = Array.from({ length: PLAN_N }, (_, i) => (p.days || [])[i] || null), s = p.s || {};
  const left = cookedLog().filter(x => x.day >= p.start && x.day <= end).map(x => x.rid);   // the same dish twice needs cooking twice
  const done = days.map(id => { const i = id ? left.indexOf(id) : -1; if (i >= 0) left.splice(i, 1); return i >= 0; });
  const sdone = {}; for (const [key, v] of Object.entries(s)) { const rid = slotRec(v); if (!rid) continue; const i = left.indexOf(rid); sdone[key] = i >= 0; if (i >= 0) left.splice(i, 1); }   // slot recipes tick too
  const n = days.filter(Boolean).length, cooked = done.filter(Boolean).length;
  return { start: p.start, end, days, s, done, sdone, n, cooked, over: today() > end || (n === PLAN_N && cooked === n) };
}
export const planLive = () => { const p = planNow(); return p && !p.over ? p : { start: today(), days: Array(PLAN_N).fill(null), s: {}, done: [], sdone: {} }; };   // where a new pin goes
export const planDayName = (start, i) => { const k = addDays(start, i); return k === today() ? 'Heute' : k === addDays(today(), 1) ? 'Morgen' : C.DAYNAMES[parse(k).getDay()]; };
function planWrite(days, s) {   // plan.s = optional slots {"<day><f|b|r>": text | {r: id}}; the whole plan travels, the newer `u` wins
  S.plan = days.some(Boolean) || Object.keys(s).length ? { start: planLive().start, days, ...(Object.keys(s).length ? { s } : {}), u: Date.now() } : { start: null, days: [], u: Date.now() };   // emptied = gone; the next pin starts a new week
}
function planSet(i, rid) { const p = planLive(), days = p.days.slice(); days[i] = rid; planWrite(days, { ...(p.s || {}) }); }
function planSlotSet(i, k, v) { const p = planLive(), s = { ...(p.s || {}) }; if (v) s[i + k] = v; else delete s[i + k]; planWrite(p.days.slice(), s); }
export function planCard() {   // on the Kochbuch's "Kochen" page
  const p = planNow(), live = p && !p.over, i = live ? Math.round((parse(today()) - parse(p.start)) / 864e5) : -1, r = live && p.days[i] && recipeById(p.days[i]);
  return `<button class="card hcard plan-card" data-a="plan"><span class="hc-txt"><b>🗓️ Wochenplan</b><span class="muted">${r ? `Heute: ${r.icon} ${esc(r.title)}${p.done[i] ? ' ✅' : ''}` : live ? `${p.cooked} von ${p.n} gekocht` : 'Plan dir bis zu 7 Gerichte für die Woche'}</span></span><span class="hc-go">›</span></button>`;
}
// slots of a day: m = Hauptgericht (days[i], a recipe), f / b / r = text or a recipe in plan.s["<i><k>"]
const SLOTS = [
  { k: 'f', ic: '🍳', t: 'Frühstück', ph: 'Frühstück eintragen', pick: 'ein Frühstück' },
  { k: 'b', ic: '🧁', t: 'Backen', ph: 'Was wird gebacken?', pick: 'was zum Backen' },
  { k: 'm', ic: '🍲', t: 'Hauptgericht', pick: 'ein Gericht' },
  { k: 'r', ic: '🥡', t: 'Rest / Vorrat', ph: 'Reste oder aus dem Vorrat', pick: 'was aus dem Vorrat' },
];
const slotOf = k => SLOTS.find(x => x.k === k) || SLOTS[2];
export const slotFor = r => r.cat === 'fruehstueck' ? 'f' : isBake(r) ? 'b' : 'm';   // where "🗓️ Planen" on a recipe page puts it
export const planPickSlot = () => ui.planPick != null && ui.planPickK && ui.planPickK !== 'm' ? slotOf(ui.planPickK).t : '';   // the recipe page's "Für Morgen nehmen" says which slot
function vorratPicks(q) {   // 🥡 Rest / Vorrat (his answer 2026-11-04): up to 3 recipes cookable from what is at home, not already in the plan
  const c = cookableNow(), used = new Set([...q.days.filter(Boolean), ...Object.values(q.s || {}).map(slotRec).filter(Boolean)]);
  return c.all.concat(c.almost).filter(r => !used.has(r.id)).slice(0, 3);
}
export function viewPlan() {
  const p = planNow(), over = p && p.over, q = over ? p : planLive(), t = today(), s = q.s || {}, sdone = q.sdone || {};
  const cur = Math.round((parse(t) - parse(q.start)) / 864e5), di = Math.max(0, Math.min(PLAN_N - 1, ui.planDay != null ? ui.planDay : cur));   // today first, or the day he tapped
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button><div class="sec-title" style="margin-top:0">🗓️ Wochenplan</div>`;
  if (over) h += `<div class="card"><h3>Die Woche ist rum 🎉</h3><p style="margin:4px 0 10px">${p.cooked} von ${p.n} ${p.n === 1 ? 'Gericht' : 'Gerichten'} gekocht.</p><div class="row"><button class="btn soft" data-a="planagain">🔁 Gleiche nochmal</button><button class="btn" data-a="plannew">🗓️ Neue Woche planen</button></div></div>`;
  else h += `<p class="muted" style="margin:0 4px 10px">${p ? `${shortDate(q.start)} – ${shortDate(q.end)} · ${p.cooked} von ${p.n} gekocht. Gekocht ist gekocht – egal an welchem Tag.` : 'Plan dir die Woche: Frühstück, Backen, Hauptgericht und was von gestern übrig ist. Die Woche startet mit dem ersten Eintrag.'}</p>`;
  h += `<div class="pw-strip">` + q.days.map((id, i) => {
    const r = id && recipeById(id), k = addDays(q.start, i), d = parse(k), done = !!(q.done || [])[i], extra = SLOTS.filter(x => x.k !== 'm' && s[i + x.k]);
    const sr = !r && extra.map(x => slotRec(s[i + x.k])).filter(Boolean).map(recipeById).find(Boolean);   // no main dish: a slot recipe's icon
    return `<button class="pw-day${i === di ? ' on' : ''}${k === t ? ' today' : ''}" data-a="planday" data-i="${i}"><span>${k === t ? 'Heute' : d.toLocaleDateString('de-DE', { weekday: 'short' })}</span><b>${d.getDate()}.</b><span class="pw-ic">${r ? r.icon : sr ? sr.icon : extra.length ? '•' : '＋'}</span><span class="pw-ok">${done ? '✅' : ''}</span></button>`;
  }).join('') + '</div>';
  const id = q.days[di], r = id && recipeById(id), k = addDays(q.start, di), past = over || k < t, done = !!(q.done || [])[di];
  const gap = past ? `<span class="mini-btn plan-gap" aria-hidden="true"></span>` : `<span class="mini-btn plan-gap" aria-hidden="true"></span><span class="mini-btn plan-gap" aria-hidden="true"></span>`;   // empty rows keep the width of filled ones
  const shopBtn = kk => past ? '' : `<button class="mini-btn" data-a="planshop" data-i="${di}" data-k="${kk}" aria-label="Auf den Zettel">🛒</button>`;   // 🛒 (his answer 2026-11-04): the slot onto the Zettel
  const rowCard = (x, body, done, attrs) => `<button class="card diaryrow" ${attrs}><span class="ri">${x.ic}</span><span class="rt"><span class="muted">${x.t}</span><br>${body}</span><span class="dt">${done ? '✅' : ''}</span></button>`;
  const emptyRow = (x, body) => `<div class="plan-row"><div class="card diaryrow plan-empty"><span class="ri">${x.ic}</span><span class="rt"><span class="muted">${x.t}</span><br>${body}</span></div>${gap}</div>`;
  h += `<div class="sec-title">${esc(planDayName(q.start, di))} <span class="muted">${esc(shortDate(k))}</span></div><div data-ctx="${esc([...new Set(q.days.filter(Boolean))].join(','))}">` + SLOTS.map(x => {
    if (x.k === 'm') {
      if (r) return `<div class="plan-row">${rowCard(x, `<b>${r.icon} ${esc(r.title)}</b>`, done, `data-a="recipe" data-id="${esc(r.id)}"`)}${shopBtn('m')}${over ? '' : `<button class="mini-btn" data-a="planrm" data-i="${di}" aria-label="Aus dem Plan nehmen">✕</button>`}</div>`;
      if (past) return emptyRow(x, '–');
      return `<div class="plan-row"><button class="card diaryrow plan-empty" data-a="planpick" data-i="${di}" data-k="m"><span class="ri">${x.ic}</span><span class="rt"><span class="muted">${x.t}</span><br>＋ Gericht aussuchen</span></button>${gap}</div>`;
    }
    const v = s[di + x.k], rid = slotRec(v), sr = rid && recipeById(rid);
    if (v) {
      const card = sr ? rowCard(x, `<b>${sr.icon} ${esc(sr.title)}</b>`, sdone[di + x.k], `data-a="recipe" data-id="${esc(sr.id)}"`)
        : rowCard(x, `<b>${esc(slotText(v) || 'Rezept nicht mehr da')}</b>`, false, past ? '' : `data-a="planslot" data-i="${di}" data-k="${x.k}"`);
      return `<div class="plan-row">${card}${shopBtn(x.k)}${over ? '' : `<button class="mini-btn" data-a="planslotrm" data-i="${di}" data-k="${x.k}" aria-label="Rausnehmen">✕</button>`}</div>`;
    }
    if (past) return emptyRow(x, '–');
    let row = `<div class="plan-row"><button class="card diaryrow plan-empty" data-a="planslot" data-i="${di}" data-k="${x.k}"><span class="ri">${x.ic}</span><span class="rt"><span class="muted">${x.t}</span><br>＋ ${esc(x.ph)}</span></button>${gap}</div>`;
    if (x.k === 'r') { const picks = vorratPicks(q); if (picks.length) row += `<div class="plan-sugg"><span class="muted">🥫 Aus dem Vorrat geht:</span><div class="chips">${picks.map(y => `<button class="chip" data-a="planslotrec" data-i="${di}" data-k="r" data-id="${esc(y.id)}">${y.icon} ${esc(y.title)}${y.miss ? ` <span class="cnt">${y.miss.length} fehlt</span>` : ''}</button>`).join('')}</div></div>`; }
    return row;
  }).join('') + '</div>';
  return h + `<p class="hint">Geht auch im Kochbuch: bei einem Rezept auf „🗓️ Planen“.</p>`;
}
export const planBanner = () => ui.planPick == null ? '' : `<div class="plan-pick"><span>🗓️ Such dir ${slotOf(ui.planPickK || 'm').pick} für <b>${esc(planDayName(planLive().start, ui.planPick))}</b> aus</span><button class="mini-btn" data-a="planpickx" aria-label="Abbrechen">✕</button></div>`;
A.plan = (el, e, day) => { closeModal(); ui.planDay = day == null ? null : day; ui.tab = 'home'; ui.sub = 'plan'; render(); scrollTo(0, 0); };
Object.assign(A, {
  planpick(el) {   // into the book: Frühstück / Backen open Stöbern on their category, Rest / Vorrat opens "Kochen" (what is cookable now)
    const k = el.dataset.k || 'm'; closeModal(); ui.planPick = +el.dataset.i; ui.planPickK = k;
    ui.tab = 'hello'; ui.sub = null; ui.qtab = 'kochbuch'; ui.lastQ.hello = 'kochbuch'; ui.rid = null; ui.cstep = null;
    ui.ktab = k === 'r' ? 'jetzt' : 'next'; if (k === 'f') ui.ccat = 'fruehstueck'; if (k === 'b') ui.ccat = 'backen';
    render(); scrollTo(0, 0);
  },
  planpickx() { ui.planPick = null; ui.planPickK = null; render(); },
  planask(el) {
    const r = recipeById(el.dataset.id), q = planLive(), t = today(), k = slotFor(r || {}), x = slotOf(k); if (!r) return;
    const occ = i => { if (k === 'm') { const o = q.days[i] && recipeById(q.days[i]); return o ? (o.id === r.id ? '✓ schon da' : 'statt ' + o.icon) : ''; }
      const v = (q.s || {})[i + k], o = slotRec(v) && recipeById(slotRec(v)); return o ? (o.id === r.id ? '✓ schon da' : 'statt ' + o.icon) : slotText(v) ? 'statt ✏️' : ''; };
    modal(`<h2>🗓️ ${esc(r.title)}</h2><p>An welchem Tag?${k === 'm' ? '' : ` <span class="muted">Als ${x.ic} ${x.t}.</span>`}</p><div class="steps">${q.days.map((id, i) => { const kk = addDays(q.start, i); return kk < t ? ''
      : `<button class="pick" data-a="planset" data-id="${esc(r.id)}" data-i="${i}" data-k="${k}"><span style="flex:1"><b>${esc(planDayName(q.start, i))}</b> <span class="muted">${esc(shortDate(kk))}</span></span><span class="muted">${occ(i)}</span></button>`; }).join('')}</div>
      <div class="row"><button class="btn soft" data-a="close">Abbrechen</button></div>`);
  },
  planset(el) {
    const r = recipeById(el.dataset.id), i = +el.dataset.i; if (!r) return;
    const k = ui.planPick != null ? ui.planPickK || 'm' : el.dataset.k || 'm';   // pick mode knows its slot; "Planen" on a page says it per button
    if (k === 'm') planSet(i, r.id); else planSlotSet(i, k, { r: r.id });
    ui.planPick = null; ui.planPickK = null; ui.rid = null; ui.cstep = null; commit(true);
    toast(`🗓️ ${planDayName(S.plan.start, i)}${k === 'm' ? '' : ' · ' + slotOf(k).t}: ${r.title}`); A.plan(null, null, i);
  },
  planrm(el) { planSet(+el.dataset.i, null); commit(true); },
  planday(el) { ui.planDay = +el.dataset.i; render(); },
  planslot(el) {
    const i = +el.dataset.i, k = el.dataset.k, x = slotOf(k), q = planLive(), cur = slotText((q.s || {})[i + k]);
    modal(`<h2>${x.ic} ${x.t}</h2><p class="muted">${esc(planDayName(q.start, i))}, ${esc(shortDate(addDays(q.start, i)))}</p><input id="plslot" type="text" maxlength="60" value="${esc(cur)}" placeholder="${esc(x.ph)}" style="width:100%;margin:6px 0 10px">`
      + `<div class="row" style="margin-bottom:10px"><button class="btn soft" data-a="planpick" data-i="${i}" data-k="${k}">📖 Aus dem Kochbuch</button>`
      + (k === 'r' ? `<button class="btn soft" data-a="planslotset" data-i="${i}" data-k="r" data-v="Reste von gestern">🥡 Reste</button><button class="btn soft" data-a="planslotset" data-i="${i}" data-k="r" data-v="Aus dem Vorrat kochen">🥫 Aus dem Vorrat</button>` : '') + '</div>'
      + `<div class="row"><button class="btn soft" data-a="close">Abbrechen</button><button class="btn" data-a="planslotset" data-i="${i}" data-k="${k}">Speichern</button></div>`);
    setTimeout(() => { const e = document.getElementById('plslot'); if (e) e.focus(); }, 50);
  },
  planslotset(el) {
    const v = (el.dataset.v != null ? el.dataset.v : (document.getElementById('plslot') || {}).value || '').trim().slice(0, 60);
    planSlotSet(+el.dataset.i, el.dataset.k, v); closeModal(); commit(true);
  },
  planslotrec(el) { const r = recipeById(el.dataset.id); if (!r) return; planSlotSet(+el.dataset.i, el.dataset.k, { r: r.id }); commit(true); toast(`🥫 ${r.title}`); },
  planslotrm(el) { planSlotSet(+el.dataset.i, el.dataset.k, ''); commit(true); },
  planshop(el) {   // 🛒 a slot onto the Zettel: a recipe = its missing ingredients (like the recipe page), a text = the text itself
    const i = +el.dataset.i, k = el.dataset.k, q = planLive(), v = k === 'm' ? { r: q.days[i] } : (q.s || {})[i + k], rid = slotRec(v), r = rid && recipeById(rid);
    let n = 0;
    if (r) {
      ui.ingPick = {};
      const add = (r.ing || []).filter(([qq, t]) => t && ingWanted(t, qq));
      add.forEach(([qq, t]) => addToShop(t, parseQty(qq), qq, r.title)); n = add.length;
      S.dishes = (S.dishes || []).filter(x => x.id !== r.id).concat([{ id: r.id, ts: Date.now() }]);   // bought for → "Heute kochen?" on Home
    } else { const t = slotText(v); if (!t) return; const a = splitAmount(t); addToShop(a.name, a.qty, '', 'Wochenplan'); n = 1; }
    commit(); shopModal();
    toast(r ? (n ? n + ' Sachen dazugekommen 🛒' : 'Steht schon alles drauf 🛒') : 'Steht auf dem Zettel 🛒');
  },
  plannew() { ui.planDay = null; S.plan = { start: null, days: [], u: Date.now() }; commit(true); },
  planagain() { const p = planNow(); if (!p) return; S.plan = { start: today(), days: p.days, ...(p.s && Object.keys(p.s).length ? { s: p.s } : {}), u: Date.now() }; commit(true); toast('🔁 Gleiche Woche nochmal – ab heute'); },
});
// 🍽️ the deck, full screen like Tinder (from its bubble); empty → back home
export function viewSwipe() {
  const c = deckCard();
  if (!c) { ui.sub = null; return viewHome(); }
  return `<div class="swipe-top"><button class="btn soft" data-a="babyback">← Zurück</button></div>` + c;
}
