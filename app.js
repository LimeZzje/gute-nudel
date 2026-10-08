import * as C from './content.js';
import * as K from './cookbook.js';
import * as Sh from './shop.js';
import * as D from './data.js';
import { plantSVG } from './plant.js';
import * as Car from './car.js';
import { openGame } from './spiel.js';

const VERSION = '2026-10-08.4';
let S = null;                                   // the state (see data.js freshState)
const ui = { tab: 'home', htab: 'heute', qtab: 'haushalt', sub: null, picks: new Set(), showAllQuests: false, rsize: 'klein', ridea: null, openPrep: null };
const $ = s => document.querySelector(s);
const tags = i => (i.chore ? choreTag(i) : i.list ? toolBtns(null, i) : '') + (i.quest ? `<span class="tag">${i.quest} Doppel-Quest</span>` : '') + (i.from ? `<span class="tag">von ${esc(i.from)}</span>` : '') + (i.back ? `<span class="tag">zurück: ${esc(i.back)}</span>` : '') + (i.urgent ? '<span class="tag hot">bitte heute</span>' : '');
const choreTag = i => { const c = S.chores.find(x => x.id === i.chore); return c ? `<span class="tag">🔁${c.reward ? ' 🎁' : ''}</span>` + toolBtns(c, i) : ''; };
// a chore's helpers as small buttons; a handed-over shopping list travels on the item itself
const toolBtns = (c, i) => (c && c.tools || []).filter(t => C.TOOLS[t]).map(t => `<button class="toolbtn" data-a="tool" data-t="${t}" data-c="${c.id}" aria-label="${C.TOOLS[t][1]}">${C.TOOLS[t][0]}</button>`).join('')
  + (i && i.list ? `<button class="toolbtn" data-a="itemlist" data-id="${i.id}" aria-label="Einkaufsliste">🛒 ${i.list.filter(x => !x.done).length}</button>` : '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- days & weeks (a day ends at 3 a.m., for late evenings) ----------
const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => key(new Date(Date.now() - 3 * 3600e3));
const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const monday = k => { const d = parse(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return key(d); };
const weekDays = mon => Array.from({ length: 7 }, (_, i) => { const d = parse(mon); d.setDate(d.getDate() + i); return key(d); });
const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
const longDate = k => { const d = parse(k); return C.DAYNAMES[d.getDay()] + ', ' + d.getDate() + '. ' + C.MONTHS[d.getMonth()]; };
const shortDate = k => { const d = parse(k); return d.getDate() + '. ' + C.MONTHS[d.getMonth()].slice(0, 3) + (C.MONTHS[d.getMonth()].length > 4 ? '.' : ''); };
const isWork = e => e.kind === 'task' || e.kind === 'extra';
const isRest = e => e.kind === 'rest';
const dayLog = k => S.log.filter(e => e.day === k);
const workToday = () => dayLog(today()).filter(isWork);
// "Tag geschafft" only in the evening: before S.endTime (default 18:00) a ticked-off page is just "Alles abgehakt"
const endTime = () => S.endTime || '18:00';
const evening = () => { const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); return n.getHours() < 3 || hm >= endTime(); };
const allTicked = () => S.today.planned && !S.items.some(i => i.where === 'heute') && workToday().length > 0;
const dayDone = () => S.today.planned && (S.today.closed || (allTicked() && evening()));

// ---------- saving ----------
function commit(post = false) {
  checkPromotion();
  S.updatedAt = Date.now();
  D.saveLocal(S);
  D.scheduleBackup(S);
  const stats = JSON.stringify(myStats());
  if (post || S.postedName !== S.name || S.postedStats !== stats) { S.postedName = S.name; S.postedStats = stats; D.schedulePost(postObj()); }
  render();
}

// ---------- handing tasks to the partner ----------
// what the partner is called on THIS phone: own nickname, else the name they chose (her phone: "Hase" by default)
const pn = () => S.partnerNick || (S.partnerNick === undefined && D.me() === 'stand' ? 'Hase' : '') || S.partnerName || 'Partner';
const MONTH = 30 * 864e5;
function postObj() { // what the partner reads: my handed-over tasks and my answers to theirs
  return {
    me: D.me(), name: S.name, ts: Date.now(),
    out: S.sent.filter(x => x.status !== 'weg' && Date.now() - x.ts < MONTH).map(({ id, text, today, ts, list }) => ({ id, text, today, ts, ...(list ? { list } : {}) })),
    withdrawn: S.sent.filter(x => x.status === 'weg').map(x => x.id),
    car: Car.raw(S.car),
    thanks: (S.thanks || []).filter(t => Date.now() - t.ts < MONTH),
    stats: myStats(),
    replies: Object.entries(S.answered).filter(([, a]) => Date.now() - a.ts < MONTH).map(([id, a]) => ({ id, ...a })),
  };
}
const RANK = { wartet: 0, ok: 1, nein: 1, erledigt: 2 };
let syncing = false;
async function syncPost() {
  if (syncing || !D.canPost() || !navigator.onLine) return;
  syncing = true;
  syncBook(); retryInbox();   // the shared recipe book + photos still waiting for their upload
  try {
    const p = (await D.readPartnerPost()) || { out: [], replies: [] };
    if (p.me && p.me === D.me()) return;              // never treat my own mailbox as the partner's
    let changed = false; const back = [], took = [], done = [];
    if (p.name && p.name !== S.partnerName) { S.partnerName = p.name; changed = true; }
    const thx = (p.thanks || []).filter(t => t && t.id && !(S.thanksSeen || []).includes(t.id));
    if (thx.length) { S.thanksSeen = [...(S.thanksSeen || []), ...thx.map(t => t.id)].slice(-200); changed = true; }
    if (p.stats && JSON.stringify(p.stats) !== JSON.stringify(S.partnerStats)) { S.partnerStats = p.stats; changed = true; }
    const pc = Car.raw(p.car);
    if (JSON.stringify(pc) !== JSON.stringify(Car.raw(S.partnerCar))) { S.partnerCar = pc; changed = true; }
    const fresh = newForMe(); if (fresh.length) changed = true;
    const gone = new Set(p.withdrawn || []), pulled = S.items.filter(i => i.did && gone.has(i.did));
    if (pulled.length) { S.items = S.items.filter(i => !pulled.includes(i)); pulled.forEach(i => { S.answered[i.did] = { status: 'weg', ts: Date.now() }; }); changed = true; }
    const inc = (p.out || []).filter(x => !S.answered[x.id] && !gone.has(x.id));
    if (inc.map(x => x.id).join() !== S.incoming.map(x => x.id).join()) { S.incoming = inc; changed = true; }
    for (const r of p.replies || []) {
      const x = S.sent.find(y => y.id === r.id);
      if (!x || x.status === 'weg' || !(r.status in RANK) || RANK[r.status] <= RANK[x.status]) continue;
      x.status = r.status; x.reason = r.reason || ''; changed = true;
      if (r.status === 'nein') { S.items.unshift({ id: uid(), text: x.text, where: 'liste', created: Date.now(), back: x.reason }); back.push(x); }
      else if (r.status === 'ok') took.push(x); else done.push(x);
    }
    const before = S.sent.length;
    S.sent = S.sent.filter(x => x.status === 'wartet' || x.status === 'ok' || Date.now() - (x.wts || x.ts) < 14 * 864e5);
    if (S.sent.length !== before) changed = true;
    if (changed) commit();
    if (pulled.length) toast(pn() + ' hat zurückgenommen: ' + pulled.map(i => i.text).join(', '));
    if (back.length) modal(`<h2>Kommt zurück</h2><p>${esc(pn())} kann das gerade nicht übernehmen:</p><div style="text-align:left">${back.map(x => `<p><b>${esc(x.text)}</b><br><span class="muted">„${esc(x.reason)}“</span></p>`).join('')}</div><p class="muted">${back.length > 1 ? 'Die Aufgaben sind' : 'Die Aufgabe ist'} wieder auf deiner Liste.</p><div class="row"><button class="btn" data-a="close">Okay</button></div>`);
    else if (done.length) doneModal(done);
    else if (took.length) toast(pn() + ' übernimmt ' + (took.length === 1 ? '„' + took[0].text + '“' : took.length + ' Aufgaben') + ' 💛');
    if (fresh.length && !back.length) modal(`<h2>📅 Neuer Termin</h2><p>${esc(pn())} hat eingetragen:</p><div style="text-align:left">${fresh.map(b => `<p><b>${esc(b.note || 'Termin')}</b> · ${b.who === 'both' ? 'für euch beide' : 'für dich'}${isCar(b) ? ' · 🚗' : ''}<br><span class="muted">${esc(carDayLabel(carDay(b.start)))} · ${esc(carRange(b))}${Car.isSeries(b) ? ' · 🔁 ' + esc(Car.repLabel(b)) : ''}</span></p>`).join('')}</div><div class="row"><button class="btn" data-a="go" data-tab="termine">Zu den Terminen</button><button class="btn soft" data-a="close">Okay</button></div>`);
    thx.forEach((t, i) => setTimeout(() => flyEmoji(t.e, 26, pn() + ' sagt danke ' + t.e + (t.text ? '\nfür „' + t.text + '“' : '')), i * 4200));
  } catch (e) { console.warn('post', e); }
  finally { syncing = false; }
}
function answerDone(item) { if (item.did) { S.answered[item.did] = { status: 'erledigt', ts: Date.now() }; return true; } return false; }
function earn(n) { S.stars += n; S.earned += n; }

// ---------- the rank: an emblem per tier (SVG), the rank screen, promotions ----------
function emblem(t, size = 40, div = '') {
  const R = C.RANKS[t], id = 'em' + t + size;
  const wings = t >= 4 ? `<path d="M10 52 Q-4 38 4 22 Q12 34 20 38Z M90 52 Q104 38 96 22 Q88 34 80 38Z" fill="${R.dark}" opacity=".9"/>` : '';
  const crown = t >= 7 ? `<path d="M34 14 L40 4 L46 12 L50 2 L54 12 L60 4 L66 14Z" fill="${C.RANKS[9].color}" stroke="${R.dark}" stroke-width="1.5"/>` : '';
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="-6 -2 112 106" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.color}"/><stop offset="1" stop-color="${R.dark}"/></linearGradient></defs>
    ${wings}<path d="M50 10 L84 28 L84 66 L50 92 L16 66 L16 28Z" fill="url(#${id})" stroke="${R.dark}" stroke-width="4"/>
    <path d="M50 20 L74 33 L74 62 L50 81 L26 62 L26 33Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <path d="M50 33 L55 45 L68 46 L58 54 L61 67 L50 60 L39 67 L42 54 L32 46 L45 45Z" fill="#fff" opacity=".92"/>${crown}
    ${div ? `<text x="50" y="100" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="18" fill="${R.dark}" stroke="#fff" stroke-width="4" paint-order="stroke">${div}</text>` : ''}</svg>`;
}
function rankCard(big) {
  const r = C.rankOf(S.earned), nx = r.to != null ? C.rankOf(r.to) : null, p = r.to != null ? (S.earned - r.from) / (r.to - r.from) : 1;
  return `<div class="rankcard ${big ? 'big' : ''}">${emblem(r.t, big ? 120 : 64, r.div)}<div><div class="rname" style="color:${r.tier.dark}">${esc(r.name)}</div>
    <div class="muted"><b>${S.earned} ⭐</b> insgesamt gesammelt</div>
    <div class="bar"><i style="width:${Math.round(p * 100)}%;background:${r.tier.color}"></i></div>
    <div class="muted" style="font-size:13px">${nx ? 'noch ' + (r.to - S.earned) + ' ⭐ bis ' + esc(nx.name) : 'Ganz oben. Mehr geht nicht. 👑'}</div></div></div>`;
}
function rankModal() {
  const r = C.rankOf(S.earned);
  modal(`<h2>Dein Rang</h2>${rankCard(true)}
    <p class="muted" style="margin-top:12px">Der Rang zählt <b>alle</b> Sterne, die du je gesammelt hast – Ausgeben bei Schätze kostet dich nie einen Rang. Gerade hast du <b>${S.stars} ⭐</b> zum Ausgeben.</p>
    <div class="ladder">${C.RANKS.map((R, i) => `<div class="${i === r.t ? 'on' : i < r.t ? 'done' : ''}">${emblem(i, 34)}<span>${R.name}-Nudel</span><span class="muted">${R.from} ⭐</span></div>`).slice().reverse().join('')}</div>
    <div class="row"><button class="btn" data-a="close">Weiter sammeln</button></div>`);
}
function checkPromotion() { // a new division (or tier) → a celebration, once
  const r = C.rankOf(S.earned);
  if (S.rankSeen == null) { S.rankSeen = r.step; return; }
  if (r.step > S.rankSeen) {
    S.rankSeen = r.step;
    const show = () => { if ($('#ov') || $('.viewer') || $('#story')) return setTimeout(show, 1500);   // never over something she's doing
      confetti(120); modal(`<div class="promo">${emblem(r.t, 140, r.div)}</div><h2>Aufgestiegen!</h2><p class="hand" style="font-size:36px;margin:4px 0;color:${r.tier.dark}">${esc(r.name)}</p><p class="muted">${S.earned} gute Nudel Sterne gesammelt. Du bist wirklich eine gute Nudel. 💛</p><div class="row"><button class="btn" data-a="close">Juhu!</button></div>`); };
    setTimeout(show, 900);
  } else if (r.step < S.rankSeen) S.rankSeen = r.step;   // an entry removed: quietly back down, no fuss
}

// ---------- recurring chores: due ones land on today's page by themselves ----------
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
function choreDue(c, d) {
  if ((c.skip && c.skip > d) || c.last === d) return false;
  if (c.week && c.week.length) return c.week.includes(parse(d).getDay());
  return !c.last || daysBetween(c.last, d) >= (c.every || 7);
}
function choreWhen(c) { // "heute", "morgen", "in 3 Tagen", "Mo"
  const d = today();
  if (choreDue(c, d)) return S.log.some(e => e.day === d && e.chore === c.id) ? 'heute erledigt ✓' : 'heute fällig';
  for (let n = 1; n <= 120; n++) {
    const k = addDays(d, n), x = Object.assign({}, c, { last: c.last === d ? d : c.last });
    if (choreDue(x, k)) return n === 1 ? 'morgen' : c.week && c.week.length ? C.DOW[parse(k).getDay()] + ', ' + shortDate(k) : 'in ' + n + ' Tagen';
  }
  return '–';
}
function choreNext(c) { // the next day it is due (today, if it still is)
  const d = today(), doneToday = S.log.some(e => e.day === d && e.chore === c.id);
  for (let n = doneToday ? 1 : 0; n <= 400; n++) { const k = addDays(d, n); if (choreDue(c, k)) return k; }
  return addDays(d, c.every || 7);
}
// "alle N Tage" from a chosen day: due on that day, then every N days (as if it was last done N days before)
function setChoreNext(c, k) {
  c.last = addDays(k, -(c.every || 7)); c.skip = null;
  if (!choreDue(c, today())) S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute'));
  scheduleChores();
}
const choreRhythm = c => c.week && c.week.length ? 'jeden ' + c.week.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => C.DOW[x]).join(' & ') : c.every === 1 ? 'jeden Tag' : 'alle ' + c.every + ' Tage';
// a changed plan never touches today's page: not there yet → from tomorrow; there but today no longer chosen → off again
function planChanged(c) {
  const on = S.items.find(i => i.chore === c.id && i.where === 'heute');
  if (!on) c.skip = addDays(today(), 1);
  else if (Array.isArray(c.week) && !c.week.includes(parse(today()).getDay())) S.items = S.items.filter(i => i !== on);
}
const choreItemId = (cid, d) => 'ch-' + cid + '-' + d;
function dedupeChoreItems() { // one open to-do per chore; none for chores that no longer exist
  const cids = new Set(S.chores.map(c => c.id)), one = new Set();
  S.items = S.items.filter(i => !i.chore || (cids.has(i.chore) && !(i.where === 'heute' && (one.has(i.chore) || !one.add(i.chore)))));
}
function scheduleChores() {
  dedupeChoreItems();
  const d = today();
  let added = 0;
  for (const c of S.chores) {
    if (!choreDue(c, d) || S.items.some(i => i.chore === c.id) || S.log.some(e => e.day === d && e.chore === c.id)) continue;
    S.items.push({ id: choreItemId(c.id, d), text: c.name, where: 'heute', created: Date.now(), chore: c.id });
    added++;
  }
  return added;
}

function rollover() {
  const d = today();
  if (S.today.day === d) return false;
  if (S.today.day) { // yesterday's leftovers go back to the top of the list, marked "von gestern" — chores just come back when due
    S.items = S.items.filter(i => !(i.chore && i.where === 'heute'));
    S.items.forEach(i => { i.carried = false; });
    const left = S.items.filter(i => i.where === 'heute');
    left.forEach(i => { i.where = 'liste'; i.carried = true; });
    S.items = [...left, ...S.items.filter(i => !left.includes(i))];
  }
  S.today = { day: d, planned: false, capShown: false, closed: false, celebrated: false };
  S.quest = null;
  if (S.combo && S.combo.day !== d) S.combo = null;   // the reward belongs to its day
  S.gifts = S.gifts.filter(g => g.day === d);
  scheduleChores();
  return true;
}

// ---------- little effects ----------
function floatStar(el, txt) {
  const r = (el || $('#stars')).getBoundingClientRect(), f = document.createElement('div');
  f.className = 'floatstar'; f.textContent = txt; f.style.left = (r.left + r.width / 2 - 14) + 'px'; f.style.top = (r.top - 4) + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
}
function confetti(n = 60) {
  const cols = ['#e0864a', '#e3a92b', '#4f9a5b', '#2f5aa8', '#c86fb0', '#f6d6bd'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = pick(cols);
    c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * .4 + 's';
    c.style.borderRadius = Math.random() < .5 ? '50%' : '2px';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3800);
  }
}
let toastT = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
}
function modal(html, cls = '', keep = false) {
  const cur = $('#ov');   // keep: the open one just gets new content (no close/open flicker, scroll stays)
  if (keep && cur) { cur.querySelector('.modal').innerHTML = html; return cur; }
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'ov';
  o.innerHTML = `<div class="modal ${cls}" role="dialog">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) closeModal(); });
  document.body.appendChild(o);
  lockScroll();
  return o;
}
function closeModal() { const o = $('#ov'); if (o) o.remove(); unlockScroll(); }
let lockedY = null;
function lockScroll() {
  if (lockedY != null) return;
  lockedY = scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: -lockedY + 'px', left: '0', right: '0', width: '100%', overflow: 'hidden' });
}
function unlockScroll() {
  if (lockedY == null || $('#ov')) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '', overflow: '' });
  scrollTo(0, lockedY); lockedY = null;
}

// ---------- header ----------
function renderTop() {
  $('#starsn').textContent = S.stars;
  const rk = C.rankOf(S.earned); $('#rankbtn').innerHTML = emblem(rk.t, 34, ''); $('#rankbtn').title = rk.name + ' · ' + S.earned + ' ⭐ gesammelt';
  $('#top h1').innerHTML = 'Gute Nudel' + (S.name ? ' <span>' + esc(S.name) + '</span>' : '');
  const c = $('#cloud'), st = D.backup.status;
  c.className = st === 'ok' ? 'ok' : st === 'wait' ? 'wait' : st === 'bad' ? 'bad' : '';
  c.title = { ok: 'Gesichert', wait: 'Wird gleich gesichert', bad: 'Sicherung hat nicht geklappt', none: 'Sicherung nicht eingerichtet' }[st] || '';
  document.querySelectorAll('nav#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === (ui.tab === 'schaetze' ? 'home' : ui.tab)));
  $('#tabs [data-tab="heute"]').classList.toggle('dot', S.incoming.length > 0);
  $('#tabs [data-tab="home"]').classList.toggle('dot', S.incoming.length > 0 && ui.tab !== 'home');
}

// ---------- HEUTE ----------
function viewHeute() {
  const d = today(), heute = S.items.filter(i => i.where === 'heute'), done = workToday();
  const liste = S.items.filter(i => i.where === 'liste');
  const capped = done.length >= C.CAP;
  let h = '';

  h += carToday() + comboCard(true) + giftCards();
  const lastMon = addDays(monday(d), -7);
  if (!S.weeksSeen.includes(lastMon) && S.log.some(e => weekDays(lastMon).includes(e.day)))
    h += `<button class="card btn soft wide" data-a="story" data-w="${lastMon}" style="text-align:left">✨ <b>Dein Wochenrückblick ist da.</b><br><span class="muted">Schau dir an, was du letzte Woche alles geschafft hast.</span></button>`;

  const finished = dayDone(), early = !finished && allTicked();
  if (early) {
    h += `<div class="card early"><b>Alles abgehakt! 🎉</b><span class="muted">Hol dir noch was aus der Liste – oder genieß die Lücke. Ab ${esc(endTime())} ist offiziell Feierabend.</span></div>`;
  }
  if (finished) {
    h += `<div class="celebrate"><div class="big">Tag geschafft!</div>
      <p>${done.length === 1 ? 'Eine Sache' : done.length + ' Sachen'} erledigt. Für heute ist Schluss – der Rest wartet bis morgen.</p>
      <p class="muted">Und jetzt: Füße hoch. Das hast du dir verdient. 😌</p></div>`;
  } else if (capped) {
    h += `<div class="card warn" style="text-align:center">🌙 Genug für heute! Ab jetzt gibt es nur noch Sterne fürs Entspannen.</div>`;
  }

  h += `<section class="pad"><h2>${esc(longDate(d))}</h2>`;
  const due = heute.filter(i => i.chore);
  if (!S.today.planned && heute.length === due.length && done.length === 0) {
    if (due.length) h += `<p class="sub" style="margin-bottom:4px">🔁 Heute fällig – steht schon drauf:</p>` + due.map(i => `<div class="item"><span class="txt"><span>${esc(i.text)}</span>${tags(i)}</span><button class="mini-btn" data-a="choreskip" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht – morgen wieder">⏭</button></div>`).join('');
    h += `<p class="sub">${S.name ? 'Hallo ' + esc(S.name) + '! ' : ''}Was kommt heute auf deine Seite? Hol dir, was du angehen magst – den Rest hebt die Liste für dich auf.</p>`;
    if (liste.length) {
      h += liste.map(i => `<button class="pick ${ui.picks.has(i.id) ? 'on' : ''}" data-a="pickday" data-id="${i.id}"><span class="box">${ui.picks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}${i.carried ? '<span class="tag">von gestern</span>' : ''}${tags(i).replace(/<button[^>]*toolbtn[\s\S]*?<\/button>/g, '')}</span></button>`).join('');
    }
    h += `<form class="add" data-f="addplan"><input name="t" placeholder="Etwas Neues für heute…" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
    h += `<div class="row" style="margin-top:14px"><button class="btn green" data-a="plandone">${ui.picks.size ? 'Los geht\'s (' + ui.picks.size + ')' : 'Los geht\'s'}</button></div>`;
    h += `<p class="hint">Du kannst später jederzeit noch etwas dazuholen.</p></section>`;
    return h;
  }

  if (heute.length === 0 && done.length === 0) h += `<p class="sub">Nichts geplant. Genieß es – oder hol dir etwas aus der Liste.</p>`;
  h += heute.map(i => `<div class="item" data-id="${i.id}"><button class="chk" data-a="tick" data-id="${i.id}" aria-label="Erledigt"></button><div class="txt ${i.carried ? 'carried' : ''}"><span>${esc(i.text)}</span>${tags(i)}</div>${i.chore ? `<button class="mini-btn" data-a="choreskip" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht – morgen wieder">⏭</button>` : `<button class="mini-btn" data-a="later" data-id="${i.id}" aria-label="Zurück auf die Liste" title="Zurück auf die Liste">↩</button>`}</div>`).join('');
  if (!finished) {
    h += `<form class="add" data-f="addtoday"><input name="t" placeholder="Noch etwas für heute…" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
    h += `<div class="row" style="margin-top:12px">${liste.length ? '<button class="btn soft" data-a="fromlist">Aus der Liste holen</button>' : ''}${heute.length || early ? '<button class="btn soft" data-a="closeday">Für heute Schluss</button>' : ''}</div>`;
    if (D.canPost() && S.items.length) h += `<button class="btn soft wide" data-a="delegate" style="margin-top:10px">🤝 An ${esc(pn())} abgeben</button>`;
  }
  if (done.length) {
    h += `<div class="donebox"><div class="muted" style="margin:14px 0 4px;font-weight:800">Heute geschafft (${done.length})</div>` +
      done.slice().reverse().map(e => `<div class="item done"><button class="chk" data-a="undo" data-id="${e.id}" aria-label="Rückgängig">✓</button><div class="txt"><span>${esc(e.text)}</span></div>${e.stars ? '<span class="muted">+' + e.stars + '⭐</span>' : ''}</div>`).join('') + '</div>';
  }
  h += `<form class="add" data-f="extra" style="margin-top:16px"><input name="t" placeholder="Sonst noch was geschafft?" autocomplete="off" enterkeyhint="done"><button class="btn green" aria-label="Als erledigt eintragen">✓</button></form>`;
  h += '</section>';
  return h;
}

function giftCards() {
  return S.gifts.filter(g => g.day === today()).map(g => `<div class="card quest active"><div class="lvl">🎁 HEUTE WARTET AUF DICH</div><h3>${esc(g.reward)}</h3><p style="color:#d8cdee">${esc(g.icon + ' ' + g.name)} ist erledigt. Jetzt kommt der schöne Teil – gleich oder heute Abend.</p><button class="btn wide" data-a="giftdone" data-id="${g.id}">Genossen! +${C.COMBO_REWARD_STARS} ⭐</button></div>`).join('');
}

function comboCard(small) {
  const c = S.combo && S.combo.day === today() && C.COMBOS.find(x => x.id === S.combo.id);
  if (!c) return '';
  if (S.combo.phase === 'work') return small ? '' : `<div class="card quest active"><div class="lvl">⚔ AKTIVE DOPPEL-QUEST</div><h3>${c.icon} ${esc(c.title)}</h3><p><b>Teil 1:</b> ${esc(c.work)} <span class="muted" style="color:#d8cdee">– steht auf deiner Seite für heute</span></p><p style="opacity:.75"><b>Teil 2 (heute):</b> ${esc(c.reward)}</p><button class="btn soft wide" data-a="combocancel">Doch nicht heute</button></div>`;
  return `<div class="card quest active"><div class="lvl">🎁 HEUTE WARTET AUF DICH</div><h3>${c.icon} ${esc(c.reward)}</h3><p style="color:#d8cdee">Teil 1 (${esc(c.work)}) ist geschafft. Jetzt kommt der schöne Teil – gleich oder heute Abend.</p><button class="btn wide" data-a="combodone">Genossen! +${C.COMBO_REWARD_STARS} ⭐</button></div>`;
}

function incomingCard() {
  if (!S.incoming.length) return '';
  return `<div class="card incoming"><h3>🤝 ${esc(pn())} bittet dich um Hilfe</h3>` + S.incoming.map(x => `<div class="inc">
      <div class="inc-t"><b>${esc(x.text)}</b>${x.today ? '<span class="tag hot">bitte heute</span>' : ''}${x.list ? `<br><span class="muted">🛒 ${x.list.length} Sachen: ${esc(x.list.slice(0, 6).join(', '))}${x.list.length > 6 ? ' …' : ''}</span>` : ''}</div>
      ${ui.declining === x.id
        ? `<form class="add" data-f="decline" data-id="${x.id}"><input name="t" placeholder="Warum? z.B. schaff ich nicht wegen Terminen" autocomplete="off" enterkeyhint="send"><button class="btn" aria-label="Absenden">➤</button></form><button class="btn soft wide" data-a="declinecancel" style="margin-top:6px">Doch nicht</button>`
        : `<div class="row"><button class="btn green" data-a="accept" data-id="${x.id}">Übernehmen</button><button class="btn soft" data-a="declinestart" data-id="${x.id}">Geht nicht</button></div>`}
    </div>`).join('') + '</div>';
}

function tick(id, el) {
  const it = S.items.find(i => i.id === id); if (!it) return;
  const row = el && el.closest('.item');
  if (row) row.classList.add('done', 'ticking', 'leaving');
  const n = workToday().length, stars = n < C.CAP ? 1 : 0;
  floatStar(el, stars ? '+1 ⭐' : '✓');
  setTimeout(() => {
    S.items = S.items.filter(i => i !== it);
    const ch = it.chore && S.chores.find(c => c.id === it.chore);
    S.log.push({ id: uid(), text: it.text, kind: 'task', day: today(), ts: Date.now(), stars, ...(it.did ? { did: it.did, from: it.from } : {}), ...(ch ? { chore: ch.id, prevLast: ch.last || null } : {}) });
    earn(stars);
    if (ch) { ch.last = today(); if (ch.reward) S.gifts.push({ id: uid(), cid: ch.id, day: today(), icon: ch.icon, name: ch.name, reward: ch.reward }); }
    const combo = S.combo && S.combo.iid === it.id && S.combo.phase === 'work' && C.COMBOS.find(c => c.id === S.combo.id);
    if (combo) S.combo.phase = 'reward';
    afterWork(n + 1, answerDone(it));
    askMood(S.log[S.log.length - 1]);
    if (ch && ch.reward) modal(`<h2>${esc(ch.icon)} Erledigt!</h2><p><b>${esc(ch.name)}</b> ist für ${esc(choreRhythm(ch))} erledigt.</p><p>Heute wartet auf dich:</p><p class="hand" style="font-size:30px;color:var(--accent)">🎁 ${esc(ch.reward)}</p><p class="muted">Ob gleich oder heute Abend – Hauptsache heute. +${C.COMBO_REWARD_STARS} ⭐ wenn du's genossen hast.</p><div class="row"><button class="btn" data-a="close">Freu mich!</button></div>`);
    if (combo) modal(`<h2>Teil 1 geschafft!</h2><p><b>${esc(combo.work)}</b> ist erledigt.</p><p>Heute wartet auf dich:</p><p class="hand" style="font-size:30px;color:var(--accent)">${combo.icon} ${esc(combo.reward)}</p><p class="muted">Ob gleich oder heute Abend – Hauptsache heute. +${C.COMBO_REWARD_STARS} ⭐ wenn du's genossen hast.</p><div class="row"><button class="btn" data-a="close">Freu mich!</button></div>`);
  }, 650);
}
// "wie war's?": five faces under the screen for a few seconds — one tap, or just ignore it
const MOOD_SECS = 12;
function askMood(e) {
  if (!e) return;
  document.querySelectorAll('.moodbar').forEach(b => b.remove());
  const b = document.createElement('div'); b.className = 'moodbar';
  b.innerHTML = `<span>Wie war’s?</span>` + C.MOODS.map((m, i) => `<button data-a="mood" data-id="${e.id}" data-v="${i + 1}" aria-label="${C.MOOD_WORDS[i]}">${m}</button>`).join('') +
    `<i class="mtime" style="animation-duration:${MOOD_SECS}s"></i>`;
  document.body.appendChild(b);
  const t = setTimeout(() => b.remove(), MOOD_SECS * 1000);
  b.addEventListener('pointerdown', () => { clearTimeout(t); const i = b.querySelector('.mtime'); if (i) i.remove(); setTimeout(() => b.remove(), 15000); }, { once: true });   // touched: it stays
}
function afterWork(count, post = false) {
  commit(post);
  if (count === C.CAP && !S.today.capShown) {
    S.today.capShown = true; commit();
    modal(`<h2>Genug für heute!</h2><p>Du hast heute <b>${C.CAP} Sachen</b> geschafft. Das ist richtig viel.</p>
      <p>Du kannst weiter abhaken – Sterne gibt es dafür heute aber keine mehr. Gönn dir eine Pause. 😌</p>
      <div class="row"><button class="btn" data-a="close">Okay</button></div>`);
    return;
  }
  if (allTicked() && ui.tab === 'heute' && ui.htab === 'heute') {
    if (evening()) { if (!S.today.celebrated) { S.today.celebrated = true; commit(); confetti(); } }
    else confetti(30);
  }
}
// the clock passes "Feierabend" while everything is already ticked: now it's really "Tag geschafft"
function checkEvening() {
  if (!allTicked() || !evening() || S.today.celebrated || S.today.closed) return;
  S.today.celebrated = true; commit();
  if (document.visibilityState === 'visible' && (ui.tab === 'heute' || ui.tab === 'home')) confetti();
}

// ---------- LISTE ----------
function viewListe() {
  const l = S.items.filter(i => i.where === 'liste');
  let h = `<section class="pad"><h2>Alles, was irgendwann dran ist</h2><p class="sub">Hier darf alles stehen. Nichts davon muss heute passieren.</p>`;
  h += l.map(i => `<div class="item"><button class="chk" data-a="toheute" data-id="${i.id}" aria-label="Für heute einplanen" title="Für heute">☀</button><div class="txt ${i.carried ? 'carried' : ''}"><span>${esc(i.text)}</span>${tags(i)}</div><button class="mini-btn" data-a="del" data-id="${i.id}" aria-label="Löschen">✕</button></div>`).join('');
  if (!l.length) h += `<p class="muted">Die Liste ist leer. Wie schön.</p>`;
  h += `<form class="add" data-f="addlist"><input name="t" placeholder="Neue Aufgabe…" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
  if (D.canPost() && S.items.length) h += `<button class="btn soft wide" data-a="delegate" style="margin-top:12px">🤝 An ${esc(pn())} abgeben</button>`;
  h += `<p class="hint">Tipp: Mit ☀ kommt eine Aufgabe auf die Seite von heute.</p></section>`;
  const sent = S.sent.filter(x => x.status === 'wartet' || x.status === 'ok');
  if (sent.length) {
    const lbl = { wartet: 'wartet auf Antwort', ok: 'übernommen 💛', erledigt: 'erledigt 🎉' };
    h += `<div class="card"><h3>🤝 Abgegeben an ${esc(pn())}</h3><ul class="list-plain">${sent.slice().reverse().map(x => `<li><span>${esc(x.text)}${x.today ? ' <span class="tag hot">heute</span>' : ''}</span><span class="st st-${x.status}">${lbl[x.status]}</span>${x.status !== 'erledigt' ? `<button class="mini-btn" data-a="withdraw" data-id="${x.id}" aria-label="Zurückholen" title="Zurückholen">↩</button>` : ''}</li>`).join('')}</ul><p class="hint">Mit ↩ holst du eine Aufgabe zurück, solange sie noch nicht erledigt ist.</p></div>`;
  }
  return h;
}

// ---------- RUHE ----------
const dayIndex = () => Math.floor(parse(today()).getTime() / 864e5);
function questCard(q, active) {
  return `<div class="card quest ${active ? 'active' : ''}"><div class="lvl">${active ? '⚔ AKTIVE QUEST' : 'LEGENDÄRE QUEST'}</div><h3>${esc(q.title)}</h3>
    <div class="meta"><span class="diff">${'★'.repeat(q.diff)}${'☆'.repeat(5 - q.diff)}</span><span>⏱ ${q.dur}</span><span>Überlebensrate: ${q.rate}%</span></div>
    <p>${esc(q.text)}</p><div class="boss">${esc(q.boss)}</div>
    ${active ? `<div class="row"><button class="btn" data-a="questdone">Überlebt! +${C.REST_STARS} ⭐</button><button class="btn soft" data-a="questquit">Später</button></div>`
      : `<button class="btn wide" data-a="queststart" data-id="${q.id}">Quest annehmen</button>`}</div>`;
}
const QTABS = [['haushalt', '🔁 Routinen'], ['einkauf', '🛒 Einkaufsliste'], ['kochbuch', '📖 Kochbuch']];
function viewRuhe() {
  if (ui.sub === 'cook') { ui.sub = null; ui.qtab = 'kochbuch'; }   // old way in: the cookbook was a sub-page
  if (!QTABS.some(([k]) => k === ui.qtab)) ui.qtab = 'haushalt';
  if (ui.qtab === 'kochbuch' && ui.rid) return viewCook();          // a recipe / cooking mode: full page, no chips
  const h = `<div class="chips qtabs">${QTABS.map(([k, l]) => `<button class="chip ${ui.qtab === k ? 'on' : ''}" data-a="qtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (ui.qtab === 'einkauf') return h + `<div class="card shoptab">${shopBody(null, true)}</div>`;
  if (ui.qtab === 'kochbuch') return h + viewCook();
  return h + viewHaushalt();
}
function viewHaushalt() {
  let h = `<div class="sec-title" style="margin-top:6px">Routinen – laufen von allein</div>
    <p class="muted" style="margin:0 4px 14px">Was regelmäßig dran ist, kommt von selbst auf deine Seite, wenn es Zeit ist – du musst nicht dran denken. Und wenn du magst, wartet danach am selben Tag etwas Schönes auf dich.</p>`;
  h += giftCards();
  h += weekPlanner();
  h += `<button class="btn wide" data-a="choreedit">+ Etwas Eigenes</button>`;
  const free = C.CHORE_TEMPLATES.filter(t => !S.chores.some(c => c.name === t.name));
  if (free.length) h += `<div class="sec-title">Ideen zum Antippen</div><p class="muted" style="margin:0 4px 10px">Wie oft und was dich danach erwartet, kannst du mit ✎ jederzeit ändern.</p><div class="chips">` +
    free.map(t => `<button class="chip" data-a="choretpl" data-v="${esc(t.name)}">${t.icon} ${esc(t.name)} · ${esc(choreRhythm(t))}</button>`).join('') + '</div>';
  return h;
}
// 📅 Meine Woche: each chore with its days (Mo … So) — tap a day to move it; changes count from tomorrow
// this week's chores per day: done ones from the log, coming ones by playing the rhythm forward (as if each is done when due)
function choreWeek(off = 0) {   // off: 0 = this week, 1 = next week …
  const t = today(), days = weekDays(addDays(monday(t), 7 * off)), out = {};
  days.forEach(d => { out[d] = []; });
  const ahead = [];                                   // today … the shown week's Sunday, to play each rhythm forward
  for (let d = t; d <= days[6]; d = addDays(d, 1)) ahead.push(d);
  for (const c of S.chores) {
    days.filter(d => d < t).forEach(d => { if (S.log.some(e => e.day === d && e.chore === c.id)) out[d].push({ c, st: 'done' }); });
    const doneToday = S.log.some(e => e.day === t && e.chore === c.id);
    if (doneToday && out[t]) out[t].push({ c, st: 'done' });   // today is only in the list when this week is shown
    const x = Object.assign({}, c, doneToday ? { last: t } : {});
    for (const d of ahead) {
      if (d === t && doneToday) continue;
      if (!choreDue(x, d)) continue;
      if (out[d]) out[d].push({ c, st: d === t ? 'due' : 'plan' });
      x.last = d;
    }
  }
  return { days, out, t };
}
function weekPlanner() {
  const tdow = parse(today()).getDay();
  const off = ui.wkOff || 0, { days, out, t } = choreWeek(off), sel = days.includes(ui.wkDay) ? ui.wkDay : off ? days[0] : t;
  let h = `<div class="sec-title">📅 Meine Woche</div>
    <div class="wknav"><button class="mini-btn" data-a="wkoff" data-d="-1" ${off ? '' : 'disabled'} aria-label="Woche davor">‹</button>
      <span><b>${off === 0 ? 'Diese Woche' : off === 1 ? 'Nächste Woche' : 'In ' + off + ' Wochen'}</b> · ${shortDate(days[0])} – ${shortDate(days[6])}</span>
      <button class="mini-btn" data-a="wkoff" data-d="1" ${off < 4 ? '' : 'disabled'} aria-label="Woche danach">›</button></div>`;
  if (S.chores.length) {
    h += `<div class="card weekstrip">${days.map(d => `<button class="${d === t ? 'today' : ''}${d === sel ? ' sel' : ''}${d < t ? ' past' : ''}" data-a="wkday" data-k="${d}"><b>${C.DOW[parse(d).getDay()]}</b><small>${parse(d).getDate()}.</small>
        <span>${out[d].map(x => `<i class="${x.st}">${esc(x.c.icon)}</i>`).join('') || (d < t ? '·' : '🛋️')}</span></button>`).join('')}</div>`;
    const list = out[sel], lbl = { done: '✓ erledigt', due: 'heute dran', plan: 'geplant' };
    h += `<div class="card wkdetail"><h3>${sel === t ? 'Heute' : esc(longDate(sel))}</h3>${list.length
      ? `<ul class="list-plain">${list.map(x => `<li><span>${esc(x.c.icon)} ${esc(x.c.name)}</span><span class="st ${x.st === 'done' ? 'st-erledigt' : ''}">${lbl[x.st]}</span></li>`).join('')}</ul>`
      : `<p class="muted" style="margin:0">${sel < t ? 'Nichts aus den Routinen erledigt.' : 'Nichts geplant – frei. 🛋️'}</p>`}
      <p class="hint">✓ = erledigt · durchsichtig = kommt noch. Tipp auf einen Tag zeigt, was dran ist.</p></div>`;
    h += `<div class="sec-title" style="font-size:24px">Deine Aufgaben & ihre Tage</div><div class="card"><ul class="list-plain chores">${S.chores.map(c => `<li><span class="cw"><span class="cwtop"><b>${esc(c.icon)} ${esc(c.name)}</b><span><button class="mini-btn" data-a="choreedit" data-id="${c.id}" aria-label="Bearbeiten">✎</button><button class="mini-btn" data-a="choredel" data-id="${c.id}" aria-label="Löschen">✕</button></span></span>
      ${c.week && c.week.length ? `<span class="days">${C.WEEK_ORDER.map(d => `<button class="dayt ${c.week.includes(d) ? 'on' : ''} ${d === tdow ? 'today' : ''}" data-a="cday" data-id="${c.id}" data-v="${d}">${C.DOW[d]}</button>`).join('')}</span>`
        : `<label class="nextrow"><span>Nächstes Mal</span><input type="date" class="nextdate" data-ch="chorenext" data-id="${c.id}" min="${today()}" value="${choreNext(c)}"></label>`}
      <span class="muted">${c.week && c.week.length ? esc(choreWhen(c)) : esc(choreRhythm(c)) + ' ab da'}${c.reward ? ' · 🎁 ' + esc(c.reward) : ''}</span>${(c.tools || []).length ? '<span>' + toolBtns(c) + '</span>' : ''}</span></li>`).join('')}</ul>
      <p class="hint">Wochentags-Aufgaben: Tipp auf einen Tag legt sie dorthin (oder nimmt sie weg), gilt ab morgen. „Alle paar Tage“: Datum antippen – dann ist sie an dem Tag dran und läuft von da an weiter.</p></div>`;
  }
  const ex = C.EXAMPLE_WEEK.filter(e => C.CHORE_TEMPLATES.some(t => t.name === e.name));
  h += `<div class="card"><h3>✨ Eine typische Woche</h3><p class="muted" style="margin-top:0">${C.WEEK_ORDER.map(d => `<b>${C.DOW[d]}</b> ${ex.filter(e => e.week && e.week.includes(d)).map(e => C.CHORE_TEMPLATES.find(t => t.name === e.name).icon).join('') || '🛋️ frei'}`).join(' · ')} · 🛏️ alle 14 Tage</p>
    <button class="btn soft wide" data-a="exweek">Als Vorlage übernehmen</button><p class="hint">Was du schon hast, bekommt diese Tage – alles bleibt danach änderbar.</p></div>`;
  return h;
}

function viewGemuetlich() {
  let h = '';

  h += `<div class="sec-title" style="margin-top:6px">Gemütlichkeits-Rezepte</div><p class="muted" style="margin:0 4px 12px">Du musst dir nichts ausdenken – such dir eins aus. Die Schritte sind nur deine Checkliste – +2 ⭐ gibt’s fürs Genießen.</p>`;
  for (const r of C.RECIPES) {
    const on = S.recipe && S.recipe.id === r.id, ready = r.prep && (S.preps[r.prep] || []).length && (S.preps[r.prep] || []).every(Boolean);
    h += `<div class="card recipe"><h3>${r.icon} ${esc(r.title)}${ready ? '<span class="ready">vorbereitet</span>' : ''}</h3><div class="muted">${r.time}</div>`;
    if (on) {
      const steps = S.recipe.mini ? r.mini : r.steps, all = S.recipe.done.every(Boolean);
      h += `<div class="chips"><button class="chip ${!S.recipe.mini ? 'on' : ''}" data-a="recmini" data-v="0">Ganze Version</button><button class="chip ${S.recipe.mini ? 'on' : ''}" data-a="recmini" data-v="1">Mini (2 Min.)</button></div>`;
      h += '<div class="steps">' + steps.map((s, i) => `<button class="pick ${S.recipe.done[i] ? 'on' : ''}" data-a="recstep" data-i="${i}"><span class="box">${S.recipe.done[i] ? '✓' : ''}</span><span>${esc(s)}</span></button>`).join('') + '</div>';
      h += all ? `<p><b>Alles bereit. Und jetzt: genießen.</b></p><div class="row"><button class="btn green" data-a="recdone">Hab's genossen! +2 ⭐</button></div>`
        : `<div class="row"><button class="btn soft" data-a="recstop">Abbrechen</button></div>`;
    } else {
      h += `<p class="muted">${r.steps.length} Schritte · Mini: ${esc(r.mini.join(', '))}</p><button class="btn soft wide" data-a="recstart" data-id="${r.id}">Das mach ich</button>`;
    }
    h += '</div>';
  }

  h += `<div class="sec-title">Vorbereiten – für Tage mit Energie</div><p class="muted" style="margin:0 4px 12px">Einmal vorbereiten, dann kostet Gemütlichkeit später fast nichts mehr. Fertig vorbereitet: +2 ⭐.</p>`;
  for (const p of C.PREPS) {
    const st = S.preps[p.id] || [], n = st.filter(Boolean).length, full = n === p.steps.length;
    const open = ui.openPrep === p.id;
    h += `<div class="card"><h3>${p.icon} ${esc(p.title)}${full ? '<span class="ready">fertig</span>' : ''}</h3><p class="muted">${esc(p.text)}</p>`;
    h += `<div class="bar"><i style="width:${n / p.steps.length * 100}%"></i></div>`;
    if (open) h += '<div class="steps">' + p.steps.map((s, i) => `<button class="pick ${st[i] ? 'on' : ''}" data-a="prepstep" data-id="${p.id}" data-i="${i}"><span class="box">${st[i] ? '✓' : ''}</span><span>${esc(s)}</span></button>`).join('') + '</div>';
    h += `<button class="btn soft wide" data-a="prepopen" data-id="${p.id}">${open ? 'Zuklappen' : full ? 'Ansehen' : n ? 'Weitermachen' : 'Anfangen'}</button></div>`;
  }

  return h;
}
function viewGoenn() {
  let h = `<div class="sec-title" style="margin-top:6px">Gönn dir was</div><p class="muted" style="margin:0 4px 14px">Du hast es dir verdient – wirklich. Hier findest du was Schönes, wenn dir gerade nichts einfällt.</p>`;
  h += `<div class="card roulette" id="reward"><h3>🎁 Eine Idee, bitte</h3><p class="muted">Dir fällt nichts ein? Kein Problem – dafür ist das hier da. Kostet keine Sterne.</p>
    <div class="chips" style="justify-content:center">${C.REWARD_SIZES.map(([k, l]) => `<button class="chip ${ui.rsize === k ? 'on' : ''}" data-a="rsize" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="idea">${ui.ridea ? esc(ui.ridea) : '…'}</div>
    <div class="row"><button class="btn soft" data-a="roll">${ui.ridea ? 'Andere Idee' : 'Idee ziehen'}</button>${ui.ridea ? `<button class="btn soft" data-a="fav" aria-label="Merken">${S.favs.includes(ui.ridea) ? '♥' : '♡'}</button><button class="btn" data-a="treat">Gönn ich mir!</button>` : ''}</div>
    ${S.favs.length ? `<p class="muted" style="margin-top:14px;font-weight:800;text-align:left">Deine Favoriten</p><ul class="list-plain" style="text-align:left">${S.favs.map((f, i) => `<li><span>${esc(f)}</span><button class="mini-btn" data-a="usefav" data-i="${i}" aria-label="Auswählen">→</button><button class="mini-btn" data-a="delfav" data-i="${i}" aria-label="Entfernen">✕</button></li>`).join('')}</ul>` : ''}</div>`;
  h += `<div class="sec-title">Was dir guttun würde</div><div class="card"><p class="muted" style="margin-top:0">Fällt dir etwas ein, das dir Freude machen würde? Schreib es auf, wenn es dir einfällt – dann musst du nicht suchen, wenn du es brauchst.</p>
    <ul class="list-plain">${S.wishes.map(w => `<li><span>${esc(w.text)}</span><button class="mini-btn" data-a="delwish" data-id="${w.id}" aria-label="Löschen">✕</button></li>`).join('')}</ul>
    <form class="add" data-f="wish"><input name="t" placeholder="Das würde mir gefallen…" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form></div>`;
  return h;
}

// ---------- SCHÄTZE ----------
function viewSchaetze() {
  if (ui.sub === 'book') return viewBook();
  const pages = S.book.pages, full = pages >= C.BOOK_PAGES;
  let h = `<div class="sec-title" style="margin-top:6px">Deine Schätze</div><p class="muted" style="margin:0 4px 14px">Du hast <b>${S.stars} gute Nudel Sterne</b>. Gib sie aus, wofür du Lust hast.</p>`;
  h += `<div class="card"><div class="treasure"><div class="thumb" id="bookthumb">${pages ? '' : '🔒'}</div><div>
    <h3>${pages ? 'Dein Fotobuch' : 'Ein geheimes Fotobuch'}</h3>
    <p class="muted">${pages ? pages + ' von ' + C.BOOK_PAGES + ' Seiten' : 'Was drin ist? Das verrät dir Seite 1.'}</p>
    <div class="bar"><i style="width:${pages / C.BOOK_PAGES * 100}%"></i></div></div></div>
    <div class="row" style="margin-top:10px">${full ? '' : `<button class="btn" data-a="unlockpage" ${S.stars < C.pageCost(pages) ? 'disabled' : ''}>Seite freischalten · ${C.pageCost(pages)} ⭐</button>`}${pages ? '<button class="btn soft" data-a="openbook">Ansehen</button>' : ''}</div>
    ${!full && S.stars < C.pageCost(pages) ? `<p class="hint">Noch ${C.pageCost(pages) - S.stars} ⭐ bis zur nächsten Seite.</p>` : ''}</div>`;

  const st = S.plant.stage, ripe = st >= C.STAGES.length - 1;
  h += `<div class="card"><h3>🌿 Deine Pflanze${S.plant.harvests.length ? ' · Ernte Nr. ' + (S.plant.harvests.length + 1) : ''}</h3>
    <div class="plantbox"><div class="stagename">${C.STAGES[st]}</div>${plantSVG(st)}</div>
    ${ripe ? `<button class="btn green wide" data-a="harvest">Ernten! 🌿</button>`
      : `<button class="btn wide" data-a="grow" ${S.stars < C.STAGE_COST ? 'disabled' : ''}>Wachsen lassen · ${C.STAGE_COST} ⭐</button>
         <p class="hint">Stufe ${st + 1} von ${C.STAGES.length}. ${S.stars < C.STAGE_COST ? 'Noch ' + (C.STAGE_COST - S.stars) + ' ⭐.' : ''}</p>`}
    ${S.plant.harvests.length ? `<p class="muted" style="margin-top:12px;font-weight:800">Erntejournal</p><div class="shelf">${S.plant.harvests.map(x => `<span class="jar">🫙 ${esc(x.name)} <span class="muted">· ${shortDate(x.day)}</span></span>`).join('')}</div>` : ''}</div>`;


  return h;
}
function viewBook() {
  const pages = S.book.pages;
  let h = `<button class="btn soft" data-a="closebook" style="margin:4px 0 12px">← Zurück</button><div class="sec-title" style="margin-top:0">Dein Fotobuch</div>`;
  if (pages >= C.BOOK_PAGES) h += `<button class="btn wide" data-a="collage" style="margin-bottom:16px">✨ Das ganze Buch ansehen</button>`;
  h += '<div class="book">';
  for (let n = 1; n <= C.BOOK_PAGES; n++) {
    if (n <= pages) h += `<button class="bpage" data-a="viewpage" data-n="${n}"><span class="tape"></span><img data-photo="${n}" alt="Seite ${n}"><span class="no">${n}</span></button>`;
    else h += `<div class="bpage locked ${n === pages + 1 ? 'next' : ''}">${n === pages + 1 ? '🔓' : '🔒'}<span class="no">${n}</span></div>`;
  }
  return h + '</div>';
}
async function hydratePhotos(root = document) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const u = await D.photoURL(+img.dataset.photo);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted', textContent: '📷 lädt online' }));
  }
}

// ---------- WOCHE ----------
function weekStats(mon) {
  const days = weekDays(mon), log = S.log.filter(e => days.includes(e.day));
  const per = days.map(d => ({ d, work: log.filter(e => e.day === d && isWork(e)).length, rest: log.filter(e => e.day === d && isRest(e)).length }));
  return {
    mon, days, per, log,
    work: log.filter(isWork).length, rest: log.filter(isRest).length,
    stars: log.reduce((a, e) => a + (e.stars > 0 ? e.stars : 0), 0),
    pages: log.filter(e => e.kind === 'unlock' && e.what === 'page').length,
    stages: log.filter(e => e.kind === 'unlock' && e.what === 'stage').length,
    treats: log.filter(e => e.kind === 'reward').length,
    // handed-over tasks (older entries have no n: "3 Aufgaben an … abgegeben")
    sent: log.filter(e => e.kind === 'delegate').reduce((a, e) => a + (e.n || parseInt(e.text) || 1), 0),
    moods: log.filter(e => e.mood),
  };
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const moodFace = v => C.MOODS[Math.max(0, Math.min(4, Math.round(v) - 1))];
// how her tasks felt: average per task (at least 2 ratings), best and hardest
function moodByTask(log) {
  const by = {};
  log.filter(e => e.mood).forEach(e => { const k = e.text.trim().toLowerCase(); (by[k] = by[k] || { text: e.text, m: [] }).m.push(e.mood); });
  const L = Object.values(by).filter(x => x.m.length >= 2).map(x => ({ text: x.text, n: x.m.length, v: avg(x.m) })).sort((a, b) => b.v - a.v);
  return { best: L.filter(x => x.v >= 3.5).slice(0, 3), hard: L.filter(x => x.v <= 2.5).reverse().slice(0, 3) };
}
function viewWoche() {
  const mon = monday(today()), w = weekStats(mon), max = Math.max(1, ...w.per.map(p => p.work + p.rest));
  let h = `<button class="card wide rankwrap" data-a="rank">${rankCard(false)}</button><div class="sec-title" style="margin-top:6px">Diese Woche</div>
    <div class="stat-row"><button class="stat" data-a="weeklog" data-k="work" data-w="${mon}"><b>${w.work}</b><span>erledigt ›</span></button><button class="stat" data-a="weeklog" data-k="rest" data-w="${mon}"><b>${w.rest}</b><span>entspannt ›</span></button><button class="stat" data-a="weeksent" data-w="${mon}"><b>${w.sent}</b><span>abgegeben ›</span></button><div class="stat"><b>${w.stars}</b><span>Sterne</span></div></div>
    <div class="card" style="margin-top:14px"><div class="weekbars">${w.per.map(p => `<div><i style="height:${p.work / max * 100}%"></i>${p.rest ? `<i class="rest" style="height:${p.rest / max * 100}%"></i>` : ''}${C.DAYSHORT[parse(p.d).getDay()]}</div>`).join('')}</div>
    <p class="muted" style="text-align:center;margin:6px 0 0"><span style="color:var(--accent)">■</span> erledigt &nbsp; <span style="color:#7b62b8">■</span> entspannt</p></div>
    <button class="btn wide" data-a="story" data-w="${mon}">✨ Wochenrückblick ansehen</button>`;
  if (w.moods.length) {
    const t = moodByTask(S.log.filter(e => e.day >= addDays(today(), -28)));
    h += `<div class="sec-title">Wie es sich angefühlt hat</div><div class="card">
      <div class="moodweek">${w.per.map(p => { const m = w.moods.filter(e => e.day === p.d).map(e => e.mood); return `<div><b>${m.length ? moodFace(avg(m)) : '·'}</b><span>${C.DAYSHORT[parse(p.d).getDay()]}</span></div>`; }).join('')}</div>
      <p class="muted" style="text-align:center;margin:8px 0 0">Diese Woche im Schnitt: ${moodFace(avg(w.moods.map(e => e.mood)))} ${C.MOOD_WORDS[Math.round(avg(w.moods.map(e => e.mood))) - 1]} · ${w.moods.length} Bewertungen</p>
      ${t.best.length ? `<p style="margin:12px 0 4px"><b>Fühlt sich gut an</b></p><ul class="list-plain">${t.best.map(x => `<li><span>${esc(x.text)}</span><span>${moodFace(x.v)}</span></li>`).join('')}</ul>` : ''}
      ${t.hard.length ? `<p style="margin:12px 0 4px"><b>Zieht Energie</b> <span class="muted">– vielleicht mal an ${esc(pn())} abgeben?</span></p><ul class="list-plain">${t.hard.map(x => `<li><span>${esc(x.text)}</span><span>${moodFace(x.v)}</span></li>`).join('')}</ul>` : ''}
      <p class="hint">Die letzten 4 Wochen, ab 2 Bewertungen pro Aufgabe.</p></div>`;
  }
  const past = [];
  for (let i = 1; i <= 8; i++) { const m = addDays(mon, -7 * i); const s = weekStats(m); if (s.log.length) past.push(s); }
  if (past.length) {
    h += `<div class="sec-title">Frühere Wochen</div>` + past.map(s => `<button class="card btn soft wide" data-a="story" data-w="${s.mon}" style="text-align:left;display:flex;justify-content:space-between"><span>${shortDate(s.mon)} – ${shortDate(addDays(s.mon, 6))}</span><span>${s.work} erledigt · ${s.rest} entspannt${s.sent ? ' · ' + s.sent + ' abgegeben' : ''}</span></button>`).join('');
  }
  return h;
}

function weekLogModal(keep) { // this week's done (or rested) entries by day, each removable and (re)ratable
  const { k, w } = ui.wl, f = k === 'rest' ? isRest : isWork;
  const days = weekDays(w).filter(d => d <= today()).reverse();
  let h = '';
  for (const d of days) {
    const es = S.log.filter(e => e.day === d && f(e)); if (!es.length) continue;
    h += `<p class="muted" style="font-weight:800;margin:14px 0 4px">${esc(longDate(d))}</p><ul class="list-plain">` +
      es.map(e => ui.rateId === e.id
        ? `<li class="rating"><span>${esc(e.text)}</span><span class="faces">${C.MOODS.map((m, i) => `<button class="${e.mood === i + 1 ? 'on' : ''}" data-a="rateset" data-id="${e.id}" data-v="${i + 1}" aria-label="${C.MOOD_WORDS[i]}">${m}</button>`).join('')}</span></li>`
        : `<li><span>${esc(e.text)}</span>${e.stars > 0 ? `<span class="muted">+${e.stars}⭐</span>` : ''}<button class="mini-btn ratebtn" data-a="ratepick" data-id="${e.id}" aria-label="Bewerten">${e.mood ? C.MOODS[e.mood - 1] : '☆'}</button><button class="mini-btn" data-a="logdel" data-id="${e.id}" aria-label="Entfernen">✕</button></li>`).join('') + '</ul>';
  }
  modal(`<h2>${k === 'rest' ? 'Entspannt' : 'Erledigt'} diese Woche</h2><p class="muted" style="margin-top:0">Tipp auf ☆ (oder das Gesicht), um nachträglich zu bewerten, wie es sich angefühlt hat.</p><div style="text-align:left">${h || '<p class="muted">Noch nichts.</p>'}</div><div class="row"><button class="btn" data-a="close">Fertig</button></div>`, '', keep);
}

function story(mon) {
  const w = weekStats(mon), done = w.log.filter(isWork), best = w.per.reduce((a, b) => (b.work > a.work ? b : a), w.per[0]);
  const isPast = addDays(mon, 6) < today();
  const hl = done.map(e => e.text).filter((t, i, a) => a.indexOf(t) === i).sort(() => Math.random() - .5).slice(0, 6);
  const daysActive = w.per.filter(p => p.work).length || 1;
  const slides = [
    ['linear-gradient(160deg,#e0864a,#c8577a)', `<div class="k">DEIN WOCHENRÜCKBLICK</div><div class="t">${shortDate(mon)} – ${shortDate(addDays(mon, 6))}</div><p class="p">Lehn dich zurück.<br>Das hier ist alles deins.</p>`],
    ['linear-gradient(160deg,#2f5aa8,#6b4fb0)', w.work ? `<div class="k">${isPast ? 'IN DIESER WOCHE HAST DU' : 'BIS JETZT HAST DU DIESE WOCHE'}</div><div class="n">${w.work}</div><div class="t">Sachen erledigt</div><p class="p">Das sind im Schnitt ${(w.work / daysActive).toFixed(1).replace('.', ',')} pro Tag.<br>Jede einzelne zählt.</p>`
      : `<div class="k">DIESE WOCHE</div><div class="t">war eine ruhige Woche.</div><p class="p">Und das ist auch völlig in Ordnung.</p>`],
    ['linear-gradient(160deg,#4f9a5b,#2d7a6e)', best && best.work ? `<div class="k">DEIN STÄRKSTER TAG</div><div class="t">${C.DAYNAMES[parse(best.d).getDay()]}</div><div class="n">${best.work}</div><p class="p">Sachen an einem Tag. Wow.</p>`
      : `<div class="k">DEIN STÄRKSTER TAG</div><div class="t">kommt noch.</div>`],
    ['linear-gradient(160deg,#3b2f52,#7b62b8)', `<div class="k">SO OFT HAST DU DIR WAS GUTES GETAN</div><div class="n">${w.rest}</div><p class="p">${w.rest ? 'Das ist die eigentliche Heldentat.<br>Wirklich.' : 'Nächste Woche vielleicht?<br>Du hast es dir verdient.'}</p>`],
    ...(w.moods.length >= 3 ? [['linear-gradient(160deg,#2d7a6e,#4f9a5b)', (() => { const t = moodByTask(w.log), a = avg(w.moods.map(e => e.mood)); return `<div class="k">SO HAT SICH DEINE WOCHE ANGEFÜHLT</div><div class="n">${moodFace(a)}</div><div class="t">${C.MOOD_WORDS[Math.round(a) - 1]}</div>` +
      (t.best[0] ? `<p class="p">Am liebsten: <b>${esc(t.best[0].text)}</b> ${moodFace(t.best[0].v)}</p>` : '') + (t.hard[0] ? `<p class="p">Am zähesten: <b>${esc(t.hard[0].text)}</b> ${moodFace(t.hard[0].v)}</p>` : ''); })()]] : []),
    ['linear-gradient(160deg,#e3a92b,#e0864a)', `<div class="k">DU HAST VERDIENT</div><div class="n">${w.stars}</div><div class="t">gute Nudel Sterne</div><p class="p">${[w.pages ? w.pages + (w.pages === 1 ? ' neue Seite' : ' neue Seiten') + ' im Fotobuch' : '', w.stages ? w.stages + ' Wachstumsschritt' + (w.stages === 1 ? '' : 'e') + ' für die Pflanze' : '', w.treats ? w.treats + ' Mal was gegönnt' : ''].filter(Boolean).join('<br>') || 'Gesammelt und bereit zum Ausgeben.'}</p>`],
    ['linear-gradient(160deg,#c8577a,#6b4fb0)', hl.length ? `<div class="k">EIN PAAR DINGE, DIE DU GESCHAFFT HAST</div><ul>${hl.map(t => '<li>' + esc(t) + '</li>').join('')}</ul><p class="p">…und alles andere auch.</p>` : `<div class="k">DIESE WOCHE</div><div class="t">durfte auch mal leer sein.</div>`],
    ['linear-gradient(160deg,#e0864a,#e3a92b)', `<div class="t" style="font-size:52px">Du darfst stolz auf dich sein.</div><p class="p">Nicht weil alles erledigt ist – das ist es nie.<br>Sondern weil du so viel gegeben hast.<br>Und weil du eine gute Nudel bist. 💛</p><button class="btn soft" data-a="storyclose" style="margin-top:20px;background:rgba(255,255,255,.9);color:#c8577a">Schließen</button>`],
  ];
  let i = 0;
  const el = document.createElement('div'); el.className = 'story'; el.id = 'story';
  const show = () => {
    el.style.background = slides[i][0];
    el.innerHTML = `<div class="prog">${slides.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div><button class="x" data-a="storyclose" aria-label="Schließen">✕</button><div class="slide">${slides[i][1]}</div><div class="tapnote">${i < slides.length - 1 ? 'Tippen für weiter' : ''}</div>`;
    if (i === slides.length - 1) confetti(40);
  };
  el.addEventListener('click', e => {
    if (e.target.closest('[data-a]')) return;
    const left = e.clientX < window.innerWidth * 0.3;
    i = Math.max(0, Math.min(slides.length - 1, i + (left ? -1 : 1))); show();
  });
  show(); document.body.appendChild(el);
  if (isPast && !S.weeksSeen.includes(mon)) { S.weeksSeen.push(mon); commit(); }
}

// ---------- settings ----------
function ago(t) {
  if (!t) return 'noch nie';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'gerade eben' : m < 60 ? 'vor ' + m + ' Min.' : m < 1440 ? 'vor ' + Math.round(m / 60) + ' Std.' : 'vor ' + Math.round(m / 1440) + ' Tagen';
}
function settings() {
  const c = D.getCfg(), st = D.backup.status, exp = D.tokenExpiry();
  const dot = st === 'ok' ? 'ok' : st === 'wait' ? 'wait' : st === 'bad' ? 'bad' : '';
  const txt = { ok: 'Gesichert ' + ago(D.backup.last), wait: D.backup.err === 'offline' ? 'Offline – wird gesichert, sobald Internet da ist' : 'Wird gleich gesichert…', bad: 'Fehler: ' + D.backup.err, none: 'Sicherung noch nicht eingerichtet' }[st];
  const days = exp ? Math.round((exp - Date.now()) / 864e5) : null;
  modal(`<div style="text-align:left"><h2 style="text-align:center">Einstellungen</h2>
    <label class="field"><span>Wie soll dich die App nennen?</span><input id="s-name" value="${esc(S.name)}" placeholder="Dein Name (optional)"></label>
    <label class="field"><span>Wie heißt dein Partner hier? (Spitzname)</span><input id="s-nick" value="${esc(pn() === 'Partner' ? '' : pn())}" placeholder="${esc(S.partnerName || 'Name')}"></label>
    <label class="field"><span>Feierabend ab (dann heißt es „Tag geschafft!“)</span><input id="s-end" type="time" value="${esc(endTime())}"></label>
    <h3 style="margin:18px 0 4px">☁ Sicherung</h3>
    <div class="status"><span class="dot ${dot}"></span>${esc(txt)}</div>
    ${days !== null && days < 21 ? `<div class="warn">Der Sicherungs-Schlüssel läuft in ${days} Tagen ab. Bitte einen neuen eintragen.</div>` : ''}
    <label class="field"><span>GitHub-Name</span><input id="s-owner" value="${esc(c.owner || '')}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span>Repo</span><input id="s-repo" value="${esc(c.repo || 'gute-nudel-daten')}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span>Schlüssel (Token)</span><input id="s-token" type="password" value="${esc(c.token || '')}" autocomplete="off" spellcheck="false"></label>
    <div class="row"><button class="btn blue" data-a="cfgsave">Verbinden & testen</button></div>
    <label class="field"><span>…oder Einrichtungs-Link einfügen (vom QR-Code)</span><input id="s-link" placeholder="https://limezzje.github.io/gute-nudel/#setup=…" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <div class="row"><button class="btn soft" data-a="cfglink">Mit Link einrichten</button></div>
    <div class="row"><button class="btn soft" data-a="backupnow">Jetzt sichern</button><button class="btn soft" data-a="restore">Wiederherstellen</button></div>
    <div class="row"><button class="btn soft" data-a="export">Als Datei speichern</button></div>
    <div class="row"><button class="btn soft" data-a="wipe" style="color:var(--danger)">Handy trennen & leeren</button></div>
    <p class="muted" id="s-msg"></p>
    <div class="row"><button class="btn" data-a="settingsclose">Fertig</button></div><p class="muted" style="text-align:center;margin-top:10px">Version ${VERSION} · ${esc(D.me())}</p></div>`);
}
async function saveCfgAndTest() {
  const msg = $('#s-msg');
  await D.setCfg({ owner: $('#s-owner').value.trim(), repo: $('#s-repo').value.trim(), token: $('#s-token').value.trim() });
  msg.textContent = 'Teste Verbindung…';
  try {
    const r = await D.testConnection();
    if (!r.ok) { msg.textContent = '❌ ' + r.msg; return; }
    msg.textContent = '✅ Verbunden' + (r.private ? ' (privates Repo).' : ' – ACHTUNG: das Repo ist öffentlich!');
    const remote = await D.fetchBackup().catch(() => null);
    if (remote && remote.updatedAt > S.updatedAt && !S.log.length) {
      msg.textContent += ' Sicherung gefunden – wird geladen…';
      await applyRestore(remote); return;
    }
    D.scheduleBackup(S, 10); renderTop();
  } catch (e) { msg.textContent = '❌ ' + e.message; }
}
async function applyRestore(remote) {
  S = Object.assign(D.freshState(), remote, { me: D.me() });
  D.markSynced(remote.updatedAt, remote);
  await D.saveLocal(S);
  rollover(); closeModal(); render(); toast('Wiederhergestellt ✓');
}
function exportFile() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
  a.download = 'gute-nudel-' + today() + '.json'; a.click();
}

// ---------- actions ----------
const A = {
  go(el) { closeModal(); ui.tab = el.dataset.tab; ui.sub = null; if (el.dataset.q) ui.qtab = el.dataset.q; render(); scrollTo(0, 0); if (el.dataset.to) setTimeout(() => { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); },
  close: closeModal,
  pickday(el) { const id = el.dataset.id; ui.picks.has(id) ? ui.picks.delete(id) : ui.picks.add(id); render(); },
  plandone() { S.items.forEach(i => { if (ui.picks.has(i.id)) { i.where = 'heute'; } }); ui.picks.clear(); S.today.planned = true; commit(); },
  tick(el) { tick(el.dataset.id, el); },
  later(el) { const i = S.items.find(x => x.id === el.dataset.id); if (i) { i.where = 'liste'; commit(); toast('Zurück auf der Liste – kein Stress.'); } },
  undo(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    S.log = S.log.filter(x => x !== e); S.stars = Math.max(0, S.stars - e.stars); S.earned = Math.max(0, S.earned - e.stars);
    if (e.kind === 'task') S.items.unshift({ id: e.chore ? choreItemId(e.chore, e.day) : uid(), text: e.text, where: 'heute', created: Date.now(), ...(e.did ? { did: e.did, from: e.from } : {}), ...(e.chore ? { chore: e.chore } : {}) });
    if (e.chore) { const c = S.chores.find(x => x.id === e.chore); if (c) c.last = e.prevLast || null; S.gifts = S.gifts.filter(g => !(g.cid === e.chore && g.day === e.day)); }
    let post = false;
    if (e.did && S.answered[e.did]) { S.answered[e.did] = { status: 'ok', ts: Date.now() }; post = true; }
    S.today.celebrated = false; S.today.closed = false; commit(post);
  },
  closeday() {
    modal(`<h2>Für heute Schluss?</h2><p>Was noch offen ist, wandert zurück auf die Liste. Es läuft nicht weg.</p><div class="row"><button class="btn green" data-a="closeyes">Ja, Feierabend!</button><button class="btn soft" data-a="close">Doch nicht</button></div>`);
  },
  closeyes() {
    closeModal();
    S.items = S.items.filter(i => !(i.chore && i.where === 'heute'));   // chores come back when they're due again
    S.items.filter(i => i.where === 'heute').forEach(i => { i.where = 'liste'; });
    S.today.closed = true; S.today.planned = true; commit(); confetti(40);
  },
  fromlist() {
    const l = S.items.filter(i => i.where === 'liste');
    modal(`<h2>Aus der Liste holen</h2><div style="text-align:left">${l.map(i => `<button class="pick" data-a="takeone" data-id="${i.id}"><span class="box"></span><span>${esc(i.text)}</span></button>`).join('')}</div><div class="row"><button class="btn soft" data-a="close">Fertig</button></div>`);
  },
  takeone(el) { const i = S.items.find(x => x.id === el.dataset.id); if (i) { i.where = 'heute'; S.today.planned = true; S.today.closed = false; el.remove(); commit(); } },
  toheute(el) { const i = S.items.find(x => x.id === el.dataset.id); if (i) { i.where = 'heute'; S.today.planned = true; S.today.closed = false; commit(); toast('Auf der Seite von heute ☀'); } },
  del(el) { S.items = S.items.filter(x => x.id !== el.dataset.id); commit(); },

  delegate() { ui.dpicks = new Set(); ui.dtoday = false; delegateModal(); },
  dpick(el) { const id = el.dataset.id; ui.dpicks.has(id) ? ui.dpicks.delete(id) : ui.dpicks.add(id); delegateModal(); },
  dtoday() { ui.dtoday = !ui.dtoday; delegateModal(); },
  dsend() {
    const picked = S.items.filter(i => ui.dpicks.has(i.id)); if (!picked.length) return;
    S.items = S.items.filter(i => !ui.dpicks.has(i.id));
    const listOf = i => { const c = i.chore && S.chores.find(x => x.id === i.chore); return c && (c.tools || []).includes('list') && S.shop.some(x => !x.done) ? S.shop.filter(x => !x.done).map(x => x.text) : (i.list ? i.list.filter(x => !x.done).map(x => x.text) : null); };
    picked.forEach(i => { const list = listOf(i); S.sent.push({ id: uid(), text: i.text, today: !!ui.dtoday, ts: Date.now(), status: 'wartet', ...(list ? { list } : {}) }); });
    picked.forEach(i => { const c = i.chore && S.chores.find(x => x.id === i.chore); if (c) c.last = today(); });   // handed over counts as handled
    S.log.push({ id: uid(), text: picked.length + (picked.length === 1 ? ' Aufgabe' : ' Aufgaben') + ' an ' + pn() + ' abgegeben', kind: 'delegate', n: picked.length, day: today(), ts: Date.now(), stars: 1 }); earn(1);
    closeModal(); commit(true);
    modal(`<h2>Abgegeben!</h2><p>Nicht alles allein machen zu müssen, ist auch eine Stärke.</p><p>+1 gute Nudel Stern ⭐</p><p class="muted">${esc(pn())} sieht ${picked.length === 1 ? 'die Aufgabe' : 'die Aufgaben'} beim nächsten Öffnen der App.</p><div class="row"><button class="btn" data-a="close">💛</button></div>`);
  },
  withdraw(el) {
    const x = S.sent.find(y => y.id === el.dataset.id); if (!x || x.status === 'erledigt') return;
    modal(`<h2>Zurückholen?</h2><p><b>${esc(x.text)}</b> kommt zurück auf deine Liste${x.status === 'ok' ? ' und verschwindet bei ' + esc(pn()) : ''}.</p><div class="row"><button class="btn" data-a="withdrawyes" data-id="${x.id}">Ja, zurückholen</button><button class="btn soft" data-a="close">Doch nicht</button></div>`);
  },
  withdrawyes(el) {
    const x = S.sent.find(y => y.id === el.dataset.id); if (!x || x.status === 'erledigt') return closeModal();
    x.status = 'weg'; x.wts = Date.now();
    S.items.unshift({ id: uid(), text: x.text, where: 'liste', created: Date.now() });
    closeModal(); commit(true); toast('Zurück auf deiner Liste 📋');
  },
  accept(el) {
    const x = S.incoming.find(y => y.id === el.dataset.id); if (!x) return;
    S.items.push({ id: uid(), text: x.text, where: x.today ? 'heute' : 'liste', created: Date.now(), from: pn(), did: x.id, ...(x.today ? { urgent: true } : {}), ...(x.list ? { list: x.list.map(t => ({ id: uid(), text: t, done: false })) } : {}) });
    if (x.today) { S.today.planned = true; S.today.closed = false; }
    S.answered[x.id] = { status: 'ok', ts: Date.now() }; S.incoming = S.incoming.filter(y => y !== x);
    commit(true); toast(x.today ? 'Steht auf deiner Seite für heute ☀' : 'Steht jetzt auf deiner Liste 📋');
  },
  declinestart(el) { ui.declining = el.dataset.id; render(); const i = document.querySelector('form[data-f="decline"] input'); if (i) i.focus(); },
  declinecancel() { ui.declining = null; render(); },
  combostart(el) {
    const c = C.COMBOS.find(x => x.id === el.dataset.id); if (!c) return;
    const it = { id: uid(), text: c.work, where: 'heute', created: Date.now(), quest: c.icon };
    S.items.push(it); S.today.planned = true; S.today.closed = false;
    S.combo = { id: c.id, day: today(), phase: 'work', iid: it.id };
    commit(); toast('Teil 1 steht auf deiner Seite für heute ' + c.icon);
  },
  combocancel() { if (S.combo) { S.items = S.items.filter(i => i.id !== S.combo.iid); S.combo = null; commit(); } },
  combodone() {
    const c = S.combo && C.COMBOS.find(x => x.id === S.combo.id); if (!c || S.combo.phase !== 'reward') return;
    S.log.push({ id: uid(), text: c.title + ': ' + c.reward, kind: 'rest', day: today(), ts: Date.now(), stars: C.COMBO_REWARD_STARS }); earn(C.COMBO_REWARD_STARS);
    S.combo = null; commit(); confetti(60);
    modal(`<h2>Doppel-Quest bestanden!</h2><p><b>${esc(c.title)}</b> – Arbeit erledigt <i>und</i> genossen.</p><p>+${C.COMBO_REWARD_STARS} gute Nudel Sterne ⭐</p><p class="muted">Das ist die hohe Kunst.</p><div class="row"><button class="btn" data-a="close">💛</button></div>`);
  },
  allcombos() { ui.showAllCombos = !ui.showAllCombos; render(); },
  qtab(el) { ui.qtab = el.dataset.v; ui.rid = null; ui.cstep = null; ui.shopEdit = false; ui.tagId = null; render(); scrollTo(0, 0); },
  htab(el) { ui.htab = el.dataset.v; render(); scrollTo(0, 0); },
  choretpl(el) {
    const t = C.CHORE_TEMPLATES.find(x => x.name === el.dataset.v); if (!t) return;
    const c = { id: uid(), icon: t.icon, name: t.name, ...(t.week ? { week: t.week.slice() } : { every: t.every }), reward: t.reward || null, last: null, tools: (t.tools || []).slice(), music: '', skip: addDays(today(), 1) };
    S.chores.push(c); commit();
    toast(c.icon + ' ' + c.name + ' – ' + choreRhythm(c) + ' · ab morgen. In „Meine Woche“ legst du die Tage fest.');
  },
  cday(el) {
    const c = S.chores.find(x => x.id === el.dataset.id), d = +el.dataset.v; if (!c) return;
    if (!c.week || !c.week.length) { c.week = []; delete c.every; }   // a day tapped: from "every N days" to fixed days
    c.week.includes(d) ? c.week.splice(c.week.indexOf(d), 1) : c.week.push(d);
    planChanged(c); commit();
  },
  exweek() {
    let added = 0;
    for (const e of C.EXAMPLE_WEEK) {
      const t = C.CHORE_TEMPLATES.find(x => x.name === e.name); if (!t) continue;
      let c = S.chores.find(x => x.name === e.name);
      if (!c) { c = { id: uid(), icon: t.icon, name: t.name, reward: t.reward || null, last: null, tools: (t.tools || []).slice(), music: '' }; S.chores.push(c); added++; }
      if (e.week) { c.week = e.week.slice(); delete c.every; } else { c.every = e.every; delete c.week; }
      planChanged(c);
    }
    commit(); toast('📅 Beispielwoche übernommen' + (added ? ' (' + added + ' neu)' : '') + ' – gilt ab morgen');
  },
  choreskip(el) {
    const it = S.items.find(i => i.id === el.dataset.id), c = it && S.chores.find(x => x.id === it.chore); if (!it) return;
    if (c) c.skip = addDays(today(), 1);
    S.items = S.items.filter(i => i !== it); commit(); toast('Heute nicht – morgen wieder 🔁');
  },
  choredel(el) {
    const c = S.chores.find(x => x.id === el.dataset.id); if (!c) return;
    modal(`<h2>${esc(c.icon)} Löschen?</h2><p><b>${esc(c.name)}</b> kommt dann nicht mehr von allein.</p><div class="row"><button class="btn" data-a="choredelyes" data-id="${c.id}">Löschen</button><button class="btn soft" data-a="close">Doch nicht</button></div>`);
  },
  choredelyes(el) { S.chores = S.chores.filter(x => x.id !== el.dataset.id); S.items = S.items.filter(i => i.chore !== el.dataset.id); closeModal(); commit(); },
  choreedit(el) {
    const c = el.dataset.id && S.chores.find(x => x.id === el.dataset.id);
    ui.ce = c ? { id: c.id, icon: c.icon, name: c.name, mode: c.week && c.week.length ? 'week' : 'days', every: c.every || 7, next: c.week && c.week.length ? null : choreNext(c), nextTouched: true, week: (c.week || []).slice(), reward: c.reward || '', start: 'morgen', tools: (c.tools || []).slice(), music: c.music || '' }
      : { id: null, icon: '🔁', name: '', mode: 'week', every: 7, week: [], reward: '', start: 'morgen', tools: [], music: '' };
    choreModal();
  },
  cemode(el) { ceRead(); ui.ce.mode = el.dataset.v; choreModal(); },
  ceicon(el) { ceRead(); ui.ce.icon = el.dataset.v; ui.ce.iconSet = true; const i = $('#ce-icon'); if (i) i.value = ''; choreModal(); },   // "alle paar Tage" brings its own start date
  cenext(el) { ceRead(); const v = el.dataset.v; ui.ce.next = addDays(today(), v === 'every' ? (+ui.ce.every || 7) : +v); ui.ce.nextTouched = true; choreModal(); },
  chorenext(el) {
    const c = S.chores.find(x => x.id === el.dataset.id), k = el.value; if (!c) return;
    if (!k || k < today()) { render(); return; }
    setChoreNext(c, k); commit(); toast('🔁 ' + c.name + ': nächstes Mal ' + longDate(k));
  },
  ceday(el) { ceRead(); const d = +el.dataset.v, w = ui.ce.week; w.includes(d) ? w.splice(w.indexOf(d), 1) : w.push(d); choreModal(); },
  cerew(el) { ceRead(); ui.ce.reward = ui.ce.reward === el.dataset.v ? '' : el.dataset.v; ui.ce.own = false; choreModal(); },
  ceown() { ceRead(); ui.ce.own = true; ui.ce.reward = ''; choreModal(); },
  cestart(el) { ceRead(); ui.ce.start = el.dataset.v; if (ui.ce.start === 'datum' && !ui.ce.startDate) ui.ce.startDate = addDays(today(), 1); choreModal(); },
  wkday(el) { ui.wkDay = el.dataset.k; render(); },
  wkoff(el) { ui.wkOff = Math.max(0, Math.min(4, (ui.wkOff || 0) + +el.dataset.d)); ui.wkDay = null; render(); },
  cetool(el) { ceRead(); const t = el.dataset.v, a = ui.ce.tools; a.includes(t) ? a.splice(a.indexOf(t), 1) : a.push(t); choreModal(); },
  cesave() {
    ceRead();
    const e = ui.ce, msg = $('#ce-msg');
    if (!e.name) { msg.textContent = 'Wie heißt die Aufgabe?'; return; }
    if (e.mode === 'week' && !e.week.length) { msg.textContent = 'Mindestens einen Wochentag wählen.'; return; }
    if (!e.id && e.mode === 'week' && e.start === 'datum' && (!e.startDate || e.startDate < today())) { msg.textContent = 'Bitte ein Datum ab heute wählen.'; return; }
    if (e.mode === 'days' && (!e.next || e.next < today())) { msg.textContent = 'Bitte ein Datum ab heute wählen.'; return; }
    const every = Math.max(1, Math.min(90, Math.round(+e.every) || 7));
    let c = e.id && S.chores.find(x => x.id === e.id);
    if (!c) {
      c = { id: uid(), icon: '🔁', last: null }; S.chores.push(c);
      if (e.start === 'morgen') c.skip = addDays(today(), 1);
      if (e.mode === 'week' && e.start === 'datum' && e.startDate > today()) c.skip = e.startDate;   // nothing before that day
    }
    Object.assign(c, { icon: e.iconSet ? e.icon || '🔁' : e.id && e.icon && e.icon !== '🔁' ? e.icon : guessIcon(e.name), name: e.name, reward: e.reward || null, tools: e.tools.slice(), music: e.music || '', ...(e.mode === 'week' ? { week: e.week.slice(), every: undefined } : { every, week: undefined }) });
    if (e.mode === 'days') setChoreNext(c, e.next);
    S.items.filter(i => i.chore === c.id).forEach(i => { i.text = c.name; });
    if (!choreDue(c, today())) S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute'));
    scheduleChores(); closeModal(); commit(); toast('Gespeichert 🔁');
  },
  cookback() { ui.sub = null; ui.qtab = 'kochbuch'; ui.rid = null; render(); scrollTo(0, 0); },
  cookhome() { endCookMode(); ui.rid = null; ui.sides = []; render(); scrollTo(0, 0); },
  cookreroll() { ui.sugSeed = (ui.sugSeed || 1) + 1; render(); },
  ccat(el) { ui.ccat = el.dataset.v; render(); },
  recipe(el) { if (el.dataset.go || ui.tab !== 'ruhe') { closeModal(); ui.tab = 'ruhe'; ui.sub = null; ui.qtab = 'kochbuch'; } ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = []; render(); scrollTo(0, 0); },
  ingextradel(el) { ui.ingExtra.splice(+el.dataset.i, 1); render(); },
  ingtoggle(el) { const t = el.dataset.v; ui.ingPick = ui.ingPick || {}; ui.ingPick[ingKey(t)] = !ingWanted(t); render(); },
  side(el) { const id = el.dataset.id, a = ui.sides || (ui.sides = []); a.includes(id) ? a.splice(a.indexOf(id), 1) : a.push(id); render(); },
  cookshop2() {
    const r = recipeById(ui.rid), all = r.ing.concat(...sidesOf().map(s => s.ing)).filter(([, t]) => t);
    const add = all.filter(([, t]) => ingWanted(t) && !onList(t));
    add.forEach(([q, t]) => S.shop.push({ id: uid(), text: q ? t + ' (' + q + ')' : t, done: false, from: r.title }));
    (ui.ingExtra || []).forEach(t => S.shop.push({ id: uid(), text: t, done: false }));
    const nExtra = (ui.ingExtra || []).length;
    ui.ingPick = {}; ui.ingExtra = [];
    commit(); shopModal();   // the list right away, as a pop-over
    toast(add.length + nExtra ? (add.length + nExtra) + ' Sachen dazugekommen 🛒' : 'Steht schon alles drauf 🛒');
  },
  cookstart() { ui.cstep = 0; render(); scrollTo(0, 0); },
  cnext() { ui.cstep++; render(); },
  cprev() { ui.cstep = Math.max(0, ui.cstep - 1); render(); },
  cookstop() { endCookMode(); render(); },
  steptimer(el) { const r = recipeById(ui.rid), i = el.dataset.i != null ? +el.dataset.i : ui.cstep, [, m] = cookSteps(r, sidesOf())[i]; phoneTimer(m); },
  cooktimer() { A.steptimer({ dataset: {} }); },
  cookdone() {
    const r = recipeById(ui.rid);
    modal(`<h2>Guten Appetit! ${r.icon}</h2><p>Wie hat’s geschmeckt?</p><div class="row">${K.TASTE.map(([e, l, v]) => `<button class="btn soft" data-a="taste" data-v="${v}" style="font-size:16px">${e}<br>${l}</button>`).join('')}</div>`);
  },
  taste(el) {
    const r = recipeById(ui.rid), v = +el.dataset.v, c = S.cook[r.id] || { n: 0 };
    S.cook[r.id] = { n: c.n + 1, last: today(), taste: v };
    endCookMode(); closeModal();
    // the "Kochen" chore on today's page counts as done
    const k = S.items.find(i => i.where === 'heute' && i.chore && ((S.chores.find(x => x.id === i.chore) || {}).tools || []).includes('recipes'));
    ui.rid = null; ui.sides = [];
    if (k) tick(k.id, null); else commit();
    toast(v === 3 ? 'Notiert: Lieblingsessen 😍 – kommt öfter dran' : v === 1 ? 'Notiert 😕 – das schlage ich nicht mehr vor' : 'Notiert 🙂' + (k ? '' : ''));
  },
  tool(el) {
    const t = el.dataset.t, c = el.dataset.c && S.chores.find(x => x.id === el.dataset.c);
    if (t === 'list') { closeModal(); ui.tab = 'ruhe'; ui.sub = null; ui.qtab = 'einkauf'; ui.rid = null; render(); scrollTo(0, 0); return; }
    if (t === 'recipes') { closeModal(); ui.tab = 'ruhe'; ui.sub = null; ui.qtab = 'kochbuch'; ui.rid = null; ui.cstep = null; render(); scrollTo(0, 0); return; }
    if (t === 'music') {
      if (c && c.music) { window.open(c.music, '_blank', 'noopener'); return; }
      ui.ce = null; if (c) A.choreedit({ dataset: { id: c.id } });
      toast('Füg hier den Link zu deiner Playlist ein 🎵');
    }
  },
  shoptick(el) {
    const it = el.dataset.item && S.items.find(i => i.id === el.dataset.item), L = it ? it.list : S.shop, x = L.find(y => y.id === el.dataset.id); if (!x) return;
    x.done = !x.done; commit(); shopModal(it, true);
  },
  shopdel(el) {
    const it = el.dataset.item && S.items.find(i => i.id === el.dataset.item);
    if (it) it.list = it.list.filter(y => y.id !== el.dataset.id); else S.shop = S.shop.filter(y => y.id !== el.dataset.id);
    commit(); shopModal(it, true);
  },
  shopstore(el) { S.shopStore = el.dataset.v; commit(); shopAgain(); },
  shopedit() { ui.shopEdit = !ui.shopEdit; ui.tagId = null; shopAgain(); },
  shopmove(el) {
    const o = shopOrder(), i = +el.dataset.v, j = i + +el.dataset.d; if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    S.shopOrder = Object.assign({}, S.shopOrder, { [Sh.STORES[S.shopStore] ? S.shopStore : 'standard']: o }); commit(); shopAgain();
  },
  shoptag(el) { ui.tagId = ui.tagId === el.dataset.id ? null : el.dataset.id; shopAgain(); },
  shopsec(el) { // her correction: this item — and this word from now on — belongs there
    const it = el.dataset.item && S.items.find(i => i.id === el.dataset.item), L = it ? it.list : S.shop, x = L.find(y => y.id === el.dataset.id); if (!x) return;
    x.sec = el.dataset.v; S.shopLearn = Object.assign({}, S.shopLearn, { [Sh.norm(x.text)]: el.dataset.v }); ui.tagId = null; commit(); shopAgain();
  },
  shopwipe() { ui.shopWipe = !ui.shopWipe; shopAgain(); },
  shopwipeyes() { S.shop = []; ui.shopWipe = false; commit(); shopAgain(); toast('Einkaufsliste geleert 🛒'); },
  shopclear() { S.shop = S.shop.filter(x => !x.done); commit(); shopModal(null, true); },
  itemlist(el) { const it = S.items.find(i => i.id === el.dataset.id); if (it && it.list) shopModal(it); },
  cook(el) { ui.cookEdit = false; cookModal(el.dataset.id || null); },
  cookedit(el) { ui.cookEdit = true; cookModal(el.dataset.id); },
  cooksave(el) {
    const title = $('#rc-title').value.trim(), ing = $('#rc-ing').value.split('\n').map(x => x.trim()).filter(Boolean), steps = $('#rc-steps').value.trim();
    if (!title) { $('#rc-msg').textContent = 'Wie heißt das Rezept?'; return; }
    let r = el.dataset.id && S.recipes.find(x => x.id === el.dataset.id);
    if (!r) { r = { id: uid() }; S.recipes.push(r); }
    Object.assign(r, { title, ingredients: ing, steps }); ui.cookEdit = false; commit(); cookModal(r.id);
  },
  cookdel(el) { S.recipes = S.recipes.filter(x => x.id !== el.dataset.id); ui.cookEdit = false; commit(); cookModal(); },
  cookshop(el) {
    const r = S.recipes.find(x => x.id === el.dataset.id); if (!r) return;
    const have = new Set(S.shop.filter(x => !x.done).map(x => x.text.toLowerCase()));
    const add = r.ingredients.filter(x => !have.has(x.toLowerCase()));
    add.forEach(t => S.shop.push({ id: uid(), text: t, done: false, from: r.title }));
    commit(); toast(add.length ? add.length + ' Zutaten auf der Einkaufsliste 🛒' : 'Steht schon alles drauf 🛒');
  },
  mood(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    e.mood = +el.dataset.v; D.saveLocal(S); D.scheduleBackup(S);
    const bar = el.closest('.moodbar'); if (bar) { bar.innerHTML = '<span>' + C.MOODS[e.mood - 1] + ' notiert</span>'; setTimeout(() => bar.remove(), 900); }
  },
  giftdone(el) {
    const g = S.gifts.find(x => x.id === el.dataset.id); if (!g) return;
    S.log.push({ id: uid(), text: g.name + ': ' + g.reward, kind: 'rest', day: today(), ts: Date.now(), stars: C.COMBO_REWARD_STARS }); earn(C.COMBO_REWARD_STARS);
    S.gifts = S.gifts.filter(x => x !== g); commit(); confetti(60);
    modal(`<h2>Doppel-Quest bestanden!</h2><p><b>${esc(g.name)}</b> – erledigt <i>und</i> genossen.</p><p>+${C.COMBO_REWARD_STARS} gute Nudel Sterne ⭐</p><p class="muted">Das ist die hohe Kunst.</p><div class="row"><button class="btn" data-a="close">💛</button></div>`);
  },
  queststart(el) { S.quest = el.dataset.id; commit(); scrollTo({ top: 0, behavior: 'smooth' }); },
  questquit() { S.quest = null; commit(); },
  questdone() {
    const q = C.QUESTS.find(x => x.id === S.quest); if (!q) return;
    S.log.push({ id: uid(), text: q.title, kind: 'rest', day: today(), ts: Date.now(), stars: C.REST_STARS }); earn(C.REST_STARS);
    S.quest = null; commit(); confetti(50);
    modal(`<h2>Quest überlebt!</h2><p><b>${esc(q.title)}</b> ist besiegt.</p><p>+${C.REST_STARS} gute Nudel Sterne ⭐</p><p class="muted">Das war schwer. Wir wissen das.</p><div class="row"><button class="btn" data-a="close">Weiter so</button></div>`);
  },
  allquests() { ui.showAllQuests = !ui.showAllQuests; render(); },
  recstart(el) { const r = C.RECIPES.find(x => x.id === el.dataset.id); S.recipe = { id: r.id, mini: false, done: r.steps.map(() => false) }; commit(); },
  recmini(el) { const r = C.RECIPES.find(x => x.id === S.recipe.id), mini = el.dataset.v === '1'; if (mini === S.recipe.mini) return; S.recipe = { id: r.id, mini, done: (mini ? r.mini : r.steps).map(() => false) }; commit(); },
  recstep(el) {
    const i = +el.dataset.i, r = C.RECIPES.find(x => x.id === S.recipe.id), steps = S.recipe.mini ? r.mini : r.steps;
    if (S.recipe.done[i]) return;
    S.recipe.done[i] = true;   // the steps are just a checklist — the stars come when it's enjoyed
    commit();
  },
  recstop() { S.recipe = null; commit(); },
  recdone() {
    const r = C.RECIPES.find(x => x.id === S.recipe.id);
    S.log.push({ id: uid(), text: r.title + (S.recipe.mini ? ' (Mini)' : ''), kind: 'rest', day: today(), ts: Date.now(), stars: 2 }); earn(2);
    S.recipe = null; commit(); confetti(40); toast('Genossen! +2 ⭐ 💛');
  },
  prepopen(el) { ui.openPrep = ui.openPrep === el.dataset.id ? null : el.dataset.id; render(); },
  prepstep(el) {
    const p = C.PREPS.find(x => x.id === el.dataset.id), i = +el.dataset.i, st = S.preps[p.id] || (S.preps[p.id] = p.steps.map(() => false));
    if (st[i]) return;
    st[i] = true;
    if (st.every(Boolean)) {   // only the finished preparation counts
      S.log.push({ id: uid(), text: p.title, kind: 'prep', day: today(), ts: Date.now(), stars: 2 }); earn(2);
      floatStar(el, '+2 ⭐'); commit(); confetti(40); toast(p.title + ' – fertig! +2 ⭐ Das hilft dir an müden Tagen.');
    } else commit();
  },
  delwish(el) { S.wishes = S.wishes.filter(w => w.id !== el.dataset.id); commit(); },

  async unlockpage() {
    const cost = C.pageCost(S.book.pages);
    if (S.stars < cost || S.book.pages >= C.BOOK_PAGES) return;
    S.stars -= cost; S.book.pages++;
    const n = S.book.pages;
    S.log.push({ id: uid(), text: 'Fotobuch Seite ' + n, kind: 'unlock', what: 'page', day: today(), ts: Date.now(), stars: -cost });
    commit();
    const o = modal(`<h2>Seite ${n}!</h2><div class="polaroid reveal" id="rv"><div class="muted" style="padding:60px 0">Wird entwickelt…</div><div class="cap">${n} / ${C.BOOK_PAGES}</div></div><div class="row"><button class="btn" data-a="${n >= C.BOOK_PAGES ? 'collage' : 'close'}">${n >= C.BOOK_PAGES ? 'Das ganze Buch ✨' : 'Schön!'}</button></div>`);
    const u = await D.photoURL(n), rv = o.querySelector('#rv');
    if (rv) rv.firstElementChild.outerHTML = u ? `<img src="${u}" alt="Seite ${n}">` : `<div class="muted" style="padding:40px 10px">Das Foto lädt, sobald du online bist. Die Seite gehört schon dir.</div>`;
    confetti(n >= C.BOOK_PAGES ? 140 : 70);
  },
  openbook() { ui.sub = 'book'; render(); scrollTo(0, 0); },
  closebook() { ui.sub = null; render(); },
  async viewpage(el) {
    let n = +el.dataset.n;
    const v = document.createElement('div'); v.className = 'viewer';
    const show = async () => {
      v.innerHTML = `<button class="x" data-v="x" aria-label="Schließen">✕</button><img alt="Seite ${n}"><div class="vbar"><button data-v="-1" aria-label="Zurück">‹</button><span>Seite ${n}</span><button data-v="1" aria-label="Weiter">›</button></div>`;
      const u = await D.photoURL(n); if (u) v.querySelector('img').src = u;
    };
    v.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      if (b.dataset.v === 'x') return v.remove();
      n = Math.max(1, Math.min(S.book.pages, n + +b.dataset.v)); show();
    });
    document.body.appendChild(v); show();
  },
  async collage() {
    const o = modal(`<h2>Das ganze Buch!</h2><p>Alle ${C.BOOK_PAGES} Seiten – jede einzelne hast du dir verdient.</p><div class="collage">${Array.from({ length: C.BOOK_PAGES }, (_, i) => `<img data-photo="${i + 1}" alt="">`).join('')}</div><div class="row"><button class="btn" data-a="close">💛</button></div>`);
    confetti(80); hydratePhotos(o);
  },
  grow() {
    if (S.stars < C.STAGE_COST) return;
    S.stars -= C.STAGE_COST; S.plant.stage++;
    S.log.push({ id: uid(), text: 'Pflanze: ' + C.STAGES[S.plant.stage], kind: 'unlock', what: 'stage', day: today(), ts: Date.now(), stars: -C.STAGE_COST });
    commit(); toast('🌱 ' + C.STAGES[S.plant.stage] + '!');
    if (S.plant.stage === C.STAGES.length - 1) confetti(50);
  },
  harvest() {
    const name = C.strainName(S.plant.harvests.length);
    S.plant.harvests.push({ name, day: today() }); S.plant.stage = 0; commit(); confetti(100);
    modal(`<h2>Ernte! 🌿</h2><p>Deine Sorte heißt:</p><p class="hand" style="font-size:44px;color:var(--green);margin:6px 0">${esc(name)}</p><p class="muted">Sie steht jetzt im Erntejournal. Ein neues Samenkorn liegt schon in der Erde.</p><div class="row"><button class="btn" data-a="close">Hihi</button></div>`);
  },
  rsize(el) { ui.rsize = el.dataset.v; ui.ridea = null; render(); },
  roll() {
    const own = ui.rsize === 'gross' ? [] : S.wishes.map(w => w.text); // her own wishes come up twice as often
    const pool = [...C.REWARDS[ui.rsize], ...own, ...own].filter(x => x !== ui.ridea);
    ui.ridea = pick(pool); render();
  },
  fav() { const i = S.favs.indexOf(ui.ridea); i >= 0 ? S.favs.splice(i, 1) : S.favs.push(ui.ridea); commit(); },
  usefav(el) { ui.ridea = S.favs[+el.dataset.i]; render(); document.getElementById('reward').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  delfav(el) { S.favs.splice(+el.dataset.i, 1); commit(); },
  treat() {
    S.log.push({ id: uid(), text: ui.ridea, kind: 'reward', day: today(), ts: Date.now(), stars: 0 });
    const t = ui.ridea; ui.ridea = null; commit(); confetti(40);
    modal(`<h2>Gönn dir!</h2><p class="hand" style="font-size:30px">${esc(t)}</p><p class="muted">Du hast es dir verdient. Wirklich.</p><div class="row"><button class="btn" data-a="close">Mach ich</button></div>`);
  },

  story(el) { story(el.dataset.w); },
  weeklog(el) { ui.wl = { k: el.dataset.k, w: el.dataset.w }; ui.rateId = null; weekLogModal(); },
  ratepick(el) { ui.rateId = ui.rateId === el.dataset.id ? null : el.dataset.id; weekLogModal(true); },
  rateset(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    e.mood = +el.dataset.v; ui.rateId = null; commit(); weekLogModal(true);
  },
  logdel(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    modal(`<h2>Eintrag entfernen?</h2><p><b>${esc(e.text)}</b></p><p class="muted">${e.stars > 0 ? 'Die ' + e.stars + ' ⭐ dafür werden wieder abgezogen.' : 'Dafür gab es keinen Stern.'}</p><div class="row"><button class="btn" data-a="logdelyes" data-id="${e.id}">Entfernen</button><button class="btn soft" data-a="weeklogback">Abbrechen</button></div>`);
  },
  logdelyes(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    S.log = S.log.filter(x => x !== e);
    if (e.stars > 0) { S.stars = Math.max(0, S.stars - e.stars); S.earned = Math.max(0, S.earned - e.stars); }
    commit(); weekLogModal(); toast('Entfernt');
  },
  weeklogback() { weekLogModal(); },
  weeksent(el) { // this week's handed-over tasks and what became of them
    const days = weekDays(el.dataset.w), from = parse(days[0]).getTime() + 3 * 3600e3, to = from + 7 * 864e5;
    const list = S.sent.filter(x => x.ts >= from && x.ts < to).sort((a, b) => b.ts - a.ts), n = weekStats(el.dataset.w).sent;
    const lbl = { wartet: ['wartet', ''], ok: ['übernommen 💛', ''], erledigt: ['erledigt 🎉', 'st-erledigt'], nein: ['zurück', 'st-nein'], weg: ['zurückgeholt', 'st-nein'] };
    modal(`<div style="text-align:left"><h2 style="text-align:center">🤝 Abgegeben</h2>
      <p class="muted" style="text-align:center">${n === 1 ? 'Eine Aufgabe' : n + ' Aufgaben'} diese Woche an ${esc(pn())} – du musst nicht alles allein machen.</p>
      ${list.length ? `<ul class="list-plain">${list.map(x => `<li><span>${esc(x.text)}${x.status === 'nein' && x.reason ? `<br><span class="muted">„${esc(x.reason)}“</span>` : ''}${x.thanked ? ' ' + x.thanked : ''}</span><span class="st ${(lbl[x.status] || ['', ''])[1]}">${(lbl[x.status] || [x.status])[0]}</span></li>`).join('')}</ul>`
        : `<p class="muted">Die Einzelheiten sind schon aufgeräumt – gezählt bleibt’s trotzdem.</p>`}
      <div class="row"><button class="btn soft" data-a="close">Schließen</button></div></div>`);
  },
  storyclose() { const s = $('#story'); if (s) s.remove(); render(); },
  settings, settingsclose() {
    const n = $('#s-name'), k = $('#s-nick');
    if (n && n.value.trim() !== S.name) S.name = n.value.trim();
    if (k && k.value.trim() !== pn()) S.partnerNick = k.value.trim();   // empty = use the name they chose
    const e = $('#s-end'); if (e && /^\d\d:\d\d$/.test(e.value)) S.endTime = e.value;
    commit(); closeModal();
  },
  cfgsave: saveCfgAndTest,
  cfglink() { // same as opening the QR link, but inside the installed app (iPhone: home-screen apps have their own storage)
    const v = ($('#s-link').value || '').trim(), i = v.indexOf('#setup=');
    if (i < 0) { $('#s-msg').textContent = '❌ Das ist kein Einrichtungs-Link.'; return; }
    location.replace(location.pathname + v.slice(i)); location.reload();
  },
  async backupnow() { D.scheduleBackup(S, 0); await D.flushBackup(); settings(); },
  restore() {
    modal(`<h2>Wiederherstellen?</h2><p>Der Stand aus der letzten Sicherung ersetzt alles, was gerade auf dem Handy ist.</p><div class="row"><button class="btn" data-a="restoreyes">Ja, wiederherstellen</button><button class="btn soft" data-a="settings">Abbrechen</button></div><p class="muted" id="s-msg"></p>`);
  },
  async restoreyes() { const m = $('#s-msg'); m.textContent = 'Lade…'; try { const r = await D.fetchBackup(); if (!r) { m.textContent = 'Keine Sicherung gefunden.'; return; } await applyRestore(r); } catch (e) { m.textContent = '❌ ' + e.message; } },
  export: exportFile,
  wipe() {
    modal(`<h2>Handy trennen?</h2><p>Alles auf <b>diesem Handy</b> wird gelöscht und die Verbindung getrennt. Die Sicherung bleibt unangetastet.</p><p class="muted">Danach den eigenen QR-Code scannen, dann ist alles wieder da.</p><div class="row"><button class="btn" data-a="wipeyes" style="background:var(--danger)">Ja, leeren</button><button class="btn soft" data-a="settings">Abbrechen</button></div>`);
  },
  async wipeyes() {
    D.stopAll();
    Object.keys(localStorage).filter(k => k.startsWith('gn_') && k !== 'gn_api' && k !== 'gn_nosw').forEach(k => localStorage.removeItem(k));
    await D.wipeLocal();
    location.replace(location.pathname);
  },
  rank: rankModal,
  stars() { modal(`<h2>Gute Nudel Sterne</h2><p>⭐ 1 pro erledigter Aufgabe (bis ${C.CAP} am Tag)<br>⭐ 2 fürs Genießen eines Gemütlichkeits-Rezepts, einer fertigen Vorbereitung oder einer Belohnung nach der Hausarbeit</p><p>Ausgeben kannst du sie bei <b>Schätze</b>.</p><div class="row"><button class="btn" data-a="go" data-tab="schaetze">Zu den Schätzen</button></div>`); },
};

// ---------- helpers: shopping list, cookbook, music ----------
// Steps with a time: she sets her PHONE's timer (only that one rings with the screen off — a web app gets paused).
function phoneTimer(mins) {
  const hm = mins >= 60 ? Math.floor(mins / 60) + ' Std. ' + (mins % 60 ? mins % 60 + ' Min.' : '') : mins + ' Minuten';
  modal(`<h2>⏰ Handy-Timer stellen</h2><p class="hand" style="font-size:44px;color:var(--accent);margin:4px 0">${hm}</p>
    <p>Stell dir jetzt am Handy einen Timer – der klingelt zuverlässig, auch wenn der Bildschirm aus ist.</p>
    <p class="muted" style="text-align:left">🗣️ Am schnellsten: <b>„Hey Google, Timer ${hm}“</b><br>⏱️ Oder: <b>Uhr-App → Timer</b></p>
    <div class="row"><button class="btn" data-a="close">Ist gestellt ✓</button></div>`);
}
// the list grouped by supermarket section, in the chosen store's order (shop.js); ticked items go to "Im Wagen"
const secOf = x => x.sec || Sh.classify(x.text, S.shopLearn || {});
const shopOrder = () => { const st = Sh.STORES[S.shopStore] ? S.shopStore : 'standard'; return ((S.shopOrder || {})[st] || Sh.STORES[st][1]).slice(); };
function shopModal(item, keep) { // her list — or a handed-over one (item.list) on the partner's phone; keep = update in place
  if (!item && !$('#ov') && ui.tab === 'ruhe' && ui.qtab === 'einkauf') { ui.shopItemId = null; render(); return; }   // the list is open as a tab: just redraw it
  ui.shopItemId = item ? item.id : null;
  modal(`<div style="text-align:left">${shopBody(item, false)}</div>`, '', keep);
}
function shopBody(item, inTab) {
  const L = item ? item.list : S.shop, open = L.filter(x => !x.done), done = L.filter(x => x.done), di = item ? ` data-item="${item.id}"` : '';
  const row = x => `<div class="shoprow"><button class="pick ${x.done ? 'on' : ''}" data-a="shoptick" data-id="${x.id}"${di}><span class="box">${x.done ? '✓' : ''}</span><span style="${x.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(x.text)}${x.from ? `<span class="tag">${esc(x.from)}</span>` : ''}</span></button>`
    + (!x.done && (ui.shopEdit || secOf(x) === 'sonst') ? `<button class="mini-btn" data-a="shoptag" data-id="${x.id}"${di} aria-label="Abteilung wählen">🏷️</button>` : '')
    + `<button class="mini-btn" data-a="shopdel" data-id="${x.id}"${di} aria-label="Entfernen">✕</button></div>`
    + (ui.tagId === x.id ? `<div class="chips tagpick">${Object.entries(Sh.SECTIONS).map(([k, [ic, l]]) => `<button class="chip ${secOf(x) === k ? 'on' : ''}" data-a="shopsec" data-id="${x.id}" data-v="${k}"${di}>${ic} ${l.split(' (')[0]}</button>`).join('')}</div>` : '');
  const order = shopOrder();
  const groups = order.map((sec, i) => {
    const xs = open.filter(x => secOf(x) === sec);
    if (!xs.length && !ui.shopEdit) return '';
    const [ic, l] = Sh.SECTIONS[sec];
    return `<div class="shopsec"><div class="sechead"><span>${ic} ${l}${xs.length ? ' <span class="muted">(' + xs.length + ')</span>' : ''}</span>${ui.shopEdit ? `<span><button class="mini-btn" data-a="shopmove" data-v="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Nach oben">↑</button><button class="mini-btn" data-a="shopmove" data-v="${i}" data-d="1" ${i < order.length - 1 ? '' : 'disabled'} aria-label="Nach unten">↓</button></span>` : ''}</div>${xs.map(row).join('')}</div>`;
  }).join('');
  return `${inTab ? '' : `<h2 style="text-align:center">🛒 ${item ? esc(item.text) : 'Einkaufsliste'}</h2>`}
    ${item ? `<p class="muted">von ${esc(item.from || '')}</p>` : ''}
    <div class="chips stores">${Object.entries(Sh.STORES).map(([k, [l]]) => `<button class="chip ${(S.shopStore || 'standard') === k ? 'on' : ''}" data-a="shopstore" data-v="${k}">${l}</button>`).join('')}<button class="chip ${ui.shopEdit ? 'on' : ''}" data-a="shopedit">↕ Reihenfolge anpassen</button></div>
    ${ui.shopEdit ? `<p class="hint" style="margin:0 0 6px">So wie in deiner ${esc(Sh.STORES[S.shopStore] ? Sh.STORES[S.shopStore][0] : 'Filiale')}-Filiale: ↑↓ verschiebt Abteilungen, 🏷️ ändert die Abteilung eines Artikels.</p>` : ''}
    <div class="steps">${groups || (open.length ? '' : '<p class="muted">Noch leer.</p>')}
    ${done.length ? `<div class="shopsec"><div class="sechead"><span>✓ Im Wagen <span class="muted">(${done.length})</span></span></div>${done.map(row).join('')}</div>` : ''}</div>
    ${item ? '' : `<form class="add" data-f="shopadd"><input name="t" placeholder="Was fehlt? (Komma = mehrere)" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`}
    ${done.length && !item || !inTab ? `<div class="row">${done.length && !item ? '<button class="btn soft" data-a="shopclear">Erledigte löschen</button>' : ''}${inTab ? '' : '<button class="btn" data-a="close">Fertig</button>'}</div>` : ''}
    ${!item && L.length ? (ui.shopWipe ? `<div class="row"><button class="btn" data-a="shopwipeyes" style="background:var(--danger)">Ja, alle ${L.length} löschen</button><button class="btn soft" data-a="shopwipe">Doch nicht</button></div>`
      : `<div class="row"><button class="btn soft" data-a="shopwipe" style="color:var(--danger)">🗑 Ganze Liste leeren</button></div>`) : ''}`;
}
const shopAgain = () => shopModal(ui.shopItemId ? S.items.find(i => i.id === ui.shopItemId) : null, true);
// cookbook "auf die Liste" while the list isn't open: show it as a pop-over as before
function cookModal(rid) {
  if (!S.recipes) S.recipes = C.EXAMPLE_RECIPES.map(r => ({ id: uid(), ...r, ingredients: r.ingredients.slice() }));
  const r = rid && S.recipes.find(x => x.id === rid);
  if (rid === 'new' || (r && ui.cookEdit)) {
    const e = r || { title: '', ingredients: [], steps: '' };
    return modal(`<div style="text-align:left"><h2 style="text-align:center">📖 ${r ? 'Rezept ändern' : 'Neues Rezept'}</h2>
      <label class="field"><span>Name</span><input id="rc-title" value="${esc(e.title)}" placeholder="z.B. Omas Linsensuppe"></label>
      <label class="field"><span>Zutaten (eine pro Zeile)</span><textarea id="rc-ing" rows="6">${esc(e.ingredients.join('\n'))}</textarea></label>
      <label class="field"><span>So geht’s</span><textarea id="rc-steps" rows="5">${esc(e.steps)}</textarea></label>
      <p class="muted" id="rc-msg" style="color:var(--danger)"></p>
      <div class="row"><button class="btn" data-a="cooksave" data-id="${r ? r.id : ''}">Speichern</button><button class="btn soft" data-a="cook" data-id="${r ? r.id : ''}">Abbrechen</button></div>
      ${r ? `<div class="row"><button class="btn soft" data-a="cookdel" data-id="${r.id}" style="color:var(--danger)">Rezept löschen</button></div>` : ''}</div>`);
  }
  if (r) return modal(`<div style="text-align:left"><h2 style="text-align:center">📖 ${esc(r.title)}</h2>
    <p class="muted" style="font-weight:800;margin:6px 0">Zutaten</p><ul class="list-plain">${r.ingredients.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul>
    <div class="row"><button class="btn green" data-a="cookshop" data-id="${r.id}">🛒 Alles auf die Einkaufsliste</button></div>
    ${r.steps ? `<p class="muted" style="font-weight:800;margin:14px 0 6px">So geht’s</p><p style="white-space:pre-wrap">${esc(r.steps)}</p>` : ''}
    <div class="row"><button class="btn soft" data-a="cookedit" data-id="${r.id}">✎ Ändern</button><button class="btn soft" data-a="cook">← Alle Rezepte</button></div></div>`);
  modal(`<div style="text-align:left"><h2 style="text-align:center">📖 Kochbuch</h2>
    <div class="steps">${S.recipes.map(x => `<button class="pick" data-a="cook" data-id="${x.id}"><span>${esc(x.title)}</span><span class="muted" style="margin-left:auto">${x.ingredients.length} Zutaten</span></button>`).join('') || '<p class="muted">Noch keine Rezepte.</p>'}</div>
    <div class="row"><button class="btn blue" data-a="cook" data-id="new">+ Neues Rezept</button><button class="btn" data-a="close">Fertig</button></div></div>`);
}

// ---------- the cookbook (cookbook.js): suggestions that learn, the plate check, cooking mode ----------
// every recipe: built-in (cookbook.js) + the shared book (photographed pages, written by Claude) + my own ones.
// My own copy with the same id shadows a book recipe (that's how she edits one); S.hiddenRecipes hides book recipes for me.
const bookRecipes = () => { try { return (JSON.parse(localStorage.getItem('gn_book') || 'null') || { recipes: [] }).recipes || []; } catch (e) { return []; } };
const fixRec = r => ({ tags: [], ing: [], steps: [], icon: '🍽️', min: 0, cat: 'haupt', ...r });
function allRecipes() {
  const mine = (S.myRecipes || []).filter(r => !r.del), ids = new Set(mine.map(r => r.id)), hidden = new Set(S.hiddenRecipes || []);
  return K.RECIPES.concat(bookRecipes().filter(r => !ids.has(r.id) && !hidden.has(r.id)).map(r => fixRec({ ...r, book: true })), mine.map(r => fixRec({ ...r, own: true })));
}
const recipeById = id => allRecipes().find(r => r.id === id);
const isOurs = r => r.book || r.own;
// how much she'd want it: her favourites and what she rated well count more (and their kind), what she just had less,
// and what she didn't like never comes up again
function cookWeight(r) {
  const c = S.cook[r.id] || {};
  if (c.taste === 1) return 0;
  const liked = new Set(allRecipes().filter(x => (S.cook[x.id] || {}).taste === 3 || (x.fav && (S.cook[x.id] || {}).taste !== 1)).flatMap(x => x.tags));
  let w = 1 + (r.fav ? 1.5 : 0) + (c.taste === 3 ? 2.5 : c.taste === 2 ? 0.7 : 0) + 0.25 * r.tags.filter(t => liked.has(t)).length;
  if (c.last && daysBetween(c.last, today()) < 5) w *= 0.15;
  return w;
}
function cookSuggest(n) { // weighted, no repeats; ui.sugSeed changes with "andere Vorschläge"
  let seed = (ui.sugSeed || 1) * 9973 + dayIndex();
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let pool = allRecipes().filter(r => r.cat === 'haupt').map(r => [r, cookWeight(r)]).filter(([, w]) => w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    let x = rand() * pool.reduce((a, [, w]) => a + w, 0);
    const i = pool.findIndex(([, w]) => (x -= w) < 0);
    out.push(pool[i < 0 ? 0 : i][0]); pool.splice(i < 0 ? 0 : i, 1);
  }
  return out;
}
// which ingredients go on the list: her choice for this recipe, else — not already on the list and not a pantry staple
// (salt/oil/spices: marked "Vorrat?" so she can tick them when they're empty). Nothing is remembered — things run out.
const ingKey = t => Sh.norm(t);
const onList = t => S.shop.some(x => !x.done && Sh.norm(x.text) === ingKey(t));
const isPantry = t => Sh.classify(t, S.shopLearn || {}) === 'backen';
const ingWanted = t => { const k = ingKey(t); return ui.ingPick && k in ui.ingPick ? ui.ingPick[k] : !onList(t) && !isPantry(t); };
const sidesOf = () => (ui.sides || []).map(id => K.SIDES.find(s => s.id === id)).filter(Boolean);
function plateHtml(r, sides) {
  if (!r.plate) return '';
  return '<span class="plate">' + Object.entries(K.PLATE).map(([k, [ic, l]]) => { const on = r.plate[k] || sides.some(s => s.g === k); return `<span class="pb ${on ? 'on' : ''}" title="${l}">${ic}</span>`; }).join('') + '</span>';
}
const tasteOf = r => { const c = S.cook[r.id]; return c && c.taste ? K.TASTE.find(t => t[2] === c.taste)[0] : ''; };
const recipeRow = r => `<button class="card recipe-row" data-a="recipe" data-id="${r.id}"><span class="ri">${r.icon}</span><span class="rt"><b>${esc(r.title)}</b><br><span class="muted">${r.min ? '⏱ ' + r.min + ' Min.' : ''}${r.book ? ' · 📷 aus dem Buch' : r.own ? ' · ✏️ eigenes' : ''}${r.fav ? ' · 💛 mag sie' : ''} ${tasteOf(r)}</span></span>${plateHtml(r, [])}</button>`;
function viewCook() {
  if (ui.rid && ui.cstep != null) return viewCookMode();
  if (ui.rid) return viewRecipe();
  let h = '';
  h += `<div class="toolrow"><button class="btn blue" data-a="rphoto">📷 Rezept fotografieren</button><button class="btn soft" data-a="redit">✏️ Eigenes Rezept</button></div>`;
  const wait = (S.recipeInbox || []).filter(x => !x.del);
  if (wait.length) h += `<div class="card"><h3>📷 Wird gerade umgeschrieben</h3>${wait.map(x => `<div class="shoprow"><span style="flex:1">${x.n} ${x.n === 1 ? 'Foto' : 'Fotos'}${x.note ? ' · „' + esc(x.note) + '“' : ''}<br><span class="muted">${x.up ? 'abgeschickt am ' + esc(shortDate(key(new Date(x.ts)))) : '⏳ wird noch hochgeladen…'}</span></span><button class="mini-btn" data-a="rinboxdel" data-id="${x.id}" aria-label="Zurückziehen">✕</button></div>`).join('')}
    <p class="hint">Claude macht daraus eine Kochbuch-Seite mit Zutaten und Schritten – sie taucht hier auf, sobald sie fertig ist.</p></div>`;
  h += `<div class="card"><h3>Was koch ich heute?</h3><p class="muted" style="margin-top:0">Ausgesucht nach dem, was dir schmeckt.</p>` +
    cookSuggest(3).map(r => `<button class="pick" data-a="recipe" data-id="${r.id}"><span style="font-size:24px">${r.icon}</span><span>${esc(r.title)}<br><span class="muted">${r.min ? '⏱ ' + r.min + ' Min. ' : ''}${tasteOf(r)}</span></span></button>`).join('') +
    `<button class="btn soft wide" data-a="cookreroll" style="margin-top:10px">🎲 Andere Vorschläge</button></div>`;
  const ours = allRecipes().filter(isOurs), cats = K.CATS.concat([['fav', '💛 Lieblinge']], ours.length ? [['ours', '📷 Unsere']] : []), cat = ui.ccat || 'haupt';
  h += `<div class="chips">${cats.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-a="ccat" data-v="${k}">${l}</button>`).join('')}</div>`;
  const list = cat === 'fav' ? allRecipes().filter(r => (S.cook[r.id] || {}).taste === 3 || (r.fav && (S.cook[r.id] || {}).taste !== 1)) : cat === 'ours' ? ours : allRecipes().filter(r => r.cat === cat);
  h += list.map(recipeRow).join('') || '<p class="muted">Noch nichts hier.</p>';
  if (cat === 'haupt') h += `<p class="hint">${Object.values(K.PLATE).map(([i, l]) => i + ' ' + l).join(' · ')} – fehlt etwas auf dem Teller, schlägt dir das Rezept was dazu vor.</p>`;
  return h;
}
function viewRecipe() {
  const r = recipeById(ui.rid); if (!r) { ui.rid = null; return viewCook(); }
  const sides = sidesOf(), c = S.cook[r.id];
  let h = `<button class="btn soft" data-a="cookhome" style="margin:4px 0 12px">← Kochbuch</button>`;
  h += `<div class="card">${r.photo ? `<img class="recphoto" data-photo="${esc(r.photo)}" alt="">` : ''}<div style="font-size:44px;line-height:1">${r.icon}</div><h2 class="hand" style="font-size:34px;margin:6px 0">${esc(r.title)}</h2>
    <p class="muted" style="margin:0">${r.min ? '⏱ ' + r.min + ' Min. · ' : ''}für ${esc(r.serves || 2)}${isOurs(r) ? '' : ' · ganz einfach'}${r.fav ? ' · 💛 mag sie' : ''}${c ? ' · ' + c.n + '× gekocht ' + tasteOf(r) : ''}</p>${r.src ? `<p class="muted" style="margin:4px 0 0">📚 ${esc(r.src)}</p>` : ''}${r.note ? `<p>${esc(r.note)}</p>` : ''}
    ${isOurs(r) ? `<div class="row" style="justify-content:flex-start;margin-top:8px"><button class="btn soft" data-a="redit" data-id="${r.id}">✎ Ändern</button>${r.pages && r.pages.length ? `<button class="btn soft" data-a="rpages" data-id="${r.id}">📷 Original-Seite</button>` : ''}</div>` : ''}</div>`;
  if (r.plate) {
    const missing = Object.keys(K.PLATE).filter(k => !r.plate[k] && !sides.some(s => s.g === k));
    const want = Object.keys(K.PLATE).filter(k => !r.plate[k]);
    h += `<div class="card platecheck"><h3>Teller-Check ${plateHtml(r, sides)}</h3>` +
      (missing.length ? `<p style="margin:4px 0 8px">Da fehlt noch <b>${missing.map(k => K.PLATE[k][1]).join(' & ')}</b> – nimm was dazu:</p>` : `<p style="margin:4px 0 8px">✓ Alles drauf: satt, Eiweiß und Gemüse.</p>`) +
      want.map(k => { const hint = K.SIDE_HINTS[r.id] || [], opts = K.SIDES.filter(s => s.g === k).sort((a, b) => (hint.includes(b.id) ? 1 : 0) - (hint.includes(a.id) ? 1 : 0)).slice(0, 4);
        return `<div class="chips">${opts.map(s => `<button class="chip ${(ui.sides || []).includes(s.id) ? 'on' : ''}" data-a="side" data-id="${s.id}">${K.PLATE[k][0]} ${esc(s.title)}</button>`).join('')}</div>`; }).join('') + '</div>';
  }
  const ing = r.ing.concat(...sides.map(s => s.ing.map(x => [x[0], x[1], s.title])));
  const sel = ing.filter(([, t]) => t && ingWanted(t)).length, total = sel + (ui.ingExtra || []).length;
  h += `<div class="card"><h3>Zutaten</h3><p class="muted" style="margin-top:0">Was du gerade noch daheim hast, einfach abwählen.</p>
    <div class="steps">${ing.map(([q, t, from]) => { const on = t && ingWanted(t), why = onList(t) ? 'steht schon drauf' : isPantry(t) ? 'Vorrat?' : '';
      return `<button class="pick ${on ? 'on' : ''}" data-a="ingtoggle" data-v="${esc(t)}"><span class="box">${on ? '✓' : ''}</span><span style="flex:1">${esc(t)}${from ? ` <span class="tag">${esc(from)}</span>` : ''}${why && !on ? ` <span class="tag">${why}</span>` : ''}</span><span class="muted">${esc(q)}</span></button>`; }).join('')}</div>
    ${(ui.ingExtra || []).length ? `<div class="steps">${ui.ingExtra.map((t, i) => `<div class="shoprow"><span class="pick on" style="cursor:default"><span class="box">✓</span><span style="flex:1">${esc(t)} <span class="tag">dazu</span></span></span><button class="mini-btn" data-a="ingextradel" data-i="${i}" aria-label="Entfernen">✕</button></div>`).join('')}</div>` : ''}
    <form class="add" data-f="ingextra"><input name="t" placeholder="Noch was dazu? (z.B. Getränke)" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Dazu">+</button></form>
    <div class="row"><button class="btn soft" data-a="cookshop2" ${sel + (ui.ingExtra || []).length ? '' : 'disabled'}>🛒 ${total ? total + (total === 1 ? ' Sache' : ' Sachen') + ' auf die Liste' : 'Alles da'}</button></div></div>`;
  h += `<div class="card"><h3>So geht’s</h3><ol class="steps-ol">${cookSteps(r, sides).map(([t, m], i) => `<li>${esc(t)}${m ? ` <button class="toolbtn steptimer" data-a="steptimer" data-i="${i}" aria-label="Handy-Timer ${m} Minuten">⏰ ${m} Min.</button>` : ''}</li>`).join('')}</ol>
    <button class="btn green wide" data-a="cookstart">🍳 Jetzt kochen</button></div>`;
  return h;
}
const cookSteps = (r, sides) => r.steps.concat(sides.map(s => ['Dazu – ' + s.title + ': ' + s.step[0], s.step[1]]));
let wake = null;
function viewCookMode() {
  const r = recipeById(ui.rid), steps = cookSteps(r, sidesOf()), i = ui.cstep, [t, m] = steps[i] || ['', 0], last = i >= steps.length - 1;
  if (!wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {});   // the screen stays on while cooking
  return `<div class="cookmode"><div class="muted" style="font-weight:800">${r.icon} ${esc(r.title)} · Schritt ${i + 1} von ${steps.length}</div>
    <div class="bar"><i style="width:${(i + 1) / steps.length * 100}%"></i></div>
    <p class="cstep">${esc(t)}</p>
    ${m ? `<button class="btn blue wide" data-a="cooktimer">⏰ Handy-Timer: ${m} Min.</button>` : ''}
    <div class="row" style="margin-top:18px">${i ? '<button class="btn soft" data-a="cprev">← Zurück</button>' : '<button class="btn soft" data-a="cookstop">Abbrechen</button>'}${last ? '<button class="btn green" data-a="cookdone">Fertig gekocht! 🎉</button>' : '<button class="btn" data-a="cnext">Weiter →</button>'}</div></div>`;
}
function endCookMode() { if (wake) { wake.release().catch(() => {}); wake = null; } ui.cstep = null; }

// the chore editor (a modal that keeps what's typed when a chip is tapped)
// its symbol: shown in Meine Woche and on the to-do; picked here, any own emoji, or guessed from the name
const CE_ICONS = ['🧹', '🧽', '🪣', '🧺', '👕', '🚽', '🛁', '🚿', '🪟', '🗑️', '🍳', '🍽️', '🛒', '🛏️', '🪴', '🐕', '🚗', '🧊', '💊', '💸', '📬', '🏃', '📞', '✂️'];
const CE_GUESS = [[/fenster/i, '🪟'], [/klo|toilette|wc/i, '🚽'], [/bad|wanne/i, '🛁'], [/dusch/i, '🚿'], [/wäsche|waschen/i, '🧺'], [/bügel/i, '👕'],
  [/müll|abfall|tonne/i, '🗑️'], [/saug|staub|kehr|fegen/i, '🧹'], [/wisch|boden|putz/i, '🧽'], [/koch/i, '🍳'], [/spül|geschirr/i, '🍽️'], [/einkauf/i, '🛒'],
  [/bett/i, '🛏️'], [/pflanz|gieß|blume/i, '🪴'], [/hund|gassi|monti/i, '🐕'], [/auto|tank/i, '🚗'], [/kühlschrank|gefrier/i, '🧊'], [/medi|tablett/i, '💊'],
  [/rechnung|geld|bank/i, '💸'], [/post|brief/i, '📬'], [/sport|lauf|joggen/i, '🏃'], [/anruf|telefon/i, '📞'], [/haare|nägel/i, '✂️']];
const guessIcon = name => (CE_GUESS.find(([re]) => re.test(name || '')) || [0, '🔁'])[1];
const firstEmoji = t => { t = (t || '').trim(); if (!t) return ''; try { return [...new Intl.Segmenter().segment(t)][0].segment; } catch (e) { return [...t].slice(0, 2).join(''); } };
function ceRead() {
  const ic = $('#ce-icon'); if (ic && ic.value.trim()) { ui.ce.icon = firstEmoji(ic.value); ui.ce.iconSet = true; }
  const n = $('#ce-name'), ev = $('#ce-every'), r = $('#ce-own');
  if (n) ui.ce.name = n.value.trim();
  if (ev) ui.ce.every = ev.value;
  if (r && ui.ce.own) ui.ce.reward = r.value.trim();
  const m = $('#ce-music'); if (m) ui.ce.music = m.value.trim();
  const dt = document.getElementById('ce-date'); if (dt) ui.ce.startDate = dt.value;
  const nx = document.getElementById('ce-next'); if (nx) { ui.ce.next = nx.value; if (nx.dataset.auto === '0') ui.ce.nextTouched = true; }
}
function choreModal() {
  const e = ui.ce;
  const opts = C.CHORE_REWARDS.concat(S.wishes.map(w => w.text)).filter((x, i, a) => a.indexOf(x) === i);
  modal(`<div style="text-align:left"><h2 style="text-align:center">${e.id ? 'Aufgabe ändern' : 'Neue Aufgabe'}</h2>
    <label class="field"><span>Was ist dran?</span><input id="ce-name" value="${esc(e.name)}" placeholder="z.B. Wäsche waschen" autocomplete="off"></label>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">Symbol${e.iconSet || e.id ? ': <span style="font-size:22px">' + esc(e.icon) + '</span>' : ' <span style="font-weight:400">(sonst passend zum Namen)</span>'}</p>
    <div class="chips ce-icons">${CE_ICONS.map(ic => `<button class="chip ${(e.iconSet || e.id) && e.icon === ic ? 'on' : ''}" data-a="ceicon" data-v="${ic}" aria-label="Symbol ${ic}">${ic}</button>`).join('')}</div>
    <label class="field"><span>…oder ein eigenes Emoji</span><input id="ce-icon" value="${(e.iconSet || e.id) && !CE_ICONS.includes(e.icon) && e.icon !== '🔁' ? esc(e.icon) : ''}" placeholder="z.B. 🦆" autocomplete="off" style="max-width:7em;font-size:20px"></label>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">Wie oft?</p>
    <div class="chips"><button class="chip ${e.mode === 'days' ? 'on' : ''}" data-a="cemode" data-v="days">Alle paar Tage</button><button class="chip ${e.mode === 'week' ? 'on' : ''}" data-a="cemode" data-v="week">An Wochentagen</button></div>
    ${e.mode === 'days' ? `<label class="field"><span>Alle wie viele Tage?</span><input id="ce-every" type="number" min="1" max="90" inputmode="numeric" value="${esc(e.every)}" oninput="const l=document.getElementById('ce-later'); if(l) l.textContent='In '+(this.value||7)+' Tagen'; const f=document.getElementById('ce-from'); if(f) f.textContent='Von diesem Tag an alle '+(this.value||7)+' Tage.'; const d=new Date(Date.now()-3*3600e3); d.setDate(d.getDate()+(+this.value||7)); const t=document.getElementById('ce-next'); if(t&&t.dataset.auto==='1') t.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');"></label>
      <label class="field"><span>${e.id ? 'Nächstes Mal am' : 'Beginnt am'}</span><input type="date" id="ce-next" min="${today()}" value="${esc(e.next || addDays(today(), +e.every || 7))}" data-auto="${e.nextTouched ? 0 : 1}" oninput="this.dataset.auto='0'"></label>
      <div class="chips">${[[0, 'Heute'], [1, 'Morgen']].map(([n, l]) => `<button class="chip" data-a="cenext" data-v="${n}">${l}</button>`).join('')}<button class="chip" data-a="cenext" data-v="every" id="ce-later">In ${esc(e.every)} Tagen</button></div>
      <p class="hint" id="ce-from">Von diesem Tag an alle ${esc(e.every)} Tage.</p>`
      : `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${e.week.includes(d) ? 'on' : ''}" data-a="ceday" data-v="${d}">${C.DOW[d]}</button>`).join('')}</div>`}
    ${e.id || e.mode === 'days' ? '' : `<p class="muted" style="font-weight:800;margin:12px 0 4px">Ab wann?</p><div class="chips"><button class="chip ${e.start === 'heute' ? 'on' : ''}" data-a="cestart" data-v="heute">Ab heute</button><button class="chip ${e.start === 'morgen' ? 'on' : ''}" data-a="cestart" data-v="morgen">Ab morgen</button><button class="chip ${e.start === 'datum' ? 'on' : ''}" data-a="cestart" data-v="datum">📅 Datum wählen</button></div>
      ${e.start === 'datum' ? `<label class="field"><span>Beginnt am</span><input type="date" id="ce-date" min="${today()}" value="${e.startDate || addDays(today(), 1)}" oninput="const h=document.getElementById('ce-datehint'); if(h) h.textContent=''"></label><p class="hint" id="ce-datehint">${e.startDate ? 'beginnt ' + esc(C.DAYNAMES[parse(e.startDate).getDay()]) + ', ' + esc(shortDate(e.startDate)) : ''}</p>` : ''}`}
    <p class="muted" style="font-weight:800;margin:12px 0 4px">🎁 Belohnung danach (am selben Tag)</p>
    <div class="chips">${opts.map(r => `<button class="chip ${e.reward === r && !e.own ? 'on' : ''}" data-a="cerew" data-v="${esc(r)}">${esc(r)}</button>`).join('')}<button class="chip ${e.own ? 'on' : ''}" data-a="ceown">✏️ Eigene…</button></div>
    ${e.own ? `<label class="field"><span>Deine Belohnung</span><input id="ce-own" value="${esc(e.reward)}" placeholder="Was gönnst du dir?" autocomplete="off"></label>` : ''}
    <p class="hint">Keine ausgewählt = einfach eine Aufgabe ohne Belohnung.</p>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">🛠 Helfer dazu</p>
    <div class="chips">${Object.entries(C.TOOLS).map(([k, [ic, l]]) => `<button class="chip ${e.tools.includes(k) ? 'on' : ''}" data-a="cetool" data-v="${k}">${ic} ${l}</button>`).join('')}</div>
    ${e.tools.includes('music') ? `<label class="field"><span>Link zu deiner Playlist (Spotify, YouTube Music …)</span><input id="ce-music" value="${esc(e.music)}" placeholder="https://…" autocapitalize="off" autocomplete="off" spellcheck="false"></label>` : ''}
    <p class="muted" id="ce-msg" style="color:var(--danger)"></p>
    <div class="row"><button class="btn" data-a="cesave">Speichern</button><button class="btn soft" data-a="close">Abbrechen</button></div></div>`);
}

function delegateModal() {
  const open = [...S.items.filter(i => i.where === 'heute'), ...S.items.filter(i => i.where !== 'heute')];
  const n = ui.dpicks.size;
  modal(`<h2>An ${esc(pn())} abgeben</h2><p class="muted">Welche Aufgaben soll ${esc(pn())} übernehmen?</p>
    <div style="text-align:left">${open.map(i => `<button class="pick ${ui.dpicks.has(i.id) ? 'on' : ''}" data-a="dpick" data-id="${i.id}"><span class="box">${ui.dpicks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}</span></button>`).join('')}</div>
    <div class="chips" style="justify-content:center;margin-top:12px"><button class="chip ${ui.dtoday ? 'on' : ''}" data-a="dtoday">☀ Bitte heute erledigen</button></div>
    <div class="row"><button class="btn" data-a="dsend" ${n ? '' : 'disabled'}>Abgeben${n ? ' (' + n + ')' : ''} · +1 ⭐</button><button class="btn soft" data-a="close">Abbrechen</button></div>`);
}

// ---------- 📷 photographed recipes + ✏️ own recipes ----------
// Photos are shrunk on the phone (long side 2000 px, JPEG) – sharp enough to read, small enough to upload.
function shrink(file, max = 2000) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild nicht lesbar')); };
    img.src = url;
  });
}
function photoModal() {
  const p = ui.rshots || (ui.rshots = []);
  modal(`<div style="text-align:left"><h2 style="text-align:center">📷 Rezept fotografieren</h2>
    <p class="muted" style="margin-top:0">Fotografier die Seite(n) aus deinem Kochbuch – Zutaten und Zubereitung, auch wenn das zwei Seiten sind. Claude schreibt daraus eine Seite für dein Kochbuch, mit allen Zutaten für die Einkaufsliste.</p>
    <div class="rshots">${p.map((d, i) => `<div class="rshot"><img src="${d}" alt="Foto ${i + 1}"><button class="mini-btn" data-a="rshotdel" data-i="${i}" aria-label="Foto entfernen">✕</button></div>`).join('')}</div>
    <div class="row"><label class="btn blue">📷 ${p.length ? 'Noch ein Foto' : 'Foto machen'}<input type="file" accept="image/*" capture="environment" data-ch="rshotadd" hidden></label>
      <label class="btn soft">🖼 Aus der Galerie<input type="file" accept="image/*" multiple data-ch="rshotadd" hidden></label></div>
    <label class="field"><span>Welches Rezept? (nur nötig, wenn mehrere auf der Seite sind)</span><input id="rp-note" value="${esc(ui.rnote || '')}" placeholder="z.B. die Linsensuppe unten rechts" autocomplete="off"></label>
    <p class="muted" id="rp-msg" style="color:var(--danger)"></p>
    <div class="row"><button class="btn soft" data-a="rphotocancel">Abbrechen</button><button class="btn" data-a="rphotosend" ${p.length ? '' : 'disabled'}>Abschicken${p.length ? ' (' + p.length + ')' : ''}</button></div></div>`, '', true);
}
const uploading = new Set();
async function uploadInbox(x) {   // the photos + a note go up; on failure the entry stays and is retried with the next sync
  if (!D.canPost() || !navigator.onLine || uploading.has(x.id)) return false;
  uploading.add(x.id);
  try { return await uploadInbox_(x); } finally { uploading.delete(x.id); }
}
async function uploadInbox_(x) {
  const shots = await loadShots(x.id); if (!shots) return false;
  try {
    for (let i = 0; i < shots.length; i++) await D.putBinary(`rezepte-eingang/${x.id}/${i + 1}.jpg`, shots[i].split(',')[1], 'Rezeptfoto');
    await D.putInfo(`rezepte-eingang/${x.id}/info.json`, { id: x.id, by: D.me(), name: S.name || '', ts: x.ts, n: shots.length, note: x.note || '' }, 'Rezeptfoto: Info');
    x.up = true; dropShots(x.id); commit(); return true;
  } catch (e) { console.warn('inbox', e); return false; }
}
// photos waiting for the upload are parked on the phone only until they're up (not in the save file: too big)
const saveShots = async (id, a) => { try { await D.stashPut(id, a); return true; } catch (e) { return false; } };
const loadShots = async id => { try { return (await D.stashGet(id)) || null; } catch (e) { return null; } };
const dropShots = id => { D.stashDel(id).catch(() => {}); };
// the shared book: loaded with the post (start, coming back, every 90 s); a finished inbox entry turns into "fertig!"
async function syncBook() {
  const b = await D.readBook(); if (!b) return;
  const j = JSON.stringify(b); if (j === localStorage.getItem('gn_book')) return;
  localStorage.setItem('gn_book', j);
  const done = (S.recipeInbox || []).filter(x => !x.del && (b.recipes || []).some(r => r.inbox === x.id));
  if (done.length) {
    done.forEach(x => { x.del = true; });
    const r = b.recipes.find(y => y.inbox === done[0].id);
    commit(); modal(`<h2>📖 Neu im Kochbuch!</h2><p><b>${esc(r.icon || '')} ${esc(r.title)}</b>${done.length > 1 ? ' und ' + (done.length - 1) + ' weitere' : ''} – aus deinem Foto, mit allen Zutaten.</p><div class="row"><button class="btn soft" data-a="close">Später</button><button class="btn" data-a="recipe" data-id="${esc(r.id)}" data-go="1">Ansehen</button></div>`);
  } else render();
}
function retryInbox() { (S.recipeInbox || []).filter(x => !x.del && !x.up).forEach(uploadInbox); }
// ✏️ own recipe (also: changing a photographed one = my own copy with the same id)
const parseIng = line => { const m = line.match(/^\s*((?:ca\.\s*)?[\d½¼¾⅓⅔.,/\-–\s]+(?:\s*(?:g|kg|ml|l|EL|TL|Prise|Prisen|Pck\.?|Päckchen|Packung|Dose|Dosen|Becher|Bund|Stück|Stk\.?|Scheiben?|Zehen?|Tasse|Tassen|cl|dl)\b\.?)?)\s+(.+)$/i); return m ? [m[1].trim(), m[2].trim()] : ['', line.trim()]; };
const parseStep = line => { const m = line.match(/(\d+)\s*(?:Min|Minuten)\b/i); return m ? [line.trim(), +m[1]] : [line.trim()]; };
function recipeModal() {
  const e = ui.re, cats = K.CATS;
  modal(`<div style="text-align:left"><h2 style="text-align:center">${e.id ? '✎ Rezept ändern' : '✏️ Eigenes Rezept'}</h2>
    <label class="field"><span>Name</span><input id="re-title" value="${esc(e.title)}" placeholder="z.B. Omas Linsensuppe" autocomplete="off"></label>
    <div class="chips">${cats.map(([k, l]) => `<button class="chip ${e.cat === k ? 'on' : ''}" data-a="recat" data-v="${k}">${l}</button>`).join('')}</div>
    <div style="display:flex;gap:10px"><label class="field" style="flex:1"><span>Symbol</span><input id="re-icon" value="${esc(e.icon)}" style="font-size:22px" autocomplete="off"></label>
      <label class="field" style="flex:1"><span>Minuten</span><input id="re-min" type="number" min="0" inputmode="numeric" value="${esc(e.min || '')}"></label>
      <label class="field" style="flex:1"><span>Für wie viele?</span><input id="re-serves" value="${esc(e.serves || '2')}" autocomplete="off"></label></div>
    <label class="field"><span>Zutaten – eine pro Zeile, Menge vorne (z.B. „200 g Feta“)</span><textarea id="re-ing" rows="7">${esc(e.ing.map(([q, t]) => (q ? q + ' ' : '') + t).join('\n'))}</textarea></label>
    <label class="field"><span>So geht’s – ein Schritt pro Zeile („20 Min.“ im Text = Timer)</span><textarea id="re-steps" rows="7">${esc(e.steps.map(([t]) => t).join('\n'))}</textarea></label>
    <label class="field"><span>Notiz (optional)</span><input id="re-note" value="${esc(e.note || '')}" autocomplete="off"></label>
    ${e.cat === 'haupt' ? `<p class="muted" style="font-weight:800;margin:12px 0 4px">Was ist schon auf dem Teller?</p><div class="chips">${Object.entries(K.PLATE).map(([k, [ic, l]]) => `<button class="chip ${e.plate[k] ? 'on' : ''}" data-a="replate" data-v="${k}">${ic} ${l}</button>`).join('')}</div>` : ''}
    <p class="muted" id="re-msg" style="color:var(--danger)"></p>
    <div class="row"><button class="btn soft" data-a="close">Abbrechen</button><button class="btn" data-a="resave">Speichern</button></div>
    ${e.id ? `<div class="row"><button class="btn soft" data-a="redel" style="color:var(--danger)">${e.book && !e.own ? 'Für mich ausblenden' : 'Rezept löschen'}</button></div>` : ''}</div>`, '', true);
}
function reRead() {
  const v = id => (document.getElementById(id) || {}).value;
  const e = ui.re; if (!document.getElementById('re-title')) return;
  e.title = v('re-title').trim(); e.icon = firstEmoji(v('re-icon')) || '🍽️'; e.min = Math.max(0, Math.round(+v('re-min') || 0)); e.serves = v('re-serves').trim() || '2';
  e.ing = v('re-ing').split('\n').map(x => x.trim()).filter(Boolean).map(parseIng);
  e.steps = v('re-steps').split('\n').map(x => x.trim()).filter(Boolean).map(parseStep);
  e.note = v('re-note').trim();
}
Object.assign(A, {
  rphoto() { ui.rshots = []; ui.rnote = ''; photoModal(); },
  rphotocancel() { ui.rshots = []; closeModal(); },
  rshotdel(el) { ui.rnote = $('#rp-note').value; ui.rshots.splice(+el.dataset.i, 1); photoModal(); },
  async rphotosend() {
    const note = $('#rp-note').value.trim(), x = { id: uid(), ts: Date.now(), n: ui.rshots.length, note, up: false };
    if (!(await saveShots(x.id, ui.rshots))) { $('#rp-msg').textContent = 'Zu groß für den Handyspeicher – bitte weniger Fotos.'; return; }
    (S.recipeInbox = S.recipeInbox || []).push(x); ui.rshots = []; closeModal(); commit();
    toast('📷 Wird hochgeladen…');
    toast(await uploadInbox(x) ? '📷 Abgeschickt! Claude macht eine Kochbuch-Seite draus.' : '📷 Gespeichert – wird hochgeladen, sobald Internet da ist.');
  },
  async rinboxdel(el) {
    const x = (S.recipeInbox || []).find(y => y.id === el.dataset.id); if (!x) return;
    x.del = true; dropShots(x.id); commit(); toast('Zurückgezogen');
    if (x.up) { try { for (let i = 1; i <= x.n; i++) await D.deleteFile(`rezepte-eingang/${x.id}/${i}.jpg`); await D.deleteFile(`rezepte-eingang/${x.id}/info.json`); } catch (e) {} }
  },
  rpages(el) {
    const r = recipeById(el.dataset.id); if (!r) return;
    modal(`<h2>📷 Original</h2>${r.pages.map(p => `<img class="recphoto" data-photo="${esc(p)}" alt="">`).join('')}<div class="row"><button class="btn" data-a="close">Zurück</button></div>`);
    loadRecPhotos();
  },
  redit(el) {
    const r = el.dataset.id && recipeById(el.dataset.id);
    ui.re = r ? { ...JSON.parse(JSON.stringify(r)), plate: { ...(r.plate || {}) } } : { id: null, title: '', cat: 'haupt', icon: '🍽️', min: '', serves: '2', ing: [], steps: [], note: '', plate: {} };
    recipeModal();
  },
  recat(el) { reRead(); ui.re.cat = el.dataset.v; recipeModal(); },
  replate(el) { reRead(); const k = el.dataset.v; ui.re.plate[k] = ui.re.plate[k] ? 0 : 1; recipeModal(); },
  resave() {
    reRead(); const e = ui.re, msg = $('#re-msg');
    if (!e.title) { msg.textContent = 'Wie heißt das Rezept?'; return; }
    if (!e.ing.length) { msg.textContent = 'Mindestens eine Zutat, damit die Einkaufsliste weiß, was sie braucht.'; return; }
    const id = e.id || 'own-' + uid();
    const keep = ['photo', 'pages', 'src', 'inbox', 'tags'].reduce((o, k) => (e[k] ? { ...o, [k]: e[k] } : o), {});
    const r = { id, cat: e.cat, title: e.title, icon: e.icon, min: e.min, serves: e.serves, ing: e.ing, steps: e.steps, note: e.note, ...(e.cat === 'haupt' ? { plate: e.plate } : {}), ...keep, ts: Date.now() };
    S.myRecipes = (S.myRecipes || []).filter(x => x.id !== id).concat([r]);
    closeModal(); ui.rid = id; ui.sides = []; ui.cstep = null; commit(); scrollTo(0, 0); toast('📖 Gespeichert');
  },
  redel() {
    const e = ui.re;
    if (e.own) S.myRecipes = (S.myRecipes || []).filter(x => x.id !== e.id);
    if (e.book) S.hiddenRecipes = [...new Set([...(S.hiddenRecipes || []), e.id])];
    closeModal(); ui.rid = null; commit(); toast(e.book && !e.own ? 'Ausgeblendet' : 'Gelöscht');
  },
});
A.rshotadd = async el => {
  ui.rnote = ($('#rp-note') || {}).value || '';
  for (const f of [...el.files].slice(0, 6)) { try { ui.rshots.push(await shrink(f)); } catch (e) { toast('Ein Bild ging nicht'); } }
  photoModal();
};
function loadRecPhotos() { document.querySelectorAll('img.recphoto[data-photo]:not([src])').forEach(async img => { const u = await D.repoPhotoURL(img.dataset.photo); if (u) img.src = u; else img.remove(); }); }

const FORMS = {
  ingextra(t) { ui.ingExtra = (ui.ingExtra || []).concat(t.split(',').map(x => x.trim()).filter(Boolean)); render(); const i = document.querySelector('form[data-f="ingextra"] input'); if (i) i.focus(); },
  shopadd(t) { t.split(',').map(x => x.trim()).filter(Boolean).forEach(x => S.shop.push({ id: uid(), text: x, done: false })); commit(); shopModal(null, true); const i = document.querySelector('form[data-f="shopadd"] input'); if (i) i.focus(); },
  decline(t, form) {
    const id = form.dataset.id, x = S.incoming.find(y => y.id === id); if (!x) return;
    S.answered[id] = { status: 'nein', reason: t, ts: Date.now() }; S.incoming = S.incoming.filter(y => y !== x); ui.declining = null;
    commit(true); toast('Okay – ' + pn() + ' bekommt sie mit deiner Begründung zurück.');
  },
  addplan(t) { const it = { id: uid(), text: t, where: 'liste', created: Date.now() }; S.items.push(it); ui.picks.add(it.id); commit(); },
  addtoday(t) { S.items.push({ id: uid(), text: t, where: 'heute', created: Date.now() }); S.today.planned = true; commit(); },
  addlist(t) { S.items.push({ id: uid(), text: t, where: 'liste', created: Date.now() }); commit(); },
  extra(t, form) {
    const n = workToday().length, stars = n < C.CAP ? 1 : 0;
    S.log.push({ id: uid(), text: t, kind: 'extra', day: today(), ts: Date.now(), stars }); earn(stars);
    S.today.planned = true;
    floatStar(form.querySelector('button'), stars ? '+1 ⭐' : '✓'); toast(pick(C.PRAISE) + (stars ? ' +1 ⭐' : ''));
    afterWork(n + 1);
    askMood(S.log[S.log.length - 1]);
  },
  wish(t) { S.wishes.push({ id: uid(), text: t }); commit(); toast('Gemerkt 💛 – taucht jetzt auch bei den Belohnungen auf.'); },
};

// ---------- the partner finished a task I handed over: celebrate, and say thanks with flying emojis ----------
const THX = [['🥳', 'Party'], ['🔥', 'Feuer'], ['😌', 'Entspannt'], ['😊', 'Freu mich']];
function doneModal(list) {
  confetti(90);
  modal(`<h2>${esc(pn())} hat’s erledigt! 🎉</h2>
    <div class="done-list">${list.map(x => `<p>✓ <b>${esc(x.text)}</b></p>`).join('')}</div>
    <p class="muted">Ein Ding weniger für dich. Sag danke:</p>
    <div class="thx">${THX.map(([e, l]) => `<button class="thx-b" data-a="thank" data-e="${e}" data-ids="${list.map(x => x.id).join(',')}" aria-label="${l}">${e}</button>`).join('')}</div>
    <div class="row"><button class="btn soft" data-a="close">Später</button></div>`, 'done-modal');
}
function flyEmoji(e, n = 26, msg = '') { // emojis float up across the whole screen (with a message on top), then vanish
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { if (msg) toast(msg); return; }
  const box = document.createElement('div'); box.className = 'fly';
  if (msg) { const m = document.createElement('div'); m.className = 'fly-msg'; m.textContent = msg; box.appendChild(m); }
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.textContent = e;
    s.style.cssText = `left:${Math.random() * 92}%;font-size:${28 + Math.random() * 34}px;animation-duration:${2.2 + Math.random() * 1.6}s;animation-delay:${Math.random() * .9}s;--dx:${(Math.random() - .5) * 140}px;--r:${(Math.random() - .5) * 80}deg`;
    box.appendChild(s);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4800);
}
A.thank = el => {
  const ids = el.dataset.ids.split(','), e = el.dataset.e, tasks = S.sent.filter(x => ids.includes(x.id));
  S.thanks = S.thanks || [];
  tasks.forEach(x => { S.thanks.push({ id: uid(), task: x.id, text: x.text, e, ts: Date.now() }); x.thanked = e; });
  closeModal(); commit(true); flyEmoji(e, 12); toast('Danke geschickt ' + e);
};

// ---------- TERMINE: one shared calendar for both of us; the car is a toggle on an appointment ----------
// Each phone keeps the entries it created (S.car) and posts them; the partner's come in via post (S.partnerCar).
// An entry: {id, start, end, note (what), who: 'stand'|'stefan'|'both' (missing = the creator), car (missing = true:
// the old car bookings), every/everyM/until/skip}. Only the creator edits or deletes. Car entries that overlap get a
// warning before saving and a red mark; nothing needs approving.
const carDay = iso => iso.slice(0, 10);
const carTime = iso => iso.slice(11, 16);
function carDayLabel(k) {
  const now = new Date(), t = Car.localISO(now).slice(0, 10), d = parse(k);
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  if (k === t) return 'Heute';
  if (k === Car.localISO(tm).slice(0, 10)) return 'Morgen';
  return C.DAYNAMES[d.getDay()].slice(0, 2) + ', ' + d.getDate() + '. ' + C.MONTHS[d.getMonth()].slice(0, 3);
}
function carRange(b) { // "09:00 – 12:00" or "09:00 – Sa, 6. Okt 18:00"
  if (carTime(b.start) === '00:00' && carTime(b.end) === '23:59' && carDay(b.start) === carDay(b.end)) return 'Ganzer Tag';
  return carTime(b.start) + ' – ' + (carDay(b.end) !== carDay(b.start) ? carDayLabel(carDay(b.end)) + ' ' : '') + carTime(b.end);
}
const isCar = b => b.car !== false;
const shared = b => b.who === 'both' || isCar(b);
const forMe = b => b.who === 'both' || b.who === D.me();   // "Heute … / als Nächstes …": only what concerns me (not the partner's car trips)   // Termine only holds shared appointments and car entries (own ones go in your own calendar)
const whoColor = w => Car.COLORS[w] || '#4fd1a5';
const whoName = (w, du = 'Du') => w === 'both' ? 'Ihr beide' : w === D.me() ? du : pn();
const repTag = b => Car.isSeries(b) ? ` <span class="au-rep">🔁 ${Car.repLabel(b)}${b.until ? ' bis ' + esc(carDayLabel(b.until)) : ''}</span>` : '';
const termKey = b => b.sid || b.id;
// everyone's entries (upcoming, or with Car.recent also the last weeks), sorted; onlyCar for the Auto view
function carAll(pick = Car.live, onlyCar = true) {
  const tag = (list, mine) => pick(list).map(b => { const who = b.who || (mine ? D.me() : D.partner()); return { ...b, mine, who, color: whoColor(who) }; });
  const all = tag(S.car, true).concat(tag(S.partnerCar, false));
  all.forEach(b => { b.clash = isCar(b) && all.some(o => o !== b && isCar(o) && (termKey(o) !== termKey(b) || o.mine !== b.mine) && Car.overlaps(o, b)); });
  return all.filter(b => !onlyCar || isCar(b)).sort((a, b) => a.start < b.start ? -1 : 1);
}
function carToday() { // a slim line on To-Dos when the car is booked today
  const t = Car.localISO(new Date()).slice(0, 10);
  const list = carAll().filter(b => carDay(b.start) <= t && carDay(b.end) >= t);
  if (!list.length) return '';
  return `<button class="cartoday" data-a="go" data-tab="termine"><span class="ct-k">A1 HEUTE</span>${list.map(b => `<span class="ct-r${b.clash ? ' clash' : ''}"><b>${esc(whoName(b.who))}</b> ${esc(carRange(b))}${b.note ? ' · ' + esc(b.note) : ''}</span>`).join('')}<span class="ct-go">›</span></button>`;
}
const mark = (b, size) => isCar(b) ? Car.icon(b.color, size) : `<i class="tdot" style="background:${b.color};width:${size * .5}px;height:${size * .5}px"></i>`;
function termRow(b) { // one entry in a list (the next date of a series)
  return `<div class="au-row${b.clash ? ' clash' : ''}${b.mine ? ' mine' : ''}" style="--who:${b.color}">
      <div class="au-time">${esc(carRange(b))}</div>
      <div class="au-who">${mark(b, 22)} <b>${esc(b.note || (isCar(b) ? 'Auto' : 'Termin'))}</b> · ${esc(whoName(b.who))}${isCar(b) && ui.tab === 'termine' ? ' · 🚗' : ''}${repTag(b)}${!b.mine ? `<div class="au-by">eingetragen von ${esc(pn())}</div>` : ''}${b.clash ? `<div class="au-warn">Auto doppelt verplant – kurz absprechen</div>` : ''}</div>
      ${b.mine ? termActs(b) : ''}
    </div>`;
}
const termActs = b => `<span class="au-acts"><button class="au-x" data-a="caredit" data-id="${termKey(b)}" aria-label="Ändern">✎</button><button class="au-x" data-a="cardel" data-id="${termKey(b)}" data-k="${carDay(b.start)}" aria-label="Löschen">✕</button></span>`;
function termList(all, empty) {
  const now = Car.localISO(new Date());
  if (!all.length) return `<p class="au-empty">${empty}</p>`;
  let h = '', day = '';
  const seen = new Set(), rows = all.filter(b => !b.sid || (!seen.has(b.sid) && seen.add(b.sid)));
  for (const b of rows) {
    const d = carDay(b.start) < now.slice(0, 10) ? now.slice(0, 10) : carDay(b.start);
    if (d !== day) { day = d; h += `<div class="au-day">${esc(carDayLabel(d))}</div>`; }
    h += termRow(b);
  }
  return h;
}
function viewTermine() {
  const all = carAll(Car.live, false).filter(shared), t = Car.localISO(new Date()).slice(0, 10);
  const mine = all.filter(forMe), todays = mine.filter(b => carDay(b.start) <= t && carDay(b.end) >= t), next = mine.find(b => b.start > Car.localISO(new Date()));
  return `<section class="audi termine">
    <div class="au-hero tm-hero">
      <div class="au-kicker">Unser Kalender</div>
      <div class="au-model">Termine</div>
      <div class="au-trim">Was ihr zusammen vorhabt – und wer das Auto hat</div>
      <div class="au-status">${todays.length ? '<span class="au-dot busy"></span>' : '<span class="au-dot"></span>'}<span>${todays.length ? 'Heute ' + (todays.length === 1 ? 'ein Termin' : todays.length + ' Termine') : 'Heute nichts – herrlich'}${next ? ` · als Nächstes <b>${esc(next.note || 'Termin')}</b>, ${carDayLabel(carDay(next.start))} ${carTime(next.start)}` : ''}</span></div>
    </div>
    <button class="au-btn" data-a="carnew" data-car="0">Termin eintragen</button>
    ${carCalendar(false)}
    <div class="au-h">Alle kommenden Termine</div>
    ${termList(all, 'Nichts geplant. Genießt es.')}
    <p class="au-note">Hier stehen gemeinsame Termine und alles mit Auto. Eigene Termine ohne Auto gehören in euren eigenen Kalender. Ändern und löschen kann nur, wer eingetragen hat.</p></section>`;
}
// ---------- the calendar: a month, a mark per entry in its person's colour, a 24 h strip per day ----------
function carCalendar(onlyCar) {
  const todayK = Car.localISO(new Date()).slice(0, 10);
  const mon = ui.carMonth || todayK.slice(0, 7), sel = ui.carDay || todayK;
  const [y, m] = mon.split('-').map(Number), first = new Date(y, m - 1, 1);
  const startK = key(new Date(y, m - 1, 1 - (first.getDay() + 6) % 7));
  const all = carAll(Car.recent, onlyCar).filter(b => onlyCar || shared(b));
  const dayOf = k => all.map(b => ({ b, span: Car.onDay(b, k) })).filter(x => x.span);
  const strip = list => list.map(({ b, span }) => `<i style="left:${span[0] / 14.4}%;width:${Math.max(3, (span[1] - span[0]) / 14.4)}%;background:${b.color}"></i>`).join('');
  const legend = [D.me(), D.partner(), 'both'].map(w => `<span>${onlyCar ? Car.icon(whoColor(w), 22) : `<i class="tdot" style="background:${whoColor(w)}"></i>`} ${esc(w === D.me() ? (S.name || 'Du') : whoName(w))}</span>`).join('');
  let h = `<div class="au-h">Kalender</div>
    <div class="cal-head"><button class="cal-nav" data-a="carmonth" data-d="-1" aria-label="Vorheriger Monat">‹</button>
      <div class="cal-title">${C.MONTHS[m - 1]} ${y}</div>
      <button class="cal-nav" data-a="carmonth" data-d="1" aria-label="Nächster Monat">›</button></div>
    <div class="cal-legend">${legend}${onlyCar ? '' : '<span>🚗 = mit Auto</span>'}</div>
    <div class="cal">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<div class="cal-wd">${d}</div>`).join('')}`;
  for (let i = 0; i < 42; i++) {
    const k = addDays(startK, i);
    if (i === 35 && k.slice(0, 7) !== mon) break;          // no empty 6th row
    const list = dayOf(k), out = k.slice(0, 7) !== mon;
    const marks = list.length <= 3 ? list.map(x => mark(x.b, 17)).join('')
      : list.slice(0, 2).map(x => mark(x.b, 17)).join('') + `<span class="cal-more">+${list.length - 2}</span>`;
    const clash = list.some(x => x.b.clash);
    h += `<button class="cal-d${out ? ' out' : ''}${k < todayK ? ' past' : ''}${k === todayK ? ' today' : ''}${k === sel ? ' sel' : ''}" data-a="carday" data-k="${k}" aria-label="${longDate(k)}${list.length ? ', ' + list.length + (onlyCar ? ' Reservierung' + (list.length > 1 ? 'en' : '') : ' Termin' + (list.length > 1 ? 'e' : '')) : ', frei'}">
      <span class="cal-n">${parse(k).getDate()}</span>${clash ? '<span class="cal-clash"></span>' : ''}
      <span class="cal-cars">${marks}</span><span class="cal-strip">${strip(list)}</span></button>`;
  }
  h += `</div>`;
  // the chosen day in detail
  const list = dayOf(sel);
  h += `<div class="cal-detail"><div class="cal-dt">${esc(longDate(sel))}</div>
    <div class="cal-bar">${strip(list)}<b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b></div>
    <div class="cal-ticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
  h += list.length ? list.map(({ b }) => `<div class="cal-bk${b.clash ? ' clash' : ''}" style="--who:${b.color}">${mark(b, 26)}
      <div><div class="au-time sm">${esc(carRange(b))}${carDay(b.start) !== carDay(b.end) ? ` <span class="cal-span">${esc(carDayLabel(carDay(b.start)))} → ${esc(carDayLabel(carDay(b.end)))}</span>` : ''}</div>
      <div class="au-who"><b>${esc(b.note || (isCar(b) ? 'Auto' : 'Termin'))}</b> · ${esc(whoName(b.who))}${isCar(b) && !onlyCar ? ' · 🚗' : ''}${repTag(b)}${!b.mine ? `<div class="au-by">eingetragen von ${esc(pn())}</div>` : ''}${b.clash ? '<div class="au-warn">Auto doppelt verplant – kurz absprechen</div>' : ''}</div></div>
      ${b.mine && b.end > Car.localISO(new Date()) ? termActs(b) : ''}</div>`).join('')
    : `<p class="au-empty">${sel < todayK ? (onlyCar ? 'Da war das Auto frei.' : 'Da war nichts.') : (onlyCar ? 'Den ganzen Tag frei.' : 'Noch nichts geplant.')}</p>`;
  if (sel >= todayK) h += `<button class="au-btn ghost" data-a="carnew" data-car="${onlyCar ? 1 : 0}" data-k="${sel}">${onlyCar ? 'An diesem Tag reservieren' : 'An diesem Tag eintragen'}</button>`;
  return h + `</div>`;
}
Object.assign(A, {
  carmonth(el) {
    const [y, m] = (ui.carMonth || Car.localISO(new Date()).slice(0, 7)).split('-').map(Number);
    const d = new Date(y, m - 1 + +el.dataset.d, 1); ui.carMonth = key(d).slice(0, 7); render();
  },
  carday(el) {
    ui.carDay = el.dataset.k; if (el.dataset.k.slice(0, 7) !== (ui.carMonth || Car.localISO(new Date()).slice(0, 7))) ui.carMonth = el.dataset.k.slice(0, 7);
    render(); const d = $('.cal-detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
});
function carModal(keep = false) {
  const f = ui.carForm, auto = f.from === 'auto';
  const clash = f.clash ? `<div class="au-clash"><b>Das Auto ist da schon verplant</b>${f.clash.slice(0, 3).map(b => `<div>${esc(carDayLabel(carDay(b.start)))} · ${esc(carRange(b))} · ${esc(whoName(b.who))}${b.note ? ' · ' + esc(b.note) : ''}</div>`).join('')}${f.clash.length > 3 ? `<div>… und ${f.clash.length - 3} weitere Termine</div>` : ''}
      <div class="row"><button class="au-btn ghost" data-a="carclash">Andere Zeit</button><button class="au-btn red" data-a="carsave" data-force="1">${f.id ? 'Trotzdem speichern' : 'Trotzdem eintragen'}</button></div></div>` : '';
  const whoChips = [[D.me(), S.name || 'Mich'], [D.partner(), pn()], ['both', 'Uns beide']];
  modal(`<div class="audi au-modal"><div class="au-kicker">${auto ? 'A1 Sportback' : 'Unser Kalender'}</div><div class="au-model sm">${f.id ? (auto ? 'Reservierung ändern' : 'Termin ändern') : (auto ? 'Reservieren' : 'Neuer Termin')}</div>
    <label class="au-full"><span>${auto ? 'Wofür? (optional)' : 'Was?'}</span><input id="c-note" maxlength="40" placeholder="${auto ? 'z.B. Arzt, Einkaufen, Training' : 'z.B. Zahnarzt, Elternabend, Kino'}" value="${esc(f.note)}"></label>
    <div class="au-lbl">Für wen?</div>
    <div class="au-reps three">${whoChips.map(([v, l]) => `<button class="au-chip${f.who === v ? ' on' : ''}" type="button" data-a="termwho" data-v="${v}" style="--who:${whoColor(v)}"><i class="tdot" style="background:${whoColor(v)}"></i> ${esc(l)}</button>`).join('')}</div>
    <button class="au-chip au-cartgl${f.car ? ' on' : ''}" type="button" data-a="termcar"${f.who !== 'both' ? ' disabled' : ''}>🚗 ${f.car ? 'Braucht das Auto ✓' : 'Braucht das Auto?'}</button>
    ${f.who !== 'both' ? '<p class="au-hint">Für eine Person allein geht es hier nur ums Auto – eigene Termine kommen in euren eigenen Kalender.</p>' : ''}
    <div class="au-grid">
      <label><span>Von</span><input type="date" id="c-sd" value="${f.sd}" oninput="const e=document.getElementById('c-ed'); if(e.value<this.value) e.value=this.value"></label>
      <label><span>&nbsp;</span><input type="time" id="c-st" value="${f.st}"></label>
      <label><span>Bis</span><input type="date" id="c-ed" value="${f.ed}"></label>
      <label><span>&nbsp;</span><input type="time" id="c-et" value="${f.et}"></label>
    </div>
    <button class="au-chip" type="button" onclick="document.getElementById('c-st').value='00:00';document.getElementById('c-et').value='23:59';document.getElementById('c-ed').value=document.getElementById('c-sd').value">Ganzer Tag</button>
    <div class="au-lbl">Wiederholen</div>
    <div class="au-reps">${[['0', 'Einmal'], ['7', 'Jede Woche'], ['14', 'Alle 14 Tage'], ['c', 'Eigene…']].map(([v, l]) => `<button class="au-chip${String(f.rep || 0) === v ? ' on' : ''}" type="button" data-a="carrep" data-v="${v}">${l}</button>`).join('')}</div>
    ${f.rep === 'c' ? `<div class="au-custom"><span>Alle</span><input type="number" id="c-n" min="1" max="365" inputmode="numeric" value="${esc(f.n || 3)}">
      <select id="c-unit">${[['d', 'Tage'], ['w', 'Wochen'], ['m', 'Monate']].map(([v, l]) => `<option value="${v}"${(f.unit || 'w') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
    ${f.rep ? `<label class="au-full"><span>Bis (optional – leer = ohne Ende)</span><input type="date" id="c-until" value="${f.until || ''}"></label>` : ''}
    ${f.err ? `<div class="au-err">${esc(f.err)}</div>` : ''}
    ${clash || `<div class="row"><button class="au-btn ghost" data-a="close">Abbrechen</button><button class="au-btn" data-a="carsave">${f.id ? 'Speichern' : 'Eintragen'}</button></div>`}
  </div>`, 'au-wrap', keep);
}
// the form's repeat choice ↔ an entry's series fields
function repRule(f) {
  if (!f.rep) return {};
  if (f.rep !== 'c') return { every: f.rep };
  return f.unit === 'm' ? { everyM: f.n } : { every: f.unit === 'w' ? f.n * 7 : f.n };
}
function repForm(b) {
  if (b.everyM) return { rep: 'c', n: b.everyM, unit: 'm' };
  if (b.every === 7 || b.every === 14) return { rep: b.every };
  if (b.every) return b.every % 7 === 0 ? { rep: 'c', n: b.every / 7, unit: 'w' } : { rep: 'c', n: b.every, unit: 'd' };
  return { rep: 0 };
}
function carRead() {
  const v = id => (document.getElementById(id) || {}).value || '';
  Object.assign(ui.carForm, { sd: v('c-sd'), st: v('c-st'), ed: v('c-ed'), et: v('c-et'), note: v('c-note').trim(), until: ui.carForm.rep ? v('c-until') : '' });
  if (ui.carForm.rep === 'c' && document.getElementById('c-n')) Object.assign(ui.carForm, { n: Math.max(1, Math.min(365, Math.round(+v('c-n')) || 1)), unit: v('c-unit') || 'w' });
}
Object.assign(A, {
  carnew(el) {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    const k = el && el.dataset.k, car = !el || el.dataset.car !== '0';
    if (k && k > Car.localISO(d).slice(0, 10)) { const [y, m, dd] = k.split('-').map(Number); d.setFullYear(y, m - 1, dd); d.setHours(9); }
    const e = new Date(d); e.setHours(e.getHours() + (car ? 2 : 1));
    const a = Car.localISO(d), b = Car.localISO(e);
    ui.carForm = { sd: a.slice(0, 10), st: a.slice(11), ed: b.slice(0, 10), et: b.slice(11), note: '', who: car ? D.me() : 'both', car, from: car ? 'auto' : 'termine' };
    carModal(); syncPost();           // fresh partner entries while she fills it in
  },
  caredit(el) {
    const b = S.car.find(x => x.id === el.dataset.id && !x.del); if (!b) return;   // only what I entered lives in S.car
    ui.carForm = { id: b.id, sd: carDay(b.start), st: carTime(b.start), ed: carDay(b.end), et: carTime(b.end), note: b.note || '', until: b.until || '', who: b.who || D.me(), car: isCar(b), from: isCar(b) && b.who !== 'both' ? 'auto' : 'termine', ...repForm(b) };
    carModal(); syncPost();
  },
  carrep(el) { carRead(); const v = el.dataset.v; ui.carForm.rep = v === 'c' ? 'c' : +v; ui.carForm.clash = null; carModal(true); },
  termwho(el) { carRead(); ui.carForm.who = el.dataset.v; if (el.dataset.v !== 'both') ui.carForm.car = true; ui.carForm.clash = null; carModal(true); },
  termcar() { carRead(); if (ui.carForm.who !== 'both') return; ui.carForm.car = !ui.carForm.car; ui.carForm.clash = null; carModal(true); },
  carclash() { carRead(); ui.carForm.clash = null; carModal(true); },
  async carsave(el) {
    if (!el.dataset.force) carRead();
    const f = ui.carForm, start = f.sd + 'T' + f.st, end = f.ed + 'T' + f.et;
    const was0 = f.id && S.car.find(x => x.id === f.id && !x.del);
    const rep = repRule(f);
    const rule = { start, end, ...rep, ...(f.rep && f.until ? { until: f.until } : {}), ...(f.rep && was0 && was0.skip ? { skip: was0.skip } : {}) };
    const dates = Car.live([{ id: 'neu', ...rule }]);
    f.err = !f.sd || !f.st || !f.ed || !f.et ? 'Bitte Datum und Uhrzeit ausfüllen.' : end <= start ? 'Das Ende muss nach dem Anfang liegen.'
      : f.rep && f.until && f.until < f.sd ? 'Das „Bis“ liegt vor dem ersten Termin.' : !dates.length ? 'Das liegt schon in der Vergangenheit.'
      : !f.car && !f.note ? 'Was ist es denn? Ein Wort reicht.' : '';   // the car alone needs no title
    if (f.err) { carModal(true); return; }
    if (!el.dataset.force && f.car) {
      await syncPost();
      const clash = carAll().filter(b => !(b.mine && termKey(b) === f.id) && dates.some(d => Car.overlaps(b, d)));
      if (clash.length) { f.clash = clash; carModal(true); return; }
    }
    const old = Car.localISO(new Date(Date.now() - 30 * 864e5));
    S.car = S.car.filter(b => Car.isSeries(b) ? !b.until || b.until >= old.slice(0, 10) : !(b.end < old));        // forget long-past ones
    const was = f.id && S.car.find(x => x.id === f.id && !x.del);
    if (was) { ['every', 'everyM', 'until', 'skip'].forEach(k => delete was[k]); Object.assign(was, rule, { note: f.note, who: f.who, car: !!f.car, ts: Date.now() }); }
    else S.car.push({ id: uid(), ...rule, note: f.note, who: f.who, car: !!f.car, ts: Date.now() });
    ui.carForm = null; ui.carDay = f.sd; ui.carMonth = f.sd.slice(0, 7); closeModal(); commit(true);
    toast((f.car ? '🚗 ' : '📅 ') + (was ? 'Geändert: ' : f.from === 'auto' ? 'Reserviert: ' : 'Eingetragen: ') + (f.rep ? Car.repLabel(rep) + ' ab ' : '') + carDayLabel(f.sd) + ' ' + carRange({ start, end }));
  },
  cardel(el) {
    const b = S.car.find(x => x.id === el.dataset.id); if (!b) return;
    if (Car.isSeries(b) && el.dataset.k && !el.dataset.all) {
      const k = el.dataset.k;
      modal(`<div class="audi au-modal"><div class="au-kicker">Serie · ${esc(Car.repLabel(b))}</div><div class="au-model sm">Was löschen?</div>
        <p class="au-empty">${esc(b.note || 'Dieser Termin')} wiederholt sich ${esc(Car.repLabel(b))}.</p>
        <button class="au-btn" data-a="cardelone" data-id="${b.id}" data-k="${k}">Nur am ${esc(carDayLabel(k))}</button>
        <button class="au-btn ghost" data-a="cardel" data-all="1" data-id="${b.id}">Ganze Serie löschen</button>
        <button class="au-btn ghost" data-a="close">Abbrechen</button></div>`, 'au-wrap');
      return;
    }
    b.del = true; b.ts = Date.now();   // kept as deleted, so another device of mine can't bring it back
    closeModal(); commit(true); toast(Car.isSeries(b) ? 'Serie gelöscht' : 'Gelöscht');
  },
  cardelone(el) {
    const b = S.car.find(x => x.id === el.dataset.id); if (!b) return;
    b.skip = [...new Set([...(b.skip || []), el.dataset.k])]; b.ts = Date.now();
    closeModal(); commit(true); toast('Am ' + carDayLabel(el.dataset.k) + ' ausgelassen');
  },
});
// the partner entered something for me (or for both of us): say so once
function newForMe() {
  const mine = [D.me(), 'both'], ids = Car.raw(S.partnerCar).map(b => b.id);
  if (!S.termSeen) { S.termSeen = ids; return []; }            // first time: no flood of old entries
  const fresh = Car.raw(S.partnerCar).filter(b => !S.termSeen.includes(b.id) && mine.includes(b.who));
  S.termSeen = [...new Set([...S.termSeen, ...ids])].slice(-300);
  return fresh;
}

// ---------- HOME: the start screen – what's going on today, a few numbers, the two of you ----------
function daySlot() { const h = new Date().getHours(); return h < 5 ? 'nacht' : h < 11 ? 'morgen' : h < 14 ? 'mittag' : h < 18 ? 'nachmittag' : h < 23 ? 'abend' : 'nacht'; }
const GREET = { morgen: 'Guten Morgen', mittag: 'Mahlzeit', nachmittag: 'Hallo', abend: 'Guten Abend', nacht: 'Noch wach' };
function pickSplash() { const t = C.SPLASH_TIME[daySlot()] || []; const all = C.SPLASHES.concat(t, t); let n; do { n = pick(all); } while (n === ui.splash && all.length > 1); ui.splash = n; }
function myStats() { // the numbers that travel to the partner (counts only)
  return { day: today(), done: workToday().length, total: S.log.filter(isWork).length, earned: S.earned };
}
function homeStats() {
  const work = S.log.filter(isWork), counts = {};
  for (const e of work) { const c = e.chore && S.chores.find(x => x.id === e.chore); const k = c ? c.icon + ' ' + c.name : e.text; counts[k] = (counts[k] || 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const laundry = work.filter(e => /wäsche/i.test(e.text)).length;
  return { total: work.length, rest: S.log.filter(isRest).length, earned: S.earned, laundry, top: top && top[1] >= 2 ? top : null,
    sent: S.log.filter(e => e.kind === 'delegate').reduce((a, e) => a + (e.n || parseInt(e.text) || 1), 0) };
}
function viewHome() {
  if (!ui.splash) pickSplash();
  const t = today(), slot = daySlot(), st = homeStats();
  const heute = S.items.filter(i => i.where === 'heute'), done = workToday();
  let h = `<section class="hello"><div class="hello-g">${GREET[slot]}${slot === 'nacht' ? '?' : ','}</div><div class="hello-n">${esc(S.name || 'gute Nudel')}</div>
    <button class="splash" data-a="splash" aria-label="Neuer Spruch"><span class="${ui.splash.length > 26 ? 'long' : ''}">${esc(ui.splash)}</span></button></section>`;
  h += incomingCard() + giftCards();
  // today
  const finished = dayDone();
  const all = heute.length + done.length, p = all ? done.length / all : 0, R = 34, U = 2 * Math.PI * R;
  h += `<button class="card hcard today-card" data-a="go" data-tab="heute">
    <svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${R}" class="ring-bg"/><circle cx="42" cy="42" r="${R}" class="ring-fg" style="stroke-dasharray:${U};stroke-dashoffset:${U * (1 - p)}"/></svg>
    <span class="ring-n">${finished ? '🎉' : all ? done.length + '<small>/' + all + '</small>' : '–'}</span>
    <span class="hc-txt"><b>${finished ? 'Tag geschafft!' : !S.today.planned && !done.length ? 'Noch nichts geplant' : heute.length === 0 ? 'Alles abgehakt! 🎉' : heute.length === 1 ? 'Noch eine Sache' : 'Noch ' + heute.length + ' Sachen'}</b>
      <span class="muted">${finished ? 'Der Rest wartet bis morgen.' : !S.today.planned && !done.length ? 'Hol dir was aus der Liste.' : done.length ? done.length + ' heute schon geschafft' : 'Du schaffst das.'}${heute.filter(i => i.chore).length ? ' · 🔁 ' + heute.filter(i => i.chore).length + ' fällig' : ''}</span></span><span class="hc-go">›</span></button>`;
  // next appointments (today + tomorrow) and the car
  const now = Car.localISO(new Date()), tm = addDays(t, 1);
  const soon = carAll(Car.live, false).filter(b => shared(b) && forMe(b) && carDay(b.start) <= tm && b.end > now).slice(0, 3);
  h += `<button class="card hcard" data-a="go" data-tab="termine"><span class="hc-txt"><b>📅 Als Nächstes</b>${soon.length
      ? soon.map(b => `<span class="hc-term"><i class="tdot" style="background:${b.color}"></i> ${esc(carDayLabel(carDay(b.start) < t ? t : carDay(b.start)))} ${esc(carTime(b.start))} · <b>${esc(b.note || (isCar(b) ? 'Auto' : 'Termin'))}</b> <span class="muted">· ${esc(whoName(b.who))}${isCar(b) ? ' · 🚗' : ''}</span></span>`).join('')
      : '<span class="muted">Heute und morgen keine Termine. Der Kalender gähnt.</span>'}</span><span class="hc-go">›</span></button>`;
  // the headline number
  const facts = C.FUN_FACTS.filter(([c]) => c(st)), fact = facts.length ? facts[dayIndex() % facts.length][1](st) : 'Die erste Nudel ist die schwerste.';
  h += `<div class="card headline"><div class="hl-n">${st.total}</div><div class="hl-l">Sachen erledigt – insgesamt</div><div class="hl-f">${esc(fact)}</div></div>`;
  // numbers
  h += `<div class="sec-title">In Zahlen</div><div class="nums">
    <div class="num"><b>${S.earned}</b><span>⭐ gesammelt</span></div>
    <div class="num"><b>${st.rest}</b><span>🛋️ entspannt</span></div>
    <div class="num"><b>${st.sent}</b><span>🤝 abgegeben</span></div>
    ${st.top ? `<div class="num wide"><span>Am häufigsten erledigt</span><b class="top">${esc(st.top[0])} <em>${st.top[1]}×</em></b></div>` : ''}</div>`;
  h += `<button class="card wide rankwrap" data-a="rank">${rankCard(false)}</button>`;
  // the two of you
  const ps = S.partnerStats && S.partnerStats.day === t ? S.partnerStats : null;
  const wk = weekDays(monday(t)), took = S.sent.filter(x => (x.status === 'ok' || x.status === 'erledigt') && wk.includes(key(new Date(x.ts - 3 * 3600e3)))).length;
  h += `<div class="sec-title">Ihr zwei</div><div class="card team">
    ${ps ? `<div class="team-n"><b>${done.length + ps.done}</b><span>heute zusammen geschafft</span></div>`
      : `<p class="muted" style="margin:0">Sobald ${esc(pn())} heute die App öffnet, steht hier, was ihr zusammen schafft.</p>`}
    ${took ? `<p class="team-l">🤝 ${esc(pn())} hat dir diese Woche ${took === 1 ? 'eine Aufgabe' : took + ' Aufgaben'} abgenommen.</p>` : ''}
    ${(S.thanksSeen || []).length ? `<p class="team-l">💛 ${(S.thanksSeen || []).length}× Danke von ${esc(pn())} bekommen.</p>` : ''}
    ${S.partnerStats && S.partnerStats.earned != null ? (pr => `<div class="team-rank">${emblem(pr.t, 40, pr.div)}<span>${esc(pn())} ist gerade <b style="color:${pr.tier.dark}">${esc(pr.name)}</b></span></div>`)(C.rankOf(S.partnerStats.earned)) : ''}
    ${S.partnerStats && S.partnerStats.total ? `<p class="team-l">🍝 Zusammen schon ${st.total + S.partnerStats.total} Sachen erledigt.</p>` : ''}</div>`;
  // treasures
  const pages = S.book.pages, stage = (S.plant && S.plant.stage) || 0;
  h += `<div class="sec-title">Deine Schätze</div><div class="treas">
    <button class="card hcard tr" data-a="go" data-tab="schaetze"><b>📖 ${pages ? 'Fotobuch' : 'Geheimes Buch'}</b><span class="muted">${pages} von ${C.BOOK_PAGES} Seiten</span><span class="bar"><i style="width:${pages / C.BOOK_PAGES * 100}%"></i></span></button>
    <button class="card hcard tr" data-a="go" data-tab="schaetze"><b>🌿 Pflanze</b><span class="muted">${esc(C.STAGES[Math.min(stage, C.STAGES.length - 1)])}</span><span class="bar"><i style="width:${Math.min(1, stage / (C.STAGES.length - 1)) * 100}%;background:var(--green)"></i></span></button></div>
    ${S.stars >= Math.min(C.pageCost(pages), C.STAGE_COST) ? `<button class="btn wide" data-a="go" data-tab="schaetze">⭐ ${S.stars} Sterne – genug für was Neues!</button>` : `<p class="hint" style="text-align:center">⭐ ${S.stars} Sterne zum Ausgeben</p>`}`;
  const gl = Object.values((S.game && S.game.levels) || {}), gdone = gl.filter(p => p >= 100).length;
  h += `<div class="sec-title">Kleine Pause?</div><button class="card hcard gamecard" data-a="game"><span class="gc-pic" aria-hidden="true">🍝</span>
    <span class="hc-txt"><b>Nudel-Rush</b><span class="muted">Im Takt durch die Küche: lenken, springen, Chaos wegputzen.${gl.length ? ' ' + gdone + ' von 5 Leveln geschafft.' : ''}</span></span><span class="hc-go">›</span></button>`;
  return h;
}
A.splash = () => { pickSplash(); render(); };
// Nudel-Rush (spiel.js): no stars, no comparison – just your own record on your own devices
let game = null;
A.game = () => {
  if (game) return;
  game = openGame({
    data: { levels: { ...((S.game && S.game.levels) || {}) }, endless: (S.game && S.game.endless) || 0 },
    onSave: d => { S.game = { levels: { ...d.levels }, endless: d.endless }; S.updatedAt = Date.now(); D.saveLocal(S); D.scheduleBackup(S); },
    onClose: () => { game = null; render(); },
  });
};

// ---------- render ----------
const HTABS = [['heute', '📝 Heute'], ['liste', '📋 Liste']];
function viewHeuteTab() {
  const n = S.items.filter(i => i.where === 'liste').length;
  return `<div class="chips qtabs two">${HTABS.map(([k, l]) => `<button class="chip ${ui.htab === k ? 'on' : ''}" data-a="htab" data-v="${k}">${l}${k === 'liste' && n ? ' <span class="cnt">' + n + '</span>' : ''}</button>`).join('')}</div>` + incomingCard() + (ui.htab === 'liste' ? viewListe() : viewHeute());
}
const VIEWS = { home: viewHome, heute: viewHeuteTab, termine: viewTermine, ruhe: viewRuhe, schaetze: viewSchaetze, woche: viewWoche };
function render() {
  const focused = document.activeElement && document.activeElement.closest('form[data-f]');
  const refocus = focused && focused.dataset.f;
  if (ui.tab === 'liste') { ui.tab = 'heute'; ui.htab = 'liste'; }   // old links to the Liste tab
  $('#main').innerHTML = VIEWS[ui.tab]();
  renderTop();
  loadRecPhotos();
  if (refocus) { const i = document.querySelector(`form[data-f="${refocus}"] input`); if (i) i.focus(); }
  if (ui.tab === 'schaetze') {
    hydratePhotos($('#main'));
    if (!ui.sub && S.book.pages) D.photoURL(1).then(u => { const t = $('#bookthumb'); if (u && t) t.innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`; });
  }
}

// ---------- Android's back button: one step back inside the app, never out of it ----------
// A "guard" entry sits on top of the history; back pops it, we take one step back in the app and put it back.
// (Chrome skips history entries added without a user tap, so the guard is also re-armed on the next tap.)
let guarded = false;
function armBack() { if (!guarded) { try { history.pushState({ gn: 'guard' }, ''); guarded = true; } catch (e) {} } }
function goBack() {
  if (game) { game.back(); return; }
  if ($('#ov')) { closeModal(); return; }
  const v = $('.viewer'), st = $('#story');
  if (v) { v.remove(); return; }
  if (st) { st.remove(); render(); return; }
  if (ui.tab === 'ruhe' && ui.qtab === 'kochbuch' && ui.rid) {
    if (ui.cstep != null) { endCookMode(); render(); return; }
    ui.rid = null; ui.sides = []; render(); return;
  }
  if (ui.sub) { ui.sub = null; render(); scrollTo(0, 0); return; }
  if (ui.tab === 'heute' && ui.htab === 'liste') { ui.htab = 'heute'; render(); scrollTo(0, 0); return; }
  if (ui.tab !== 'home') { ui.tab = 'home'; render(); scrollTo(0, 0); return; }
  toast('Du bist zu Hause 🙂');
}
addEventListener('popstate', () => { guarded = false; goBack(); armBack(); });

function bind() {
  // sticky sub-tab chips sit exactly under the header, whatever its real height (iPhone notch, font size)
  const topH = () => document.documentElement.style.setProperty('--top-h', $('#top').getBoundingClientRect().height + 'px');
  topH(); if ('ResizeObserver' in window) new ResizeObserver(topH).observe($('#top')); else addEventListener('resize', topH);
  document.addEventListener('pointerdown', armBack, true);
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const f = A[el.dataset.a]; if (f) { e.preventDefault(); f(el, e); }
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && A[el.dataset.ch]) A[el.dataset.ch](el); });
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-f]'); if (!form) return;
    e.preventDefault();
    const inp = form.querySelector('input'), t = inp.value.trim(); if (!t) return;
    inp.value = ''; FORMS[form.dataset.f](t, form);
  });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.tab === 'heute') ui.htab = 'heute'; ui.tab = b.dataset.tab; ui.sub = null; render(); scrollTo(0, 0); });
  $('#cloud').addEventListener('click', settings);
  $('#stars').addEventListener('click', A.stars);
  $('#rankbtn').addEventListener('click', rankModal);
  D.backup.listeners.add(renderTop);
  addEventListener('online', () => { syncDevices().then(() => D.flushBackup()); D.flushPost(); syncPost(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncDevices(); }, 60000);
  setInterval(() => { if (document.visibilityState === 'visible') syncPost(); }, 90000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') D.flushBackup();
    else { if (rollover()) commit(); checkEvening(); syncPost(); syncDevices(); }
  });
  setInterval(() => { if (rollover()) commit(); checkEvening(); }, 60000);
}

function welcome() {
  modal(`<h2>Hallo, gute Nudel! 💛</h2>
    <p style="text-align:left">📝 <b>Heute</b>: Such dir morgens ein paar Sachen aus. Wenn sie erledigt sind, ist der Tag geschafft – wirklich.</p>
    <p style="text-align:left">⭐ Für jede erledigte Sache gibt es einen <b>gute Nudel Stern</b>. Ab ${C.CAP} am Tag heißt es: genug für heute!</p>
    <p style="text-align:left">🏠 <b>Daheim</b>: Was zuhause regelmäßig dran ist, kommt von allein – dazu deine Einkaufsliste und das Kochbuch.</p>
    <p style="text-align:left">🎁 Bei <b>Schätze</b> wartet ein geheimes Fotobuch – und eine Pflanze, die mit dir wächst.</p>
    <label class="field"><span>Wie soll ich dich nennen? (optional)</span><input id="w-name" placeholder="Dein Name"></label>
    <div class="row"><button class="btn" data-a="welcomego">Los geht's</button></div>`);
}
A.welcomego = () => { const n = $('#w-name').value.trim(); S.name = n; S.welcomed = true; closeModal(); commit(); D.askPersistent(); };

// ---------- several devices of one person: merge two versions of the same save ----------
// base = the version both devices last agreed on (null if unknown). With it, the merge knows what was DELETED:
// an entry that was in the base but is missing on one side was ticked off or removed there and stays gone.
// Without a base (old app version) it falls back to joining everything.
function mergeStates(local, remote, base = null) {
  const newer = (remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local, older = newer === remote ? local : remote;
  const m = Object.assign(D.freshState(), newer, { me: D.me() });
  // lists: joined by id, the newer version of an entry wins; deleted on either side (since the base) = gone
  const join = k => {
    const a = (newer[k] || []).filter(Boolean), b = (older[k] || []).filter(Boolean);
    const inA = new Set(a.map(x => x.id)), inB = new Set(b.map(x => x.id)), inBase = base ? new Set((base[k] || []).filter(Boolean).map(x => x.id)) : null;
    const seen = new Set();
    return a.concat(b).filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return !inBase || !inBase.has(x.id) || (inA.has(x.id) && inB.has(x.id)); });
  };
  ['items', 'chores', 'shop', 'wishes', 'sent', 'gifts', 'timers', 'car', 'thanks', 'myRecipes', 'recipeInbox'].forEach(k => { m[k] = join(k); });
  m.hiddenRecipes = [...new Set([].concat(newer.hiddenRecipes || [], older.hiddenRecipes || []))];
  // the log the same way (an undo on one device removes the entry everywhere)
  const ids = new Set((newer.log || []).map(e => e.id)), extra = (older.log || []).filter(e => !ids.has(e.id));
  m.log = join('log').sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (base) { // stars: both sides' changes since the base add up
    m.stars = Math.max(0, (newer.stars || 0) + (older.stars || 0) - (base.stars || 0));
    m.earned = Math.max(0, (newer.earned || 0) + (older.earned || 0) - (base.earned || 0));
  } else {
    m.stars = Math.max(0, (newer.stars || 0) + extra.reduce((a, e) => a + (e.stars || 0), 0));
    m.earned = (newer.earned || 0) + extra.reduce((a, e) => a + Math.max(0, e.stars || 0), 0);
  }
  // a chore deleted on one device takes its open to-dos with it; one open to-do per chore at most
  const cids = new Set(m.chores.map(c => c.id)), one = new Set();
  m.items = m.items.filter(i => !i.chore || (cids.has(i.chore) && !(i.where === 'heute' && (one.has(i.chore) || !one.add(i.chore)))));
  m.recipes = newer.recipes || older.recipes;
  m.fixes = [...new Set([].concat(newer.fixes || [], older.fixes || []))];
  m.favs = [...new Set([].concat(newer.favs || [], older.favs || []))];
  m.termSeen = newer.termSeen || older.termSeen ? [...new Set([].concat(newer.termSeen || [], older.termSeen || []))].slice(-300) : undefined;
  m.thanksSeen = [...new Set([].concat(newer.thanksSeen || [], older.thanksSeen || []))].slice(-200);
  m.cook = Object.assign({}, older.cook || {}, newer.cook || {});
  m.answered = Object.assign({}, older.answered || {}, newer.answered || {});
  const gA = newer.game || {}, gB = older.game || {}, lv = { ...(gB.levels || {}) };
  for (const [k, v] of Object.entries(gA.levels || {})) lv[k] = Math.max(v, lv[k] || 0);
  m.game = { levels: lv, endless: Math.max(gA.endless || 0, gB.endless || 0) };
  m.book = { pages: Math.max((newer.book || {}).pages || 0, (older.book || {}).pages || 0) };
  m.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0) + 1;
  return m;
}
function takeRemote(remote, adopt, base) {
  S = adopt ? Object.assign(D.freshState(), remote, { me: D.me() }) : mergeStates(S, remote, base);
  D.saveLocal(S);
  rollover(); scheduleChores(); render();
  toast(adopt ? '🔄 Auf dem neuesten Stand' : '🔄 Mit dem anderen Gerät zusammengeführt');
  return S;
}
async function syncDevices() { await D.pull(S); }

// One-time corrections, applied on the right phone the next time it opens (each only once, noted in S.fixes).
const FIXES = [
  { id: '2026-10-03-stefan-cozy', me: 'stefan', stars: -4, kind: 'setup', n: 4, note: '4 Sterne aus den alten Gemütlich-Schritten zurückgenommen' },
];
function applyFixes() {
  S.fixes = S.fixes || [];
  let done = 0;
  for (const f of FIXES) {
    if (f.me !== D.me() || S.fixes.includes(f.id)) continue;
    S.stars = Math.max(0, S.stars + f.stars); S.earned = Math.max(0, S.earned + f.stars);
    if (f.kind) S.log.filter(e => e.kind === f.kind && e.stars > 0).slice(0, f.n).forEach(e => { e.stars = 0; });
    S.fixes.push(f.id); done++;
    toast('⭐ ' + f.note);
  }
  return done;
}

// setup link: …/#setup=owner/repo/token[&p=name] connects the backup in one go (the part after # never leaves the phone)
async function setupFromLink() {
  const m = location.hash.match(/^#setup=([^/]+)\/([^/]+)\/([^/&]+)(?:&p=([\w-]+))?$/);
  if (!m) return false;
  history.replaceState(null, '', location.pathname);
  await D.setCfg({ owner: decodeURIComponent(m[1]), repo: decodeURIComponent(m[2]), token: decodeURIComponent(m[3]), ...(m[4] ? { file: 'sicherung/' + m[4] + '.json' } : {}) });
  return true;
}

async function start() {
  const fromLink = await setupFromLink();
  await D.restoreCfg();
  S = await D.loadLocal();
  if (!S) S = D.freshState();
  // whose data is on this phone? A different person's setup link (or an old phone that never noted it) must not
  // carry the other person's tasks over: start empty, the right person's backup is loaded below.
  if (fromLink && S.me !== D.me()) S = D.freshState();
  else if (!S.me) S.me = D.me();
  else if (S.me !== D.me()) S = D.freshState();
  S.me = D.me();
  rollover();
  scheduleChores();
  if (applyFixes()) { S.updatedAt = Date.now(); D.saveLocal(S); D.scheduleBackup(S); }
  D.setRemoteHandler(takeRemote);
  bind();
  render();
  await D.saveLocal(S);
  if ('serviceWorker' in navigator && !localStorage.getItem('gn_nosw')) {
    // look for a new version on start, when the app comes back to the front and every 30 min; when one takes over, reload once
    const had = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloading) { reloading = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then(reg => {
      const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 30 * 60e3);
    }).catch(() => {});
  }
  if (fromLink) { // check the key; a fresh phone with an existing backup gets everything back
    const r = await D.testConnection().catch(() => ({ ok: false, msg: 'keine Verbindung' }));
    if (!r.ok) toast('Sicherung: ' + r.msg);
    else {
      const remote = await D.fetchBackup().catch(() => null);
      if (remote && (!remote.me || remote.me === D.me()) && !S.log.length && remote.updatedAt > S.updatedAt) { await applyRestore(remote); syncPost(); return; }
      D.scheduleBackup(S, 10); toast('Sicherung eingerichtet ✓');
    }
  }
  if (!S.welcomed) welcome();
  else D.askPersistent();
  syncPost();
  syncDevices();
  S.timers = [];   // the in-app timer is gone (2026-10-03): nothing left over
  try { history.replaceState({ gn: 'root' }, ''); } catch (e) {}
  armBack();
}
start();
window.__gn = { goBack, rankOf: C.rankOf, mergeStates, syncDevices, get S() { return S; }, ui, render, commit, D, rollover, syncPost, scheduleChores };
