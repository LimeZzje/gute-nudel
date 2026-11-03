// 📷 photographed recipes + ✏️ own recipes (upload inbox, book sync, recipe editor), photos of cooked dishes, FORMS.
import * as C from './content.js';
import * as K from './cookbook.js';
import * as D from './data.js';
import * as Bk from './book.js';
import { $, closeModal, commit, esc, floatStar, modal, pick, shortDate, toast, today, uid, workToday } from './core.js';
import { A, S, ui } from './state.js';
import { earn, parseQty, pn, splitAmount, useGroup, vaskDone } from './sync.js';
import { firstEmoji } from './chores.js';
import { afterWork, askMood } from './heute.js';
import { inQ } from './daheim.js';
import { shopModal } from './einkauf.js';
import { addToShop, archRecipes, kpage, ksec, origOf, protTag, recipeById, vorratRecipes, vrSeenAdd } from './kochbuch.js';
import { render } from './app.js';
import { readDue } from './faellig.js';

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
export async function syncBook() {
  const vb = await D.readVorratRezepte();
  if (vb) { const j = JSON.stringify(vb), was = vorratRecipes().map(r => r.id + r.ts).join(); if (j !== localStorage.getItem('gn_vbook')) { localStorage.setItem('gn_vbook', j); if (vorratRecipes().map(r => r.id + r.ts).join() !== was) render(); } }   // redraw only when something visible changed (a redraw can swallow a tap)
  const va = await D.readVorratArchiv();
  if (va) { const j = JSON.stringify(va); if (j !== localStorage.getItem('gn_varch')) { localStorage.setItem('gn_varch', j); if (inQ('kochbuch') && ui.cstep == null) render(); } }
  if (!S.vrSeen && localStorage.getItem('gn_varch') && localStorage.getItem('gn_vbook')) vrSeenAdd(archRecipes().map(r => r.id), true);
  const b = await D.readBook(); if (!b) return;
  const j = JSON.stringify(b); if (j === localStorage.getItem('gn_book')) return;
  localStorage.setItem('gn_book', j);
  const done = (S.recipeInbox || []).filter(x => !x.del && (b.recipes || []).some(r => r.inbox === x.id));
  if (done.length) {
    done.forEach(x => { x.del = true; });
    const rs = b.recipes.filter(y => done.some(x => x.id === y.inbox)), r = rs[0];   // "Ansehen" swipes through ALL new ones (data-ctx → ui.kctx; user 2026-10-26)
    commit(); modal(rs.length > 1
      ? `<h2>📖 ${rs.length} neue Rezepte im Kochbuch!</h2><p>Aus deinen Fotos, mit allen Zutaten:</p><p>${rs.map(y => `${esc(y.icon || '')} ${esc(y.title)}`).join('<br>')}</p><p class="muted">Zum Nächsten einfach weiterblättern.</p><div class="row"><button class="btn soft" data-a="close">Später</button><button class="btn" data-a="recipe" data-id="${esc(r.id)}" data-go="1" data-ctx="${esc(rs.map(y => y.id).join(','))}">Alle ansehen</button></div>`
      : `<h2>📖 Neu im Kochbuch!</h2><p><b>${esc(r.icon || '')} ${esc(r.title)}</b> – aus deinem Foto, mit allen Zutaten.</p><div class="row"><button class="btn soft" data-a="close">Später</button><button class="btn" data-a="recipe" data-id="${esc(r.id)}" data-go="1">Ansehen</button></div>`);
  } else render();
}
export function retryInbox() { (S.recipeInbox || []).filter(x => !x.del && !x.up).forEach(uploadInbox); }
// ✏️ own recipe (also: changing a photographed one = my own copy with the same id)
const parseIng = line => { const m = line.match(/^\s*((?:ca\.\s*)?[\d½¼¾⅓⅔.,/\-–\s]+(?:\s*(?:g|kg|ml|l|EL|TL|Prise|Prisen|Pck\.?|Päckchen|Packung|Dose|Dosen|Becher|Bund|Stück|Stk\.?|Scheiben?|Zehen?|Tasse|Tassen|cl|dl)\b\.?)?)\s+(.+)$/i); return m ? [m[1].trim(), m[2].trim()] : ['', line.trim()]; };
const parseStep = line => { const m = line.match(/(\d+)\s*(?:Min|Minuten)\b/i); return m ? [line.trim(), +m[1]] : [line.trim()]; };
function recipeModal() {
  const e = ui.re, cats = K.CATS;
  modal(`<div style="text-align:left"><h2 style="text-align:center">${e.id ? '✎ Rezept ändern' : '✏️ Eigenes Rezept'}</h2>
    <label class="field"><span>Name</span><input id="re-title" value="${esc(e.title)}" placeholder="z.B. Omas Linsensuppe" autocomplete="off"></label>
    <div class="chips">${cats.map(([k, l]) => `<button class="chip ${e.cat === k ? 'on' : ''}" data-a="recat" data-v="${k}">${l}</button>`).join('')}<button class="chip ${protTag(e) ? 'on' : ''}" data-a="reprot" aria-pressed="${protTag(e)}">💪 High Protein</button></div>
    <div style="display:flex;gap:10px"><label class="field" style="flex:1"><span>Symbol</span><input id="re-icon" value="${esc(e.icon)}" style="font-size:22px" autocomplete="off"></label>
      <label class="field" style="flex:1"><span>Minuten</span><input id="re-min" type="number" min="0" inputmode="numeric" value="${esc(e.min || '')}"></label>
      <label class="field" style="flex:1"><span>Für wie viele?</span><input id="re-serves" value="${esc(e.serves || '2')}" autocomplete="off"></label></div>
    <label class="field"><span>Zutaten – eine pro Zeile, Menge vorne (z.B. „200 g Feta“)</span><textarea id="re-ing" rows="7">${esc(e.ing.map(([q, t]) => (q ? q + ' ' : '') + t).join('\n'))}</textarea></label>
    <label class="field"><span>So geht’s – ein Schritt pro Zeile („20 Min.“ im Text = Timer)</span><textarea id="re-steps" rows="7">${esc(e.steps.map(([t]) => t).join('\n'))}</textarea></label>
    <label class="field"><span>Notiz (optional)</span><input id="re-note" value="${esc(e.note || '')}" autocomplete="off"></label>
    ${e.cat === 'haupt' ? `<p class="muted" style="font-weight:800;margin:12px 0 4px">Was ist schon auf dem Teller?</p><div class="chips">${Object.entries(K.PLATE).map(([k, [ic, l]]) => `<button class="chip ${e.plate[k] ? 'on' : ''}" data-a="replate" data-v="${k}">${ic} ${l}</button>`).join('')}</div>` : ''}
    <p class="muted" id="re-msg" style="color:var(--danger)"></p>
    <div class="row"><button class="btn soft" data-a="close">Abbrechen</button><button class="btn" data-a="resave">Speichern</button></div>
    ${e.id ? `<div class="row">${e.own && origOf(e.id) ? '<button class="btn soft" data-a="rereset">↺ Original zurück</button>' : ''}<button class="btn soft" data-a="redel" style="color:var(--danger)">${e.own && !origOf(e.id) ? 'Rezept löschen' : 'Für mich ausblenden'}</button></div>` : ''}</div>`, '', true);
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
  reprot() { reRead(); const t = ui.re.tags || []; ui.re.tags = protTag(ui.re) ? t.filter(x => x !== 'protein') : t.concat('protein'); recipeModal(); },   // 💪 a tag on top of the category
  replate(el) { reRead(); const k = el.dataset.v; ui.re.plate[k] = ui.re.plate[k] ? 0 : 1; recipeModal(); },
  resave() {
    reRead(); const e = ui.re, msg = $('#re-msg');
    if (!e.title) { msg.textContent = 'Wie heißt das Rezept?'; return; }
    if (!e.ing.length) { msg.textContent = 'Mindestens eine Zutat, damit die Einkaufsliste weiß, was sie braucht.'; return; }
    const id = e.id || 'own-' + uid();
    const keep = ['photo', 'pages', 'src', 'inbox', 'tags', 'fav', 'mini', 'level', 'promoted', 'by'].reduce((o, k) => (e[k] ? { ...o, [k]: e[k] } : o), e.id ? {} : { by: D.me() });   // a new own recipe: whose phone → its style
    const r = { id, cat: e.cat, title: e.title, icon: e.icon, min: e.min, serves: e.serves, ing: e.ing, steps: e.steps, note: e.note, ...(e.cat === 'haupt' ? { plate: e.plate } : {}), ...keep, ts: Date.now() };
    S.myRecipes = (S.myRecipes || []).filter(x => x.id !== id).concat([r]);
    closeModal(); ui.rid = id; ui.sides = []; ui.cstep = null; commit(); scrollTo(0, 0); toast('📖 Gespeichert');
  },
  rpromote(el) {   // a Claude Vorrat recipe she wants to keep for good → her own copy (same id: ratings stay), in the normal cookbook
    const r = recipeById(el.dataset.id); if (!r || !r.vr) return;
    const { vr, arch, trip, uses, ...keep } = r;
    S.myRecipes = (S.myRecipes || []).filter(x => x.id !== r.id).concat([{ ...keep, promoted: true, ts: Date.now() }]);
    commit(); toast('📖 Steht jetzt für immer im Kochbuch');
  },
  redel() {   // own recipe → gone; anything with an original → hidden for me (built-in, book, Vorrat)
    const e = ui.re, orig = origOf(e.id);
    S.myRecipes = (S.myRecipes || []).filter(x => x.id !== e.id);
    if (orig) S.hiddenRecipes = [...new Set([...(S.hiddenRecipes || []), e.id])];
    closeModal(); ui.rid = null; commit(); toast(orig ? 'Ausgeblendet' : 'Gelöscht');
  },
  rereset() { S.myRecipes = (S.myRecipes || []).filter(x => x.id !== ui.re.id); closeModal(); commit(); toast('↺ Original ist zurück'); },
});
A.rshotadd = async el => {
  ui.rnote = ($('#rp-note') || {}).value || '';
  for (const f of [...el.files].slice(0, 6)) { try { ui.rshots.push(await shrink(f)); } catch (e) { toast('Ein Bild ging nicht'); } }
  photoModal();
};
// ‹ back from a recipe = the list it came from, at the same spot; its row lights up (user 2026-11-01: Julia tapped
// "Kochen" again and scrolled back down). Pill on the page, Android back, and the own thumb tab all land here.
export function backToList() {
  const b = ui.kback, rid = ui.rid; ui.rid = null; ui.sides = [];
  const land = pg => {
    if (!pg) return;
    if (b && b.sec === ksec()) pg.scrollTop = b.top;
    const row = rid && pg.querySelector(`[data-a="recipe"][data-id="${CSS.escape(rid)}"]`); if (!row) return;
    const rr = row.getBoundingClientRect(), pr = pg.getBoundingClientRect();
    if (rr.top < pr.top || rr.bottom > pr.bottom) row.scrollIntoView({ block: 'center' });
    row.classList.add('flashrow'); setTimeout(() => row.classList.remove('flashrow'), 1800);
  };
  if (!Bk.flipTo(kpage({ sec: ksec() }), -1, land)) { render(); land($('#bkstage .bk-page.cur')); }
}
A.rback = () => backToList();
// 📷 photos of the cooked dish (user 2026-11-01): from the "Guten Appetit" popup or 📷 Foto on any recipe page. Every cooking can
// get one: newest = the big picture on top, older ones in a strip, each also on its day in "Gekocht". Mine: S.dishPics
// [{id, rid, day, ts, by, up}], parked on the phone until uploaded (gerichte/<id>.jpg, private repo), then posted to the partner.
export const allDishPics = () => { const seen = new Set(); return [...(S.dishPics || []), ...(S.partnerDishPics || [])].filter(x => x && !seen.has(x.id) && seen.add(x.id)).sort((a, b) => b.ts - a.ts); };
export const dishPicsOf = rid => allDishPics().filter(x => x.rid === rid);
const dishURLs = {};
async function dishURL(x) {
  if (dishURLs[x.id]) return dishURLs[x.id];
  const local = await loadShots('dish:' + x.id); if (local) return (dishURLs[x.id] = local);
  return x.up ? D.repoPhotoURL('gerichte/' + x.id + '.jpg') : null;
}
export function loadDishPics(root = document) {
  root.querySelectorAll('img.dishpic[data-dish]:not([src])').forEach(async img => { const x = allDishPics().find(y => y.id === img.dataset.dish), u = x && await dishURL(x); if (u) img.src = u; });
}
const dishUp = new Set();
async function uploadDish(x) {   // on failure it stays parked and is retried with the next sync
  if (!D.canPost() || !navigator.onLine || dishUp.has(x.id)) return false;
  dishUp.add(x.id);
  try {
    const d = await loadShots('dish:' + x.id); if (!d) return false;
    await D.putBinary('gerichte/' + x.id + '.jpg', d.split(',')[1], 'Foto vom Essen');
    const y = (S.dishPics || []).find(z => z.id === x.id); if (!y) return false;   // deleted meanwhile
    y.up = true; dropShots('dish:' + x.id); commit(true); return true;
  } catch (e) { console.warn('dish', e); return false; } finally { dishUp.delete(x.id); }
}
export function retryDish() { (S.dishPics || []).filter(x => !x.up).forEach(uploadDish); }
A.dishadd = async el => {
  const f = el.files && el.files[0], rid = el.dataset.id; if (!f || !rid) return;
  let d; try { d = await shrink(f, 1600); } catch (e) { toast('Das Bild ging nicht'); return; }
  const x = { id: uid(), rid, day: today(), ts: Date.now(), by: D.me(), up: false };
  if (!(await saveShots('dish:' + x.id, d))) { toast('Zu groß für den Handyspeicher'); return; }
  dishURLs[x.id] = d; (S.dishPics = S.dishPics || []).push(x);
  const pop = !!$('#ov') && ui.cstep != null;
  if (pop) { ui.dishShot = x.id; A.cookdone(); }   // the "Guten Appetit" popup shows it, rating still open
  commit();
  const up = await uploadDish(x);
  if (!up) toast('📷 Gespeichert – geht hoch, sobald Internet da ist'); else if (!pop) toast('📷 Foto ist im Rezept');
};
A.dishview = el => {   // full screen; ‹ › through this dish's photos, 🗑 for my own (tap twice)
  const x0 = allDishPics().find(y => y.id === el.dataset.id); if (!x0) return;
  const list = dishPicsOf(x0.rid); let i = Math.max(0, list.findIndex(y => y.id === x0.id)), sure = false;
  const v = document.createElement('div'); v.className = 'viewer';
  const show = async () => {
    const x = list[i], mine = x.by === D.me(), n = list.length > 1;
    v.innerHTML = `<button class="x" data-v="x" aria-label="Schließen">✕</button><img alt="Foto vom Essen"><div class="vbar">${n ? '<button data-v="-1" aria-label="Neueres">‹</button>' : ''}<span>${esc(shortDate(x.day))}${mine ? '' : ' · von ' + esc(pn())}</span>${n ? '<button data-v="1" aria-label="Älteres">›</button>' : ''}</div>${mine ? `<button class="vdel" data-v="del">${sure ? 'Wirklich löschen?' : '🗑 Foto löschen'}</button>` : ''}`;
    const u = await dishURL(x); if (u) v.querySelector('img').src = u;
  };
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    if (b.dataset.v === 'x') return v.remove();
    if (b.dataset.v === 'del') { if (!sure) { sure = true; return show(); } v.remove(); dishDel(list[i]); return; }
    sure = false; i = (i + +b.dataset.v + list.length) % list.length; show();
  });
  document.body.appendChild(v); show();
};
async function dishDel(x) {
  S.dishPics = (S.dishPics || []).filter(y => y.id !== x.id); dropShots('dish:' + x.id); commit(true); toast('Foto gelöscht');
  if (x.up) { try { await D.deleteFile('gerichte/' + x.id + '.jpg'); } catch (e) {} }
}
export function loadRecPhotos(root = document) { root.querySelectorAll('img.recphoto[data-photo]:not([src])').forEach(async img => { const u = await D.repoPhotoURL(img.dataset.photo); if (u) img.src = u; else img.remove(); }); }

const dueOf = form => { const d = readDue(form); return d ? { due: d } : {}; };   // optional due date from the add form
export const FORMS = {
  ingextra(t) { ui.ingExtra = (ui.ingExtra || []).concat(t.split(',').map(x => x.trim()).filter(Boolean)); render(); const i = document.querySelector('form[data-f="ingextra"] input'); if (i) i.focus(); },
  shopadd(t) { t.split(',').map(x => x.trim()).filter(Boolean).forEach(x => { const a = splitAmount(x); addToShop(a.name, a.qty, a.qty ? '' : '', null); }); commit(); shopModal(null, true); const i = document.querySelector('form[data-f="shopadd"] input'); if (i) i.focus(); },
  decline(t, form) {
    const id = form.dataset.id, x = S.incoming.find(y => y.id === id); if (!x) return;
    S.answered[id] = { status: 'nein', reason: t, ts: Date.now() }; S.incoming = S.incoming.filter(y => y !== x); ui.declining = null;
    commit(true); toast('Okay – ' + pn() + ' bekommt sie mit deiner Begründung zurück.');
  },
  addplan(t, form) { const it = { id: uid(), text: t, where: 'liste', created: Date.now(), ...dueOf(form) }; S.items.push(it); ui.picks.add(it.id); commit(); },
  addtoday(t, form) { S.items.push({ id: uid(), text: t, where: 'heute', created: Date.now(), ...dueOf(form) }); S.today.planned = true; commit(); },
  vorratadd(t) { S.vorratAdd = (S.vorratAdd || []).concat(t.split(',').map(x => x.trim()).filter(Boolean).map(x => { const a = splitAmount(x); return { id: uid(), text: a.name, qty: a.qty, ts: Date.now(), by: D.me() }; })); commit(true); },
  vorratset(t, form) { const id = form.dataset.id, q = parseQty(t) || (splitAmount('x ' + t).qty); if (!q) { toast('Menge nicht verstanden – z.B. „250 g“'); return; } useGroup(id, { set: q }); closeModal(); commit(true); },
  vaskset(t, form) { const id = form.dataset.id, q = parseQty(t); if (!q) { toast('Menge nicht verstanden – z.B. „200 g“'); return; } useGroup(id, { set: q }); vaskDone(id); },
  addlist(t, form) { S.items.push({ id: uid(), text: t, where: 'liste', created: Date.now(), ...dueOf(form) }); commit(); },
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
