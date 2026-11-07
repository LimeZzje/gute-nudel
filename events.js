// Events: 🍼 Babyerstausstattung, 🎂 Julias Geburtstagskuchen, 🎁 Hello Nudel (gift + slide deck), 🥜 Snack-Labor, the events page.
import * as D from './data.js';
import * as B from './baby.js';
import * as G from './geburtstag.js';
import * as HN from './hellonudel.js';
import * as SL from './hn_slides.js';
import * as SN from './snacks.js';
import { $, closeModal, commit, confetti, esc, floatStar, key, lockScroll, longDate, modal, toast, today, uid, unlockScroll } from './core.js';
import { A, S, ui } from './state.js';
import { earn, pn, vorrat } from './sync.js';
import { endCookMode, haveFor, recipeById, recipePage, styleOf, viewCookMode } from './kochbuch.js';
import { viewHome } from './home.js';
import { render, tabChip } from './app.js';

// ---------- 🍼 EVENT: Babyerstausstattung (2026-10-10, baby.js) ----------
// One shared list for both until 10 January. Every tick (by either of you) = +1 ⭐ for BOTH (outside the daily cap),
// untick = the star goes back. The stars follow the shared ticks: a log entry 'baby-<item>' per ticked item.
// All ticked → the event ends, its fun statistics stay on Home ("Vergangene Events"). Deadline first → it just vanishes.
export const babyLive = () => Date.now() < B.END && !(S.events || []).some(e => e.id === B.ID);
const babyOn = id => { const x = B.state(S.babyMine, S.partnerBaby, id); return !!(x && x[0]); };
const babyCount = () => B.ITEMS.filter(it => babyOn(it.id)).length;
export function babyReconcile() {   // → {add, sub}: stars granted / taken back now
  const r = { add: 0, sub: 0 };
  if (!S || !babyLive()) return r;
  for (const it of B.ITEMS) {
    const lid = 'baby-' + it.id, has = S.log.some(e => e.id === lid), on = babyOn(it.id);
    if (on && !has) { S.log.push({ id: lid, text: '🍼 ' + it.name, kind: 'baby', day: today(), ts: Date.now(), stars: 1 }); earn(1); r.add++; }
    else if (!on && has) { S.log = S.log.filter(e => e.id !== lid); S.stars = Math.max(0, S.stars - 1); S.earned = Math.max(0, S.earned - 1); r.sub++; }
  }
  if (B.ITEMS.every(it => babyOn(it.id))) {
    const ticks = {}; B.ITEMS.forEach(it => { ticks[it.id] = B.state(S.babyMine, S.partnerBaby, it.id)[1]; });
    (S.events = S.events || []).push(B.record(ticks));
    ui.babyParty = true; if (ui.sub === 'baby') ui.sub = null;
  }
  return r;
}
export function babyParty() {   // everything ticked: once, on the phone that noticed it
  if (!ui.babyParty) return;
  ui.babyParty = false; render(); confetti(140);
  modal(`<div class="bparty">${BSKY}</div><h2>Alles bereit! 🍼</h2><p>Alle ${B.ITEMS.length} Sachen sind abgehakt. Der kleine Mensch kann kommen. 💛</p>
    <p class="muted">Eure Statistik wartet auf Home unter „Vergangene Events“.</p>
    <div class="row"><button class="btn" data-a="events">Ansehen</button><button class="btn soft" data-a="close">Hach 💛</button></div>`);
}
// a little night sky: moon, twinkling stars, a sleeping cloud
const BSKY = `<svg class="bsky" viewBox="0 0 220 96" aria-hidden="true">
  <path class="bm" d="M128 12a28 28 0 1 0 32 38 22 22 0 1 1-32-38z"/>
  <path class="bs s1" d="M44 18l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
  <path class="bs s2" d="M186 24l2 5 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z"/>
  <circle class="bs s3" cx="80" cy="12" r="3"/><circle class="bs s1" cx="200" cy="58" r="2.5"/><circle class="bs s2" cx="18" cy="52" r="2"/>
  <path class="bc" d="M40 86h120a17 17 0 0 0 0-34 25 25 0 0 0-46-8 19 19 0 0 0-32 10 15 15 0 0 0-42 32z"/>
  <path class="bz" d="M86 70q4 3 8 0M106 70q4 3 8 0"/></svg>`;
const CDL = { d: ['Tag', 'Tage'], h: ['Stunde', 'Stunden'], m: ['Minute', 'Minuten'], s: ['Sekunde', 'Sekunden'] };
function cdHtml(big) {
  const l = B.left();
  return `<span class="bcd${big ? ' big' : ''}" data-cd>${['d', 'h', 'm', 's'].map(k =>
    `<span class="bcd-u u-${k}"><b data-u="${k}">${k === 'd' ? l[k] : String(l[k]).padStart(2, '0')}</b><small data-l="${k}">${CDL[k][l[k] === 1 ? 0 : 1]}</small></span>`).join('')}</span>`;
}
setInterval(() => {   // the countdown ticks without redrawing the page
  const els = document.querySelectorAll('[data-cd]'); if (!els.length || !S) return;
  if (!babyLive()) { render(); return; }
  const l = B.left();
  els.forEach(c => {
    c.querySelectorAll('[data-u]').forEach(b => { const k = b.dataset.u; b.textContent = k === 'd' ? l[k] : String(l[k]).padStart(2, '0'); });
    c.querySelectorAll('[data-l]').forEach(x => { x.textContent = CDL[x.dataset.l][l[x.dataset.l] === 1 ? 0 : 1]; });
  });
}, 1000);
function babyBar() { const n = babyCount(), N = B.ITEMS.length; return `<span class="bbar"><i style="width:${n / N * 100}%"></i></span><span class="bc-n"><b>${n}</b> von ${N} bereit</span>`; }
function babyCard() {
  if (!babyLive()) return '';
  return `<button class="card babycard" data-a="baby">${BSKY}    <span class="bc-t">Babyerstausstattung</span>${cdHtml()}${babyBar()}<span class="bc-go">Zur Liste ›</span></button>`;
}
export function viewBaby() {
  if (!babyLive()) { ui.sub = null; return viewHome(); }
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  h += `<div class="card babycard hero">${BSKY}<span class="bc-eye">Willkommen im Januar, kleiner Mensch</span><span class="bc-t">Babyerstausstattung</span>
    ${cdHtml(true)}<span class="bc-until">bis zum 10. Januar</span>${babyBar()}
    <span class="bc-info">Jeder Haken: +1 ⭐ für dich <i>und</i> für ${esc(pn())}. Haken weg = Stern weg.</span></div>`;
  for (const g of B.GROUPS) {
    const gn = g.items.filter(it => babyOn(it.id)).length, full = gn === g.items.length;
    h += `<div class="card bgroup t-${g.tone}"><div class="bg-head"><span class="bg-ic">${g.icon}</span><span class="bg-tt"><b>${esc(g.title)}</b><span class="muted">${esc(g.where)}</span></span><span class="bg-n${full ? ' full' : ''}">${full ? '✓' : gn + '/' + g.items.length}</span></div>
      ${g.items.map(it => { const on = babyOn(it.id), open = ui.bopen === it.id, more = it.note || it.shops.length;
        return `<div class="bitem${on ? ' done' : ''}"><button class="bchk" data-a="btick" data-id="${it.id}" aria-pressed="${on}" aria-label="${esc(it.name)} ${on ? 'nicht mehr abhaken' : 'abhaken'}"></button>
          <button class="btxt" data-a="bopen" data-id="${it.id}"${more ? '' : ' disabled'}><span>${esc(it.name)}</span>${more ? `<span class="bmore">${open ? '▾' : '▸'}</span>` : ''}</button>
          ${open ? `<div class="bnote">${it.note ? `<p>${esc(it.note)}</p>` : ''}${it.shops.length ? `<p class="bshops">${it.shops.map((x, i) => `<span class="bshop${i ? '' : ' top'}">${i ? '' : '♥ '}${esc(x)}</span>`).join('')}</p>` : ''}</div>` : ''}</div>`; }).join('')}
      ${g.tip ? `<p class="hint">💡 ${esc(g.tip)}</p>` : ''}</div>`;
  }
  return h;
}
// Events whose time ran out get a card too (user 2026-10-20) — only what DID happen, never "missed" lines (no pressure).
export function pastEvents() {
  const now = Date.now(), out = (S.events || []).slice(), has = id => out.some(e => e.id === id);
  if (!has(G.ID) && now >= G.END) out.push({ id: G.ID, icon: '🎂', title: 'Julias Geburtstag', done: G.END, ended: true, lines: [
    ['🎂', 'Julias Geburtstag – 18. & 19. Oktober.'],
    ['🧺', 'Hello Nudel – die Einkaufsliste geht mit einem Tipp zu Picnic.'],
    ['🍰', 'Die Geburtstagskuchen bleiben im Kochbuch – backen könnt ihr sie jederzeit.']] });
  if (now >= HN.END) {
    const dl = new Set([...(S.vorratAdd || []), ...((S.partnerVorrat || {}).add || [])].filter(x => x && x.pic).map(x => x.pic)).size;
    const o = S.hnOpen && new Date(S.hnOpen);
    out.push({ id: 'hello-nudel', icon: '🎁', title: 'Hello Nudel', done: HN.END, ended: true, go: 'hello', btn: '🕊️ Hello Nudel ansehen', lines: [
      ['🎀', o ? `Ausgepackt am ${o.getDate()}.${o.getMonth() + 1}. um ${String(o.getHours()).padStart(2, '0')}:${String(o.getMinutes()).padStart(2, '0')} Uhr.` : 'Dabei seit dem 18. Oktober.'],
      ...(dl ? [['🚚', dl === 1 ? 'Schon eine Picnic-Lieferung bis in den Vorrat.' : `Schon ${dl} Picnic-Lieferungen bis in den Vorrat.`]] : []),
      ['🧺', 'Hello Nudel bleibt – unten im Tab 🧺 Hello Nudel.']] });
  }
  if (!has(SN.ID) && now >= SN.END) { const m = snMade(); out.push({ id: SN.ID, icon: '🥜', title: SN.TITLE, done: SN.END, ended: true, lines: [...(m.length ? [['🥜', `${m.length === 1 ? 'Ein Snack' : m.length + ' Snacks'} zusammen gemacht.`]] : []), ['📖', 'Alle Snacks stehen jetzt im Kochbuch unter 🥜 Snacks.']] }); }
  if (!has(B.ID) && now >= B.END) {
    const n = B.ITEMS.filter(it => babyOn(it.id)).length;
    out.push({ id: B.ID, icon: '🍼', title: B.TITLE, done: B.END, ended: true, lines: [['🍼', `${n} von ${B.ITEMS.length} Sachen zusammen vorbereitet.`], ['⭐', `${n} Sterne für jeden von euch.`]] });
  }
  return out.sort((a, b) => b.done - a.done);
}
export function viewEvents() {
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button><div class="sec-title" style="margin-top:0">Vergangene Events</div>`;
  for (const e of pastEvents()) {
    h += `<div class="card evcard">${e.id === B.ID ? BSKY : ''}<h3>${esc(e.icon + ' ' + e.title)}</h3><p class="muted">${e.ended ? 'Vorbei seit' : 'Abgeschlossen am'} ${esc(longDate(key(new Date(e.done))))}</p>
      <ul class="evlines">${e.lines.map(([ic, t]) => `<li><span>${esc(ic)}</span><span>${esc(t)}</span></li>`).join('')}</ul>
      ${e.go ? `<button class="btn soft wide" data-a="${e.go}" style="margin-top:10px">${esc(e.btn)}</button>` : e.id === SN.ID ? `<button class="btn soft wide" data-a="snbook" style="margin-top:10px">🥜 Zu den Snacks im Kochbuch</button>` : ''}</div>`;
  }
  return h;
}
A.baby = () => { closeModal(); ui.tab = 'home'; ui.sub = 'baby'; render(); scrollTo(0, 0); };
A.events = () => { closeModal(); ui.tab = 'home'; ui.sub = 'events'; render(); scrollTo(0, 0); };
A.babyback = () => { ui.sub = ui.sub === 'hello' && ui.subBack || null; ui.subBack = null; render(); scrollTo(0, 0); };
A.bopen = el => { ui.bopen = ui.bopen === el.dataset.id ? null : el.dataset.id; render(); };
A.btick = el => {
  if (!babyLive()) return;
  const id = el.dataset.id, on = babyOn(id);
  (S.babyMine = S.babyMine || {})[id] = [on ? 0 : 1, Date.now()];
  babyReconcile();
  floatStar(el, on ? '−1 ⭐' : '+1 ⭐');
  commit(true); babyParty();
};

// ---------- 🎂 EVENT: Julias Geburtstagskuchen (2026-10-18, geburtstag.js) ----------
// Three cakes from the Vorrat, each a real cookbook page with cooking mode (recipeById knows them; they're in no list).
// The first cake rated in cooking mode (on either phone: the partner's comes in post.cooked) ends it: +5 ⭐ each (log
// entry 'gb-<event>', kind 'event', outside the daily cap), a party, and a card under "Vergangene Events".
const gbDone = () => (S.events || []).some(e => e.id === G.ID);
export const gbLive = () => !gbDone() && Date.now() < G.END;
const gbCakes = () => G.ORDER.map(id => recipeById(id)).filter(Boolean);   // (her wish is a book recipe: there once the book loaded)
const gbBaked = () => [...(S.cookLog || []), ...(S.partnerCooked || [])].filter(x => G.isCake(x.rid)).sort((a, b) => a.ts - b.ts)[0];
export function gbReconcile() {   // → true when the event ended just now (stars granted)
  if (!S || gbDone()) return false;
  const c = gbBaked(); if (!c) return false;
  const lid = 'gb-' + G.ID;
  if (!S.log.some(e => e.id === lid)) { S.log.push({ id: lid, text: '🎂 Geburtstagskuchen gebacken', kind: 'event', day: today(), ts: Date.now(), stars: G.STARS }); earn(G.STARS); }
  (S.events = S.events || []).push(G.record(c, c.taste));
  ui.gbParty = true; if (ui.sub === 'kuchen') { ui.sub = null; ui.rid = null; }
  return true;
}
export function gbParty() {
  if (!ui.gbParty) return;
  ui.gbParty = false; render(); confetti(160);
  const c = gbBaked();
  modal(`<div class="gbparty">${GBART}</div><h2>Happy Birthday, Julia! 🎂</h2><p>${c ? esc(c.title) + ' ist gebacken.' : 'Der Kuchen ist gebacken.'} Das habt ihr zusammen geschafft. 💛</p>
    <p><b>+${G.STARS} ⭐</b> für dich und für ${esc(pn())}.</p>
    <div class="row"><button class="btn" data-a="events">Zu den Events</button><button class="btn soft" data-a="close">Jetzt wird gegessen 🍰</button></div>`);
}
// balloons, bunting, a cake with three candles (the flames flicker in CSS)
const GBART = `<svg class="gbart" viewBox="0 0 240 120" aria-hidden="true">
  <path class="gb-line" d="M0 14 Q60 34 120 16 T240 14"/>
  ${[[12, 18, 'a'], [36, 24, 'b'], [60, 27, 'c'], [84, 24, 'a'], [108, 19, 'b'], [132, 17, 'c'], [156, 21, 'a'], [180, 23, 'b'], [204, 19, 'c'], [228, 15, 'a']].map(([x, y, k]) => `<path class="gb-flag f${k}" d="M${x - 8} ${y - 2}h16l-8 13z"/>`).join('')}
  <g class="gb-bal b1"><path d="M30 92 q-6 -10 2 -22" class="gb-str"/><ellipse cx="30" cy="56" rx="13" ry="16"/></g>
  <g class="gb-bal b2"><path d="M212 96 q6 -12 -2 -24" class="gb-str"/><ellipse cx="210" cy="58" rx="12" ry="15"/></g>
  <g class="gb-cake"><rect x="88" y="78" width="64" height="30" rx="5" class="ck1"/><rect x="96" y="62" width="48" height="18" rx="4" class="ck2"/>
    <path d="M88 86 q8 6 16 0 t16 0 t16 0 t16 0" class="ck-drip"/>
    ${[108, 120, 132].map((x, i) => `<rect x="${x - 2}" y="48" width="4" height="15" rx="1.5" class="ck-c"/><path class="ck-fl fl${i}" d="M${x} 38 q4 6 0 10 q-4 -4 0 -10z"/>`).join('')}</g></svg>`;
function gbCard() {
  if (!gbLive()) return '';
  return `<button class="card gbcard" data-a="kuchen">${GBART}<span class="gb-eye">Heute &amp; morgen wird gefeiert</span>
    <span class="gb-t">${esc(G.TITLE)}</span>
    <span class="gb-cakes">${gbCakes().map(c => { const [ic, l] = G.LABEL[c.id]; return `<span class="gb-chip${c.id === G.WISH ? ' wish' : ''}">${ic} ${l}</span>`; }).join('')}</span>
    <span class="gb-go">Ihr Wunschkuchen + vier aus eurem Vorrat · +${G.STARS} ⭐ für jeden ›</span></button>`;
}
export function viewKuchen() {
  if (!gbLive()) { ui.sub = null; ui.rid = null; return viewHome(); }
  const r = ui.rid && G.isCake(ui.rid) ? recipeById(ui.rid) : null;
  if (r && ui.cstep != null) return viewCookMode();
  if (r) {   // the cake's page, exactly as in the cookbook (its own paper: crayon / warm / Culinarius)
    const theme = styleOf(r);
    return `<button class="btn soft" data-a="gbcakes" style="margin:4px 0 12px">← Zu den Kuchen</button>
      <div class="cbook cb-top gb-cbook"><div class="cb-body"><div class="bk-stage"><div class="bk-page cur bp-${theme}" data-key="r-${esc(r.id)}"><div class="bp">${recipePage(r)}</div></div></div></div></div>`;
  }
  const V = vorrat();
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  h += `<div class="card gbcard hero">${GBART}<span class="gb-eye">Heute &amp; morgen wird gefeiert</span><span class="gb-t">${esc(G.TITLE)}</span>
    <span class="gb-info">Ganz oben ihr Wunschkuchen, darunter vier, die mit eurem Vorrat gehen (ohne Milch, nur Backpulver fehlt). Den ersten, den ihr backt und bewertet, feiert die App mit <b>+${G.STARS} ⭐ für dich und für ${esc(pn())}</b>.</span></div>`;
  for (const c of gbCakes()) {
    const [ic, lv, how] = G.LABEL[c.id], miss = V.length ? haveFor(c, V).missing.filter(t => !/backpulver|streusel/i.test(t)) : [];
    const wish = c.id === G.WISH;
    h += `<button class="card gbcake t-${styleOf(c)}${wish ? ' wish' : ''}" data-a="gbcake" data-id="${esc(c.id)}">${wish ? '<span class="gbk-rib">💛 Wunsch</span>' : ''}<span class="gbk-lv">${ic} ${lv} <small>· ${how}</small></span>
      <span class="gbk-t">${esc(c.title)}</span><span class="gbk-m">⏱ ${c.min} Min. · für ${esc(c.serves)} · ${c.steps.length} Schritte</span>
      <span class="gbk-v">${!V.length ? '' : miss.length ? '🛒 fehlt: ' + esc(miss.join(', ')) : '🧊 alles daheim (bis aufs Backpulver)'}</span>${wish ? '<span class="gbk-v">🤰 Mit dem Hinweis auf der Seite schwangerschaftssicher</span>' : ''}<span class="gbk-go">Backen ›</span></button>`;
  }
  return h;
}
A.kuchen = () => { closeModal(); ui.tab = 'home'; ui.sub = 'kuchen'; ui.rid = null; ui.cstep = null; render(); scrollTo(0, 0); };
A.gbcake = el => { ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = []; render(); scrollTo(0, 0); };
A.gbcakes = () => { endCookMode(); ui.rid = null; ui.sides = []; render(); scrollTo(0, 0); };

// ---------- 🎁 GIFT: Hello Nudel (2026-10-18, hellonudel.js) ----------
// On HER phone a wrapped present on Home; unwrapping (S.hnOpen, syncs to her other devices) shows the picture + the page
// and unlocks the 🧺 Picnic button. His phone never hides the button (he built it). After unwrapping the card stays small until HN.END.
export const hnUnwrapped = () => D.me() !== 'stand' || !!S.hnOpen;
function hnCard() {
  if (Date.now() >= HN.END) return '';
  if (!hnUnwrapped()) return `<button class="card hncard" data-a="hello">${HN.BOX}<span class="gb-eye">Da ist noch was für dich …</span>
    <span class="gb-t">Ein Geschenk!</span><span class="gb-go">Tippen zum Auspacken 🎀</span></button>`;
  return `<button class="card hcard hnmini" data-a="hello"><span class="hl-ic">🕊️</span><span class="hc-txt"><b>Hello Nudel</b><span class="muted">So kommt deine Einkaufsliste zu Picnic</span></span><span class="hc-go">›</span></button>`;
}
export function viewHello() {
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  if (!hnUnwrapped()) return h + `<div class="card hncard hero">${HN.BOX}<span class="gb-eye">Alles Liebe zum Geburtstag</span><span class="gb-t">Für dich, Julia</span>
    <span class="gb-info">Kein Kuchen, kein Blumenstrauß – etwas, das dir ab jetzt jede Woche Zeit schenkt.</span>
    <button class="btn green" data-a="hnopen" style="margin-top:14px">🎀 Auspacken</button></div>`;
  return h + `<div class="card hnhero"><span class="gb-eye">Dein Geburtstagsgeschenk von ${esc(pn())}</span><span class="gb-t">Hello Nudel</span>
    <span class="gb-info">Deine Einkaufsliste kommt jetzt mit einem Tipp bei Picnic an – und Picnic bringt alles bis vor eure Tür.</span>
    ${HN.ART}</div>
    <button class="card hndeckcard" data-a="hndeck"><span class="hd-ic">🎬</span><span class="hc-txt"><b>Hinter den Kulissen</b><span class="muted">Die Präsentation: wie ${esc(pn())} das wirklich gebaut hat – Server, API, Taube & Co.</span></span><span class="hc-go">▶</span></button>
    <div class="card hnpage">${HN.page(esc(pn()))}
    <button class="btn green wide" data-a="hnshop" style="margin-top:10px">🧺 Gleich ausprobieren</button>
    <p class="hn-sign">Alles Liebe zum Geburtstag 💛<br>${esc(pn())}</p></div>`;
}
// 🎬 the slide show: its own full-screen layer (#deck) above everything; swipe, ‹ › buttons, dots; Android back closes it
function hnDeck(i) {
  const all = SL.SLIDES(esc(pn())), n = all.length; i = Math.max(0, Math.min(n - 1, i)); ui.hnSlide = i;
  let d = $('#deck');
  if (!d) {
    d = document.createElement('div'); d.id = 'deck'; d.className = 'hn-deck'; document.body.appendChild(d); lockScroll();
    let x0 = null;
    d.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) hnDeck(ui.hnSlide + (dx < 0 ? 1 : -1)); });
  }
  const s = all[i];
  d.innerHTML = `<div class="hd-top"><span class="hd-n">${i + 1} / ${n}</span><button class="mini-btn" data-a="hndeckx" aria-label="Schließen">✕</button></div>
    <div class="hd-slide" key="${i}"><h2 class="hd-t">${s.t}</h2><svg class="hd-art" viewBox="0 0 300 170" aria-hidden="true">${s.art}</svg>
      <div class="hd-p">${s.p.map(x => `<p>${x}</p>`).join('')}</div></div>
    <div class="hd-nav"><button class="btn soft" data-a="hndeckgo" data-v="${i - 1}" ${i ? '' : 'disabled'}>‹ Zurück</button>
      <span class="hd-dots">${all.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
      ${i < n - 1 ? `<button class="btn green" data-a="hndeckgo" data-v="${i + 1}">Weiter ›</button>` : '<button class="btn green" data-a="hndeckx">Fertig 💛</button>'}</div>`;
  d.querySelector('.hd-slide').scrollTop = 0;
}
export const hnDeckClose = () => { const d = $('#deck'); if (d) { d.remove(); unlockScroll(); } };
A.hndeck = () => hnDeck(0);
A.hndeckgo = el => hnDeck(+el.dataset.v);
A.hndeckx = () => hnDeckClose();
A.hntab = () => { closeModal(); ui.tab = 'hello'; ui.sub = null; tabChip(); render(); scrollTo(0, 0); };
A.hello = () => { closeModal(); ui.subBack = ui.sub === 'events' ? 'events' : null; if (ui.tab !== 'hello') ui.tab = 'home'; ui.sub = 'hello'; render(); scrollTo(0, 0); };
A.hnopen = () => { S.hnOpen = Date.now(); commit(); render(); scrollTo(0, 0); confetti(160); };
A.hnshop = () => { ui.sub = null; ui.tab = 'ruhe'; ui.qtab = 'einkauf'; render(); scrollTo(0, 0); };

// ---------- 🥜 EVENT: Nudels Snack-Labor (2026-11-07, snacks.js) ----------
// Nine snacks in four drawers + the 🧪 Mischpult (own mix → S.myRecipes 'mix-…'). Each one rated in cooking mode on either
// phone (partner's via post.cooked) is a stamp in the jar; GOAL different ones finish it: +5 ⭐ each (log 'sn-<event>',
// kind 'event', outside the daily cap), a party, a card under "Vergangene Events", the recipes move into the Kochbuch.
const snDone = () => (S.events || []).some(e => e.id === SN.ID);
export const snLive = () => !snDone() && Date.now() >= SN.START && Date.now() < SN.END;
// the different snacks made so far, both phones together (team count, never per person)
export function snMade() {
  const seen = new Set(), out = [];
  for (const x of [...(S.cookLog || []), ...(S.partnerCooked || [])].filter(x => x && SN.counts(x.rid) && (x.ts || 0) >= SN.START).sort((a, b) => a.ts - b.ts))
    if (!seen.has(x.rid)) { seen.add(x.rid); out.push(x); }
  return out;
}
export function snReconcile() {   // → true when the event ended just now (stars granted)
  if (!S || snDone() || Date.now() < SN.START) return false;
  const m = snMade(); if (m.length < SN.GOAL) return false;
  const lid = 'sn-' + SN.ID;
  if (!S.log.some(e => e.id === lid)) { S.log.push({ id: lid, text: '🥜 Snack-Labor geschafft', kind: 'event', day: today(), ts: Date.now(), stars: SN.STARS }); earn(SN.STARS); }
  (S.events = S.events || []).push(SN.record(m.slice(0, 8)));
  ui.snParty = true; if (ui.sub === 'snack') { ui.sub = null; ui.rid = null; }
  return true;
}
export function snParty() {
  if (!ui.snParty) return;
  ui.snParty = false; render(); confetti(160);
  modal(`<div class="snparty">${snJar(SN.GOAL)}</div><h2>Snack-Labor geschafft! 🥜</h2><p>${SN.GOAL} eigene Snacks – zusammen gemacht. 💛</p>
    <p><b>+${SN.STARS} ⭐</b> für dich und für ${esc(pn())}.</p><p class="muted">Alle Rezepte stehen ab jetzt im Kochbuch unter <b>🥜 Snacks</b>.</p>
    <div class="row"><button class="btn" data-a="snbook">Zu den Snacks</button><button class="btn soft" data-a="close">Jetzt wird geknabbert</button></div>`);
}
// a mason jar that fills with one layer per snack made (nuts, cherries, chocolate …)
const LAYERS = ['#c98a4b', '#b8463c', '#5b3a29', '#e3b04b', '#7a9a52'];
function snJar(n) {
  const k = Math.min(n, SN.GOAL), h = 58 / SN.GOAL;
  return `<svg class="snjar" viewBox="0 0 120 120" aria-hidden="true">
    <rect x="34" y="10" width="52" height="12" rx="3" class="sj-lid"/><path class="sj-glass" d="M30 26h60q6 0 6 8v62q0 14-14 14H38q-14 0-14-14V34q0-8 6-8z"/>
    ${Array.from({ length: k }, (_, i) => `<path class="sj-l" fill="${LAYERS[i % LAYERS.length]}" d="M27 ${104 - (i + 1) * h}h66v${h}H27z" style="animation-delay:${i * .15}s"/>`).join('')}
    ${Array.from({ length: k * 4 }, (_, i) => `<circle class="sj-dot" cx="${34 + (i * 17) % 52}" cy="${104 - h * (Math.floor(i / 4) + .5)}" r="2.6"/>`).join('')}
    <path class="sj-shine" d="M34 36v52"/><rect x="40" y="56" width="40" height="20" rx="3" class="sj-label"/><text x="60" y="70" class="sj-t">${k}/${SN.GOAL}</text></svg>`;
}
export function viewSnacks() {
  if (!snLive()) { ui.sub = null; ui.rid = null; return viewHome(); }
  const r = ui.rid ? recipeById(ui.rid) : null;
  if (r && ui.cstep != null) return viewCookMode();
  if (r) {   // the snack's page, as in the cookbook (its own paper: crayon / warm / Culinarius)
    return `<button class="btn soft" data-a="snlist" style="margin:4px 0 12px">← Zum Snack-Labor</button>
      <div class="cbook cb-top gb-cbook"><div class="cb-body"><div class="bk-stage"><div class="bk-page cur bp-${styleOf(r)}" data-key="r-${esc(r.id)}"><div class="bp">${recipePage(r)}</div></div></div></div></div>`;
  }
  const V = vorrat(), made = snMade(), done = new Set(made.map(x => x.rid));
  let h = `<button class="btn soft" data-a="babyback" style="margin:4px 0 12px">← Zurück</button>`;
  h += `<div class="card sncard hero">${snJar(made.length)}<span class="sn-eye">Gute-Nudel-Event</span><span class="sn-t">🥜 ${esc(SN.TITLE)}</span>
    <span class="sn-info">Schluss mit Chips aus der Tüte: eure eigenen Abend-Snacks – Nussmischungen mit Pfiff, Riegel, Fruchtiges und eine Salami, die gar keine ist. Jeder Snack, den ihr macht und bewertet, kommt ins Glas. Bei <b>${SN.GOAL} verschiedenen</b> gibt’s <b>+${SN.STARS} ⭐ für dich und für ${esc(pn())}</b>, und alle Rezepte ziehen ins Kochbuch unter 🥜 Snacks.</span>
    ${made.length ? `<span class="sn-made">Schon im Glas: ${made.map(x => esc((x.icon || '🥜') + ' ' + x.title)).join(' · ')}</span>` : ''}</div>`;
  h += `<button class="card snmix" data-a="snmix"><span class="snm-ic">🧪</span><span class="snm-t"><b>Mischpult: eure eigene Mischung</b><span class="muted">Nüsse, Frucht, Knusper, Kick – zusammenklicken, Namen geben, fertig ist euer Rezept.</span></span><span class="hc-go">›</span></button>`;
  const mine = (S.myRecipes || []).filter(x => !x.del && /^mix-/.test(x.id)).map(x => recipeById(x.id)).filter(Boolean);
  if (mine.length) h += `<div class="sec-title">🧪 Eure Mischungen</div>` + mine.map(c => snRow(c, V, done)).join('');
  for (const [dk, ic, lbl] of SN.DRAWERS) {
    h += `<div class="sec-title">${ic} ${esc(lbl)}</div>`;
    h += SN.RECIPES.filter(x => x.drawer === dk).map(x => recipeById(x.id)).filter(Boolean).map(c => snRow(c, V, done)).join('');
  }
  return h;
}
function snRow(c, V, done) {
  const miss = V.length ? haveFor(c, V).missing : [], lv = c.level === 'einfach' ? '🖍️ Kinderleicht' : c.level === 'fancy' ? '✠ Culinarius' : /^mix-/.test(c.id) ? '🧪 Eigene Mischung' : '🍯 Mittel';
  return `<button class="card gbcake t-${styleOf(c)}${done.has(c.id) ? ' sn-done' : ''}" data-a="snopen" data-id="${esc(c.id)}">${done.has(c.id) ? '<span class="gbk-rib">✓ im Glas</span>' : ''}<span class="gbk-lv">${lv}</span>
    <span class="gbk-t">${esc(c.icon + ' ' + c.title)}</span><span class="gbk-m">⏱ ${c.min} Min. · ${esc(c.serves)}${c.taste ? ' · ' + c.taste.map(esc).join(', ') : ''}</span>
    <span class="gbk-v">${!V.length ? '' : miss.length ? '🛒 fehlt: ' + esc(miss.slice(0, 5).join(', ')) + (miss.length > 5 ? ' …' : '') : '🧊 alles daheim'}</span><span class="gbk-go">Machen ›</span></button>`;
}
// 🧪 the Mischpult: chips per jar (max picks each), a name, save → own recipe, opens its page
function mixModal() {
  const p = ui.mix || (ui.mix = { nut: [], fruit: [], crunch: [], sweet: [], kick: [], name: SN.nameIdea() });
  const jar = ([k, lbl, max, items]) => `<div class="mx-jar"><div class="mx-h">${esc(lbl)} <span class="muted">· ${max === 1 ? 'eins' : 'bis ' + max}</span></div><div class="chips">${items.map(([id, name, ic]) => `<button class="chip ${p[k].includes(id) ? 'on' : ''}" data-a="snmixpick" data-k="${k}" data-v="${id}">${ic === '–' ? '' : ic + ' '}${esc(name.replace(/ \(.*\)/, ''))}</button>`).join('')}</div></div>`;
  const ok = p.nut.length && p.kick.length;
  modal(`<h2>🧪 Mischpult</h2><p class="muted" style="margin-top:-6px">Klickt eure Mischung zusammen – die Mengen rechnet die App aus (ca. 8 Handvoll).</p>
    ${SN.JARS.map(jar).join('')}
    <label class="mx-h" for="mxName">Name</label><input id="mxName" class="mx-name" maxlength="50" value="${esc(p.name)}" autocomplete="off">
    <p class="muted" id="mx-msg">${ok ? '' : 'Mindestens eine Nuss und einen Kick aussuchen.'}</p>
    <div class="row"><button class="btn green" data-a="snmixsave" ${ok ? '' : 'disabled'}>Mischung speichern</button><button class="btn soft" data-a="close">Zu</button></div>`);
}
A.snack = () => { closeModal(); ui.tab = 'home'; ui.sub = 'snack'; ui.rid = null; ui.cstep = null; render(); scrollTo(0, 0); };
A.snopen = el => { ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = []; render(); scrollTo(0, 0); };
A.snlist = () => { endCookMode(); ui.rid = null; ui.sides = []; render(); scrollTo(0, 0); };
A.snmix = () => { ui.mix = null; mixModal(); };
A.snmixpick = el => {
  const k = el.dataset.k, v = el.dataset.v, max = SN.JARS.find(j => j[0] === k)[2], p = ui.mix, n = $('#mxName');
  if (!p) return;
  if (n) p.name = n.value;
  p[k] = p[k].includes(v) ? p[k].filter(x => x !== v) : (max === 1 ? [v] : p[k].concat(v).slice(-max));
  mixModal();
};
A.snmixsave = () => {
  const p = ui.mix; if (!p || !p.nut.length || !p.kick.length) return;
  const n = $('#mxName'); if (n) p.name = n.value;
  const r = { ...SN.buildMix(p, p.name, uid()), by: D.me(), ts: Date.now() };
  S.myRecipes = (S.myRecipes || []).concat([r]);
  ui.mix = null; closeModal(); ui.tab = 'home'; ui.sub = 'snack'; ui.rid = r.id; ui.sides = []; ui.cstep = null; commit(); scrollTo(0, 0);
  toast('🧪 ' + r.title + ' ist euer Rezept – jetzt machen!');
};
// into the Kochbuch: Stöbern, chip 🥜 Snacks
A.snbook = () => { closeModal(); ui.tab = 'hello'; ui.sub = null; ui.qtab = 'kochbuch'; ui.lastQ.hello = 'kochbuch'; ui.rid = null; ui.ktab = 'next'; ui.ccat = 'snack'; ui.kcat = 'snack'; ui.rq = ''; render(); scrollTo(0, 0); };
