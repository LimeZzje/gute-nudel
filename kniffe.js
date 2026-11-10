// 💡 EVENT: KNIFFlicheNudel (user 2026-11-10, card G22) — less housework through better ways of doing it. Content =
// E:/GuteNudel/KNIFFE_ENTWURF.md, approved by Stefan as written ("go for it").
// Part 1: a one-time setup tick list (🛒 onto the shopping list for things to buy). Then: every routine that lands on
// Heute carries its next untested Kniff as a 💡 chip; ticking the chore asks "Behalten / Nö / Diesmal nicht". A verdict
// = +2 ⭐ (only on the phone that judged it; the daily task cap is not touched). Kept Kniffe stay on the chore as a 💡
// helper for good, dropped ones vanish. Both phones share the verdicts (newest per Kniff wins, like the baby ticks).
// End: every one of the ten routines has a verdict → party + record (team numbers only), or quietly on 21 Dec 2026.
// Afterwards the untested ones stay readable under 💡 (no stars). Pregnancy-safe: no chlorine, nothing heavy.
export const ID = 'kniffe-2026';
export const TITLE = 'KNIFFlicheNudel';
export const STARS = 2;
export const START = new Date(2026, 10, 10, 0, 0, 0).getTime();
export const END = new Date(2026, 11, 21, 0, 0, 0).getTime();   // before Christmas and the baby weeks

// the ten routines: matched to her chores by name (first hit wins: Bettwäsche before Wäsche, Kochen after Küche)
export const ROUTINES = [
  { k: 'L', icon: '🛏️', name: 'Bettwäsche wechseln', re: /bett/ },
  { k: 'W', icon: '🧺', name: 'Wäsche waschen', re: /wäsch|waesch|wasch/ },
  { k: 'B', icon: '🛁', name: 'Bad putzen', re: /\bbad|badez|wc\b|klo/ },
  { k: 'K', icon: '🍽️', name: 'Küche aufräumen', re: /küche|kueche|spül|abwasch/ },
  { k: 'C', icon: '🍳', name: 'Kochen', re: /koch/ },
  { k: 'R', icon: '🧹', name: 'Robobob', re: /robo|saug/ },
  { k: 'M', icon: '🗑️', name: 'Müll rausbringen', re: /müll|muell|abfall/ },
  { k: 'Q', icon: '🛒', name: 'Wocheneinkauf', re: /einkauf/ },
  { k: 'P', icon: '🪴', name: 'Pflanzen gießen', re: /pflanz|gieß|giess/ },
  { k: 'H', icon: '🐩', name: 'Hundi pflegen', re: /hund/ },
];
export const routineOf = name => { const n = String(name || '').toLowerCase(); const r = ROUTINES.find(x => x.re.test(n)); return r ? r.k : null; };

// Teil 1: einmal einrichten. buy = what goes onto the shopping list with 🛒 (no amount)
export const SETUP = [
  { id: 'E1', t: 'Abzieher in die Dusche hängen', x: 'Haken innen an die Wand, damit er in Griffweite ist.', buy: 'Duschabzieher + Haken' },
  { id: 'E2', t: 'Zitronensäure-Spray, eine Flasche pro Bad', x: 'Gegen Kalk. Nur kalt benutzen, nicht auf Naturstein.', buy: 'Zitronensäure-Spray (2×)' },
  { id: 'E3', t: 'Putz-Set pro Bad', x: 'Spray, zwei Tücher, WC-Reiniger. In jedem Bad ein eigenes, nichts wird getragen.', buy: 'WC-Reiniger + Badspray fürs zweite Bad' },
  { id: 'E4', t: 'Mikrofasertücher in zwei Farben', x: 'Eine Farbe fürs Bad, eine für die Küche. Ein Stapel in jedem Raum.', buy: 'Mikrofasertücher (2 Farben)' },
  { id: 'E5', t: 'Wäschesammler mit zwei Fächern', x: 'Hell und dunkel werden schon beim Ausziehen getrennt.', buy: 'Wäschesammler mit 2 Fächern' },
  { id: 'E6', t: 'Wäsche-Rucksack oder Tragetasche mit Schultergurt', x: 'Für die Kellertreppe: Hände frei fürs Geländer.', buy: 'Wäschetasche mit Schultergurt' },
  { id: 'E7', t: 'Klapptisch oder Brett am Trockner', x: 'Zum Falten direkt im Keller.', buy: 'Klapptisch für den Keller' },
  { id: 'E8', t: 'Ein Korb pro Zimmer im Keller', x: 'Gefaltetes kommt gleich in den Korb des Zimmers, in das es gehört.', buy: 'Wäschekörbe (einer pro Zimmer)' },
  { id: 'E9', t: 'Waschmittel-Vorrat im Keller', x: 'Nie mehr umsonst runterlaufen.', buy: 'Waschmittel' },
  { id: 'E10', t: 'Robobob-Fahrplan fest einstellen', x: 'Er startet von selbst, wenn niemand im Weg ist.' },
  { id: 'E11', t: 'Fußmatte + Pfotentuch an die Tür', x: 'Der Dreck bleibt im Flur.', buy: 'Fußmatte + Pfotentuch' },
  { id: 'E12', t: 'Waschbare Decke für Sofa und Bett', x: 'Die Hundedecke geht in die Maschine, das Sofa bleibt sauber.', buy: 'Waschbare Hundedecke' },
  { id: 'E13', t: 'Zweiter Bettwäsche-Satz griffbereit', x: 'Abziehen und frisch beziehen in einem Gang.', buy: 'Bettwäsche-Garnitur' },
];

export const RULES = [
  ['Erst einwirken lassen, dann wischen.', 'Der Reiniger arbeitet, du machst solange etwas anderes.'],
  ['Maschine zuerst.', 'Was von selbst läuft (Waschmaschine, Spülmaschine, Robobob), wird als Erstes gestartet.'],
  ['Von oben nach unten, erst trocken, dann nass.', 'Der Boden kommt immer zuletzt.'],
  ['Werkzeug wohnt da, wo es gebraucht wird.', 'Lieber zwei Sets als ein Weg.'],
  ['Vorbeugen schlägt Putzen.', '30 Sekunden gleich sparen 20 Minuten später.'],
  ['Fertig ist erst, wenn es weggeräumt ist.', 'Wäsche im Korb ist noch nicht fertig.'],
  ['Kein Weg mit leeren Händen.', 'Wer ins Bad, in den Keller oder zur Tür geht, nimmt etwas mit.'],
  ['Bündeln.', 'Gleiche Wege und gleiche Handgriffe zusammenlegen, statt dreimal einzeln.'],
  ['Weniger rumstehen haben.', 'Freie Flächen sind in zehn Sekunden gewischt.'],
  ['Gut genug ist fertig.', 'Lieber seltener und entspannt als perfekt und erschöpft.'],
];

// die Kniffe, per routine in the order they come up
export const TRICKS = [
  { id: 'W1', r: 'W', t: 'Keller-Tag statt Keller-Wege', x: 'An einem Waschtag laufen zwei oder drei Maschinen hintereinander. Dafür seltener waschen.' },
  { id: 'W2', r: 'W', t: 'Jeder Gang runter ist auch ein Gang hoch', x: 'Nasse Wäsche in den Trockner, neue Maschine an, fertige Wäsche mit nach oben. Nie nur für eine Sache gehen.' },
  { id: 'W3', r: 'W', t: 'Handy-Wecker auf die Laufzeit', x: 'Kein Nachschauen, ob sie schon fertig ist.' },
  { id: 'W4', r: 'W', t: 'Im Keller falten, noch warm aus dem Trockner', x: 'Glatt gestrichen statt gebügelt, sortiert in die Zimmer-Körbe.' },
  { id: 'W5', r: 'W', t: 'Der Treppen-Gang ist abgebbar', x: 'Sortieren und Falten macht eine Person, Tragen übernimmt Hase (über „Abgeben“ in der App).' },
  { id: 'W6', r: 'W', t: 'Kleiner Sammler für „noch tragbar“', x: 'Was nur einmal an war, kommt nicht in die Wäsche.' },
  { id: 'B1', r: 'B', t: 'Erst alles einsprühen, dann reihum', x: 'Waschbecken, Armaturen, Dusche, WC einsprühen. Spiegel putzen, dann in derselben Reihenfolge abwischen. Nicht schrubben.' },
  { id: 'B2', r: 'B', t: 'Nach dem Duschen abziehen', x: 'Wände und Tür, 30 Sekunden. Der Kalk kommt gar nicht erst.' },
  { id: 'B3', r: 'B', t: 'Schiebetür-Schienen mit Zitronensäure', x: 'Einsprühen, zehn Minuten warten, mit einer alten Zahnbürste durch. Nur einmal im Monat.' },
  { id: 'B4', r: 'B', t: 'Armaturen trocken nachwischen', x: 'Ein trockenes Tuch nach dem Putzen, dann bleiben sie länger blank.' },
  { id: 'B5', r: 'B', t: 'Gäste-WC im Vorbeigehen', x: 'Das Set steht dort: zwei Minuten, wenn man sowieso drin ist, statt als eigener Termin.' },
  { id: 'B6', r: 'B', t: 'Wanne gleich nach dem Baden', x: 'Solange sie warm ist, reicht einmal mit der Brause und dem Tuch.' },
  { id: 'K1', r: 'K', t: 'Spülmaschine abends an, morgens aus', x: 'Fester Takt. Tagsüber ist sie leer und alles wandert direkt hinein.' },
  { id: 'K2', r: 'K', t: 'Nichts in die Spüle stellen', x: 'Entweder in die Maschine oder kurz abspülen. Die Spüle bleibt frei.' },
  { id: 'K3', r: 'K', t: 'Arbeitsfläche frei räumen', x: 'Was nicht täglich gebraucht wird, kommt in den Schrank. Wischen dauert zehn Sekunden.' },
  { id: 'K4', r: 'K', t: 'Ein Tuch, eine Runde', x: 'Von der saubersten Fläche zur schmutzigsten, Herd zuletzt, dann das Tuch in die Wäsche.' },
  { id: 'C1', r: 'C', t: 'Beim Kochen aufräumen', x: 'Wartezeiten (Wasser kocht, Ofen läuft) sind Aufräumzeiten.' },
  { id: 'C2', r: 'C', t: 'Abfallschüssel neben das Brett', x: 'Ein Gang zum Müll statt zehn.' },
  { id: 'C3', r: 'C', t: 'Erst alles herausstellen, dann anfangen', x: 'Kein Suchen mit fettigen Fingern.' },
  { id: 'C4', r: 'C', t: 'Doppelt kochen', x: 'Die zweite Portion ist das Essen für einen anderen Tag.' },
  { id: 'C5', r: 'C', t: 'Pfanne einweichen, sofort', x: 'Heißes Wasser hinein, solange sie warm ist. Nach dem Essen wischt sie sich fast von selbst.' },
  { id: 'R1', r: 'R', t: 'Abend-Runde: Boden frei', x: 'Zwei Minuten Kabel, Socken, Hundespielzeug hoch. Dann fährt er überall durch.' },
  { id: 'R2', r: 'R', t: 'Behälter leeren am Müll-Tag', x: 'Müll ist Mo+Fr, Robobob ist Mo+Fr. Ein Handgriff zusammen.' },
  { id: 'R3', r: 'R', t: 'Akkusauger nur für die Ecken', x: 'Krümel am Esstisch, Sofa, Treppe. Kein großer Saug-Tag mehr.' },
  { id: 'R4', r: 'R', t: 'Bürste einmal im Monat frei schneiden', x: 'Sonst saugt er jede Woche schlechter.' },
  { id: 'M1', r: 'M', t: 'Der Müll steht an der Tür', x: 'Wer als Nächstes rausgeht (Gassi!), nimmt ihn mit.' },
  { id: 'M2', r: 'M', t: 'Ersatzbeutel unten im Eimer', x: 'Der neue Beutel liegt schon da.' },
  { id: 'Q1', r: 'Q', t: 'Sofort auf die Liste', x: 'Was leer wird, kommt in dem Moment auf die Einkaufsliste, nicht erst am Einkaufstag.' },
  { id: 'Q2', r: 'Q', t: 'Beim Einräumen: Altes nach vorn', x: 'Weniger wird schlecht, der Kühlschrank mistet sich nebenbei aus.' },
  { id: 'Q3', r: 'Q', t: 'Gemüse gleich waschen und schneiden', x: 'Zehn Minuten nach dem Einkauf sparen an jedem Kochtag fünf.' },
  { id: 'L1', r: 'L', t: 'Am Waschtag abziehen', x: 'Die Bettwäsche geht mit dem ersten Keller-Gang runter.' },
  { id: 'L2', r: 'L', t: 'Der zweite Satz kommt sofort drauf', x: 'Abends wartet kein ungemachtes Bett.' },
  { id: 'L3', r: 'L', t: 'Garnitur im eigenen Kissenbezug aufbewahren', x: 'Ein Päckchen pro Satz, kein Suchen.' },
  { id: 'P1', r: 'P', t: 'Große Kanne, eine Runde', x: 'Feste Reihenfolge durch die Wohnung, einmal füllen.' },
  { id: 'P2', r: 'P', t: 'Fingerprobe statt Kalender', x: 'Erde noch feucht: überspringen. Weniger gießen ist meistens besser.' },
  { id: 'P3', r: 'P', t: 'Durstige Pflanzen zusammenstellen', x: 'Dann ist die Runde kürzer.' },
  { id: 'H1', r: 'H', t: 'Pflege-Kiste', x: 'Bürste, Kamm, Tücher, Leckerli an einem Ort.' },
  { id: 'H2', r: 'H', t: 'Kurz bürsten beim Kuscheln', x: 'Zwei Minuten abends verhindern Knoten. Der große Pflege-Tag wird kürzer.' },
  { id: 'H3', r: 'H', t: 'Pfoten an der Tür abwischen', x: 'Sofa, Bett und Teppiche bleiben länger sauber.' },
];
export const trick = id => TRICKS.find(x => x.id === id);
export const tricksOf = r => TRICKS.filter(x => x.r === r);

// the end record: team numbers only (never who judged what)
export function record(tested, kept, setup) {
  return { id: ID, icon: '💡', title: TITLE, done: Date.now(), lines: [
    ['💡', `${tested === 1 ? 'Ein Kniff' : tested + ' Kniffe'} zusammen ausprobiert.`],
    ['💚', kept ? `${kept === 1 ? 'Einer bleibt' : kept + ' bleiben'} – als 💡 bei euren Routinen.` : 'Ihr wisst jetzt, was ihr nicht braucht.'],
    ...(setup ? [['🧰', `${setup === 1 ? 'Eine Sache' : setup + ' Sachen'} einmal eingerichtet.`]] : []),
  ] };
}
