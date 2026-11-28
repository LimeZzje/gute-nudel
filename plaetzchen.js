// 🍪 EVENT: Plätzchen-Rush (card G25, user 2026-11-28): one Advent event. Every Advent Sunday (29 Nov, 6 / 13 / 20 Dec)
// a new tin opens with 3 Plätzchen from 3 different families: one German classic, one from abroad, one Kinderleicht.
// The first of them baked and rated in cooking mode (either phone, post.cooked) puts that Advent on the Plätzchenteller:
// +5 ⭐ for each of you. A missed week stays open (his pick: nothing is lost). Four Advents on the plate = a party and a
// card under "Vergangene Events"; from then (or from END) all twelve live in the Kochbuch under 🧁 Backen.
// Pregnancy-safe (REZEPTE.md, until end of January 2027): no alcohol (no rum, no Vin Santo, no vanilla extract), no raw-egg
// glaze (icing = powdered sugar + lemon), egg only in dough that is baked through, no nibbling raw dough.
export const ID = 'plaetzchen-2026';
export const TITLE = 'Plätzchen-Rush';
export const STARS = 5;
// the four Advent Sundays (local midnight); the first one is the start
export const ADVENT = [new Date(2026, 10, 29), new Date(2026, 11, 6), new Date(2026, 11, 13), new Date(2026, 11, 20)].map(d => d.getTime());
export const START = ADVENT[0];
export const END = new Date(2027, 0, 7, 0, 0, 0).getTime();   // after Heilige Drei Könige: the tins close, the recipes go into the book
// per Advent: [German classic, from abroad, Kinderleicht] — twelve different families, so every tin is new
export const TINS = [
  ['pl-vanillekipferl', 'pl-pepparkakor', 'pl-ausstecher'],
  ['pl-kokosmakronen', 'pl-cantuccini', 'pl-crossies'],
  ['pl-spitzbuben', 'pl-snickerdoodles', 'pl-nussecken'],
  ['pl-elisenlebkuchen', 'pl-melomakarona', 'pl-schneebaelle'],
];
export const KINDS = [['de', '🎄 Klassiker'], ['welt', '🌍 Aus aller Welt'], ['easy', '🖍️ Kinderleicht']];
const RAW = 'Rohen Teig bitte nicht naschen – da ist rohes Ei drin (Schwangerschaft). Gebacken ist alles in Ordnung.';

export const RECIPES = [
  // ---------- 1. Advent ----------
  {
    id: 'pl-vanillekipferl', fam: 'Mürbe Hörnchen', cat: 'backen', icon: '🌙', min: 90, serves: 'ca. 60 Stück',
    title: 'Vanillekipferl', tags: ['backen', 'plätzchen', 'weihnachten', 'mandeln'], taste: ['buttrig', 'zart', 'vanillig'],
    note: 'Ohne Ei – der Teig hält nur durch kalte Butter. Die Kipferl zerfallen warm leicht: erst im Vanillezucker wälzen, wenn sie lauwarm sind.',
    ing: [['280 g', 'Mehl'], ['100 g', 'Mandeln (gemahlen)'], ['70 g', 'Zucker'], ['1 Prise', 'Salz'], ['200 g', 'Butter (kalt)'],
      ['½', 'Vanilleschote (das Mark)'], ['50 g', 'Puderzucker'], ['2 Pck.', 'Vanillezucker']],
    steps: [
      ['Mehl, Mandeln, Zucker, Salz und das Vanillemark in einer Schüssel mischen. Die kalte Butter in Würfeln dazu.'],
      ['Mit den Händen schnell zu einem glatten Teig kneten (nicht zu lange, sonst wird die Butter warm).'],
      ['Teig in Folie wickeln und kalt stellen.', 30],
      ['Ofen auf 175 °C Ober-/Unterhitze (155 °C Umluft) vorheizen, zwei Bleche mit Backpapier auslegen. Puderzucker und Vanillezucker auf einem Teller mischen.'],
      ['Vom Teig walnussgroße Stücke nehmen, zu fingerdicken Rollen (ca. 6 cm) formen, die Enden dünner rollen und zu Hörnchen biegen.'],
      ['Backen, bis die Spitzen gerade eben hellgolden werden – nicht braun.', 11],
      ['Kurz abkühlen lassen, dann noch lauwarm vorsichtig im Vanille-Puderzucker wälzen. In einer Dose halten sie drei Wochen. 🌙'],
    ],
  },
  {
    id: 'pl-pepparkakor', fam: 'Hauchdünne Gewürzkekse', cat: 'backen', icon: '🦌', min: 160, serves: 'ca. 80 Stück',
    title: 'Schwedische Pepparkakor', tags: ['backen', 'plätzchen', 'weihnachten', 'schweden', 'ausstechen'], taste: ['würzig', 'knusprig', 'ingwerig'],
    note: 'Die schwedischen Lebkuchen-Kekse: so dünn, dass sie beim Reinbeißen knacken. Ohne Ei. In Schweden wünscht man sich etwas, wenn man einen auf der Handfläche mit einem Finger in drei Stücke bricht.',
    ing: [['100 g', 'Butter'], ['120 g', 'brauner Zucker'], ['80 g', 'Zuckerrübensirup'], ['3 EL', 'Wasser'], ['2 TL', 'Zimt'], ['2 TL', 'Ingwer (gemahlen)'],
      ['1 TL', 'Nelken (gemahlen)'], ['½ TL', 'Kardamom (gemahlen)'], ['1 TL', 'Natron'], ['300 g', 'Mehl']],
    steps: [
      ['Butter, Zucker, Sirup, Wasser und alle Gewürze in einem Topf erhitzen, bis die Butter geschmolzen ist, einmal aufkochen lassen.'],
      ['Vom Herd nehmen und etwas abkühlen lassen.', 10],
      ['Natron einrühren (es schäumt kurz), dann das Mehl dazu und zu einem glatten, weichen Teig kneten.'],
      ['In Folie wickeln und in den Kühlschrank – über Nacht geht auch.', 120],
      ['Ofen auf 200 °C Ober-/Unterhitze (180 °C Umluft) vorheizen. Den Teig portionsweise auf bemehltem Backpapier ganz dünn ausrollen (2 mm).'],
      ['Herzen, Sterne oder Elche ausstechen und mit Abstand aufs Blech legen. 🦌'],
      ['Backen – dabeibleiben, sie werden schnell zu dunkel.', 6],
      ['Auf dem Blech abkühlen lassen: erst dann werden sie knusprig. 🦌'],
    ],
  },
  {
    id: 'pl-ausstecher', fam: 'Ausstecher', level: 'einfach', cat: 'backen', icon: '⭐', min: 75, serves: 'ca. 40 Stück',
    title: 'Butter-Ausstecher mit Zuckerguss', tags: ['backen', 'plätzchen', 'weihnachten', 'ausstechen'], taste: ['buttrig', 'süß', 'bunt'],
    note: RAW + ' Der Guss ist nur Puderzucker und Zitrone – ganz ohne Eiweiß.',
    ing: [['250 g', 'Mehl'], ['125 g', 'Butter (kalt)'], ['80 g', 'Zucker'], ['1 Pck.', 'Vanillezucker'], ['1', 'Ei'], ['1 Prise', 'Salz'],
      ['150 g', 'Puderzucker'], ['2-3 EL', 'Zitronensaft'], ['etwas', 'Zuckerstreusel']],
    steps: [
      ['Mehl, Zucker, Vanillezucker und Salz mischen. Butter in Stückchen und das Ei dazu und schnell zu einem glatten Teig kneten.'],
      ['Teig flach drücken, in Folie wickeln und kalt stellen.', 30],
      ['Ofen auf 180 °C Ober-/Unterhitze (160 °C Umluft) vorheizen. Teig auf wenig Mehl 4 mm dick ausrollen und Plätzchen ausstechen.'],
      ['Backen, bis die Ränder hellgolden sind.', 9],
      ['Ganz abkühlen lassen.', 15],
      ['Puderzucker mit so viel Zitronensaft glatt rühren, dass ein dicker Guss entsteht. Plätzchen damit bestreichen und sofort mit Streuseln bestreuen. Trocknen lassen – fertig! ⭐'],
    ],
  },
  // ---------- 2. Advent ----------
  {
    id: 'pl-kokosmakronen', fam: 'Makronen', cat: 'backen', icon: '🥥', min: 45, serves: 'ca. 30 Stück',
    title: 'Kokosmakronen', tags: ['backen', 'plätzchen', 'weihnachten', 'kokos', 'resteverwertung'], taste: ['kokosig', 'saftig', 'süß'],
    note: 'Die Eiweiß-Verwertung, wenn bei den Spitzbuben oder Kipferln Eigelb übrig bleibt. Schwangerschaft: ganz durchbacken, bis sie rundum goldgelb und außen fest sind.',
    ing: [['3', 'Eiweiß'], ['1 Prise', 'Salz'], ['150 g', 'Zucker'], ['1 Pck.', 'Vanillezucker'], ['200 g', 'Kokosraspel'], ['etwas', 'Oblaten (50 mm, wer mag)'],
      ['50 g', 'Zartbitterschokolade (wer mag)']],
    steps: [
      ['Ofen auf 150 °C Ober-/Unterhitze (130 °C Umluft) vorheizen, ein Blech mit Backpapier (oder Oblaten) auslegen.'],
      ['Eiweiß mit dem Salz steif schlagen. Zucker und Vanillezucker langsam einrieseln lassen und weiterschlagen, bis die Masse glänzt.'],
      ['Kokosraspel vorsichtig unterheben.'],
      ['Mit zwei Teelöffeln kleine Häufchen aufs Blech (oder auf die Oblaten) setzen.'],
      ['Backen, bis sie rundum goldgelb und außen fest sind.', 25],
      ['Abkühlen lassen. Wer mag: Schokolade schmelzen und die Böden eintunken oder Streifen drüberziehen. 🥥'],
    ],
  },
  {
    id: 'pl-cantuccini', fam: 'Zweimal gebacken', cat: 'backen', icon: '☕', min: 75, serves: 'ca. 40 Stück',
    title: 'Cantuccini mit Mandeln & Orange', tags: ['backen', 'plätzchen', 'weihnachten', 'italien', 'mandeln'], taste: ['knusprig', 'mandelig', 'orangig'],
    note: RAW + ' In der Toskana tunkt man sie in Vin Santo – bei euch in heißen Kakao oder Kaffee. Halten in einer Dose sechs Wochen.',
    ing: [['250 g', 'Mehl'], ['150 g', 'Zucker'], ['1 TL', 'Backpulver'], ['1 Prise', 'Salz'], ['2', 'Eier'], ['1', 'Bio-Orange (die Schale)'],
      ['150 g', 'Mandeln (ganz, ungeschält)']],
    steps: [
      ['Ofen auf 180 °C Ober-/Unterhitze (160 °C Umluft) vorheizen, ein Blech mit Backpapier auslegen.'],
      ['Mehl, Zucker, Backpulver und Salz mischen. Eier und die fein abgeriebene Orangenschale dazu und zu einem klebrigen Teig kneten. Mandeln unterkneten.'],
      ['Mit bemehlten Händen drei flache Rollen (ca. 4 cm breit) formen und mit Abstand aufs Blech legen.'],
      ['Backen, bis die Rollen hellgolden und fest sind.', 20],
      ['Kurz abkühlen lassen und den Ofen auf 150 °C (130 °C Umluft) herunterdrehen.', 10],
      ['Die Rollen schräg in 1 cm dicke Scheiben schneiden und mit der Schnittfläche nach oben zurück aufs Blech legen.'],
      ['Noch einmal backen, dabei nach der Hälfte wenden.', 15],
      ['Auf einem Gitter abkühlen lassen – dann sind sie richtig knusprig. ☕'],
    ],
  },
  {
    id: 'pl-crossies', fam: 'Ohne Backen: Knusperhaufen', level: 'einfach', cat: 'backen', icon: '🍫', min: 40, serves: 'ca. 30 Stück',
    title: 'Schoko-Crossies', tags: ['backen', 'plätzchen', 'weihnachten', 'schoko', 'ohne backen'], taste: ['schokoladig', 'knusprig', 'nussig'],
    note: 'Kein Ofen, kein Teig, kein Ausstechen – und trotzdem die ersten, die vom Teller verschwinden.',
    ing: [['200 g', 'Zartbitterschokolade'], ['1 EL', 'Kokosöl'], ['100 g', 'Cornflakes (ungezuckert)'], ['50 g', 'Mandelstifte']],
    steps: [
      ['Mandelstifte in einer Pfanne ohne Fett goldbraun rösten und abkühlen lassen.', 4],
      ['Schokolade hacken und mit dem Kokosöl über einem heißen Wasserbad schmelzen.'],
      ['Cornflakes (leicht zerdrückt) und Mandeln dazugeben und vorsichtig unterheben, bis alles mit Schokolade überzogen ist.'],
      ['Mit zwei Teelöffeln kleine Häufchen auf Backpapier setzen.'],
      ['Im Kühlschrank fest werden lassen – fertig! 🍫', 30],
    ],
  },
  // ---------- 3. Advent ----------
  {
    id: 'pl-spitzbuben', fam: 'Gefüllte Doppeldecker', cat: 'backen', icon: '❤️', min: 120, serves: 'ca. 30 Stück',
    title: 'Spitzbuben mit Johannisbeergelee', tags: ['backen', 'plätzchen', 'weihnachten', 'ausstechen', 'mandeln'], taste: ['buttrig', 'fruchtig', 'zart'],
    note: RAW + ' Sie werden am zweiten Tag am besten, wenn das Gelee in den Teig zieht.',
    ing: [['300 g', 'Mehl'], ['100 g', 'Mandeln (gemahlen)'], ['100 g', 'Puderzucker'], ['1 Pck.', 'Vanillezucker'], ['1 Prise', 'Salz'], ['200 g', 'Butter (kalt)'],
      ['1', 'Eigelb'], ['200 g', 'Johannisbeergelee'], ['etwas', 'Puderzucker zum Bestäuben']],
    steps: [
      ['Mehl, Mandeln, Puderzucker, Vanillezucker und Salz mischen. Butter in Würfeln und das Eigelb dazu und schnell glatt kneten.'],
      ['In zwei flache Päckchen teilen, in Folie wickeln und kalt stellen.', 60],
      ['Ofen auf 180 °C Ober-/Unterhitze (160 °C Umluft) vorheizen. Teig auf wenig Mehl 2-3 mm dünn ausrollen und Kreise (5 cm) ausstechen.'],
      ['Bei der Hälfte in die Mitte ein kleines Loch oder Herz stechen (Deckel).'],
      ['Backen, bis die Ränder gerade eben Farbe nehmen – sie sollen hell bleiben.', 9],
      ['Ganz abkühlen lassen.', 15],
      ['Gelee kurz erwärmen und glatt rühren. Die Böden damit bestreichen, die Deckel mit Puderzucker bestäuben und daraufsetzen. ❤️'],
    ],
  },
  {
    id: 'pl-snickerdoodles', fam: 'Weiche Zimtkekse', cat: 'backen', icon: '🍪', min: 45, serves: 'ca. 24 Stück',
    title: 'Snickerdoodles', tags: ['backen', 'plätzchen', 'weihnachten', 'usa', 'zimt'], taste: ['zimtig', 'weich', 'süß'],
    note: RAW + ' Der amerikanische Keks: außen zimtig-knusprig, innen weich. Weinsteinbackpulver ersetzt das „cream of tartar“ und macht sie leicht säuerlich.',
    ing: [['280 g', 'Mehl'], ['1 Pck.', 'Weinsteinbackpulver'], ['½ TL', 'Salz'], ['115 g', 'Butter (weich)'], ['150 g', 'Zucker'], ['1 Pck.', 'Vanillezucker'],
      ['1', 'Ei'], ['3 EL', 'Milch'], ['3 EL', 'Zucker (zum Wälzen)'], ['2 TL', 'Zimt']],
    steps: [
      ['Ofen auf 190 °C Ober-/Unterhitze (170 °C Umluft) vorheizen, zwei Bleche mit Backpapier auslegen.'],
      ['Butter, Zucker und Vanillezucker cremig rühren. Ei und Milch unterrühren.'],
      ['Mehl, Backpulver und Salz mischen und kurz unterrühren, nur bis alles verbunden ist.'],
      ['Zucker und Zimt auf einem Teller mischen. Aus dem Teig Kugeln (3 cm) rollen, im Zimtzucker wälzen und mit viel Abstand aufs Blech setzen.'],
      ['Backen, bis sie aufgegangen, wieder etwas eingesunken und am Rand fest sind.', 10],
      ['Fünf Minuten auf dem Blech ruhen lassen, dann aufs Gitter. 🍪'],
    ],
  },
  {
    id: 'pl-nussecken', fam: 'Vom Blech', level: 'einfach', cat: 'backen', icon: '🔺', min: 80, serves: 'ca. 32 Stück',
    title: 'Nussecken', tags: ['backen', 'plätzchen', 'weihnachten', 'nüsse', 'blech'], taste: ['nussig', 'schokoladig', 'karamellig'],
    note: RAW + ' Ein Blech, kein Ausstechen, kein Ausrollen – und am Ende nur Dreiecke schneiden.',
    ing: [['300 g', 'Mehl'], ['1 TL', 'Backpulver'], ['130 g', 'Zucker'], ['2 Pck.', 'Vanillezucker'], ['1', 'Ei'], ['280 g', 'Butter'], ['3 EL', 'Wasser'],
      ['150 g', 'Zucker (für den Belag)'], ['200 g', 'Haselnüsse (gemahlen)'], ['200 g', 'Haselnüsse (gehackt)'], ['4 EL', 'Aprikosenkonfitüre'],
      ['150 g', 'Zartbitterschokolade']],
    steps: [
      ['Ofen auf 175 °C Ober-/Unterhitze (155 °C Umluft) vorheizen, ein Blech mit Backpapier auslegen.'],
      ['Mehl, Backpulver, 130 g Zucker, 1 Päckchen Vanillezucker, das Ei und 130 g Butter in Stücken zu einem Teig kneten und mit den Händen aufs Blech drücken.'],
      ['Die Konfitüre glatt rühren und dünn auf den Teig streichen.'],
      ['Restliche Butter (150 g) mit 150 g Zucker, dem zweiten Vanillezucker und dem Wasser in einem Topf schmelzen. Alle Haselnüsse einrühren und gleichmäßig auf dem Teig verteilen.'],
      ['Backen, bis der Belag goldbraun ist.', 25],
      ['Noch warm in Quadrate (ca. 8 cm) und dann diagonal in Dreiecke schneiden. Abkühlen lassen.', 20],
      ['Schokolade schmelzen und die beiden spitzen Ecken eintunken. Auf Backpapier fest werden lassen. 🔺'],
    ],
  },
  // ---------- 4. Advent ----------
  {
    id: 'pl-elisenlebkuchen', fam: 'Lebkuchen', cat: 'backen', icon: '🟤', min: 60, serves: 'ca. 25 Stück',
    title: 'Elisenlebkuchen auf Oblaten', tags: ['backen', 'plätzchen', 'weihnachten', 'nüsse', 'lebkuchen'], taste: ['würzig', 'saftig', 'nussig'],
    note: RAW + ' Elisen = die feinsten Nürnberger: fast nur Nüsse, kaum Mehl. In einer Blechdose mit einem Apfelschnitz bleiben sie weich.',
    ing: [['3', 'Eier'], ['200 g', 'brauner Zucker'], ['1 Pck.', 'Vanillezucker'], ['200 g', 'Mandeln (gemahlen)'], ['200 g', 'Haselnüsse (gemahlen)'],
      ['50 g', 'Orangeat'], ['50 g', 'Zitronat'], ['2 TL', 'Lebkuchengewürz'], ['1 Prise', 'Salz'], ['½', 'Bio-Zitrone (die Schale)'], ['25', 'Oblaten (70 mm)'],
      ['150 g', 'Zartbitterschokolade']],
    steps: [
      ['Ofen auf 160 °C Ober-/Unterhitze (140 °C Umluft) vorheizen, zwei Bleche mit Backpapier auslegen und die Oblaten darauf verteilen.'],
      ['Orangeat und Zitronat sehr fein hacken.'],
      ['Eier, Zucker und Vanillezucker mit dem Mixer dick und hell aufschlagen.', 5],
      ['Mandeln, Haselnüsse, Orangeat, Zitronat, Lebkuchengewürz, Salz und Zitronenschale unterrühren.'],
      ['Je einen gehäuften Esslöffel Masse auf eine Oblate geben und mit einem nassen Messer zum Rand hin glatt streichen (zur Mitte etwas höher).'],
      ['Backen, bis sie leicht gebräunt und an der Oberfläche fest sind – innen bleiben sie saftig.', 22],
      ['Abkühlen lassen, Schokolade schmelzen und die Oberseiten damit bestreichen. 🟤'],
    ],
  },
  {
    id: 'pl-melomakarona', fam: 'In Sirup getaucht', cat: 'backen', icon: '🍯', min: 90, serves: 'ca. 40 Stück',
    title: 'Melomakarona: griechische Honigkekse', tags: ['backen', 'plätzchen', 'weihnachten', 'griechenland', 'honig'], taste: ['honigsüß', 'orangig', 'zimtig'],
    note: 'In Griechenland stehen sie an Weihnachten auf jedem Tisch. Ohne Ei und – anders als im Original – ohne Cognac. Der Trick: die warmen Kekse in den kalten Sirup.',
    ing: [['250 g', 'Honig'], ['200 g', 'Zucker (für den Sirup)'], ['250 ml', 'Wasser'], ['1', 'Zimtstange'], ['1', 'Bio-Orange (Schale + Saft)'],
      ['200 ml', 'Olivenöl (mild)'], ['80 g', 'Zucker'], ['150 ml', 'Orangensaft'], ['1 TL', 'Zimt'], ['½ TL', 'Nelken (gemahlen)'], ['1 TL', 'Natron'],
      ['1 TL', 'Backpulver'], ['500 g', 'Mehl'], ['100 g', 'Walnüsse (gehackt)']],
    steps: [
      ['Sirup zuerst: Honig, 200 g Zucker, Wasser, Zimtstange und einen Streifen Orangenschale aufkochen und leise köcheln lassen.', 5],
      ['Vom Herd nehmen und ganz kalt werden lassen (das ist wichtig).'],
      ['Ofen auf 180 °C Ober-/Unterhitze (160 °C Umluft) vorheizen. Öl, 80 g Zucker, Orangensaft, die restliche abgeriebene Orangenschale, Zimt und Nelken verrühren.'],
      ['Mehl mit Natron und Backpulver mischen und nur kurz unterkneten, bis ein weicher Teig entsteht – nicht lange kneten.'],
      ['Walnussgroße Stücke zu kleinen Ovalen formen, mit einer Gabel leicht eindrücken und aufs Blech legen.'],
      ['Backen, bis sie goldbraun sind.', 25],
      ['Die noch warmen Kekse portionsweise in den kalten Sirup legen und von jeder Seite eine halbe Minute ziehen lassen.'],
      ['Auf ein Gitter legen und sofort mit den Walnüssen bestreuen. 🍯'],
    ],
  },
  {
    id: 'pl-schneebaelle', fam: 'Ohne Backen: Kugeln', level: 'einfach', cat: 'backen', icon: '⛄', min: 50, serves: 'ca. 25 Stück',
    title: 'Kokos-Schneebälle', tags: ['backen', 'plätzchen', 'weihnachten', 'kokos', 'ohne backen'], taste: ['kokosig', 'cremig', 'süß'],
    note: 'Kein Ofen, nur Kühlschrank. Im Kühlschrank aufbewahren – da halten sie eine Woche.',
    ing: [['150 g', 'Butterkekse'], ['200 g', 'weiße Schokolade'], ['40 g', 'Butter'], ['3 EL', 'Milch'], ['110 g', 'Kokosraspel']],
    steps: [
      ['Butterkekse in einen Gefrierbeutel geben und mit dem Nudelholz fein zerbröseln.'],
      ['Schokolade hacken und mit Butter und Milch bei kleiner Hitze schmelzen, dabei rühren.'],
      ['Keksbrösel und 50 g Kokosraspel unterrühren. Die Masse kalt stellen, bis sie formbar ist.', 30],
      ['Restliche Kokosraspel auf einen Teller geben. Aus der Masse walnussgroße Kugeln rollen und darin wälzen.'],
      ['In Papierförmchen setzen und kühl stellen – fertig! ⛄'],
    ],
  },
];
export const ids = new Set(RECIPES.map(r => r.id));
export const counts = rid => ids.has(rid);
export const advOf = rid => TINS.findIndex(t => t.includes(rid));   // 0-3, -1 = not a Plätzchen
export const kindOf = rid => { const a = advOf(rid); return a < 0 ? null : KINDS[TINS[a].indexOf(rid)]; };
export const opened = (now = Date.now()) => ADVENT.filter(t => now >= t).length;   // how many tins are open

// the event's card under "Vergangene Events"; plate = [{adv, rid, title, icon}] in Advent order
export function record(plate, endedByTime) {
  return { id: ID, icon: '🍪', title: TITLE, done: Date.now(), lines: [
    ['🍪', plate.length ? `${plate.length} von 4 Advents auf dem Teller: ` + plate.map(p => p.title).join(' · ') : 'Der Teller wartet aufs nächste Jahr.'],
    ...(plate.length ? [['⭐', `${plate.length * STARS} Sterne für jeden von euch.`]] : []),
    ['📖', 'Alle zwölf Plätzchen stehen jetzt im Kochbuch unter 🧁 Backen.']] };
}
