// 🐕 HUNDESCHULE (2026-11-27, card G29): loose-leash training, on Stefan's devices only (D.me() !== 'stand').
// Each day the app picks ONE 5-minute exercise and says why; after a walk a 2-tap log (leash 1–5, how often he dragged).
// Julia's phone only gets the walk-rules card (a quiet link at the bottom of Home). The dog is never named in the app.
// Save: S.dogWalks [{id, day, ts, l (1–5), d (drag bucket)}] (joined by id across his devices, never posted).
// Stars: a log entry 'dog-<day>' (kind 'dog', ex, stars 0|1) once per day, inside the normal daily cap (C.CAP).
import * as C from './content.js';
import * as D from './data.js';
import { closeModal, commit, dayLog, esc, floatStar, modal, parse, today, undoToast, workToday } from './core.js';
import { A, S, ui } from './state.js';
import { earn, pn } from './sync.js';
import { render } from './app.js';

export const dogHere = () => D.me() !== 'stand';

// the walk rules: the same on both phones, so pulling never pays with either of us
export const RULES = [
  ['Leine straff = wir bleiben stehen.', 'Wie ein Baum. Erst wenn die Leine wieder locker hängt, geht es weiter.'],
  ['Schnüffeln ist die Belohnung.', 'Will er zu einer Stelle: kurz warten, bis die Leine locker ist, dann „Geh schnüffeln!“ – und gemeinsam hin.'],
  ['Kein Hallo an der Leine.', 'Andere Hunde: Abstand halten, ruhig vorbeigehen. Schaut er hin und bleibt ansprechbar, gibt es ein Leckerli.'],
  ['Eilig? Dann kein Training.', 'Wenn es nur schnell raus muss: kurze Leine, zügig hin und zurück – aber nie mitziehen lassen.'],
];

// st = stage: 1 = Grundlagen (leash mostly tight), 2 = lockerer (sniffing as the prize), 3 = mit Ablenkung
export const EX = [
  { id: 'blick', st: 1, ic: '👀', t: 'Blick = Leckerli', where: 'drinnen',
    how: ['Leckerlis in die Tasche, er an der Leine im Flur oder Wohnzimmer.', 'Warte still. Sobald er dich anschaut: „Yes!“ und ein Leckerli an deinem Bein.', 'Ein paar Schritte gehen, wieder warten. 5 Minuten, dann Pause.'],
    why: 'Wer draußen zu dir schauen soll, muss erst drinnen lernen, dass sich das lohnt.' },
  { id: 'naht', st: 1, ic: '🦵', t: 'Die Hosennaht', where: 'Flur oder Hof',
    how: ['Leckerli immer genau an deiner Hosennaht geben, nie vor dir.', 'Gehen, und jedes Mal, wenn die Leine locker ist und er neben dir ist: Leckerli an der Naht.', 'Am Anfang sehr oft belohnen – lieber zu viel als zu wenig.'],
    why: 'So lernt er, wo der beste Platz ist: neben dir, nicht vor dir.' },
  { id: 'baum', st: 1, ic: '🌳', t: 'Der Baum', where: 'ruhige Straße',
    how: ['Sobald die Leine straff wird: sofort stehen bleiben, nichts sagen, nicht ziehen.', 'Warte, bis die Leine locker wird (er dreht sich um oder kommt einen Schritt zurück).', 'Dann „Weiter!“ und los. Am Anfang kommt ihr kaum voran – das ist richtig so.'],
    why: 'Ziehen hat ihn bisher ans Ziel gebracht. Ab jetzt hält Ziehen alles an.' },
  { id: 'tuer', st: 1, ic: '🚪', t: 'Ruhig zur Tür raus', where: 'Haustür',
    how: ['Leine dran, Hand an die Klinke.', 'Springt oder zieht er: Hand weg, warten. Ist er ruhig: Tür ein Stück auf.', 'Raus geht es erst, wenn er ruhig steht oder sitzt. Mehrmals üben, auch ohne danach rauszugehen.'],
    why: 'Wer schon an der Tür explodiert, zieht auch auf der Straße. Ruhe beginnt drinnen.' },
  { id: 'kehrt', st: 2, ic: '↩️', t: 'Kehrtwende', where: 'Gehweg',
    how: ['Läuft er vor und die Leine wird straff: fröhlich „Hier lang!“ und umdrehen.', 'Er muss dir folgen. Holt er auf und ist neben dir: Leckerli an der Naht.', 'Ein paar Mal pro Runde, immer gut gelaunt, nie mit Ruck.'],
    why: 'Er lernt: Du entscheidest die Richtung, und neben dir lohnt es sich.' },
  { id: 'schnupper', st: 2, ic: '👃', t: 'Schnüffeln verdienen', where: 'Runde mit Lieblingsstellen',
    how: ['Er will zu einer Stelle? Stehen bleiben, bis die Leine locker ist.', '2 Sekunden locker: „Geh schnüffeln!“ – und gemeinsam hin. Das ist sein Leckerli.', 'Nach dem Schnüffeln mit „Weiter!“ zurück auf den Weg.'],
    why: 'Das, was er am meisten will, wird zur Belohnung für lockere Leine.' },
  { id: 'markier', st: 2, ic: '🌿', t: 'Markieren auf Zeichen', where: 'Runde mit vielen Ecken',
    how: ['Du suchst die Stellen aus: „Geh schnüffeln!“ heißt, hier darf er.', 'An anderen Ecken zügig weitergehen, Leckerli an der Naht, solange er mitkommt.', 'Nicht jede Laterne gehört ihm – aber er bekommt jede Runde ein paar.'],
    why: 'So bestimmst du das Tempo, und er bekommt trotzdem seine Stellen.' },
  { id: 'futterspur', st: 2, ic: '🍪', t: 'Leckerli-Spur', where: 'Gehweg',
    how: ['Beim Gehen ab und zu ein Leckerli neben deinem Fuß fallen lassen.', 'Er lernt, unten neben dir zu suchen, statt nach vorn zu stürmen.', 'Gut für Stellen, an denen es spannend riecht.'],
    why: 'Nase unten bei dir statt vorne an der Leine – das holt ihn runter.' },
  { id: 'ablenk', st: 3, ic: '🐿️', t: 'Vorbei an der Lieblingsecke', where: 'bekannte Reizstelle',
    how: ['Geh an einer Stelle vorbei, an die er sonst unbedingt hin will – mit Abstand.', 'Leine locker: viele Leckerlis an der Naht. Wird sie straff: Kehrtwende, mehr Abstand.', 'Am Ende darf er zur Belohnung hin: „Geh schnüffeln!“.'],
    why: 'Lockere Leine klappt schon oft. Jetzt kommt die echte Ablenkung dazu.' },
  { id: 'neu', st: 3, ic: '🗺️', t: 'Neue Strecke', where: 'Weg, den er nicht kennt',
    how: ['Eine kurze neue Strecke – neue Gerüche sind für ihn die größte Versuchung.', 'Dieselben Regeln: straff = stehen, locker = weiter, Schnüffeln auf Zeichen.', 'Lieber kurz und gut als lang und ziehig.'],
    why: 'Was zuhause klappt, muss auch an neuen Orten klappen – darum geht es ja: ihn mitnehmen.' },
];
export const exById = id => EX.find(x => x.id === id);
export const LEASH = [[1, '🚜', 'Nur gezogen'], [2, '😬', 'Viel gezogen'], [3, '🙂', 'Mal so, mal so'], [4, '😊', 'Meist locker'], [5, '🪶', 'Ganz locker']];
export const DRAGS = [[0, 'gar nicht'], [2, '1–2×'], [4, '3–5×'], [8, '6–10×'], [12, 'öfter']];

const walks = () => (S.dogWalks || []).slice().sort((a, b) => a.ts - b.ts);
const sessions = () => S.log.filter(e => e.kind === 'dog');
const num = n => n.toFixed(1).replace('.', ',');
// stars a dog session took from today's cap (heute.js tick counts it in)
export const dogStarsToday = () => dayLog(today()).filter(e => e.kind === 'dog').reduce((a, e) => a + (e.stars || 0), 0);
export const dogDoneToday = () => sessions().find(e => e.day === today()) || null;

// today's exercise: from the walks BEFORE today (so it doesn't change after logging one), stable within a day
export function dogPick(t = today()) {
  const before = walks().filter(w => w.day < t), rec = before.slice(-5), last = before[before.length - 1];
  const done = sessions().filter(e => e.day < t), times = id => done.filter(e => e.ex === id).length;
  const lastDay = id => { const e = done.filter(x => x.ex === id).pop(); return e ? e.day : null; };
  const yest = (done[done.length - 1] || {}).ex;
  if (!done.length) return { ex: exById('blick'), why: 'Der erste Tag: Wir fangen mit der Grundlage an.' };
  if (last && last.d >= 8) return { ex: exById('baum'), why: `Bei der letzten Runde hat er ${DRAGS.find(x => x[0] === last.d)[1].replace('×', ' Mal')} gezogen – heute also: Ziehen hält alles an.` };
  const avg = rec.length ? rec.reduce((a, w) => a + w.l, 0) / rec.length : 0;
  const st = !rec.length || avg < 2.5 ? 1 : avg < 3.8 ? 2 : 3;
  const stWhy = !rec.length ? 'Noch keine Runde eingetragen – deshalb erst Grundlagen.'
    : st === 1 ? `Die letzten Runden waren eher ziehig (Ø ${num(avg)} von 5) – deshalb noch Grundlagen.`
    : st === 2 ? `Die Leine wird lockerer (Ø ${num(avg)} von 5) – jetzt wird Schnüffeln zur Belohnung.`
    : `Meist schon locker (Ø ${num(avg)} von 5) – Zeit für echte Ablenkung.`;
  // the stage's exercise done least often; not yesterday's; ties broken by the day so it varies
  const pool = EX.filter(x => x.st === st), seed = parse(t).getDate();
  const ranked = pool.map((x, i) => [x, times(x.id) * 10 + (x.id === yest ? 5 : 0) + ((i + seed) % pool.length) / 10]).sort((a, b) => a[1] - b[1]);
  const ex = ranked[0][0], ld = lastDay(ex.id);
  const fresh = ld ? `Zuletzt geübt am ${parse(ld).getDate()}. ${C.MONTHS[parse(ld).getMonth()]}.` : 'Habt ihr noch nie geübt.';
  return { ex, why: stWhy + ' ' + fresh };
}

const rulesHTML = () => `<ol class="dg-rules">${RULES.map(([t, x]) => `<li><b>${esc(t)}</b> <span>${esc(x)}</span></li>`).join('')}</ol>`;
export function rulesModal() {
  modal(`<h2>🐕 Gassi-Regeln</h2><p class="muted">Damit Ziehen nie belohnt wird – bei keinem von uns.</p>${rulesHTML()}<div class="row"><button class="btn" data-a="close">Alles klar</button></div>`);
}

// Home: his card (today's exercise) · her quiet link (rules only)
export function dogHomeCard() {
  if (!dogHere()) return '';
  const p = dogPick(), d = dogDoneToday();
  return `<button class="card hcard dg-home" data-a="hund"><span class="hc-txt"><b>🐕 Hundeschule${d ? ' ✓' : ''}</b><span class="muted">${d ? 'Heute geübt: ' + esc(exById(d.ex) ? exById(d.ex).t : '') : 'Heute: ' + p.ex.ic + ' ' + esc(p.ex.t) + ' · 5 Min.'}</span></span><span class="hc-go">›</span></button>`;
}
export const dogRulesLink = () => dogHere() ? '' : `<button class="gamelink dglink" data-a="hundregeln">🐕 <b>Gassi-Regeln</b></button>`;

export function viewHund() {
  if (!dogHere()) { ui.sub = null; return ''; }
  const p = dogPick(), d = dogDoneToday(), ex = d && exById(d.ex) || p.ex, t = today();
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  h += `<div class="sec-title" style="margin-top:0">🐕 Hundeschule <small class="muted">Lockere Leine</small></div>`;
  h += `<div class="card dg-ex${d ? ' done' : ''}"><span class="dg-eye">${d ? 'Heute geübt ✓' : 'Heute · 5 Minuten · ' + esc(ex.where)}</span>
    <span class="dg-t">${ex.ic} ${esc(ex.t)}</span>
    <ol class="dg-how">${ex.how.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <p class="dg-why"><b>Warum:</b> ${esc(ex.why)}</p>
    ${d ? '' : `<p class="dg-why"><b>Warum heute:</b> ${esc(p.why)}</p>`}
    ${d ? `<button class="btn soft wide" data-a="hundundo">↶ Doch nicht geübt</button>` : `<button class="btn green wide" data-a="hunddone" data-ex="${ex.id}">✓ Geübt${workToday().length + dogStarsToday() < C.CAP ? ' · +1 ⭐' : ''}</button>`}</div>`;
  // the walks
  const ws = walks(), mine = ws.filter(w => w.day === t);
  h += `<div class="sec-title">🐾 Gassi-Runden</div><div class="card dg-walks">
    <button class="btn blue wide" data-a="hundwalk">🐾 Runde eintragen</button>
    ${mine.length ? `<p class="muted dg-n">Heute ${mine.length === 1 ? 'eine Runde' : mine.length + ' Runden'} eingetragen.</p>` : ''}
    ${ws.length ? `<div class="dg-dots" aria-label="Die letzten Runden">${ws.slice(-14).map(w => `<span class="dg-dot l${w.l}" title="${esc(LEASH[w.l - 1][2])}">${LEASH[w.l - 1][1]}</span>`).join('')}</div>
      <p class="muted dg-n">Die letzten ${Math.min(14, ws.length)} Runden, links die älteste.</p>` : '<p class="muted dg-n">Nach jeder Runde zwei Tipps: Wie war die Leine, wie oft hat er gezogen? Daraus sucht die App die nächste Übung aus.</p>'}
  </div>`;
  h += `<div class="sec-title">📜 Gassi-Regeln <small class="muted">sieht auch ${esc(pn())}</small></div><div class="card">${rulesHTML()}</div>`;
  return h;
}

function walkModal(l) {
  if (!l) return modal(`<h2>🐾 Wie war die Leine?</h2><div class="dg-pick">${LEASH.map(([v, ic, x]) => `<button class="dg-opt" data-a="hundl" data-v="${v}"><span>${ic}</span><b>${esc(x)}</b></button>`).join('')}</div><div class="row"><button class="btn soft" data-a="close">Abbrechen</button></div>`, '', true);
  modal(`<h2>🐾 Wie oft hat er gezogen?</h2><p class="muted">So richtig, mit Zerren. Grob geschätzt reicht.</p><div class="dg-pick">${DRAGS.map(([v, x]) => `<button class="dg-opt" data-a="hundd" data-l="${l}" data-v="${v}"><b>${esc(x)}</b></button>`).join('')}</div><div class="row"><button class="btn soft" data-a="hundwalk">← Zurück</button></div>`, '', true);
}

Object.assign(A, {
  hund() { closeModal(); ui.tab = 'home'; ui.sub = 'hund'; render(); scrollTo(0, 0); },
  hundregeln() { rulesModal(); },
  hundwalk() { walkModal(0); },
  hundl(el) { walkModal(+el.dataset.v); },
  hundd(el) {
    const w = { id: 'w' + Date.now().toString(36), day: today(), ts: Date.now(), l: +el.dataset.l, d: +el.dataset.v };
    S.dogWalks = (S.dogWalks || []).concat(w); closeModal(); commit();
    undoToast('🐾 Runde eingetragen', () => { S.dogWalks = S.dogWalks.filter(x => x.id !== w.id); commit(); });
  },
  hunddone(el) {
    if (dogDoneToday()) return;
    const ex = exById(el.dataset.ex); if (!ex) return;
    const stars = workToday().length + dogStarsToday() < C.CAP ? 1 : 0;
    S.log.push({ id: 'dog-' + today(), text: '🐕 Hundeschule: ' + ex.t, kind: 'dog', ex: ex.id, day: today(), ts: Date.now(), stars });
    earn(stars); floatStar(el, stars ? '+1 ⭐' : '✓'); commit();
  },
  hundundo() {
    const e = dogDoneToday(); if (!e) return;
    S.log = S.log.filter(x => x !== e); S.stars = Math.max(0, S.stars - (e.stars || 0)); S.earned = Math.max(0, S.earned - (e.stars || 0)); commit();
  },
});
