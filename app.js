import * as C from './content.js';
import * as D from './data.js';
import { plantSVG } from './plant.js';

let S = null;                                   // the state (see data.js freshState)
const ui = { tab: 'heute', sub: null, picks: new Set(), showAllQuests: false, rsize: 'klein', ridea: null, openPrep: null };
const $ = s => document.querySelector(s);
const tags = i => (i.from ? `<span class="tag">von ${esc(i.from)}</span>` : '') + (i.back ? `<span class="tag">zurück: ${esc(i.back)}</span>` : '') + (i.urgent ? '<span class="tag hot">bitte heute</span>' : '');
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
  S.updatedAt = Date.now();
  D.saveLocal(S);
  D.scheduleBackup(S);
  if (post || S.postedName !== S.name) { S.postedName = S.name; D.schedulePost(postObj()); }
  render();
}

// ---------- handing tasks to the partner ----------
const pn = () => S.partnerName || 'Partner';
const MONTH = 30 * 864e5;
function postObj() { // what the partner reads: my handed-over tasks and my answers to theirs
  return {
    name: S.name, ts: Date.now(),
    out: S.sent.filter(x => Date.now() - x.ts < MONTH).map(({ id, text, today, ts }) => ({ id, text, today, ts })),
    replies: Object.entries(S.answered).filter(([, a]) => Date.now() - a.ts < MONTH).map(([id, a]) => ({ id, ...a })),
  };
}
const RANK = { wartet: 0, ok: 1, nein: 1, erledigt: 2 };
let syncing = false;
async function syncPost() {
  if (syncing || !D.canPost() || !navigator.onLine) return;
  syncing = true;
  try {
    const p = await D.readPartnerPost(); if (!p) return;
    let changed = false; const back = [], took = [], done = [];
    if (p.name && p.name !== S.partnerName) { S.partnerName = p.name; changed = true; }
    const inc = (p.out || []).filter(x => !S.answered[x.id]);
    if (inc.map(x => x.id).join() !== S.incoming.map(x => x.id).join()) { S.incoming = inc; changed = true; }
    for (const r of p.replies || []) {
      const x = S.sent.find(y => y.id === r.id);
      if (!x || RANK[r.status] <= RANK[x.status]) continue;
      x.status = r.status; x.reason = r.reason || ''; changed = true;
      if (r.status === 'nein') { S.items.unshift({ id: uid(), text: x.text, where: 'liste', created: Date.now(), back: x.reason }); back.push(x); }
      else if (r.status === 'ok') took.push(x); else done.push(x);
    }
    const before = S.sent.length;
    S.sent = S.sent.filter(x => x.status === 'wartet' || x.status === 'ok' || Date.now() - x.ts < 14 * 864e5);
    if (S.sent.length !== before) changed = true;
    if (changed) commit();
    if (back.length) modal(`<h2>Kommt zurück</h2><p>${esc(pn())} kann das gerade nicht übernehmen:</p><div style="text-align:left">${back.map(x => `<p><b>${esc(x.text)}</b><br><span class="muted">„${esc(x.reason)}“</span></p>`).join('')}</div><p class="muted">${back.length > 1 ? 'Die Aufgaben sind' : 'Die Aufgabe ist'} wieder auf deiner Liste.</p><div class="row"><button class="btn" data-a="close">Okay</button></div>`);
    else if (done.length) toast(pn() + ' hat erledigt: ' + done.map(x => x.text).join(', ') + ' 🎉');
    else if (took.length) toast(pn() + ' übernimmt ' + (took.length === 1 ? '„' + took[0].text + '“' : took.length + ' Aufgaben') + ' 💛');
  } catch (e) { console.warn('post', e); }
  finally { syncing = false; }
}
function answerDone(item) { if (item.did) { S.answered[item.did] = { status: 'erledigt', ts: Date.now() }; return true; } return false; }
function earn(n) { S.stars += n; S.earned += n; }

function rollover() {
  const d = today();
  if (S.today.day === d) return false;
  if (S.today.day) { // yesterday's leftovers go back to the top of the list, marked "von gestern"
    S.items.forEach(i => { i.carried = false; });
    const left = S.items.filter(i => i.where === 'heute');
    left.forEach(i => { i.where = 'liste'; i.carried = true; });
    S.items = [...left, ...S.items.filter(i => !left.includes(i))];
  }
  S.today = { day: d, planned: false, capShown: false, closed: false, celebrated: false };
  S.quest = null;
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
function modal(html, cls = '') {
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

  h += incomingCard();
  const lastMon = addDays(monday(d), -7);
  if (!S.weeksSeen.includes(lastMon) && S.log.some(e => weekDays(lastMon).includes(e.day)))
    h += `<button class="card btn soft wide" data-a="story" data-w="${lastMon}" style="text-align:left">✨ <b>Dein Wochenrückblick ist da.</b><br><span class="muted">Schau dir an, was du letzte Woche alles geschafft hast.</span></button>`;

  const finished = S.today.planned && (S.today.closed || (heute.length === 0 && done.length > 0));
  if (finished) {
    h += `<div class="celebrate"><div class="big">Tag geschafft!</div>
      <p>${done.length === 1 ? 'Eine Sache' : done.length + ' Sachen'} erledigt. Für heute ist Schluss – der Rest wartet bis morgen.</p>
      <p class="muted">Und jetzt? Das Schwierigste kommt noch:</p>
      <div class="row"><button class="btn" data-a="go" data-tab="ruhe">Gemütlich machen</button><button class="btn soft" data-a="go" data-tab="schaetze" data-to="reward">Belohnung aussuchen</button></div></div>`;
  } else if (capped) {
    h += `<div class="card warn" style="text-align:center">🌙 Genug für heute! Ab jetzt gibt es nur noch Sterne fürs Entspannen.</div>`;
  }

  h += `<section class="pad"><h2>${esc(longDate(d))}</h2>`;
  if (!S.today.planned && heute.length === 0 && done.length === 0) {
    h += `<p class="sub">${S.name ? 'Hallo ' + esc(S.name) + '! ' : ''}Was kommt heute auf deine Seite? 3–5 Sachen reichen völlig – den Rest hebt die Liste für dich auf.</p>`;
    if (liste.length) {
      h += liste.map(i => `<button class="pick ${ui.picks.has(i.id) ? 'on' : ''}" data-a="pickday" data-id="${i.id}"><span class="box">${ui.picks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}${i.carried ? '<span class="tag">von gestern</span>' : ''}${tags(i)}</span></button>`).join('');
    }
    h += `<form class="add" data-f="addplan"><input name="t" placeholder="Etwas Neues für heute…" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
    h += `<div class="row" style="margin-top:14px"><button class="btn green" data-a="plandone">${ui.picks.size ? 'Los geht\'s (' + ui.picks.size + ')' : 'Los geht\'s'}</button></div>`;
    h += `<p class="hint">Du kannst später jederzeit noch etwas dazuholen.</p></section>`;
    return h;
  }

  if (heute.length === 0 && done.length === 0) h += `<p class="sub">Nichts geplant. Genieß es – oder hol dir etwas aus der Liste.</p>`;
  h += heute.map(i => `<div class="item" data-id="${i.id}"><button class="chk" data-a="tick" data-id="${i.id}" aria-label="Erledigt"></button><div class="txt ${i.carried ? 'carried' : ''}"><span>${esc(i.text)}</span>${tags(i)}</div><button class="mini-btn" data-a="later" data-id="${i.id}" aria-label="Zurück auf die Liste" title="Zurück auf die Liste">↩</button></div>`).join('');
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

function incomingCard() {
  if (!S.incoming.length) return '';
  return `<div class="card incoming"><h3>🤝 ${esc(pn())} bittet dich um Hilfe</h3>` + S.incoming.map(x => `<div class="inc">
      <div class="inc-t"><b>${esc(x.text)}</b>${x.today ? '<span class="tag hot">bitte heute</span>' : ''}</div>
      ${ui.declining === x.id
        ? `<form class="add" data-f="decline" data-id="${x.id}"><input name="t" placeholder="Warum? z.B. schaff ich nicht wegen Terminen" autocomplete="off" enterkeyhint="send"><button class="btn" aria-label="Absenden">➤</button></form><button class="btn soft wide" data-a="declinecancel" style="margin-top:6px">Doch nicht</button>`
        : `<div class="row"><button class="btn green" data-a="accept" data-id="${x.id}">Übernehmen</button><button class="btn soft" data-a="declinestart" data-id="${x.id}">Geht nicht</button></div>`}
    </div>`).join('') + '</div>';
}

function tick(id, el) {
  const it = S.items.find(i => i.id === id); if (!it) return;
  const row = el.closest('.item');
  row.classList.add('done', 'ticking', 'leaving');
  const n = workToday().length, stars = n < C.CAP ? 1 : 0;
  floatStar(el, stars ? '+1 ⭐' : '✓');
  setTimeout(() => {
    S.items = S.items.filter(i => i !== it);
    S.log.push({ id: uid(), text: it.text, kind: 'task', day: today(), ts: Date.now(), stars, ...(it.did ? { did: it.did, from: it.from } : {}) });
    earn(stars);
    afterWork(n + 1, answerDone(it));
  }, 650);
}
function afterWork(count, post = false) {
  commit(post);
  if (count === C.CAP && !S.today.capShown) {
    S.today.capShown = true; commit();
    modal(`<h2>Genug für heute!</h2><p>Du hast heute <b>${C.CAP} Sachen</b> geschafft. Das ist richtig viel.</p>
      <p>Du kannst weiter abhaken – aber Sterne gibt es heute nur noch fürs <b>Entspannen</b>. 😌</p>
      <div class="row"><button class="btn" data-a="go" data-tab="ruhe">Zum Entspannen</button><button class="btn soft" data-a="close">Okay</button></div>`);
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
  const sent = S.sent.filter(x => x.status !== 'nein');
  if (sent.length) {
    const lbl = { wartet: 'wartet auf Antwort', ok: 'übernommen 💛', erledigt: 'erledigt 🎉' };
    h += `<div class="card"><h3>🤝 Abgegeben an ${esc(pn())}</h3><ul class="list-plain">${sent.slice().reverse().map(x => `<li><span>${esc(x.text)}${x.today ? ' <span class="tag hot">heute</span>' : ''}</span><span class="st st-${x.status}">${lbl[x.status]}</span></li>`).join('')}</ul></div>`;
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
function viewRuhe() {
  let h = `<div class="sec-title" style="margin-top:6px">Entspannen – die schwerste Disziplin</div>
    <p class="muted" style="margin:0 4px 14px">Jede überlebte Quest bringt ${C.REST_STARS} Sterne. Auch wenn du heute schon genug geschafft hast.</p>`;
  const active = C.QUESTS.find(q => q.id === S.quest);
  if (active) h += questCard(active, true);
  const start = dayIndex() % C.QUESTS.length;
  const list = ui.showAllQuests ? C.QUESTS : [0, 1, 2].map(i => C.QUESTS[(start + i * 5) % C.QUESTS.length]);
  h += list.filter(q => q !== active).map(q => questCard(q, false)).join('');
  h += `<button class="btn soft wide" data-a="allquests">${ui.showAllQuests ? 'Weniger anzeigen' : 'Alle ' + C.QUESTS.length + ' Quests anzeigen'}</button>`;

  h += `<div class="sec-title">Gemütlichkeits-Rezepte</div><p class="muted" style="margin:0 4px 12px">Du musst dir nichts ausdenken – such dir eins aus. Jeder Schritt zählt schon: +1 ⭐, und am Ende +2 fürs Genießen.</p>`;
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

  h += `<div class="sec-title">Vorbereiten – für Tage mit Energie</div><p class="muted" style="margin:0 4px 12px">Einmal vorbereiten, dann kostet Gemütlichkeit später fast nichts mehr. Jeder Schritt +1 ⭐.</p>`;
  for (const p of C.PREPS) {
    const st = S.preps[p.id] || [], n = st.filter(Boolean).length, full = n === p.steps.length;
    const open = ui.openPrep === p.id;
    h += `<div class="card"><h3>${p.icon} ${esc(p.title)}${full ? '<span class="ready">fertig</span>' : ''}</h3><p class="muted">${esc(p.text)}</p>`;
    h += `<div class="bar"><i style="width:${n / p.steps.length * 100}%"></i></div>`;
    if (open) h += '<div class="steps">' + p.steps.map((s, i) => `<button class="pick ${st[i] ? 'on' : ''}" data-a="prepstep" data-id="${p.id}" data-i="${i}"><span class="box">${st[i] ? '✓' : ''}</span><span>${esc(s)}</span></button>`).join('') + '</div>';
    h += `<button class="btn soft wide" data-a="prepopen" data-id="${p.id}">${open ? 'Zuklappen' : full ? 'Ansehen' : n ? 'Weitermachen' : 'Anfangen'}</button></div>`;
  }

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

  h += `<div class="card roulette" id="reward"><h3>🎁 Gönn dir was</h3><p class="muted">Dir fällt nichts ein? Kein Problem – dafür ist das hier da. Belohnungen kosten nichts.</p>
    <div class="chips" style="justify-content:center">${C.REWARD_SIZES.map(([k, l]) => `<button class="chip ${ui.rsize === k ? 'on' : ''}" data-a="rsize" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="idea">${ui.ridea ? esc(ui.ridea) : '…'}</div>
    <div class="row"><button class="btn soft" data-a="roll">${ui.ridea ? 'Andere Idee' : 'Idee ziehen'}</button>${ui.ridea ? `<button class="btn soft" data-a="fav" aria-label="Merken">${S.favs.includes(ui.ridea) ? '♥' : '♡'}</button><button class="btn" data-a="treat">Gönn ich mir!</button>` : ''}</div>
    ${S.favs.length ? `<p class="muted" style="margin-top:14px;font-weight:800;text-align:left">Deine Favoriten</p><ul class="list-plain" style="text-align:left">${S.favs.map((f, i) => `<li><span>${esc(f)}</span><button class="mini-btn" data-a="usefav" data-i="${i}" aria-label="Auswählen">→</button><button class="mini-btn" data-a="delfav" data-i="${i}" aria-label="Entfernen">✕</button></li>`).join('')}</ul>` : ''}</div>`;
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
  };
}
function viewWoche() {
  const mon = monday(today()), w = weekStats(mon), max = Math.max(1, ...w.per.map(p => p.work + p.rest));
  let h = `<div class="sec-title" style="margin-top:6px">Diese Woche</div>
    <div class="stat-row"><div class="stat"><b>${w.work}</b><span>erledigt</span></div><div class="stat"><b>${w.rest}</b><span>entspannt</span></div><div class="stat"><b>${w.stars}</b><span>Sterne</span></div></div>
    <div class="card" style="margin-top:14px"><div class="weekbars">${w.per.map(p => `<div><i style="height:${p.work / max * 100}%"></i>${p.rest ? `<i class="rest" style="height:${p.rest / max * 100}%"></i>` : ''}${C.DAYSHORT[parse(p.d).getDay()]}</div>`).join('')}</div>
    <p class="muted" style="text-align:center;margin:6px 0 0"><span style="color:var(--accent)">■</span> erledigt &nbsp; <span style="color:#7b62b8">■</span> entspannt</p></div>
    <button class="btn wide" data-a="story" data-w="${mon}">✨ Wochenrückblick ansehen</button>`;
  const past = [];
  for (let i = 1; i <= 8; i++) { const m = addDays(mon, -7 * i); const s = weekStats(m); if (s.log.length) past.push(s); }
  if (past.length) {
    h += `<div class="sec-title">Frühere Wochen</div>` + past.map(s => `<button class="card btn soft wide" data-a="story" data-w="${s.mon}" style="text-align:left;display:flex;justify-content:space-between"><span>${shortDate(s.mon)} – ${shortDate(addDays(s.mon, 6))}</span><span>${s.work} erledigt · ${s.rest} entspannt</span></button>`).join('');
  }
  return h;
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
    ['linear-gradient(160deg,#3b2f52,#7b62b8)', `<div class="k">ENTSPANNUNGS-QUESTS ÜBERLEBT</div><div class="n">${w.rest}</div><p class="p">${w.rest ? 'Trotz extremer Schwierigkeit.<br>Respekt. Das ist die eigentliche Heldentat.' : 'Die Couch vermisst dich.<br>Nächste Woche vielleicht? Sie wartet.'}</p>`],
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
    <h3 style="margin:18px 0 4px">☁ Sicherung</h3>
    <div class="status"><span class="dot ${dot}"></span>${esc(txt)}</div>
    ${days !== null && days < 21 ? `<div class="warn">Der Sicherungs-Schlüssel läuft in ${days} Tagen ab. Bitte einen neuen eintragen.</div>` : ''}
    <label class="field"><span>GitHub-Name</span><input id="s-owner" value="${esc(c.owner || '')}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span>Repo</span><input id="s-repo" value="${esc(c.repo || 'gute-nudel-daten')}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span>Schlüssel (Token)</span><input id="s-token" type="password" value="${esc(c.token || '')}" autocomplete="off" spellcheck="false"></label>
    <div class="row"><button class="btn blue" data-a="cfgsave">Verbinden & testen</button></div>
    <div class="row"><button class="btn soft" data-a="backupnow">Jetzt sichern</button><button class="btn soft" data-a="restore">Wiederherstellen</button></div>
    <div class="row"><button class="btn soft" data-a="export">Als Datei speichern</button></div>
    <p class="muted" id="s-msg"></p>
    <div class="row"><button class="btn" data-a="settingsclose">Fertig</button></div></div>`);
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
  S = Object.assign(D.freshState(), remote);
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
  go(el) { closeModal(); ui.tab = el.dataset.tab; ui.sub = null; render(); scrollTo(0, 0); if (el.dataset.to) setTimeout(() => { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); },
  close: closeModal,
  pickday(el) { const id = el.dataset.id; ui.picks.has(id) ? ui.picks.delete(id) : ui.picks.add(id); render(); },
  plandone() { S.items.forEach(i => { if (ui.picks.has(i.id)) { i.where = 'heute'; } }); ui.picks.clear(); S.today.planned = true; commit(); },
  tick(el) { tick(el.dataset.id, el); },
  later(el) { const i = S.items.find(x => x.id === el.dataset.id); if (i) { i.where = 'liste'; commit(); toast('Zurück auf der Liste – kein Stress.'); } },
  undo(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    S.log = S.log.filter(x => x !== e); S.stars = Math.max(0, S.stars - e.stars); S.earned = Math.max(0, S.earned - e.stars);
    if (e.kind === 'task') S.items.unshift({ id: uid(), text: e.text, where: 'heute', created: Date.now(), ...(e.did ? { did: e.did, from: e.from } : {}) });
    let post = false;
    if (e.did && S.answered[e.did]) { S.answered[e.did] = { status: 'ok', ts: Date.now() }; post = true; }
    S.today.celebrated = false; S.today.closed = false; commit(post);
  },
  closeday() {
    modal(`<h2>Für heute Schluss?</h2><p>Was noch offen ist, wandert zurück auf die Liste. Es läuft nicht weg.</p><div class="row"><button class="btn green" data-a="closeyes">Ja, Feierabend!</button><button class="btn soft" data-a="close">Doch nicht</button></div>`);
  },
  closeyes() {
    closeModal();
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
    picked.forEach(i => S.sent.push({ id: uid(), text: i.text, today: !!ui.dtoday, ts: Date.now(), status: 'wartet' }));
    S.log.push({ id: uid(), text: picked.length + (picked.length === 1 ? ' Aufgabe' : ' Aufgaben') + ' an ' + pn() + ' abgegeben', kind: 'delegate', day: today(), ts: Date.now(), stars: 1 }); earn(1);
    closeModal(); commit(true);
    modal(`<h2>Abgegeben!</h2><p>Nicht alles allein machen zu müssen, ist auch eine Stärke.</p><p>+1 gute Nudel Stern ⭐</p><p class="muted">${esc(pn())} sieht ${picked.length === 1 ? 'die Aufgabe' : 'die Aufgaben'} beim nächsten Öffnen der App.</p><div class="row"><button class="btn" data-a="close">💛</button></div>`);
  },
  accept(el) {
    const x = S.incoming.find(y => y.id === el.dataset.id); if (!x) return;
    S.items.push({ id: uid(), text: x.text, where: x.today ? 'heute' : 'liste', created: Date.now(), from: pn(), did: x.id, ...(x.today ? { urgent: true } : {}) });
    if (x.today) { S.today.planned = true; S.today.closed = false; }
    S.answered[x.id] = { status: 'ok', ts: Date.now() }; S.incoming = S.incoming.filter(y => y !== x);
    commit(true); toast(x.today ? 'Steht auf deiner Seite für heute ☀' : 'Steht jetzt auf deiner Liste 📋');
  },
  declinestart(el) { ui.declining = el.dataset.id; render(); const i = document.querySelector('form[data-f="decline"] input'); if (i) i.focus(); },
  declinecancel() { ui.declining = null; render(); },
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
    S.recipe.done[i] = true;
    S.log.push({ id: uid(), text: r.title + ': ' + steps[i], kind: 'setup', day: today(), ts: Date.now(), stars: 1 }); earn(1);
    floatStar(el, '+1 ⭐'); commit();
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
    st[i] = true; S.log.push({ id: uid(), text: p.title + ': ' + p.steps[i], kind: 'prep', day: today(), ts: Date.now(), stars: 1 }); earn(1);
    floatStar(el, '+1 ⭐'); commit();
    if (st.every(Boolean)) { confetti(40); toast(p.title + ' – fertig! Das hilft dir an müden Tagen.'); }
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
  storyclose() { const s = $('#story'); if (s) s.remove(); render(); },
  settings, settingsclose() { const n = $('#s-name'); if (n && n.value.trim() !== S.name) { S.name = n.value.trim(); commit(); } closeModal(); },
  cfgsave: saveCfgAndTest,
  async backupnow() { D.scheduleBackup(S, 0); await D.flushBackup(); settings(); },
  restore() {
    modal(`<h2>Wiederherstellen?</h2><p>Der Stand aus der letzten Sicherung ersetzt alles, was gerade auf dem Handy ist.</p><div class="row"><button class="btn" data-a="restoreyes">Ja, wiederherstellen</button><button class="btn soft" data-a="settings">Abbrechen</button></div><p class="muted" id="s-msg"></p>`);
  },
  async restoreyes() { const m = $('#s-msg'); m.textContent = 'Lade…'; try { const r = await D.fetchBackup(); if (!r) { m.textContent = 'Keine Sicherung gefunden.'; return; } await applyRestore(r); } catch (e) { m.textContent = '❌ ' + e.message; } },
  export: exportFile,
  stars() { modal(`<h2>Gute Nudel Sterne</h2><p>⭐ 1 pro erledigter Aufgabe (bis ${C.CAP} am Tag)<br>⭐ ${C.REST_STARS} pro überlebter Entspannungs-Quest<br>⭐ 1 pro Schritt beim Gemütlich-machen und Vorbereiten</p><p>Ausgeben kannst du sie bei <b>Schätze</b>.</p><div class="row"><button class="btn" data-a="go" data-tab="schaetze">Zu den Schätzen</button></div>`); },
};

function delegateModal() {
  const open = [...S.items.filter(i => i.where === 'heute'), ...S.items.filter(i => i.where !== 'heute')];
  const n = ui.dpicks.size;
  modal(`<h2>An ${esc(pn())} abgeben</h2><p class="muted">Welche Aufgaben soll ${esc(pn())} übernehmen?</p>
    <div style="text-align:left">${open.map(i => `<button class="pick ${ui.dpicks.has(i.id) ? 'on' : ''}" data-a="dpick" data-id="${i.id}"><span class="box">${ui.dpicks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}</span></button>`).join('')}</div>
    <div class="chips" style="justify-content:center;margin-top:12px"><button class="chip ${ui.dtoday ? 'on' : ''}" data-a="dtoday">☀ Bitte heute erledigen</button></div>
    <div class="row"><button class="btn" data-a="dsend" ${n ? '' : 'disabled'}>Abgeben${n ? ' (' + n + ')' : ''} · +1 ⭐</button><button class="btn soft" data-a="close">Abbrechen</button></div>`);
}

const FORMS = {
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
  D.backup.listeners.add(renderTop);
  addEventListener('online', () => { D.flushBackup(); D.flushPost(); syncPost(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncPost(); }, 90000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') D.flushBackup();
    else { if (rollover()) commit(); syncPost(); }
  });
  setInterval(() => { if (rollover()) commit(); }, 60000);
}

function welcome() {
  modal(`<h2>Hallo, gute Nudel! 💛</h2>
    <p style="text-align:left">📝 <b>Heute</b>: Such dir morgens ein paar Sachen aus. Wenn sie erledigt sind, ist der Tag geschafft – wirklich.</p>
    <p style="text-align:left">⭐ Für jede erledigte Sache gibt es einen <b>gute Nudel Stern</b>. Ab ${C.CAP} am Tag heißt es: genug für heute!</p>
    <p style="text-align:left">🛋️ <b>Entspannen</b> ist die schwerste Disziplin. Dafür gibt es extra Sterne.</p>
    <p style="text-align:left">🎁 Bei <b>Schätze</b> wartet ein geheimes Fotobuch – und eine Pflanze, die mit dir wächst.</p>
    <label class="field"><span>Wie soll ich dich nennen? (optional)</span><input id="w-name" placeholder="Dein Name"></label>
    <div class="row"><button class="btn" data-a="welcomego">Los geht's</button></div>`);
}
A.welcomego = () => { const n = $('#w-name').value.trim(); S.name = n; S.welcomed = true; closeModal(); commit(); D.askPersistent(); };

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
  rollover();
  bind();
  render();
  await D.saveLocal(S);
  if ('serviceWorker' in navigator && !localStorage.getItem('gn_nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (fromLink) { // check the key; a fresh phone with an existing backup gets everything back
    const r = await D.testConnection().catch(() => ({ ok: false, msg: 'keine Verbindung' }));
    if (!r.ok) toast('Sicherung: ' + r.msg);
    else {
      const remote = await D.fetchBackup().catch(() => null);
      if (remote && !S.log.length && remote.updatedAt > S.updatedAt) { await applyRestore(remote); return; }
      D.scheduleBackup(S, 10); toast('Sicherung eingerichtet ✓');
    }
  }
  if (!S.welcomed) welcome();
  else D.askPersistent();
  syncPost();
}
start();
window.__gn = { get S() { return S; }, ui, render, commit, D, rollover, syncPost };
