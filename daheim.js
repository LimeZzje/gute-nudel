// DAHEIM tab (viewRuhe): its chips, Haushalt (chores + week planner), Gemütlich, Gönn dir, the Hello Nudel stops.
import * as C from './content.js';
import * as Bk from './book.js';
import { addDays, esc, longDate, monday, parse, shortDate, today, toolBtns, weekDays } from './core.js';
import { S, ui } from './state.js';
import { vorratGroups } from './sync.js';
import { choreDone, choreDue, choreNext, choreRhythm, choreWhen } from './chores.js';
import { giftCards } from './heute.js';
import { viewRelax } from './relax.js';
import { picNow, shopBody } from './einkauf.js';
import { cookableNow, viewCook, viewDaheim } from './kochbuch.js';
import { viewTermine } from './termine.js';
import { viewHello } from './events.js';

// ---------- RUHE ----------
export const dayIndex = () => Math.floor(parse(today()).getTime() / 864e5);
function questCard(q, active) {
  return `<div class="card quest ${active ? 'active' : ''}"><div class="lvl">${active ? '⚔ AKTIVE QUEST' : 'LEGENDÄRE QUEST'}</div><h3>${esc(q.title)}</h3>
    <div class="meta"><span class="diff">${'★'.repeat(q.diff)}${'☆'.repeat(5 - q.diff)}</span><span>⏱ ${q.dur}</span><span>Überlebensrate: ${q.rate}%</span></div>
    <p>${esc(q.text)}</p><div class="boss">${esc(q.boss)}</div>
    ${active ? `<div class="row"><button class="btn" data-a="questdone">Überlebt! +${C.REST_STARS} ⭐</button><button class="btn soft" data-a="questquit">Später</button></div>`
      : `<button class="btn wide" data-a="queststart" data-id="${q.id}">Quest annehmen</button>`}</div>`;
}
// 🏠 Daheim (2026-10-20, user): Routinen · Entspannen · Termine. The food things moved to their own tab 🧺 Hello Nudel.
// One ui.qtab for both tabs; which tab a chip belongs to follows from the chip (tabOfQ), so old links like
// {tab: 'ruhe', qtab: 'kochbuch'} still land right. Each tab remembers its last chip (ui.lastQ; Hello Nudel also across starts).
const QTABS = [['haushalt', '🔁 Routinen'], ['relax', '🛋️ Entspannen'], ['termine', '📅 Termine']];
export const HN_STOPS = ['einkauf', 'vorrat', 'kochbuch'];
export const tabOfQ = q => HN_STOPS.includes(q) ? 'hello' : 'ruhe';
export const inQ = q => (ui.tab === 'ruhe' || ui.tab === 'hello') && ui.qtab === q;
export const hnLast = () => { try { const q = localStorage.getItem('gn_hq'); return HN_STOPS.includes(q) ? q : 'einkauf'; } catch (e) { return 'einkauf'; } };
export function viewRuhe() {
  if (!QTABS.some(([k]) => k === ui.qtab)) ui.qtab = 'haushalt';
  const h = `<div class="chips qtabs dtabs" role="tablist">${QTABS.map(([k, l]) => { const [ic, w] = l.split(' '); return `<button class="chip ${ui.qtab === k ? 'on' : ''}" role="tab" aria-selected="${ui.qtab === k}" data-a="qtab" data-v="${k}"><span class="qi">${ic}</span> ${w}</button>`; }).join('')}</div>`;
  if (ui.qtab === 'relax') return h + viewRelax();
  if (ui.qtab === 'termine') return h + viewTermine();
  return h + viewHaushalt();
}
// 🧺 HELLO NUDEL (2026-10-20, user): the food loop as its own tab. The chips are a LOOP STRIP: Einkaufswagen → Vorrat →
// Kochbuch → (aufgebraucht) back to the Wagen; Picnic's delivery rides the arrow between Wagen and Vorrat.
// UX rules for the strip (user asked for good guidelines): every stop is one big tap target (≥ 56 px) with icon + word +
// a short live state (never icon-only, never more than ~12 characters); the open stop is marked by fill + weight + a notch,
// not by colour alone; arrows/arc are decoration (aria-hidden), the stops are a tablist; fits 320 px without sideways
// scrolling (iPhone swipe flips book pages); sticky under the header like every chip row; motion only for a real state
// (the van drives only while a delivery is on its way) and never with reduced motion.
function hnStops() {
  const open = S.shop.filter(x => !x.done).length, inCart = S.shop.filter(x => !x.done && x.pic).length;
  const fresh = (S.vorratAdd || []).filter(x => x && x.pic && Date.now() - (x.ts || 0) < 864e5).length;
  const cook = cookableNow().all.length, pn0 = picNow(), n = pn0 && new Date(pn0.start);
  return {
    einkauf: ['🛒', 'Einkaufs\u00ADwagen', open - inCart ? `${open - inCart} drauf` : inCart ? `🧺 ${inCart} bei Picnic` : 'leer'],   // only what is still to buy yourself
    vorrat: ['🧊', 'Vorrat', fresh ? `+${fresh} neu da` : `${vorratGroups().length} Sachen`],
    kochbuch: ['📖', 'Kochbuch', cook ? `${cook} kochbar` : 'stöbern'],
    van: n && !isNaN(n) ? n.toLocaleDateString('de-DE', { weekday: 'short' }) + ' ' + n.getHours() + ' Uhr' : '',
  };
}
function hnLoop(deliv = true) {
  const st = hnStops(), stop = k => { const [ic, l, sub] = st[k], on = ui.qtab === k;
    return `<button class="hl-stop${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-a="qtab" data-v="${k}"><span class="hl-i" aria-hidden="true">${ic}</span><b>${l}</b><small>${esc(sub)}</small></button>`; };
  const arrow = van => `<span class="hl-ar${van ? ' van' : ''}" aria-hidden="true"><i></i>${van ? '<em>🚚</em>' : ''}</span>`;
  return `<div class="hnloop" role="tablist" aria-label="Hello Nudel">
    <div class="hl-row">${stop('einkauf')}${arrow(!!st.van)}${stop('vorrat')}${arrow()}${stop('kochbuch')}</div>
    <div class="hl-back" aria-hidden="true"><svg viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M88 0 Q88 8 80 8 L20 8 Q12 8 12 2" /><path class="hl-tip" d="M9.5 4 L12 0.5 L14.5 4" /></svg><span>aufgebraucht? wieder auf den Wagen</span></div></div>
    ${st.van && deliv ? `<button class="hl-deliv" data-a="picdeliv"><span class="hl-dv" aria-hidden="true">🚚</span><span>Picnic kommt <b>${esc(st.van)}</b><br><small>danach landet alles von selbst im Vorrat</small></span><span class="hc-go">›</span></button>` : ''}`;
}
export function viewHN() {
  if (ui.sub === 'hello') return viewHello();
  if (ui.sub === 'cook') { ui.sub = null; ui.qtab = 'kochbuch'; }   // old way in: the cookbook was a sub-page
  if (!HN_STOPS.includes(ui.qtab)) ui.qtab = hnLast();
  if (ui.qtab === 'kochbuch' && ui.rid && ui.cstep != null) return viewCook();   // cooking mode: full page, no strip
  const h = hnLoop(ui.qtab !== 'kochbuch');   // the delivery note stays out of the book's way
  if (ui.qtab === 'einkauf') return h + `<div class="card shoptab">${shopBody(null, true)}</div>`;
  if (ui.qtab === 'vorrat') return h + `<div class="sec-head plain"><h2>Was ist daheim?</h2>${Bk.sectionArt('daheim')}</div>` + viewDaheim();
  return h + viewCook();
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
      choreDone(x, d);
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
