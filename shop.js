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
