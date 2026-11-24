// 🧭 Über den Tellerrand (G26, 2026-11-24): the Entdecker shelf. One plate per kitchen (what we cooked lies on it, a dome
// hides what still waits there), one jar per spice, the season's produce — and behind each of them a swipe stack of new
// dishes (right = "Das kochen wir", shared by both phones; left = gone for me only).
// Recipes: rezepte/entdecker.json in the data repo (written by Claude, rules in E:\GuteNudel\entdecker\REGELN.md), cached
// in localStorage gn_ent. They are NOT in the Kochbuch lists (240 would flood it); recipeById finds them, so the recipe
// page, cooking mode, diary and dish photos work as for any recipe.
// Save: S.entMine = my swipes onto the list {rid: [1 on | 0 off, ts]} (posted, S.partnerEnt = theirs; newest wins),
// S.entNo = my "no" pile {rid: [1, ts]} (never posted), S.entSeen = kitchens already counted for stars.
import * as B from './baby.js';
import { KUECHE_OF } from './entdecker_tags.js';
import { commit, esc, toast, today } from './core.js';
import { A, S, ui } from './state.js';
import { earn, parseQty, qtyOk, vorrat, vorratGroups } from './sync.js';
import { addToShop, cookedLog, endCookMode, isPantry, recipeById, recipePage, styleOf, vMatch, viewCookMode } from './kochbuch.js';
import { dishPicsOf } from './recipes.js';
import { render } from './app.js';

const STARS = 3;
const KN = { daheim: 'Daheim', ital: 'Italien', usa: 'USA', brit: 'Britische Inseln', tuerk: 'Türkei & Griechenland', frank: 'Frankreich', osteu: 'Osteuropa',
  span: 'Spanien & Portugal', viet: 'Thailand & Vietnam', mex: 'Mexiko', jap: 'Japan', kor: 'Korea', chi: 'China', ind: 'Indien', mag: 'Maghreb', lev: 'Levante' };
// the flags on the plates (kitchens of several countries show two)
const KF = { daheim: '🇩🇪', ital: '🇮🇹', usa: '🇺🇸', brit: '🇬🇧🇮🇪', tuerk: '🇹🇷🇬🇷', frank: '🇫🇷', osteu: '🇭🇺🇵🇱', span: '🇪🇸🇵🇹', viet: '🇹🇭🇻🇳', mex: '🇲🇽', jap: '🇯🇵',
  kor: '🇰🇷', chi: '🇨🇳', ind: '🇮🇳', mag: '🇲🇦🇹🇳', lev: '🇱🇧🇯🇴' };
// what each kitchen is best for: the label on its plate / dome
const KB = { daheim: 'Regionales', ital: 'den Alltag', frank: 'Technik', brit: 'Seelenfutter', osteu: 'Schmorgerichte', span: 'Rauch & Olivenöl',
  tuerk: 'Gemüse & Joghurt', usa: 'Backen & Diner', mex: 'Schärfe & Limette', jap: 'klare Aromen', kor: 'Scharf-Süßes', chi: 'die schnelle Pfanne',
  ind: 'Gewürze', mag: 'Süß-Würziges', lev: 'Hülsenfrüchte', viet: 'Frisches & Kräuter' };
// the jars: [id, name, colour, how to treat it, words that find it in an older recipe's ingredients]
const JARS = [
  ['kreuzkuemmel', 'Kreuzkümmel', '#a9793e', 'Ganz in der trockenen Pfanne rösten, bis er duftet. Dann erst mahlen oder Fett dazugeben.', 'kreuzkümmel|cumin'],
  ['kurkuma', 'Kurkuma', '#e2a620', 'Kurz im heißen Fett anschwitzen: roh schmeckt sie staubig, zu heiß wird sie bitter.', 'kurkuma'],
  ['koriandersaat', 'Koriandersaat', '#c2a868', 'Grob zerstoßen statt fein mahlen: so bleibt die zitronige Note.', 'koriandersa|koriander, gemahlen|gemahlener koriander'],
  ['garam-masala', 'Garam Masala', '#8a5a34', 'Kommt zum Schluss dazu, nicht am Anfang: die Mischung ist schon geröstet.', 'garam'],
  ['paprika-edelsuess', 'Paprika edelsüß', '#c8402a', 'Nie ins rauchend heiße Fett: Topf vom Herd, einrühren, sofort ablöschen.', 'paprikapulver|edelsüß'],
  ['paprika-geraeuchert', 'Paprika geräuchert', '#9c3320', 'Bringt Rauch ohne Grill. Wenig reicht, in Fett gelöst entfaltet er sich.', 'geräuchertes paprika|paprikapulver, geräuchert|paprika geräuchert|pimentón'],
  ['chili', 'Chili', '#d2301f', 'Früh ins Fett = tiefe, runde Schärfe. Spät dazu = spitze Schärfe.', 'chiliflocken|chilipulver|chilischote|cayenne|^chili$'],
  ['ingwer', 'Ingwer', '#d9bd7a', 'Früh mitbraten = warm und rund. Am Ende roh gerieben = frisch und scharf.', 'ingwer'],
  ['zimt', 'Zimt', '#a05a2c', 'Die Stange darf lange mitkochen, gemahlener Zimt kommt erst gegen Ende dazu.', 'zimt'],
  ['muskat', 'Muskat', '#8e6b4a', 'Immer frisch reiben und erst zum Schluss: gekocht verfliegt er.', 'muskat'],
  ['nelken', 'Nelken', '#6b3f2a', 'Sehr stark: in eine Zwiebel stecken, dann findet man sie wieder.', 'nelke'],
  ['sternanis', 'Sternanis', '#7a4a2e', 'Ein Stern reicht für einen Topf. Lange mitziehen lassen, dann herausnehmen.', 'sternanis'],
  ['kardamom', 'Kardamom', '#9fae6e', 'Kapseln andrücken und mitkochen, oder die Samen frisch mörsern.', 'kardamom'],
  ['vanille', 'Vanille', '#4a3324', 'Mark auskratzen und die Schote mitziehen lassen: in ihr steckt das meiste Aroma.', 'vanill'],
  ['kuemmel', 'Kümmel', '#8b6f47', 'Leicht andrücken und mitschmoren: macht Kohl und Fettes bekömmlich.', '(^|[^z])kümmel'],
  ['majoran', 'Majoran', '#7f9a5a', 'Getrocknet kräftiger als frisch. Zwischen den Fingern zerreiben, kurz mitziehen lassen.', 'majoran'],
  ['wacholder', 'Wacholder', '#3d3550', 'Beeren mit dem Messerrücken andrücken, sonst geben sie nichts ab.', 'wacholder'],
  ['lorbeer', 'Lorbeer', '#6f8a4e', 'Blatt einreißen, lange mitkochen, vor dem Essen herausnehmen.', 'lorbeer'],
  ['senfsaat', 'Senfsaat', '#d6b84a', 'In heißem Öl springen lassen (Deckel drauf!): dann schmeckt sie nussig statt scharf.', 'senfsaat|senfkörner|senfsamen'],
  ['thymian', 'Thymian', '#7c8f55', 'Verträgt lange Hitze: ganze Zweige mitschmoren, am Ende herausfischen.', 'thymian'],
  ['rosmarin', 'Rosmarin', '#5f7d4c', 'Im heißen Fett knusprig braten: das Öl nimmt das Aroma auf.', 'rosmarin'],
  ['oregano', 'Oregano', '#869a52', 'Getrocknet besser als frisch. In die Soße reiben und mitköcheln lassen.', 'oregano'],
  ['fenchelsaat', 'Fenchelsaat', '#a8b06a', 'Anrösten und grob zerstoßen: passt zu Schwein, Tomate und Brot.', 'fenchelsa'],
  ['sumach', 'Sumach', '#8e2a3a', 'Nicht mitkochen: zum Schluss drüberstreuen, als wäre es Zitrone.', 'sumach|sumak'],
  ['ras-el-hanout', 'Ras el-Hanout', '#b5762e', 'Im Fett mit den Zwiebeln anschwitzen, dann schmoren lassen.', 'ras el'],
  ['sesam', 'Sesam', '#e0cfa0', 'Ohne Fett goldbraun rösten. Er verbrennt in Sekunden, also dabeibleiben.', 'sesam(?!öl)'],
].map(([id, name, col, how, re]) => ({ id, name, col, how, re: new RegExp(re, 'i') }));
// regional produce → the months it grows here or comes fresh from storage (same table as entdecker/check.py)
const span = (a, b) => { const m = []; for (let i = a; ; i = i % 12 + 1) { m.push(i); if (i === b) break; } return m; };
const SEASON = { 'grünkohl': span(11, 2), 'rosenkohl': span(10, 2), 'feldsalat': span(10, 3), 'chicorée': span(10, 4), 'pastinake': span(10, 3), 'petersilienwurzel': span(10, 2),
  'schwarzwurzel': span(10, 3), 'topinambur': span(10, 3), 'steckrübe': span(10, 3), 'chinakohl': span(9, 1), 'wirsing': span(9, 2), 'lauch': span(7, 3), 'knollensellerie': span(9, 4),
  'rote bete': span(7, 3), 'kürbis': span(9, 1), 'birne': span(8, 1), 'quitte': span(10, 11), 'spitzkohl': span(5, 11), 'endivie': span(8, 11), 'radicchio': span(8, 11),
  'spinat': span(3, 5).concat(span(9, 11)), 'bärlauch': span(3, 5), 'spargel': span(4, 6), 'rhabarber': span(4, 6), 'radieschen': span(4, 10), 'erdbeer': span(5, 7), 'kohlrabi': span(5, 10),
  'blumenkohl': span(5, 10), 'frühlingszwiebel': span(5, 10), 'pak choi': span(5, 10), 'kopfsalat': span(5, 10), 'rucola': span(5, 10), 'zucchini': span(6, 10), 'gurke': span(6, 9),
  'grüne bohnen': span(6, 9), 'brokkoli': span(6, 10), 'fenchel': span(6, 10), 'mangold': span(6, 10), 'tomate': span(7, 10), 'paprika': span(7, 10), 'aubergine': span(7, 9),
  'staudensellerie': span(7, 10), 'kirsche': span(6, 7), 'himbeer': span(6, 8), 'heidelbeer': span(6, 8), 'aprikose': span(7, 8), 'pfirsich': span(7, 8), 'zwetschge': span(8, 9),
  'traube': span(9, 10), 'pfifferling': span(7, 10) };
const ALWAYS = ['Kartoffeln', 'Zwiebeln', 'Karotten', 'Weißkohl', 'Rotkohl', 'Äpfel', 'Champignons'];
const NOTFRESH = /knoblauch|schnittlauch|tk|tiefkühl|dose|passiert|getrocknet|mark|pulver|saat|samen|eingelegt|glas|edelsüß|geräuchert|gemahlen|essig|flocken|paste/;
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const cap = s => s.replace(/(^|\s)\S/g, c => c.toUpperCase());
const now = () => new Date().getMonth() + 1;

// ---------- the recipes ----------
let cache = { j: null, rs: [] };
export function entRecipes() {
  let j = null; try { j = localStorage.getItem('gn_ent'); } catch (e) {}
  if (j !== cache.j) { let rs = []; try { rs = (JSON.parse(j || 'null') || { recipes: [] }).recipes || []; } catch (e) {} cache = { j, rs }; }
  return cache.rs;
}
export function entById(id) { return entRecipes().find(r => r.id === id) || null; }
const kOf = r => r.kueche || KUECHE_OF[r.id] || 'daheim';
const jarsOf = r => r.gewuerze || JARS.filter(j => (r.ing || []).some(a => j.re.test(a[1] || ''))).map(j => j.id);
const inSeason = r => !r.monate || r.monate.includes(now());
const usesFresh = (r, w) => (r.ing || []).some(a => { const n = (a[1] || '').toLowerCase(); return n.includes(w) && !NOTFRESH.test(n); });
// everything one render needs: the cooked dishes (one per recipe, newest first), the Vorrat, the shared list, the pool
function ctx() {
  const seen = new Map();
  for (const x of cookedLog()) {
    const e = seen.get(x.rid); if (e) { e.n++; continue; }
    const r = recipeById(x.rid); if (!r || r.cat === 'drink' || r.cat === 'snack') continue;
    seen.set(x.rid, { r, n: 1, ts: x.ts, k: kOf(r), jars: jarsOf(r) });
  }
  const cooked = [...seen.values()], VG = vorratGroups(vorrat());
  const ids = new Set([...Object.keys(S.entMine || {}), ...Object.keys(S.partnerEnt || {})]);
  const liked = [...ids].map(id => [id, B.state(S.entMine, S.partnerEnt, id)]).filter(([id, s]) => s && s[0] === 1 && !(seen.has(id) && seen.get(id).ts >= s[1]))
    .sort((a, b) => b[1][1] - a[1][1]).map(([id]) => entById(id)).filter(Boolean);
  const out = new Set([...liked.map(r => r.id), ...Object.keys(S.entNo || {}), ...seen.keys()]);
  return { cooked, VG, liked, pool: entRecipes().filter(r => !out.has(r.id)) };
}
// what a dish still needs from the shop: the real ingredients the Vorrat doesn't have (enough of); staples are skipped
function missing(r, VG) {
  return (r.ing || []).filter(([q, t]) => { if (!t || isPantry(t)) return false; const x = VG.find(y => vMatch(t, y.name)), rq = parseQty(q || '');
    return !x || (x.left && rq && qtyOk(x.left, rq) && x.left.n < rq.n - 1e-6); });
}
// ingredient lists: under 7 things stay flat (🛒 = missing); longer ones split into buy / at home / spices & basics
function ingHtml(r, VG) {
  const miss = new Set(missing(r, VG).map(a => a[1])), grp = a => isPantry(a[1]) ? 'g' : miss.has(a[1]) ? 'b' : 'h', ing = (r.ing || []).filter(a => a[1]);
  const li = (a, m) => `<li>${esc(((a[0] || '') + ' ' + a[1]).trim())}${m ? ' <small>🛒</small>' : ''}</li>`, of = g => ing.filter(a => grp(a) === g);
  if (ing.length < 7) return `<ul>${ing.map(a => li(a, grp(a) === 'b')).join('')}</ul>`;
  const part = (g, t, cls) => of(g).length ? `<div class="e-grp ${cls}"><b>${t}</b><ul>${of(g).map(a => li(a)).join('')}</ul></div>` : '';
  return part('b', '🛒 Einkaufen', 'buy') + part('h', '🧊 Daheim', '') + (of('g').length ? `<div class="e-grp basics"><b>Gewürze & Basics</b><p>${of('g').map(a => esc(((a[0] || '') + ' ' + a[1]).trim())).join(' · ')}</p></div>` : '');
}

// ---------- the views ----------
const E = () => ui.ent || (ui.ent = { tab: 'teller', k: null, stack: null, more: false });
const CLOCHE = `<svg viewBox="0 0 64 54" aria-hidden="true"><defs><linearGradient id="e-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#c3c9d1"/><stop offset="1" stop-color="#8f97a3"/></linearGradient></defs>
  <ellipse cx="32" cy="46" rx="30" ry="6" fill="#fffdf8" stroke="#d8ccb6"/><g class="e-cl"><g class="e-wob"><path d="M7,44 A25,25 0 0 1 57,44 Z" fill="url(#e-silver)" stroke="#8d949e" stroke-width=".8"/>
  <path d="M15,36 A19,19 0 0 1 30,22" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/><circle cx="32" cy="17" r="3.6" fill="#dfe3e8" stroke="#8d949e" stroke-width=".8"/></g></g></svg>`;
const pic = c => { const p = dishPicsOf(c.r.id)[0]; return p ? `<img class="dishpic" data-dish="${esc(p.id)}" alt="">` : esc(c.r.icon || '🍽️'); };
const hasPic = c => dishPicsOf(c.r.id).length > 0;

function table(X) {
  const ks = Object.keys(KN), of = k => X.cooked.filter(c => c.k === k), wait = k => X.pool.filter(r => r.kueche === k).length;
  const seen = ks.filter(k => of(k).length).sort((a, b) => of(b).length - of(a).length), dark = ks.filter(k => !of(k).length);
  return `<h1>Über den Tellerrand</h1><p class="e-sub">Jede Küche ist ein Teller. <b>Tippt einen an</b> und schaut, was dort noch wartet.</p>
    ${seen.length ? `<h3>Hier wart ihr schon · ${seen.length} Küchen</h3><div class="e-table">` + seen.map(k => { const cs = of(k), hero = cs.find(hasPic) || cs[0];
      return `<button class="e-spot" data-a="entk" data-v="${k}"><span class="e-pl"><span class="e-hero">${pic(hero)}</span><span class="e-n">${cs.length}</span></span><span class="e-flag">${KF[k]}</span><b>${KN[k]}</b><i class="e-best">★ ${KB[k]}</i><small>${wait(k)} neue warten</small></button>`; }).join('') + '</div>' : ''}
    ${dark.length ? `<h3>Noch unter der Haube · ${dark.length} Küchen</h3><div class="e-table">` + dark.map((k, i) =>
      `<button class="e-spot dark" data-a="entk" data-v="${k}" style="--d:${(i * 1.7 % 7).toFixed(1)}s">${CLOCHE}<span class="e-flag">${KF[k]}</span><b>${KN[k]}</b><i class="e-best">★ ${KB[k]}</i><small>${wait(k)} Gerichte</small></button>`).join('') + '</div>' : ''}`;
}
function plate(X) {
  const k = E().k, cs = X.cooked.filter(c => c.k === k), show = cs.length > 7 ? cs.slice(0, 6) : cs, n = show.length + (cs.length > 7 ? 1 : 0), w = X.pool.filter(r => r.kueche === k).length;
  const at = i => { const a = -Math.PI / 2 + (i - 1) / Math.max(1, n - 1) * Math.PI * 2; return n === 1 || !i ? [50, 50] : [50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30]; };
  const bites = show.map((c, i) => `<span class="e-bite" style="left:${at(i)[0].toFixed(1)}%;top:${at(i)[1].toFixed(1)}%">${pic(c)}</span>`).join('')
    + (cs.length > 7 ? `<span class="e-bite more" style="left:${at(6)[0].toFixed(1)}%;top:${at(6)[1].toFixed(1)}%">+${cs.length - 6}</span>` : '');
  return `<button class="e-back" data-a="entback">‹ zurück zum Tisch</button><h1>${KF[k]} ${KN[k]}</h1><p class="e-sub"><i class="e-best">★ am besten für ${KB[k]}</i></p>
    <p class="e-sub">${cs.length ? 'Auf dem Teller: was ihr hier schon gekocht habt.' : 'Hier habt ihr noch nie gekocht.'}</p>
    <div class="e-stage"><div class="e-big">${bites || '<span class="e-empty">noch leer</span>'}</div>
      ${w ? `<button class="e-dome" data-a="entstack" data-v="k:${k}">${CLOCHE}<b>${w} neue Gerichte<br>aufdecken</b></button>` : ''}</div>
    ${cs.length ? `<h3>Schon gekocht · ${cs.length}</h3>` + cs.map(c => `<button class="e-row" data-a="entopen" data-id="${esc(c.r.id)}"><span class="e-ic">${pic(c)}</span><span>${esc(c.r.title)}${c.n > 1 ? `<small>${c.n}× gekocht</small>` : ''}</span><span class="e-go">›</span></button>`).join('') : ''}`;
}
function jarSvg(j, n) {
  const h = 30 * Math.min(1, n / 4);
  return `<svg viewBox="0 0 40 56" aria-hidden="true"><rect x="9" y="2" width="22" height="8" rx="2" fill="${n ? '#c9b48a' : '#6d5d4b'}"/>
    <path d="M7,13 q0,-3 4,-3 h18 q4,0 4,3 v36 q0,5 -5,5 h-16 q-5,0 -5,-5 z" fill="rgba(255,255,255,${n ? .16 : .06})" stroke="rgba(255,255,255,${n ? .55 : .25})" stroke-width="1.2"/>
    ${n ? `<path d="M9,${50 - h} h22 v${h - 1} q0,3 -3,3 h-16 q-3,0 -3,-3 z" fill="${j.col}"/>` : ''}<rect x="11" y="16" width="3" height="${n ? 14 : 26}" rx="1.5" fill="rgba(255,255,255,.35)"/></svg>`;
}
function regal(X) {
  const used = j => X.cooked.filter(c => c.jars.includes(j.id)).length, wait = j => X.pool.filter(r => (r.gewuerze || []).includes(j.id)).length;
  const shelf = js => { let h = ''; for (let i = 0; i < js.length; i += 4) h += '<div class="e-shelf">' + js.slice(i, i + 4).map(j => `<button class="e-jar ${used(j) ? '' : 'empty'}" data-a="entstack" data-v="j:${j.id}" ${wait(j) ? '' : 'disabled'}>${jarSvg(j, used(j))}<small>${used(j) ? used(j) + '×' : 'leer'}</small><b>${j.name}</b></button>`).join('') + '</div>'; return h; };
  const full = JARS.filter(used), empty = JARS.filter(j => !used(j));
  return `<h1>Das Gewürzregal</h1><p class="e-sub">Volle Gläser: damit habt ihr schon gekocht. <b>Tippt ein Glas an</b> für Gerichte mit diesem Gewürz.</p>
    ${empty.length ? `<h3>Noch leer · ${empty.length}</h3>${shelf(empty)}` : ''}${full.length ? `<h3>Schon im Einsatz · ${full.length}</h3>${shelf(full)}` : ''}`;
}
function saison(X) {
  const N = now(), all = Object.entries(SEASON), on = all.filter(([, m]) => m.includes(N));
  const upto = ms => { let m = N; while (ms.includes(m % 12 + 1) && m - N < 12) m++; return MON[(m - 1) % 12]; };
  const from = ms => { let m = N; while (!ms.includes(m % 12 + 1)) m++; return [m - N + 1, MON[m % 12]]; };
  const off = all.filter(([, m]) => !m.includes(N)).map(([w, m]) => [w, from(m)]).sort((a, b) => a[1][0] - b[1][0]);
  const cnt = w => X.pool.filter(r => inSeason(r) && usesFresh(r, w)).length;
  return `<h1>Jetzt in Saison</h1><p class="e-sub">${MON[N - 1]}: das wächst gerade hier oder kommt frisch aus dem Lager. <b>Antippen</b> = Gerichte damit.</p>
    <h3>Frisch im ${MON[N - 1]}</h3><div class="e-chips">` + on.map(([w, m]) => { const n = cnt(w); return `<button class="e-chip" data-a="entstack" data-v="f:${esc(w)}" ${n ? '' : 'disabled'}>${cap(w)} <small>bis ${upto(m)}${n ? ' · ' + n : ''}</small></button>`; }).join('')
    + `</div><h3>Immer aus dem Lager</h3><div class="e-chips">` + ALWAYS.map(w => { const key = w.toLowerCase().slice(0, 6), n = cnt(key); return `<button class="e-chip" data-a="entstack" data-v="f:${key}" ${n ? '' : 'disabled'}>${w}${n ? ` <small>${n}</small>` : ''}</button>`; }).join('')
    + `</div><h3>Kommt bald</h3><div class="e-chips">` + off.filter(x => x[1][0] <= 4).map(([w, f]) => `<span class="e-chip soon">${cap(w)} <small>ab ${f[1]}</small></span>`).join('')
    + `</div><h3>Macht Pause</h3><div class="e-chips">` + off.filter(x => x[1][0] > 4).map(([w, f]) => `<span class="e-chip off">${cap(w)} <small>ab ${f[1]}</small></span>`).join('') + '</div>';
}
function liste(X) {
  const ls = X.liked, buy = [...new Set(ls.flatMap(r => missing(r, X.VG).map(a => a[1])))];
  return `<button class="e-back" data-a="entback">‹ zurück</button><h1>Das kochen wir</h1>
    ${ls.length ? `<div class="e-box">🛒 <b>Dafür fehlt daheim:</b> ${buy.length ? buy.map(esc).join(', ') : 'nichts, alles da'}</div>` : '<p class="e-sub">Noch nichts gemerkt. Wischt ein Gericht nach rechts.</p>'}`
    + ls.map(r => { const m = missing(r, X.VG); return `<div class="e-row"><button class="e-rowb" data-a="entopen" data-id="${esc(r.id)}"><span class="e-ic">${esc(r.icon)}</span><span>${esc(r.title)}<small>${KN[r.kueche]} · ${r.min} Min.${m.length ? ' · fehlt: ' + m.map(a => esc(a[1])).join(', ') : ' · alles daheim'}</small></span></button>
      ${m.length ? `<button class="e-btn" data-a="entshop" data-id="${esc(r.id)}" aria-label="Fehlendes auf die Einkaufsliste">🛒</button>` : ''}<button class="e-btn ghost" data-a="entdrop" data-id="${esc(r.id)}" aria-label="Von der Liste nehmen">✕</button></div>`; }).join('')
    + (ls.length ? '<p class="e-sub" style="margin-top:14px">Antippen = Rezept. Dort „Jetzt kochen“, dann landet es auf seinem Teller.</p>' : '');
}
// the swipe stack: which recipes a key means, in-season ones first, in a stable shuffle
function stackIds(key, X) {
  const [t, v] = [key.slice(0, 1), key.slice(2)];
  const list = X.pool.filter(r => t === 'k' ? r.kueche === v : t === 'j' ? (r.gewuerze || []).includes(v) : inSeason(r) && usesFresh(r, v));
  const h = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  return list.sort((a, b) => inSeason(b) - inSeason(a) || h(a.id) - h(b.id)).map(r => r.id);
}
function swCard(r, X, under) {
  const sp = (r.gewuerze || []).map(g => (JARS.find(j => j.id === g) || {}).name).filter(Boolean), miss = missing(r, X.VG);
  const fr = (r.frisch || []).filter(x => Object.keys(SEASON).some(w => x.toLowerCase().includes(w)));
  const nx = !inSeason(r) && (() => { let m = now(); while (!r.monate.includes(m % 12 + 1)) m++; return MON[m % 12]; })();
  return `<div class="e-sw ${under ? 'under' : 'cur'}"><span class="e-stamp y">KOCHEN WIR</span><span class="e-stamp n">NÖ</span>
    <div class="e-em">${esc(r.icon)}</div><div class="e-from">${KF[r.kueche]} ${KN[r.kueche]} · ${esc(r.ort || '')}</div><h2>${esc(r.title)}</h2><p style="text-align:center">${esc(r.note || '')}</p>
    <p class="e-meta">⏱ ${r.aktiv} Min. am Herd · ${r.min} Min. gesamt · ${esc(r.geschirr || '')}</p>
    <div class="e-tags">${nx ? `<span class="later">⏳ Saison ab ${nx}</span>` : fr.length ? `<span class="now">🌱 jetzt Saison: ${fr.map(esc).join(', ')}</span>` : ''}${sp.map(s => `<span>🫙 ${s}</span>`).join('')}${r.hot ? `<span>${'🌶️'.repeat(r.hot)}</span>` : ''}</div>
    <p class="e-trick">${esc(r.kniff || '')}</p>
    <div class="e-buy">${miss.length ? `Dafür einkaufen: <b>${miss.map(a => esc(a[1])).join(', ')}</b>` : '<b>Alles daheim.</b>'}</div>
    ${under ? '' : `<button class="e-more" data-a="entmore">${E().more ? 'Zutaten & Schritte zuklappen' : 'Zutaten & Schritte ansehen'}</button>${E().more ? `<div class="e-full">${ingHtml(r, X.VG)}<ol>${(r.steps || []).map(s => `<li>${esc(s[0])}</li>`).join('')}</ol></div>` : ''}`}</div>`;
}
function stack(X) {
  const s = E().stack, [t, v] = [s.key.slice(0, 1), s.key.slice(2)], j = JARS.find(x => x.id === v);
  const a = entById(s.ids[s.i]), b = entById(s.ids[s.i + 1]);
  return `<div class="e-stack"><div class="e-top"><b>${t === 'k' ? KF[v] + ' ' + KN[v] : t === 'j' ? j.name : cap(v) + '…'}</b><span>${a ? s.i + 1 + ' / ' + s.ids.length : ''}</span><button data-a="entclose" aria-label="Schließen">✕</button></div>
    <div class="e-tip">${t === 'j' ? '🫙 ' + j.how : t === 'f' ? 'Gerichte, die das jetzt frisch verwenden.' : 'Nach rechts = kochen wir. Nach links = weg damit.'}</div>
    <div class="e-deck">${a ? (b ? swCard(b, X, true) : '') + swCard(a, X) : `<div class="e-done">Stapel durch.<br>${X.liked.length ? '♥ ' + X.liked.length + ' gemerkt.' : ''}<br><button class="e-btn" data-a="entclose" style="margin-top:14px">Fertig</button></div>`}</div>
    ${a ? '<div class="e-acts"><button class="n" data-a="entfly" data-v="-1" aria-label="Nein">✕</button><button class="y" data-a="entfly" data-v="1" aria-label="Das kochen wir">♥</button></div>' : ''}</div>`;
}
export function viewEnt() {
  if (!entRecipes().length) { ui.sub = null; return null; }   // (not loaded yet: Home decides)
  const e = E(), r = ui.rid ? recipeById(ui.rid) : null;
  if (r && ui.cstep != null) return viewCookMode();
  if (r) return `<button class="btn soft" data-a="entback" style="margin:4px 0 12px">← Zurück</button>
    <div class="cbook cb-top gb-cbook"><div class="cb-body"><div class="bk-stage"><div class="bk-page cur bp-${styleOf(r)}" data-key="r-${esc(r.id)}"><div class="bp">${recipePage(r)}</div></div></div></div></div>`;
  const X = ctx(), tabs = [['teller', '🍽 Teller'], ['regal', '🫙 Gewürze'], ['saison', '🌱 Saison']];
  const body = e.tab === 'liste' ? liste(X) : e.tab === 'regal' ? regal(X) : e.tab === 'saison' ? saison(X) : e.k ? plate(X) : table(X);
  return `<div class="ent"><div class="e-head"><button class="e-back" data-a="entexit">‹ Home</button><div class="e-tabs">${tabs.map(([t, n]) => `<button class="${e.tab === t ? 'on' : ''}" data-a="enttab" data-v="${t}">${n}</button>`).join('')}</div></div>
    ${body}${X.liked.length && e.tab !== 'liste' && !e.stack ? `<button class="e-pill" data-a="enttab" data-v="liste">♥ ${X.liked.length} gemerkt · ansehen</button>` : ''}${e.stack ? stack(X) : ''}</div>`;
}
// the way in (Home + the Kochbuch's "Kochen" page)
export function entCard() {
  const n = entRecipes().length; if (!n) return '';
  const X = ctx(), ks = new Set(X.cooked.map(c => c.k)).size;
  return `<div class="card e-entry"><button class="hcard" data-a="ent"><span class="vn-ic" aria-hidden="true">🧭</span><span class="hc-txt"><b>Über den Tellerrand</b><span class="muted">${ks} von ${Object.keys(KN).length} Küchen entdeckt · ${X.pool.length} neue Gerichte${X.liked.length ? ' · ♥ ' + X.liked.length : ''}</span></span><span class="hc-go">›</span></button></div>`;
}
// ⭐ a kitchen cooked from for the first time: +3 for me (the partner's phone gives them theirs). The kitchens we
// had before the shelf existed are the silent baseline.
export function entReconcile() {
  if (!S || !entRecipes().length) return false;
  const cooked = ctx().cooked, ks = [...new Set(cooked.map(c => c.k))];
  if (!S.entSeen) S.entSeen = [...new Set(cooked.filter(c => !c.r.ent).map(c => c.k))];   // (an Entdecker dish can only be new)
  const neu = ks.filter(k => !S.entSeen.includes(k)); if (!neu.length) return false;
  S.entSeen = S.entSeen.concat(neu);
  neu.forEach(k => { const lid = 'ent-k-' + k; if (!S.log.some(x => x.id === lid)) { S.log.push({ id: lid, text: '🧭 Neue Küche entdeckt: ' + KN[k], kind: 'event', day: today(), ts: Date.now(), stars: STARS }); earn(STARS); } });
  toast(`🧭 Neue Küche: ${KN[neu[0]]} · +${STARS} ⭐`);
  return true;
}

// ---------- actions ----------
const go = () => { render(); scrollTo(0, 0); };
A.ent = () => { ui.tab = 'home'; ui.sub = 'ent'; ui.rid = null; ui.cstep = null; ui.ent = null; go(); };   // from outside: always the table
A.entexit = () => { ui.sub = null; ui.rid = null; go(); };
A.enttab = el => { const e = E(); e.tab = el.dataset.v; e.k = null; e.stack = null; go(); };
A.entk = el => { const open = () => { E().k = el.dataset.v; go(); }; if (el.classList.contains('dark')) { el.classList.add('open'); setTimeout(open, 480); } else open(); };
A.entstack = el => {
  const key = el.dataset.v, open = () => { const e = E(); e.stack = { key, ids: stackIds(key, ctx()), i: 0 }; e.more = false; render(); };
  if (el.classList.contains('e-dome')) { el.classList.add('open'); setTimeout(open, 480); } else open();
};
A.entclose = () => { E().stack = null; render(); };
A.entmore = () => { E().more = !E().more; render(); };
A.entsw = el => {   // the card is decided: right = onto the shared list, left = my "no" pile
  const e = E(), s = e.stack; if (!s || !s.ids[s.i]) return;
  const id = s.ids[s.i], yes = +el.dataset.v > 0;
  if (yes) (S.entMine = S.entMine || {})[id] = [1, Date.now()]; else (S.entNo = S.entNo || {})[id] = [1, Date.now()];
  s.i++; e.more = false; commit(yes);
};
A.entfly = el => fly(+el.dataset.v);
A.entopen = el => { E().stack = null; ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = []; go(); };
A.entback = () => {   // one step back inside the shelf (also Android's back button); → true when there was one
  const e = E();
  if (ui.rid) { if (ui.cstep != null) endCookMode(); ui.rid = null; ui.sides = []; go(); return true; }
  if (e.stack) { e.stack = null; render(); return true; }
  if (e.tab === 'liste') { e.tab = 'teller'; go(); return true; }
  if (e.k) { e.k = null; go(); return true; }
  A.entexit(); return true;
};
A.entshop = el => {
  const r = entById(el.dataset.id); if (!r) return;
  const m = missing(r, vorratGroups(vorrat())); m.forEach(([q, t]) => addToShop(t, parseQty(q || ''), q, r.title));
  S.dishes = (S.dishes || []).filter(x => x.id !== r.id).concat([{ id: r.id, ts: Date.now() }]);   // bought for → "Heute kochen?" on Home
  commit(); toast('🛒 ' + (m.length === 1 ? '1 Sache' : m.length + ' Sachen') + ' auf der Einkaufsliste');
};
A.entdrop = el => { (S.entMine = S.entMine || {})[el.dataset.id] = [0, Date.now()]; commit(true); };

// the top card flies out, then the swipe counts
function fly(dir) {
  const el = document.querySelector('.e-sw.cur'); if (!el) return;
  el.style.transition = 'transform .28s ease-in, opacity .28s'; el.style.transform = `translateX(${dir * 130}%) rotate(${dir * 18}deg)`; el.style.opacity = 0;
  const st = el.querySelector(dir > 0 ? '.e-stamp.y' : '.e-stamp.n'); if (st) st.style.opacity = 1;
  setTimeout(() => A.entsw({ dataset: { v: dir } }), 240);
}
// drag the top card sideways (vertical drags keep scrolling the card)
export function wireEntSwipe() {
  let el = null, x0 = 0, y0 = 0, dx = 0, dir = 0;
  document.addEventListener('pointerdown', e => { const k = e.target.closest('.e-sw.cur'); if (!k || e.button || e.target.closest('button')) return; el = k; x0 = e.clientX; y0 = e.clientY; dx = 0; dir = 0; el.style.transition = 'none'; });
  document.addEventListener('pointermove', e => {
    if (!el) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!dir) { if (Math.abs(mx) < 10 && Math.abs(my) < 10) return; dir = Math.abs(mx) > Math.abs(my) ? 1 : -1; if (dir < 0) { el.style.transition = ''; el = null; return; } }
    dx = mx; el.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    el.querySelector('.e-stamp.y').style.opacity = Math.max(0, dx / 90); el.querySelector('.e-stamp.n').style.opacity = Math.max(0, -dx / 90);
  });
  const up = () => {
    if (!el) return; const k = el; el = null;
    if (dir > 0 && Math.abs(dx) > 90) return fly(Math.sign(dx));
    k.style.transition = 'transform .25s'; k.style.transform = ''; k.querySelectorAll('.e-stamp').forEach(s => { s.style.opacity = 0; });
  };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
}
