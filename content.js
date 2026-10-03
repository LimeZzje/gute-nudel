// All texts that make up the "game": rest quests, cozy recipes, prep quests, reward ideas, plant stages, strain names.
export const CAP = 10;          // tasks per day that earn stars; after that: "Genug für heute!"
export const PAGE_COST = 10;    // stars per photo book page
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

export const PRAISE = ['Gut gemacht!', 'Erledigt!', 'Abgehakt!', 'Stark!', 'Weg damit!', 'Eins weniger!', 'Läuft!'];
