// 🔢 Nährwerte (2026-10-30, user): every recipe gets an estimate per portion — kcal, Fett, KH, Eiweiß — calculated from its
// ingredients, never typed by hand. FOOD = per 100 g [kcal, fat, carbs, protein] + how much one "piece" of each unit weighs.
// Names match like the Vorrat does: a key hits a word that ENDS in it (Vollmilch → milch), plurals fold, the longest key wins.
// "Prise", "etwas", "nach Geschmack" = 0 g unless the food says otherwise (oil and butter for the pan count).
import { parseQty } from './shop.js';
// Grow the table with tools/test_naehr.mjs: it prints every ingredient it can't resolve.

// units without a food-specific weight (g per 1)
const UNIT_G = { el: 15, tl: 5, handvoll: 30, dose: 400, glas: 350, becher: 200, beutel: 125, packung: 250, pck: 250, päckchen: 250, tüte: 250,
  bund: 30, scheibe: 20, kugel: 60, würfel: 10, zehe: 4, stange: 150, kopf: 800, tasse: 150, schuss: 10, spritzer: 3, blatt: 1, zweig: 1,
  stängel: 1, rolle: 275, prise: 0, etwas: 0, tropfen: 0, msp: 0 };
// [keys, kcal, fat, carbs, protein, {stk: g per piece, el, dose, pck, sch(eibe), glas, becher, beutel, würfel, kugel, etwas, hand(voll), stange, kopf}]
const FOOD = [
  // --- free stuff: spices, herbs, water (they count as known, so the coverage report stays clean) ---
  ['salz|meersalz|pfeffer|pfefferkorner|cayennepfeffer|muskat|muskatnuss|zimt|zimtstange|kummel|kreuzkummel|oregano|thymian|majoran|rosmarin|basilikum|petersilie|schnittlauch|dill|minze|minzblatter|koriander|lorbeerblatt|lorbeer|chili|chiliflocken|chilischote|chilipulver|kurkuma|senfpulver|paprikapulver|edelsuss|paprika gewurz|curry|currypulver|krauter|gewurz|vanilleextrakt|vanille|backpulver|natron|wasser|sprudelwasser|mineralwasser|sprudel|eiswurfel|crushed ice|ice|kaffee|knoblauch|knoblauchzehe|ingwer|essig|reisessig|zitronenschale|schale|suppengrun|hefe|gelatine|kardamom|nelke|sternanis|safran|tee', 0, 0, 0, 0, { stk: 4, zehe: 4, würfel: 42, pck: 7 }],
  // --- fats, oils ---
  ['ol|olivenol|sonnenblumenol|rapsol|sesamol|speiseol', 884, 100, 0, 0, { el: 12, tl: 4, etwas: 6 }],
  ['butter|kraeuterbutter|krauterbutter|butterschmalz', 740, 82, 1, 1, { el: 15, tl: 5, etwas: 5, pck: 250, stk: 10 }],
  ['margarine', 720, 80, 0, 0, { el: 15, tl: 5, etwas: 5, pck: 250 }],
  ['mayo|mayonnaise|burgersosse', 680, 75, 3, 1, { el: 15, tl: 5 }],
  // --- dairy, eggs ---
  ['ei|eier', 155, 11, 1, 13, { stk: 55 }],
  ['eigelb', 340, 32, 0, 16, { stk: 18 }],
  ['eiweiss', 50, 0, 1, 11, { stk: 33 }],
  ['milch|vollmilch', 64, 3.5, 4.8, 3.3, { el: 15, tl: 5, tasse: 200 }],
  ['buttermilch', 38, 0.5, 4, 3.3, {}],
  ['kondensmilch', 320, 8, 55, 8, { dose: 397, el: 20 }],
  ['kokosmilch', 180, 18, 3, 2, { dose: 400, el: 15 }],
  ['sahne|schlagsahne|rahm|kochsahne|sprühsahne|spruhsahne|sahne ersatz', 300, 31, 3, 2.4, { becher: 200, el: 15, tl: 5, schuss: 20 }],
  ['schmand|creme fraiche|crème fraîche', 290, 30, 3, 2.5, { becher: 200, el: 20 }],
  ['saure sahne|sauerrahm', 160, 15, 4, 3, { becher: 200, el: 20 }],
  ['joghurt|naturjoghurt|griechischer joghurt', 70, 3.5, 4.5, 4, { becher: 500, el: 20 }],
  ['quark|magerquark', 70, 0.3, 4, 12, { pck: 250, becher: 250, el: 20 }],
  ['kraeuterquark|krauterquark|kraeuterquark', 140, 10, 4, 8, { pck: 250, becher: 250, el: 20 }],
  ['frischkase|philadelphia', 250, 23, 4, 6, { pck: 175, el: 20, becher: 175 }],
  ['mascarpone', 430, 44, 4, 5, { pck: 250, becher: 250, el: 20 }],
  ['mozzarella', 250, 19, 1, 18, { kugel: 125, pck: 125, stk: 125 }],
  ['kase|gouda|emmentaler|bergkase|cheddar|streukase|scheiblettenkase|reibekase', 370, 29, 0, 26, { sch: 20, el: 8, hand: 30, pck: 200 }],
  ['parmesan', 400, 29, 0, 33, { el: 7 }],
  ['gorgonzola', 350, 30, 0, 19, { pck: 150 }],
  ['feta|schafkase|hirtenkase', 260, 21, 1, 17, { pck: 200 }],
  ['vanilleeis|eis', 200, 10, 24, 3.5, { kugel: 60 }],
  ['eierlikor', 280, 5, 30, 4, { el: 15 }],
  // --- meat, fish ---
  ['hackfleisch|hack|rinderhack|rinderhackfleisch|gemischtes hackfleisch', 250, 20, 0, 18, { pck: 500 }],
  ['kottbullar|frikadelle|fleischball', 230, 16, 7, 14, { pck: 500, stk: 15 }],
  ['hahnchenbrust|hahnchenbruste|hahnchen|hahnchenfilet|putenbrust', 110, 1.5, 0, 23, { stk: 150 }],
  ['hahnchenbrust aufschnitt|gegrillte hahnchenbrust|hahnchenbrust gegrillt', 110, 2, 1, 22, { sch: 10, pck: 100 }],
  ['hahnchenschenkel|hahnchenkeule', 190, 12, 0, 19, { stk: 180 }],
  ['schnitzel', 220, 10, 12, 20, { stk: 150 }],
  ['cordon bleu', 250, 14, 13, 18, { stk: 150 }],
  ['rindergulasch|gulasch|rindfleisch', 140, 6, 0, 21, {}],
  ['schweinebraten|schweinenacken|schweinefleisch|nacken', 230, 17, 0, 18, {}],
  ['schweinshaxe|haxe', 250, 18, 0, 22, { stk: 900 }],
  ['speck|speckwurfel|speckstreifen|bacon', 400, 38, 0, 15, { pck: 125, sch: 10 }],
  ['schinken|kochschinken', 110, 3, 1, 19, { sch: 15, pck: 100 }],
  ['salami', 380, 32, 1, 21, { sch: 5, pck: 100 }],
  ['wurst|wurstchen|wiener|wiener wurstchen|bratwurst', 270, 23, 1, 13, { stk: 50, pck: 250 }],
  ['lachs|lachsfilet|lachsfilets', 200, 13, 0, 20, { stk: 125 }],
  ['raucherlachs', 180, 10, 0, 22, { sch: 15, pck: 100 }],
  ['garnele|garnelen|shrimp', 80, 1, 0, 18, { pck: 250, hand: 50 }],
  ['thunfisch', 110, 1, 0, 25, { dose: 140 }],
  ['fischstabchen', 210, 9, 18, 13, { stk: 30, pck: 450 }],
  // --- carbs ---
  ['mehl|weizenmehl|dinkelmehl|kichererbsenmehl', 350, 1, 72, 10, { el: 10, tl: 3, etwas: 5 }],
  ['speisestarke|starke|maisstarke', 350, 0, 86, 0, { el: 10, tl: 3, pck: 37 }],
  ['puddingpulver|pudding', 350, 0, 86, 0, { pck: 37 }],
  ['grieß|griess|hartweizengriess|polenta|couscous', 350, 1, 72, 11, { el: 12 }],
  ['nudel|nudeln|spaghetti|spirelli|penne|fusilli|orecchiette|lasagneblatter|lasagneplatten|bandnudel|makkaroni', 355, 1.5, 71, 12, { pck: 500, hand: 50 }],
  ['spatzle|gnocchi|schupfnudel', 160, 1, 32, 5, { pck: 400 }],
  ['ravioli|tortellini|mezzelune', 260, 8, 38, 10, { pck: 250 }],
  ['reis|basmatireis|risottoreis|sushi reis|milchreis|jasminreis', 350, 0.6, 78, 7, { beutel: 125, tasse: 180 }],
  ['linsen|rote linsen', 340, 1.5, 50, 24, { tasse: 180 }],
  ['haferflocken|zarte haferflocken', 370, 7, 59, 13, { el: 8, tasse: 90, hand: 30 }],
  ['musli', 370, 7, 60, 10, { el: 10 }],
  ['kartoffel|kartoffeln|drillinge', 75, 0.1, 15, 2, { stk: 100 }],
  ['kartoffelpuree|kartoffelpuree pulver|pureepulver', 350, 1, 75, 8, { beutel: 95, pck: 95 }],
  ['kartoffelsalat', 150, 9, 13, 2, { pck: 500 }],
  ['pommes', 150, 5, 24, 2.5, { pck: 750, hand: 80 }],
  ['knodel|semmelknodel|kartoffelknodel|knodelteig|knodelinos', 180, 3, 33, 5, { stk: 80, beutel: 125, pck: 400 }],
  ['brot|bauernbrot|vollkornbrot|brot vom vortag|brosel|semmelbrosel|paniermehl|toastbrot brosel', 250, 1.5, 48, 8, { sch: 45, el: 8 }],
  ['toast|toastbrot|sandwich toast|vollkorn toast', 260, 3.5, 48, 8, { sch: 25, stk: 25 }],
  ['brotchen|aufbackbrotchen|burger bun|burger buns|bun|buns|baguette', 260, 2, 50, 9, { stk: 60, baguette: 250 }],
  ['pizzateig|blatterteig|quicheteig|tortenboden|knackteig', 290, 12, 40, 6, { rolle: 400, pck: 400 }],
  ['loffelbiskuit|loffelbiskuits|biskuit|kekse|keks|butterkeks', 400, 5, 80, 8, { stk: 6, pck: 200 }],
  ['zimtschnecke|zimtschnecken|gifflar', 400, 18, 52, 6, { stk: 33, pck: 260 }],
  // --- sugar, sweet ---
  ['zucker|brauner zucker|rohrzucker|puderzucker|hagelzucker|vanillezucker|zimtzucker|zucker|zuckerglas', 400, 0, 100, 0, { el: 15, tl: 5, pck: 8, etwas: 2 }],
  ['honig|ahornsirup|agavensirup|sirup|holunderblutensirup|spiced chai sirup|kokossirup', 310, 0, 78, 0, { el: 20, tl: 7 }],
  ['marmelade|konfiture|erdbeermarmelade|preiselbeermarmelade|aprikosenmarmelade|weihnachtsmarmelade|preiselbeeren|gelee', 250, 0, 60, 0.4, { el: 20, tl: 7, glas: 220 }],
  ['grutze|rote grutze|erdbeer rhabarber grutze', 110, 0, 26, 0.5, { becher: 500, glas: 500 }],
  ['schokolade|zartbitterschokolade|vollmilchschokolade|schokoraspeln|raspelschokolade|kuvertüre|kuverture', 540, 32, 55, 7, { stk: 5, tafel: 100 }],
  ['kakaopulver|backkakao|kakao', 360, 21, 11, 20, { el: 8, tl: 3 }],
  ['haselnusskrokant|krokant', 480, 20, 70, 6, { el: 12 }],
  ['marshmallow|marshmallows|gummiwurm|gummiwurmer|gummibarchen', 330, 0, 78, 6, { stk: 3, hand: 40 }],
  ['ketchup|curryketchup', 110, 0.2, 25, 1.5, { el: 15, tl: 5 }],
  ['balsamico creme', 250, 0, 60, 0.5, { el: 15 }],
  ['balsamico', 90, 0, 17, 0.5, { el: 15, tl: 5, etwas: 3 }],
  ['senf', 90, 5, 5, 6, { el: 10, tl: 5 }],
  ['meerrettich', 70, 0.5, 11, 3, { el: 15, tl: 5 }],
  ['sojasosse|sojasauce|sojasose', 60, 0, 6, 8, { el: 15, tl: 5 }],
  ['teriyaki sosse|teriyakisosse|teriyaki', 110, 0, 22, 4, { el: 15 }],
  ['chilisosse|sweet chili', 200, 0, 48, 0.5, { el: 15 }],
  ['bratensosse|sosse pulver|sossenpulver', 350, 10, 55, 8, { pck: 30, beutel: 30 }],
  ['bruhe|gemusebruhe|bruhwurfel|fond|rinderfond|gemusefond|fischfond|fond rind', 5, 0.3, 0.5, 0.3, { würfel: 10, stk: 10, el: 5, tl: 2, glas: 400 }],
  ['pesto|pesto basilico', 450, 45, 6, 5, { el: 15, glas: 190 }],
  ['ajvar|tomatenmark|currypaste|rote currypaste', 90, 4, 9, 2.5, { el: 15, tl: 5, glas: 350 }],
  ['tahini|sesammus|erdnussbutter|erdnussmus|mandelmus|nussmus', 600, 50, 15, 22, { el: 15, tl: 5 }],
  ['apfelmus', 80, 0, 19, 0.3, { glas: 360, el: 20 }],
  // --- vegetables ---
  ['tomate|tomaten|kirschtomate|kirschtomaten|fleischtomate|cherrytomaten', 18, 0.2, 3, 0.9, { stk: 100, hand: 80 }],
  ['dosentomaten|gehackte tomaten|passierte tomaten|tomaten dose|stuckige tomaten', 22, 0.2, 4, 1.2, { dose: 400, pck: 500 }],
  ['zwiebel|rote zwiebel|schalotte|fruhlingszwiebel|lauchzwiebel', 40, 0.1, 9, 1.2, { stk: 80, fruhlingszwiebel: 15 }],
  ['rostzwiebeln|rostzwiebel', 600, 44, 44, 6, { el: 5, hand: 15 }],
  ['paprika|rote paprika|paprikaschote', 30, 0.3, 6, 1, { stk: 150 }],
  ['gurke|salatgurke|schlangengurke', 15, 0.1, 3, 0.7, { stk: 400 }],
  ['essiggurke|gewurzgurke|gewurzgurkchen|cornichons', 20, 0.2, 4, 0.5, { stk: 30, glas: 360 }],
  ['zucchini', 17, 0.3, 3, 1.2, { stk: 250 }],
  ['karotte|karotten|mohre|mohren|mohrrube', 40, 0.2, 8, 0.9, { stk: 80 }],
  ['lauch|porree', 30, 0.3, 6, 1.5, { stk: 200, stange: 200 }],
  ['champignon|champignons|pilze', 22, 0.3, 3, 3, { stk: 20, pck: 250 }],
  ['brokkoli|blumenkohl|rosenkohl', 35, 0.4, 7, 2.8, { stk: 450, kopf: 450 }],
  ['kohl|spitzkohl|weisskohl|wirsing|rotkohl', 25, 0.1, 6, 1.3, { kopf: 900, stk: 900, glas: 700, blatt: 40 }],
  ['sauerkraut|kimchi', 20, 0.2, 4, 1.5, { dose: 500, beutel: 500, glas: 500 }],
  ['spinat|blattspinat', 25, 0.4, 3.6, 2.9, { hand: 30, pck: 450 }],
  ['rahmspinat', 70, 4.5, 4, 3, { pck: 450 }],
  ['salat|feldsalat|eisberg|eisbergsalat|romana|rucola|blattsalat|salatherzen', 15, 0.2, 3, 1.3, { kopf: 300, hand: 30, stk: 300, pck: 125, blatt: 10 }],
  ['erbse|erbsen|mais|mais dose|zuckermais', 80, 1, 14, 4, { dose: 140, hand: 50 }],
  ['bohne|bohnen|weisse bohnen|kidneybohnen|kichererbse|kichererbsen', 105, 0.7, 15, 7, { dose: 250 }],
  ['grune bohnen|brechbohnen', 30, 0.2, 5, 2, { dose: 220 }],
  ['kurbis|hokkaido', 30, 0.1, 7, 1, { stk: 900 }],
  ['spargel', 20, 0.1, 3.9, 2.2, { stk: 25, stange: 25 }],
  ['avocado', 160, 15, 9, 2, { stk: 150 }],
  ['olive|oliven', 145, 15, 4, 1, { hand: 40 }],
  // --- fruit ---
  ['apfel|aepfel', 52, 0.2, 14, 0.3, { stk: 150 }],
  ['birne|birnen', 57, 0.1, 15, 0.4, { stk: 160 }],
  ['banane|bananen', 89, 0.3, 23, 1.1, { stk: 120 }],
  ['zitrone|zitronen|limette|limetten', 30, 0.3, 9, 1, { stk: 40 }],   // (juice + a bit: nobody eats the whole lemon)
  ['zitronensaft|limettensaft', 25, 0, 8, 0.4, { el: 15, tl: 5, spritzer: 3 }],
  ['orange', 47, 0.1, 12, 0.9, { stk: 180 }],
  ['ananas|ananas dose|ananasscheiben|ananas scheiben', 60, 0.1, 15, 0.5, { dose: 340, sch: 40, stk: 900 }],
  ['beere|beeren|himbeere|himbeeren|erdbeere|erdbeeren|johannisbeere|johannisbeeren|heidelbeere|heidelbeeren|blaubeeren|sauerkirsche|sauerkirschen|kirschen', 45, 0.4, 9, 1, { hand: 60, pck: 300, glas: 350, becher: 250 }],
  ['rhabarber', 20, 0.1, 4, 0.9, { stk: 150, stange: 150 }],
  ['rosine|rosinen', 300, 0.5, 79, 3, { el: 12, hand: 30 }],
  // --- nuts, seeds ---
  ['nuss|nusse|walnuss|walnusse|haselnuss|haselnusse|mandel|mandeln|mandelblattchen|erdnusse|cashews|pinienkerne', 640, 58, 8, 18, { el: 10, hand: 30, stk: 4 }],
  ['sesam|sesamsamen|chiasamen|leinsamen|mohn|gemahlener mohn', 550, 45, 10, 20, { el: 10, tl: 3 }],
  // --- drinks ---
  ['saft|apfelsaft|orangensaft|ananassaft|traubensaft|nektar|johannisbeer nektar', 46, 0.1, 11, 0.4, { glas: 200 }],
  ['ginger ale|limo|cola', 40, 0, 10, 0, { glas: 200 }],
  ['sekt|alkoholfreier sekt|bier', 35, 0, 7, 0.3, { glas: 150 }],
  ['rum|wein', 220, 0, 0, 0, { el: 15 }],
].map(([k, kcal, f, kh, ew, u]) => ({ keys: k.split('|'), v: [kcal, f, kh, ew], u }));

const fold = s => String(s || '').toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/[éè]/g, 'e').replace(/î/g, 'i');
// does one word stand for the key? the word may be a compound ending in it; plural endings fold away
const wordHit = (w, k) => k.length <= 3 ? [w, w.replace(/(er|n|s)$/, '')].includes(k) && !(k === 'ei' && w === 'eis')
  : [w, w.replace(/(en|n|e|s|er)$/, ''), w.replace(/(n|s)$/, '')].some(x => x.endsWith(k));
function match(part) {
  const t = ' ' + fold(part).replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ', ws = t.trim().split(' ');
  let best = null, bl = 0;
  for (const f of FOOD) for (const k of f.keys) {
    const hit = k.includes(' ') ? t.includes(' ' + k + ' ') || t.includes(' ' + k + 'n ') : ws.some(w => wordHit(w, k));
    if (hit && k.length > bl) { best = f; bl = k.length; }
  }
  return best;
}
// "Spitzkohl oder Weißkohl" → Spitzkohl, "Parmesan, frisch gerieben" → Parmesan, "Bio-Zitrone (…) – für …" → Zitrone
const MEMO = new Map(), NMEMO = new Map();   // the book lists ask for every recipe on each render
export function food(name) {
  if (!MEMO.has(name)) MEMO.set(name, findFood(name));
  return MEMO.get(name);
}
function findFood(name) {
  const t = String(name || '').replace(/\([^)]*\)/g, ' ').split(/\s[–-]\s|;/)[0];
  for (const p of [t.split(',')[0].split(/\boder\b|\//)[0], t.split(',')[0], t]) { const f = p.trim() && match(p); if (f) return f; }
  // "Käse (z.B. Cheddar)", "Kokosmilch (oder Kokossirup)": the thing may sit in the brackets
  const br = String(name || '').match(/\(([^)]*)\)/); return br ? match(br[1]) : null;
}
// grams of one ingredient line; null = amount not understood
function grams(q, name, f) {
  const s = String(q || '').trim(), u = f.u;
  const g = x => { const m = String(x).match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i); return m ? parseFloat(m[1].replace(',', '.')) * (/^(kg|l)$/i.test(m[2]) ? 1000 : 1) : null; };
  if (/frittier/i.test(name)) return 15;   // oil for deep-frying: only what sticks
  const inQ = s.match(/\(([^)]*)\)/); if (inQ && g(inQ[1]) != null) return g(inQ[1]);   // "1 Packung (ca. 500 g)"
  if (!f.v[0]) return 0;   // spices, water: any amount is nothing
  if (!s) return u.etwas != null ? u.etwas : /wer mag|optional|servieren|\bdazu\b|deko/i.test(name) ? 0 : null;   // no amount (handwritten pages): only the pan fat can be guessed
  if (/^(etwas|evtl|nach |optional|reichlich|viel|einige|ein paar|wer mag)/i.test(s)) return u.etwas || 0;
  const p = parseQty(s); if (!p) return null;
  if (/^(prise|msp|messerspitze|tropfen|spur)/.test(p.unit)) return 0;
  if (p.unit === 'g' || p.unit === 'ml') return p.n;
  if (p.unit === 'stk') {
    const inName = String(name).match(/\(([^)]*)\)/), gn = inName && g(inName[1]);   // "Tomaten (etwa 200 g)", "Bohnen (je 240 g …)"
    if (gn != null) return /\bje\b/.test(inName[1]) ? gn * p.n : gn;
    return u.stk != null ? p.n * u.stk : null;
  }
  const je = String(name).match(/\(je ([^)]*)\)/); if (je && g(je[1]) != null) return p.n * g(je[1]);   // "2 Dosen" of "Bohnen (je 240 g …)"
  const w = p.unit, w2 = w.replace(/(n|en|s|e)$/, '');   // parseQty already drops a plural ending; drop the rest too (Scheiben → scheibe → scheib)
  const look = k => u[k] != null ? u[k] : null;
  const KEYS = [['el', 'el'], ['tl', 'tl'], ['dos', 'dose'], ['gla', 'glas'], ['gläs', 'glas'], ['becher', 'becher'], ['beutel', 'beutel'], ['pck', 'pck'], ['packung', 'pck'], ['päckch', 'pck'], ['tüt', 'pck'],
    ['scheib', 'sch'], ['handvoll', 'hand'], ['kugel', 'kugel'], ['würfel', 'würfel'], ['zeh', 'zehe'], ['stang', 'stange'], ['kopf', 'kopf'], ['köpf', 'kopf'], ['tass', 'tasse'], ['roll', 'rolle'],
    ['bund', 'bund'], ['schus', 'schuss'], ['spritz', 'spritzer'], ['blatt', 'blatt'], ['blätt', 'blatt'], ['zweig', 'zweig'], ['stängel', 'stängel'], ['tafel', 'tafel'], ['groß', 'stk'], ['klein', 'stk'], ['mittelgroß', 'stk'], ['dünn', 'stange'], ['gehäuft', 'tl'], ['walnussgroß', 'stk']];
  // "8 große Blätter": the unit is the last unit word, "große" only scales it
  const ws = s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/\s+/).slice(1).map(x => [x, x.replace(/(n|en|s|e|er)$/, '')]);
  const unitOf = ([x, y]) => KEYS.find(([a]) => (x.startsWith(a) || y.startsWith(a)) && !/^(groß|klein|mittelgroß|dünn|gehäuft|walnussgroß)/.test(a));
  const k = ws.map(unitOf).filter(Boolean).pop() || KEYS.find(([a]) => w.startsWith(a) || w2.startsWith(a));
  if (!k) return null;
  const per = look(k[1]) ?? (k[1] === 'tl' && u.el != null ? u.el / 3 : null) ?? (k[1] === 'hand' ? UNIT_G.handvoll : k[1] === 'sch' ? UNIT_G.scheibe : k[1] === 'pck' ? UNIT_G.pck : UNIT_G[k[1]]);
  const big = /dünn|klein/.test(w) ? 0.6 : /gehäuft/.test(w) ? 1.5 : /groß/.test(w) && !/mittel|walnuss/.test(w) ? 1.4 : 1;
  return per == null ? null : p.n * per * big;
}
// how many eat from it: "2", "6 Stück", "ca. 16 Kekse" are counted; a cake tin, a tray or "nach Hunger" is a guess (user: guess pieces)
export function portions(r, total) {
  const s = String(r.serves == null || r.serves === '' ? '2' : r.serves).trim(), sweet = r.cat === 'dessert' || r.cat === 'backen';
  const per = s.match(/(\d+)\s*g\s+pro\s+(\w+)/i); if (per && total) return { n: Math.max(1, Math.round(total / +per[1])), label: per[2], guess: true };   // "Sirup … (75 g pro Glas)"
  const m = s.match(/^(?:ca\.\s*)?(\d+)(?:\s*[–-]\s*(\d+))?\s*(.*)$/i);
  if (m && !/^(g|kg|ml|l)\b/i.test(m[3]) && (+m[1] > 1 || /^portion/i.test(m[3]))) {
    const n = m[2] ? (+m[1] + +m[2]) / 2 : +m[1];
    return { n, label: !m[3] || /^(portion|person|leute)/i.test(m[3]) ? 'Portion' : 'Stück', guess: false };
  }
  const cm = +(s.match(/(\d+)\s*cm/) || [])[1];
  if (/springform|kranzform|torte|boden|kuchen|zopf|striezel|kastenform/i.test(s)) return { n: cm ? (cm <= 18 ? 6 : cm <= 22 ? 8 : 12) : 12, label: 'Stück', guess: true };
  if (/blech/i.test(s)) return sweet ? { n: 20, label: 'Stück', guess: true } : { n: 4, label: 'Portion', guess: true };
  if (/roulade/i.test(s)) return { n: 10, label: 'Stück', guess: true };
  if (sweet) return { n: 6, label: /form|quiche/i.test(s) ? 'Stück' : 'Portion', guess: true };
  return { n: /reste|hunger|lust/i.test(s) ? 2 : 4, label: 'Portion', guess: true };
}
// the estimate for one recipe: {kcal, f, kh, ew, n, label, guess, missing: [names]} per portion, or null when nothing is known
export function nutrition(r) {
  const key = JSON.stringify([r.serves, r.cat, r.ing]);
  if (!NMEMO.has(key)) NMEMO.set(key, calc(r));
  return NMEMO.get(key);
}
function calc(r) {
  const sum = [0, 0, 0, 0], missing = []; let total = 0, known = 0;
  for (const [q, name] of r.ing || []) {
    if (!name) continue;
    const f = food(name) || (q && !/\d/.test(q) ? food(q) : null);   // ("Öl" | "zum Frittieren")
    let g = f && grams(q, name, f);
    if (f && f.keys[0] === 'ol' && g >= 200) g *= 0.1;   // that much oil is for frying: only what sticks
    if (!f || g == null) { missing.push(name); continue; }
    known++; total += g; f.v.forEach((x, i) => { sum[i] += x * g / 100; });
  }
  if (!known || !sum[0] || missing.length > 2) return null;   // too many unknown amounts: a number would lie
  const p = portions(r, total), d = x => x / p.n;
  return { kcal: d(sum[0]), f: d(sum[1]), kh: d(sum[2]), ew: d(sum[3]), n: p.n, label: p.label, guess: p.guess, missing };
}
// 💪 High Protein (user 2026-10-30): enough per portion (≥ 25 g, a usual per-meal target) AND dense (≥ 20 % of the kcal,
// the EU "high protein" rule), so a huge heavy plate doesn't count just by size
export const highProtein = n => !!n && n.ew >= 25 && n.ew * 4 >= n.kcal * 0.2;
export const FOODS = FOOD.length;
