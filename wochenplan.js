// 🗓️ Wochenplan: up to 7 recipes on days, its banner and swipe view.
import * as C from './content.js';
import { $, addDays, closeModal, commit, esc, modal, parse, shortDate, toast, today } from './core.js';
import { A, S, ui } from './state.js';
import { addToShop, askList, withList, cookableNow, cookedLog, ingWanted, isBake, recipeById } from './kochbuch.js';
import { parseQty, splitAmount } from './sync.js';
import { shopModal } from './einkauf.js';
import { deckCard, viewHome } from './home.js';
import { render, start } from './app.js';
import { budget, budgetSet, euro, euroR, fillWeek, weekBudget } from './budget.js';

// ---------- 🗓️ Wochenplan (Julia 2026-10-30): up to 7 recipes, each on a day ----------
// Rolling since 2026-11-14 (his pick): the window is always today + 6 days. Each morning yesterday drops off the left and a
// new 7th day appears on the right, so you plan one new day daily; it never "ends". Stored as {start, days[], s}; reading
// rebases it onto today (planRoll), writing stores it with start = today. Cooking a planned dish (either phone, any day in
// the window) ticks it. Shared like the Picnic slot: post.plan, the newer `u` wins (both phones may plan).
export const PLAN_N = 7;
export const dayStart = k => parse(k).getTime() + 3 * 3600e3;   // a day runs until 3 am, like today()
// a slot value (plan.s["<day><f|b|r>"]) is a string (free text) or {r: recipeId} (a recipe from the Kochbuch, G18)
export const slotRec = v => v && typeof v === 'object' && v.r ? v.r : null;
const slotText = v => typeof v === 'string' ? v : '';
function planRoll(p) {   // the stored plan seen from today: day i of the window = stored day i + o, slot keys "<i><k>" shift too
  const t = today(), o = Math.round((parse(t) - parse(p.start)) / 864e5);
  const days = Array.from({ length: PLAN_N }, (_, i) => (p.days || [])[i + o] || null), s = {};
  for (const [key, v] of Object.entries(p.s || {})) { const j = parseInt(key, 10) - o; if (j >= 0 && j < PLAN_N) s[j + key.replace(/^\d+/, '')] = v; }
  return { start: t, days, s };
}
export function planNow() {   // → null (nothing planned from today on) or {start = today, end, days[7], s, done[7], sdone{key}, n, cooked, over: false}
  const p = S.plan; if (!p || !p.start) return null;
  const { start, days, s } = planRoll(p); if (!days.some(Boolean) && !Object.keys(s).length) return null;
  const end = addDays(start, PLAN_N - 1);
  const left = cookedLog().filter(x => x.day >= start && x.day <= end).map(x => x.rid);   // the same dish twice needs cooking twice
  const done = days.map(id => { const i = id ? left.indexOf(id) : -1; if (i >= 0) left.splice(i, 1); return i >= 0; });
  const sdone = {}; for (const [key, v] of Object.entries(s)) { const rid = slotRec(v); if (!rid) continue; const i = left.indexOf(rid); sdone[key] = i >= 0; if (i >= 0) left.splice(i, 1); }   // slot recipes tick too
  const n = days.filter(Boolean).length, cooked = done.filter(Boolean).length;
  return { start, end, days, s, done, sdone, n, cooked, over: false };
}
export const planLive = () => planNow() || { start: today(), days: Array(PLAN_N).fill(null), s: {}, done: [], sdone: {} };   // where a new pin goes
export const planDayName = (start, i) => { const k = addDays(start, i); return k === today() ? 'Heute' : k === addDays(today(), 1) ? 'Morgen' : C.DAYNAMES[parse(k).getDay()]; };
function planWrite(days, s) {   // plan.s = optional slots {"<day><f|b|r>": text | {r: id}}; the whole plan travels, the newer `u` wins
  S.plan = days.some(Boolean) || Object.keys(s).length ? { start: today(), days, ...(Object.keys(s).length ? { s } : {}), u: Date.now() } : { start: null, days: [], u: Date.now() };   // days/s come from planLive(), already rebased onto today
}
function planSet(i, rid) { const p = planLive(), days = p.days.slice(); days[i] = rid; planWrite(days, { ...(p.s || {}) }); }
function planSlotSet(i, k, v) { const p = planLive(), s = { ...(p.s || {}) }; if (v) s[i + k] = v; else delete s[i + k]; planWrite(p.days.slice(), s); }
export function planCard() {   // on the Kochbuch's "Kochen" page
  const p = planNow(), r = p && p.days[0] && recipeById(p.days[0]);
  return `<button class="card hcard plan-card" data-a="plan"><span class="hc-txt"><b>🗓️ Wochenplan</b><span class="muted">${r ? `Heute: ${r.icon} ${esc(r.title)}${p.done[0] ? ' ✅' : ''}` : p ? `${p.n} von 7 Tagen geplant` : 'Plan dir die nächsten 7 Tage'}</span></span><span class="hc-go">›</span></button>`;
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
  const p = planNow(), over = false, q = planLive(), t = today(), s = q.s || {}, sdone = q.sdone || {};
  const di = Math.max(0, Math.min(PLAN_N - 1, ui.planDay != null ? ui.planDay : 0));   // today (far left) first, or the day he tapped
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button><div class="sec-title" style="margin-top:0">🗓️ Wochenplan</div>`;
  h += `<p class="muted" style="margin:0 4px 10px">${p ? `Heute bis ${shortDate(q.end)} · ${p.cooked} von ${p.n} gekocht. Jeden Morgen rückt hinten ein neuer Tag nach.` : 'Plan dir die nächsten 7 Tage: Frühstück, Backen, Hauptgericht und was von gestern übrig ist. Jeden Morgen rückt hinten ein neuer Tag nach.'}</p>`;
  h += budgetCard(q);
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
// 💶 G27: the week's budget line (tap = set it / see what's in it) + ✨ Woche auffüllen while a day has no dinner yet
const openDays = q => q.days.filter((id, i) => !id && !(q.s || {})[i + 'r']).length;
function budgetCard(q) {
  const w = weekBudget(q), unk = w.unknown.length, n = openDays(q);
  const cost = w.c ? `geplant ca. ${euro(w.c)}` : w.buy.length || unk || q.days.some(Boolean) ? 'geplant: alles daheim' : 'noch nichts geplant';
  const line = w.b != null ? `${euroR(w.b)} · ${cost}<br><b class="${w.rest < 0 ? 'wb-over' : 'wb-ok'}">${w.rest >= 0 ? 'noch ' + euro(w.rest) + ' frei' : euro(-w.rest) + ' drüber'}</b>` : `${cost}<br><span class="muted">Tippen und ein Budget festlegen</span>`;
  return `<button class="card hcard wb-card" data-a="wbudget"><span class="hc-txt"><b>💶 Wochenbudget</b><span>${line}${unk ? ` <span class="muted">· ${unk === 1 ? 'ein Preis' : unk + ' Preise'} noch unbekannt</span>` : ''}</span></span><span class="hc-go">›</span></button>`
    + (n ? `<button class="btn soft wide wb-fill" data-a="fill">✨ Woche auffüllen <span class="muted">(${n} ${n === 1 ? 'Tag' : 'Tage'} frei)</span></button>` : '');
}
function budgetModal(keep) {
  const q = planLive(), w = weekBudget(q), b = budget(), top = w.buy.slice().sort((x, y) => y.c - x.c).slice(0, 8);
  modal(`<div style="text-align:left"><h2 style="text-align:center">💶 Wochenbudget</h2>
    <p class="muted" style="margin-top:0">Für die geplanten Gerichte der nächsten 7 Tage – nur was ihr dafür noch kaufen müsst (ganze Picnic-Packungen, was im Vorrat ist zählt nicht).</p>
    <form class="add" data-f="wbset"><input id="wbin" name="t" inputmode="decimal" placeholder="z.B. 60" value="${b ? String(b / 100).replace('.', ',') : ''}" autocomplete="off" enterkeyhint="done"><span style="align-self:center;padding:0 6px">€</span><button class="btn blue" aria-label="Budget speichern">✓</button></form>
    <p style="margin:10px 0 4px">Geplant: <b>ca. ${euro(w.c)}</b>${b ? ` von ${euroR(b)}` : ''}</p>
    ${top.length ? `<ul class="wb-list">${top.map(x => `<li>${x.n > 1 ? x.n + '× ' : ''}${esc(x.t)} <span class="muted">${esc(x.e.u)}</span><b>${euro(x.c)}</b></li>`).join('')}</ul>` : ''}
    ${w.unknown.length ? `<p class="muted">❔ Preis noch unbekannt: ${esc(w.unknown.join(', '))}</p>` : ''}
    <p class="hint">Die Preise lernt die App von selbst, wenn ihr über 🧺 Picnic bestellt – mit jeder Bestellung kennt sie mehr.</p>
    <div class="row">${b ? '<button class="btn soft" data-a="wbclear">Ohne Budget</button>' : ''}<button class="btn soft" data-a="close">Fertig</button></div></div>`, '', keep);
}
function fillModal(keep) {
  const F = ui.fill, q = planLive(); if (!F) return;
  let h = `<h2 style="text-align:center">✨ Vorschläge für eure Woche</h2>`;
  if (!F.picks.length) h += `<p style="text-align:center">${F.none === 'budget' ? 'Fürs Budget passt gerade kein Gericht mehr – nimm was raus oder erhöh das Budget.' : F.none === 'full' ? 'Jeder Tag hat schon sein Essen. 🎉' : 'Mir fällt gerade nichts Passendes ein.'}</p><div class="row"><button class="btn soft" data-a="close">Schließen</button></div>`;
  else {
    const left = F.wb.b != null ? F.wb.b - F.picks.reduce((a, x) => a + x.extra, F.base) : null;
    h += `<p class="muted" style="margin-top:0;text-align:center">Zuerst, was ihr fast ganz daheim habt.</p><div class="steps">` + F.picks.map((x, n) => { const r = recipeById(x.id); return r ? `<div class="plan-row"><button class="card diaryrow" data-a="recipe" data-id="${esc(r.id)}"><span class="ri">${r.icon}</span><span class="rt"><span class="muted">${esc(planDayName(q.start, x.i))}</span><br><b>${esc(r.title)}</b><br><span class="muted wb-why">${esc(x.why)}</span></span></button><button class="mini-btn" data-a="fillx" data-n="${n}" aria-label="Den nicht">✕</button></div>` : ''; }).join('') + '</div>'
      + (left != null ? `<p style="text-align:right;margin:6px 2px">Danach noch ca. <b>${euro(left)}</b> frei</p>` : '')
      + (F.short ? `<p class="hint">Für die übrigen freien Tage reicht das Budget nicht mehr.</p>` : '')
      + `<button class="btn green wide" data-a="fillok">✓ ${F.picks.length === 1 ? 'Eintragen' : 'Alle ' + F.picks.length + ' eintragen'}</button><div class="row"><button class="btn soft" data-a="fillmore">🔄 Andere</button><button class="btn soft" data-a="close">Abbrechen</button></div>`;
  }
  modal(`<div style="text-align:left">${h}</div>`, '', keep);
}
function fillRun(skip) { const q = planLive(), F = fillWeek(q, skip); ui.fill = { ...F, base: F.wb.c, skip }; fillModal(!!$('#ov')); }
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
  wbudget() { budgetModal(); },
  wbclear() { budgetSet(0); commit(true); budgetModal(true); render(); },
  fill() { fillRun([]); },
  fillx(el) { ui.fill.picks.splice(+el.dataset.n, 1); fillModal(true); },
  fillmore() { const F = ui.fill; fillRun([...(F.skip || []), ...F.picks.map(x => x.id)]); },
  fillok() {
    const F = ui.fill, p = planLive(), days = p.days.slice(); if (!F || !F.picks.length) return;
    for (const x of F.picks) if (!days[x.i]) days[x.i] = x.id;
    planWrite(days, { ...(p.s || {}) }); ui.fill = null; closeModal(); commit(true);
    toast(`✨ ${F.picks.length} ${F.picks.length === 1 ? 'Gericht' : 'Gerichte'} im Plan`); render();
  },
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
      if (askList(el, 'planshop')) return;   // 🙋 G28: a recipe 🛒 on his devices asks which list
      ui.ingPick = {};
      const add = (r.ing || []).filter(([qq, t]) => t && ingWanted(t, qq));
      withList(el, () => add.forEach(([qq, t]) => addToShop(t, parseQty(qq), qq, r.title))); n = add.length;
      S.dishes = (S.dishes || []).filter(x => x.id !== r.id).concat([{ id: r.id, ts: Date.now() }]);   // bought for → "Heute kochen?" on Home
    } else { const t = slotText(v); if (!t) return; const a = splitAmount(t); addToShop(a.name, a.qty, '', 'Wochenplan'); n = 1; }
    commit(); shopModal();
    toast(r ? (n ? n + ' Sachen dazugekommen 🛒' : 'Steht schon alles drauf 🛒') : 'Steht auf dem Zettel 🛒');
  },
});
// 🍽️ the deck, full screen like Tinder (from its bubble); empty → back home
export function viewSwipe() {
  const c = deckCard();
  if (!c) { ui.sub = null; return viewHome(); }
  return `<div class="swipe-top"><button class="btn soft" data-a="babyback">← Zurück</button></div>` + c;
}
