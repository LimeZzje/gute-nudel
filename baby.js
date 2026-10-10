// 🍼 Babyerstausstattung (event, 2026-10-10): one shared checklist for both of you until 10 January 2027.
// Every tick (by either of you) = +1 ⭐ for BOTH; untick = the star goes back. All ticked → the event ends and its
// fun statistics move to Home → "Vergangene Events". Deadline reached first → it just vanishes.
// List from the artifact "Babyerstausstattung Einkaufsliste" minus 5 things for later (Steckdosen-/Ecken-/Fenstersicherung,
// Kuscheltier/Spielbogen, Stillsessel). Each phone posts its own ticks (post → baby: {id: [on, ts]}); the newest wins.

export const ID = 'baby';
export const TITLE = 'Babyerstausstattung';
export const END = new Date(2027, 0, 10, 0, 0, 0).getTime();   // 10 January, midnight (local time)

export const GROUPS = [
  { id: 'ikea', title: 'IKEA', icon: '🛋️', tone: 'ikea', where: 'Möbel, Schlafen, Baden, Aufbewahrung',
    tip: 'Vorher in der IKEA-App den Bestand eurer Filiale prüfen. Große Möbel holt ihr im Lager ab, die Regalnummer steht in der App.',
    items: [
      ['bett', 'Babybett', 'Zum Beispiel SNIGLAR oder ein anderes Modell, 60 × 120 cm. Auf EN 716 achten.'],
      ['matratze', 'Babymatratze', 'Exakt passend zum Bett, ohne Lücke zur Wand.'],
      ['bettwaesche', 'Spannbettlaken für das Babybett', '2 bis 3 Stück zum Wechseln. Kein Kissen, keine Decke, kein Nestchen.'],
      ['schlafsack-winter', 'Babyschlafsack', 'IKEA führt Schlafsäcke (z. B. LEN). Auf den TOG-Wert achten: für Januar etwa 2,5 TOG. Gibt es keinen warmen, siehe „Gut schlafen“.'],
      ['wickelkommode', 'Wickelkommode oder Wickelauflage', 'Wickelauflage reicht, wenn eine stabile Kommode da ist.'],
      ['aufbewahrung', 'Körbe, Boxen oder Behälter', 'Für Windeln, Cremes und Wäsche, z. B. TROFAST oder Behälter für den Wickeltisch.'],
      ['badewanne', 'Babybadewanne', 'Zum Beispiel LÄTTSAM. Einen Ständer gibt es nicht immer dazu.'],
      ['waschlappen', 'Kapuzenhandtücher und Waschlappen', 'Je 2 bis 3 Stück, falls in eurer Filiale vorhanden.'],
      ['nachtlicht', 'Nachtlicht', 'Warmes, gedimmtes Licht für nächtliches Wickeln und Stillen.'],
    ] },
  { id: 'wagen', title: 'Autositz und Kinderwagen', icon: '🚼', tone: 'sky', where: 'Unbedingt im Fachhandel ausprobieren',
    items: [
      ['babyschale', 'Babyschale mit Basis', 'Pflicht für die Heimfahrt aus der Klinik. Norm ECE R129 (i-Size). Nicht gebraucht kaufen.', ['BabyOne', 'Babyfachmarkt vor Ort', 'Testberichte von ADAC und Stiftung Warentest']],
      ['kinderwagen', 'Kinderwagen mit Babywanne', 'Probeschieben, Klappen und Kofferraum testen.', ['BabyOne', 'Kleinanzeigen (gebraucht)', 'babymarkt.de']],
      ['adapter', 'Adapter für die Babyschale', 'Nur, wenn Schale und Wagen kombiniert werden.', ['Gleicher Händler wie Kinderwagen']],
      ['fussack-winter', 'Winterfußsack für den Kinderwagen', 'Für Januar wichtig, gefüttert und wasserabweisend.', ['BabyOne', 'Kleinanzeigen', 'Online']],
      ['regenschutz', 'Regenschutz', 'Passend zum Modell.', ['Hersteller des Kinderwagens', 'Online']],
      ['babytrage', 'Babytrage oder Tragetuch', 'Vorher beraten lassen.', ['Trageberatung oder Tragetuch-Laden', 'Kleinanzeigen', 'Vinted']],
    ] },
  { id: 'kleidung', title: 'Kuschelige Winterkleidung', icon: '🧸', tone: 'rose', where: 'Gebraucht ist hier oft wie neu',
    items: [
      ['bodys', 'Bodys, langarm, Größe 50 bis 62', 'Etwa 8 Stück. Lieber Schichten als dicke Kleidung.', ['Kinderbasar / Flohmarkt', 'Vinted', 'H&M', "Ernsting's Family"]],
      ['strampler', 'Strampler und Schlafanzüge mit Füßen', '6 bis 8 Stück.', ['Vinted', 'Kinderbasar', 'C&A', 'H&M']],
      ['schneeanzug', 'Winteroverall', 'Nur draußen und im Kinderwagen. In der Babyschale keine dicken Jacken, sonst sitzt der Gurt zu locker.', ['Vinted', 'Kleinanzeigen', 'Babyfachmarkt']],
      ['muetzen', 'Mützen, dünn und warm', 'Baumwolle für drinnen, Wolle oder Fleece für draußen.', ['Vinted', 'dm', 'H&M']],
      ['handschuhe', 'Fäustlinge', 'Ohne Daumen, mit Bündchen.', ['H&M', "Ernsting's Family"]],
      ['socken', 'Socken und Wollsocken', 'Einige Paare.', ['dm', 'Rossmann', "Ernsting's Family"]],
      ['jacke', 'Wolljacke oder Fleecejacke', 'Als Zwischenschicht. Eher eine Nummer größer.', ['Vinted', 'Kinderbasar']],
    ] },
  { id: 'schlafen', title: 'Gut schlafen', icon: '🌙', tone: 'lilac', where: 'Falls IKEA keinen warmen Schlafsack hat',
    items: [
      ['schlafsack-sommer', 'Zweiter Schlafsack zum Wechseln', 'Gleicher TOG-Wert. Ein Schlafsack ist schnell vollgespuckt.', ['Babyfachmarkt', 'dm', 'Vinted']],
      ['thermometer-raum', 'Raumthermometer', 'Schlafzimmer etwa 16 bis 18 °C.', ['dm', 'Rossmann', 'Baumarkt']],
      ['babyphone', 'Babyphone', 'Ein einfaches Audio-Gerät reicht oft.', ['Elektronikmarkt', 'Online', 'Kleinanzeigen']],
    ] },
  { id: 'pflege', title: 'Wickeln und Pflege', icon: '💧', tone: 'mint', where: 'Drogerie, die Eigenmarken sind gut und günstig',
    items: [
      ['windeln', 'Windeln Größe 1', 'Nicht zu viel auf Vorrat, Babys wachsen schnell.', ['dm (babylove)', 'Rossmann (Babydream)', 'Supermarkt']],
      ['feuchttuecher', 'Feuchttücher, parfümfrei', 'Für unterwegs. Zu Hause reichen Waschlappen und Wasser.', ['dm', 'Rossmann']],
      ['babycreme', 'Wundschutzcreme', 'Eine Tube reicht für den Anfang.', ['dm', 'Rossmann', 'Apotheke']],
      ['muell', 'Mullwindeln und Spucktücher', '8 bis 10 Stück, vielseitig einsetzbar.', ['dm', 'Rossmann', 'Babyfachmarkt']],
      ['wickeltasche', 'Wickeltasche mit Unterlage', 'Ein normaler Rucksack tut es auch.', ['Babyfachmarkt', 'Vinted', 'Online']],
      ['nagelset', 'Babynagelschere oder Feile', 'Mit abgerundeten Spitzen.', ['dm', 'Rossmann']],
      ['nasensauger', 'Nasensauger', 'Im Winter sehr hilfreich.', ['Apotheke', 'dm']],
      ['fieber', 'Digitales Fieberthermometer', 'Bei Babys wird rektal gemessen.', ['Apotheke', 'dm', 'Rossmann']],
      ['badethermometer', 'Badethermometer', 'Badewasser etwa 37 °C.', ['dm', 'Rossmann']],
      ['badezusatz', 'Mildes Babywaschgel', 'Für den Anfang reicht klares Wasser.', ['dm', 'Rossmann']],
    ] },
  { id: 'stillen', title: 'Stillen und Füttern', icon: '🍼', tone: 'peach', where: 'Am besten mit der Hebamme abstimmen',
    items: [
      ['stillbh', 'Still-BHs und Stilleinlagen', '2 bis 3 BHs, eine Packung Einlagen.', ['dm', 'Rossmann', 'H&M']],
      ['brustwarzencreme', 'Brustwarzensalbe (Lanolin)', '', ['dm', 'Rossmann', 'Apotheke']],
      ['stillkissen', 'Stillkissen', 'Auch zum Abstützen in der Schwangerschaft.', ['dm', 'Babyfachmarkt', 'Vinted']],
      ['flaschen', '2 bis 4 Fläschchen', 'Auch beim Stillen gut für Notfälle.', ['dm', 'Rossmann']],
      ['schnuller', 'Schnuller, 2 Stück', 'Größe 0 bis 6 Monate.', ['dm', 'Rossmann']],
      ['sterilisator', 'Vaporisator', 'Optional. Auskochen im Topf geht auch.', ['dm', 'Elektronikmarkt', 'Kleinanzeigen']],
      ['milchpumpe', 'Milchpumpe', 'Nur bei Bedarf. Eine Leihpumpe gibt es mit Rezept aus der Apotheke.', ['Apotheke (Leihpumpe auf Rezept)']],
    ] },
  { id: 'bereit', title: 'Kliniktasche und Formalitäten', icon: '💛', tone: 'butter', where: 'Nicht zum Kaufen – aber zum Bereitsein',
    items: [
      ['kliniktasche', 'Kliniktasche packen', 'Ab etwa der 36. Woche bereitstellen. Inklusive Erstlings-Outfit, Mütze und Overall für die Heimfahrt.'],
      ['mutterpass', 'Mutterpass, Krankenkassenkarte und Ausweis', 'Griffbereit in der Tasche.'],
      ['geburtsurkunde', 'Geburtsurkunde', 'Beim Standesamt. Viele Kliniken übernehmen die Anmeldung.'],
      ['kindergeld', 'Kindergeld und Elterngeld', 'Kindergeld bei der Familienkasse, Elterngeld bei der Elterngeldstelle eures Bundeslandes.'],
    ] },
].map(g => ({ ...g, items: g.items.map(([id, name, note, shops]) => ({ id, name, note, shops: shops || [] })) }));

export const ITEMS = GROUPS.flatMap(g => g.items.map(it => ({ ...it, group: g.id })));

// the shared state of one item: the newest action of either phone wins → [on 0|1, ts] or null
export function state(mine, theirs, id) {
  const a = (mine || {})[id], b = (theirs || {})[id];
  if (!a) return b || null; if (!b) return a;
  return b[1] > a[1] ? b : a;
}
// own actions of two devices of the same person: per item the newer one
export function mergeMine(a, b) {
  const m = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) if (!m[k] || v[1] > m[k][1]) m[k] = v;
  return m;
}

// "noch 91 Tage, 4 Std …" pieces
export function left(now = Date.now()) {
  let s = Math.max(0, Math.floor((END - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return { d, h, m, s };
}

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], MON = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const fmtDay = t => { const d = new Date(t); return DAYS[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()]; };
const dayKey = t => { const d = new Date(t - 3 * 3600e3); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };

// the fun statistics kept on Home once everything is ticked (only shared numbers, never who ticked what)
export function record(ticks) {   // ticks: {id: ts} of every item
  const ts = ITEMS.map(it => ({ it, t: ticks[it.id] })).sort((a, b) => a.t - b.t);
  const first = ts[0], last = ts[ts.length - 1], days = Math.max(1, Math.round((last.t - first.t) / 864e5) + 1);
  const per = {}; ts.forEach(x => { const k = dayKey(x.t); (per[k] = per[k] || []).push(x); });
  const big = Object.values(per).sort((a, b) => b.length - a.length)[0];
  const groupDone = GROUPS.map(g => ({ g, t: Math.max(...g.items.map(it => ticks[it.id])) })).sort((a, b) => a.t - b.t)[0];
  const night = ts.filter(x => { const h = new Date(x.t).getHours(); return h >= 22 || h < 5; }).length;
  const early = Math.floor((END - last.t) / 864e5);
  const lines = [
    ['🍼', `Alle ${ITEMS.length} Sachen bereit – ${early > 1 ? early + ' Tage' : early === 1 ? 'einen Tag' : 'Stunden'} vor dem 10. Januar.`],
    ['⭐', `${ITEMS.length} Sterne für jeden von euch – zusammen ${ITEMS.length * 2}.`],
    ['📅', days === 1 ? 'Alles an einem einzigen Tag. Wow.' : `Geschafft in ${days} Tagen, vom ${fmtDay(first.t)} bis ${fmtDay(last.t)}.`],
  ];
  if (big.length >= 3 && days > 1) lines.push(['🛍️', `Größter Tag: ${fmtDay(big[0].t)} mit ${big.length} Haken.`]);
  lines.push([groupDone.g.icon, `Als Erstes komplett: ${groupDone.g.title}.`]);
  lines.push(['🥇', `Der allererste Haken: ${first.it.name}.`]);
  lines.push(['🏁', `Der letzte Haken: ${last.it.name}.`]);
  if (night) lines.push(['🌙', `${night} Haken nach 22 Uhr. Nachteulen-Nestbau.`]);
  return { id: ID, icon: '🍼', title: TITLE, done: last.t, lines };
}
