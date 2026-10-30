// Einkaufsliste nach Supermarkt-Abteilungen: welche Abteilung ein Artikel hat (automatisch aus dem Wort, Korrekturen merkt
// sich die App), und die typische Reihenfolge je Kette. Grundmuster laut Handelspresse: Obst & Gemüse am Eingang, bei
// Discountern die Backstation gleich dahinter, Tiefkühl am Ende (damit nichts auftaut). Filialen weichen ab — deshalb
// lässt sich die Reihenfolge pro Laden umstellen.

export const SECTIONS = {
  obst: ['🥬', 'Obst & Gemüse'], brot: ['🥖', 'Brot & Backwaren'], kuehl: ['🧀', 'Kühlregal'], fleisch: ['🥩', 'Fleisch & Fisch'],
  trocken: ['🍝', 'Nudeln, Reis & Konserven'], backen: ['🧂', 'Backen, Öl & Gewürze'], suess: ['🍫', 'Süßes & Snacks'], getraenke: ['🥤', 'Getränke'],
  drogerie: ['🧴', 'Drogerie & Haushalt'], tk: ['🧊', 'Tiefkühl'], sonst: ['📦', 'Sonstiges'],
};
export const STORES = {
  standard: ['🛒 Standard', ['obst', 'brot', 'kuehl', 'fleisch', 'trocken', 'backen', 'suess', 'getraenke', 'drogerie', 'tk', 'sonst']],
  aldi: ['Aldi', ['obst', 'kuehl', 'fleisch', 'brot', 'trocken', 'backen', 'suess', 'getraenke', 'drogerie', 'tk', 'sonst']],
  lidl: ['Lidl', ['obst', 'brot', 'kuehl', 'fleisch', 'trocken', 'backen', 'suess', 'getraenke', 'drogerie', 'tk', 'sonst']],
  edeka: ['Edeka', ['obst', 'brot', 'fleisch', 'kuehl', 'trocken', 'backen', 'suess', 'getraenke', 'drogerie', 'tk', 'sonst']],
  netto: ['Netto', ['obst', 'brot', 'trocken', 'backen', 'suess', 'kuehl', 'fleisch', 'getraenke', 'drogerie', 'tk', 'sonst']],
  rewe: ['Rewe', ['obst', 'brot', 'fleisch', 'kuehl', 'trocken', 'backen', 'suess', 'drogerie', 'getraenke', 'tk', 'sonst']],
};
const W = {
  obst: 'apfel äpfel banane birne tomate tomaten kirschtomaten gurke salatgurke salat feldsalat rucola paprika zucchini zwiebel zwiebeln knoblauch knoblauchzehe kartoffel kartoffeln drillinge karotte karotten möhre möhren brokkoli kohl spitzkohl weißkohl rotkohl lauch porree pilze champignons schwammerl zitrone limette orange mandarine beeren erdbeeren himbeeren heidelbeeren trauben ingwer kräuter petersilie schnittlauch basilikum dill minze rosmarin suppengrün avocado mango ananas melone kiwi sellerie radieschen spinat',
  brot: 'brot toast toastbrot brötchen semmel semmeln baguette croissant vollkornbrot laugenbrezel brezel',
  kuehl: 'milch sahne butter käse gouda emmentaler bergkäse mozzarella parmesan feta joghurt quark kräuterquark magerquark schmand saure sahne mascarpone eier ei kräuterbutter schinken kochschinken wurst würstchen wiener salami aufschnitt räucherlachs spätzle pizzateig kartoffelsalat frischkäse margarine',
  fleisch: 'hackfleisch hack rinderhack rind rindfleisch schwein schweinebraten schweinenacken hähnchen hähnchenbrust hähnchenschenkel huhn pute gulasch rindergulasch schnitzel lachsfilet lachsfilets lachs fisch forelle',
  trocken: 'nudeln spaghetti spirelli penne reis risottoreis milchreis linsen bohnen kidneybohnen mais passierte gehackte tomatenmark brühe brühwürfel gemüsebrühe bratensoße soße senf ketchup preiselbeeren sauerkraut sauerkirschen apfelmus thunfisch kokosmilch kartoffelpüree püree röstzwiebeln müsli haferflocken kaffee tee honig marmelade semmelknödel kartoffelknödel knödel dose glas',
  backen: 'mehl zucker vanillezucker puderzucker backpulver öl olivenöl sonnenblumenöl essig balsamico salz pfeffer paprikapulver kümmel oregano zimt kreuzkümmel chili majoran gewürz kakaopulver rosinen nüsse',
  tk: 'tk tiefkühl eis vanilleeis fischstäbchen rahmspinat köttbullar tiefkühlpizza',
  suess: 'schokolade chips kekse gummibärchen löffelbiskuits marshmallows süßigkeiten',
  getraenke: 'wasser sprudel sprudelwasser saft apfelsaft ananassaft orangensaft cola limo limonade bier wein sekt sirup holunderblütensirup ginger',
  drogerie: 'klopapier toilettenpapier küchenrolle spülmittel waschmittel shampoo duschgel zahnpasta seife müllbeutel spülmaschinentabs tabs deo creme taschentücher alufolie backpapier frischhaltefolie schwamm',
};
const WORDS = Object.entries(W).flatMap(([sec, s]) => s.split(' ').map(w => [w, sec]));
// "Erbsen (TK)" → the word without amount/notes, lowercased
export const norm = t => String(t || '').toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
export function classify(text, learned = {}) {
  const raw = String(text || '').toLowerCase(), n = norm(text);
  if (learned[n]) return learned[n];
  if (/\btk\b|tiefkühl/.test(raw)) return 'tk';                         // frozen beats everything ("Erbsen (TK)")
  if (/\bdose\b|\(dose\)|\bglas\b|konserve/.test(raw)) return 'trocken'; // "Ananas (Dose)", "Preiselbeeren (Glas)"
  // the longest known word inside the item wins ("Kartoffelsalat" → Kühlregal, not "Kartoffel")
  let best = null;
  for (const [w, sec] of WORDS) {
    const hit = w.length <= 3 ? new RegExp('(^|[^a-zäöüß])' + w + '($|[^a-zäöüß])').test(n) : n.includes(w);   // "ei", "öl", "eis" only as whole words
    if (hit && (!best || w.length > best[0].length)) best = [w, sec];
  }
  return best ? best[1] : 'sonst';
}

// ---------- one thing, many names (2026-10-30, user: "Milch" asked about Milchreis, Salatgurke + Gurke were two things) ----------
// German compounds end in the actual thing (Voll|milch, Kirsch|tomaten, Salat|gurke), so a name matches when its noun ENDS in
// the other's noun — Milchreis is rice, not milk. Brands, pack words and leading adjectives drop out; plurals fold together.
const BRANDS = /\b(gut\s*&\s*günstig|gut\s*und\s*günstig|edeka|herzstücke|rewe|beste wahl|ja!|k-classic|milsani|kühne|mildessa|de cecco|barilla|burgis|knorr|maggi|dr\.?\s*oetker|alnatura|bio|coca-cola|philadelphia|picnic)\b/gi;
const FILLER = new Set(['einweg', 'mehrweg', 'natur', 'stück', 'am', 'im', 'vom', 'glas', 'dose', 'packung', 'beutel', 'tk', 'frisch', 'klassisch', 'original', 'etwas', 'oder', 'und', 'mit']);
// different words for the same thing (folded stems, see stem): → one name
const SAME = { salatgurk: 'gurk', schlangengurk: 'gurk', mohr: 'karott', mohrrub: 'karott', karotte: 'karott', porree: 'lauch', rinderhack: 'hackfleisch', hack: 'hackfleisch',
  gemischteshackfleisch: 'hackfleisch', schlagsahn: 'sahn', schlagrahm: 'sahn', rahm: 'sahn', kartoffeldrilling: 'kartoffel', drilling: 'kartoffel', sandwichtoast: 'toast', toastbrot: 'toast' };
const FAM = { ei: 'eier', eier: 'eier', eigelb: 'eier', eiweiss: 'eier', eiern: 'eier' };
const fold = w => w.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
// Tomate/Tomaten, Nudel/Nudeln, Äpfel/Apfel, Champignons → one stem (umlauts as ae/oe/ue only in SAME keys)
export function stem(w) {
  w = fold(w); if (FAM[w]) return FAM[w];
  if (w.length > 4 && /en$/.test(w)) w = w.slice(0, -2); else if (w.length > 3 && /[nes]$/.test(w)) w = w.slice(0, -1);
  return SAME[w] || w;
}
// compounds that end in a thing but aren't it: Milchreis is no Reis for a recipe, Erdnussbutter no Butter
const NOT = new Set(['milchrei', 'erdnussbutter', 'kakaobutter', 'kraeuterbutter', 'krauterbutter', 'buttermilch', 'kokosmilch', 'sojamilch', 'hafermilch', 'mandelmilch', 'apfelmus', 'pflaumenmus', 'tomatenmark']);
// the nouns of a name, as stems: "Edeka Herzstücke Gorgonzola am Stück" → [gorgonzola], "Rote Zwiebel" → [zwiebel],
// "Sandwich-Toast" → [toast]. Capitalised words are nouns; a name typed all lowercase keeps all its words.
export function nouns(t) {
  let s = String(t || '').replace(/\([^)]*\)/g, ' ').replace(BRANDS, ' ').replace(/\d+([.,]\d+)?\s*%?/g, ' ');
  const raw = s.split(/[\s\-–/,+]+/).filter(w => w && /[a-zäöüß]/i.test(w) && !FILLER.has(w.toLowerCase()));
  let ws = raw.some(w => /^[A-ZÄÖÜ]/.test(w)) ? raw.filter(w => /^[A-ZÄÖÜ]/.test(w)) : raw;
  // a capitalised adjective in front ("Rote Zwiebel", "Tiefgefrorene Himbeeren", "Gemischtes Hackfleisch") isn't the thing
  if (ws.length > 1 && /(e|er|es|en|em)$/.test(ws[0]) && /^[A-ZÄÖÜ]/.test(ws[0]) && !/[A-ZÄÖÜ]/.test(ws[0].slice(1)) && /^(rot|grün|gelb|weiß|schwarz|frisch|tiefgefror|tiefgekühlt|gemischt|gekocht|geräuchert|getrocknet|gehackt|passiert|festkochend|mehligkochend|klein|groß|jung|alt|mild|scharf|süß|sauer|fein|grob|zart|kernig|wiener|griechisch|italienisch)/i.test(ws[0])) ws = ws.slice(1);
  const st = ws.map(stem), joined = SAME[st.join('')];
  return joined ? [joined] : st;
}
// one key per thing: Salatgurke = Gurke, Frischkäse (Philadelphia) = Frischkäse, Sandwich Toast = Sandwich-Toast
export const thingKey = t => nouns(t).join(' ') || fold(norm(t));
// does the recipe's ingredient find this Vorrat thing? The Vorrat name may be more specific (Vollmilch for Milch,
// Kirschtomaten for Tomaten), never the other way round (Reis must not take the Milchreis).
// On the Vorrat side only the first noun is the thing ("Tafelschokolade Vollmilch" is chocolate), plus alternatives after "oder".
export function sameThing(ing, have) {
  const a = nouns(ing), all = nouns(have); if (!a.length || !all.length) return false;
  if (thingKey(ing) === thingKey(have)) return true;
  const alt = /\boder\b/i.test(String(have).replace(/\([^)]*\)/g, '')) ? all : all.slice(0, 1);
  return a.some(x => x.length >= 3 && alt.some(y => y === x || (y.endsWith(x) && y.length - x.length >= 3 && !NOT.has(y))));
}

// Amounts (2026-10-08, from app.js): "500 g", "1,5 kg", "2 Dosen" … → {n, unit, label}. g/kg and ml/l are converted, a bare number or
// "Stück" counts pieces; any other word (Dose, Scheiben, EL, Packung) only adds up with the same word.
export const FR = { '½': .5, '¼': .25, '¾': .75, '⅓': 1 / 3, '⅔': 2 / 3 };
const UNITS = { g: ['g', 1], gramm: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000], liter: ['ml', 1000], cl: ['ml', 10], dl: ['ml', 100] };
export function parseQty(q) {
  if (q == null || q === '') return null;
  let t = String(q).trim().replace(/^ca\.?\s*/i, '').replace(/(\d)\s*([½¼¾⅓⅔])/g, (m, a, b) => String(+a + FR[b])).replace(/[½¼¾⅓⅔]/g, m => String(FR[m]));
  const m = t.match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*([A-Za-zÄÖÜäöüß]*\.?)/); if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.')), w = m[2].replace(/\.$/, ''), k = w.toLowerCase();
  if (UNITS[k]) return { n: n * UNITS[k][1], unit: UNITS[k][0] };
  if (!w || /^(stück|stk|st|er)$/.test(k)) return { n, unit: 'stk' };   // Picnic's "10er" eggs = 10 Stück
  return { n, unit: k.replace(/(n|en|s)$/, ''), label: w };   // Dose/Dosen, Scheibe/Scheiben add up
}
