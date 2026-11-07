// Shared with the partner: the shopping list merge, the post (handed-over tasks, stats, Termine, Vorrat), quantities,
// the Vorrat, syncPost(), earning stars, and the thank-you when the partner finished a handed-over task.
import * as Sh from './shop.js';
import * as D from './data.js';
import * as Car from './car.js';
import * as G from './geburtstag.js';
import { closeModal, commit, confetti, esc, modal, toast, today, uid } from './core.js';
import { A, S, ui } from './state.js';
import { picCheer, picLS } from './einkauf.js';
import { isPantry, vMatch } from './kochbuch.js';
import { retryDish, retryInbox, syncBook } from './recipes.js';
import { carDay, carDayLabel, carRange, isCar, newForMe } from './termine.js';
import { myStats } from './home.js';
import { babyParty, babyReconcile, gbParty, gbReconcile, snParty, snReconcile } from './events.js';
import * as SN from './snacks.js';

// ---------- the shared shopping list (2026-10-19.5) ----------
// Both phones keep the whole list in S.shop and post it (+ what they deleted, S.shopGone) in their post file; reading the
// partner's post joins by id: the newer edit (x.u) wins, a deletion on either side wins. No per-place bookkeeping: commit()
// compares the list with the last commit (shopSnap) and stamps what changed here. A changed entry whose u also changed came
// from outside (own other device / partner) and keeps its stamp.
// The snapshot belongs to one S: when S is replaced as a whole (load, setup link, other device adopted) it is taken anew,
// never compared, so nothing that merely isn't in the new S counts as deleted.
let shopSnap = null, shopSnapOf = null;
const shopKey = x => { const { u, ...r } = x; return JSON.stringify(r); };
export const shopSnapNow = () => { shopSnapOf = S; shopSnap = new Map((S.shop || []).map(x => [x.id, { k: shopKey(x), u: x.u || 0 }])); };
export function shopStamp() {
  if (!shopSnap || shopSnapOf !== S) { shopSnapNow(); return false; }
  const now = Date.now(), here = new Set(), gone = new Set((S.shopGone || []).map(g => g.id)); let ch = false;
  for (const x of S.shop) {
    here.add(x.id);
    const o = shopSnap.get(x.id), k = shopKey(x);
    if (!o) { if (!x.u) x.u = now; ch = true; }
    else if (o.k !== k) { if ((x.u || 0) === o.u) x.u = now; ch = true; }
  }
  for (const id of shopSnap.keys()) if (!here.has(id)) { ch = true; if (!gone.has(id)) S.shopGone = (S.shopGone || []).concat({ id, ts: now }); }
  if (ch) S.shopGone = (S.shopGone || []).filter(g => now - g.ts < 60 * 864e5).slice(-500);
  shopSnapNow();
  return ch;
}
function shopMerge(p) {
  if (!p || !Array.isArray(p.items)) return false;
  const mine = new Set((S.shopGone || []).map(g => g.id)), theirs = new Map((p.gone || []).map(g => [g.id, g.ts]));
  let ch = false;
  const kept = S.shop.filter(x => !theirs.has(x.id));
  if (kept.length !== S.shop.length) {
    S.shopGone = (S.shopGone || []).concat([...theirs].filter(([id]) => !mine.has(id) && S.shop.some(x => x.id === id)).map(([id, ts]) => ({ id, ts })));
    S.shop = kept; ch = true;
  }
  for (const y of p.items) {
    if (!y || !y.id || mine.has(y.id) || theirs.has(y.id)) continue;
    const i = S.shop.findIndex(x => x.id === y.id);
    if (i < 0) { S.shop.push(y); ch = true; }
    else if ((y.u || 0) > (S.shop[i].u || 0) && shopKey(y) !== shopKey(S.shop[i])) { S.shop[i] = y; ch = true; }
  }
  return ch;
}

// ---------- handing tasks to the partner ----------
// what the partner is called on THIS phone: own nickname, else the name they chose (her phone: "Hase" by default)
export const pn = () => S.partnerNick || (S.partnerNick === undefined && D.me() === 'stand' ? 'Hase' : '') || S.partnerName || 'Partner';
const MONTH = 30 * 864e5;
export function postObj() { // what the partner reads: my handed-over tasks and my answers to theirs
  return {
    me: D.me(), name: S.name, ts: Date.now(),
    out: S.sent.filter(x => x.status !== 'weg' && Date.now() - x.ts < MONTH).map(({ id, text, today, ts, list }) => ({ id, text, today, ts, ...(list ? { list } : {}) })),
    withdrawn: S.sent.filter(x => x.status === 'weg').map(x => x.id),
    car: Car.raw(S.car),
    thanks: (S.thanks || []).filter(t => Date.now() - t.ts < MONTH),
    stats: myStats(),
    vorrat: vorratPost(),
    shop: { items: S.shop, gone: (S.shopGone || []).filter(g => Date.now() - g.ts < MONTH) },
    cooked: (S.cookLog || []).slice(-300),
    dishPics: (S.dishPics || []).filter(x => x.up).slice(-300),   // 📷 photos of the cooked dishes (the files: gerichte/<id>.jpg)
    baby: S.babyMine || {},
    ...(picLS.tok ? { pic: S.picNext || null } : {}),
    plan: S.plan || null,   // 🗓️ the Wochenplan, the newer `u` wins on both phones   // the Picnic slot, only from a phone that's logged in to Picnic
    replies: Object.entries(S.answered).filter(([, a]) => Date.now() - a.ts < MONTH).map(([id, a]) => ({ id, ...a })),
  };
}
// 🧊 Vorrat (shared, 2026-10-08): "Alles eingekauft!" puts the bought things in; cooking (or ✕) takes them out.
// Each phone only posts its own adds + uses (post/<me>.json → vorrat), the fridge = both adds minus both uses. Claude reads it too.
const VDAY = 864e5;
export const parseQty = Sh.parseQty;   // "500 g", "2 Dosen" → {n, unit, label} (moved to shop.js 2026-10-30 so naehr.js and the tests share it)
export const qtyOk = (a, b) => !!(a && b && a.unit === b.unit);
export function fmtQty(q) {
  if (!q) return '';
  const num = x => String(Math.round(x * 100) / 100).replace('.', ',');
  if (q.unit === 'g') return q.n >= 1000 ? num(q.n / 1000) + ' kg' : num(q.n) + ' g';
  if (q.unit === 'ml') return q.n >= 1000 ? num(q.n / 1000) + ' l' : num(q.n) + ' ml';
  if (q.unit === 'stk') return num(q.n) + (q.n === 1 ? ' Stück' : ' Stück');
  return num(q.n) + ' ' + (q.label || q.unit);
}
// "500 g Nudeln", "Nudeln 500 g", "Nudeln (500 g)" → {name, qty}
export function splitAmount(t) {
  t = String(t || '').trim();
  let m = t.match(/^(.*\S)\s*\(([^)]*)\)\s*$/);
  if (m && parseQty(m[2])) return { name: m[1].trim(), qty: parseQty(m[2]), raw: m[2] };
  m = t.match(/^((?:ca\.\s*)?[\d½¼¾⅓⅔][\d½¼¾⅓⅔.,\-–\s]*(?:\s*[A-Za-zÄÖÜäöüß]+\.?)?)\s+(.+)$/);
  if (m && parseQty(m[1]) && /^(g|gramm|kg|ml|l|liter|cl|dl|stück|stk|dosen?|scheiben?|packungen?|pck|becher|bund|beutel|gläser|glas|flaschen?|el|tl|zehen?|kopf|köpfe)\.?$|^\d/i.test(m[1].trim().split(/\s+/).pop())) return { name: m[2].trim(), qty: parseQty(m[1]), raw: m[1].trim() };
  m = t.match(/^(.*\S)\s+(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|stück|stk|dosen?|scheiben?|packungen?)\.?)$/i);
  if (m && parseQty(m[2])) return { name: m[1].trim(), qty: parseQty(m[2]), raw: m[2] };
  return { name: t, qty: null };
}
export const itemName = x => x.qty !== undefined ? x.text : splitAmount(x.text).name;          // older entries kept the amount in the text
export const itemQty = x => x.qty !== undefined ? x.qty : splitAmount(x.text).qty;

// the Vorrat: adds (with the amount bought) and use records from both phones. A use record is {id, item, ts} = all gone,
// {…, amt} = that much taken, {…, set} = "now there's this much" (corrected by hand / answered when cooking).
// (older records were {id: <item id>, ts} = all gone)
// one Picnic delivery = one set in the Vorrat: when both phones moved the same delivery in (2026-10-20: both opened the app
// in the same minute and everything was there twice), only the person who added it first counts — same answer on both phones
export const vorratAdds = () => [...(S.vorratAdd || []), ...((S.partnerVorrat || {}).add || [])].filter(Boolean);
export function picOwners(adds) {
  const o = {};
  for (const x of adds) {
    if (!x.pic) continue;
    const b = o[x.pic], by = x.by || '', ts = x.ts || 0;
    if (!b || ts < b.ts || (ts === b.ts && by < b.by)) o[x.pic] = { ts, by };
  }
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.by]));
}
export function vorrat() {
  const uses = [...(S.vorratUsed || []), ...((S.partnerVorrat || {}).used || [])].filter(Boolean).sort((a, b) => (a.ts || 0) - (b.ts || 0)), seen = new Set(), out = [];
  const adds = vorratAdds(), owner = picOwners(adds);
  for (const x of adds.sort((a, b) => (a.ts || 0) - (b.ts || 0))) {
    if (!x.id || seen.has(x.id)) continue; seen.add(x.id);
    if (x.pic && owner[x.pic] !== (x.by || '')) continue;   // the other phone's copy of the same delivery
    let left = itemQty(x), gone = false;
    if (left && left.unit === 'er') left = { n: left.n, unit: 'stk' };   // Picnic "10er" eggs, stored before 2026-10-30
    for (const u of uses) {
      if ((u.item || u.id) !== x.id) continue;
      if (u.set) left = u.set;
      else if (u.amt) { if (qtyOk(left, u.amt)) left = { ...left, n: left.n - u.amt.n }; }
      else gone = true;
      if (left && left.n <= 1e-6) gone = true;
    }
    if (!gone) out.push({ ...x, name: itemName(x), left });
  }
  return out;
}
// one row per THING (2026-10-30, user: Salatgurke + Gurke, two Tomaten packs, old Sahne next to new): same thingKey = one group,
// amounts added up per unit. The group answers to its oldest item's id; using or setting it acts on all its items.
export function vorratGroups(V = vorrat()) {
  const by = new Map();
  for (const x of V) { const k = Sh.thingKey(x.name); if (!by.has(k)) by.set(k, []); by.get(k).push(x); }
  return [...by.values()].map(xs => {
    const per = {};
    for (const x of xs) if (x.left) per[x.left.unit] = per[x.left.unit] ? { ...per[x.left.unit], n: per[x.left.unit].n + x.left.n } : { ...x.left };
    const units = Object.values(per), name = xs.map(x => x.name).sort((a, b) => a.length - b.length)[0];
    return { id: xs[0].id, ids: xs.map(x => x.id), items: xs, name, q: xs.find(x => x.q) && xs.find(x => x.q).q,
      left: units.length === 1 && xs.every(x => x.left) ? units[0] : null, amounts: units };
  });
}
export const vGroup = id => vorratGroups().find(g => g.ids.includes(id));
export const groupQty = g => g.left ? fmtQty(g.left) : g.amounts.length ? g.amounts.map(fmtQty).join(' + ') : g.q || '';
// "all gone" / "now there's this much" for a whole group: the amount sits on the first item, the rest are used up
export function useGroup(id, extra) {
  const g = vGroup(id), ids = g ? g.ids : [id];
  if (extra && extra.set) { useRec(ids[0], extra); ids.slice(1).forEach(i => useRec(i)); } else ids.forEach(i => useRec(i));
}
const useRec = (item, extra = {}) => { (S.vorratUsed = S.vorratUsed || []).push({ id: uid(), item, ts: Date.now(), ...extra }); };
function useVorrat(ids) { ids.forEach(id => useRec(id)); }
function vorratPost() { // used-up things stay listed a while so the other phone sees them go; then they're forgotten
  const gone = new Set(vorrat().map(x => x.id)), last = new Map();
  [...(S.vorratUsed || []), ...((S.partnerVorrat || {}).used || [])].forEach(u => { const k = u.item || u.id; last.set(k, Math.max(last.get(k) || 0, u.ts || 0)); });
  return { add: (S.vorratAdd || []).filter(x => gone.has(x.id) || !last.has(x.id) || Date.now() - last.get(x.id) < 30 * VDAY), used: (S.vorratUsed || []).filter(u => Date.now() - u.ts < 45 * VDAY) };
}
// what a recipe takes out of the fridge. Amounts that fit (g, ml, Stück …) are taken off quietly; what can't be
// worked out (1 Packung vs 250 g, no amount) is asked after "Jetzt kochen" (user's choice). Staples (salt, oil …) never.
export function consumeFor(r) {
  const V = vorrat(), out = { taken: [], ask: [] }, done = new Set();
  const take = (x, need) => {
    if (done.has(x.id)) return; done.add(x.id);
    const rq = parseQty(need);
    if (need === true) { useRec(x.id); out.taken.push(x.name); return; }                    // Claude: "this item is used up"
    if (x.left && rq && qtyOk(x.left, rq)) { if (rq.n >= x.left.n - 1e-6) useRec(x.id); else useRec(x.id, { amt: rq }); out.taken.push(x.name + ' ' + fmtQty(rq)); return; }
    out.ask.push({ id: x.id, name: x.name, have: x.left ? fmtQty(x.left) : '', need: need || '' });
  };
  for (const u of r.uses || []) { const id = typeof u === 'string' ? u : u.id, x = V.find(y => y.id === id); if (x) take(x, typeof u === 'string' ? true : (u.q || true)); }
  // by name: the whole group of that thing (two Sahne packs → taken from the older one first, then the next)
  const G = vorratGroups(V);
  for (const [q, t] of r.ing || []) {
    if (!t || isPantry(t)) continue;
    const g = G.find(y => y.items.some(x => !done.has(x.id)) && vMatch(t, y.name)); if (!g) continue;
    const xs = g.items.filter(x => !done.has(x.id)), rq = parseQty(q || ''), fit = rq && xs.filter(x => qtyOk(x.left, rq));
    if (!fit || !fit.length) { xs.forEach(x => done.add(x.id)); out.ask.push({ id: xs[0].id, name: g.name, have: groupQty(g), need: q || '' }); continue; }
    let need = rq.n;
    for (const x of fit) {
      if (need <= 1e-6) break;
      done.add(x.id);
      if (need >= x.left.n - 1e-6) { useRec(x.id); need -= x.left.n; } else { useRec(x.id, { amt: { ...rq, n: need } }); need = 0; }
    }
    out.taken.push(g.name + ' ' + fmtQty(rq));
  }
  return out;
}
export function askVorrat(list) { // after "Jetzt kochen": how much is left of what couldn't be worked out?
  ui.vask = list;
  modal(`<div style="text-align:left"><h2 style="text-align:center">🧊 Was ist noch da?</h2><p class="muted" style="margin-top:0">Das konnte ich nicht ausrechnen:</p>
    ${list.map(a => `<div class="vask" data-id="${esc(a.id)}"><p style="margin:10px 0 6px"><b>${esc(a.name)}</b><br><span class="muted">${a.have ? 'im Vorrat: ' + esc(a.have) : 'ohne Menge im Vorrat'}${a.need ? ' · Rezept braucht ' + esc(a.need) : ''}</span></p>
      <div class="chips"><button class="chip" data-a="vask" data-id="${esc(a.id)}" data-v="gone">Alles weg</button><button class="chip" data-a="vask" data-id="${esc(a.id)}" data-v="keep">Noch was übrig</button></div>
      <form class="add" data-f="vaskset" data-id="${esc(a.id)}"><input name="t" placeholder="Noch übrig, z.B. 200 g" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Menge speichern">✓</button></form></div>`).join('')}
    <div class="row"><button class="btn soft" data-a="close">Später</button></div></div>`, '', true);
}
export function vaskDone(id) { ui.vask = (ui.vask || []).filter(a => a.id !== id); commit(true); if (ui.vask.length) askVorrat(ui.vask); else closeModal(); }
const RANK = { wartet: 0, ok: 1, nein: 1, erledigt: 2 };
let syncing = false;
export async function syncPost() {
  if (syncing || !D.canPost() || !navigator.onLine) return;
  syncing = true;
  syncBook(); retryInbox(); retryDish();   // the shared recipe book + photos still waiting for their upload
  try {
    const p = (await D.readPartnerPost()) || { out: [], replies: [] };
    if (p.me && p.me === D.me()) return;              // never treat my own mailbox as the partner's
    let changed = false; const back = [], took = [], done = [];
    if (p.name && p.name !== S.partnerName) { S.partnerName = p.name; changed = true; }
    const thx = (p.thanks || []).filter(t => t && t.id && !(S.thanksSeen || []).includes(t.id));
    if (thx.length) { S.thanksSeen = [...(S.thanksSeen || []), ...thx.map(t => t.id)].slice(-200); changed = true; }
    if ('pic' in p && JSON.stringify(p.pic) !== JSON.stringify(S.partnerPic || null)) { S.partnerPic = p.pic; changed = true; }
    if (p.stats && JSON.stringify(p.stats) !== JSON.stringify(S.partnerStats)) { S.partnerStats = p.stats; changed = true; }
    if (p.vorrat && JSON.stringify(p.vorrat) !== JSON.stringify(S.partnerVorrat)) { S.partnerVorrat = p.vorrat; changed = true; if (picCheer()) changed = true; }
    if (shopMerge(p.shop)) changed = true;
    if (p.plan && (p.plan.u || 0) > ((S.plan || {}).u || 0)) { S.plan = p.plan; changed = true; }
    if (p.cooked && JSON.stringify(p.cooked) !== JSON.stringify(S.partnerCooked)) { S.partnerCooked = p.cooked; changed = true; if (gbReconcile()) toast(`🎂 ${pn()} hat den Geburtstagskuchen gebacken · +${G.STARS} ⭐`); if (snReconcile()) toast(`🥜 Snack-Labor geschafft · +${SN.STARS} ⭐`); }
    if (p.dishPics && JSON.stringify(p.dishPics) !== JSON.stringify(S.partnerDishPics)) { S.partnerDishPics = p.dishPics; changed = true; }
    let babyNews = 0;
    if (p.baby && JSON.stringify(p.baby) !== JSON.stringify(S.partnerBaby || {})) { S.partnerBaby = p.baby; babyNews = babyReconcile().add; changed = true; }
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
    if (babyNews) toast(`🍼 ${pn()} hat ${babyNews === 1 ? 'eine Sache' : babyNews + ' Sachen'} für den kleinen Menschen abgehakt · +${babyNews} ⭐`);
    babyParty(); gbParty(); snParty();
    if (pulled.length) toast(pn() + ' hat zurückgenommen: ' + pulled.map(i => i.text).join(', '));
    if (back.length) modal(`<h2>Kommt zurück</h2><p>${esc(pn())} kann das gerade nicht übernehmen:</p><div style="text-align:left">${back.map(x => `<p><b>${esc(x.text)}</b><br><span class="muted">„${esc(x.reason)}“</span></p>`).join('')}</div><p class="muted">${back.length > 1 ? 'Die Aufgaben sind' : 'Die Aufgabe ist'} wieder auf deiner Liste.</p><div class="row"><button class="btn" data-a="close">Okay</button></div>`);
    else if (done.length) doneModal(done);
    else if (took.length) toast(pn() + ' übernimmt ' + (took.length === 1 ? '„' + took[0].text + '“' : took.length + ' Aufgaben') + ' 💛');
    if (fresh.length && !back.length) modal(`<h2>📅 Neuer Termin</h2><p>${esc(pn())} hat eingetragen:</p><div style="text-align:left">${fresh.map(b => `<p><b>${esc(b.note || 'Termin')}</b> · ${b.who === 'both' ? 'für euch beide' : 'für dich'}${isCar(b) ? ' · 🚗' : ''}<br><span class="muted">${esc(carDayLabel(carDay(b.start)))} · ${esc(carRange(b))}${Car.isSeries(b) ? ' · 🔁 ' + esc(Car.repLabel(b)) : ''}</span></p>`).join('')}</div><div class="row"><button class="btn" data-a="go" data-tab="termine">Zu den Terminen</button><button class="btn soft" data-a="close">Okay</button></div>`);
    thx.forEach((t, i) => setTimeout(() => flyEmoji(t.e, 26, pn() + ' sagt danke ' + t.e + (t.text ? '\nfür „' + t.text + '“' : '')), i * 4200));
  } catch (e) { console.warn('post', e); }
  finally { syncing = false; }
}
export function answerDone(item) { if (item.did) { S.answered[item.did] = { status: 'erledigt', ts: Date.now() }; return true; } return false; }
export function earn(n) { S.stars += n; S.earned += n; }


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
