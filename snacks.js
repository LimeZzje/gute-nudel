// 🥜 EVENT: Nudels Snack-Labor (user 2026-11-07) — "make your own healthy snack mixes for evening snacks": nut mixes with
// more finesse, bars, fruity things, fun. Nine recipes in four drawers + the 🧪 Mischpult (build your own mix → an own
// recipe 'mix-…', cat snack). Three DIFFERENT snacks made together (rated in cooking mode on either phone; the partner's
// come along in post.cooked) finish it: +5 ⭐ for each of you, a party, a card under "Vergangene Events". From then on
// (or from END, whatever comes first) the nine live in the Kochbuch under the new 🥜 Snacks chip.
// Pregnancy-safe (REZEPTE.md, until end of January 2027): no raw egg, no alcohol, hard cheese only, fresh berries washed
// (frozen berries are not eaten raw), nothing with tonka.
export const ID = 'snacklabor-2026';
export const TITLE = 'Nudels Snack-Labor';
export const STARS = 5;
export const GOAL = 3;
export const START = new Date(2026, 10, 7, 0, 0, 0).getTime();
export const END = new Date(2026, 11, 21, 0, 0, 0).getTime();   // safety end before Christmas: the recipes go into the book anyway

export const DRAWERS = [['mix', '🥜', 'Mischungen'], ['bar', '🍫', 'Riegel'], ['fresh', '🍏', 'Frisch & lustig'], ['fancy', '✠', 'Für Feinschmecker']];

export const RECIPES = [
  {
    id: 'sn-kino-mischung', drawer: 'mix', level: 'einfach', cat: 'snack', icon: '🍒', min: 15, serves: '6 Schälchen',
    title: 'Schoko-Kirsch-Kinomischung', tags: ['snack', 'nüsse', 'schoko', 'mischung'], taste: ['schokoladig', 'fruchtig', 'knackig'],
    note: 'Ein Schälchen = eine Handvoll (ca. 40 g). Hält im Schraubglas zwei Wochen.',
    ing: [['100 g', 'Mandeln'], ['75 g', 'Haselnüsse'], ['30 g', 'Kokoschips'], ['75 g', 'Trockenkirschen (getrocknete Sauerkirschen)'],
      ['50 g', 'Zartbitterschokolade (Drops oder grob gehackt)'], ['1 Prise', 'Meersalz']],
    steps: [
      ['Mandeln und Haselnüsse in eine Pfanne ohne Fett geben und bei mittlerer Hitze rösten. Oft schwenken, bis sie duften.', 6],
      ['Die Kokoschips für die letzte Minute dazugeben – die werden schnell braun, also dabeibleiben!'],
      ['Alles auf einen Teller kippen und ganz abkühlen lassen (sonst schmilzt gleich die Schokolade).', 10],
      ['Mit den Kirschen, der Schokolade und einer Prise Meersalz in ein Schraubglas füllen. Deckel drauf, kräftig schütteln. Fertig! 🎬'],
    ],
  },
  {
    id: 'sn-rosmarin-honig-nuesse', drawer: 'mix', cat: 'snack', icon: '🌿', min: 25, serves: '6 Schälchen',
    title: 'Rosmarin-Honig-Nüsse mit Meersalz', tags: ['snack', 'nüsse', 'mischung'], taste: ['süß-salzig', 'würzig', 'knackig'],
    note: 'Wie die teuren aus dem Feinkostladen. Beim Abkühlen werden sie erst richtig knackig.',
    ing: [['200 g', 'Nüsse gemischt (Cashews, Mandeln, Walnüsse)'], ['30 g', 'Kürbiskerne'], ['2 EL', 'Honig'], ['1 TL', 'Butter'],
      ['1 Zweig', 'Rosmarin'], ['½ TL', 'Meersalz (am besten Flocken)'], ['1 Prise', 'Chiliflocken (wer mag)']],
    steps: [
      ['Ein Stück Backpapier bereitlegen. Die Rosmarin-Nadeln abzupfen und fein hacken.'],
      ['Nüsse und Kürbiskerne in einer Pfanne ohne Fett bei mittlerer Hitze rösten, oft schwenken.', 5],
      ['Butter, Honig und Rosmarin dazugeben und rühren, bis der Honig blubbert und alle Nüsse glänzen.', 2],
      ['Sofort auf das Backpapier kippen, mit zwei Gabeln auseinanderziehen und mit Meersalz (und Chili) bestreuen.'],
      ['Abkühlen lassen – erst dann sind sie knackig.', 15],
      ['In Stücke brechen und ins Glas. Hält eine Woche.'],
    ],
  },
  {
    id: 'sn-knusper-kichererbsen', drawer: 'mix', cat: 'snack', icon: '🌶️', min: 45, serves: '4',
    title: 'Knusper-Kichererbsen mit Rauchpaprika', tags: ['snack', 'herzhaft', 'ofen'], taste: ['rauchig', 'salzig', 'knusprig'], hot: 1,
    note: 'Der Chips-Ersatz. Am selben Tag essen – über Nacht werden sie wieder weich.',
    ing: [['1 Dose', 'Kichererbsen (abgetropft 240 g)'], ['1 EL', 'Olivenöl'], ['1 TL', 'Paprikapulver geräuchert'], ['½ TL', 'Kreuzkümmel'], ['½ TL', 'Salz']],
    steps: [
      ['Ofen auf 200 °C Ober-/Unterhitze (180 °C Umluft) vorheizen. Ein Blech mit Backpapier auslegen.'],
      ['Kichererbsen abgießen, abspülen und mit Küchenpapier richtig trocken tupfen. Lose Häutchen dürfen weg – je trockener, desto knuspriger.'],
      ['Auf dem Blech verteilen und erst mal ohne Öl rösten.', 20],
      ['Öl und Gewürze in einer Schüssel verrühren, die heißen Kichererbsen darin schwenken.'],
      ['Zurück aufs Blech und weiterrösten, bis sie beim Schütteln rascheln.', 12],
      ['Auf dem Blech abkühlen lassen – dabei werden sie richtig knusprig.', 10],
    ],
  },
  {
    id: 'sn-popcorn-zwei-wege', drawer: 'mix', cat: 'snack', icon: '🍿', min: 15, serves: '2',
    title: 'Popcorn zwei Wege: Parmesan-Thymian & Zimt-Kakao', tags: ['snack', 'popcorn', 'film'], taste: ['käsig', 'zimtig', 'luftig'],
    note: 'Eine Schüssel herzhaft, eine süß – für den Filmabend. Parmesan ist Hartkäse, der ist in der Schwangerschaft okay.',
    ing: [['60 g', 'Popcornmais'], ['2 EL', 'Rapsöl'], ['2 EL', 'Butter'], ['20 g', 'Parmesan (fein gerieben)'], ['½ TL', 'Thymian (getrocknet)'],
      ['1 TL', 'Zimt'], ['1 TL', 'Kakaopulver'], ['1 EL', 'Puderzucker'], ['1 Prise', 'Salz']],
    steps: [
      ['Öl und drei Maiskörner in einen großen Topf mit Deckel geben und bei mittelhoher Hitze erhitzen.'],
      ['Sobald die drei gepoppt sind: den restlichen Mais dazu, Deckel drauf, Topf 30 Sekunden vom Herd nehmen (dann poppen alle fast gleichzeitig).'],
      ['Zurück auf den Herd und ab und zu rütteln, bis nur noch alle 2–3 Sekunden ein Plopp kommt.', 3],
      ['Popcorn auf zwei Schüsseln verteilen. Die Butter im heißen Topf schmelzen und über beide Hälften träufeln.'],
      ['Schüssel 1: Parmesan, Thymian und eine Prise Salz drüber. Schüssel 2: Zimt, Kakao und Puderzucker drüber.'],
      ['Teller drauf (oder Deckel), beide Schüsseln kräftig schütteln. Licht aus, Film an! 🎬'],
    ],
  },
  {
    id: 'sn-erdnuss-hafer-riegel', drawer: 'bar', cat: 'snack', icon: '🥜', min: 80, serves: '10 Riegel',
    title: 'Erdnuss-Hafer-Riegel ohne Backen', tags: ['snack', 'riegel', 'schoko', 'nüsse'], taste: ['nussig', 'schokoladig', 'sättigend'],
    note: 'Die Riegel für unterwegs und für den kleinen Hunger um 21 Uhr. Im Kühlschrank eine Woche.',
    ing: [['150 g', 'Haferflocken (zarte)'], ['120 g', 'Erdnussmus (ohne Zucker)'], ['80 g', 'Honig'], ['40 g', 'Mandeln (gemahlen)'],
      ['2 EL', 'Chiasamen'], ['½ TL', 'Zimt'], ['1 Prise', 'Salz'], ['60 g', 'Zartbitterschokolade']],
    steps: [
      ['Eine kleine Form (ca. 20 × 20 cm) mit Backpapier auslegen.'],
      ['Die Haferflocken in einer Pfanne ohne Fett anrösten, bis sie nussig duften.', 4],
      ['Erdnussmus und Honig in einem kleinen Topf bei niedriger Hitze verrühren, bis alles flüssig ist – nicht kochen.', 2],
      ['Haferflocken, gemahlene Mandeln, Chiasamen, Zimt und Salz in einer Schüssel mischen, die Erdnuss-Honig-Masse drübergießen und gut verrühren.'],
      ['In die Form geben und richtig fest drücken – am besten mit dem Boden eines Glases.'],
      ['Schokolade schmelzen (Schüssel über einem Topf mit heißem Wasser) und mit einem Löffel in Streifen drüberziehen.'],
      ['Kalt stellen, bis alles fest ist.', 60],
      ['In 10 Riegel schneiden.'],
    ],
  },
  {
    id: 'sn-aprikosen-kokos-riegel', drawer: 'bar', cat: 'snack', icon: '🍑', min: 45, serves: '8 Riegel',
    title: 'Aprikosen-Kokos-Fruchtriegel', tags: ['snack', 'riegel', 'frucht'], taste: ['fruchtig', 'frisch', 'weich'],
    note: 'Nur aus Früchten und Nüssen, kein Zucker dazu. Ihr braucht einen Zerkleinerer (oder den Pürierstab mit Zerhacker-Aufsatz).',
    ing: [['150 g', 'Trockenaprikosen (ungeschwefelt)'], ['100 g', 'Softdatteln (ohne Stein)'], ['80 g', 'Cashewkerne'], ['40 g', 'Kokosraspeln'],
      ['½', 'Bio-Orange (nur die Schale)'], ['1 Prise', 'Salz']],
    steps: [
      ['Die Cashews im Zerkleinerer fein hacken – aufhören, bevor es Mus wird.', 1],
      ['Aprikosen, Datteln, Kokosraspeln, die abgeriebene Orangenschale und das Salz dazugeben und pulsen, bis eine klebrige Masse entsteht, die beim Drücken zusammenhält. Zu trocken? 1 TL Wasser dazu.'],
      ['Die Masse zwischen zwei Backpapieren zu einem etwa 1,5 cm dicken Rechteck drücken (oder mit der Flasche ausrollen).'],
      ['Kalt stellen.', 30],
      ['In 8 Riegel schneiden und einzeln in Backpapier wickeln. Im Kühlschrank zwei Wochen.'],
    ],
  },
  {
    id: 'sn-apfel-nachos', drawer: 'fresh', level: 'einfach', cat: 'snack', icon: '🍏', min: 10, serves: '2',
    title: 'Apfel-Nachos mit Erdnuss-Zickzack', tags: ['snack', 'obst', 'schnell'], taste: ['frisch', 'nussig', 'süß'],
    note: 'Sieht aus wie Nachos, ist aber Obst. Mit den Fingern essen!',
    ing: [['2', 'Äpfel (knackig, z.B. Elstar)'], ['1 EL', 'Zitronensaft'], ['2 EL', 'Erdnussmus'], ['1 TL', 'Honig'], ['2 EL', 'Haferflocken'],
      ['1 EL', 'Zartbitterschokolade (Drops oder gehackt)'], ['1 Prise', 'Zimt']],
    steps: [
      ['Haferflocken in einer Pfanne ohne Fett kurz anrösten, bis sie duften.', 3],
      ['Äpfel vierteln, das Kerngehäuse rausschneiden und die Viertel in dünne Spalten schneiden.'],
      ['Die Spalten wie einen Fächer auf einen großen Teller legen und mit Zitronensaft beträufeln (dann werden sie nicht braun).'],
      ['Erdnussmus mit dem Honig verrühren (ist es zu fest: 10 Sekunden in die Mikrowelle) und mit einem Löffel im Zickzack über die Äpfel ziehen.'],
      ['Haferflocken, Schokolade und Zimt drüberstreuen. Sofort essen! 🍏'],
    ],
  },
  {
    id: 'sn-joghurt-bark', drawer: 'fresh', cat: 'snack', icon: '🫐', min: 135, serves: '4',
    title: 'Gefrorene Joghurt-Tafel mit Beeren & Pistazien', tags: ['snack', 'joghurt', 'frucht', 'kalt'], taste: ['frisch', 'cremig', 'fruchtig'],
    note: 'Wie Schokoladenbruch, nur aus Joghurt. Frische Beeren nehmen und waschen – TK-Beeren in der Schwangerschaft lieber nicht roh.',
    ing: [['400 g', 'Griechischer Joghurt'], ['2 EL', 'Honig'], ['½ TL', 'Vanilleextrakt'], ['1 Handvoll', 'Heidelbeeren'], ['1 Handvoll', 'Himbeeren'],
      ['2 EL', 'Pistazien (gehackt)'], ['1 EL', 'Kokosraspeln']],
    steps: [
      ['Ein kleines Blech oder eine große Form mit Backpapier auslegen. Die Beeren waschen und gut abtropfen lassen.'],
      ['Joghurt, Honig und Vanille glatt rühren und etwa 1 cm dick auf das Backpapier streichen.'],
      ['Beeren leicht hineindrücken, Pistazien und Kokos drüberstreuen.'],
      ['Ab ins Gefrierfach, bis alles fest ist.', 120],
      ['In Stücke brechen, 5 Minuten antauen lassen und knabbern. Der Rest bleibt im Gefrierbeutel im Tiefkühler.'],
    ],
  },
  {
    id: 'sn-fruchtsalami', drawer: 'fancy', level: 'fancy', cat: 'snack', icon: '🌰', min: 150, serves: '30 Scheiben (2 Rollen)',
    title: 'Fruchtsalami aus Feigen, Datteln & Pistazien mit Orange und Kardamom', tags: ['snack', 'frucht', 'nüsse', 'fancy'], taste: ['fruchtig', 'würzig', 'edel'],
    note: 'Sieht aus wie eine Salami, ist aber aus Früchten und Nüssen. In dünnen Scheiben auf einem Brett servieren – dazu passt ein Stück Hartkäse. Ihr braucht einen Zerkleinerer.',
    ing: [['150 g', 'Trockenfeigen'], ['100 g', 'Softdatteln (ohne Stein)'], ['60 g', 'Walnüsse'], ['40 g', 'Pistazien'], ['30 g', 'Mandeln'],
      ['1 EL', 'Kakaopulver'], ['1', 'Bio-Orange (nur die Schale)'], ['½ TL', 'Zimt'], ['1 Prise', 'Kardamom'], ['1 Prise', 'Meersalz (Fleur de Sel)'],
      ['2 EL', 'Puderzucker']],
    steps: [
      ['Walnüsse, Pistazien und Mandeln in einer Pfanne ohne Fett rösten, bis sie duften.', 5],
      ['Abkühlen lassen. Walnüsse und Mandeln grob hacken, die Pistazien ganz lassen – sie geben später das Salami-Muster.', 5],
      ['Bei den Feigen den harten Stielansatz abschneiden. Feigen und Datteln im Zerkleinerer zu einer klebrigen Paste mixen.'],
      ['Die Paste mit Kakao, abgeriebener Orangenschale, Zimt, Kardamom, Fleur de Sel und allen Nüssen in einer Schüssel verkneten (Hände leicht anfeuchten, dann klebt es nicht).'],
      ['Zwei Rollen von etwa 4 cm Durchmesser formen und im Puderzucker wälzen – das ist die weiße „Salami-Haut“.'],
      ['Jede Rolle fest in Backpapier wickeln und die Enden zudrehen wie bei einem Bonbon. Wer mag, wickelt Küchengarn drum wie beim Metzger.'],
      ['Kalt stellen, bis sie fest sind.', 120],
      ['Mit einem scharfen Messer in dünne Scheiben schneiden. Im Kühlschrank hält sie drei Wochen.'],
    ],
  },
];
export const ids = new Set(RECIPES.map(r => r.id));
// counts for the event: one of the nine, or an own mix from the Mischpult (id 'mix-…', also the partner's)
export const counts = rid => ids.has(rid) || /^mix-/.test(rid || '');

// ---------- 🧪 Mischpult: build your own mix ----------
// jars: [key, label, max picks, items [id, name, g per mix share, icon]]
export const JARS = [
  ['nut', 'Nüsse & Kerne', 3, [['mandel', 'Mandeln', '🌰'], ['cashew', 'Cashewkerne', '🥜'], ['walnuss', 'Walnüsse', '🌰'], ['hasel', 'Haselnüsse', '🌰'],
    ['pekan', 'Pekannüsse', '🌰'], ['erdnuss', 'Erdnüsse (ungesalzen)', '🥜'], ['kuerbis', 'Kürbiskerne', '🎃'], ['sonne', 'Sonnenblumenkerne', '🌻']]],
  ['fruit', 'Frucht', 2, [['kirsch', 'Trockenkirschen', '🍒'], ['cranb', 'Cranberrys (getrocknet)', '🔴'], ['apri', 'Trockenaprikosen', '🍑'],
    ['dattel', 'Softdatteln', '🟤'], ['rosine', 'Rosinen', '🍇'], ['apfelchip', 'Apfelchips', '🍎'], ['feige', 'Trockenfeigen', '🟣']]],
  ['crunch', 'Knusper', 2, [['kokos', 'Kokoschips', '🥥'], ['brezel', 'Mini-Salzbrezeln', '🥨'], ['hafer', 'Haferflocken (geröstet)', '🌾'],
    ['popcorn', 'Popcorn', '🍿'], ['reiswaffel', 'Reiswaffeln (gebrochen)', '🍘']]],
  ['sweet', 'Süß', 1, [['zartbitter', 'Zartbitterschokolade (Drops)', '🍫'], ['weiss', 'Weiße Schokolade (Drops)', '🤍'], ['nix', 'Lieber nicht süß', '–']]],
  ['kick', 'Der Kick', 1, [['honigzimt', 'Honig & Zimt', '🍯'], ['rosmarin', 'Rosmarin & Meersalz', '🌿'], ['rauch', 'Ahorn & Rauchpaprika', '🔥'],
    ['lebkuchen', 'Lebkuchengewürz & Honig', '🎄'], ['kakao', 'Kakao & Meersalz', '🟫'], ['pur', 'Pur, nur geröstet', '✨']]],
];
// what each kick adds (ingredients + the glaze words in the steps); sweetener = glazed in the pan
const KICK = {
  honigzimt: { ing: [['1 EL', 'Honig'], ['1 TL', 'Zimt'], ['1 Prise', 'Salz']], how: 'Honig und Zimt' },
  rosmarin: { ing: [['1 TL', 'Butter'], ['1 Zweig', 'Rosmarin'], ['½ TL', 'Meersalz']], how: 'Butter und den fein gehackten Rosmarin', salt: 'Meersalz' },
  rauch: { ing: [['1 EL', 'Ahornsirup'], ['1 TL', 'Paprikapulver geräuchert'], ['½ TL', 'Salz']], how: 'Ahornsirup, Rauchpaprika und Salz' },
  lebkuchen: { ing: [['1 EL', 'Honig'], ['1 TL', 'Lebkuchengewürz'], ['1 Prise', 'Salz']], how: 'Honig und Lebkuchengewürz' },
  kakao: { ing: [['1 EL', 'Ahornsirup'], ['1 TL', 'Kakaopulver'], ['½ TL', 'Meersalz']], how: 'Ahornsirup und Kakao', salt: 'Meersalz' },
  pur: { ing: [['1 Prise', 'Meersalz']], how: '' },
};
const NAMES = ['Sofa-Mischung', 'Couch-Konfetti', 'Kuschel-Krokant', 'Nudels Nachtschicht', 'Filmabend-Futter', 'Deckenburg-Proviant', 'Knusper-Kompass', 'Sternschnuppen-Mix'];
export const nameIdea = () => NAMES[Math.floor(Math.random() * NAMES.length)];
const and = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' und ' + l[l.length - 1] : l.join('');
const item = (jar, id) => (JARS.find(j => j[0] === jar)[3].find(x => x[0] === id) || [])[1];

// picks = {nut:[ids], fruit:[ids], crunch:[ids], sweet:[id], kick:[id]} → a normal recipe (cat snack). total about 330 g = 8 handfuls
export function buildMix(picks, name, uidv) {
  const P = k => (picks[k] || []).filter(Boolean), split = (n, list) => list.map(id => [Math.round(n / list.length / 5) * 5 + ' g', id]);
  const nuts = P('nut'), fruit = P('fruit'), crunch = P('crunch'), sweet = P('sweet').filter(x => x !== 'nix'), kick = KICK[P('kick')[0] || 'pur'] || KICK.pur;
  const ing = [...split(180, nuts).map(([q, id]) => [q, item('nut', id)]), ...split(80, fruit).map(([q, id]) => [q, item('fruit', id)]),
    ...split(40, crunch).map(([q, id]) => [q, item('crunch', id)]), ...sweet.map(id => ['40 g', item('sweet', id)]), ...kick.ing];
  const nutNames = nuts.map(id => item('nut', id)), roastCrunch = crunch.filter(id => ['kokos', 'hafer'].includes(id)).map(id => item('crunch', id).replace(/ \(.*\)/, ''));
  const steps = [['Ein Stück Backpapier bereitlegen.' + (P('kick')[0] === 'rosmarin' ? ' Die Rosmarin-Nadeln abzupfen und fein hacken.' : '')],
    [`${and(nutNames.map(t => t.replace(/ \([^)]*\)/g, '')))} in einer Pfanne ohne Fett bei mittlerer Hitze rösten, oft schwenken, bis es duftet.`, 6]];
  if (roastCrunch.length) steps.push([`${roastCrunch.join(' und ')} für die letzte Minute mit in die Pfanne – das wird schnell braun.`]);
  if (kick.how) steps.push([`${kick.how} dazugeben und rühren, bis alles glänzt und leicht klebt.`, 2]);
  steps.push([`Sofort auf das Backpapier kippen, auseinanderziehen${kick.salt ? ' und mit ' + kick.salt + ' bestreuen' : ''}.`], ['Ganz abkühlen lassen – dann wird es knackig.', 15]);
  const rest = [...fruit.map(id => item('fruit', id)), ...crunch.filter(id => !['kokos', 'hafer'].includes(id)).map(id => item('crunch', id)), ...sweet.map(id => item('sweet', id))].map(t => t.replace(/ \([^)]*\)/g, ''));
  steps.push([`Mit ${rest.length ? and(rest) : 'einer Prise Salz'} in ein Schraubglas füllen, Deckel drauf, schütteln. Fertig! 🥜 Hält zwei Wochen.`]);
  const icon = (JARS[0][3].find(x => x[0] === nuts[0]) || [, , '🥜'])[2];
  return { id: 'mix-' + uidv, cat: 'snack', title: String(name || '').trim().slice(0, 50) || nameIdea(), icon, min: 25, serves: '8 Handvoll', ing, steps,
    note: 'Eure eigene Mischung aus dem 🧪 Mischpult im Snack-Labor.', tags: ['snack', 'mischung', 'snacklabor'], mix: picks };
}

// the event's card under "Vergangene Events"
export function record(made, endedByTime) {
  return { id: ID, icon: '🥜', title: TITLE, done: Date.now(), lines: [
    ['🥜', made.length + (made.length === 1 ? ' Snack' : ' Snacks') + ' zusammen gemacht: ' + made.map(m => m.title).join(' · ')],
    ...(endedByTime ? [] : [['⭐', `+${STARS} Sterne für jeden von euch.`]]),
    ['📖', 'Alle Snacks stehen jetzt im Kochbuch unter 🥜 Snacks.']] };
}
