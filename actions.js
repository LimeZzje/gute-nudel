// The action table: data-a="x" → A.x(el, e). Most actions live here; feature modules add their own (A.x = ...).
import * as C from './content.js';
import * as K from './cookbook.js';
import * as Sh from './shop.js';
import * as D from './data.js';
import * as E from './entspannen.js';
import * as G from './geburtstag.js';
import * as Bk from './book.js';
import { $, addDays, closeModal, commit, confetti, esc, floatStar, longDate, modal, parse, pick, toast, today, uid, undoToast, weekDays } from './core.js';
import { A, S, ui } from './state.js';
import { askVorrat, consumeFor, earn, fmtQty, groupQty, itemName, itemQty, parseQty, pn, splitAmount, useGroup, vGroup, vaskDone } from './sync.js';
import { rankModal } from './rank.js';
import { ceRead, choreDone, choreDue, choreItemId, choreModal, choreNext, choreRhythm, delegateModal, guessIcon, planChanged, scheduleChores, setChoreNext } from './chores.js';
import { tick } from './heute.js';
import { inQ } from './daheim.js';
import { ownRitualForm, rateRitual, ritualById, rxP } from './relax.js';
import { hydratePhotos } from './schaetze.js';
import { story, weekLogModal, weekStats } from './woche.js';
import { applyRestore, exportFile, saveCfgAndTest, settings } from './settings.js';
import { PIC_MAX, cookModal, phoneTimer, pic, picDelivModal, picFail, picLS, picModal, picN, picSearchAll, picSend, picSum, picWorry, picnicAppLink, shopAgain, shopModal, shopOrder } from './einkauf.js';
import { KTABS, PLACES, addToShop, cookSteps, endCookMode, ingKey, ingWanted, kpage, ksec, placeOf, recipeById, sidesOf, vorratRecipes, vrSeenAdd } from './kochbuch.js';
import { allDishPics, backToList, loadDishPics } from './recipes.js';
import { NEWS, ZETTEL, deck, newsAll, newsRead, swipeSet } from './home.js';
import { planNow } from './wochenplan.js';
import { babyLive, gbParty, gbReconcile } from './events.js';
import { render, tabChip } from './app.js';

// ---------- actions ----------
Object.assign(A, {
  go(el) { closeModal(); ui.tab = el.dataset.tab; ui.sub = null; if (el.dataset.q) ui.qtab = el.dataset.q; else tabChip(); render(); scrollTo(0, 0); if (el.dataset.to) setTimeout(() => { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); },
  close: closeModal,
  pickday(el) { const id = el.dataset.id; ui.picks.has(id) ? ui.picks.delete(id) : ui.picks.add(id); render(); },
  plandone() { S.items.forEach(i => { if (ui.picks.has(i.id)) { i.where = 'heute'; } }); ui.picks.clear(); S.today.planned = true; commit(); },
  tick(el) { tick(el.dataset.id, el); },
  later(el) { const i = S.items.find(x => x.id === el.dataset.id); if (i) { i.where = 'liste'; commit(); toast('Zurück auf der Liste – kein Stress.'); } },
  undo(el) {
    const e = S.log.find(x => x.id === el.dataset.id); if (!e) return;
    S.log = S.log.filter(x => x !== e); S.stars = Math.max(0, S.stars - e.stars); S.earned = Math.max(0, S.earned - e.stars);
    if (e.kind === 'task') S.items.unshift({ id: e.chore ? choreItemId(e.chore, e.day) : uid(), text: e.text, where: 'heute', created: Date.now(), ...(e.did ? { did: e.did, from: e.from } : {}), ...(e.chore ? { chore: e.chore } : {}) });
    if (e.chore) { const c = S.chores.find(x => x.id === e.chore); if (c) { c.last = e.prevLast || null; c.moved = e.prevMoved || null; } S.gifts = S.gifts.filter(g => !(g.cid === e.chore && g.day === e.day)); }
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
    picked.forEach(i => { const c = i.chore && S.chores.find(x => x.id === i.chore); if (c) choreDone(c, today()); });   // handed over counts as handled
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
    const d = today();   // only this one time moves a day on; moved again → still counts from the first planned day
    if (c) c.moved = { orig: c.moved && c.moved.to === d ? c.moved.orig : d, to: addDays(d, 1) };
    S.items = S.items.filter(i => i !== it); commit(); toast('Auf morgen verschoben – der Plan bleibt 🔁');
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
  ccat(el) { ui.ccat = el.dataset.v; render(); if (el.classList.contains('hcard')) { const c = document.querySelector('.ccats'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
  recipe(el) {   // in the book: turn the page to it (the list it came from = what a swipe goes through)
    const inBook = !el.dataset.go && !el.closest('#ov') && !!el.closest('#cbook') && !ui.rid;
    if (inBook) ui.kback = { sec: ksec(), top: ($('#bkstage .bk-page.cur') || {}).scrollTop || 0 }; else if (!ui.rid) ui.kback = null;   // ‹ back lands here again
    if (el.dataset.go || !inQ('kochbuch') || el.closest('#ov')) { closeModal(); ui.tab = 'ruhe'; ui.sub = null; ui.qtab = 'kochbuch'; }
    const c = el.closest('[data-ctx]');
    ui.kctx = c && c.dataset.ctx ? c.dataset.ctx.split(',') : el.dataset.go ? (S.dishes || []).map(x => x.id) : [el.dataset.id];
    if (el.dataset.go) ui.ktab = 'jetzt';
    ui.rid = el.dataset.id; ui.sides = []; ui.cstep = null; ui.ingPick = {}; ui.ingExtra = [];
    if (inBook && Bk.flipTo(kpage({ sec: ksec(), rid: ui.rid }), 1)) return;
    render(); scrollTo(0, 0);
  },
  ingextradel(el) { ui.ingExtra.splice(+el.dataset.i, 1); render(); },
  ingtoggle(el) { const t = el.dataset.v; ui.ingPick = ui.ingPick || {}; ui.ingPick[ingKey(t)] = !ingWanted(t, el.dataset.q); render(); },
  side(el) { const id = el.dataset.id, a = ui.sides || (ui.sides = []); a.includes(id) ? a.splice(a.indexOf(id), 1) : a.push(id); render(); },
  cookshop2() {
    const r = recipeById(ui.rid), all = r.ing.concat(...sidesOf().map(s => s.ing)).filter(([, t]) => t);
    const add = all.filter(([q, t]) => ingWanted(t, q));
    add.forEach(([q, t]) => addToShop(t, parseQty(q), q, r.title));
    (ui.ingExtra || []).forEach(t => { const a = splitAmount(t); addToShop(a.name, a.qty, '', null); });
    const nExtra = (ui.ingExtra || []).length;
    ui.ingPick = {}; ui.ingExtra = [];
    S.dishes = (S.dishes || []).filter(x => x.id !== r.id).concat([{ id: r.id, ts: Date.now() }]);   // bought for → "Heute kochen?" on Home
    commit(); shopModal();   // the list right away, as a pop-over
    toast(add.length + nExtra ? (add.length + nExtra) + ' Sachen dazugekommen 🛒' : 'Steht schon alles drauf 🛒');
  },
  // ✅ "Schon gekocht" (user 2026-11-02: cooking for himself without the guide): the same rating popup as the end of
  // cooking mode; the Vorrat use-up happens on the rating (taste), so closing the popup changes nothing
  quickcook(el) { ui.quick = true; A.cookdone(el); },
  // 🧊 on a recipe ingredient: which Vorrat row it is + Ist alle / Ist alle + 🛒 / Nur noch wenig
  vhave(el) {
    const g = vGroup(el.dataset.id); if (!g) return; const t = el.dataset.v, q = el.dataset.q;
    modal(`<div style="text-align:left"><h2 style="text-align:center">🧊 ${esc(t)}</h2>
      <p style="margin:0">Im Vorrat: <b>${esc(g.name)}${groupQty(g) ? ' · ' + esc(groupQty(g)) : ''}</b></p>
      ${g.ids.length > 1 ? `<p class="muted" style="margin:2px 0 0">${g.items.map(y => esc(y.name) + (y.left ? ' ' + esc(fmtQty(y.left)) : '')).join(' · ')}</p>` : ''}
      ${q ? `<p class="muted" style="margin:2px 0 0">Das Rezept braucht ${esc(q)}</p>` : ''}
      <div class="row vh-btns"><button class="btn soft" data-a="vgone" data-id="${esc(g.id)}" style="color:var(--danger)">Ist alle</button><button class="btn green" data-a="vgone" data-id="${esc(g.id)}" data-v="shop">Ist alle + 🛒</button></div>
      <p class="muted" style="margin:14px 0 6px">Nur noch wenig? So viel ist noch da:</p>
      <form class="add" data-f="vorratset" data-id="${esc(g.id)}"><input name="t" placeholder="z.B. 100 g, 1 Stück" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Speichern">✓</button></form>
      <div class="row"><button class="btn soft" data-a="close">Abbrechen</button></div></div>`);
  },
  vgone(el) {
    const g = vGroup(el.dataset.id); if (!g) { closeModal(); return; }
    const n0 = (S.vorratUsed || []).length; useGroup(g.id); const recs = new Set(S.vorratUsed.slice(n0).map(u => u.id));
    const had = new Set(S.shop.map(x => x.id)), shop = el.dataset.v === 'shop', r = recipeById(ui.rid);
    if (shop) addToShop(g.name, null, '', r ? r.title : null);
    const added = new Set(S.shop.filter(x => !had.has(x.id)).map(x => x.id));
    closeModal(); commit(true);
    undoToast(`🧊 ${g.name} ist raus${shop ? ' · 🛒 auf der Liste' : ''}`, () => {
      S.vorratUsed = (S.vorratUsed || []).filter(u => !recs.has(u.id));
      if (added.size) S.shop = S.shop.filter(x => !added.has(x.id));
      commit(true); toast('↩ ' + g.name + ' ist wieder im Vorrat');
    });
  },
  cookstart() {   // cooked = off Home's "Heute kochen?", and what it needs leaves the Vorrat
    ui.cstep = 0; ui.quick = false; const r = recipeById(ui.rid), had = (S.dishes || []).some(x => x.id === ui.rid);
    S.dishes = (S.dishes || []).filter(x => x.id !== ui.rid);
    const c = r ? consumeFor(r) : { taken: [], ask: [] };
    if (had || c.taken.length || c.ask.length) commit(true); else render();
    if (c.taken.length) toast('🧊 Aus dem Vorrat: ' + c.taken.join(', '));
    if (c.ask.length) askVorrat(c.ask);
    scrollTo(0, 0);
  },
  picsec() { ui.picOpen = !ui.picOpen; render(); },
  shopdoneask() {   // "Fertig eingekauft" asks once: what goes into the Vorrat, what stays on the list (user 2026-10-20)
    const got = S.shop.filter(x => x.done), rest = S.shop.filter(x => !x.done), pic = rest.filter(x => x.pic).length; if (!got.length) return;
    modal(`<h2>🧊 Ab in den Vorrat?</h2><p>Diese ${got.length === 1 ? 'Sache kommt' : got.length + ' Sachen kommen'} von der Einkaufsliste in den Vorrat:</p>
      <p style="text-align:left"><b>${got.map(x => esc(itemName(x)) + (itemQty(x) ? ' ' + esc(fmtQty(itemQty(x))) : '')).join(' · ')}</b></p>
      ${rest.length ? `<p class="muted">${rest.length - pic ? `${rest.length - pic} nicht abgehakte ${rest.length - pic === 1 ? 'bleibt' : 'bleiben'} auf der Liste.` : ''}${pic ? ` ${pic} 🧺 im Picnic-Warenkorb ${pic === 1 ? 'kommt' : 'kommen'} mit der Lieferung.` : ''}</p>` : ''}
      <div class="row"><button class="btn soft" data-a="close">Noch nicht</button><button class="btn green" data-a="shopdone">Ja, ab in den Vorrat</button></div>`);
  },
  shopdone() {
    closeModal();
    const got = S.shop.filter(x => x.done); if (!got.length) return;
    S.vorratAdd = (S.vorratAdd || []).concat(got.map(x => ({ id: uid(), text: itemName(x), qty: itemQty(x) || null, ...(x.q && !itemQty(x) ? { q: x.q } : {}), ts: Date.now(), by: D.me() })));
    S.shop = S.shop.filter(x => !x.done); commit(true); confetti(50);
    toast('🧊 ' + got.length + (got.length === 1 ? ' Sache' : ' Sachen') + ' im Vorrat');
  },
  vorratdel(el) { useGroup(el.dataset.id); commit(true); },
  vask(el) { const id = el.dataset.id; if (el.dataset.v === 'gone') useGroup(id); vaskDone(id); },
  vorratqty(el) {   // ✎ the amount by hand
    const x = vGroup(el.dataset.id); if (!x) return;
    modal(`<div style="text-align:left"><h2 style="text-align:center">🧊 ${esc(x.name)}</h2>${x.ids.length > 1 ? `<p class="muted" style="margin:0">${x.items.map(y => esc(y.name) + (y.left ? ' ' + esc(fmtQty(y.left)) : '')).join(' · ')}</p>` : ''}<p class="muted">Wie viel ist noch da?</p>
      <form class="add" data-f="vorratset" data-id="${esc(x.id)}"><input name="t" value="${esc(x.left ? fmtQty(x.left) : '')}" placeholder="${x.amounts.length > 1 ? 'zusammen, z.B. ' + esc(groupQty(x)) : 'z.B. 250 g, 3 Stück, 1 Dose'}" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Speichern">✓</button></form>
      <p class="muted" style="margin:12px 0 6px">Wo liegt es?</p><div class="chips">${PLACES.map(([k, ic, l]) => `<button class="chip ${placeOf(x) === k ? 'on' : ''}" data-a="vplace" data-id="${esc(x.id)}" data-v="${k}">${ic} ${l}</button>`).join('')}</div>
      <div class="row"><button class="btn soft" data-a="close">Abbrechen</button><button class="btn soft" data-a="vorratdelm" data-id="${esc(x.id)}" style="color:var(--danger)">Ist alle</button></div></div>`);
  },
  vplace(el) { const x = vGroup(el.dataset.id); if (!x) return; S.vorratPlace = { ...(S.vorratPlace || {}), [Sh.norm(x.name)]: el.dataset.v }; closeModal(); commit(); },
  kcat(el) { ui.kcat = el.dataset.v; render(); },
  shelfcat(el) { ui[el.dataset.k] = el.dataset.v; render(); },
  ktab(el) {   // a thumb tab: turn to that section (backwards if it lies before, or when leaving a recipe)
    const to = el.dataset.v, from = KTABS.findIndex(([k]) => k === ksec()), ti = KTABS.findIndex(([k]) => k === to), wasR = !!ui.rid;
    if (to === ksec() && !wasR) return;
    if (to === ksec() && wasR) { backToList(); return; }
    ui.rq = ''; ui.cstep = null; ui.rid = null; ui.ktab = to;
    if (Bk.flipTo(kpage({ sec: to }), wasR || ti < from ? -1 : 1)) return;
    render(); scrollTo(0, 0);
  },
  vrseen() { vrSeenAdd(vorratRecipes().map(r => r.id)); },
  swipe() { ui.sub = 'swipe'; render(); scrollTo(0, 0); },
  npread(el) { newsRead(el.dataset.id); },
  newssuche() { ui.tab = 'hello'; ui.sub = null; ui.qtab = 'kochbuch'; ui.lastQ.hello = 'kochbuch'; ui.rid = null; ui.ktab = 'next'; ui.rq = ''; render(); scrollTo(0, 0); const i = $('#rsearch'); if (i) i.focus(); },
  newsnaehr() { A.recipe({ dataset: { id: 'koettbullar', go: '1' }, closest: () => null }); },
  newsklump() { A.recipe({ dataset: { id: 'buch-reste-klumpatsch', go: '1' }, closest: () => null }); },
  newszettel() { const ids = ZETTEL.filter(id => recipeById(id)); if (ids.length) A.recipe({ dataset: { id: ids[0], go: '1' }, closest: s => (s === '[data-ctx]' ? { dataset: { ctx: ids.join(',') } } : null) }); },   // pages through all 11
  newsshop() { ui.tab = 'ruhe'; ui.sub = null; A.qtab({ dataset: { v: 'einkauf' } }); },
  npgo(el) { const n = NEWS.find(x => x.id === el.dataset.id); if (!n) return; newsRead(n.id); A[n.go] && A[n.go](el); },
  npall() { modal(`<div style="text-align:left"><h2 style="text-align:center">🗞️ Alle Ausgaben</h2>${newsAll().map(n => `<div class="np-a"><h3><span class="np-ic">${n.ic}</span> ${esc(n.t)}</h3><p>${esc(n.x)}</p>${n.how ? `<ol class="np-how">${n.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</div>`).join('')}<div class="row"><button class="btn" data-a="close">Fertig</button></div></div>`); (S.newsRead = [...new Set([...(S.newsRead || []), ...newsAll().map(n => n.id)])]); commit(); },
  dswipe(el) { const id = el.dataset.id, yes = el.dataset.v === 'yes'; swipeSet(id, yes ? 'yes' : 'no'); toast(yes ? '💚 Bleibt im Kochbuch' : '👋 Aussortiert'); if (!deck().length) { toast('✓ Alle neuen Rezepte sortiert'); if (ui.sub === 'swipe') { ui.sub = null; render(); } } },
  dundo() { const id = ui.lastSwipe; if (!id) return; swipeSet(id, null); toast('↶ Zurück im Stapel'); },
  ktabgo(el) { ui.tab = 'ruhe'; ui.qtab = 'kochbuch'; ui.rid = null; ui.ktab = el.dataset.v; render(); scrollTo(0, 0); },
  vorratdelm(el) { useGroup(el.dataset.id); closeModal(); commit(true); },
  cnext() { ui.cstep++; render(); },
  cingall() { ui.cingAll = !ui.cingAll; render(); },
  cprev() { ui.cstep = Math.max(0, ui.cstep - 1); render(); },
  cookstop() { endCookMode(); render(); },
  steptimer(el) { const r = recipeById(ui.rid), i = el.dataset.i != null ? +el.dataset.i : ui.cstep, [, m] = cookSteps(r, sidesOf())[i]; phoneTimer(m); },
  cooktimer() { A.steptimer({ dataset: {} }); },
  cookdone(el) {   // el = the button; without = redrawn after the 📷 photo
    const r = recipeById(ui.rid); if (el) ui.dishShot = null;
    const shot = ui.dishShot && allDishPics().find(x => x.id === ui.dishShot);
    modal(`<h2>Guten Appetit! ${r.icon}</h2>${shot ? `<img class="dishpic dishpop" data-dish="${esc(shot.id)}" alt=""><p class="muted" style="margin:4px 0 0">📷 Foto ist im Rezept</p>` : `<label class="btn blue wide" style="margin:2px 0 4px">📷 Foto vom Essen<input type="file" accept="image/*" capture="environment" data-ch="dishadd" data-id="${esc(r.id)}" hidden></label>`}<p>Wie hat’s geschmeckt?</p><div class="row">${K.TASTE.map(([e, l, v]) => `<button class="btn soft" data-a="taste" data-v="${v}" style="font-size:16px">${e}<br>${l}</button>`).join('')}</div>`, '', !!shot);
    loadDishPics();
  },
  taste(el) {
    const r = recipeById(ui.rid), v = +el.dataset.v, c = S.cook[r.id] || { n: 0 };
    S.cook[r.id] = { n: c.n + 1, last: today(), taste: v };
    (S.cookLog = S.cookLog || []).push({ id: uid(), rid: r.id, title: r.title, icon: r.icon, day: today(), ts: Date.now(), taste: v });
    if (G.isCake(r.id)) gbReconcile();   // 🎂 the first cake ends the event: +5 ⭐ each
    let qc = null;   // ✅ "Schon gekocht": what it used leaves the Vorrat now (cooking mode did that at its start)
    if (ui.quick) { ui.quick = false; S.dishes = (S.dishes || []).filter(x => x.id !== r.id); qc = consumeFor(r); }
    endCookMode(); closeModal();
    // the "Kochen" chore on today's page counts as done
    const k = S.items.find(i => i.where === 'heute' && i.chore && ((S.chores.find(x => x.id === i.chore) || {}).tools || []).includes('recipes'));
    ui.rid = null; ui.sides = [];
    if (k) tick(k.id, null); else commit();
    const pl = planNow(), planned = pl && today() <= pl.end && pl.days.includes(r.id) ? ' · 🗓️ im Wochenplan abgehakt' : '';
    toast((v === 3 ? 'Notiert: Lieblingsessen 😍 – kommt öfter dran' : v === 1 ? 'Notiert 😕 – das schlage ich nicht mehr vor' : 'Notiert 🙂') + planned);
    gbParty();
    if (qc) {
      if (qc.taken.length || qc.ask.length) commit(true);
      if (qc.taken.length) setTimeout(() => toast('🧊 Aus dem Vorrat: ' + qc.taken.join(', ')), 2700);
      if (qc.ask.length) askVorrat(qc.ask);
    }
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
  picnic() { ui.picShown = false; ui.picOpen = null; if (picLS.tok) picSearchAll(); else { ui.pic = { step: 'login' }; picModal(); } },
  async piclogin() {
    const email = $('#pic-mail').value.trim(), password = $('#pic-pw').value;
    if (!email || !password) { ui.pic.msg = 'E-Mail und Passwort, bitte.'; return picModal(); }
    Object.assign(ui.pic, { busy: true, msg: '' }); picModal();
    try {
      picLS.tok = '';
      const r = await pic('/login', { email, password });
      if (r.need2fa) { ui.pic = { step: 'code', msg: await picSend() }; return picModal(); }
      picSearchAll();
    } catch (e) { Object.assign(ui.pic, { busy: false, step: 'login', msg: e.auth ? 'E-Mail oder Passwort stimmt nicht.' : 'Hat nicht geklappt: ' + e.message }); picModal(); }
  },
  async picresend() { Object.assign(ui.pic, { busy: true, msg: '' }); picModal(); ui.pic = { step: 'code', msg: await picSend() || 'Neuer Code ist unterwegs.' }; picModal(); },
  async picverify() {
    const otp = $('#pic-otp').value.trim(); if (!otp) return;
    Object.assign(ui.pic, { busy: true, msg: '' }); picModal();
    try { const r = await pic('/2fa/verify', { otp }); if (!r.ok) throw new Error('Code stimmt nicht'); picSearchAll(); }
    catch (e) { Object.assign(ui.pic, { busy: false, step: e.auth ? 'login' : 'code', msg: e.auth ? 'Bitte nochmal anmelden.' : e.message }); picModal(); }
  },
  picmore(el) { ui.pic.rows[+el.dataset.v].more = true; picModal(); },
  async picq(el) {
    const i = +el.dataset.v, r = ui.pic.rows[i], q = ($('#pic-q-' + i) || {}).value.trim(); if (!q) return;
    try {
      const hits = await pic('/search?q=' + encodeURIComponent(q));
      if (!hits.length) { toast('Auch für „' + q + '“ nichts bei Picnic'); return; }
      Object.assign(r, { hits, q, pick: hits[0], skip: false, more: false }); ui.picOpen = i;
      picLS.q = Object.assign(picLS.q, { [Sh.norm(itemName(r.x))]: q });   // her word for it, next time first
      picModal();
    } catch (e) { picFail(e); }
  },
  picdeliv() { picDelivModal(); },
  picskip(el) { const i = +el.dataset.v, r = ui.pic.rows[i]; if (r.extra) { ui.pic.rows.splice(i, 1); ui.picOpen = null; } else r.skip = !r.skip; picModal(); },
  picn(el) { const r = ui.pic.rows[+el.dataset.v]; r.n = Math.max(1, Math.min(PIC_MAX, (r.n || 1) + +el.dataset.d)); r.nSet = true; picModal(); },
  picsort(el) {   // a second kind of the same thing (two sorts of apples): an own row now, an own list entry once it's in the cart
    const i = +el.dataset.v, r = ui.pic.rows[i], taken = new Set(ui.pic.rows.filter(y => y.x.id === r.x.id && y.pick).map(y => y.pick.id));
    const pick = r.hits.find(h => !taken.has(h.id)) || r.hits[0];
    ui.pic.rows.splice(i + 1, 0, { x: r.x, extra: true, hits: r.hits, q: r.q, pick, n: 1, skip: false, more: false });
    ui.picOpen = i + 1; picModal();
  },
  picback() { ui.pic.step = 'match'; ui.pic.sure = false; picModal(); },
  picsure() { ui.pic.sure = true; ui.pic.step = 'match'; A.picgo(); },
  picopen(el) { ui.picOpen = ui.picOpen === +el.dataset.v ? null : +el.dataset.v; picModal(); },
  picpick(el) { const r = ui.pic.rows[+el.dataset.v]; r.pick = r.hits[+el.dataset.k]; r.skip = false; if (!r.nSet) r.n = picN(r.x, r.pick); ui.picOpen = null; picModal(); },
  async picgo() {
    const todo = ui.pic.rows.filter(r => r.pick && !r.skip), map = picLS.map;
    if (!ui.pic.sure && picWorry().length) { ui.pic.step = 'check'; return picModal(); }   // 12× Milch or 150 €: one look before the cart
    ui.pic.busy = true; picModal();
    let added = 0;
    try {
      for (const r of todo) {
        for (let n = r.n || 1; n > 0; n -= 20) await pic('/add', { id: r.pick.id, n: Math.min(20, n) });   // the worker takes 20 at a time
        added++; if (!r.extra) map[Sh.norm(itemName(r.x))] = r.pick;
      }
      picLS.map = map;
      let inCart = null; try { inCart = new Set((await pic('/cart')).items.map(a => String(a.id))); } catch (e) { if (e.auth) throw e; }   // read back what really landed
      const bad = [], nf = [], now = Date.now(), byId = id => S.shop.find(y => y.id === id), sum = picSum();
      for (const r of ui.pic.rows) {
        const x0 = byId(r.x.id); if (!x0) continue;
        if (!r.hits || !r.hits.length) { if (!r.skip) { x0.nopic = true; nf.push(itemName(x0)); } continue; }
        delete x0.nopic;
        if (!r.pick || r.skip) continue;
        const ok = !inCart || inCart.has(String(r.pick.id));
        if (!ok) { bad.push(itemName(x0) + (r.extra ? ' (' + r.pick.name + ')' : '')); continue; }
        let x = x0;
        if (r.extra) {   // the second sort gets its own list entry right under the first, so the delivery can tick it off on its own
          x = { id: uid(), text: itemName(x0), qty: null, done: false, ...(x0.sec ? { sec: x0.sec } : {}), ...(x0.from ? { from: x0.from } : {}) };
          S.shop.splice(S.shop.indexOf(x0) + 1 + S.shop.filter(y => y.sortOf === x0.id).length, 0, Object.assign(x, { sortOf: x0.id }));
        }
        x.pic = { id: r.pick.id, name: r.pick.name, ts: now, ...(r.n > 1 ? { n: r.n } : {}) };
      }
      commit(true);
      ui.pic = { step: 'done', added: added - bad.length, bad, nf, checked: !!inCart, sum }; picModal();
    } catch (e) { picLS.map = map; ui.pic = { step: e.auth ? 'login' : 'done', added, msg: e.auth ? 'Bitte nochmal anmelden.' : `Nach ${added} Sachen hat's gehakt: ${e.message}` }; picModal(); }
  },
  picapp() { closeModal(); location.href = picnicAppLink(); },
  piclogout() { picLS.tok = ''; ui.pic = { step: 'login' }; picModal(); toast('Von Picnic abgemeldet'); },
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
  // ---------- 🛋️ Entspannen ----------
  rxsize(el) { ui.rx = { size: el.dataset.v, en: null, cur: null, skip: [] }; render(); },
  rxen(el) { ui.rx.en = el.dataset.v; ui.rx.cur = null; ui.rx.skip = []; render(); },
  rxback() { const rx = ui.rx; if (rx.en) rx.en = null; else rx.size = null; rx.cur = null; rx.skip = []; render(); },
  rxnext() { const rx = ui.rx; if (rx.cur) rx.skip.push(rx.cur); rx.cur = null; render(); },
  rxhome(el) { closeModal(); ui.tab = 'ruhe'; ui.qtab = 'relax'; ui.rx = { size: el.dataset.v, en: null, cur: null, skip: [] }; render(); scrollTo(0, 0); },
  rxpick(el) { const x = ritualById(el.dataset.id); if (!x) return; ui.rx = { size: x.size, en: ui.rx.en || 'o', cur: x.id, skip: [] }; render(); scrollTo(0, 0); },
  rxstart(el) { const x = ritualById(el.dataset.id); if (!x) return; S.ritual = { id: x.id, mini: false, done: [] }; commit(); scrollTo(0, 0); },
  rxgo(el) { const id = ui.rx.cur; if (!id) return; S.ritual = { id, mini: el.dataset.mini === '1', done: [] }; ui.rx = { size: null, en: null, cur: null, skip: [] }; commit(); scrollTo(0, 0); },
  rxstep(el) { const i = +el.dataset.i, d = S.ritual.done || (S.ritual.done = []); d[i] = !d[i]; commit(); },
  rxstop() { S.ritual = null; commit(); },
  rxdone(el) {
    const x = ritualById(S.ritual.id), id = S.ritual.id;
    if (x) { S.log.push({ id: uid(), text: rxP(x.title) + (S.ritual.mini ? ' (Mini)' : ''), kind: 'rest', day: today(), ts: Date.now(), stars: E.STARS, ritual: id }); earn(E.STARS); floatStar(el, '+' + E.STARS + ' ⭐'); }
    S.ritual = null; commit(); confetti(40);
    setTimeout(() => rateRitual(id), 700);
  },
  rxrate(el) { S.relaxRate = Object.assign({}, S.relaxRate, { [el.dataset.id]: +el.dataset.v }); closeModal(); commit(); toast(+el.dataset.v === 3 ? 'Gemerkt – kommt öfter dran 😍' : +el.dataset.v === 1 ? 'Okay, kommt seltener dran.' : 'Danke 💛'); },
  rxplan() {
    const x = ritualById(ui.rx.cur); if (!x) return;
    S.items.push({ id: uid(), text: '✨ ' + rxP(x.title), where: 'liste', created: Date.now() });
    ui.rx.skip.push(x.id); ui.rx.cur = null; commit(); toast('Steht auf deiner Liste – zum Planen, wenn du magst. 📋');
  },
  rxown(el) { ownRitualForm(el.dataset.id); },
  rxfi(el) { ui.rxForm.icon = el.dataset.v; document.querySelectorAll('.rx-icons .chip').forEach(b => b.classList.toggle('on', b === el)); },
  rxfs(el) { ui.rxForm.size = el.dataset.v; el.parentNode.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === el)); },
  rxfe(el) { const f = ui.rxForm, k = el.dataset.v; f.en = f.en.includes(k) ? f.en.replace(k, '') : f.en + k; el.classList.toggle('on', f.en.includes(k)); },
  rxownsave() {
    const f = ui.rxForm, title = $('#rx-title').value.trim();
    if (!title) { $('#rx-title').focus(); return; }
    const steps = $('#rx-steps').value.split('\n').map(t => t.trim()).filter(Boolean);
    const x = { id: f.id || 'my-' + uid(), icon: f.icon, title, size: f.size, en: f.en || 'pof', steps };
    S.myRituals = (S.myRituals || []).filter(r => r.id !== x.id).concat(x);
    closeModal(); commit(); toast(f.id ? 'Geändert 💛' : 'Gespeichert – kommt jetzt öfter dran 💛');
  },
  rxowndel(el) {
    if (el.dataset.sure !== '1') { el.dataset.sure = '1'; el.textContent = '?'; el.classList.add('warn'); setTimeout(() => { if (el.isConnected) { el.dataset.sure = ''; el.textContent = '✕'; el.classList.remove('warn'); } }, 2500); return; }
    S.myRituals = (S.myRituals || []).filter(r => r.id !== el.dataset.id); if (S.ritual && S.ritual.id === el.dataset.id) S.ritual = null; commit();
  },


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
  stars() { modal(`<h2>Gute Nudel Sterne</h2><p>⭐ 1 pro erledigter Aufgabe (bis ${C.CAP} am Tag)<br>${babyLive() ? '🍼 1 pro Haken bei der Babyerstausstattung – für euch beide, ohne Tageslimit<br>' : ''}⭐ 2 fürs Genießen eines Gemütlichkeits-Rezepts, einer fertigen Vorbereitung oder einer Belohnung nach der Hausarbeit</p><p>Ausgeben kannst du sie bei <b>Schätze</b>.</p><div class="row"><button class="btn" data-a="go" data-tab="schaetze">Zu den Schätzen</button></div>`); },
});
