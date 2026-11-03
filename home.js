// HOME: greeting, numbers, the swipe deck, event bubbles, the Nudel-Zeitung (NEWS), viewHome, Nudel-Rush (A.game).
import * as C from './content.js';
import * as D from './data.js';
import * as Car from './car.js';
import { openGame } from './spiel.js';
import * as B from './baby.js';
import * as G from './geburtstag.js';
import * as HN from './hellonudel.js';
import { addDays, closeModal, commit, dayDone, esc, isRest, isWork, key, monday, parse, pick, today, weekDays, workToday } from './core.js';
import { A, S, ui } from './state.js';
import { pn } from './sync.js';
import { emblem } from './rank.js';
import { giftCards, incomingCard } from './heute.js';
import { dayIndex } from './daheim.js';
import { relaxHomeCard } from './relax.js';
import { picNow } from './einkauf.js';
import { fixRec, flavor, isBake, isCodex, isHerb, kidStars, loveTag, pregLater, recipeById, seasonTag, vorratRecipes, vrNew, vrSeenAdd } from './kochbuch.js';
import { carAll, carDay, carDayLabel, carTime, forMe, isCar, shared } from './termine.js';
import { PLAN_N, dayStart, planNow, viewPlan, viewSwipe } from './wochenplan.js';
import { babyLive, gbLive, hnUnwrapped, pastEvents, viewBaby, viewEvents, viewHello, viewKuchen } from './events.js';
import { flowerGarden } from './flowers.js';
import { render } from './app.js';
import { dueCard } from './faellig.js';

// ---------- HOME: the start screen – what's going on today, a few numbers, the two of you ----------
function daySlot() { const h = new Date().getHours(); return h < 5 ? 'nacht' : h < 11 ? 'morgen' : h < 14 ? 'mittag' : h < 18 ? 'nachmittag' : h < 23 ? 'abend' : 'nacht'; }
const GREET = { morgen: 'Guten Morgen', mittag: 'Mahlzeit', nachmittag: 'Hallo', abend: 'Guten Abend', nacht: 'Noch wach' };
function pickSplash() { const t = C.SPLASH_TIME[daySlot()] || []; const all = C.SPLASHES.concat(t, t); let n; do { n = pick(all); } while (n === ui.splash && all.length > 1); ui.splash = n; }
export function myStats() { // the numbers that travel to the partner (counts only)
  return { day: today(), done: workToday().length, total: S.log.filter(isWork).length, earned: S.earned };
}
function homeStats() {
  const work = S.log.filter(isWork), counts = {};
  for (const e of work) { const c = e.chore && S.chores.find(x => x.id === e.chore); const k = c ? c.icon + ' ' + c.name : e.text; counts[k] = (counts[k] || 0) + 1; }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]), top = ranked[0];
  const laundry = work.filter(e => /wäsche/i.test(e.text)).length;
  return { total: work.length, rest: S.log.filter(isRest).length, earned: S.earned, laundry, top: top && top[1] >= 2 ? top : null, top5: ranked.filter(x => x[1] >= 2).slice(0, 5),
    sent: S.log.filter(e => e.kind === 'delegate').reduce((a, e) => a + (e.n || parseInt(e.text) || 1), 0) };
}
// Home (rebuilt 2026-10-08, user: "few, important things – not a wall of numbers"): today at a glance.
// Never: streaks, week-vs-week, comparing the two of you. The numbers live in Woche / Schätze.
function homeLine(st) { // ONE sentence that fits right now (rotates by day among those that apply)
  const t = today(), wk = weekDays(monday(t)), out = [];
  const took = S.sent.filter(x => (x.status === 'ok' || x.status === 'erledigt') && wk.includes(key(new Date(x.ts - 3 * 3600e3)))).length;
  if (took) out.push(['💛', `${pn()} hat dir diese Woche ${took === 1 ? 'eine Aufgabe' : took + ' Aufgaben'} abgenommen.`, 'woche']);
  const pc = C.pageCost(S.book.pages), canBuy = S.stars >= Math.min(pc, C.STAGE_COST);
  if (canBuy) out.push(['⭐', `${S.stars} Sterne – genug für was Neues bei den Schätzen!`, 'schaetze']);
  else if (S.book.pages < C.BOOK_PAGES) out.push(['📖', `Noch ${pc - S.stars} ⭐ bis zur nächsten Seite im Buch.`, 'schaetze']);
  const r = C.rankOf(S.earned); if (r.to != null) out.push(['🏅', `Noch ${r.to - S.earned} ⭐ bis ${C.rankOf(r.to).name}.`, 'schaetze']);
  if (!out.length) return '';
  const [ic, txt, tab] = canBuy ? out.find(x => x[2] === 'schaetze') : out[dayIndex() % out.length];
  return `<button class="card hcard homeline" data-a="go" data-tab="${tab}"><span class="hl-ic">${ic}</span><span class="hc-txt">${esc(txt)}</span><span class="hc-go">›</span></button>`;
}
// 🍽️ Tinder for dinner (user 2026-10-18: a whole new set at once was too much to read): Claude's new recipes one card at a
// time on Home. → keep (stays in the book), ← nö (gone for me, like hidden). Tap = read it. S.swiped {id: {v: 'yes'|'no'|null, ts}}
// is merged per key (newer wins), so ↶ undo (v: null) survives a sync, unlike the union lists.
export const nopes = () => Object.entries(S.swiped || {}).filter(([, x]) => x && x.v === 'no').map(([id]) => id);
export const deck = () => vorratRecipes().filter(r => !r.dupOf && !(S.swiped || {})[r.id]?.v).map(r => fixRec({ ...r, vr: true }));
export function swipeSet(id, v) {
  S.swiped = { ...(S.swiped || {}), [id]: { v, ts: Date.now() } }; ui.lastSwipe = v ? id : null;
  if (v) vrSeenAdd([id], true);
  commit();
}
export function deckCard() {
  const d = deck(); if (!d.length) return '';
  const r = d[0], him = isCodex(r), back = Math.min(2, d.length - 1);
  return `<section class="card ddeck full${him ? ' dd-him' : ''}"><div class="dd-h"><b>✨ Neu von Claude</b><span class="muted">noch ${d.length}</span>${ui.lastSwipe ? '<button class="mini-btn dd-undo" data-a="dundo" aria-label="Rückgängig">↶</button>' : ''}</div>
    <div class="dd-stack">${back ? '<i class="dd-back b1"></i>' : ''}${back > 1 ? '<i class="dd-back b2"></i>' : ''}
      <div class="dd-card" data-id="${r.id}" role="button" tabindex="0" aria-label="${esc(r.title)} – antippen zum Lesen">
        <span class="dd-yes" aria-hidden="true">💚 Behalten</span><span class="dd-no" aria-hidden="true">Nö</span>
        <span class="dd-ic">${r.icon}</span><b class="dd-t">${esc(r.title)}</b>
        <span class="dd-m">${r.min ? '⏱ ' + r.min + ' Min.' : ''}${isHerb(r) ? ' ' + kidStars(r) : ''}${loveTag(r) ? ' · ' + loveTag(r) : ''}${isBake(r) ? ' <span class="tag bake">🧁 Backen</span>' : ''}${seasonTag(r)}</span>
        ${flavor(r)}${r.note ? `<span class="dd-n">${esc(r.note)}</span>` : ''}${pregLater(r) ? '<span class="preglater">🤰 erst ab Februar</span>' : ''}
        <span class="dd-tap muted">antippen zum Lesen</span>
      </div></div>
    <div class="dd-btns"><button class="dd-b no" data-a="dswipe" data-v="no" data-id="${r.id}" aria-label="Nö, weg damit">✕</button><button class="dd-b yes" data-a="dswipe" data-v="yes" data-id="${r.id}" aria-label="Behalten">♥</button></div>
  </section>`;
}
// 🏆 am häufigsten erledigt: places 1–3 on a podium (2 · 1 · 3), 4 + 5 underneath
function podium(top) {
  if (!top || top.length < 3) return '';
  const split = k => { const m = k.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u); return m ? [m[1], m[2]] : ['📝', k]; };
  const step = (x, place) => { const [ic, name] = split(x[0]); return `<div class="pd-col p${place}"><span class="pd-ic">${ic}</span><span class="pd-name">${esc(name)}</span><span class="pd-block"><b>${place}</b><small>${x[1]}×</small></span></div>`; };
  return `<section class="card podium"><h3>🏆 Am häufigsten erledigt</h3><div class="pd-stage">${step(top[1], 2)}${step(top[0], 1)}${step(top[2], 3)}</div>
    ${top.length > 3 ? `<ol class="pd-rest" start="4">${top.slice(3).map(x => { const [ic, name] = split(x[0]); return `<li><span>${ic} ${esc(name)}</span><b>${x[1]}×</b></li>`; }).join('')}</ol>` : ''}</section>`;
}
// ---------- 🫧 event bubbles (user 2026-10-18): every running event is a round bubble under the greeting, like Instagram
// stories, instead of a big card. A coloured ring = something going on / new; grey = calm. Tap = the event's page.
function bubbles() {
  const b = [], n = deck().length;
  if (n) b.push({ a: 'swipe', ic: '🍽️', l: 'Rezepte', n, on: true });
  if (Date.now() < HN.END) b.push(hnUnwrapped() ? { a: 'hello', ic: '🕊️', l: 'Hello Nudel', t0: HN.START, t1: HN.END } : { a: 'hello', ic: '🎁', l: 'Geschenk!', on: true, t0: HN.START, t1: HN.END });
  if (gbLive()) b.push({ a: 'kuchen', ic: '🎂', l: 'Geburtstag', on: true, t0: G.START, t1: G.END });
  if (picNow()) { const t = new Date(picNow().start); b.push({ a: 'picdeliv', ic: '🚚', l: 'Picnic', n: t.toLocaleDateString('de-DE', { weekday: 'short' }) + ' ' + t.getHours(), on: true }); }
  if (babyLive()) b.push({ a: 'baby', ic: '👶', l: 'Baby', on: true, t0: B.START, t1: B.END });
  const pl = planNow();   // 🗓️ the running week as a story ring; a finished one asks for the next week for 3 days
  if (pl && !pl.over) b.push({ a: 'plan', ic: '🗓️', l: 'Wochenplan', t0: dayStart(pl.start), t1: dayStart(addDays(pl.start, PLAN_N)) });
  else if (pl && today() <= addDays(pl.end, 3)) b.push({ a: 'plan', ic: '🗓️', l: 'Neu planen?', on: true });
  if (pastEvents().length) b.push({ a: 'events', ic: '🗓️', l: 'Vergangen', past: true });   // always last, grey ring (user)
  if (!b.length) return '';
  return `<div class="bubs" role="list">${b.map(x => { const tm = x.t1 ? storyLeft(x.t0, x.t1) : null, n = tm ? tm.txt : x.n;
    return `<button class="bub" role="listitem" data-a="${x.a}"${tm ? ` aria-label="${esc(x.l)}, noch ${esc(tm.long)}"` : ''}><span class="bub-r${x.on ? ' on' : ''}${tm ? ' timer' : ''}${x.past ? ' past' : ''}"${tm ? ` style="--left:${tm.p.toFixed(3)}"` : ''}><span class="bub-i">${x.ic}</span></span>${n ? `<b class="bub-n${tm ? ' tm' : ''}">${n}</b>` : ''}<span class="bub-l">${esc(x.l)}</span></button>`; }).join('')}</div>`;
}
// ⏳ story timer (user 2026-10-20, like an Instagram story): the coloured ring empties from START to END; the badge says
// what's left (days, on the last day hours, the last hour minutes). Calm on purpose: no red, no pulsing near the end.
function storyLeft(t0, t1) {
  const now = Date.now(), ms = Math.max(0, t1 - now), p = Math.max(0, Math.min(1, ms / Math.max(1, t1 - t0)));
  const d = Math.ceil(ms / 864e5), h = Math.ceil(ms / 36e5), m = Math.max(1, Math.ceil(ms / 6e4));
  const txt = ms >= 864e5 ? d + ' T.' : ms >= 36e5 ? h + ' Std.' : m + ' Min.';
  const long = ms >= 864e5 ? d + (d === 1 ? ' Tag' : ' Tage') : ms >= 36e5 ? h + (h === 1 ? ' Stunde' : ' Stunden') : m + ' Minuten';
  return { p, txt, long };
}

// ---------- 🗞️ Die Nudel-Zeitung (user 2026-10-18): what's new in the app and how it works, instead of "Daheim heute".
// Newest unread article = the headline, two more below, ✓ Gelesen marks it (S.newsRead, merged as a union).
export const ZETTEL = ['buch-bitch-lasagna', 'buch-kimchi-eintopf', 'buch-thai-garnelen-curry', 'buch-chili', 'buch-chili-cheese-nupels', 'buch-ofenkartoffeln-eier-dip', 'buch-sushi-reis', 'buch-eingelegter-ingwer', 'buch-kaiserschmarrn', 'buch-mexikanische-apfeltorte', 'buch-vanillekipferl'];   // Julia's sticky notes, 2026-10-26
export const NEWS = [
  { id: 'n-naehr', d: '2026-10-30', ic: '🔢', t: 'Das Kochbuch hat nachgerechnet – jedes Rezept kennt jetzt seine Kalorien', x: 'Wie viel steckt eigentlich in einer Portion Köttbullar? Bisher wusste das nur die Waage im Bad, mit Verspätung. Jetzt rechnet die App es selbst aus: Zutat für Zutat, Gramm für Gramm, geteilt durch die Portionen. Das Ergebnis steht bei jedem Rezept, ganz ohne Abtippen.',
    how: ['Ein Rezept öffnen: unter dem Titel steht „ca. … kcal · … g Fett · … g KH · … g Eiweiß pro Portion“', 'Es ist eine Schätzung („ca.“) – Salz, Pfeffer und Kräuter zählen nicht, eine Prise schon gar nicht', 'Bei Kuchen und Blechen zählt die App die Stücke selbst, z.B. „pro Stück, bei ca. 12 Stück“', 'Fehlt bei einer Zutat die Menge, steht „ohne …“ dabei. Fehlen zu viele (handgeschriebene Zettel „nach Hunger“), bleibt die Zeile lieber weg', 'Gilt für alle Rezepte: eingebaute, fotografierte, Claudes Vorrat-Rezepte und eure eigenen'], go: 'newsnaehr', btn: 'Köttbullar nachrechnen' },
  { id: 'n-wochenplan', d: '2026-10-30', ic: '🗓️', t: 'Julia plant die Woche – Köttbullar haben ab sofort einen Termin', x: 'Wer jeden Abend „Was essen wir heute?“ fragt, bekommt jetzt eine Antwort, die schon eine Woche alt ist. Der neue Wochenplan nimmt bis zu sieben Gerichte aus dem Kochbuch, jedes an seinen Tag. Dazu zieht ein Frühstück ins Kochbuch ein, und wer Muskeln will, findet sie unter 💪.',
    how: ['Kochbuch → Kochen: ganz oben „🗓️ Wochenplan“ – oder bei jedem Rezept auf „🗓️ Planen“ und einen Tag wählen', 'Ein leerer Tag → „＋ Gericht aussuchen“ → im Kochbuch ein Rezept öffnen → „Für … nehmen“', 'Die Woche startet mit dem ersten Gericht. Umplanen verschiebt nichts', 'Gekocht wird automatisch abgehakt – egal auf welchem Handy, egal an welchem Tag', 'Nach sieben Tagen (oder wenn alles gekocht ist): „Neue Woche planen“ oder „Gleiche nochmal“', 'Neu im Kochbuch: 🍳 Frühstück und 💪 Protein mit je fünf Rezepten. Und Claude schreibt nach dem Einkauf jetzt einen zufälligen Mix: mal Frühstück, mal Salat, mal Backen'], go: 'plan', btn: 'Zum Wochenplan' },
  { id: 'n-suche', d: '2026-10-30', ic: '🔎', t: 'Gurke bleibt Gurke – und Milchreis ist keine Milch', x: 'Im Vorrat lagen zuletzt zwei Tomaten, drei Frischkäse und eine Gurke, die sich „Salatgurke“ nannte. Ab heute steht jedes Ding nur noch einmal da, die Mengen zusammengezählt. Und wer Milch zum Kochen nimmt, wird nicht mehr nach dem Milchreis gefragt.',
    how: ['Kochbuch → Stöbern: in die Suche einfach eine Zutat tippen, z.B. „Zucchini“ – du siehst alle Rezepte damit, darunter steht „🔎 mit …“', 'Mehrere Wörter gehen auch: „Hähnchen Reis“', 'Im Vorrat: gleiche Sachen stehen in einer Zeile (Salatgurke + Gurke, zwei Packungen Sahne …). Antippen = Menge für alles zusammen ändern, ✕ = alles davon aufgebraucht', 'Kommt Picnic, sehen jetzt beide Handys auf Home, wann – nicht nur das, auf dem Picnic angemeldet ist'], go: 'newssuche', btn: 'Zur Rezept-Suche' },
  { id: 'n-zettel', d: '2026-10-26', ic: '📝', t: 'Elf Klebezettel ziehen ins Kochbuch – Redaktion findet null Mengenangaben', x: 'Brühl. Am Montagvormittag schickte Julia in zehn Minuten elf Rezepte ab: grüne, orange und blaue Zettel, einer davon auf Werbeblock von ProSiebenSat.1. Claude zählte die Gramm-Angaben und gab bei der Lasagne auf. Sie heißt jetzt offiziell „Bitch-Lasagna“, die Redaktion übernimmt Titel wörtlich. Alle elf stehen ab sofort im Kochbuch, inklusive Originalfoto.',
    how: ['Neu: Bitch-Lasagna, Kimchi-Eintopf, Thai-Garnelen-Curry, Chili, Chili-Cheese-Nupels, Ofen-Kartoffeln mit Eier-Senf-Dip, Sushi-Reis, Eingelegter Ingwer, Kaiserschmarrn, Mexikanische Apfeltorte, Vanillekipferl 🎄', 'Kommen mehrere Fotos auf einmal zurück, gibt’s jetzt „Alle ansehen“ – einfach durchblättern', 'Saison-Rezepte tragen nur noch ihr Emoji: 🎃 🎄 statt Schildchen', 'Das App-Symbol hat einen weißen Rand bekommen – damit die Nudel auf dem Handy nicht untergeht', 'Die Leiste ganz unten am Handy bleibt jetzt schwarz (nach dem Neu-Installieren)', 'Laut Zettel sind die Chili-Cheese-Nupels „fettisch“. Die Redaktion bestätigt das ungeprüft'], go: 'newszettel', btn: 'Alle 11 durchblättern' },
  { id: 'n-klumpatsch', d: '2026-10-20', ic: '🍳', t: 'Kochbuch-KI an Notizbuch gescheitert – „Reste-Klumpatsch“ trotzdem gedruckt', x: 'Brühl. Um 17:37 Uhr meldete der Rezept-Eingang ein neues Foto. Claude, zuständig für Kochbuch-Seiten, rechnete mit Grammangaben. Stattdessen begann die Seite mit: „Die Gegenwart ist ein schöner Ort. Mein Bauch ist dick, aber ich bin trotzdem glücklich.“ Darunter: sieben Zutaten, null Mengen, vier Schritte. Zwei davon lauten sinngemäß „Julia fragen“. Die Hausregel „Nichts erfinden“ ließ nur einen Weg: alles genau so abschreiben. Portionen: „wie viel Reste da sind“. Kochzeit: unbekannt. Kurz zuvor hatte derselbe Prüfer eine harmlose Yakisoba dreimal als „zu ähnlich“ abgelehnt – den Klumpatsch winkte er beim ersten Versuch durch.',
    how: ['Die „Rheine“ im Rezept ist keine Stadt im Münsterland, sondern die Reine: der Bräter', 'Kräuter™ bleibt geschützt – welche Kräuter, weiß nur der Autor', '„Geröstetes Sesam“ wurde wörtlich übernommen. Die Redaktion korrigiert keine Kunst', 'Schwangerschafts-Check bestanden: Haxe durch, nichts roh', 'Wichtigste Zutat laut Rezept: Julia. Die steht nicht auf der Einkaufsliste'], go: 'newsklump', btn: 'Zum Rezept' },
  { id: 'n-storyring', d: '2026-10-20', ic: '⏳', t: 'Wie lange läuft ein Event noch?', x: 'Events mit Ablaufdatum haben jetzt einen Ring wie bei Instagram-Storys: Er wird grau, je weniger Zeit bleibt. Ist die Zeit um, wandert das Event unter 🗓️ Vergangen.',
    how: ['Bunter Teil vom Ring = so viel Zeit ist noch übrig', 'Die kleine Zahl sagt’s genau: Tage, am letzten Tag Stunden', 'Ganz rechts in der Reihe, mit grauem Ring: 🗓️ Vergangen – da wohnen jetzt auch dein Geburtstag und das Hello-Nudel-Geschenk'], go: 'events', btn: 'Vergangen ansehen' },
  { id: 'n-hellotab', d: '2026-10-20', ic: '🧺', t: 'Hello Nudel hat jetzt einen eigenen Platz', x: 'Alles rund ums Essen wohnt jetzt unten in 🧺 Hello Nudel – als Kreislauf: Einkaufswagen → Vorrat → Kochbuch, und was aufgebraucht ist, kommt wieder auf den Wagen. 🛋️ Entspannen ist dafür nach 🏠 Daheim gezogen.',
    how: ['Unten auf 🧺 Hello Nudel tippen', 'Oben siehst du sofort, wie’s steht: was auf dem Wagen liegt, was daheim ist, was du gerade kochen kannst', 'Kommt Picnic, fährt ein kleiner 🚚 zwischen Wagen und Vorrat – nach der Lieferung geht der Tab von selbst im Vorrat auf', 'Hello Nudel merkt sich, wo du zuletzt warst', 'Entspannen findest du jetzt unter 🏠 Daheim, neben Routinen und Terminen'], go: 'hntab', btn: 'Zu Hello Nudel' },
  { id: 'n-swipe', d: '2026-10-18', ic: '🍽️', t: 'Neue Rezepte jetzt zum Swipen', x: 'Claudes neue Rezepte kommen nicht mehr als lange Liste, sondern als Stapel – wie bei Tinder, nur mit Essen.',
    how: ['Oben auf die Blase 🍽️ Rezepte tippen', 'Nach rechts wischen oder ♥ = behalten · nach links oder ✕ = weg damit', 'Antippen = das ganze Rezept lesen · ↶ holt das letzte zurück'], go: 'swipe', btn: 'Swipen' },
  { id: 'n-taste', d: '2026-10-18', ic: '👅', t: 'Wie schmeckt das?', x: 'Jedes neue Rezept hat jetzt ein Geschmacksprofil: drei Wörter und 🌶️ für die Schärfe.',
    how: ['Steht auf jeder Swipe-Karte und oben auf der Rezeptseite', 'Kein 🌶️ = gar nicht scharf, 🌶️🌶️🌶️ = Vorsicht'] },
  { id: 'n-bubbles', d: '2026-10-18', ic: '🫧', t: 'Alles, was gerade los ist, in einer Reihe', x: 'Babyerstausstattung, Geburtstag & Co. sind jetzt die runden Blasen ganz oben.',
    how: ['Bunter Ring = da ist gerade was los', 'Antippen öffnet das Event', 'Vorbei? Dann landet es unter 🗓️ Vergangen'] },
  { id: 'n-season', d: '2026-10-18', ic: '🎃', t: 'Saison-Rezepte erkennt man jetzt', x: 'Rezepte zur Jahreszeit bekommen ein eigenes Schildchen – gerade ist Spooky Season. Im Advent kommt 🎄.' },
  { id: 'n-shopshare', d: '2026-10-19', ic: '🛒', t: 'Eine Einkaufsliste für euch beide', x: 'Was einer von euch auf die Einkaufsliste schreibt, steht jetzt auch beim anderen – abhaken, löschen und 🧺 inklusive.',
    how: ['Einfach wie immer eintragen – nach spätestens einer Minute ist es beim anderen', 'Im Laden abgehakt = beim anderen auch abgehakt', '„Ganze Liste leeren“ leert sie für euch beide'], go: 'newsshop', btn: 'Zur Einkaufsliste' },
  { id: 'n-picnic3', d: '2026-10-19', ic: '🔢', t: 'Picnic: wie viele – und welche Sorte', x: 'Beim Bestellen kannst du jetzt die Menge einstellen und von einer Sache mehrere Sorten nehmen.',
    how: ['− / + unter jedem Produkt = wie viele (z. B. 12× Milch für einen Kasten)', 'Produkt antippen → „➕ Noch eine Sorte dazu“ – die zweite Sorte kommt als eigener Eintrag auf die Liste', 'Bei 10 Stück oder mehr oder ab 150 € fragt die App einmal nach, bevor’s in den Warenkorb geht'],
    show: () => hnUnwrapped(), go: 'newsshop', btn: 'Zur Einkaufsliste' },
  { id: 'n-picnic2', d: '2026-10-19', ic: '🚚', t: 'Picnic findet mehr – und bringt’s bis in den Vorrat', x: 'Hello Nudel kann jetzt mehr: bessere Suche, mehr Auswahl, ein Blick in den Warenkorb – und wenn Picnic geliefert hat, landet alles von selbst im Vorrat.',
    how: ['Nichts gefunden? Im Feld „Anders suchen“ dein eigenes Wort eintippen – die App merkt es sich', 'Produkt antippen = Tabelle mit Größe, Preis und €/kg · „mehr anzeigen“ für noch mehr', 'Was wirklich im Warenkorb liegt, steht mit 🧺 auf der Einkaufsliste', 'Oben auf Home zeigt 🚚 Picnic, wann die Lieferung kommt', 'Nach der Lieferung die App aufmachen – alles wandert in den Vorrat und von der Liste'],
    show: () => hnUnwrapped(), go: 'newsshop', btn: 'Zur Einkaufsliste' },
  { id: 'n-picnic', d: '2026-10-19', ic: '🧺', t: 'Hello Nudel: Einkaufsliste zu Picnic', x: 'Dein Geburtstagsgeschenk: die Einkaufsliste wandert mit einem Tipp in deinen Picnic-Warenkorb.',
    how: ['Einkaufsliste öffnen → 🧺 Bei Picnic bestellen', 'Einmal einloggen, dann geht’s mit einem Tipp', 'Bestellt wird nie automatisch – das machst du in der Picnic-App'], show: () => hnUnwrapped(), go: 'hello', btn: 'Ansehen' },
  { id: 'n-baby', d: '2026-10-10', ic: '👶', t: 'Babyerstausstattung zusammen abhaken', x: 'Eine gemeinsame Liste bis 10. Januar. Jedes Häkchen – egal von wem – gibt euch beiden einen ⭐.', go: 'baby', btn: 'Zur Liste', show: () => babyLive() },
];
export const newsAll = () => NEWS.filter(n => !n.show || n.show()).sort((a, b) => b.d.localeCompare(a.d));
function newspaper() {
  const all = newsAll(); if (!all.length) return '';
  const read = new Set(S.newsRead || []), unread = all.filter(n => !read.has(n.id));
  const top = unread[0] || all[0], more = (unread.length ? unread : all).filter(n => n !== top).slice(0, 2);
  const d = parse(today()), art = (n, big) => `<article class="np-a${big ? ' big' : ''}">${read.has(n.id) ? '' : '<span class="np-new">NEU</span>'}
      <h3><span class="np-ic">${n.ic}</span> ${esc(n.t)}</h3><p>${esc(n.x)}</p>
      ${big && n.how ? `<ol class="np-how">${n.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      <div class="np-btns">${big && n.go ? `<button class="btn soft np-go" data-a="npgo" data-id="${n.id}">${esc(n.btn || 'Ausprobieren')} ›</button>` : ''}${!read.has(n.id) ? `<button class="lnk np-read" data-a="npread" data-id="${n.id}">✓ Gelesen</button>` : ''}</div></article>`;
  return `<section class="card news"><div class="np-mast"><b>Nudel-Zeitung</b><span>Ausgabe vom ${d.getDate()}. ${C.MONTHS[d.getMonth()]} · ${unread.length ? unread.length + ' neu' : 'alles gelesen'}</span></div>
    ${art(top, true)}${more.length ? `<div class="np-more">${more.map(n => art(n, false)).join('')}</div>` : ''}
    ${all.length > 3 ? `<button class="lnk np-all" data-a="npall">Alle Ausgaben (${all.length}) ›</button>` : ''}</section>`;
}
export function newsRead(id) { S.newsRead = [...new Set([...(S.newsRead || []), id])]; commit(); }
// read it: its shelf's page; swiping on the page goes through the rest of the deck
function deckOpen(id) {
  const r = recipeById(id); if (!r) return;
  closeModal(); ui.tab = 'ruhe'; ui.sub = null; ui.qtab = 'kochbuch'; ui.ktab = isCodex(r) ? 'codex' : 'herb';
  ui.kctx = deck().map(x => x.id); ui.rid = id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = [];
  render(); scrollTo(0, 0);
}
// drag the top card: far enough right = keep, left = nö (port of Reliquary's dragCard); a short tap opens the recipe
export function wireDeck() {
  let c = null, x0 = 0, dx = 0, moved = false;
  document.addEventListener('pointerdown', e => {
    const k = e.target.closest('.dd-card'); if (!k || e.button) return;
    c = k; x0 = e.clientX; dx = 0; moved = false; try { c.setPointerCapture(e.pointerId); } catch (er) {} c.style.transition = 'none';
  });
  document.addEventListener('pointermove', e => {
    if (!c) return;
    dx = e.clientX - x0; if (Math.abs(dx) > 8) moved = true;
    c.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 18 + 'deg)';
    c.classList.toggle('yes', dx > 60); c.classList.toggle('no', dx < -60);
  });
  const up = () => {
    if (!c) return;
    const k = c, id = k.dataset.id; c = null; k.style.transition = '';
    if (Math.abs(dx) > 110) { k.style.transform = 'translateX(' + (dx > 0 ? 600 : -600) + 'px) rotate(' + (dx > 0 ? 30 : -30) + 'deg)'; const v = dx > 0 ? 'yes' : 'no'; setTimeout(() => A.dswipe({ dataset: { id, v } }), 200); }
    else { k.style.transform = ''; k.classList.remove('yes', 'no'); if (!moved) deckOpen(id); }
  };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  document.addEventListener('keydown', e => { const k = e.target.closest && e.target.closest('.dd-card'); if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); deckOpen(k.dataset.id); } });
}
function vrNewCard() {
  const n = vrNew(), e = n.filter(isHerb).length, f = n.filter(isCodex).length; if (!n.length) return '';
  return `<div class="card vrnew"><button class="hcard" data-a="ktabgo" data-v="${e ? 'herb' : 'codex'}"><span class="vn-ic" aria-hidden="true">✨</span><span class="hc-txt"><b>Neue Rezepte von Claude</b><span class="muted">${[e ? `🖍️ ${e} in Kinderleicht` : '', f ? `✦ ${f} im Culinarius` : ''].filter(Boolean).join(' · ')}</span></span><span class="hc-go">›</span></button><button class="mini-btn" data-a="vrseen" aria-label="Gesehen">✕</button></div>`;
}
export function viewHome() {
  if (ui.sub === 'baby') return viewBaby();
  if (ui.sub === 'kuchen') return viewKuchen();
  if (ui.sub === 'events') return viewEvents();
  if (ui.sub === 'plan') return viewPlan();
  if (ui.sub === 'hello') return viewHello();
  if (ui.sub === 'swipe') return viewSwipe();
  const t = today(), slot = daySlot(), st = homeStats(), d = parse(t);
  const heute = S.items.filter(i => i.where === 'heute'), done = workToday();
  let h = flowerGarden(done.length, t) + `<section class="hello2"><div class="hg">${GREET[slot]}${slot === 'nacht' ? '?' : ','} <b>${esc(S.name || 'gute Nudel')}</b></div><div class="hd">${C.DAYNAMES[d.getDay()]}, ${d.getDate()}. ${C.MONTHS[d.getMonth()]}</div></section>`;
  h += bubbles() + incomingCard() + giftCards() + dueCard();   // (the events live in the bubbles now, user 2026-10-18)
  h += newspaper();   // above the to-dos (user 2026-10-20)
  // today: the ring + the next few things, ticked right here
  const finished = dayDone(), all = heute.length + done.length, p = all ? done.length / all : 0, R = 34, U = 2 * Math.PI * R;
  h += `<div class="card today2"><button class="hcard today-card" data-a="go" data-tab="heute">
    <svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${R}" class="ring-bg"/><circle cx="42" cy="42" r="${R}" class="ring-fg" style="stroke-dasharray:${U};stroke-dashoffset:${U * (1 - p)}"/></svg>
    <span class="ring-n">${finished ? '🎉' : all ? done.length + '<small>/' + all + '</small>' : '–'}</span>
    <span class="hc-txt"><b>${finished ? 'Tag geschafft!' : !S.today.planned && !done.length && !heute.length ? 'Noch nichts geplant' : heute.length === 0 ? 'Alles abgehakt! 🎉' : heute.length === 1 ? 'Noch eine Sache' : 'Noch ' + heute.length + ' Sachen'}</b>
      <span class="muted">${finished ? 'Der Rest wartet bis morgen.' : !S.today.planned && !done.length && !heute.length ? 'Hol dir was aus der Liste.' : done.length ? done.length + ' heute schon geschafft' : 'Du schaffst das.'}</span></span><span class="hc-go">›</span></button>
    ${heute.slice(0, 3).map(i => { const c = i.chore && S.chores.find(x => x.id === i.chore);
      return `<div class="item home-item" data-id="${i.id}"><button class="chk" data-a="tick" data-id="${i.id}" aria-label="Erledigt"></button><div class="txt"><span>${c ? c.icon + ' ' : ''}${esc(i.text)}</span></div></div>`; }).join('')}
    ${heute.length > 3 ? `<button class="more-link" data-a="go" data-tab="heute">+ ${heute.length - 3} weitere ›</button>` : ''}</div>`;
  h += relaxHomeCard();
  // at home today: routines due, the shopping list, something to cook
  // the last dish that was shopped for: time to go shopping again (user's wording, 2026-10-08)
  if ((S.dishes || []).filter(x => recipeById(x.id)).length === 1) h += `<button class="last-dish" data-a="go" data-tab="ruhe" data-q="einkauf"><span class="ld-t">ZEIT FÜR EINEN WEITEREN VERDAMMTEN EINKAUF!</span> <span class="ld-e">😡</span></button>`;
  // next appointments (today + tomorrow), the car included
  const now = Car.localISO(new Date()), tm = addDays(t, 1);
  const soon = carAll(Car.live, false).filter(b => shared(b) && forMe(b) && carDay(b.start) <= tm && b.end > now).slice(0, 2);
  h += `<button class="card hcard" data-a="go" data-tab="termine"><span class="hc-txt"><b>📅 Als Nächstes</b>${soon.length
      ? soon.map(b => `<span class="hc-term"><i class="tdot" style="background:${b.color}"></i> ${esc(carDayLabel(carDay(b.start) < t ? t : carDay(b.start)))} ${esc(carTime(b.start))} · <b>${esc(b.note || (isCar(b) ? 'Auto' : 'Termin'))}</b>${isCar(b) ? ' 🚗' : ''}</span>`).join('')
      : '<span class="muted">Heute und morgen nichts Gemeinsames.</span>'}</span><span class="hc-go">›</span></button>`;
  h += homeLine(st);
  // the two of you: only the shared total (never who did more) + the partner's rank (user asked for it, 2026-10-05)
  const ps = S.partnerStats;
  if (ps && (ps.total || ps.earned != null)) {
    const pr = ps.earned != null ? C.rankOf(ps.earned) : null;
    h += `<div class="card team2"><div class="t2-n"><b>${st.total + (ps.total || 0)}</b><span>Sachen habt ihr zusammen erledigt</span></div>
      ${pr ? `<div class="team-rank">${emblem(pr.t, 34, pr.div)}<span>${esc(pn())} ist gerade <b style="color:${pr.tier.dark}">${esc(pr.name)}</b></span></div>` : ''}</div>`;
  }
  if (false) h += `<button class="card hcard" data-a="events"><span class="hc-txt"><b>🗓️ Vergangene Events</b><span class="muted">${S.events.map(e => esc(e.icon + ' ' + e.title)).join(' · ')}</span></span><span class="hc-go">›</span></button>`;
  h += podium(st.top5);
  // Nudel-Rush: she doesn't play it, but it stays (user) — just a small link at the bottom
  const gl = Object.values((S.game && S.game.levels) || {}), gdone = gl.filter(p => p >= 100).length;
  h += `<button class="gamelink gamecard" data-a="game">🍝 Kleine Pause? <b>Nudel-Rush</b>${gl.length ? ` <span class="muted">· ${gdone}/5</span>` : ''}</button>`;
  return h;
}
A.splash = () => { pickSplash(); render(); };
// Nudel-Rush (spiel.js): no stars, no comparison – just your own record on your own devices
export let game = null;
A.game = () => {
  if (game) return;
  game = openGame({
    data: { levels: { ...((S.game && S.game.levels) || {}) }, endless: (S.game && S.game.endless) || 0 },
    onSave: d => { S.game = { levels: { ...d.levels }, endless: d.endless }; S.updatedAt = Date.now(); D.saveLocal(S); D.scheduleBackup(S); },
    onClose: () => { game = null; render(); },
  });
};
