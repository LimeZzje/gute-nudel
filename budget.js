// 💶 Wochenbudget (card G27, his picks 2026-11-25): one TEAM budget for the 7-day Wochenplan window. It covers the planned
// dishes only: what they still cost to buy = whole Picnic packs of what the Vorrat doesn't have (pooled over the week, so two
// dishes with 200 g Sahne each buy one 500 g pack). "✨ Woche auffüllen" proposes dishes for the empty days that fit the rest
// of the budget, Vorrat-heavy first, each with its reason.
// Prices fill slowly by themselves (no catch-up run): every Picnic search and every product picked on the order screen
// writes a price into S.prices (shared with the partner via post.prices, per thing the newer entry wins). Seeded once per
// phone from the day cache (gn_picnic_cache) and the remembered picks (gn_picnic_map). Unknown = "Preis noch unbekannt".
import * as Sh from './shop.js';
import { S } from './state.js';
import { parseQty, vorratGroups } from './sync.js';
import { allRecipes, haveFor, isBake, isCodex, isPantry, pregLater, recipeById, vMatch } from './kochbuch.js';
import { PIC_MAX, picBudget, picIsThing, picLS, picQty, picQueries } from './einkauf.js';
import { today } from './core.js';
import { daysBetween } from './chores.js';

export const PRICE_KEEP = 400;   // things in the price book (oldest go first)
const PRICE_FRESH = 7 * 864e5;   // a search result doesn't replace a product she picked within the last week
export const euro = c => typeof c === 'number' ? (c / 100).toFixed(2).replace('.', ',') + ' €' : '';
export const euroR = c => (c || 0) % 100 ? euro(c) : (c || 0) / 100 + ' €';   // budget talk: whole euros stay whole
const keyOf = t => Sh.thingKey(t);
// one entry: {p: cents per pack, u: pack ("500 g"), n: product name, t: when seen, k: 1 = picked for a list row}
function priceSet(name, h, t, picked) {
  if (!h || typeof h.price !== 'number' || !h.price) return false;
  const k = keyOf(name); if (!k) return false;
  const P = S.prices || (S.prices = {}), o = P[k];
  if (o && !picked && o.k && t - o.t < PRICE_FRESH) return false;
  if (o && o.t > t) return false;
  if (o && o.p === h.price && o.u === (h.unit || '') && o.k === (picked ? 1 : undefined)) { o.t = t; return false; }
  P[k] = { p: h.price, u: h.unit || '', n: String(h.name || '').slice(0, 60), t, ...(picked ? { k: 1 } : {}) };
  priceTrim(P);
  return true;
}
export function priceTrim(P) { const ks = Object.keys(P); if (ks.length > PRICE_KEEP) ks.sort((a, b) => P[b].t - P[a].t).slice(PRICE_KEEP).forEach(k => delete P[k]); return P; }
// a Picnic search answer: the representative pack = the budget pick without an amount, else the first hit — only when
// Picnic's first hit IS the thing (picIsThing); brand names / odd wording are not guessed
export function priceSeen(q, hits, t = Date.now()) {
  if (!q || !hits || !hits.length || !picIsThing(hits[0].name, q)) return false;
  const b = picBudget({ text: q }, hits, q);
  return priceSet(q, b ? b.pick : hits[0], t, false);
}
export const pricePick = (name, p, t = Date.now()) => priceSet(name, p, t, true);   // the product chosen for a list row
// both phones' books: per thing the newer entry wins (mergeStates for own devices, syncPost for the partner's post)
export function priceMerge(a, b) {
  const m = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) if (v && typeof v.p === 'number' && (!m[k] || (v.t || 0) > (m[k].t || 0))) m[k] = v;
  return priceTrim(m);
}
// seed once per phone (2026-11-25.1 left a day cache + her remembered picks behind)
export function priceSeed() {
  try { if (localStorage.getItem('gn_price_seed')) return false; localStorage.setItem('gn_price_seed', '1'); } catch (e) { return false; }
  let n = 0; const old = Date.now() - 864e5;
  for (const [q, e] of Object.entries(picLS.cache)) if (e && e.h && priceSeen(q, e.h, e.t || old)) n++;
  for (const [name, p] of Object.entries(picLS.map)) if (pricePick(name, p, old)) n++;
  return n;
}
// → {p, u, n} or null: the thing itself, else one of the words Picnic would be asked with
export function priceFor(t) {
  const P = S.prices || {}; let e = P[keyOf(t)];
  if (!e) for (const q of picQueries(t)) if ((e = P[keyOf(q)])) break;
  return e || null;
}
// packs of `e` for the amount `want` (null = one pack); like picN on the order screen
function packs(e, want) {
  const pack = picQty({ unit: e.u, n: 1 });
  let n = 1;
  if (want && pack && pack.unit === want.unit && pack.n) n = Math.ceil(want.n / pack.n - 1e-9);
  else if (want && !pack && want.unit === 'stk') n = Math.round(want.n);
  return Math.max(1, Math.min(PIC_MAX, n));
}
// what a set of recipes still costs to buy → {c: cents (known part), unknown: [names], buy: [{t, n, e, c}]}
// Pooled per thing over all the recipes, minus what the Vorrat has left (a Vorrat thing without an amount counts as enough,
// like haveFor). Pantry staples (salt, oil, spices) are skipped like everywhere else.
export function costOf(rids, V = vorratGroups()) {
  const acc = new Map();
  for (const id of rids) {
    const r = id && recipeById(id); if (!r) continue;
    for (const [q, t] of r.ing || []) {
      if (!t || isPantry(t)) continue;
      const k = keyOf(t), rq = parseQty(q), a = acc.get(k) || { t, q: null };
      if (rq) { if (!a.q) a.q = { ...rq }; else if (a.q.unit === rq.unit) a.q = { ...a.q, n: a.q.n + rq.n }; }
      acc.set(k, a);
    }
  }
  let c = 0; const unknown = [], buy = [];
  for (const a of acc.values()) {
    const x = V.find(y => vMatch(a.t, y.name));
    let want = a.q;
    if (x) {
      if (!x.left || !a.q || x.left.unit !== a.q.unit) continue;
      const short = a.q.n - x.left.n; if (short <= 1e-6) continue;
      want = { ...a.q, n: short };
    }
    const e = priceFor(a.t);
    if (!e) { unknown.push(a.t); continue; }
    const n = packs(e, want); c += e.p * n; buy.push({ t: a.t, n, e, c: e.p * n });
  }
  return { c, unknown, buy };
}
// the plan's recipes that still need buying: main dishes + slot recipes, not cooked yet (the window is today..+6 already)
export function planRids(q) {
  if (!q) return [];
  const out = q.days.map((id, i) => id && !(q.done || [])[i] ? id : null);
  for (const [key, v] of Object.entries(q.s || {})) if (v && typeof v === 'object' && v.r && !(q.sdone || {})[key]) out.push(v.r);
  return out.filter(Boolean);
}
// the team budget: S.wb = {c: cents | null, u} — shared like the plan (post.wb, the newer u wins)
export const budget = () => S.wb && typeof S.wb.c === 'number' && S.wb.c > 0 ? S.wb.c : null;
export function budgetSet(c) { S.wb = { c: c > 0 ? Math.round(c) : null, u: Date.now() }; }
export function weekBudget(q) {   // → {b: budget | null, c: planned cost, rest, unknown[], buy[]}
  priceSeed();
  const V = vorratGroups(), w = costOf(planRids(q), V), b = budget();
  return { b, c: w.c, rest: b == null ? null : b - w.c, unknown: w.unknown, buy: w.buy, V };
}
// ✨ Woche auffüllen: a main dish for every empty day (no Hauptgericht and nothing in Rest / Vorrat), from today on.
// Candidates = what the dinner deck would offer (main dishes, not the Culinarius, not "erst ab Februar", not a 👎, not
// cooked in the last 5 days, not already planned). Order = Vorrat-heavy first (fewest missing, then most of it at home),
// then cheapest. With a budget, a dish only goes in when its extra cost fits what is left. `skip` = ids shown before.
export function fillWeek(q, skip = []) {
  const wb = weekBudget(q), V = wb.V, base = planRids(q), used = new Set([...q.days.filter(Boolean), ...Object.values(q.s || {}).map(v => v && v.r).filter(Boolean), ...skip]);
  const empty = q.days.map((id, i) => !id && !(q.s || {})[i + 'r'] ? i : -1).filter(i => i >= 0);
  if (!empty.length) return { picks: [], wb, none: 'full' };
  const t = today(), recent = r => { const c = S.cook[r.id]; return c && c.last && daysBetween(c.last, t) < 5; };
  const pool = allRecipes().filter(r => r.cat === 'haupt' && !r.arch && !isCodex(r) && !pregLater(r) && !isBake(r) && !used.has(r.id) && (S.cook[r.id] || {}).taste !== 1 && !recent(r))
    .map(r => ({ r, h: haveFor(r, V) })).filter(x => x.h.need >= 2)
    .sort((a, b) => a.h.missing.length - b.h.missing.length || (b.h.need - b.h.missing.length) / b.h.need - (a.h.need - a.h.missing.length) / a.h.need);
  const picks = [], cur = base.slice(); let spent = costOf(cur, V).c, short = false;
  for (const i of empty) {
    let best = null;
    for (const x of pool.slice(0, 60)) {   // the most Vorrat-heavy tier that fits; inside it the cheapest (an unknown price counts 3 €)
      if (best && x.h.missing.length > best.x.h.missing.length) break;
      const w = costOf(cur.concat(x.r.id), V), extra = w.c - spent;
      if (wb.b != null && spent + extra > wb.b) continue;
      const unk = w.unknown.filter(u => x.r.ing.some(([, tt]) => tt === u)), score = extra + 300 * unk.length;
      if (!best || score < best.score) best = { x, extra, unk, score };
      if (!score) break;
    }
    if (!best) { short = true; break; }
    pool.splice(pool.indexOf(best.x), 1); cur.push(best.x.r.id); spent += best.extra;
    picks.push({ i, id: best.x.r.id, extra: best.extra, miss: best.x.h.missing.length, why: whyOf(best.x, best.extra, best.unk) });
  }
  return { picks, wb, spent, short, none: picks.length ? '' : short ? 'budget' : 'pool' };
}
function whyOf(x, extra, unk) {
  const { need, missing } = x.h, have = need - missing.length;
  if (!missing.length) return '🥫 Alles daheim – kostet nichts extra';
  const miss = missing.map(m => m.replace(/\s*\([^)]*\)/g, '').trim()).slice(0, 3).join(', ') + (missing.length > 3 ? ' …' : '');
  return (have ? `🥫 ${have} von ${need} Sachen daheim · fehlt: ` : '🛒 Zum Einkaufen: ') + miss + (extra ? ` · ca. ${euro(extra)}` : '') + (unk.length ? ` · ${unk.length === 1 ? 'ein Preis' : unk.length + ' Preise'} noch unbekannt` : '');
}
