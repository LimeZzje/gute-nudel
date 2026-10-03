import * as C from './content.js';
import * as K from './cookbook.js';
import * as D from './data.js';
import { plantSVG } from './plant.js';

const VERSION = '2026-10-03.24';
let S = null;                                   // the state (see data.js freshState)
const ui = { tab: 'heute', qtab: 'haushalt', sub: null, picks: new Set(), showAllQuests: false, rsize: 'klein', ridea: null, openPrep: null };
const $ = s => document.querySelector(s);
const tags = i => (i.chore ? choreTag(i) : i.list ? toolBtns(null, i) : '') + (i.quest ? `<span class="tag">${i.quest} Doppel-Quest</span>` : '') + (i.from ? `<span class="tag">von ${esc(i.from)}</span>` : '') + (i.back ? `<span class="tag">zurück: ${esc(i.back)}</span>` : '') + (i.urgent ? '<span class="tag hot">bitte heute</span>' : '');
const choreTag = i => { const c = S.chores.find(x => x.id === i.chore); return c ? `<span class="tag">🔁${c.reward ? ' 🎁' : ''}</span>` + toolBtns(c, i) : ''; };
// a chore's helpers as small buttons; a handed-over shopping list travels on the item itself
const toolBtns = (c, i) => (c && c.tools || []).map(t => `<button class="toolbtn" data-a="tool" data-t="${t}" data-c="${c.id}" aria-label="${C.TOOLS[t][1]}">${C.TOOLS[t][0]}</button>`).join('')
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

// ---------- saving ----------
function commit(post = false) {
  checkPromotion();
  S.updatedAt = Date.now();
  D.saveLocal(S);
  D.scheduleBackup(S);
  if (post || S.postedName !== S.name) { S.postedName = S.name; D.schedulePost(postObj()); }
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
    replies: Object.entries(S.answered).filter(([, a]) => Date.now() - a.ts < MONTH).map(([id, a]) => ({ id, ...a })),
  };
}
const RANK = { wartet: 0, ok: 1, nein: 1, erledigt: 2 };
let syncing = false;
async function syncPost() {
  if (syncing || !D.canPost() || !navigator.onLine) return;
  syncing = true;
  try {
    const p = (await D.readPartnerPost()) || { out: [], replies: [] };
    if (p.me && p.me === D.me()) return;              // never treat my own mailbox as the partner's
    let changed = false; const back = [], took = [], done = [];
    if (p.name && p.name !== S.partnerName) { S.partnerName = p.name; changed = true; }
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
    else if (done.length) toast(pn() + ' hat erledigt: ' + done.map(x => x.text).join(', ') + ' 🎉');
    else if (took.length) toast(pn() + ' übernimmt ' + (took.length === 1 ? '„' + took[0].text + '“' : took.length + ' Aufgaben') + ' 💛');
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
const choreRhythm = c => c.week && c.week.length ? 'jeden ' + c.week.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => C.DOW[x]).join(' & ') : c.every === 1 ? 'jeden Tag' : 'alle ' + c.every + ' Tage';
// a changed plan never touches today's page: not there yet → from tomorrow; there but today no longer chosen → off again
function planChanged(c) {
  const on = S.items.find(i => i.chore === c.id && i.where === 'heute');
  if (!on) c.skip = addDays(today(), 1);
  else if (Array.isArray(c.week) && !c.week.includes(parse(today()).getDay())) S.items = S.items.filter(i => i !== on);
}
function scheduleChores() {
  const d = today();
  let added = 0;
  for (const c of S.chores) {
    if (!choreDue(c, d) || S.items.some(i => i.chore === c.id) || S.log.some(e => e.day === d && e.chore === c.id)) continue;
    S.items.push({ id: uid(), text: c.name, where: 'heute', created: Date.now(), chore: c.id });
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
  return o;
}
function closeModal() { const o = $('#ov'); if (o) o.remove(); }

// ---------- header ----------
function renderTop() {
  $('#starsn').textContent = S.stars;
  const rk = C.rankOf(S.earned); $('#rankbtn').innerHTML = emblem(rk.t, 34, ''); $('#rankbtn').title = rk.name + ' · ' + S.earned + ' ⭐ gesammelt';
  $('#top h1').innerHTML = 'Gute Nudel' + (S.name ? ' <span>' + esc(S.name) + '</span>' : '');
  const c = $('#cloud'), st = D.backup.status;
  c.className = st === 'ok' ? 'ok' : st === 'wait' ? 'wait' : st === 'bad' ? 'bad' : '';
  c.title = { ok: 'Gesichert', wait: 'Wird gleich gesichert', bad: 'Sicherung hat nicht geklappt', none: 'Sicherung nicht eingerichtet' }[st] || '';
  document.querySelectorAll('nav#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  $('#tabs [data-tab="heute"]').classList.toggle('dot', S.incoming.length > 0);
}

// ---------- HEUTE ----------
function viewHeute() {
  const d = today(), heute = S.items.filter(i => i.where === 'heute'), done = workToday();
  const liste = S.items.filter(i => i.where === 'liste');
  const capped = done.length >= C.CAP;
  let h = '';

  h += incomingCard() + timerCard() + comboCard(true) + giftCards();
  const lastMon = addDays(monday(d), -7);
  if (!S.weeksSeen.includes(lastMon) && S.log.some(e => weekDays(lastMon).includes(e.day)))
    h += `<button class="card btn soft wide" data-a="story" data-w="${lastMon}" style="text-align:left">✨ <b>Dein Wochenrückblick ist da.</b><br><span class="muted">Schau dir an, was du letzte Woche alles geschafft hast.</span></button>`;

  const finished = S.today.planned && (S.today.closed || (heute.length === 0 && done.length > 0));
  if (finished) {
    h += `<div class="celebrate"><div class="big">Tag geschafft!</div>
      <p>${done.length === 1 ? 'Eine Sache' : done.length + ' Sachen'} erledigt. Für heute ist Schluss – der Rest wartet bis morgen.</p>
      <p class="muted">Und jetzt? Das Schwierigste kommt noch:</p>
      <div class="row"><button class="btn" data-a="go" data-tab="ruhe" data-q="gemuetlich">Gemütlich machen</button><button class="btn soft" data-a="go" data-tab="ruhe" data-q="goenn">Gönn dir was</button></div></div>`;
  } else if (capped) {
    h += `<div class="card warn" style="text-align:center">🌙 Genug für heute! Ab jetzt gibt es nur noch Sterne fürs Entspannen.</div>`;
  }

  h += `<section class="pad"><h2>${esc(longDate(d))}</h2>`;
  const due = heute.filter(i => i.chore);
  if (!S.today.planned && heute.length === due.length && done.length === 0) {
    if (due.length) h += `<p class="sub" style="margin-bottom:4px">🔁 Heute fällig – steht schon drauf:</p>` + due.map(i => `<div class="item"><span class="txt"><span>${esc(i.text)}</span>${tags(i)}</span><button class="mini-btn" data-a="choreskip" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht – morgen wieder">⏭</button></div>`).join('');
    h += `<p class="sub">${S.name ? 'Hallo ' + esc(S.name) + '! ' : ''}Was kommt heute auf deine Seite? 3–5 Sachen reichen völlig – den Rest hebt die Liste für dich auf.</p>`;
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
    h += `<div class="row" style="margin-top:12px">${liste.length ? '<button class="btn soft" data-a="fromlist">Aus der Liste holen</button>' : ''}${heute.length ? '<button class="btn soft" data-a="closeday">Für heute Schluss</button>' : ''}</div>`;
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
function askMood(e) {
  if (!e) return;
  document.querySelectorAll('.moodbar').forEach(b => b.remove());
  const b = document.createElement('div'); b.className = 'moodbar';
  b.innerHTML = `<span>Wie war’s?</span>` + C.MOODS.map((m, i) => `<button data-a="mood" data-id="${e.id}" data-v="${i + 1}" aria-label="${C.MOOD_WORDS[i]}">${m}</button>`).join('');
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 9000);
}
function afterWork(count, post = false) {
  commit(post);
  if (count === C.CAP && !S.today.capShown) {
    S.today.capShown = true; commit();
    modal(`<h2>Genug für heute!</h2><p>Du hast heute <b>${C.CAP} Sachen</b> geschafft. Das ist richtig viel.</p>
      <p>Du kannst weiter abhaken – aber Sterne gibt es heute nur noch fürs <b>Entspannen</b>. 😌</p>
      <div class="row"><button class="btn" data-a="go" data-tab="ruhe" data-q="gemuetlich">Gemütlich machen</button><button class="btn soft" data-a="close">Okay</button></div>`);
    return;
  }
  const heute = S.items.filter(i => i.where === 'heute');
  if (S.today.planned && heute.length === 0 && !S.today.celebrated && ui.tab === 'heute') {
    S.today.celebrated = true; commit(); confetti();
  }
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
  const sent = S.sent.filter(x => x.status !== 'nein' && x.status !== 'weg');
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
const QTABS = [['haushalt', '🪴 Nestpflege'], ['gemuetlich', '🫖 Gemütlich'], ['goenn', '💝 Gönn dir']];
function viewRuhe() {
  if (ui.sub === 'cook') return viewCook();
  if (!QTABS.some(([k]) => k === ui.qtab)) ui.qtab = 'haushalt';
  const h = `<div class="chips qtabs">${QTABS.map(([k, l]) => `<button class="chip ${ui.qtab === k ? 'on' : ''}" data-a="qtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (ui.qtab === 'gemuetlich') return h + viewGemuetlich();
  if (ui.qtab === 'goenn') return h + viewGoenn();
  return h + viewHaushalt();
}
function viewHaushalt() {
  let h = `<div class="sec-title" style="margin-top:6px">Nestpflege – läuft von allein</div>
    <p class="muted" style="margin:0 4px 14px">Was regelmäßig dran ist, kommt von selbst auf deine Seite, wenn es Zeit ist – du musst nicht dran denken. Und wenn du magst, wartet danach am selben Tag etwas Schönes auf dich.</p>`;
  h += giftCards() + timerCard();
  h += `<div class="toolrow"><button class="btn soft" data-a="tool" data-t="list">🛒 Einkaufsliste${S.shop.filter(x => !x.done).length ? ' (' + S.shop.filter(x => !x.done).length + ')' : ''}</button><button class="btn soft" data-a="tool" data-t="recipes">📖 Kochbuch</button><button class="btn soft" data-a="tool" data-t="timer">⏲️ Timer</button></div>`;
  h += weekPlanner();
  h += `<button class="btn wide" data-a="choreedit">+ Etwas Eigenes</button>`;
  const free = C.CHORE_TEMPLATES.filter(t => !S.chores.some(c => c.name === t.name));
  if (free.length) h += `<div class="sec-title">Ideen zum Antippen</div><p class="muted" style="margin:0 4px 10px">Wie oft und was dich danach erwartet, kannst du mit ✎ jederzeit ändern.</p><div class="chips">` +
    free.map(t => `<button class="chip" data-a="choretpl" data-v="${esc(t.name)}">${t.icon} ${esc(t.name)} · ${esc(choreRhythm(t))}</button>`).join('') + '</div>';
  return h;
}
// 📅 Meine Woche: each chore with its days (Mo … So) — tap a day to move it; changes count from tomorrow
function weekPlanner() {
  const tdow = parse(today()).getDay();
  let h = `<div class="sec-title">📅 Meine Woche</div>`;
  if (S.chores.length) {
    const per = d => S.chores.filter(c => c.week && c.week.includes(d));
    h += `<div class="card weekstrip">${C.WEEK_ORDER.map(d => `<div class="${d === tdow ? 'today' : ''}"><b>${C.DOW[d]}</b><span>${per(d).map(c => c.icon).join('') || (d === 0 ? '🛋️' : '·')}</span></div>`).join('')}</div>`;
    h += `<div class="card"><ul class="list-plain chores">${S.chores.map(c => `<li><span class="cw"><span class="cwtop"><b>${esc(c.icon)} ${esc(c.name)}</b><span><button class="mini-btn" data-a="choreedit" data-id="${c.id}" aria-label="Bearbeiten">✎</button><button class="mini-btn" data-a="choredel" data-id="${c.id}" aria-label="Löschen">✕</button></span></span>
      <span class="days">${C.WEEK_ORDER.map(d => `<button class="dayt ${c.week && c.week.includes(d) ? 'on' : ''} ${d === tdow ? 'today' : ''}" data-a="cday" data-id="${c.id}" data-v="${d}">${C.DOW[d]}</button>`).join('')}</span>
      <span class="muted">${c.week && c.week.length ? '' : esc(choreRhythm(c)) + ' · '}${esc(choreWhen(c))}${c.reward ? ' · 🎁 ' + esc(c.reward) : ''}</span>${(c.tools || []).length ? '<span>' + toolBtns(c) + '</span>' : ''}</span></li>`).join('')}</ul>
      <p class="hint">Tipp auf einen Tag legt die Aufgabe dorthin (oder nimmt sie weg). Änderungen gelten ab morgen.</p></div>`;
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
    <div class="stat-row"><button class="stat" data-a="weeklog" data-k="work" data-w="${mon}"><b>${w.work}</b><span>erledigt ›</span></button><button class="stat" data-a="weeklog" data-k="rest" data-w="${mon}"><b>${w.rest}</b><span>entspannt ›</span></button><div class="stat"><b>${w.stars}</b><span>Sterne</span></div></div>
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
    h += `<div class="sec-title">Frühere Wochen</div>` + past.map(s => `<button class="card btn soft wide" data-a="story" data-w="${s.mon}" style="text-align:left;display:flex;justify-content:space-between"><span>${shortDate(s.mon)} – ${shortDate(addDays(s.mon, 6))}</span><span>${s.work} erledigt · ${s.rest} entspannt</span></button>`).join('');
  }
  return h;
}

function weekLogModal() { // this week's done (or rested) entries by day, each removable
  const { k, w } = ui.wl, f = k === 'rest' ? isRest : isWork;
  const days = weekDays(w).filter(d => d <= today()).reverse();
  let h = '';
  for (const d of days) {
    const es = S.log.filter(e => e.day === d && f(e)); if (!es.length) continue;
    h += `<p class="muted" style="font-weight:800;margin:14px 0 4px">${esc(longDate(d))}</p><ul class="list-plain">` +
      es.map(e => `<li><span>${esc(e.text)}${e.mood ? ' ' + C.MOODS[e.mood - 1] : ''}</span>${e.stars > 0 ? `<span class="muted">+${e.stars}⭐</span>` : ''}<button class="mini-btn" data-a="logdel" data-id="${e.id}" aria-label="Entfernen">✕</button></li>`).join('') + '</ul>';
  }
  modal(`<h2>${k === 'rest' ? 'Entspannt' : 'Erledigt'} diese Woche</h2><div style="text-align:left">${h || '<p class="muted">Noch nichts.</p>'}</div><div class="row"><button class="btn" data-a="close">Fertig</button></div>`);
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
  D.markSynced(remote.updatedAt);
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
    if (e.kind === 'task') S.items.unshift({ id: uid(), text: e.text, where: 'heute', created: Date.now(), ...(e.did ? { did: e.did, from: e.from } : {}), ...(e.chore ? { chore: e.chore } : {}) });
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
    S.log.push({ id: uid(), text: picked.length + (picked.length === 1 ? ' Aufgabe' : ' Aufgaben') + ' an ' + pn() + ' abgegeben', kind: 'delegate', day: today(), ts: Date.now(), stars: 1 }); earn(1);
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
  qtab(el) { ui.qtab = el.dataset.v; render(); scrollTo(0, 0); },
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
    ui.ce = c ? { id: c.id, icon: c.icon, name: c.name, mode: c.week && c.week.length ? 'week' : 'days', every: c.every || 7, week: (c.week || []).slice(), reward: c.reward || '', start: 'morgen', tools: (c.tools || []).slice(), music: c.music || '' }
      : { id: null, icon: '🔁', name: '', mode: 'week', every: 7, week: [], reward: '', start: 'morgen', tools: [], music: '' };
    choreModal();
  },
  cemode(el) { ceRead(); ui.ce.mode = el.dataset.v; choreModal(); },
  ceday(el) { ceRead(); const d = +el.dataset.v, w = ui.ce.week; w.includes(d) ? w.splice(w.indexOf(d), 1) : w.push(d); choreModal(); },
  cerew(el) { ceRead(); ui.ce.reward = ui.ce.reward === el.dataset.v ? '' : el.dataset.v; ui.ce.own = false; choreModal(); },
  ceown() { ceRead(); ui.ce.own = true; ui.ce.reward = ''; choreModal(); },
  cestart(el) { ceRead(); ui.ce.start = el.dataset.v; choreModal(); },
  cetool(el) { ceRead(); const t = el.dataset.v, a = ui.ce.tools; a.includes(t) ? a.splice(a.indexOf(t), 1) : a.push(t); choreModal(); },
  cesave() {
    ceRead();
    const e = ui.ce, msg = $('#ce-msg');
    if (!e.name) { msg.textContent = 'Wie heißt die Aufgabe?'; return; }
    if (e.mode === 'week' && !e.week.length) { msg.textContent = 'Mindestens einen Wochentag wählen.'; return; }
    const every = Math.max(1, Math.min(90, Math.round(+e.every) || 7));
    let c = e.id && S.chores.find(x => x.id === e.id);
    if (!c) { c = { id: uid(), icon: '🔁', last: null }; S.chores.push(c); if (e.start === 'morgen') c.skip = addDays(today(), 1); }
    Object.assign(c, { name: e.name, reward: e.reward || null, tools: e.tools.slice(), music: e.music || '', ...(e.mode === 'week' ? { week: e.week.slice(), every: undefined } : { every, week: undefined }) });
    S.items.filter(i => i.chore === c.id).forEach(i => { i.text = c.name; });
    if (!choreDue(c, today())) S.items = S.items.filter(i => !(i.chore === c.id && i.where === 'heute'));
    scheduleChores(); closeModal(); commit(); toast('Gespeichert 🔁');
  },
  cookback() { ui.sub = null; ui.qtab = 'haushalt'; render(); scrollTo(0, 0); },
  cookhome() { endCookMode(); ui.rid = null; ui.sides = []; render(); scrollTo(0, 0); },
  cookreroll() { ui.sugSeed = (ui.sugSeed || 1) + 1; render(); },
  ccat(el) { ui.ccat = el.dataset.v; render(); },
  recipe(el) { ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; render(); scrollTo(0, 0); },
  side(el) { const id = el.dataset.id, a = ui.sides || (ui.sides = []); a.includes(id) ? a.splice(a.indexOf(id), 1) : a.push(id); render(); },
  cookshop2() {
    const r = recipeById(ui.rid), sides = sidesOf(), have = new Set(S.shop.filter(x => !x.done).map(x => x.text.toLowerCase().replace(/ \(.*\)$/, '')));
    const add = r.ing.concat(...sides.map(s => s.ing)).filter(([, t]) => t && !have.has(t.toLowerCase()));
    add.forEach(([q, t]) => S.shop.push({ id: uid(), text: q ? t + ' (' + q + ')' : t, done: false, from: r.title }));
    commit(); shopModal();   // the list right away, as a pop-over
    toast(add.length ? add.length + ' Sachen dazugekommen 🛒' : 'Steht schon alles drauf 🛒');
  },
  cookstart() { ui.cstep = 0; render(); scrollTo(0, 0); },
  cnext() { ui.cstep++; render(); },
  cprev() { ui.cstep = Math.max(0, ui.cstep - 1); render(); },
  cookstop() { endCookMode(); render(); },
  cooktimer() { const r = recipeById(ui.rid), [t, m] = cookSteps(r, sidesOf())[ui.cstep]; startTimer(r.icon, r.title, m); render(); },
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
    if (t === 'timer') return timerModal();
    if (t === 'list') return shopModal();
    if (t === 'recipes') { closeModal(); ui.tab = 'ruhe'; ui.sub = 'cook'; ui.rid = null; ui.cstep = null; render(); scrollTo(0, 0); return; }
    if (t === 'music') {
      if (c && c.music) { window.open(c.music, '_blank', 'noopener'); return; }
      ui.ce = null; if (c) A.choreedit({ dataset: { id: c.id } });
      toast('Füg hier den Link zu deiner Playlist ein 🎵');
    }
  },
  timerset(el) { startTimer(el.dataset.i, el.dataset.l, +el.dataset.m); },
  timerown() { const m = Math.round(+($('#tm-min').value || 0)); if (m > 0) startTimer('⏲️', 'Timer', Math.min(600, m)); },
  timerstop(el) { S.timers = S.timers.filter(t => t.id !== el.dataset.id); closeModal(); commit(); runTimers(); },
  shoptick(el) {
    const it = el.dataset.item && S.items.find(i => i.id === el.dataset.item), L = it ? it.list : S.shop, x = L.find(y => y.id === el.dataset.id); if (!x) return;
    x.done = !x.done; commit(); shopModal(it, true);
  },
  shopdel(el) {
    const it = el.dataset.item && S.items.find(i => i.id === el.dataset.item);
    if (it) it.list = it.list.filter(y => y.id !== el.dataset.id); else S.shop = S.shop.filter(y => y.id !== el.dataset.id);
    commit(); shopModal(it, true);
  },
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
  weeklog(el) { ui.wl = { k: el.dataset.k, w: el.dataset.w }; weekLogModal(); },
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
  storyclose() { const s = $('#story'); if (s) s.remove(); render(); },
  settings, settingsclose() {
    const n = $('#s-name'), k = $('#s-nick');
    if (n && n.value.trim() !== S.name) S.name = n.value.trim();
    if (k && k.value.trim() !== pn()) S.partnerNick = k.value.trim();   // empty = use the name they chose
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

// ---------- helpers: timer, shopping list, cookbook, music ----------
const fmtLeft = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
function timerCard() {
  if (!S.timers.length) return '';
  return `<div class="card timers">${S.timers.map(t => { const left = t.end - Date.now(); return `<div class="timer ${left <= 0 ? 'done' : ''}"><span class="ti">${t.icon}</span><span class="tl"><b>${esc(t.label)}</b><br><span class="tleft" data-end="${t.end}">${left > 0 ? fmtLeft(left) : 'fertig!'}</span></span><button class="mini-btn" data-a="timerstop" data-id="${t.id}" aria-label="${left > 0 ? 'Abbrechen' : 'Erledigt'}">${left > 0 ? '✕' : '✓'}</button></div>`; }).join('')}</div>`;
}
let timerTick = null, rang = new Set();
function runTimers() { // the countdown on screen, and the alarm when one is done (only while the app is open)
  clearInterval(timerTick);
  if (!S.timers.length) return;
  timerTick = setInterval(() => {
    document.querySelectorAll('.tleft[data-end]').forEach(el => { const l = +el.dataset.end - Date.now(); el.textContent = l > 0 ? fmtLeft(l) : 'fertig!'; });
    S.timers.filter(t => t.end <= Date.now() && !rang.has(t.id)).forEach(t => { rang.add(t.id); timerAlarm(t, false); });
  }, 1000);
}
function timerAlarm(t, late) {
  try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate([400, 200, 400, 200, 800]); } catch (e) {}
  try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(d => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.25, a.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + d + .3); o.start(a.currentTime + d); o.stop(a.currentTime + d + .3); }); } catch (e) {}
  modal(`<h2>${t.icon} ${esc(t.label)} ist fertig!</h2>${late ? `<p class="muted">schon seit ${Math.max(1, Math.round((Date.now() - t.end) / 60000))} Min.</p>` : ''}<div class="row"><button class="btn" data-a="timerstop" data-id="${t.id}">Okay</button></div>`);
  render();
}
function timerModal() {
  const android = /Android/i.test(navigator.userAgent);
  modal(`<div style="text-align:left"><h2 style="text-align:center">⏲️ Timer</h2>
    ${C.TIMERS.map(([ic, l, mins]) => `<p class="muted" style="font-weight:800;margin:12px 0 4px">${ic} ${l}</p><div class="chips">${mins.map(m => `<button class="chip" data-a="timerset" data-l="${l}" data-i="${ic}" data-m="${m}">${m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ' h' : m + ' Min.'}</button>`).join('')}</div>`).join('')}
    <label class="field"><span>Eigener Timer (Minuten)</span><input id="tm-min" type="number" min="1" max="600" inputmode="numeric" placeholder="z.B. 75"></label>
    <div class="row"><button class="btn soft" data-a="timerown">Starten</button></div>
    ${android ? `<label class="field" style="display:flex;gap:8px;align-items:center"><input id="tm-phone" type="checkbox" style="width:auto" ${ui.phoneAlarm ? 'checked' : ''}><span style="margin:0">⏰ Auch den Handy-Timer stellen (Test: klingt auch, wenn die App zu ist)</span></label>` : ''}
    <p class="hint">Die App klingelt, solange sie offen ist. Ist sie zu, sagt sie dir beim nächsten Öffnen, seit wann die Maschine fertig ist.</p>
    <div class="row"><button class="btn" data-a="close">Fertig</button></div></div>`);
}
function startTimer(icon, label, mins) {
  const t = { id: uid(), icon, label, end: Date.now() + mins * 60000 };
  S.timers.push(t); commit(); runTimers();
  const ph = $('#tm-phone'); ui.phoneAlarm = !!(ph && ph.checked);
  closeModal(); toast(icon + ' ' + label + ': ' + mins + ' Min.');
  if (ui.phoneAlarm) { // Android's own clock app takes the timer (nothing leaves the phone); may not work on every phone
    try { location.href = 'intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=' + mins * 60 + ';S.android.intent.extra.alarm.MESSAGE=' + encodeURIComponent(label + ' fertig') + ';b.android.intent.extra.alarm.SKIP_UI=true;end'; } catch (e) {}
  }
}
function shopModal(item, keep) { // her list — or a handed-over one (item.list) on the partner's phone; keep = update in place
  const L = item ? item.list : S.shop, open = L.filter(x => !x.done), done = L.filter(x => x.done), di = item ? ` data-item="${item.id}"` : '';
  modal(`<div style="text-align:left"><h2 style="text-align:center">🛒 ${item ? esc(item.text) : 'Einkaufsliste'}</h2>
    ${item ? `<p class="muted">von ${esc(item.from || '')}</p>` : ''}
    <div class="steps">${open.concat(done).map(x => `<div class="shoprow"><button class="pick ${x.done ? 'on' : ''}" data-a="shoptick" data-id="${x.id}"${di}><span class="box">${x.done ? '✓' : ''}</span><span style="${x.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(x.text)}${x.from ? `<span class="tag">${esc(x.from)}</span>` : ''}</span></button><button class="mini-btn" data-a="shopdel" data-id="${x.id}"${di} aria-label="Entfernen">✕</button></div>`).join('') || '<p class="muted">Noch leer.</p>'}</div>
    ${item ? '' : `<form class="add" data-f="shopadd"><input name="t" placeholder="Was fehlt? (Komma = mehrere)" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`}
    <div class="row">${done.length && !item ? '<button class="btn soft" data-a="shopclear">Erledigte löschen</button>' : ''}<button class="btn" data-a="close">Fertig</button></div></div>`, '', keep);
}
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
const recipeById = id => K.RECIPES.find(r => r.id === id);
// how much she'd want it: her favourites and what she rated well count more (and their kind), what she just had less,
// and what she didn't like never comes up again
function cookWeight(r) {
  const c = S.cook[r.id] || {};
  if (c.taste === 1) return 0;
  const liked = new Set(K.RECIPES.filter(x => (S.cook[x.id] || {}).taste === 3 || (x.fav && (S.cook[x.id] || {}).taste !== 1)).flatMap(x => x.tags));
  let w = 1 + (r.fav ? 1.5 : 0) + (c.taste === 3 ? 2.5 : c.taste === 2 ? 0.7 : 0) + 0.25 * r.tags.filter(t => liked.has(t)).length;
  if (c.last && daysBetween(c.last, today()) < 5) w *= 0.15;
  return w;
}
function cookSuggest(n) { // weighted, no repeats; ui.sugSeed changes with "andere Vorschläge"
  let seed = (ui.sugSeed || 1) * 9973 + dayIndex();
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let pool = K.RECIPES.filter(r => r.cat === 'haupt').map(r => [r, cookWeight(r)]).filter(([, w]) => w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    let x = rand() * pool.reduce((a, [, w]) => a + w, 0);
    const i = pool.findIndex(([, w]) => (x -= w) < 0);
    out.push(pool[i < 0 ? 0 : i][0]); pool.splice(i < 0 ? 0 : i, 1);
  }
  return out;
}
const sidesOf = () => (ui.sides || []).map(id => K.SIDES.find(s => s.id === id)).filter(Boolean);
function plateHtml(r, sides) {
  if (!r.plate) return '';
  return '<span class="plate">' + Object.entries(K.PLATE).map(([k, [ic, l]]) => { const on = r.plate[k] || sides.some(s => s.g === k); return `<span class="pb ${on ? 'on' : ''}" title="${l}">${ic}</span>`; }).join('') + '</span>';
}
const tasteOf = r => { const c = S.cook[r.id]; return c && c.taste ? K.TASTE.find(t => t[2] === c.taste)[0] : ''; };
const recipeRow = r => `<button class="card recipe-row" data-a="recipe" data-id="${r.id}"><span class="ri">${r.icon}</span><span class="rt"><b>${esc(r.title)}</b><br><span class="muted">⏱ ${r.min} Min.${r.fav ? ' · 💛 mag sie' : ''} ${tasteOf(r)}</span></span>${plateHtml(r, [])}</button>`;
function viewCook() {
  if (ui.rid && ui.cstep != null) return viewCookMode();
  if (ui.rid) return viewRecipe();
  let h = `<button class="btn soft" data-a="cookback" style="margin:4px 0 12px">← Nestpflege</button><div class="sec-title" style="margin-top:0">📖 Kochbuch</div>`;
  h += `<div class="card"><h3>Was koch ich heute?</h3><p class="muted" style="margin-top:0">Ausgesucht nach dem, was dir schmeckt.</p>` +
    cookSuggest(3).map(r => `<button class="pick" data-a="recipe" data-id="${r.id}"><span style="font-size:24px">${r.icon}</span><span>${esc(r.title)}<br><span class="muted">⏱ ${r.min} Min. ${tasteOf(r)}</span></span></button>`).join('') +
    `<button class="btn soft wide" data-a="cookreroll" style="margin-top:10px">🎲 Andere Vorschläge</button></div>`;
  const cats = K.CATS.concat([['fav', '💛 Lieblinge']]), cat = ui.ccat || 'haupt';
  h += `<div class="chips">${cats.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-a="ccat" data-v="${k}">${l}</button>`).join('')}</div>`;
  const list = cat === 'fav' ? K.RECIPES.filter(r => (S.cook[r.id] || {}).taste === 3 || (r.fav && (S.cook[r.id] || {}).taste !== 1)) : K.RECIPES.filter(r => r.cat === cat);
  h += list.map(recipeRow).join('') || '<p class="muted">Noch nichts hier.</p>';
  if (cat === 'haupt') h += `<p class="hint">${Object.values(K.PLATE).map(([i, l]) => i + ' ' + l).join(' · ')} – fehlt etwas auf dem Teller, schlägt dir das Rezept was dazu vor.</p>`;
  return h;
}
function viewRecipe() {
  const r = recipeById(ui.rid); if (!r) { ui.rid = null; return viewCook(); }
  const sides = sidesOf(), c = S.cook[r.id];
  let h = `<button class="btn soft" data-a="cookhome" style="margin:4px 0 12px">← Kochbuch</button>`;
  h += `<div class="card"><div style="font-size:44px;line-height:1">${r.icon}</div><h2 class="hand" style="font-size:34px;margin:6px 0">${esc(r.title)}</h2>
    <p class="muted" style="margin:0">⏱ ${r.min} Min. · für 2 · ganz einfach${r.fav ? ' · 💛 mag sie' : ''}${c ? ' · ' + c.n + '× gekocht ' + tasteOf(r) : ''}</p>${r.note ? `<p>${esc(r.note)}</p>` : ''}</div>`;
  if (r.plate) {
    const missing = Object.keys(K.PLATE).filter(k => !r.plate[k] && !sides.some(s => s.g === k));
    const want = Object.keys(K.PLATE).filter(k => !r.plate[k]);
    h += `<div class="card platecheck"><h3>Teller-Check ${plateHtml(r, sides)}</h3>` +
      (missing.length ? `<p style="margin:4px 0 8px">Da fehlt noch <b>${missing.map(k => K.PLATE[k][1]).join(' & ')}</b> – nimm was dazu:</p>` : `<p style="margin:4px 0 8px">✓ Alles drauf: satt, Eiweiß und Gemüse.</p>`) +
      want.map(k => { const hint = K.SIDE_HINTS[r.id] || [], opts = K.SIDES.filter(s => s.g === k).sort((a, b) => (hint.includes(b.id) ? 1 : 0) - (hint.includes(a.id) ? 1 : 0)).slice(0, 4);
        return `<div class="chips">${opts.map(s => `<button class="chip ${(ui.sides || []).includes(s.id) ? 'on' : ''}" data-a="side" data-id="${s.id}">${K.PLATE[k][0]} ${esc(s.title)}</button>`).join('')}</div>`; }).join('') + '</div>';
  }
  const ing = r.ing.concat(...sides.map(s => s.ing.map(x => [x[0], x[1], s.title])));
  h += `<div class="card"><h3>Zutaten</h3><ul class="list-plain">${ing.map(([q, t, from]) => `<li><span>${esc(t)}${from ? ` <span class="tag">${esc(from)}</span>` : ''}</span><span class="muted">${esc(q)}</span></li>`).join('')}</ul>
    <div class="row"><button class="btn soft" data-a="cookshop2">🛒 Auf die Einkaufsliste</button></div></div>`;
  h += `<div class="card"><h3>So geht’s</h3><ol class="steps-ol">${cookSteps(r, sides).map(([t, m]) => `<li>${esc(t)}${m ? ` <span class="muted">⏲️ ${m} Min.</span>` : ''}</li>`).join('')}</ol>
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
    ${m ? `<button class="btn blue wide" data-a="cooktimer">⏲️ Timer: ${m} Min.</button>` : ''}
    <div class="row" style="margin-top:18px">${i ? '<button class="btn soft" data-a="cprev">← Zurück</button>' : '<button class="btn soft" data-a="cookstop">Abbrechen</button>'}${last ? '<button class="btn green" data-a="cookdone">Fertig gekocht! 🎉</button>' : '<button class="btn" data-a="cnext">Weiter →</button>'}</div></div>`;
}
function endCookMode() { if (wake) { wake.release().catch(() => {}); wake = null; } ui.cstep = null; }

// the chore editor (a modal that keeps what's typed when a chip is tapped)
function ceRead() {
  const n = $('#ce-name'), ev = $('#ce-every'), r = $('#ce-own');
  if (n) ui.ce.name = n.value.trim();
  if (ev) ui.ce.every = ev.value;
  if (r && ui.ce.own) ui.ce.reward = r.value.trim();
  const m = $('#ce-music'); if (m) ui.ce.music = m.value.trim();
}
function choreModal() {
  const e = ui.ce;
  const opts = C.CHORE_REWARDS.concat(S.wishes.map(w => w.text)).filter((x, i, a) => a.indexOf(x) === i);
  modal(`<div style="text-align:left"><h2 style="text-align:center">${e.id ? 'Aufgabe ändern' : 'Neue Aufgabe'}</h2>
    <label class="field"><span>Was ist dran?</span><input id="ce-name" value="${esc(e.name)}" placeholder="z.B. Wäsche waschen" autocomplete="off"></label>
    <p class="muted" style="font-weight:800;margin:12px 0 4px">Wie oft?</p>
    <div class="chips"><button class="chip ${e.mode === 'days' ? 'on' : ''}" data-a="cemode" data-v="days">Alle paar Tage</button><button class="chip ${e.mode === 'week' ? 'on' : ''}" data-a="cemode" data-v="week">An Wochentagen</button></div>
    ${e.mode === 'days' ? `<label class="field"><span>Alle wie viele Tage?</span><input id="ce-every" type="number" min="1" max="90" inputmode="numeric" value="${esc(e.every)}"></label>`
      : `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${e.week.includes(d) ? 'on' : ''}" data-a="ceday" data-v="${d}">${C.DOW[d]}</button>`).join('')}</div>`}
    ${e.id ? '' : `<p class="muted" style="font-weight:800;margin:12px 0 4px">Ab wann?</p><div class="chips"><button class="chip ${e.start === 'heute' ? 'on' : ''}" data-a="cestart" data-v="heute">Ab heute</button><button class="chip ${e.start === 'morgen' ? 'on' : ''}" data-a="cestart" data-v="morgen">Ab morgen</button></div>`}
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

const FORMS = {
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

// ---------- render ----------
const VIEWS = { heute: viewHeute, liste: viewListe, ruhe: viewRuhe, schaetze: viewSchaetze, woche: viewWoche };
function render() {
  const focused = document.activeElement && document.activeElement.closest('form[data-f]');
  const refocus = focused && focused.dataset.f;
  $('#main').innerHTML = VIEWS[ui.tab]();
  renderTop();
  if (refocus) { const i = document.querySelector(`form[data-f="${refocus}"] input`); if (i) i.focus(); }
  if (ui.tab === 'schaetze') {
    hydratePhotos($('#main'));
    if (!ui.sub && S.book.pages) D.photoURL(1).then(u => { const t = $('#bookthumb'); if (u && t) t.innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`; });
  }
}

function bind() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const f = A[el.dataset.a]; if (f) { e.preventDefault(); f(el, e); }
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-f]'); if (!form) return;
    e.preventDefault();
    const inp = form.querySelector('input'), t = inp.value.trim(); if (!t) return;
    inp.value = ''; FORMS[form.dataset.f](t, form);
  });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ui.tab = b.dataset.tab; ui.sub = null; render(); scrollTo(0, 0); });
  $('#cloud').addEventListener('click', settings);
  $('#stars').addEventListener('click', A.stars);
  $('#rankbtn').addEventListener('click', rankModal);
  D.backup.listeners.add(renderTop);
  addEventListener('online', () => { syncDevices().then(() => D.flushBackup()); D.flushPost(); syncPost(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncDevices(); }, 60000);
  setInterval(() => { if (document.visibilityState === 'visible') syncPost(); }, 90000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') D.flushBackup();
    else { if (rollover()) commit(); syncPost(); syncDevices(); }
  });
  setInterval(() => { if (rollover()) commit(); }, 60000);
}

function welcome() {
  modal(`<h2>Hallo, gute Nudel! 💛</h2>
    <p style="text-align:left">📝 <b>Heute</b>: Such dir morgens ein paar Sachen aus. Wenn sie erledigt sind, ist der Tag geschafft – wirklich.</p>
    <p style="text-align:left">⭐ Für jede erledigte Sache gibt es einen <b>gute Nudel Stern</b>. Ab ${C.CAP} am Tag heißt es: genug für heute!</p>
    <p style="text-align:left">🏠 <b>Daheim</b>: Was zuhause regelmäßig dran ist, kommt von allein – und Gemütliches und kleine Belohnungen findest du da auch.</p>
    <p style="text-align:left">🎁 Bei <b>Schätze</b> wartet ein geheimes Fotobuch – und eine Pflanze, die mit dir wächst.</p>
    <label class="field"><span>Wie soll ich dich nennen? (optional)</span><input id="w-name" placeholder="Dein Name"></label>
    <div class="row"><button class="btn" data-a="welcomego">Los geht's</button></div>`);
}
A.welcomego = () => { const n = $('#w-name').value.trim(); S.name = n; S.welcomed = true; closeModal(); commit(); D.askPersistent(); };

// ---------- several devices of one person: merge two versions of the same save ----------
function mergeStates(local, remote) {
  const newer = (remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local, older = newer === remote ? local : remote;
  const m = Object.assign(D.freshState(), newer, { me: D.me() });
  // the log: everything from both (stars of entries only the older one has are added)
  const ids = new Set((newer.log || []).map(e => e.id)), extra = (older.log || []).filter(e => !ids.has(e.id));
  m.log = (newer.log || []).concat(extra).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  m.stars = Math.max(0, (newer.stars || 0) + extra.reduce((a, e) => a + (e.stars || 0), 0));
  m.earned = (newer.earned || 0) + extra.reduce((a, e) => a + Math.max(0, e.stars || 0), 0);
  // lists: joined by id, the newer version of an entry wins
  const join = (a = [], b = []) => { const seen = new Set(a.map(x => x.id)); return a.concat(b.filter(x => x && !seen.has(x.id))); };
  ['items', 'chores', 'shop', 'wishes', 'sent', 'gifts', 'timers'].forEach(k => { m[k] = join(newer[k], older[k]); });
  m.recipes = newer.recipes || older.recipes;
  m.fixes = [...new Set([].concat(newer.fixes || [], older.fixes || []))];
  m.favs = [...new Set([].concat(newer.favs || [], older.favs || []))];
  m.cook = Object.assign({}, older.cook || {}, newer.cook || {});
  m.answered = Object.assign({}, older.answered || {}, newer.answered || {});
  m.book = { pages: Math.max((newer.book || {}).pages || 0, (older.book || {}).pages || 0) };
  m.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0) + 1;
  return m;
}
function takeRemote(remote, adopt) {
  S = adopt ? Object.assign(D.freshState(), remote, { me: D.me() }) : mergeStates(S, remote);
  D.saveLocal(S);
  rollover(); scheduleChores(); runTimers(); render();
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
  runTimers();
  S.timers.filter(t => t.end <= Date.now()).forEach(t => { rang.add(t.id); setTimeout(() => timerAlarm(t, true), 600); });
}
start();
window.__gn = { rankOf: C.rankOf, mergeStates, syncDevices, get S() { return S; }, ui, render, commit, D, rollover, syncPost, scheduleChores };
