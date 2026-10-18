// 🎁 GIFT: "Hello Nudel" (user 2026-10-18, her birthday) – our own HelloFresh: recipes → shopping list → Picnic cart in one tap.
// A wrapped present on Home; she unwraps it (S.hnOpen) and gets a drawn picture of how it works (in her words, no tech talk),
// then what she can do now and what it means for later. Until it's unwrapped, the 🧺 Picnic button stays hidden on HER phone.
export const END = new Date(2026, 10, 1, 0, 0, 0).getTime();   // the Home card goes after two weeks; the page stays reachable from the shopping list

// the wrapped box (Home card + the page before unwrapping); .open lifts the lid
export const BOX = `<svg class="hn-box" viewBox="0 0 160 150" aria-hidden="true">
  <ellipse cx="80" cy="140" rx="58" ry="7" class="hb-shadow"/>
  <rect x="26" y="62" width="108" height="76" rx="6" class="hb-body"/>
  <rect x="72" y="62" width="16" height="76" class="hb-rib"/>
  <g class="hb-lid"><rect x="20" y="44" width="120" height="24" rx="5" class="hb-top"/><rect x="72" y="44" width="16" height="24" class="hb-rib"/>
    <path d="M80 44 C 58 18, 34 30, 52 42 C 62 48, 74 46, 80 44 Z" class="hb-bow"/><path d="M80 44 C 102 18, 126 30, 108 42 C 98 48, 86 46, 80 44 Z" class="hb-bow"/>
    <circle cx="80" cy="43" r="6" class="hb-knot"/></g>
  ${[[34, 84], [116, 100], [50, 120], [104, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" class="hb-dot"/>`).join('')}
  <path d="M12 30 l4 -10 l4 10 l-4 10z" class="hb-spark s1"/><path d="M142 22 l3 -8 l3 8 l-3 8z" class="hb-spark s2"/></svg>`;

// how it works: list → carrier pigeon → Picnic packs the basket → the little electric van rings at the door.
// One dashed road joins the four stations; a little envelope travels along it.
const ROAD = 'M112 96 C 205 92, 250 140, 252 186 C 255 270, 150 262, 98 318 C 70 360, 150 420, 212 452';
export const ART = `<svg class="hn-art" viewBox="0 0 340 540" role="img" aria-label="Deine Einkaufsliste geht per Brieftaube zu Picnic, Picnic packt den Korb, und der Lieferwagen bringt alles zu euch nach Hause.">
  <path d="${ROAD}" class="hn-road"/>
  <g class="hn-env"><rect x="-9" y="-6" width="18" height="12" rx="2"/><path d="M-9 -6 L0 2 L9 -6"/>
    <animateMotion dur="7s" repeatCount="indefinite" rotate="0" path="${ROAD}"/></g>

  <g class="hn-phone">
    <rect x="38" y="18" width="74" height="132" rx="14" class="ph-case"/><rect x="45" y="30" width="60" height="110" rx="6" class="ph-screen"/>
    <rect x="66" y="22" width="18" height="4" rx="2" class="ph-notch"/>
    <text x="75" y="46" class="ph-title">Einkaufsliste</text>
    ${[[60, 1], [78, 1], [96, 0], [114, 0]].map(([y, on]) => `<rect x="51" y="${y}" width="9" height="9" rx="2" class="ph-box${on ? ' on' : ''}"/>${on ? `<path d="M53 ${y + 4.5} l2.4 2.4 l4 -5" class="ph-tick"/>` : ''}<rect x="65" y="${y + 2}" width="${[30, 24, 34, 22][(y - 60) / 18]}" height="5" rx="2.5" class="ph-line"/>`).join('')}
    <path d="M75 136 c -4 -5 -11 -3 -9 3 c 1 3 9 8 9 8 c 0 0 8 -5 9 -8 c 2 -6 -5 -8 -9 -3z" class="ph-heart"/></g>
  <text x="128" y="44" class="hn-num">1</text><text x="146" y="44" class="hn-lab">Deine Einkaufsliste</text>
  <text x="146" y="64" class="hn-sub">hier in Gute Nudel</text>

  <g class="hn-bird"><g class="bird-bob">
    <path d="M226 214 l-20 -10 l5 17z" class="bd-tail"/>
    <ellipse cx="252" cy="214" rx="28" ry="18" class="bd-body"/>
    <circle cx="280" cy="198" r="12" class="bd-body"/>
    <path d="M291 196 l10 3 l-10 4z" class="bd-beak"/><circle cx="284" cy="195" r="2" class="bd-eye"/>
    <path d="M234 212 C 236 190, 258 186, 270 200 C 262 214, 248 218, 234 212z" class="bd-wing"/>
    <path d="M248 231 l-3 9 M258 231 l2 9" class="bd-leg"/>
    <g transform="translate(292 206) rotate(12)"><rect x="0" y="0" width="22" height="15" rx="2" class="bd-env"/><path d="M0 0 L11 8 L22 0" class="bd-envl"/></g></g></g>
  <text x="22" y="198" class="hn-num">2</text><text x="40" y="198" class="hn-lab">Eine Brieftaube</text>
  <text x="40" y="218" class="hn-sub">bringt sie zu Picnic</text>

  <g class="hn-stall">
    <rect x="44" y="340" width="104" height="50" rx="4" class="st-body"/>
    <rect x="40" y="318" width="112" height="14" rx="3" class="st-roof"/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${40 + i * 16} 332 h16 a8 8 0 0 1 -16 0z" class="st-scal ${i % 2 ? 'b' : 'a'}"/>`).join('')}
    <circle cx="62" cy="354" r="6" class="st-tom"/><circle cx="73" cy="356" r="5.5" class="st-tom"/>
    <ellipse cx="96" cy="356" rx="14" ry="4.5" transform="rotate(-18 96 356)" class="st-bread"/>
    <path d="M118 360 q4 -16 12 -14 q-2 10 -12 14z M124 360 q8 -12 14 -8 q-6 8 -14 8z" class="st-leaf"/>
    <path d="M70 372 h52 l-6 22 h-40z" class="st-bask"/><path d="M78 372 q18 -22 36 0" class="st-handle"/>
    <path d="M78 380 h36 M80 387 h32" class="st-weave"/></g>
  <text x="170" y="338" class="hn-num">3</text><text x="188" y="338" class="hn-lab">Picnic packt</text>
  <text x="188" y="358" class="hn-sub">deinen Warenkorb</text>

  <g class="hn-van">
    <path d="M168 494 h-22 M172 484 h-16 M168 474 h-12" class="vn-wind"/>
    <rect x="176" y="452" width="64" height="40" rx="7" class="vn-body"/><path d="M240 462 h12 q10 0 12 10 v20 h-24z" class="vn-body"/>
    <path d="M244 466 h8 q6 0 8 7 h-16z" class="vn-win"/>
    <path d="M200 466 q8 -10 16 0 q-8 10 -16 0z" class="vn-leaf"/>
    <circle cx="194" cy="494" r="8" class="vn-tyre"/><circle cx="246" cy="494" r="8" class="vn-tyre"/>
    <circle cx="194" cy="494" r="3" class="vn-hub"/><circle cx="246" cy="494" r="3" class="vn-hub"/></g>
  <g class="hn-house">
    <path d="M278 452 l25 -22 l25 22z" class="hs-roof"/><rect x="282" y="452" width="42" height="44" class="hs-wall"/>
    <rect x="296" y="468" width="15" height="28" rx="2" class="hs-door"/>
    <path d="M303.5 477 c -2 -3 -6 -2 -5 1.5 c .5 1.6 5 4.5 5 4.5 c 0 0 4.5 -2.9 5 -4.5 c 1 -3.5 -3 -4.5 -5 -1.5z" class="hs-heart"/>
    <g class="hs-ring"><path d="M318 436 q6 4 0 10" /><path d="M323 432 q9 8 0 18" /></g></g>
  <line x1="130" y1="504" x2="336" y2="504" class="hn-ground"/>
  <text x="18" y="438" class="hn-num">4</text><text x="36" y="438" class="hn-lab">Du sagst „Ja“ –</text>
  <text x="36" y="458" class="hn-sub">und es klingelt</text>
  <text x="36" y="476" class="hn-sub">an eurer Tür 🔔</text>
</svg>`;

// what she reads after the picture. pn = what she calls him (usually "Hase").
export function page(pn) {
  return `
  <div class="hn-sec"><h3>Was ist Hello Nudel?</h3>
    <p>Kennst du HelloFresh? Da kommt eine Kiste mit allem, was man für die Rezepte der Woche braucht. <b>Hello Nudel ist unsere eigene Version</b> –
    nur mit <b>euren</b> Rezepten: die aus deinem Kochbuch, deine eigenen und die, die Claude euch aus dem Vorrat zaubert.</p>
    <p>Und statt dass du mit der Liste durch den Supermarkt läufst, landet sie mit einem Tipp in deinem <b>Picnic-Warenkorb</b>. Den Rest bringt der kleine Elektro-Lieferwagen.</p></div>

  <div class="hn-sec"><h3>Wer ist die Brieftaube? 🕊️</h3>
    <p>Picnic lässt fremde Apps nicht einfach so an deinen Warenkorb. Darum hat ${pn} eine kleine <b>Brieftaube</b> losgeschickt:
    Sie nimmt deine Liste, fliegt damit zu Picnic und legt die Sachen in deinen Korb – genau so, wie wenn du sie selbst in der Picnic-App antippst.</p>
    <p>Die Taube merkt sich nichts und liest nichts mit. Sie trägt nur hin und her.</p></div>

  <div class="hn-sec"><h3>So geht's – ab heute</h3>
    <ol class="hn-steps">
      <li><span class="hn-i">📖</span><span><b>Rezept aussuchen.</b> Im Kochbuch auf <i>„🛒 Alles auf die Einkaufsliste“</i> – oder einfach eintragen, was fehlt.</span></li>
      <li><span class="hn-i">🧺</span><span><b>In der Einkaufsliste auf „Bei Picnic bestellen“.</b> Das erste Mal meldest du dich mit deinem Picnic-Konto an (E-Mail, Passwort und vielleicht ein SMS-Code). Danach nie wieder.</span></li>
      <li><span class="hn-i">👀</span><span><b>Kurz drüberschauen.</b> Zu jeder Sache sucht die App das passende Produkt. Passt eins nicht? Antippen und eine andere Sorte nehmen. <b>Deine Wahl merkt sie sich</b> – nächstes Mal ist deine Lieblingssahne schon ausgewählt.</span></li>
      <li><span class="hn-i">✅</span><span><b>„In den Warenkorb“</b> – und alles liegt bei Picnic.</span></li>
      <li><span class="hn-i">📱</span><span><b>In der Picnic-App bestellst du wie immer:</b> Liefertermin aussuchen, bezahlen. Gute Nudel bestellt <b>nie</b> von allein – das letzte Wort hast immer du.</span></li>
      <li><span class="hn-i">🧊</span><span><b>Wenn's da ist:</b> abhaken, <i>„Alles eingekauft!“</i> – und alles wandert in den Vorrat. Daraus kocht Claude euch neue Rezepte, und der Kreis geht von vorne los.</span></li>
    </ol></div>

  <div class="hn-circle" aria-hidden="true"><span>📖 Rezepte</span><i>→</i><span>🛒 Liste</span><i>→</i><span>🕊️ Picnic</span><i>→</i><span>🚐 Tür</span><i>→</i><span>🧊 Vorrat</span><i>↺</i></div>

  <div class="hn-sec hn-future"><h3>Was das für dich bedeutet 💛</h3>
    <p><b>Kein Schleppen mehr.</b> Wasserkästen, Kartoffeln, der große Wocheneinkauf – das trägt ab jetzt jemand anders bis vor eure Tür. Gerade jetzt in der Schwangerschaft, und erst recht, wenn das Baby da ist und ein Supermarktbesuch eine halbe Expedition wird.</p>
    <p><b>Jede Woche geht's schneller.</b> Die App lernt eure Produkte. Nach ein paar Einkäufen heißt Wocheneinkauf: Rezepte aussuchen, zweimal tippen, fertig.</p>
    <p><b>Mehr Zeit für euch.</b> Die Stunde, die sonst im Laden, in der Schlange und auf dem Parkplatz verschwindet, gehört euch – zum Kochen, Entspannen oder einfach Füße hoch.</p>
    <p><b>Eure Küche denkt mit.</b> Vorrat, Rezepte, Einkaufsliste und Lieferung hängen jetzt zusammen. Was daheim ist, wird zu Rezepten; was fehlt, kommt mit dem nächsten Korb.</p></div>

  <div class="hn-sec hn-small"><h3>Gut zu wissen</h3>
    <p>🔒 <b>Dein Passwort wird nirgends gespeichert.</b> Nur ein Anmelde-Schlüssel bleibt auf deinem Handy – wie wenn du in einer App angemeldet bleibst. „Von Picnic abmelden“ löscht ihn.</p>
    <p>🛠️ Picnic hat das nicht selbst gebaut, es ist unsere Bastelei. Falls die Taube mal nicht ankommt: Sag ${pn} Bescheid, dann wird sie wieder flugfit gemacht.</p></div>`;
}
