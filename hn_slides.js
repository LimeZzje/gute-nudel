// 🎬 "Hinter den Kulissen" (user 2026-10-18: the real architecture, PowerPoint-style, for her – in the Hello Nudel present).
// Each slide: title, a drawing (SVG, viewBox 0 0 300 170) and a few short points. Emoji stand in for small icons;
// the pigeon, phone and colours are the ones from the present's big picture (hellonudel.js + style.css .hn-*).
const T = (x, y, s, cls = 'sv-t', a = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${a}">${s}</text>`;
const E = (x, y, e, size = 26) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${e}</text>`;
const phone = (x, y, label) => `<g><rect x="${x - 20}" y="${y - 36}" width="40" height="72" rx="9" class="ph-case"/><rect x="${x - 15}" y="${y - 28}" width="30" height="56" rx="4" class="ph-screen"/>
  <path d="M${x} ${y + 18} c -3 -4 -8 -2 -7 2 c 1 2 7 6 7 6 c 0 0 6 -4 7 -6 c 1 -4 -4 -6 -7 -2z" class="ph-heart"/>${[-14, -4, 6].map(d => `<rect x="${x - 10}" y="${y + d}" width="20" height="4" rx="2" class="ph-line"/>`).join('')}${label ? T(x, y + 52, label) : ''}</g>`;
const server = (x, y, label) => `<g class="sv-srv">${[0, 1, 2].map(i => `<rect x="${x - 30}" y="${y - 30 + i * 20}" width="60" height="17" rx="4"/><circle cx="${x - 20}" cy="${y - 21.5 + i * 20}" r="2.6" class="sv-led"/><rect x="${x - 10}" y="${y - 23 + i * 20}" width="30" height="3" rx="1.5" class="sv-slot"/>`).join('')}${label ? T(x, y + 46, label) : ''}</g>`;
const bird = (x, y, s = .55) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-262 -210)"><path d="M226 214 l-20 -10 l5 17z" class="bd-tail"/><ellipse cx="252" cy="214" rx="28" ry="18" class="bd-body"/>
  <circle cx="280" cy="198" r="12" class="bd-body"/><path d="M291 196 l10 3 l-10 4z" class="bd-beak"/><circle cx="284" cy="195" r="2" class="bd-eye"/>
  <path d="M234 212 C 236 190, 258 186, 270 200 C 262 214, 248 218, 234 212z" class="bd-wing"/><path d="M248 231 l-3 9 M258 231 l2 9" class="bd-leg"/></g>`;
const arrow = (x1, y1, x2, y2, label, cls = '') => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = s => `${(x2 - 9 * Math.cos(a + s * .5)).toFixed(1)},${(y2 - 9 * Math.sin(a + s * .5)).toFixed(1)}`;
  return `<g class="sv-arrow ${cls}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon points="${x2},${y2} ${h(1)} ${h(-1)}"/>${label ? T((x1 + x2) / 2, (y1 + y2) / 2 - 8, label, 'sv-small') : ''}</g>`;
};
const cloud = (x, y, w = 80) => `<ellipse cx="${x}" cy="${y + 4}" rx="${w / 2}" ry="22" class="sv-cloud"/><circle cx="${x - w / 5}" cy="${y - 12}" r="16" class="sv-cloud"/><circle cx="${x + w / 8}" cy="${y - 18}" r="20" class="sv-cloud"/>`;
const brick = () => `<g class="sv-wall">${[0, 1, 2, 3].map(r => [0, 1].map(c => `<rect x="${137 + c * 15 - (r % 2) * 7}" y="${30 + r * 22}" width="14" height="20" rx="2"/>`).join('')).join('')}</g>`;

export const SLIDES = pn => [
  { t: 'Hinter den Kulissen', art: `${bird(150, 74, .95)}${E(66, 48, '⚙️', 30)}${E(236, 42, '✨', 24)}${E(240, 106, '🛒', 28)}${E(60, 108, '📱', 28)}${T(150, 152, 'So hat ' + pn + ' Hello Nudel gebaut', 'sv-t big')}`,
    p: ['Du kennst jetzt die Taube. Hier ist, was <b>wirklich</b> dahintersteckt – mit den echten Fachwörtern, aber so erklärt, dass es Spaß macht.', 'Wischen oder <b>Weiter ›</b> tippen.'] },
  { t: 'Die drei Mitspieler', art: `${phone(45, 66, 'Gute Nudel')}${cloud(150, 66)}${bird(152, 66, .48)}${T(150, 118, 'Die Taube')}${server(255, 66, 'Picnic')}${arrow(70, 66, 106, 66)}${arrow(194, 66, 222, 66)}`,
    p: ['<b>📱 Gute Nudel</b> – unsere App. Eigentlich eine Webseite, die bei <b>GitHub</b> wohnt (GitHub Pages) und sich auf deinem Handy wie eine App anfühlt.',
      '<b>🕊️ Die Taube</b> – ein winziges Programm, ein sogenannter <b>Worker</b>, das bei <b>Cloudflare</b> läuft. Cloudflare hat Rechenzentren auf der ganzen Welt.',
      '<b>🏢 Picnic</b> – Picnics große Computer, die <b>Server</b>. Dort wohnen alle Produkte, alle Preise – und dein Warenkorb.'] },
  { t: 'Wo dein Warenkorb wirklich wohnt', art: `${server(150, 74, '')}${E(150, 26, '🛒', 24)}${T(150, 124, 'Picnics Server')}${phone(40, 96, 'Picnic-App')}${phone(260, 96, 'Gute Nudel')}${arrow(64, 88, 114, 74, '', 'dash')}${arrow(236, 88, 186, 74, '', 'dash')}`,
    p: ['Der Warenkorb ist <b>nicht in der Picnic-App</b>. Er liegt auf Picnics Servern – die App ist nur ein Fenster, durch das man reinschaut.',
      'Darum kann auch ein zweites Fenster – Gute Nudel – Sachen hineinlegen. Öffnest du danach die Picnic-App, holt sie sich den Korb frisch vom Server, und alles ist da.',
      'Die Picnic-App muss dafür also gar nicht aufgehen. Sie sieht es beim nächsten Reinschauen.'] },
  { t: 'Wie Apps miteinander reden: die API', art: `${phone(36, 72, '')}${server(264, 72, '')}${arrow(60, 46, 228, 46)}${arrow(228, 96, 60, 96)}
      <rect x="96" y="22" width="108" height="18" rx="5" class="sv-note"/>${T(150, 35, 'suche: „Sahne“', 'sv-code')}
      <rect x="62" y="104" width="176" height="34" rx="5" class="sv-note"/>${T(150, 118, 'Weidesahne · 200 g · 1,19 €', 'sv-code')}${T(150, 132, 'Kochsahne · 250 g · 0,99 €', 'sv-code')}${T(150, 160, 'Anfrage ➜     ⬅ Antwort', 'sv-small')}`,
    p: ['Apps schicken sich übers Internet kleine Briefe: eine <b>Anfrage</b> („Such mir Sahne“) und eine <b>Antwort</b> (eine Liste mit Produkten). Geschrieben sind sie in <b>JSON</b> – einer ordentlichen Zettel-Sprache für Computer.',
      'Welche Briefe ein Server versteht, nennt man seine <b>API</b>. Picnic hat seine API nie veröffentlicht – aber Bastler haben herausgefunden, welche Briefe die Picnic-App schickt, und das offen aufgeschrieben (das Projekt <i>python-picnic-api</i>). Gute Nudel schickt genau dieselben Briefe.'] },
  { t: 'Die Schutzregel: CORS', art: `${phone(40, 66, 'Gute Nudel')}${server(260, 66, 'Picnic')}${brick()}${arrow(64, 66, 128, 66)}${T(150, 140, '403 – Verboten', 'sv-t warn')}`,
    p: ['Browser haben eine eingebaute Schutzregel namens <b>CORS</b>: Eine Webseite darf nicht einfach mit den Servern einer <b>anderen</b> Firma reden – außer die Firma erlaubt es ausdrücklich.',
      'Picnic erlaubt es nicht und antwortet mit <b>„403 – Verboten“</b>. Eigentlich gut so: Sonst könnte jede x-beliebige Webseite heimlich in deinem Namen einkaufen.',
      'Aber die Regel gilt nur für Webseiten im Browser. <b>Server</b> dürfen mit anderen Servern reden, so viel sie wollen. Und genau da kommt die Taube ins Spiel …'] },
  { t: 'Die Lösung: unsere Brieftaube', art: `${phone(40, 70, 'Gute Nudel')}${cloud(150, 66, 86)}${bird(152, 66, .5)}${T(150, 120, 'Cloudflare Worker')}${server(260, 70, 'Picnic')}${arrow(64, 70, 104, 68, '✓')}${arrow(196, 68, 228, 70, '✓')}`,
    p: [`${pn} hat bei Cloudflare ein kleines Programm hochgeladen – den <b>Worker</b>, rund 100 Zeilen Code. Für Picnic ist er ein Server, also gilt die Schutzregel für ihn nicht.`,
      'Gute Nudel darf mit der Taube reden, weil die Taube es erlaubt – aber <b>nur unserer App</b>: Die Adresse <i>limezzje.github.io</i> steht auf ihrer Gästeliste, andere Webseiten lässt sie nicht rein.',
      'Die Taube <b>speichert nichts</b>: Sie nimmt einen Brief, trägt ihn zu Picnic, bringt die Antwort zurück und vergisst beides sofort.'] },
  { t: 'Die Anmeldung', art: `${E(34, 56, '🔤', 26)}${T(34, 88, 'Passwort', 'sv-small')}${arrow(54, 56, 92, 56)}${E(116, 56, '🧬', 26)}${T(116, 88, 'Fingerabdruck', 'sv-small')}${arrow(140, 56, 200, 56)}${server(240, 60, '')}${arrow(214, 104, 104, 132, '', 'back')}${E(84, 136, '🔑', 24)}${T(150, 162, 'zurück kommt ein Anmelde-Schlüssel', 'sv-small')}`,
    p: ['Beim ersten Mal tippst du E-Mail und Passwort. Die Taube macht aus dem Passwort einen <b>Fingerabdruck</b> (so will es Picnic, das Verfahren heißt MD5) und schickt ihn weiter – alles über eine verschlüsselte Verbindung (<b>https</b>, das kleine Schloss im Browser).',
      'Picnic antwortet mit einem <b>Anmelde-Schlüssel</b>, Fachwort <b>Token</b>. Wie eine Hotel-Schlüsselkarte: Damit kommst du rein, ohne jedes Mal den Ausweis zu zeigen. Vielleicht kommt noch ein <b>SMS-Code</b> als zweites Schloss dazu.',
      `Den Schlüssel hebt nur <b>dein Handy</b> auf, im Speicher von Gute Nudel – er wird nicht mal mit ${pn} geteilt. Das Passwort wird nirgends gespeichert. „Von Picnic abmelden“ wirft den Schlüssel weg.`] },
  { t: 'Suchen, aussuchen, einlegen', art: `${phone(38, 70, '')}${E(96, 30, '🧅', 20)}${E(96, 70, '🥛', 20)}${E(96, 110, '🍅', 20)}${arrow(114, 56, 200, 56, '/search')}${server(246, 70, '')}${arrow(200, 96, 114, 96, '/add')}${T(150, 152, 'für jede Sache: suchen → du wählst → einlegen', 'sv-small')}`,
    p: ['Für jede Sache auf der Liste schickt Gute Nudel den Brief <b>„Suche Zwiebeln“</b> (an die Adresse <i>/search</i>). Picnic antwortet mit einem riesigen Datenberg – die Taube pickt nur Name, Größe, Preis und Bild heraus.',
      'Du tippst an, was passt. Bei „In den Warenkorb“ geht für jedes Produkt der Brief <b>„Leg Produkt Nr. … in den Korb“</b> los (<i>/add</i>) – mit deinem Schlüssel dabei, damit Picnic weiß, dass es dein Korb ist.',
      'Deine Wahl merkt sich dein Handy. Nächstes Mal ist bei „Sahne“ gleich deine Lieblingssahne ausgewählt.'] },
  { t: 'Das Kleingedruckte', art: `${E(56, 60, '💶', 34)}${T(56, 104, '0 € im Monat')}${E(150, 60, '🛠️', 34)}${T(150, 104, 'inoffiziell')}${E(244, 60, '🙋‍♀️', 34)}${T(244, 104, 'du bestellst')}`,
    p: ['<b>Kosten:</b> keine. Cloudflare lässt die Taube bis zu 100.000 Briefe am Tag gratis fliegen, und GitHub hostet die App gratis.',
      '<b>Inoffiziell:</b> Picnic hat das nicht für uns gebaut. Ändert Picnic seine Briefe, fliegt die Taube erst mal ins Leere – dann wird sie neu trainiert.',
      '<b>Kontrolle:</b> Gute Nudel kann nur Sachen in den Korb legen. Bestellen und bezahlen kannst nur du, in der Picnic-App.'] },
  { t: 'Gebaut an deinem Geburtstag', art: `${E(150, 46, '💛', 44)}${T(56, 108, '1 Taube', 'sv-t big')}${T(150, 108, '25 Tests', 'sv-t big')}${T(244, 108, '1 Tag', 'sv-t big')}${T(150, 146, '18. Oktober 2026', 'sv-small')}`,
    p: ['Eine Taube mit rund 100 Zeilen Code, eine Einkaufsliste, die jetzt bis vor eure Tür reicht, und 25 automatische Tests, die jedes Mal prüfen, dass alles noch klappt.',
      `Gebaut von ${pn} – mit ein bisschen Hilfe von Claude – für dich. Alles Liebe zum Geburtstag! 🎂`] },
];
