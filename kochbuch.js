// The Kochbuch: recipes (book + Vorrat + archive), suggestions, plate check, the book's tabs/pages/rows, recipe page,
// cooking mode (wake lock).
import * as K from './cookbook.js';
import * as Sh from './shop.js';
import * as Nw from './naehr.js';
import * as D from './data.js';
import * as G from './geburtstag.js';
import * as SN from './snacks.js';
import * as Bk from './book.js';
import { esc, key, shortDate, tags, today, uid } from './core.js';
import { A, S, ui } from './state.js';
import { fmtQty, groupQty, itemName, itemQty, parseQty, qtyOk, vorrat, vorratGroups } from './sync.js';
import { daysBetween } from './chores.js';
import { dayIndex, inQ } from './daheim.js';
import { pic } from './einkauf.js';
import { dishPicsOf, loadDishPics, loadRecPhotos } from './recipes.js';
import { nopes } from './home.js';
import { planBanner, planCard, planDayName, planLive, planPickSlot } from './wochenplan.js';
import { render } from './app.js';

// ---------- the cookbook (cookbook.js): suggestions that learn, the plate check, cooking mode ----------
// every recipe: built-in (cookbook.js) + the shared book (photographed pages, written by Claude) + my own ones.
// My own copy with the same id shadows a book recipe (that's how she edits one); S.hiddenRecipes hides book recipes for me.
const bookRecipes = () => { try { return (JSON.parse(localStorage.getItem('gn_book') || 'null') || { recipes: [] }).recipes || []; } catch (e) { return []; } };
export const vorratRecipes = () => { try { return (JSON.parse(localStorage.getItem('gn_vbook') || 'null') || { recipes: [] }).recipes || []; } catch (e) { return []; } };
// "Hätten wir kochen können": every earlier Vorrat set, newest trip first, each recipe once (r.trip = when it was written).
// Their `uses` ids belong to an old fridge, so "Jetzt kochen" matches them by name like any other recipe.
export function archRecipes() {
  let sets = []; try { sets = (JSON.parse(localStorage.getItem('gn_varch') || 'null') || { sets: [] }).sets || []; } catch (e) {}
  const seen = new Set(vorratRecipes().map(r => r.id)), out = [];
  sets.slice().sort((a, b) => b.ts - a.ts).forEach(s => (s.recipes || []).forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); out.push({ ...r, uses: undefined, trip: s.ts }); } }));
  return out;
}
// ✨ new from Claude (2026-10-12): the current set's recipes I haven't opened on their shelf yet → a card on Home.
// S.vrSeen starts (once the archive is loaded) with every older set, so only the newest set counts as new the first time.
export const vrNew = () => { if (!S.vrSeen) return []; const seen = new Set(S.vrSeen); return vorratRecipes().filter(r => !seen.has(r.id) && !r.dupOf).map(r => ({ ...r, vr: true })); };
export function vrSeenAdd(ids, quiet) {
  const had = new Set(S.vrSeen || []), add = ids.filter(id => !had.has(id)); if (!add.length && S.vrSeen) return;
  S.vrSeen = [...had, ...add].slice(-400); S.updatedAt = Date.now(); D.saveLocal(S); D.scheduleBackup(S); if (!quiet) render();
}
export const fixRec = r => ({ tags: [], ing: [], steps: [], icon: '🍽️', min: 0, cat: 'haupt', ...r });
function allRecipes() {
  const mine = (S.myRecipes || []).filter(r => !r.del), ids = new Set(mine.map(r => r.id)), hidden = new Set([...(S.hiddenRecipes || []), ...nopes()]), free = r => !ids.has(r.id) && !hidden.has(r.id);
  return K.RECIPES.filter(free).concat(bookRecipes().filter(free).map(r => fixRec({ ...r, book: true })), mine.filter(r => !hidden.has(r.id)).map(r => fixRec({ ...r, own: true })),
    vorratRecipes().filter(r => free(r) && !r.dupOf).map(r => fixRec({ ...r, vr: true })), archRecipes().filter(r => free(r) && !r.dupOf).map(r => fixRec({ ...r, vr: true, arch: true })),
    snBook() ? SN.RECIPES.filter(free).map(r => fixRec({ ...r })) : []);
}
// 🥜 the Snack-Labor's nine move into the book (chip 🥜 Snacks) once the event is done or its time ran out (user 2026-11-07)
const snBook = () => Date.now() >= SN.END || (S.events || []).some(e => e.id === SN.ID);
// the original a changed recipe came from (built-in, photographed book or Claude's Vorrat), if any
export const origOf = id => K.RECIPES.find(r => r.id === id) || bookRecipes().find(r => r.id === id) || vorratRecipes().find(r => r.id === id) || archRecipes().find(r => r.id === id) || null;
// pregnancy: recipes with runny egg / cold smoked salmon get a note until the baby is here (gone by itself from February 2027)
const PREG_LATER = ['vorrat-eggs-royale', 'vorrat-strammer-max-gurke', 'vorrat-spitzkohl-glasiert', 'ofenkartoffel',
  'buch-eierlikoertorte', 'buch-bienenstich', 'buch-kaese-sahne-torte'];   // Eierlikör; raw egg white / yolk folded into cold creams
export const pregLater = r => PREG_LATER.includes(r.id) && today() < '2027-02-01';
export const loveTag = r => r.level === 'fancy' ? '⛧ aus dem Grimoire' : '';   // Claude's fancy ones get their label; "mag sie" is gone (user)
const tripDate = ts => { const d = new Date(ts); return d.getDate() + '. ' + ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'][d.getMonth()]; };
// a redundant Claude recipe (dupOf = the one we keep, set by `rezepte.py doppelt`, user 2026-10-12) is in no list,
// but the diary and old ratings still find it
export const recipeById = id => allRecipes().find(r => r.id === id) || (r => r && fixRec({ ...r, vr: true }))(vorratRecipes().concat(archRecipes()).find(r => r.id === id))
  || (r => r && fixRec({ ...r, gb: true }))(G.CAKES.find(r => r.id === id))   // (🎂 the birthday cakes: only in their event)
  || (r => r && fixRec({ ...r }))(SN.RECIPES.find(r => r.id === id));   // (🥜 the snacks: in their event until it is done)
const isOurs = r => r.book || r.own;   // (Claude's Vorrat recipes, r.vr, are not "ours": they change with the fridge)
// how much she'd want it: her favourites and what she rated well count more (and their kind), what she just had less,
// and what she didn't like never comes up again
function cookWeight(r) {
  const c = S.cook[r.id] || {};
  if (c.taste === 1) return 0;
  const liked = new Set(allRecipes().filter(x => (S.cook[x.id] || {}).taste === 3 || (x.fav && (S.cook[x.id] || {}).taste !== 1)).flatMap(x => x.tags));
  let w = 1 + (r.fav ? 1.5 : 0) + (c.taste === 3 ? 2.5 : c.taste === 2 ? 0.7 : 0) + 0.25 * r.tags.filter(t => liked.has(t)).length;
  if (c.last && daysBetween(c.last, today()) < 5) w *= 0.15;
  return w;
}
function cookSuggest(n) { // weighted, no repeats; ui.sugSeed changes with "andere Vorschläge"
  let seed = (ui.sugSeed || 1) * 9973 + dayIndex();
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let pool = allRecipes().filter(r => r.cat === 'haupt' && !r.arch && !isCodex(r)).map(r => [r, cookWeight(r)]).filter(([, w]) => w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    let x = rand() * pool.reduce((a, [, w]) => a + w, 0);
    const i = pool.findIndex(([, w]) => (x -= w) < 0);
    out.push(pool[i < 0 ? 0 : i][0]); pool.splice(i < 0 ? 0 : i, 1);
  }
  return out;
}
// which ingredients go on the list: her choice for this recipe, else — not already on the list and not a pantry staple
// (salt/oil/spices: marked "Vorrat?" so she can tick them when they're empty). Nothing is remembered — things run out.
export const ingKey = t => Sh.norm(t);
const onListItem = t => S.shop.find(x => !x.done && Sh.norm(itemName(x)) === ingKey(t));
export const onList = t => !!onListItem(t);
const canAddUp = (t, q) => { const x = onListItem(t), a = parseQty(q); return !!(x && a && qtyOk(itemQty(x), a)); };   // already on the list, amounts add up
export function addToShop(name, qty, raw, from) {
  const x = onListItem(name);
  if (x && qty && qtyOk(itemQty(x), qty)) { const had = itemQty(x); x.text = itemName(x); x.qty = { ...had, n: had.n + qty.n }; if (from && !(x.from || '').includes(from)) x.from = x.from ? x.from + ' + ' + from : from; return; }
  if (x && !qty) return;                                                    // "Salz" twice = once
  S.shop.push({ id: uid(), text: name, qty: qty || null, ...(raw && !qty ? { q: raw } : {}), done: false, ...(from ? { from } : {}) });
}
export const isPantry = t => Sh.classify(t, S.shopLearn || {}) === 'backen';
export const ingWanted = (t, q) => { const k = ingKey(t); return ui.ingPick && k in ui.ingPick ? ui.ingPick[k] : !isPantry(t) && (!onList(t) || canAddUp(t, q)); };
export const sidesOf = () => (ui.sides || []).map(id => K.SIDES.find(s => s.id === id)).filter(Boolean);
function plateHtml(r, sides) {
  if (!r.plate) return '';
  return '<span class="plate">' + Object.entries(K.PLATE).map(([k, [ic, l]]) => { const on = r.plate[k] || sides.some(s => s.g === k); return `<span class="pb ${on ? 'on' : ''}" title="${l}">${ic}</span>`; }).join('') + '</span>';
}
const tasteOf = r => { const c = S.cook[r.id]; return c && c.taste ? K.TASTE.find(t => t[2] === c.taste)[0] : ''; };
// recipe ingredient ↔ Vorrat name (Tomate ↔ Kirschtomaten, 1 Ei ↔ Eier, Gurke ↔ Salatgurke; Sh.sameThing has the rules)
export const vMatch = (ing, have) => Sh.sameThing(ing, have);   // 2026-10-30: by the thing's noun (shop.js), Milch no longer finds Milchreis
export function haveFor(r, V) { // → {need, missing[]} over the real ingredients (staples skipped); too little of something = missing
  V = vorratGroups(V);   // two packs of the same thing count together
  const need = (r.ing || []).filter(([, t]) => t && !isPantry(t));
  return { need: need.length, missing: need.filter(([q, t]) => { const x = V.find(y => vMatch(t, y.name)), rq = parseQty(q);
    return !x || (x.left && rq && qtyOk(x.left, rq) && x.left.n < rq.n - 1e-6); }).map(([q, t]) => { const x = V.find(y => vMatch(t, y.name)); return x && x.left ? t + ' (nur ' + fmtQty(x.left) + ')' : t; }) };
}
export function cookableNow() { // all of it at home / only 1–2 things missing (Claude's Vorrat recipes included)
  const V = vorrat(); if (!V.length) return { all: [], almost: [] };
  const rs = allRecipes().map(r => ({ r, h: haveFor(r, V) })).filter(x => x.h.need >= 2);
  return { all: rs.filter(x => !x.h.missing.length).map(x => x.r),
    almost: rs.filter(x => x.h.missing.length && x.h.missing.length <= 2 && x.h.need - x.h.missing.length >= 2).sort((a, b) => a.h.missing.length - b.h.missing.length).map(x => ({ ...x.r, miss: x.h.missing })) };
}
// 🖍️ 1–3 crayon stars from minutes + number of steps (user's pick; visible only on the picture-book pages, CSS .kstars)
export const kidLevel = r => { const m = r.min || 0, n = (r.steps || []).length; return Math.min(3, (m <= 20 ? 1 : m <= 45 ? 2 : 3) + (n >= 9 ? 1 : 0)); };
const KID_WORDS = ['ganz schnell', 'gemütlich', 'braucht etwas Zeit'];
export const kidStars = (r, words) => { const k = kidLevel(r); return `<span class="kstars" title="${KID_WORDS[k - 1]}"><em>${'★'.repeat(k)}</em><i>${'★'.repeat(3 - k)}</i>${words ? KID_WORDS[k - 1] + '<br>' : ''}</span>`; };
const recipeRow = r => { const him = isCodex(r) && !r.plain, kid = isHerb(r) && !r.plain, mine = r.book || (r.own && (!origOf(r.id) || bookRecipes().some(b => b.id === r.id))); return `<button class="card recipe-row${him ? ' row-him' : kid ? ' row-kid' : ''}" data-a="recipe" data-id="${r.id}">${r.vr && !r.arch ? (him ? '<span class="rnew wax" title="Neu">✠<b>NOVUM</b></span>' : '<span class="rnew kidnew">NEU!</span>') : ''}<span class="ri">${r.icon}</span><span class="rt"><b>${esc(r.title)}</b><br><span class="muted">${r.min ? (him ? '⧗ ' : '⏱ ') + r.min + ' Min.' : ''}${kid ? ' ' + kidStars(r) : ''}${r.vr && loveTag(r) ? ' · ' + loveTag(r) : mine ? (ownerOf(r) === 'stefan' ? ' · 💙 von ihm' : ' · 💛 von ihr') : r.own ? ' · ✏️ angepasst' : ''}${tasteOf(r) ? ' ' + tasteOf(r) : ''}${isBake(r) ? ' <span class="tag bake">🧁 Backen</span>' : ''}${isProtein(r) ? ` <span class="tag" title="High Protein: Eiweiß pro Portion">${protBadge(r)}</span>` : ''}${seasonTag(r)}</span>${pregLater(r) ? '<br><span class="preglater">🤰 erst ab Februar</span>' : ''}${r.miss ? `<br><span class="miss">fehlt nur: ${r.miss.map(esc).join(', ')}</span>` : ''}${r.badge ? '<br>' + r.badge : ''}</span>${plateHtml(r, [])}</button>`; };
// ---------- the Kochbuch = one book (2026-10-11, user): thumb-index tabs Daheim · Jetzt · Nächstes Mal · Gekocht ----------
// 🧊 Daheim = what's home · Jetzt = what can I cook now (all at home first, then "fehlt nur wenig") · Nächstes Mal = what we
// want next time (search, everything) · Gekocht = the diary. A row opens its recipe page with a page-turn; swiping on a recipe
// page goes through the list it came from (ui.kctx). Each recipe page has its style: herStyle → warm, otherwise occult.
export const KTABS = [['jetzt', 'Kochen', '#84a76f'], ['next', 'Stöbern', '#d88e98'], ['gekocht', 'Gekocht', '#c9a45c'], ['herb', 'Kinderleicht', '#6f8f5e', 1], ['codex', 'Culinarius', '#1a0d10', 1]]   // 1 = Claude's shelves (marked in the thumb index);
const SEC_TITLE = { jetzt: 'Was koch ich jetzt?', next: 'Stöbern', gekocht: 'Was wir gekocht haben' };
// Claude's fancy recipes live behind their own bookmark (Julia won't cook those) — out of Kochen, Stöbern and suggestions
export const isCodex = r => !!r.vr && r.level === 'fancy';
export const isHerb = r => !!r.vr && r.level !== 'fancy';   // 🌿 Herbarium: Claude's easy ones (also in Kochen/Stöbern — she cooks those)
// whose style: Claude's easy ones = hers, fancy = his; a photographed page = who took the photo; an own recipe = whose phone
const ownerOf = r => r.by || (r.own && !origOf(r.id) ? D.me() : null);   // (an edited photo page keeps its photographer's `by`)   // own recipes live on their owner's phone
export const styleOf = r => r.level === 'fancy' ? 'him' : r.level === 'einfach' ? 'kid' : ownerOf(r) === 'stefan' ? 'him' : 'her';
export const cookedLog = () => {   // both phones' "cooked" diary, one entry per dish and day, newest first
  const all = [...(S.cookLog || []), ...(S.partnerCooked || [])], seen = new Set();
  return all.sort((a, b) => b.ts - a.ts).filter(x => { const k = x.rid + '|' + x.day; if (seen.has(k)) return false; seen.add(k); return true; });
};
export const ksec = () => KTABS.some(([k]) => k === ui.ktab) ? ui.ktab : 'jetzt';
// the pages the book can turn through right now: the four sections, or (on a recipe) its list with the section in front
function kseq() {
  if (!ui.rid) return KTABS.map(([k]) => ({ sec: k }));
  const ctx = (ui.kctx || []).includes(ui.rid) ? ui.kctx : [ui.rid];
  return [{ sec: ksec() }].concat(ctx.map(id => ({ sec: ksec(), rid: id })));
}
const kidx = () => ui.rid ? 1 + Math.max(0, ((ui.kctx || []).includes(ui.rid) ? ui.kctx : [ui.rid]).indexOf(ui.rid)) : KTABS.findIndex(([k]) => k === ksec());
export function kpage(st) {   // one page of the book: {key, theme, html}
  if (!st.rid) return { key: 'sec-' + st.sec, theme: st.sec === 'codex' ? 'him' : st.sec === 'herb' ? 'kid' : 'her', html: sectionPage(st.sec) };
  const r = recipeById(st.rid); if (!r) return { key: 'gone', theme: 'her', html: '<p class="muted">Das Rezept gibt es nicht mehr.</p>' };
  if (st.rid === ui.rid) return { key: 'r-' + r.id, theme: styleOf(r), html: recipePage(r) };
  const keepUi = [ui.sides, ui.ingPick, ui.ingExtra]; ui.sides = []; ui.ingPick = {}; ui.ingExtra = [];   // a neighbour page: fresh
  try { return { key: 'r-' + r.id, theme: styleOf(r), html: recipePage(r) }; } finally { [ui.sides, ui.ingPick, ui.ingExtra] = keepUi; }
}
const klabel = () => { const s = KTABS.find(([k]) => k === ksec())[1]; if (!ui.rid) return s; const n = kseq().length - 1; return `${s} · Rezept ${kidx()} von ${n}`; };
export const bookApi = {
  at: i => kpage(kseq()[i]), i: kidx, n: () => kseq().length, label: klabel, tab: ksec,
  hydrate(el) { loadRecPhotos(el); loadDishPics(el); },   // a page that turns in (swipe) loads its photos too
  onTurn(i) { const st = kseq()[i]; if (st.rid) { ui.rid = st.rid; ui.sides = []; ui.ingPick = {}; ui.ingExtra = []; } else { ui.rid = null; ui.ktab = st.sec; } },
};
export function viewCook() {
  if (ui.rid && ui.cstep != null) return viewCookMode();
  if (ui.rid && !recipeById(ui.rid)) ui.rid = null;
  return planBanner() + Bk.frame({ tabs: KTABS, cur: ksec(), page: kpage(ui.rid ? { sec: ksec(), rid: ui.rid } : { sec: ksec() }), label: klabel() });
}
function sectionPage(k) {
  if (k === 'codex') return viewShelf('codex');
  if (k === 'herb') return viewShelf('herb');
  const body = k === 'next' ? viewNext() : k === 'gekocht' ? viewGekocht() : planCard() + viewJetzt();
  return `<div class="sec-head"><h2>${SEC_TITLE[k]}</h2>${Bk.sectionArt(k)}</div>` + body;
}
// the list for the swipe-through: every recipe row on the page, in order
const ctxOf = html => [...new Set([...html.matchAll(/data-a="recipe" data-id="([^"]+)"/g)].map(m => m[1]))].join(',');
const withCtx = html => `<div data-ctx="${esc(ctxOf(html))}">${html}</div>`;
const stampRow = (r, html) => recipeRow({ ...r, badge: html });
const CAT_SHORT = { haupt: '🍽️ Haupt', fruehstueck: '🍳 Frühstück', protein: '💪 Protein', salat: '🥗 Salat', dessert: '🍨 Dessert', backen: '🧁 Backen', snack: '🥜 Snacks', drink: '🍹 Drinks' };   // one row of chips in the book
// 💪 High Protein (Julia 2026-10-30): a TAG on any category ('protein' in r.tags), but its own chip in the book, after Frühstück
const BOOK_CATS = K.CATS.slice(0, 2).concat([['protein', '💪 High Protein']], K.CATS.slice(2));
// .5 (user): calculated from the Nährwerte (Nw.highProtein: ≥ 25 g and ≥ 20 % of the kcal); the hand-set tag still counts on top
export const protTag = r => (r.tags || []).includes('protein');
const isProtein = r => protTag(r) || Nw.highProtein(Nw.nutrition(r));
const protBadge = r => { const n = Nw.nutrition(r); return n ? '💪 ' + Math.round(n.ew) + ' g' : '💪'; };
// 🧁 Backen (user 2026-10-18): category 'backen' OR the tag 'backen' (a baked dessert like the Lime Pie is in Dessert AND Backen)
const BAKE_RX = /kuchen|torte|schnitte|muffin|plätzchen|keks|brownie|cookie|tarte|pie|strudel|soufflé|crumble|gebäck|waffel|crossies|linzer/i;
// 🎃 seasonal flair (user 2026-10-18): a recipe written for a season gets its icon (r.season; the first spooky set predates the field)
const SEASONS = { halloween: ['🎃', 'Spooky'], weihnachten: ['🎄', 'Weihnachtszeit'], ostern: ['🐣', 'Ostern'], sommer: ['🍓', 'Sommer'], herbst: ['🍂', 'Herbst'], winter: ['❄️', 'Winter'], fruehling: ['🌷', 'Frühling'] };
const OLD_SPOOKY = ['vorrat-monster-haferkekse', 'vorrat-mumien-wuerstchen', 'vorrat-vampir-windbeutel', 'vorrat-grabstein-florentiner', 'vorrat-husarenkrapfen-augaepfel', 'vorrat-spinnennetz-brownies', 'vorrat-hexenzopf-babka', 'vorrat-scherben-tartelettes'];
export const seasonOf = r => SEASONS[r.season || (OLD_SPOOKY.includes(r.id) ? 'halloween' : '')] || null;
export const seasonTag = r => { const x = seasonOf(r); return x ? ` <span class="season" title="${x[1]}" aria-label="${x[1]}">${x[0]}</span>` : ''; };   // emoji only (user 2026-10-26)
// 👅 taste profile (user 2026-10-18: easier to decide while swiping): r.taste = 3 words, r.hot = 0–3 🌶️
export const flavor = r => (r.taste && r.taste.length) || r.hot ? `<span class="flavor">👅 ${(r.taste || []).map(esc).join(' · ')}${r.hot ? ` <span class="hot" title="scharf">${'🌶️'.repeat(Math.min(3, r.hot))}</span>` : ''}</span>` : '';
export const isBake = r => r.cat === 'backen' || (r.tags || []).includes('backen') || (r.cat === 'dessert' && BAKE_RX.test(r.title || ''));
const inCat = (r, k) => k === 'backen' ? isBake(r) : k === 'protein' ? isProtein(r) : r.cat === k;
function viewJetzt() {   // per category: shopped for → all at home → only 1–2 things missing
  const cn = cookableNow(), dish = new Set((S.dishes || []).map(x => x.id)), home = new Set(cn.all.map(r => r.id));
  const by = cat => {
    const shop = (S.dishes || []).map(x => recipeById(x.id)).filter(r => r && inCat(r, cat) && !isCodex(r));
    return shop.map(r => stampRow(r, `<span class="rstamp shop">🛒 eingekauft</span>`))
      .concat(cn.all.filter(r => inCat(r, cat) && !dish.has(r.id) && !isCodex(r)).map(r => stampRow(r, `<span class="rstamp home">✅ alles daheim</span>`)))
      .concat(cn.almost.filter(r => inCat(r, cat) && !dish.has(r.id) && !home.has(r.id) && !isCodex(r)).map(recipeRow));
  };
  const counts = Object.fromEntries(BOOK_CATS.map(([k]) => [k, by(k).length]));
  if (!Object.values(counts).some(Boolean)) return `<div class="card"><p style="margin:0">Gerade passt nichts zu dem, was daheim ist.</p><p class="muted">Schau oben unter <b>🧊 Vorrat</b>, ob alles stimmt – oder such dir unter <b>Stöbern</b> was für den nächsten Einkauf aus.</p></div>`;
  const cat = counts[ui.kcat] ? ui.kcat : BOOK_CATS.find(([k]) => counts[k])[0];
  const rows = by(cat).join('');
  return `<div class="chips ccats">${BOOK_CATS.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-a="kcat" data-v="${k}" ${counts[k] ? '' : 'disabled'}>${CAT_SHORT[k] || l} <span class="cnt">${counts[k]}</span></button>`).join('')}</div>`
    + withCtx(rows) + `<p class="hint">Salz, Öl, Gewürze & Co. zählen als „immer da“.</p>`;
}
// ✠ Codex Culinarius Infernalis: his fancy recipes; what the pantry already allows gets a stamp and comes first
// Claude's two shelves, same build: by category; per category what the Vorrat already allows (stamp) → 1–2 missing → the rest.
// 'codex' = Culinarius Infernalis (his fancy ones, occult) · 'herb' = Herbarium (the easy ones, warm)
function viewShelf(kind) {
  const codex = kind === 'codex', key = codex ? 'xcat' : 'hcat';
  const fresh = vrNew().filter(codex ? isCodex : isHerb).map(r => r.id); if (fresh.length) setTimeout(() => vrSeenAdd(fresh, true), 0);
  const V = vorrat(), all = allRecipes().filter(codex ? isCodex : isHerb).map(r => ({ r, h: V.length ? haveFor(r, V) : { need: 1, missing: [1, 2, 3] } }));
  const rank = x => !x.h.missing.length ? 0 : x.h.missing.length <= 2 ? 1 : 2;
  const counts = Object.fromEntries(BOOK_CATS.map(([k]) => [k, all.filter(x => inCat(x.r, k)).length]));
  const cat = counts[ui[key]] ? ui[key] : (BOOK_CATS.find(([k]) => counts[k]) || ['haupt'])[0];
  const stamp = codex ? `<span class="rstamp pantry">✠ mit dem Vorrat beschwörbar</span>` : `<span class="rstamp herb">🌿 mit dem Vorrat machbar</span>`;
  const rows = all.filter(x => inCat(x.r, cat)).sort((a, b) => rank(a) - rank(b))
    .map(({ r, h }) => !h.missing.length ? stampRow(r, stamp) : h.missing.length <= 2 ? recipeRow({ ...r, miss: h.missing }) : recipeRow(r)).join('');
  const head = codex ? `<div class="sec-head codex"><h2>Culinarius<br>Infernalis</h2>${Bk.sectionArt('codex')}</div>`
    : `<div class="sec-head"><h2>Kinderleicht</h2>${Bk.sectionArt('herb')}</div><p class="muted" style="margin:-4px 2px 10px">Was Claude euch aus dem Vorrat geschrieben hat.</p>`;
  return head + (all.length ? `<div class="chips ccats">${BOOK_CATS.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-a="shelfcat" data-k="${key}" data-v="${k}" ${counts[k] ? '' : 'disabled'}>${CAT_SHORT[k] || l} <span class="cnt">${counts[k]}</span></button>`).join('')}</div>` + withCtx(rows)
    : `<p class="muted">Noch leer. Nach dem nächsten Einkauf ${codex ? 'beschwört Claude hier neue Werke' : 'wachsen hier neue Rezepte'}.</p>`);
}
function viewNext() {
  let h = `<div class="rsrow"><input id="rsearch" class="rsearch" type="search" placeholder="🔎 Rezept oder Zutat suchen…" value="${esc(ui.rq || '')}" autocomplete="off" enterkeyhint="search"><button class="ricon" data-a="rphoto" aria-label="Rezept fotografieren">📷</button><button class="ricon" data-a="redit" aria-label="Eigenes Rezept schreiben">✏️</button></div>`;
  const wait = (S.recipeInbox || []).filter(x => !x.del);
  if (wait.length) h += `<div class="card"><h3>📷 Wird gerade umgeschrieben</h3>${wait.map(x => `<div class="shoprow"><span style="flex:1">${x.n} ${x.n === 1 ? 'Foto' : 'Fotos'}${x.note ? ' · „' + esc(x.note) + '“' : ''}<br><span class="muted">${x.up ? 'abgeschickt am ' + esc(shortDate(key(new Date(x.ts)))) : '⏳ wird noch hochgeladen…'}</span></span><button class="mini-btn" data-a="rinboxdel" data-id="${x.id}" aria-label="Zurückziehen">✕</button></div>`).join('')}
    <p class="hint">Claude macht daraus eine Kochbuch-Seite mit Zutaten und Schritten – sie taucht hier auf, sobald sie fertig ist.</p></div>`;
  h += `<div id="rresults">${searchHtml()}</div>`;
  if (ui.rq) return h;
  const ours = allRecipes().filter(isOurs), cats = BOOK_CATS.map(([k, l]) => [k, CAT_SHORT[k] || l]).concat(ours.length ? [['ours', '📷 Unsere']] : []);
  const cat = cats.some(([k]) => k === ui.ccat) ? ui.ccat : 'haupt';
  h += `<div class="chips ccats">${cats.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-a="ccat" data-v="${k}">${l}</button>`).join('')}</div>`;
  const list = (cat === 'ours' ? ours
    : allRecipes().filter(r => inCat(r, cat))).filter(r => !isCodex(r));
  const rows = list.map(r => recipeRow(cat === 'ours' ? { ...r, plain: true } : r)).join(''); h += rows ? withCtx(rows) : '<p class="muted">Noch nichts hier.</p>';
  if (cat === 'haupt') h += `<p class="hint">${Object.values(K.PLATE).map(([i, l]) => i + ' ' + l).join(' · ')} – fehlt etwas auf dem Teller, schlägt dir das Rezept was dazu vor.</p>`;
  return h;
}
// every recipe; title, ingredients and tags count. 2026-10-30 (Julia: type an ingredient, see the recipes with it): every word
// must hit, forgiving about plurals (Tomaten finds Tomate, Eier finds 1 Ei); a hit in the ingredients shows which one.
export function searchHtml() {
  const words = Sh.norm(ui.rq || '').split(/\s+/).filter(w => w.length >= 2).map(w => Sh.stem(w)); if (!words.length) return '';
  const has = (t, w) => Sh.stem(t) === w || Sh.nouns(t).concat(String(t).toLowerCase().split(/[^a-zäöüß]+/).map(Sh.stem)).some(x => x.startsWith(w) || (w.length >= 4 && x.endsWith(w)));   // "tom…" while typing, Kirsch|tomaten
  const hits = [];
  for (const r of allRecipes()) {
    if (isCodex(r)) continue;
    const ing = (r.ing || []).map(x => x[1]).filter(Boolean), tags = r.tags || [];
    const inTitle = w => has(r.title, w) || tags.some(t => has(t, w)), inIng = w => ing.filter(t => has(t, w));
    if (!words.every(w => inTitle(w) || inIng(w).length)) continue;
    const via = [...new Set(words.flatMap(w => inTitle(w) ? [] : inIng(w)))];
    hits.push({ r, title: words.every(inTitle), via });
  }
  hits.sort((a, b) => b.title - a.title);
  const rows = hits.slice(0, 40).map(h => recipeRow(h.via.length ? { ...h.r, badge: `<span class="muted">🔎 mit ${h.via.slice(0, 3).map(esc).join(', ')}</span>` } : h.r)).join('');
  return rows ? withCtx(rows) : '<p class="muted">Nichts gefunden – auch nicht in den Zutaten.</p>';
}
function viewGekocht() {
  const L = cookedLog();
  if (!L.length) return `<div class="card"><p style="margin:0">Hier entsteht euer Koch-Tagebuch.</p><p class="muted">Nach „Fertig gekocht! 🎉“ landet jedes Gericht hier – mit Datum und wie’s geschmeckt hat.</p></div>`;
  const n = {}; L.forEach(x => { n[x.rid] = (n[x.rid] || 0) + 1; });
  const top = Object.entries(n).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 3);
  let h = top.length ? `<div class="card"><h3>🏆 Am öftesten</h3>${top.map(([rid, c]) => { const x = L.find(y => y.rid === rid), r = recipeById(rid) || x; return `<button class="pick" data-a="recipe" data-id="${esc(rid)}"><span style="font-size:24px">${r.icon || '🍽️'}</span><span style="flex:1">${esc(r.title || '')}</span><b>${c}×</b></button>`; }).join('')}</div>` : '';
  let month = '', rows = '';
  for (const x of L) {
    const d = new Date(x.day + 'T12:00'), m = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }), r = recipeById(x.rid);
    if (m !== month) { month = m; rows += `<div class="sec-title">${esc(m)}</div>`; }
    const taste = x.taste ? K.TASTE.find(t => t[2] === x.taste)[0] : '', pic = dishPicsOf(x.rid).find(y => y.day === x.day);
    rows += `<button class="card diaryrow" ${r ? `data-a="recipe" data-id="${esc(x.rid)}"` : 'disabled'}><span class="dd">${x.old ? '<span class="muted">zuletzt</span>' : d.toLocaleDateString('de-DE', { weekday: 'short' })}<b>${d.getDate()}.</b></span>${pic ? `<img class="dishpic ri-pic" data-dish="${esc(pic.id)}" alt="">` : `<span class="ri">${(r || x).icon || '🍽️'}</span>`}<span class="rt"><b>${esc((r || x).title || '')}</b></span><span class="dt">${taste}</span></button>`;
  }
  return h + withCtx(rows) + `<p class="hint">Antippen = Rezept, von dort direkt wieder auf die Einkaufsliste.</p>`;
}
// 🧊 Daheim: the Vorrat, sorted by where it sits (from the shop sections; moved by hand = remembered)
export const PLACES = [['kuehl', '🧀', 'Kühlschrank'], ['obst', '🍎', 'Obst & Gemüse'], ['tk', '❄️', 'Tiefkühler'], ['schrank', '🥫', 'Vorratsschrank']];
export const placeOf = x => { const k = Sh.norm(x.name); if ((S.vorratPlace || {})[k]) return S.vorratPlace[k];
  const sec = Sh.classify(x.name, S.shopLearn || {}); return sec === 'kuehl' || sec === 'fleisch' ? 'kuehl' : sec === 'obst' ? 'obst' : sec === 'tk' ? 'tk' : 'schrank'; };
export function viewDaheim() {
  const V = vorratGroups();
  const use = ui.vuse; // 🍳 "Ich hab gebraucht…": tick what she used for cooking off-book (no stars)
  let h = `<form class="add" data-f="vorratadd"><input name="t" placeholder="Hab ich daheim… z.B. 500 g Nudeln" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Zum Vorrat">+</button></form>`;
  if (!V.length) return h + `<div class="card"><p style="margin:0">Noch nichts eingetragen.</p><p class="muted">Nach dem Einkaufen in der Einkaufsliste „✅ Alles eingekauft!“ drücken – dann ist alles hier. Oder oben eintragen, was eh da ist.</p></div>`;
  for (const [k, ic, l] of PLACES) {
    const xs = V.filter(x => placeOf(x) === k).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (!xs.length) continue;
    h += `<div class="card vplace"><h3>${ic} ${l} <span class="muted">(${xs.length})</span></h3>${xs.map(x => use ? `<div class="shoprow"><button class="pick ${use.has(x.id) ? 'on' : ''}" data-a="vusetick" data-id="${esc(x.id)}"><span class="box">${use.has(x.id) ? '✓' : ''}</span><span style="flex:1">${esc(x.name)}</span>${groupQty(x) ? `<b class="qty">${esc(groupQty(x))}</b>` : ''}</button></div>` : `<div class="vswipe"><span class="vs-bg" aria-hidden="true">Ist alle! 🧊</span><div class="shoprow vrow" data-id="${esc(x.id)}"><button class="pick" data-a="vorratqty" data-id="${esc(x.id)}"><span style="flex:1">${esc(x.name)}</span>${groupQty(x) ? `<b class="qty">${esc(groupQty(x))}</b>` : ''}</button><button class="mini-btn vcart${onList(x.name) ? ' on' : ''}" data-a="vcart" data-id="${esc(x.id)}" aria-label="${onList(x.name) ? 'Steht schon auf der Einkaufsliste' : 'Auf die Einkaufsliste'}">🛒</button></div></div>`).join('')}</div>`;
  }
  if (use) return h + `<div class="row"><button class="btn soft" data-a="vuse">Abbrechen</button><button class="btn green" data-a="vusedone"${use.size ? '' : ' disabled'}>Fertig${use.size ? ' (' + use.size + ')' : ''}</button></div><p class="hint">Antippen, was du gebraucht hast – „Fertig“ nimmt es aus dem Vorrat. Gibt keine Sterne.</p>`;
  return h + `<div class="row"><button class="btn soft" data-a="vuse">🍳 Ich hab gebraucht…</button></div><p class="hint">Tippen = Menge ändern oder umräumen · 🛒 = auf die Einkaufsliste · zur Seite wischen = ist alle. „Jetzt kochen“ nimmt raus, was ein Rezept braucht.</p>`;
}
// 🧊 swipe a Daheim row sideways = "Ist alle!" (user 2026-11-06; undo in the toast). Vertical drags stay scrolling.
export function wireVSwipe() {
  let r = null, x0 = 0, y0 = 0, dx = 0, dir = 0, eat = false;
  document.addEventListener('pointerdown', e => {
    eat = false; const k = e.target.closest('.vrow'); if (!k || e.button || ui.vuse) return;
    r = k; x0 = e.clientX; y0 = e.clientY; dx = 0; dir = 0; r.style.transition = 'none';
  });
  document.addEventListener('pointermove', e => {
    if (!r) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!dir) { if (Math.abs(mx) < 10 && Math.abs(my) < 10) return; dir = Math.abs(mx) > Math.abs(my) ? 1 : -1; if (dir < 0) { r.style.transition = ''; r = null; return; } }
    dx = mx; r.style.transform = 'translateX(' + dx + 'px)';
    r.parentNode.classList.toggle('arm', Math.abs(dx) > r.offsetWidth * 0.35);
  });
  const up = () => {
    if (!r) return;
    const k = r, id = k.dataset.id, w = k.offsetWidth; r = null; k.style.transition = '';
    if (dir > 0) eat = true;   // the click after a drag must not open the amount popup
    if (dir > 0 && Math.abs(dx) > w * 0.35) {
      k.style.transform = 'translateX(' + (dx > 0 ? w : -w) + 'px)'; k.parentNode.classList.add('gone');
      setTimeout(() => A.vswipe({ dataset: { id } }), 180);
    } else { k.style.transform = ''; k.parentNode.classList.remove('arm'); }
  };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  document.addEventListener('click', e => { if (eat) { eat = false; if (e.target.closest('.vrow')) { e.stopPropagation(); e.preventDefault(); } } }, true);
}
// 🔢 Nährwerte (2026-10-30, user): estimated from the ingredients (naehr.js), only on the recipe page; a guessed piece count says so
const PLURAL = { Portion: 'Portionen', Stück: 'Stück', Glas: 'Gläser' };
function nutriLine(r) {
  const n = Nw.nutrition(r); if (!n) return '';
  const g = x => Math.round(x) + ' g', per = n.guess ? `pro ${n.label}, bei ca. ${n.n} ${PLURAL[n.label] || n.label}` : 'pro ' + n.label;
  return `<p class="bp-nutri">ca. ${Math.round(n.kcal / 10) * 10} kcal · ${g(n.f)} Fett · ${g(n.kh)} KH · ${g(n.ew)} Eiweiß <span class="muted">${per}${n.missing.length ? ' · ohne ' + esc(n.missing.join(', ')) : ''}</span></p>`;
}
// one recipe as a book page: the style's head + the working parts (plate check, ingredients → list, steps → Jetzt kochen)
export function recipePage(r) {
  const theme = styleOf(r), sides = sidesOf(), c = S.cook[r.id], cooked = !!(c && c.n) || cookedLog().some(x => x.rid === r.id), V = vorrat();
  const home = V.length && r.ing.some(([, t]) => t && !isPantry(t)) && !haveFor(r, V).missing.length;
  const d = Bk.deco(theme, r, { cooked, taste: tasteOf(r) }), him = theme === 'him', dp = dishPicsOf(r.id);
  let h = inQ('kochbuch') ? `<button class="bp-back" data-a="rback">‹ ${esc(KTABS.find(([k]) => k === ksec())[1])}</button>` : '';
  // 📷 her own dish photo wins the top spot (user 2026-11-01); the cookbook's picture stays behind "📷 Original-Seite".
  // The photo comes BEFORE the side drawing + stamp: after them it dropped below the floats and left a gap.
  h += `${dp.length ? `<button class="dishtop" data-a="dishview" data-id="${esc(dp[0].id)}" aria-label="Foto ansehen"><img class="recphoto dishpic" data-dish="${esc(dp[0].id)}" alt=""></button>` : r.photo ? `<img class="recphoto" data-photo="${esc(r.photo)}" alt="">` : ''}${d.side + d.stamp}<h2 class="bp-title">${theme === 'kid' ? '' : r.icon + ' '}${esc(r.title)}</h2>
    <p class="bp-meta">${theme === 'kid' ? kidStars(r, true) : ''}${r.min ? (him ? '⧗ ' : '⏱ ') + r.min + ' Min. · ' : ''}${!him ? 'für ' + esc(r.serves || 2) : /^\s*\d+([–-]\d+)?\s*$/.test(String(r.serves || 2)) ? 'für ' + esc(r.serves || 2) + ' Seelen' : 'beschwört ' + esc(r.serves)}${r.vr && loveTag(r) ? ' · ' + loveTag(r) : ''}${c ? ' · ' + c.n + '× gekocht ' + tasteOf(r) : ''}${seasonTag(r)}</p>${nutriLine(r)}${flavor(r) ? `<p class="bp-flavor">${flavor(r)}</p>` : ''}
    ${home ? `<span class="bp-tape">${him ? '✠ alles in der Speisekammer' : '🧊 alles daheim'}</span>` : ''}
    ${r.src ? `<p class="muted" style="margin:2px 0">📚 ${esc(r.src)}</p>` : ''}${pregLater(r) ? `<p class="preglater" style="margin:4px 0">🤰 Erst ab Februar – flüssiges Ei oder kalter Räucherlachs</p>` : ''}${r.note ? `<p class="bp-note">${esc(r.note)}</p>` : ''}
    ${ui.planPick != null ? `<button class="btn green wide" style="clear:both;margin:6px 0" data-a="planset" data-id="${r.id}" data-i="${ui.planPick}">🗓️ Für ${esc(planDayName(planLive().start, ui.planPick))} nehmen${planPickSlot() ? ' · ' + planPickSlot() : ''}</button>` : ''}
    <div class="row" style="justify-content:flex-start;margin:6px 0 10px;clear:none"><button class="btn soft" data-a="redit" data-id="${r.id}">✎ Ändern</button><button class="btn soft" data-a="planask" data-id="${r.id}">🗓️ Planen</button><label class="btn soft">📷 Foto<input type="file" accept="image/*" data-ch="dishadd" data-id="${esc(r.id)}" hidden></label>${r.pages && r.pages.length ? `<button class="btn soft" data-a="rpages" data-id="${r.id}">📷 Original-Seite</button>` : ''}</div>
    ${dp.length > 1 ? `<div class="dishstrip">${dp.slice(1).map(x => `<button class="dishthumb" data-a="dishview" data-id="${esc(x.id)}"><img class="dishpic" data-dish="${esc(x.id)}" alt=""><span>${esc(shortDate(x.day))}</span></button>`).join('')}</div>` : ''}`;
  if (r.plate) {
    const missing = Object.keys(K.PLATE).filter(k => !r.plate[k] && !sides.some(s => s.g === k));
    const want = Object.keys(K.PLATE).filter(k => !r.plate[k]);
    h += `<div class="card platecheck" style="clear:both"><h3>Teller-Check ${plateHtml(r, sides)}</h3>` +
      (missing.length ? `<p style="margin:4px 0 8px">Da fehlt noch <b>${missing.map(k => K.PLATE[k][1]).join(' & ')}</b> – nimm was dazu:</p>` : `<p style="margin:4px 0 8px">✓ Alles drauf: satt, Eiweiß und Gemüse.</p>`) +
      want.map(k => { const hint = K.SIDE_HINTS[r.id] || [], opts = K.SIDES.filter(s => s.g === k).sort((a, b) => (hint.includes(b.id) ? 1 : 0) - (hint.includes(a.id) ? 1 : 0)).slice(0, 4);
        return `<div class="chips">${opts.map(s => `<button class="chip ${(ui.sides || []).includes(s.id) ? 'on' : ''}" data-a="side" data-id="${s.id}">${K.PLATE[k][0]} ${esc(s.title)}</button>`).join('')}</div>`; }).join('') + '</div>';
  }
  const ing = r.ing.concat(...sides.map(s => s.ing.map(x => [x[0], x[1], s.title])));
  const sel = ing.filter(([q, t]) => t && ingWanted(t, q)).length, total = sel + (ui.ingExtra || []).length;
  // 🧊 per ingredient that the Vorrat has (user 2026-11-02): tap it when it's actually gone → out of the Vorrat right here
  const VG = vorratGroups(V), vg = t => t && !isPantry(t) && VG.find(y => vMatch(t, y.name));
  const anyV = ing.some(([, t]) => vg(t));
  h += `<div class="card" style="clear:both"><h3>${him ? 'Opfergaben' : 'Was du brauchst'}</h3><p class="muted" style="margin-top:0">Was du gerade noch daheim hast, einfach abwählen.${anyV ? ' 🧊 = liegt im Vorrat – antippen, wenn’s doch alle ist.' : ''}</p>
    <div class="steps">${ing.map(([q, t, from]) => { const on = t && ingWanted(t, q), why = canAddUp(t, q) ? '+ zur Menge auf der Liste' : onList(t) ? 'steht schon drauf' : isPantry(t) ? 'Vorrat?' : '';
      const row = `<button class="pick ${on ? 'on' : ''}" data-a="ingtoggle" data-v="${esc(t)}" data-q="${esc(q || '')}"><span class="box">${on ? '✓' : ''}</span><span style="flex:1">${esc(t)}${from ? ` <span class="tag">${esc(from)}</span>` : ''}${why && (!on || canAddUp(t, q)) ? ` <span class="tag">${why}</span>` : ''}</span><span class="muted">${esc(q)}</span></button>`;
      const g = vg(t); if (!g) return row;
      const rq = parseQty(q || ''), low = g.left && rq && qtyOk(g.left, rq) && g.left.n < rq.n - 1e-6;
      return `<div class="shoprow ingrow">${row}<button class="vhave${low ? ' low' : ''}" data-a="vhave" data-id="${esc(g.id)}" data-v="${esc(t)}" data-q="${esc(q || '')}" aria-label="Im Vorrat: ${esc(g.name)} – antippen, wenn es alle ist">🧊${low ? ' nur ' + esc(groupQty(g)) : ''}</button></div>`; }).join('')}</div>
    ${(ui.ingExtra || []).length ? `<div class="steps">${ui.ingExtra.map((t, i) => `<div class="shoprow"><span class="pick on" style="cursor:default"><span class="box">✓</span><span style="flex:1">${esc(t)} <span class="tag">dazu</span></span></span><button class="mini-btn" data-a="ingextradel" data-i="${i}" aria-label="Entfernen">✕</button></div>`).join('')}</div>` : ''}
    <form class="add" data-f="ingextra"><input name="t" placeholder="Noch was dazu? (z.B. Getränke)" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Dazu">+</button></form>
    <div class="row"><button class="btn soft" data-a="cookshop2" ${sel + (ui.ingExtra || []).length ? '' : 'disabled'}>🛒 ${total ? total + (total === 1 ? ' Sache' : ' Sachen') + ' auf die Liste' : 'Alles da'}</button></div></div>`;
  h += `<div class="card"><h3>${him ? 'Ritus' : 'So geht’s'}</h3><ol class="steps-ol">${cookSteps(r, sides).map(([t, m], i) => `<li>${esc(t)}${m ? ` <button class="toolbtn steptimer" data-a="steptimer" data-i="${i}" aria-label="Handy-Timer ${m} Minuten">⏰ ${m} Min.</button>` : ''}</li>`).join('')}</ol>
    <button class="btn green wide bp-go" data-a="cookstart">${him ? '🕯️ Das Ritual beginnen' : '🍳 Jetzt kochen'}</button>
    <button class="btn soft wide bp-quick" data-a="quickcook">${him ? '✠ Schon vollbracht' : '✅ Schon gekocht'} <span class="muted">– ohne Anleitung</span></button></div>`;
  return h + d.foot + (him ? Bk.candles() : '');
}
export const cookSteps = (r, sides) => r.steps.concat(sides.map(s => ['Dazu – ' + s.title + ': ' + s.step[0], s.step[1]]));
// cooking mode: the amounts a step needs, found by name ("Lachs salzen" → 2 Lachsfilets, 1 Prise Salz). Fuzzy on purpose;
// whatever it misses is under "📋 Alle Zutaten". Words that only describe (kalte, gehackt, Dose …) don't count.
const ING_SKIP = new Set('frisch frische frischer frisches kalt kalte kalter kaltes warm warme warmer weich weiche weicher gehackt gehackte gerieben geriebene geriebener gemahlen gemahlener getrocknet getrocknete klein kleine kleiner groß große großer grob fein feine etwas optional nach geschmack oder und für mit aus zum zur dose dosen packung packungen glas stück prise bund zehe zehen scheibe scheiben tk rote roter rotes weiße weißer grüne grüner schwarzer halbe ganze bio form'.split(' '));
const ingWords = t => String(t || '').toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-zäöüß]+/).filter(Boolean);
const ingStem = w => w.replace(/(en|er|es|n|e|s)$/, '');
function stepIng(text, ing) {
  const sw = ingWords(text), ss = sw.map(ingStem);
  return ing.filter(([, n]) => n && ingWords(n).some(w => {
    if (ING_SKIP.has(w)) return false;
    const a = ingStem(w);
    if (a.length < 4) return sw.includes(w) || a.length >= 2 && ss.includes(a);      // short words (Öl, Ei/Eier, Reis) only whole
    // Lachs ↔ Lachsfilets, Salz ↔ salzen, Räucherlachs/Olivenöl/Rinderhack ↔ Lachs/Öl/Hack
    return sw.some((x, k) => x.startsWith(a) || ss[k].length >= 4 && (a.startsWith(ss[k]) || a.endsWith(ss[k])) || x === 'öl' && w.endsWith('öl'));
  }));
}
const ingLine = ([q, n, from]) => `<li><b>${esc(q || '')}</b> ${esc(n)}${from ? ` <span class="tag">${esc(from)}</span>` : ''}</li>`;
let wake = null;
export function viewCookMode() {
  const r = recipeById(ui.rid), sides = sidesOf(), steps = cookSteps(r, sides), i = ui.cstep, [t, m] = steps[i] || ['', 0], last = i >= steps.length - 1;
  if (!wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {});   // the screen stays on while cooking
  const side = sides[i - r.steps.length], need = stepIng(t, side ? side.ing : r.ing);
  const all = r.ing.concat(...sides.map(s => s.ing.map(x => [x[0], x[1], s.title])));
  return `<div class="cookmode"><div class="muted" style="font-weight:800">${r.icon} ${esc(r.title)} · Schritt ${i + 1} von ${steps.length}</div>
    <div class="bar"><i style="width:${(i + 1) / steps.length * 100}%"></i></div>
    <p class="cstep">${esc(t)}</p>
    ${need.length ? `<ul class="cing">${need.map(ingLine).join('')}</ul>` : ''}
    <div style="flex:1"></div>
    <button class="btn soft wide cing-all" data-a="cingall">📋 Alle Zutaten ${ui.cingAll ? '▴' : '▾'}</button>
    ${ui.cingAll ? `<ul class="cing cing-list">${all.filter(x => x[1]).map(ingLine).join('')}</ul>` : ''}
    ${m ? `<button class="btn blue wide" data-a="cooktimer">⏰ Handy-Timer: ${m} Min.</button>` : ''}
    <div class="row" style="margin-top:18px">${i ? '<button class="btn soft" data-a="cprev">← Zurück</button>' : '<button class="btn soft" data-a="cookstop">Abbrechen</button>'}${last ? '<button class="btn green" data-a="cookdone">Fertig gekocht! 🎉</button>' : '<button class="btn" data-a="cnext">Weiter →</button>'}</div></div>`;
}
export function endCookMode() { if (wake) { wake.release().catch(() => {}); wake = null; } ui.cstep = null; }
