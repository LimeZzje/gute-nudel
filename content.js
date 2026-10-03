// All texts that make up the "game": rest quests, cozy recipes, prep quests, reward ideas, plant stages, strain names.
export const CAP = 10;          // tasks per day that earn stars; after that: "Genug für heute!"
export const PAGE_COST = 10;    // stars per photo book page …
export const pageCost = pages => (pages === 0 ? 1 : PAGE_COST); // … except the first: 1 star, so she sees right away what it is about
export const STAGE_COST = 10;   // stars per plant stage
export const REST_STARS = 3;    // a finished rest quest: 1 like a task + 2 bonus ("8 instead of 10")
export const BOOK_PAGES = 30;

// Ironically "legendary" rest quests. diff = stars of difficulty, rate = survival rate in %.
export const QUESTS = [
  { id: 'tee', title: 'Der Tee der Ewigkeit', diff: 5, rate: 9, dur: '10 Min.',
    text: 'Mach dir ein Getränk, das du wirklich magst. Trink es aus, solange es noch warm ist. Im Sitzen. Komplett.',
    boss: 'Die Spülmaschine piept. Sie lügt.' },
  { id: 'seiten', title: 'Die verbotenen Seiten', diff: 4, rate: 14, dur: '15 Min.',
    text: 'Lies ein paar Seiten in einem Buch – nur zum Spaß. Kein Ratgeber, keine To-do-Liste als Lesezeichen.',
    boss: '„Ich müsste eigentlich noch…“ – nein. Weiterlesen.' },
  { id: 'lieder', title: 'Das Lied des Nichtstuns', diff: 4, rate: 17, dur: '3 Lieder',
    text: 'Hör drei Lieder, die du liebst. Ohne nebenbei etwas zu erledigen. Mitsingen ist erlaubt.',
    boss: 'Deine Hände wollen aufräumen. Setz dich drauf.' },
  { id: 'wanne', title: 'Die Wanne von Avalon', diff: 5, rate: 11, dur: '30 Min.',
    text: 'Ein Bad oder eine lange Dusche – mit Zeit, ohne Eile, mit dem guten Duschgel.',
    boss: 'Das Badezimmer ist schmutzig? Heute ist es ein Spa.' },
  { id: 'spazier', title: 'Der Spaziergang ohne Auftrag', diff: 3, rate: 31, dur: '15 Min.',
    text: 'Geh raus. Kein Einkauf, kein Paket, keine Erledigung. Einfach gehen und gucken.',
    boss: '„Wenn ich schon draußen bin, könnte ich ja…“ – nein.' },
  { id: 'liegen', title: 'Die Kunst des Liegenlassens', diff: 5, rate: 4, dur: '30 Min.',
    text: 'Such dir etwas Unordentliches aus. Schau es an. Lass es liegen. Mach stattdessen etwas Schönes.',
    boss: 'Der Wäschekorb flüstert deinen Namen. Ignoriere ihn.' },
  { id: 'nickerchen', title: 'Das Nickerchen der Ahnen', diff: 4, rate: 20, dur: '20 Min.',
    text: 'Leg dich hin. Augen zu. Wecker auf 20 Minuten. Schlafen ist erlaubt, Dösen auch.',
    boss: 'Dein Kopf schreibt Listen. Lass ihn, du musst nicht mitschreiben.' },
  { id: 'serie', title: 'Die Folge der Schande', diff: 3, rate: 26, dur: '1 Folge',
    text: 'Eine Folge deiner Lieblingsserie. Ohne Handy daneben, ohne Wäsche falten.',
    boss: 'Wäsche falten während der Serie zählt NICHT.' },
  { id: 'anruf', title: 'Der Anruf ohne Grund', diff: 3, rate: 35, dur: '15 Min.',
    text: 'Ruf jemanden an, den du magst. Einfach so. Ohne Termin, ohne Organisieren.',
    boss: 'Nicht über Pläne reden. Über Quatsch reden.' },
  { id: 'haende', title: 'Die kreativen Hände', diff: 4, rate: 18, dur: '20 Min.',
    text: 'Malen, kritzeln, basteln, backen, pflanzen – irgendwas mit den Händen, nur weil es Spaß macht.',
    boss: 'Es muss nicht schön werden. Es muss gar nichts werden.' },
  { id: 'fenster', title: 'Das Fenster der Erkenntnis', diff: 5, rate: 7, dur: '5 Min.',
    text: 'Fünf Minuten aus dem Fenster schauen. Wolken, Bäume, Leute. Mehr nicht.',
    boss: 'Fünf Minuten. Die längsten deines Lebens.' },
  { id: 'snack', title: 'Der Snack der Würde', diff: 3, rate: 28, dur: '10 Min.',
    text: 'Iss etwas Leckeres. Auf einem Teller. Am Tisch. Im Sitzen. Nicht im Stehen über der Spüle.',
    boss: 'Die Spüle ist kein Esstisch. Heute nicht.' },
  { id: 'pflege', title: 'Das Gesicht der Ruhe', diff: 3, rate: 33, dur: '15 Min.',
    text: 'Gesichtsmaske, gute Creme, Haare kämmen, Nägel – irgendwas, das sich nach Pflege anfühlt.',
    boss: 'Nebenbei Mails lesen? Die Maske sieht alles.' },
  { id: 'kuscheln', title: 'Die große Kuschelei', diff: 2, rate: 52, dur: '10 Min.',
    text: 'Kuscheln. Mit wem oder was auch immer gerade da ist. Ohne auf die Uhr zu schauen.',
    boss: 'Nur noch kurz… nein. Noch länger.' },
];

// Double quests: housework first (lands on today's page), the matching reward the same evening.
export const COMBOS = [
  { id: 'avalon', icon: '🛁', title: 'Die Wanne von Avalon', diff: 4, work: 'Bad putzen', reward: 'Ein extra schönes Bad – mit Snacks und Serie oder Hörbuch', boss: 'Erst schrubben, dann baden. Das Bad gehört heute Abend dir.' },
  { id: 'bett', icon: '🛏️', title: 'Das Bett der Könige', diff: 3, work: 'Bettwäsche wechseln', reward: 'Heute früh ins frische Bett – mit Buch und Tee, Handy bleibt draußen', boss: 'Frische Bettwäsche verdient eine Königin, die früh drin liegt.' },
  { id: 'mordor', icon: '🧺', title: 'Der Wäscheberg von Mordor', diff: 4, work: 'Wäsche zusammenlegen (Serie nebenbei erlaubt!)', reward: 'Füße hoch in frischen Kuschelsocken', boss: 'Ein Socken, sie zu knechten… du schaffst das.' },
  { id: 'kueche', icon: '🍰', title: 'Die Küche des Friedens', diff: 3, work: 'Küche aufräumen und Spülmaschine', reward: 'Kaffee und etwas Süßes am sauberen Tisch – in Ruhe', boss: 'Die saubere Küche ist heute ein Café. Nur für dich.' },
  { id: 'drache', icon: '🎬', title: 'Der Staubsauger-Drache', diff: 3, work: 'Wohnzimmer saugen', reward: 'Film-Nest im frisch gesaugten Wohnzimmer', boss: 'Der Drache brüllt. Danach herrscht Stille – und ein Film.' },
  { id: 'einkauf', icon: '🛒', title: 'Die Einkaufs-Expedition', diff: 3, work: 'Wocheneinkauf', reward: 'Eine Sache nur für dich: Blumen, Lieblingssnack, irgendwas Schönes', boss: 'Ein Teil im Wagen ist heute nicht für den Haushalt.' },
  { id: 'fenster', icon: '🪟', title: 'Die Fenster der Klarheit', diff: 4, work: 'Fenster putzen', reward: '10 Minuten aus dem sauberen Fenster schauen – mit Getränk', boss: 'Wer putzt, darf auch gucken. Das ist Gesetz.' },
  { id: 'balkon', icon: '☀️', title: 'Der Balkon der Ruhe', diff: 2, work: 'Balkon fegen und Pflanzen gießen', reward: '20 Minuten Sonne und ein Getränk auf dem Balkon', boss: 'Die Pflanzen haben Wasser. Jetzt bist du dran.' },
  { id: 'kuehlschrank', icon: '🍝', title: 'Der Kühlschrank der Wahrheit', diff: 4, work: 'Kühlschrank ausmisten', reward: 'Etwas Leckeres kochen – oder bestellen. Beides zählt.', boss: 'Was da hinten wächst, wollen wir nicht wissen. Danach: Festmahl.' },
  { id: 'papier', icon: '✏️', title: 'Die Papierschlacht', diff: 5, work: '20 Minuten Papierkram', reward: 'Etwas Kreatives: kritzeln, Tagebuch, basteln', boss: 'Zwanzig Minuten. Dann gehört das Papier wieder der Kunst.' },
  { id: 'schrank', icon: '👗', title: 'Das Kleiderschrank-Orakel', diff: 4, work: 'Kleiderschrank aussortieren', reward: 'Das Lieblingsoutfit anziehen und auf einen Kaffee raus', boss: 'Das Orakel spricht: Du siehst heute gut aus.' },
];
// Recurring chores (Haushalt): one-tap templates — rhythm (every N days or weekdays, 0 = Sunday) and a fitting reward
export const CHORE_TEMPLATES = [
  { icon: '🧺', name: 'Wäsche waschen', every: 3, reward: 'Füße hoch in frischen Kuschelsocken' },
  { icon: '🛁', name: 'Bad putzen', every: 7, reward: 'Ein extra schönes Bad – mit Snacks und Serie oder Hörbuch', tools: ['music'] },
  { icon: '🍳', name: 'Kochen', every: 1, reward: null, tools: ['recipes'] },
  { icon: '🛏️', name: 'Bettwäsche wechseln', every: 14, reward: 'Heute früh ins frische Bett – mit Buch und Tee, Handy bleibt draußen' },
  { icon: '🧹', name: 'Staubsaugen', every: 7, reward: 'Film-Nest im frisch gesaugten Wohnzimmer', tools: ['music'] },
  { icon: '🍽️', name: 'Küche aufräumen', every: 2, reward: 'Kaffee und etwas Süßes am sauberen Tisch – in Ruhe' },
  { icon: '🛒', name: 'Wocheneinkauf', week: [6], reward: 'Eine Sache nur für dich: Blumen, Lieblingssnack, irgendwas Schönes', tools: ['list'] },
  { icon: '🪴', name: 'Pflanzen gießen', every: 3, reward: '20 Minuten Sonne und ein Getränk auf dem Balkon' },
  { icon: '🗑️', name: 'Müll rausbringen', week: [1, 4], reward: null },
  { icon: '🧊', name: 'Kühlschrank ausmisten', every: 14, reward: 'Etwas Leckeres kochen – oder bestellen. Beides zählt.' },
  { icon: '🪟', name: 'Fenster putzen', every: 30, reward: '10 Minuten aus dem sauberen Fenster schauen – mit Getränk' },
  { icon: '🧽', name: 'Staub wischen', every: 10, reward: 'Eine Folge deiner Lieblingsserie – ohne Handy daneben' },
];
export const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];   // Mo … So
// A typical week to start from (adopted with one tap, every day stays changeable): at most three things a day, Sunday free
export const EXAMPLE_WEEK = [
  { name: 'Wäsche waschen', week: [1, 4] }, { name: 'Pflanzen gießen', week: [1, 4] }, { name: 'Kochen', week: [1, 2, 3, 4] },
  { name: 'Staubsaugen', week: [2] }, { name: 'Müll rausbringen', week: [2] }, { name: 'Küche aufräumen', week: [3] },
  { name: 'Wocheneinkauf', week: [5] }, { name: 'Bad putzen', week: [6] }, { name: 'Bettwäsche wechseln', every: 14 },
];
// Helpers a chore can have (any chore, several at once). Only the shopping list travels along when a chore is handed over.
export const TOOLS = { list: ['🛒', 'Einkaufsliste'], recipes: ['📖', 'Kochbuch'], music: ['🎵', 'Musik'] };
// How it felt: after every tick, one tap (or none)
export const MOODS = ['😫', '😕', '😐', '🙂', '😄'];
export const MOOD_WORDS = ['richtig zäh', 'eher zäh', 'okay', 'gut', 'richtig gut'];
export const EXAMPLE_RECIPES = [
  { title: 'Spaghetti Aglio e Olio', ingredients: ['Spaghetti', 'Knoblauch', 'Olivenöl', 'Chili', 'Petersilie', 'Parmesan'], steps: 'Nudeln kochen. Knoblauch in Scheiben mit Chili in viel Öl langsam goldig werden lassen. Nudeln mit etwas Nudelwasser in die Pfanne, schwenken, Petersilie und Parmesan drüber.' },
  { title: 'Ofengemüse mit Feta', ingredients: ['Kartoffeln', 'Paprika', 'Zucchini', 'Rote Zwiebel', 'Feta', 'Olivenöl', 'Rosmarin'], steps: 'Alles in Stücke, mit Öl, Salz und Rosmarin aufs Blech. 35 Min. bei 200 °C. Feta zerbröseln, die letzten 10 Minuten mit rein.' },
];
export const COMBO_REWARD_STARS = 2;
export const CHORE_REWARDS = [...new Set(COMBOS.map(c => c.reward).concat(['Ein Kapitel im Lieblingsbuch – mit Tee', 'Lieblingsessen bestellen – kein Kochen heute', 'Ein warmes Fußbad', 'Eine Runde Kuscheln']))]; // + the 1 star part 1 gets as a normal task = 3 in total

// Cozy recipes: the app does the thinking. Each setup step earns 1 star, enjoying it at the end +2.
export const RECIPES = [
  { id: 'leseecke', icon: '📚', title: 'Leseecke-Abend', time: '45 Min.', prep: 'nook',
    steps: ['Buch bereitlegen', 'Decke und Kissen in die Leseecke', 'Lieblingsgetränk machen', 'Licht gemütlich: Lampe, Lichterkette oder Kerze', 'Ruhige Musik an (oder Stille)', 'Handy in einen anderen Raum'],
    mini: ['Getränk machen', '10 Seiten lesen'] },
  { id: 'tee', icon: '🫖', title: 'Tee-Pause am Fenster', time: '15 Min.', prep: 'kiste',
    steps: ['Wasser aufsetzen', 'Lieblingstee oder Kakao aus der Kuschelkiste', 'Die schöne Tasse nehmen', 'Fensterplatz oder Balkon', '10 Minuten nur trinken und gucken'],
    mini: ['Tee machen', '2 Minuten aus dem Fenster schauen'] },
  { id: 'bad', icon: '🛁', title: 'Badewannen-Abend', time: '45 Min.', prep: 'kiste',
    steps: ['Wanne einlassen', 'Badezusatz oder Duftöl rein', 'Musik, Hörbuch oder Podcast an', 'Handtuch auf die Heizung', 'Kerze an, großes Licht aus'],
    mini: ['Heiße Dusche', 'Danach die gute Creme'] },
  { id: 'musik', icon: '🎧', title: 'Musik & Decke', time: '20 Min.', prep: 'playlist',
    steps: ['Wohlfühl-Playlist starten', 'Decke holen', 'Getränk daneben stellen', 'Hinlegen oder einkuscheln', 'Augen zu für drei Lieder'],
    mini: ['Ein Lieblingslied', 'Augen zu'] },
  { id: 'film', icon: '🎬', title: 'Film-Nest', time: '2 Std.', prep: 'filme',
    steps: ['Film von der Film-Liste aussuchen', 'Snack auf einen Teller', 'Decke und Kissen aufs Sofa', 'Licht dimmen', 'Handy weg – Film ab'],
    mini: ['Eine Folge statt Film', 'Decke'] },
  { id: 'draussen', icon: '🌿', title: 'Draußen-Pause', time: '30 Min.', prep: null,
    steps: ['Jacke an', 'Getränk zum Mitnehmen', 'Lieblingsrunde oder Lieblingsbank', 'Musik oder Podcast – oder einfach Vögel'],
    mini: ['5 Minuten auf den Balkon oder vor die Tür'] },
];

// Prep quests for days with energy: they make the recipes cost almost nothing later.
export const PREPS = [
  { id: 'kiste', icon: '🧺', title: 'Kuschelkiste packen', text: 'Eine Kiste oder ein Korb mit allem, was es gemütlich macht. Später nur noch zugreifen.',
    steps: ['Kiste oder Korb aussuchen', 'Lieblingstee oder Kakao rein', 'Ein Snack, der nicht schlecht wird', 'Kerze oder Lichterkette', 'Gesichtsmaske oder gute Creme', 'Kuschelsocken'] },
  { id: 'nook', icon: '🛋️', title: 'Leseecke bauen', text: 'Einmal einrichten, immer wieder benutzen.',
    steps: ['Platz aussuchen', 'Sessel oder viele Kissen', 'Lampe mit warmem Licht', 'Decke, die dort wohnt', 'Kleiner Platz für die Tasse', 'Ein Stapel Bücher, auf die du Lust hast'] },
  { id: 'playlist', icon: '🎶', title: 'Wohlfühl-Playlist machen', text: 'Zehn Lieder, bei denen du ruhiger wirst.',
    steps: ['Playlist anlegen', 'Die ersten 5 Lieder', 'Die nächsten 5 Lieder', 'Einen schönen Namen geben'] },
  { id: 'filme', icon: '📝', title: 'Film-Liste anlegen', text: 'Damit man am Abend nicht erst 40 Minuten sucht.',
    steps: ['3 Filme notieren, auf die du Lust hast', '2 Serien zum Weiterschauen', 'Liste irgendwo hin, wo du sie findest'] },
];

export const REWARDS = {
  klein: ['Kaffee oder Tee in der Lieblingstasse – ganz in Ruhe', 'Ein Stück richtig gute Schokolade, ganz bewusst', 'Dein Lieblingslied, laut', 'Hände eincremen mit der guten Creme', '10 Minuten Sonne auf dem Balkon', 'Duftkerze anzünden', 'Einer Freundin was Liebes schreiben', 'Eine Runde Kuscheln', 'Frische Blumen in eine Vase', 'Ein warmes Fußbad', 'Ein Kapitel im Lieblingsbuch', 'Fünf Minuten nur lüften und atmen', 'Ein Lieblingsfoto anschauen und schmunzeln'],
  mittel: ['Bad + Serie', 'Lieblingsessen bestellen – kein Kochen heute', 'Filmabend im Film-Nest', 'Gesichtsmaske-Abend', 'Ein neues Buch anfangen', 'Spaziergang zu deinem Lieblingsort', 'Etwas backen – nur für dich', 'Nägel machen', 'Hörbuch-Abend mit Decke', 'Kakao mit Sahne und Marshmallows', 'Abends früh ins Bett mit Buch', 'Eis essen gehen'],
  gross: ['Ein Ausflug, nur zum Spaß', 'Eine Massage buchen', 'Frühstück im Café', 'Ein neues Buch kaufen', 'Einen Blumenstrauß für dich selbst', 'Kino', 'Ein Tag in der Therme', 'Ein Tagesausflug irgendwohin, wo es schön ist', 'Karten für ein Konzert', 'Das Teil, das du schon ewig willst', 'Friseur oder Pflegetermin nur für dich', 'Ein ganzer freier Tag ohne Plan'],
};
export const REWARD_SIZES = [['klein', 'Klein · 5–15 Min.'], ['mittel', 'Mittel · ein Abend'], ['gross', 'Groß · was Besonderes']];

export const STAGES = ['Samenkorn', 'Keimling', 'Sämling', 'Wächst', 'Kleiner Busch', 'Vorblüte', 'Blüte', 'Erntereif'];

const S1 = ['Couch', 'Feierabend', 'Sofa', 'Gute Nudel', 'Kuscheldecken', 'Tee-Time', 'Pausen', 'Sonntags', 'Leseecken', 'Nickerchen', 'Wolkenguck', 'Badewannen', 'Liegenlass', 'Fensterplatz'];
const S2 = ['Kush', 'Haze', 'Skunk', 'OG', 'Diesel', 'Dream', 'Purple', 'Cookies', 'Gelato', 'Lemon', 'Cheese', 'Widow'];
export function strainName(n) { // deterministic per harvest number
  const a = S1[(n * 7 + 3) % S1.length], b = S2[(n * 5 + 1) % S2.length];
  return a + ' ' + b;
}

export const DAYNAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const DAYSHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// The rank (like League of Legends): climbs with ALL stars ever collected (S.earned) — spending never costs a rank.
// Iron to Diamond have four divisions (IV → I), Master and up are single steps. About 50 stars a week:
// Bronze after a week, Gold after ~2 months, Diamond after ~9 months, Challenger after 2+ years.
export const RANKS = [
  { name: 'Eisen', color: '#8a8d96', dark: '#4b4e57', from: 0 },
  { name: 'Bronze', color: '#c27c4e', dark: '#6e3f22', from: 50 },
  { name: 'Silber', color: '#c9d3dc', dark: '#6b7785', from: 150 },
  { name: 'Gold', color: '#f0c34a', dark: '#9a6b10', from: 350 },
  { name: 'Platin', color: '#57d0bd', dark: '#1d6f66', from: 700 },
  { name: 'Smaragd', color: '#3ccf7e', dark: '#12673b', from: 1200 },
  { name: 'Diamant', color: '#7fb6ff', dark: '#2a4f9a', from: 2000 },
  { name: 'Meister', color: '#c27cff', dark: '#5d2393', from: 3200, single: true },
  { name: 'Großmeister', color: '#ff5d6c', dark: '#8f1d2a', from: 4500, single: true },
  { name: 'Herausforderer', color: '#ffe17a', dark: '#2f6fd1', from: 6000, single: true },
];
const DIVS = ['IV', 'III', 'II', 'I'];
export function rankOf(total) { // → {t (tier index), tier, div, step (0… over all), name, from, to (next step's start, null at the top)}
  const n = Math.max(0, total || 0);
  let t = RANKS.length - 1; while (t > 0 && n < RANKS[t].from) t--;
  const R = RANKS[t], end = RANKS[t + 1] ? RANKS[t + 1].from : null;
  let d = 0, from = R.from, to = end;
  if (!R.single && end) { const w = (end - R.from) / 4; d = Math.min(3, Math.floor((n - R.from) / w)); from = Math.round(R.from + d * w); to = d < 3 ? Math.round(R.from + (d + 1) * w) : end; }
  const step = RANKS.slice(0, t).reduce((a, r) => a + (r.single ? 1 : 4), 0) + d;
  return { t, tier: R, div: R.single ? '' : DIVS[d], step, name: R.name + '-Nudel' + (R.single ? '' : ' ' + DIVS[d]), from, to };
}

export const PRAISE = ['Gut gemacht!', 'Erledigt!', 'Abgehakt!', 'Stark!', 'Weg damit!', 'Eins weniger!', 'Läuft!'];
