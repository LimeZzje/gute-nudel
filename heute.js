// HEUTE (today's page: plan, tick, mood) and LISTE (everything not planned for today).
import * as C from './content.js';
import * as D from './data.js';
import { addDays, allTicked, commit, confetti, dayDone, endTime, esc, evening, floatStar, longDate, modal, monday, tags, today, uid, weekDays, workToday } from './core.js';
import { S, ui } from './state.js';
import { answerDone, earn, pn } from './sync.js';
import { choreDone, choreRhythm } from './chores.js';
import { carToday } from './termine.js';
import { dueBtns, dueCard, dueField, dueSort, dueDays, SOON } from './faellig.js';
import { knAsk, knChoreTrick } from './kniff.js';

// ---------- HEUTE ----------
export function viewHeute() {
  const d = today(), heute = S.items.filter(i => i.where === 'heute'), done = workToday();
  const liste = dueSort(S.items.filter(i => i.where === 'liste'));   // due soon / overdue on top (suggested, never preselected)
  const capped = done.length >= C.CAP;
  let h = '';

  h += carToday() + comboCard(true) + giftCards() + dueCard();
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
    if (liste.some(i => i.due && dueDays(i.due) <= SOON)) h += `<p class="sub due-hint">📅 Bald fällig steht ganz oben – nur ein Vorschlag, du entscheidest.</p>`;
    if (liste.length) {
      h += liste.map(i => `<button class="pick ${ui.picks.has(i.id) ? 'on' : ''}" data-a="pickday" data-id="${i.id}"><span class="box">${ui.picks.has(i.id) ? '✓' : ''}</span><span>${esc(i.text)}${i.carried ? '<span class="tag">von gestern</span>' : ''}${tags(i).replace(/<button[^>]*toolbtn[\s\S]*?<\/button>/g, '')}</span></button>`).join('');
    }
    h += `<form class="add" data-f="addplan"><input name="t" placeholder="Etwas Neues für heute…" autocomplete="off" enterkeyhint="done">${dueField()}<button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
    h += `<div class="row" style="margin-top:14px"><button class="btn green" data-a="plandone">${ui.picks.size ? 'Los geht\'s (' + ui.picks.size + ')' : 'Los geht\'s'}</button></div>`;
    h += `<p class="hint">Du kannst später jederzeit noch etwas dazuholen.</p></section>`;
    return h;
  }

  if (heute.length === 0 && done.length === 0) h += `<p class="sub">Nichts geplant. Genieß es – oder hol dir etwas aus der Liste.</p>`;
  h += heute.map(i => `<div class="item" data-id="${i.id}"><button class="chk" data-a="tick" data-id="${i.id}" aria-label="Erledigt"></button><div class="txt ${i.carried ? 'carried' : ''}"><span>${esc(i.text)}</span>${tags(i, true)}</div>${i.chore ? '' : dueBtns(i)}${i.chore ? `<button class="mini-btn" data-a="choreskip" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht – morgen wieder">⏭</button>` : `<button class="mini-btn" data-a="later" data-id="${i.id}" aria-label="Zurück auf die Liste" title="Zurück auf die Liste">↩</button>`}</div>`).join('');
  if (!finished) {
    h += `<form class="add" data-f="addtoday"><input name="t" placeholder="Noch etwas für heute…" autocomplete="off" enterkeyhint="done">${dueField()}<button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
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

export function giftCards() {
  return S.gifts.filter(g => g.day === today()).map(g => `<div class="card quest active"><div class="lvl">🎁 HEUTE WARTET AUF DICH</div><h3>${esc(g.reward)}</h3><p style="color:#d8cdee">${esc(g.icon + ' ' + g.name)} ist erledigt. Jetzt kommt der schöne Teil – gleich oder heute Abend.</p><button class="btn wide" data-a="giftdone" data-id="${g.id}">Genossen! +${C.COMBO_REWARD_STARS} ⭐</button></div>`).join('');
}

function comboCard(small) {
  const c = S.combo && S.combo.day === today() && C.COMBOS.find(x => x.id === S.combo.id);
  if (!c) return '';
  if (S.combo.phase === 'work') return small ? '' : `<div class="card quest active"><div class="lvl">⚔ AKTIVE DOPPEL-QUEST</div><h3>${c.icon} ${esc(c.title)}</h3><p><b>Teil 1:</b> ${esc(c.work)} <span class="muted" style="color:#d8cdee">– steht auf deiner Seite für heute</span></p><p style="opacity:.75"><b>Teil 2 (heute):</b> ${esc(c.reward)}</p><button class="btn soft wide" data-a="combocancel">Doch nicht heute</button></div>`;
  return `<div class="card quest active"><div class="lvl">🎁 HEUTE WARTET AUF DICH</div><h3>${c.icon} ${esc(c.reward)}</h3><p style="color:#d8cdee">Teil 1 (${esc(c.work)}) ist geschafft. Jetzt kommt der schöne Teil – gleich oder heute Abend.</p><button class="btn wide" data-a="combodone">Genossen! +${C.COMBO_REWARD_STARS} ⭐</button></div>`;
}

export function incomingCard() {
  if (!S.incoming.length) return '';
  return `<div class="card incoming"><h3>🤝 ${esc(pn())} bittet dich um Hilfe</h3>` + S.incoming.map(x => `<div class="inc">
      <div class="inc-t"><b>${esc(x.text)}</b>${x.today ? '<span class="tag hot">bitte heute</span>' : ''}${x.list ? `<br><span class="muted">🛒 ${x.list.length} Sachen: ${esc(x.list.slice(0, 6).join(', '))}${x.list.length > 6 ? ' …' : ''}</span>` : ''}</div>
      ${ui.declining === x.id
        ? `<form class="add" data-f="decline" data-id="${x.id}"><input name="t" placeholder="Warum? z.B. schaff ich nicht wegen Terminen" autocomplete="off" enterkeyhint="send"><button class="btn" aria-label="Absenden">➤</button></form><button class="btn soft wide" data-a="declinecancel" style="margin-top:6px">Doch nicht</button>`
        : `<div class="row"><button class="btn green" data-a="accept" data-id="${x.id}">Übernehmen</button><button class="btn soft" data-a="declinestart" data-id="${x.id}">Geht nicht</button></div>`}
    </div>`).join('') + '</div>';
}

export function tick(id, el) {
  const it = S.items.find(i => i.id === id); if (!it) return;
  const row = el && el.closest('.item');
  if (row) row.classList.add('done', 'ticking', 'leaving');
  const n = workToday().length, stars = n < C.CAP ? 1 : 0;
  floatStar(el, stars ? '+1 ⭐' : '✓');
  setTimeout(() => {
    S.items = S.items.filter(i => i !== it);
    const ch = it.chore && S.chores.find(c => c.id === it.chore);
    S.log.push({ id: uid(), text: it.text, kind: 'task', day: today(), ts: Date.now(), stars, ...(it.did ? { did: it.did, from: it.from } : {}), ...(ch ? { chore: ch.id, prevLast: ch.last || null, prevMoved: ch.moved || null } : {}) });
    earn(stars);
    if (ch) { choreDone(ch, today()); if (ch.reward) S.gifts.push({ id: uid(), cid: ch.id, day: today(), icon: ch.icon, name: ch.name, reward: ch.reward }); }
    const combo = S.combo && S.combo.iid === it.id && S.combo.phase === 'work' && C.COMBOS.find(c => c.id === S.combo.id);
    if (combo) S.combo.phase = 'reward';
    afterWork(n + 1, answerDone(it));
    askMood(S.log[S.log.length - 1]);
    const kid = ch && knChoreTrick(ch);   // 💡 the chore carried a Kniff: ask first, then what comes next
    const next = () => {
    if (ch && ch.reward) modal(`<h2>${esc(ch.icon)} Erledigt!</h2><p><b>${esc(ch.name)}</b> ist für ${esc(choreRhythm(ch))} erledigt.</p><p>Heute wartet auf dich:</p><p class="hand" style="font-size:30px;color:var(--accent)">🎁 ${esc(ch.reward)}</p><p class="muted">Ob gleich oder heute Abend – Hauptsache heute. +${C.COMBO_REWARD_STARS} ⭐ wenn du's genossen hast.</p><div class="row"><button class="btn" data-a="close">Freu mich!</button></div>`);
    if (combo) modal(`<h2>Teil 1 geschafft!</h2><p><b>${esc(combo.work)}</b> ist erledigt.</p><p>Heute wartet auf dich:</p><p class="hand" style="font-size:30px;color:var(--accent)">${combo.icon} ${esc(combo.reward)}</p><p class="muted">Ob gleich oder heute Abend – Hauptsache heute. +${C.COMBO_REWARD_STARS} ⭐ wenn du's genossen hast.</p><div class="row"><button class="btn" data-a="close">Freu mich!</button></div>`);
    };
    if (kid) knAsk(kid, next); else next();
  }, 650);
}
// "wie war's?": five faces under the screen for a few seconds — one tap, or just ignore it
const MOOD_SECS = 12;
export function askMood(e) {
  if (!e) return;
  document.querySelectorAll('.moodbar').forEach(b => b.remove());
  const b = document.createElement('div'); b.className = 'moodbar';
  b.innerHTML = `<span>Wie war’s?</span>` + C.MOODS.map((m, i) => `<button data-a="mood" data-id="${e.id}" data-v="${i + 1}" aria-label="${C.MOOD_WORDS[i]}">${m}</button>`).join('') +
    `<i class="mtime" style="animation-duration:${MOOD_SECS}s"></i>`;
  document.body.appendChild(b);
  const t = setTimeout(() => b.remove(), MOOD_SECS * 1000);
  b.addEventListener('pointerdown', () => { clearTimeout(t); const i = b.querySelector('.mtime'); if (i) i.remove(); setTimeout(() => b.remove(), 15000); }, { once: true });   // touched: it stays
}
export function afterWork(count, post = false) {
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
export function checkEvening() {
  if (!allTicked() || !evening() || S.today.celebrated || S.today.closed) return;
  S.today.celebrated = true; commit();
  if (document.visibilityState === 'visible' && (ui.tab === 'heute' || ui.tab === 'home')) confetti();
}

// ---------- LISTE ----------
export function viewListe() {
  const l = dueSort(S.items.filter(i => i.where === 'liste'));
  let h = `<section class="pad"><h2>Alles, was irgendwann dran ist</h2><p class="sub">Hier darf alles stehen. Nichts davon muss heute passieren.</p>`;
  h += l.map(i => `<div class="item"><button class="chk" data-a="toheute" data-id="${i.id}" aria-label="Für heute einplanen" title="Für heute">☀</button><div class="txt ${i.carried ? 'carried' : ''}"><span>${esc(i.text)}</span>${tags(i, true)}</div>${dueBtns(i)}<button class="mini-btn" data-a="del" data-id="${i.id}" aria-label="Löschen">✕</button></div>`).join('');
  if (!l.length) h += `<p class="muted">Die Liste ist leer. Wie schön.</p>`;
  h += `<form class="add" data-f="addlist"><input name="t" placeholder="Neue Aufgabe…" autocomplete="off" enterkeyhint="done">${dueField()}<button class="btn blue" aria-label="Hinzufügen">+</button></form>`;
  if (D.canPost() && S.items.length) h += `<button class="btn soft wide" data-a="delegate" style="margin-top:12px">🤝 An ${esc(pn())} abgeben</button>`;
  h += `<p class="hint">Tipp: Mit ☀ kommt eine Aufgabe auf die Seite von heute.</p></section>`;
  const sent = S.sent.filter(x => x.status === 'wartet' || x.status === 'ok');
  if (sent.length) {
    const lbl = { wartet: 'wartet auf Antwort', ok: 'übernommen 💛', erledigt: 'erledigt 🎉' };
    h += `<div class="card"><h3>🤝 Abgegeben an ${esc(pn())}</h3><ul class="list-plain">${sent.slice().reverse().map(x => `<li><span>${esc(x.text)}${x.today ? ' <span class="tag hot">heute</span>' : ''}</span><span class="st st-${x.status}">${lbl[x.status]}</span>${x.status !== 'erledigt' ? `<button class="mini-btn" data-a="withdraw" data-id="${x.id}" aria-label="Zurückholen" title="Zurückholen">↩</button>` : ''}</li>`).join('')}</ul><p class="hint">Mit ↩ holst du eine Aufgabe zurück, solange sie noch nicht erledigt ist.</p></div>`;
  }
  return h;
}
