// Gute Nudel – the entry module (index.html loads only this). Header, render(), tab chips, Android back button,
// event binding (click → A[data-a]), welcome, takeRemote/syncDevices/refresh, one-time FIXES, start(), window.__gn for tests.
// The rest lives in one module per screen/concern – see CODEMAP.md in the docs repo.
import * as C from './content.js';
import * as D from './data.js';
import * as Bk from './book.js';
import { $, closeModal, commit, esc, modal, toast, today } from './core.js';
import { A, S, setS, ui } from './state.js';
import { consumeFor, fmtQty, parseQty, postObj, shopSnapNow, splitAmount, syncPost, vorrat, vorratGroups } from './sync.js';
import { emblem, rankModal } from './rank.js';
import { choreDone, choreDue, rollover, scheduleChores } from './chores.js';
import { checkEvening, incomingCard, viewHeute, viewListe } from './heute.js';
import { HN_STOPS, hnLast, inQ, tabOfQ, viewHN, viewRuhe } from './daheim.js';
import { hydratePhotos, viewSchaetze } from './schaetze.js';
import { viewWoche } from './woche.js';
import { applyRestore, settings } from './settings.js';
import { picCheer, picDeliveries, picQueries } from './einkauf.js';
import { bookApi, endCookMode, isHerb, kidLevel, recipeById, searchHtml, seasonOf, vMatch, vrNew } from './kochbuch.js';
import { FORMS, backToList, loadDishPics, loadRecPhotos } from './recipes.js';
import { deck, game, viewHome, wireDeck } from './home.js';
import { planNow } from './wochenplan.js';
import { babyParty, babyReconcile, gbParty, gbReconcile, hnDeckClose } from './events.js';
import { mergeStates } from './merge.js';
import './faellig.js';   // due dates: fills A with duepick / snooze ...
import './actions.js';   // fills the action table A (exports nothing)

// ---------- header ----------
export function renderTop() {
  $('#starsn').textContent = S.stars;
  const rk = C.rankOf(S.earned); $('#rankbtn').innerHTML = emblem(rk.t, 34, ''); $('#rankbtn').title = rk.name + ' · ' + S.earned + ' ⭐ gesammelt';
  $('#top h1').innerHTML = 'Gute Nudel' + (S.name ? ' <span>' + esc(S.name) + '</span>' : '');
  const c = $('#cloud'), st = D.backup.status;
  c.className = st === 'ok' ? 'ok' : st === 'wait' ? 'wait' : st === 'bad' ? 'bad' : '';
  c.title = { ok: 'Gesichert', wait: 'Wird gleich gesichert', bad: 'Sicherung hat nicht geklappt', none: 'Sicherung nicht eingerichtet' }[st] || '';
  document.querySelectorAll('nav#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  $('#tabs [data-tab="heute"]').classList.toggle('dot', S.incoming.length > 0);
  $('#tabs [data-tab="home"]').classList.toggle('dot', S.incoming.length > 0 && ui.tab !== 'home');
}


// ---------- render ----------
const HTABS = [['heute', '📝 Heute'], ['liste', '📋 Liste']];
function viewHeuteTab() {
  const n = S.items.filter(i => i.where === 'liste').length;
  return `<div class="chips qtabs two">${HTABS.map(([k, l]) => `<button class="chip ${ui.htab === k ? 'on' : ''}" data-a="htab" data-v="${k}">${l}${k === 'liste' && n ? ' <span class="cnt">' + n + '</span>' : ''}</button>`).join('')}</div>` + incomingCard() + (ui.htab === 'liste' ? viewListe() : viewHeute());
}
const VIEWS = { home: viewHome, heute: viewHeuteTab, ruhe: viewRuhe, hello: viewHN, schaetze: viewSchaetze, woche: viewWoche };
// a tab opened without a chip (bottom bar, links) shows the chip it had last; Hello Nudel remembers across app starts
export function tabChip() {
  if (ui.tab === 'relax') { ui.tab = 'ruhe'; ui.qtab = 'relax'; return; }
  if (ui.tab === 'ruhe' || ui.tab === 'hello') ui.qtab = ui.lastQ[ui.tab] || (ui.tab === 'hello' ? hnLast() : 'haushalt');
}
export function render() {
  const focused = document.activeElement && document.activeElement.closest('form[data-f]');
  const refocus = focused && focused.dataset.f;
  if (ui.tab === 'liste') { ui.tab = 'heute'; ui.htab = 'liste'; }   // old links to the Liste tab
  if (ui.tab === 'termine') { ui.tab = 'ruhe'; ui.qtab = 'termine'; }   // Termine lives in Daheim since 2026-10-08
  if (ui.tab === 'relax') { ui.tab = 'ruhe'; ui.qtab = 'relax'; }   // Entspannen lives in Daheim since 2026-10-20
  if ((ui.tab === 'ruhe' || ui.tab === 'hello') && ui.sub !== 'hello') {
    if (ui.tab === 'hello' && !HN_STOPS.includes(ui.qtab)) ui.qtab = ui.lastQ.hello || hnLast();
    ui.tab = tabOfQ(ui.qtab); ui.lastQ[ui.tab] = ui.qtab;
    if (ui.tab === 'hello') try { localStorage.setItem('gn_hq', ui.qtab); } catch (e) {}
  }
  $('#main').innerHTML = VIEWS[ui.tab]();
  renderTop();
  loadRecPhotos(); loadDishPics();
  if (inQ('kochbuch') && ui.sub !== 'hello') Bk.mount(bookApi);
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
  if ($('#deck')) { hnDeckClose(); return; }
  if ($('#ov')) { closeModal(); return; }
  const v = $('.viewer'), st = $('#story');
  if (v) { v.remove(); return; }
  if (st) { st.remove(); render(); return; }
  if (inQ('kochbuch') && ui.rid) {
    if (ui.cstep != null) { endCookMode(); render(); return; }
    backToList(); return;
  }
  if (ui.sub === 'kuchen' && ui.rid) { if (ui.cstep != null) endCookMode(); else { ui.rid = null; ui.sides = []; } render(); scrollTo(0, 0); return; }
  if (ui.sub) { A.babyback(); return; }
  if (inQ('relax') && !S.ritual && ui.rx.size) { A.rxback(); return; }
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
  document.addEventListener('input', e => {   // recipe search: only the results redraw (the keyboard stays open)
    if (e.target.id !== 'rsearch') return;
    const had = !!ui.rq; ui.rq = e.target.value; const res = $('#rresults');
    if (!!ui.rq !== had) { render(); const i = $('#rsearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } else if (res) res.innerHTML = searchHtml();
  });
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
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.tab === 'heute') ui.htab = 'heute'; ui.tab = b.dataset.tab; ui.sub = null; tabChip(); render(); scrollTo(0, 0); });
  $('#cloud').addEventListener('click', settings);
  wireDeck();
  $('#refresh').addEventListener('click', refreshAll);
  $('#stars').addEventListener('click', A.stars);
  $('#rankbtn').addEventListener('click', rankModal);
  D.backup.listeners.add(renderTop);
  addEventListener('online', () => { syncDevices().then(() => D.flushBackup()); D.flushPost(); syncPost(); });
  setInterval(() => { if (document.visibilityState === 'visible') { syncDevices(); syncPost(); } }, 60000);
  setInterval(() => { if (document.visibilityState === 'visible') syncPost(); }, 90000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') D.flushBackup();
    else { if (rollover()) commit(); checkEvening(); syncPost(); syncDevices(); picDeliveries(); }
  });
  setTimeout(picDeliveries, 2500);
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


function takeRemote(remote, adopt, base) {
  setS(adopt ? Object.assign(D.freshState(), remote, { me: D.me() }) : mergeStates(S, remote, base)); shopSnapNow();
  const br = babyReconcile(); if (br.add + br.sub | gbReconcile()) S.updatedAt = Date.now();
  D.saveLocal(S);
  rollover(); scheduleChores(); render();
  toast(adopt ? '🔄 Auf dem neuesten Stand' : '🔄 Mit dem anderen Gerät zusammengeführt');
  babyParty(); gbParty();
  return S;
}
async function syncDevices() { await D.pull(S); }
// ↻ in the header (2026-10-08): first send up whatever waits on this phone, then fetch everything new
// (own other devices, the partner's post = handed-over tasks, Termine, the shared Vorrat, the recipe book), and a new app version
let refreshing = false;
async function refreshAll() {
  if (refreshing) return;
  if (!navigator.onLine) { toast('Kein Internet – später nochmal'); return; }
  refreshing = true; const b = $('#refresh'); b.classList.add('spin');
  try {
    if (D.canPost()) { S.postedStats = null; D.schedulePost(postObj(), 0); }
    D.scheduleBackup(S, 0);
    await Promise.all([D.flushBackup(), D.flushPost()]);
    await syncDevices(); await syncPost();
    const reg = window.__swreg; if (reg) { try { await reg.update(); } catch (e) {} }
    render();
    toast(D.backup.status === 'bad' ? '⚠️ Sicherung klappt gerade nicht: ' + (D.backup.err || 'Fehler') : '🔄 Auf dem neuesten Stand');
  } finally { refreshing = false; b.classList.remove('spin'); }
}

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

export async function start() {
  const fromLink = await setupFromLink();
  await D.restoreCfg();
  setS(await D.loadLocal());
  if (!S) setS(D.freshState());
  // whose data is on this phone? A different person's setup link (or an old phone that never noted it) must not
  // carry the other person's tasks over: start empty, the right person's backup is loaded below.
  if (fromLink && S.me !== D.me()) setS(D.freshState());
  else if (!S.me) S.me = D.me();
  else if (S.me !== D.me()) setS(D.freshState());
  S.me = D.me();
  // does this phone hold real save data? Decided BEFORE babyReconcile/gbReconcile add their own log entries,
  // otherwise a fresh phone looks "not empty" and never gets its backup back (2026-10-27 Julia's phone bug).
  const hadData = S.log.some(e => !/^(baby|gb)-/.test(e.id));
  shopSnapNow();   // from here on, what leaves the shopping list was deleted on this phone
  rollover();
  scheduleChores();
  babyReconcile(); gbReconcile();
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
      window.__swreg = reg;
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
      if (remote && (!remote.me || remote.me === D.me()) && !hadData && remote.updatedAt > S.updatedAt) { await applyRestore(remote); syncPost(); return; }
      // an empty phone must never push its empty state over the backup (a failed fetch also gives no remote)
      if (hadData) { D.scheduleBackup(S, 10); toast('Sicherung eingerichtet ✓'); }
      else toast('Sicherung: nichts zum Zurückholen gefunden');
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
window.__gn = { deck: () => deck(), seasonOf: r => seasonOf(r), kidLevel: r => kidLevel(r), recipeById: id => recipeById(id), vMatch: (a, b) => vMatch(a, b), vorratGroups: () => vorratGroups(), vorrat: () => vorrat(), vrNew: () => vrNew(), isHerb: r => isHerb(r), parseQty, splitAmount, fmtQty, goBack, rankOf: C.rankOf, mergeStates, syncDevices, get S() { return S; }, ui, render, commit, D, rollover, syncPost, scheduleChores, choreDue, choreDone, picDeliveries, picQueries, picCheer, postObj, consumeFor, searchHtml, planNow: () => planNow(), today: () => today() };
