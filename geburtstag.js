// 🎂 EVENT: Julias Geburtstagskuchen backen zusammen mit Hase (user 2026-10-18 — her birthday is that day and the next).
// Three cakes from what's in the shared Vorrat (2 eggs each: the Vorrat has 6, so all three are possible):
// 🖍️ Kinderleicht (very easy, crayon page) · 🍓 Mittel (easy, the warm page) · ✠ Culinarius (super fancy, the dark page).
// Each opens as a normal cookbook page with cooking mode (app.js recipeById knows them). The first cake baked (rated in
// cooking mode, on either phone — the partner's comes along in post.cooked) ends the event: +5 ⭐ for each of you (user),
// a party, and a card under "Vergangene Events". Pregnancy-safe (REZEPTE.md): eggs always baked through, no raw egg, no alcohol.
export const ID = 'kuchen-julia-2026';
export const TITLE = 'Julias Geburtstagskuchen backen zusammen mit Hase';
export const STARS = 5;
export const END = new Date(2026, 9, 26, 0, 0, 0).getTime();   // (a safety end: a week after the birthday it quietly goes)

export const CAKES = [
  {
    id: 'gb-kuchen-kinderleicht', level: 'einfach', cat: 'dessert', icon: '🍫', min: 65, serves: '12',
    title: 'Schoko-Becherkuchen aus einer Schüssel', tags: ['kuchen', 'schoko', 'geburtstag'],
    note: 'Alles kommt nacheinander in eine Schüssel – kein Mixer nötig. Einkaufen müsst ihr nur Backpulver.',
    ing: [['2', 'Eier'], ['150 g', 'Zucker'], ['100 ml', 'Öl'], ['150 ml', 'Milch'], ['250 g', 'Mehl'], ['1 Päckchen', 'Backpulver'],
      ['1 Prise', 'Salz'], ['100 g', 'Schokolade'], ['1 TL', 'Butter']],
    steps: [
      ['Ofen auf 180 °C Ober-/Unterhitze (160 °C Umluft) vorheizen. Kastenform mit der Butter einfetten und mit 1 EL Mehl ausstäuben.'],
      ['Eier und Zucker in einer großen Schüssel mit dem Schneebesen verrühren, bis der Zucker fast nicht mehr knirscht.', 2],
      ['Öl und Milch dazugießen und gut verrühren.'],
      ['Mehl, Backpulver und Salz darüber geben und nur kurz unterrühren, bis kein Mehl mehr zu sehen ist.'],
      ['Die Hälfte der Schokolade grob hacken und unter den Teig heben. Teig in die Form füllen.'],
      ['Backen, bis ein Holzstäbchen in der Mitte sauber wieder herauskommt.', 45],
      ['Kuchen 10 Minuten in der Form abkühlen lassen, dann herauslösen und auf einem Gitter auskühlen lassen.', 10],
      ['Restliche Schokolade in einer Schüssel über einem Topf mit heißem Wasser schmelzen und mit einem Löffel in Streifen über den Kuchen ziehen. Kerzen rein – fertig! 🎉'],
    ],
  },
  {
    id: 'gb-kuchen-mittel', cat: 'dessert', icon: '🍓', min: 100, serves: '12',
    title: 'Erdbeer-Frischkäse-Torte mit Marmeladenfüllung', tags: ['kuchen', 'torte', 'geburtstag'],
    note: 'Für eine 26er-Springform. Einkaufen: Backpulver – und bunte Zuckerstreusel, wenn ihr mögt.',
    ing: [['150 g', 'Margarine'], ['190 g', 'Zucker'], ['1 Prise', 'Salz'], ['2', 'Eier'], ['250 g', 'Mehl'], ['1 Päckchen', 'Backpulver'],
      ['150 ml', 'Milch'], ['200 g', 'Erdbeermarmelade'], ['200 g', 'Frischkäse'], ['1 Handvoll', 'Nüsse'], ['1 Päckchen', 'bunte Zuckerstreusel (optional)']],
    steps: [
      ['Ofen auf 180 °C Ober-/Unterhitze (160 °C Umluft) vorheizen. Den Boden der Springform mit Backpapier belegen, den Rand mit etwas Margarine einfetten.'],
      ['Weiche Margarine mit 150 g Zucker und dem Salz mit dem Handrührgerät cremig rühren.', 3],
      ['Eier einzeln dazugeben und jedes etwa eine halbe Minute unterrühren.'],
      ['Mehl mit Backpulver mischen und abwechselnd mit der Milch kurz unterrühren – nur so lange, bis alles verbunden ist.'],
      ['Teig in die Form streichen und backen, bis ein Holzstäbchen sauber herauskommt.', 30],
      ['Kuchen 10 Minuten ruhen lassen, vom Rand lösen und ganz auskühlen lassen – sonst schmilzt die Creme.', 40],
      ['Kuchen mit einem langen Messer einmal waagerecht halbieren. 150 g Erdbeermarmelade glatt rühren, auf den unteren Boden streichen und den oberen Boden daraufsetzen.'],
      ['Frischkäse mit 40 g Zucker glatt rühren, bis sich der Zucker gelöst hat, und oben auf der Torte verstreichen.', 2],
      ['Restliche Erdbeermarmelade in kleinen Klecksen auf die Frischkäse-Creme setzen und mit einem Zahnstocher zu Schlieren ziehen.'],
      ['Nüsse grob hacken, in einer Pfanne ohne Fett rösten, bis sie duften, und am Rand verteilen (Zuckerstreusel dazu, wenn ihr habt). Kerzen rein! 🎂', 3],
    ],
  },
  {
    id: 'gb-kuchen-culinarius', level: 'fancy', cat: 'dessert', icon: '🎂', min: 160, serves: '8',
    title: 'Schokoladen-Tahini-Torte mit Ganache-Spiegel, Nusskrokant & Preiselbeer-Orangen-Gel', tags: ['kuchen', 'torte', 'schoko', 'geburtstag'],
    note: 'Für eine 20–22er-Springform (26er geht auch: flacher, ca. 5 Min. kürzer). Schwangerschaftssicher: Eier ganz durchgebacken, kein Alkohol. Einkaufen: nur Backpulver.',
    ing: [['120 g', 'Butter'], ['200 g', 'Schokolade'], ['60 g', 'Tahini'], ['2', 'Eier'], ['170 g', 'Zucker'], ['1 Prise', 'Salz'], ['90 g', 'Mehl'],
      ['1 TL', 'Backpulver'], ['200 g', 'Sahne'], ['60 g', 'Nüsse'], ['150 g', 'Preiselbeermarmelade'], ['80 ml', 'Orangensaft']],
    steps: [
      ['Mise en place (alles abwiegen und bereitstellen). Ofen auf 175 °C Ober-/Unterhitze (155 °C Umluft). Boden der Springform mit Backpapier belegen, Rand mit etwas Butter fetten.'],
      ['Beurre noisette (Nussbutter): 120 g Butter in einem hellen Topf bei mittlerer Hitze schmelzen und weiter köcheln lassen, bis sie nussig duftet und am Boden goldbraune Pünktchen hat. Sofort vom Herd ziehen.', 6],
      ['100 g Schokolade hacken und in der heißen Nussbutter schmelzen, dann das Tahini glatt einrühren. Etwas abkühlen lassen.'],
      ['Eier mit 110 g Zucker und dem Salz mit dem Handrührgerät dick und hell aufschlagen, bis die Masse in breiten Bändern vom Rührbesen fällt (Ruban-Stadium).', 5],
      ['Die Schoko-Tahini-Butter in einem dünnen Strahl unter Rühren einlaufen lassen. Mehl und Backpulver darüber sieben und mit dem Teigschaber vorsichtig unterheben – nicht rühren, die Luft soll bleiben.'],
      ['In die Form füllen und backen, bis die Mitte fest ist und ein Holzstäbchen sauber herauskommt.', 28],
      ['Torte in der Form vollständig auskühlen lassen. Dann auf eine Platte setzen und den Springformrand wieder darumschließen – er hält gleich den Spiegel.', 40],
      ['Krokant: 60 g Zucker in einer Pfanne ohne Rühren schmelzen und zu hellem Karamell werden lassen (nur die Pfanne schwenken). Nüsse grob hacken, unterheben, auf Backpapier streichen, mit einer Prise Salz bestreuen und hart werden lassen.', 6],
      ['Gel: Preiselbeermarmelade mit dem Orangensaft aufkochen und einkochen, bis die Mischung einen Löffelrücken überzieht (nappieren). Durch ein Sieb streichen und abkühlen lassen – beim Abkühlen geliert sie.', 6],
      ['Ganache: Sahne bis kurz vorm Kochen erhitzen, über die restlichen 100 g gehackte Schokolade gießen, 2 Minuten stehen lassen und dann von der Mitte aus mit dem Teigschaber zu einer glänzenden Emulsion rühren.', 2],
      ['Ganache-Spiegel: die lauwarme Ganache (am Handgelenk kaum noch warm) auf die Torte gießen und die Torte leicht kippen, bis die Oberfläche spiegelglatt ist. Kalt stellen, bis die Ganache fest ist.', 30],
      ['Anrichten: Messer in heißes Wasser tauchen, am Rand entlangziehen und den Ring abnehmen. Das Gel in Tupfen im Halbkreis setzen, den Krokant in Scherben brechen und senkrecht hineinstecken. Kerzen an – das Ritual ist vollbracht. 🕯️'],
    ],
  },
];
export const LABEL = { 'gb-kuchen-kinderleicht': ['🖍️', 'Kinderleicht', 'ganz einfach'], 'gb-kuchen-mittel': ['🍓', 'Mittel', 'einfach'],
  'gb-kuchen-culinarius': ['✠', 'Culinarius', 'super fancy'] };
export const isCake = id => CAKES.some(c => c.id === id);

// the card under "Vergangene Events" (same shape as baby.js record)
export function record(cooked, taste) {   // cooked: the diary entry {rid, title, ts}
  const c = CAKES.find(x => x.id === cooked.rid) || CAKES[0], d = new Date(cooked.ts), [ic, lv] = LABEL[c.id];
  const t = { 3: '😍 Göttlich.', 2: '🙂 Lecker.', 1: '😕 Naja – zählt trotzdem.' }[taste] || '';
  return { id: ID, icon: '🎂', title: TITLE, done: cooked.ts, lines: [
    [ic, `Gebacken: ${c.title} (${lv}).`],
    ['🕯️', `Am ${d.getDate()}.${d.getMonth() + 1}. um ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr.`],
    ...(t ? [['🍴', t]] : []),
    ['⭐', `${STARS} Sterne für jeden von euch.`],
    ['💛', 'Alles Gute zum Geburtstag, Julia!'],
  ] };
}
