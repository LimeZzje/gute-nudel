// Shopping list modal, Picnic cart (through the Worker), the phone timer, Vorrat list html, the cook modal.
import * as C from './content.js';
import * as Sh from './shop.js';
import * as D from './data.js';
import { $, commit, confetti, esc, modal, toast, uid } from './core.js';
import { S, ui } from './state.js';
import { fmtQty, groupQty, itemName, itemQty, parseQty, picOwners, pn, vorratAdds, vorratGroups } from './sync.js';
import { inQ } from './daheim.js';
import { hnUnwrapped } from './events.js';
import { render } from './app.js';

// ---------- helpers: shopping list, cookbook, music ----------
// Steps with a time: she sets her PHONE's timer (only that one rings with the screen off — a web app gets paused).
export function phoneTimer(mins) {
  const hm = mins >= 60 ? Math.floor(mins / 60) + ' Std. ' + (mins % 60 ? mins % 60 + ' Min.' : '') : mins + ' Minuten';
  modal(`<h2>⏰ Handy-Timer stellen</h2><p class="hand" style="font-size:44px;color:var(--accent);margin:4px 0">${hm}</p>
    <p>Stell dir jetzt am Handy einen Timer – der klingelt zuverlässig, auch wenn der Bildschirm aus ist.</p>
    <p class="muted" style="text-align:left">🗣️ Am schnellsten: <b>„Hey Google, Timer ${hm}“</b><br>⏱️ Oder: <b>Uhr-App → Timer</b></p>
    <div class="row"><button class="btn" data-a="close">Ist gestellt ✓</button></div>`);
}
// 🧺 Picnic (2026-10-18): fill her Picnic cart from the open list. Picnic blocks browser calls from other sites (CORS),
// so everything goes through our tiny Cloudflare Worker (E:\GuteNudel-picnic\worker, stores nothing). She logs in here once;
// the password is never stored – only Picnic's login token, on THIS phone (localStorage, not in S, so it never syncs).
// Her picks are remembered per item name (gn_picnic_map), so "Zwiebeln" finds the same product next time. Ordering stays in the Picnic app.
const PICNIC = localStorage.getItem('gn_picnic_api') || 'https://gute-nudel-picnic.gutenudel.workers.dev';   // tests point it at a fake worker
export const picLS = { get tok() { return localStorage.getItem('gn_picnic_tok') || ''; }, set tok(v) { v ? localStorage.setItem('gn_picnic_tok', v) : localStorage.removeItem('gn_picnic_tok'); },
  get map() { try { return JSON.parse(localStorage.getItem('gn_picnic_map') || '{}'); } catch { return {}; } }, set map(v) { localStorage.setItem('gn_picnic_map', JSON.stringify(v)); },
  get q() { try { return JSON.parse(localStorage.getItem('gn_picnic_q') || '{}'); } catch { return {}; } }, set q(v) { localStorage.setItem('gn_picnic_q', JSON.stringify(v)); },
  get done() { try { return JSON.parse(localStorage.getItem('gn_picnic_done') || '[]'); } catch { return []; } }, set done(v) { localStorage.setItem('gn_picnic_done', JSON.stringify(v.slice(-30))); } };
export async function pic(path, body) {
  const r = await fetch(PICNIC + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(picLS.tok ? { 'x-picnic-auth': picLS.tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = r.headers.get('x-picnic-auth'); if (t) picLS.tok = t;
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { picLS.tok = ''; throw Object.assign(new Error('auth'), { auth: true }); }
  if (!r.ok) throw new Error(j.error || 'Picnic antwortet nicht');
  return j;
}
// asks Picnic for the SMS code; '' = sent, otherwise what went wrong (shown under the code field)
export async function picSend() {
  try { const r = await pic('/2fa/send', {}); return r.ok ? '' : 'Picnic schickt keine SMS: ' + (r.error || 'Fehler ' + r.status); }
  catch (e) { return e.auth ? 'Picnic hat die Anmeldung abgelehnt – bitte Abbrechen und nochmal anmelden.' : 'SMS ging nicht raus: ' + e.message; }
}
// what Picnic's search understands, tried one after the other until something comes back: her own word for it (typed
// once in the row), the name as written, "Fond, Rind" → "Rinderfond", without container words ("Karton Milch" → "Milch"),
// and last the longest single word
const PIC_BOX = /(^|\s)(kasten|kiste|träger|sixpack|karton|packung|pck|pack|dose|dosen|glas|gläser|becher|flasche|flaschen|tüte|beutel|netz|schale|tetrapak)\.?(?=\s|$)/gi;
const PIC_PRE = { rind: 'Rinder', huhn: 'Hühner', hähnchen: 'Hähnchen', geflügel: 'Geflügel', gemüse: 'Gemüse', kalb: 'Kalbs', schwein: 'Schweine', fisch: 'Fisch', lamm: 'Lamm', wild: 'Wild', ente: 'Enten', pilz: 'Pilz' };
export function picQueries(name) {
  const base = String(name).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim(), parts = base.split(',').map(x => x.trim()).filter(Boolean);
  const comp = parts.length === 2 && PIC_PRE[parts[1].toLowerCase()] ? PIC_PRE[parts[1].toLowerCase()] + parts[0].toLowerCase() : '';
  const clean = parts.slice().reverse().join(' ').replace(PIC_BOX, ' ').replace(/\s+/g, ' ').trim();
  const longest = parts.join(' ').replace(PIC_BOX, ' ').trim().split(/\s+/).sort((a, b) => b.length - a.length)[0] || '';   // a tie goes to the main word (before the comma)
  return [...new Set([picLS.q[Sh.norm(name)], base, comp, clean, longest].filter(q => q && q.length > 1))];
}
async function picFind(name) {
  for (const q of picQueries(name)) { const hits = await pic('/search?q=' + encodeURIComponent(q)); if (hits.length) return { hits, q }; }
  return { hits: [], q: '' };
}
// €/kg or €/l, so 200 g and 500 g of the same Sahne can be compared
function picPer(h) {
  const m = String(h.unit || '').replace(',', '.').match(/^(?:(\d+)\s*x\s*)?(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/i);
  if (!m || typeof h.price !== 'number') return '';
  const k = m[3].toLowerCase(), amt = +(m[1] || 1) * +m[2] * { kg: 1000, g: 1, l: 1000, cl: 10, ml: 1 }[k];
  return amt ? euro(Math.round(h.price / amt * 1000)) + (k === 'g' || k === 'kg' ? '/kg' : '/l') : '';
}
// how many of the product (2026-10-19.4): from the list amount when it fits the pack ("2 kg Kartoffeln" + 1 kg bag → 2,
// "6 Eier" + 10er → 1), else 1. She changes it with − / +; at most PIC_MAX, so a slip can't put 100 Milch in the cart.
export const PIC_MAX = 30;
export function picN(x, p) {
  const want = itemQty(x), pack = p && picQty({ unit: p.unit, n: 1 });
  if (!want) return 1;
  if (pack && pack.unit === want.unit && pack.n) return Math.max(1, Math.min(PIC_MAX, Math.ceil(want.n / pack.n - 1e-9)));
  return !pack && want.unit === 'stk' ? Math.max(1, Math.min(PIC_MAX, Math.round(want.n))) : 1;
}
export const picSum = () => (ui.pic.rows || []).filter(r => r.pick && !r.skip).reduce((s, r) => s + (r.pick.price || 0) * (r.n || 1), 0);
// what makes the app ask once more before the cart: a big pile of one thing, or a big bill (with what was already in the cart)
const PIC_BIG = 15000, PIC_MANY = 10;
export function picWorry() {
  const w = [], P = ui.pic, total = picSum() + (P.cartTotal || 0);
  if (total >= PIC_BIG) w.push({ big: total });
  P.rows.filter(r => r.pick && !r.skip && r.n >= PIC_MANY).forEach(r => w.push({ r }));
  return w;
}
const picTotal = (r, n) => { const q = picQty({ unit: r.pick.unit, n }); return q && n > 1 ? ' = ' + fmtQty(q) : ''; };
// 🚚 Picnic deliveries, checked on THIS phone (where the token is) when the app opens: what's coming shows on Home
// (S.picNext); once Picnic says a delivery is COMPLETED, what came goes into the Vorrat by itself (tagged pic: <delivery>)
// and the matching shopping items leave the list. Only deliveries after this phone first looked (gn_picnic_since),
// so orders from before Gute Nudel don't flood the Vorrat. Picnic's delivery counts, not our cart (she may change it there).
let picDelivAt = 0;
// the next delivery for THIS person (2026-10-30, user: the time wasn't on his Home): own phone's if it's logged in to Picnic,
// else the partner's (post `pic`). Gone 3 h after the slot ends, in case nobody opened the app since.
export function picNow() {
  const n = picLS.tok ? S.picNext : S.partnerPic, end = n && Date.parse(n.end || n.start);
  return n && !isNaN(new Date(n.start)) && !(end && Date.now() > end + 3 * 36e5) ? n : null;
}
export async function picDeliveries(force) {
  if (!picLS.tok || (!force && Date.now() - picDelivAt < 10 * 60e3)) return;
  picDelivAt = Date.now();
  let since = +localStorage.getItem('gn_picnic_since') || 0;
  if (!since) { since = Date.now(); localStorage.setItem('gn_picnic_since', String(since)); }
  try {
    const list = await pic('/deliveries');
    let changed = false;
    const next = list.filter(d => d.status === 'CURRENT').sort((a, b) => String(a.start).localeCompare(String(b.start)))[0];
    const nx = next ? { id: next.id, start: next.start, end: next.end, eta: next.eta || null } : null;
    if (JSON.stringify(nx) !== JSON.stringify(S.picNext || null)) { S.picNext = nx; changed = true; }
    for (const d of list) {
      if (d.status !== 'COMPLETED' || picLS.done.includes(d.id) || !(Date.parse(d.at) > since)) continue;
      const had = [...(S.vorratAdd || []), ...((S.partnerVorrat || {}).add || [])].some(x => x && x.pic === d.id);
      if (!had) { const full = await pic('/delivery?id=' + encodeURIComponent(d.id)); picArrived(d, full.items || []); changed = true; }
      picLS.done = [...picLS.done, d.id];
    }
    if (changed) commit(true);
  } catch (e) { if (e.auth) render(); }   // quietly: a busy Picnic is no reason to bother her
}
const picQty = a => {
  const m = String(a.unit || '').match(/^(\d+)\s*x\s*(.+)$/i), q = parseQty(m ? m[2] : a.unit);
  return q ? { ...q, n: q.n * (m ? +m[1] : 1) * (a.n || 1) } : (a.n > 1 ? { n: a.n, unit: 'stk' } : null);
};
function picArrived(d, items) {
  const byId = new Map(Object.entries(picLS.map).map(([k, v]) => [v.id, k])), at = Date.parse(d.at) || Date.now(), gone = new Set();
  const add = items.map(a => {
    const sh = S.shop.find(x => !x.done && !gone.has(x.id) && x.pic && x.pic.id === a.id) || S.shop.find(x => !x.done && !gone.has(x.id) && byId.get(a.id) === Sh.norm(itemName(x)));
    if (sh) gone.add(sh.id);
    const k = byId.get(a.id), name = sh ? itemName(sh) : k ? k[0].toUpperCase() + k.slice(1) : a.name;
    return { id: uid(), text: name, qty: picQty(a), ts: Date.now(), by: D.me(), pic: d.id };
  });
  let miss = 0;
  S.shop.forEach(x => { if (!gone.has(x.id) && x.pic && x.pic.ts < at) { delete x.pic; miss++; } });   // was in the cart, didn't come: back on the list
  S.shop = S.shop.filter(x => !gone.has(x.id));
  S.vorratAdd = (S.vorratAdd || []).concat(add);
  if (add.length) try { localStorage.setItem('gn_hq', 'vorrat'); ui.lastQ.hello = 'vorrat'; } catch (e) {}
  if (add.length) { confetti(50); toast('📦 Picnic war da – ' + add.length + (add.length === 1 ? ' Sache' : ' Sachen') + ' im Vorrat' + (miss ? ` · ${miss} kam${miss === 1 ? '' : 'en'} nicht` : '')); }
  S.picCheered = [...new Set([...(S.picCheered || []), d.id])];
}
// 📦 the cheer for EACH person once per delivery (user: only the phone that moved it in cheered) — also when the partner's
// phone did it. Recent deliveries only (2 days), and none where this person's own phone added it (that one already cheered).
export function picCheer() {
  const adds = vorratAdds(), owner = picOwners(adds), seen = new Set(S.picCheered || []), me = D.me(), recent = Date.now() - 2 * 864e5;
  const mine = new Set(adds.filter(x => x.pic && x.by === me).map(x => x.pic)), n = {};
  for (const x of adds) if (x.pic && !seen.has(x.pic) && !mine.has(x.pic) && (x.ts || 0) > recent && owner[x.pic] === (x.by || '')) n[x.pic] = (n[x.pic] || 0) + 1;
  const ds = Object.keys(n); if (!ds.length) return false;
  const k = ds.reduce((a, d) => a + n[d], 0);
  confetti(50); toast('📦 Picnic war da – ' + k + (k === 1 ? ' Sache' : ' Sachen') + ' im Vorrat');
  S.picCheered = [...new Set([...(S.picCheered || []), ...ds])];
  return true;
}
const picWhen = (a, b) => {
  const s = new Date(a), e = new Date(b); if (isNaN(s)) return '';
  const hm = t => t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return s.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'numeric' }) + ', ' + hm(s) + (isNaN(e) ? '' : '–' + hm(e));
};
export function picDelivModal() {
  const n = picNow(); if (!n) return;
  const inCart = S.shop.filter(x => x.pic).length;
  modal(`<div style="text-align:center"><p style="font-size:44px;margin:4px 0">🚚</p><h2>Picnic kommt</h2>
    <p><b>${esc(picWhen(n.start, n.end))} Uhr</b></p>
    ${n.eta && n.eta.start ? `<p class="muted">Gerade geschätzt: ${esc(picWhen(n.eta.start, n.eta.end).split(', ')[1] || '')} Uhr</p>` : ''}
    <p class="muted">Wenn Picnic da war, kommt alles von selbst in den Vorrat${inCart ? ` – und die ${inCart} 🧺 Sachen von der Einkaufsliste werden abgehakt` : ''}.</p>
    <button class="btn green wide" data-a="picapp">📱 Picnic-App öffnen</button><div class="row"><button class="btn soft" data-a="close">Schön</button></div></div>`);
}
// opens the installed Picnic app (Android: intent with the app's own app.picnic:// links, Play Store if missing; iPhone: the scheme).
// Where exactly it lands (cart or start page) is up to the Picnic app.
export const picnicAppLink = () => /android/i.test(navigator.userAgent)
  ? 'intent://cart#Intent;scheme=app.picnic;package=com.picnic.android;S.browser_fallback_url=' + encodeURIComponent('https://play.google.com/store/apps/details?id=com.picnic.android') + ';end'
  : 'app.picnic://cart';
const euro = c => typeof c === 'number' ? (c / 100).toFixed(2).replace('.', ',') + ' €' : '';
export function picModal() {
  const P = ui.pic || {};
  let h = '<h2 style="text-align:center">🧺 Bei Picnic bestellen</h2>';
  if (P.step === 'login' || !picLS.tok && P.step !== 'code') {
    h += `<p class="muted" style="margin-top:0">Einmal mit deinem Picnic-Konto anmelden. Das Passwort wird nicht gespeichert – nur ein Anmelde-Schlüssel bleibt auf diesem Handy.</p>
      <input id="pic-mail" type="email" placeholder="E-Mail" autocomplete="username" style="width:100%;margin-bottom:8px">
      <input id="pic-pw" type="password" placeholder="Passwort" autocomplete="current-password" style="width:100%">
      <p id="pic-msg" class="hint" style="color:var(--danger)">${esc(P.msg || '')}</p>
      <div class="row"><button class="btn green" data-a="piclogin" ${P.busy ? 'disabled' : ''}>${P.busy ? 'Moment…' : 'Anmelden'}</button><button class="btn soft" data-a="close">Abbrechen</button></div>
      <p style="text-align:center"><button class="linkbtn muted" data-a="hello" style="background:none;border:0;text-decoration:underline">🕊️ Wie funktioniert Hello Nudel?</button></p>`;
  } else if (P.step === 'code') {
    h += `<p>Picnic hat dir eine SMS mit einem Code geschickt.</p>
      <input id="pic-otp" inputmode="numeric" autocomplete="one-time-code" placeholder="Code aus der SMS" style="width:100%">
      <p id="pic-msg" class="hint" style="color:var(--danger)">${esc(P.msg || '')}</p>
      <div class="row"><button class="btn green" data-a="picverify" ${P.busy ? 'disabled' : ''}>${P.busy ? 'Moment…' : 'Bestätigen'}</button><button class="btn soft" data-a="close">Abbrechen</button></div>
      <p style="text-align:center"><button class="linkbtn muted" data-a="picresend" ${P.busy ? 'disabled' : ''} style="background:none;border:0;text-decoration:underline">Keine SMS? Code nochmal schicken</button></p>`;
  } else if (P.step === 'check') {
    const w = picWorry(), big = w.find(x => x.big), many = w.filter(x => x.r);
    const top = big ? P.rows.filter(r => r.pick && !r.skip).sort((a, b) => b.pick.price * b.n - a.pick.price * a.n).slice(0, 3) : [];
    h += `<p style="text-align:center;font-size:40px;margin:8px 0">🤔</p><p style="text-align:center"><b>Kurz nochmal drüberschauen?</b></p>
      ${big ? `<p>Das wird ein großer Einkauf: <b>ca. ${euro(big.big)}</b>${P.cartTotal ? ` <span class="muted">(mit ${euro(P.cartTotal)}, die schon im Warenkorb lagen)</span>` : ''}.</p>
        <p class="muted" style="margin-bottom:2px">Am meisten machen aus:</p><ul style="margin-top:0">${top.map(r => `<li>${r.n}× ${esc(r.pick.name)} – ${euro(r.pick.price * r.n)}</li>`).join('')}</ul>` : ''}
      ${many.length ? `<p style="margin-bottom:2px">Ganz schön viele:</p><ul style="margin-top:0">${many.map(({ r }) => `<li><b>${r.n}×</b> ${esc(r.pick.name)} <span class="muted">${esc(r.pick.unit)}${picTotal(r, r.n)}</span></li>`).join('')}</ul>` : ''}
      <button class="btn green wide" data-a="picsure">Ja, passt so – ab in den Warenkorb</button>
      <div class="row"><button class="btn soft" data-a="picback">Nochmal ändern</button></div>`;
  } else if (P.step === 'done') {
    h += `<p style="text-align:center;font-size:40px;margin:8px 0">✅</p><p style="text-align:center">${P.added} ${P.added === 1 ? 'Sache liegt' : 'Sachen liegen'} jetzt in deinem Picnic-Warenkorb${P.checked ? ' – nachgeschaut' : ''}.</p>
      ${P.sum ? `<p class="muted" style="text-align:center;margin-top:0">Dazugekommen: ca. ${euro(P.sum)}</p>` : ''}
      ${(P.bad || []).length ? `<p class="hint" style="color:var(--danger)">⚠️ Nicht im Warenkorb gelandet: ${esc(P.bad.join(', '))}</p>` : ''}
      ${(P.nf || []).length ? `<p class="hint">🏪 Gibt’s nicht bei Picnic, bleibt auf der Liste: ${esc(P.nf.join(', '))}</p>` : ''}
      <p class="muted" style="text-align:center">Öffne die Picnic-App, schau drüber, such dir einen Liefertermin aus – fertig. Wenn die Lieferung da ist, kommt alles von selbst in den Vorrat.</p>
      ${P.msg ? `<p class="hint" style="color:var(--danger)">${esc(P.msg)}</p>` : ''}
      <button class="btn green wide" data-a="picapp" style="margin-top:6px">📱 Picnic-App öffnen</button>
      <div class="row"><button class="btn soft" data-a="close">Später</button></div>`;
  } else {
    const rows = P.rows || [], n = rows.filter(r => r.pick && !r.skip).length;
    h += P.busy && !rows.length ? '<p class="muted" style="text-align:center">Suche bei Picnic…</p>' : '';
    if (P.inCart) h += `<p class="muted" style="margin:0">🧺 ${P.inCart} ${P.inCart === 1 ? 'Sache liegt' : 'Sachen liegen'} schon im Warenkorb.</p>`;
    if (!rows.length && !P.busy) h += '<p style="text-align:center">Alles von der Liste liegt schon im Warenkorb. 🎉</p><div class="row"><button class="btn green" data-a="picapp">📱 Picnic-App öffnen</button><button class="btn soft" data-a="close">Schließen</button></div>';
    h += rows.map((r, i) => {
      const p = r.pick;
      return `<div class="card" style="padding:10px;margin:8px 0;${r.skip ? 'opacity:.45' : ''}">
        <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(itemName(r.x))}${r.extra ? ' <span class="tag">noch eine Sorte</span>' : itemQty(r.x) || r.x.q ? ` <span class="muted" style="font-weight:400">(Liste: ${esc(itemQty(r.x) ? fmtQty(itemQty(r.x)) : r.x.q)})</span>` : ''}</b><button class="mini-btn" data-a="picskip" data-v="${i}" aria-label="${r.extra ? 'Sorte wieder weg' : r.skip ? 'Doch mitnehmen' : 'Weglassen'}">${r.skip ? '↺' : '✕'}</button></div>
        ${r.hits == null ? '<p class="muted" style="margin:4px 0">…</p>' : !p ? `<p class="muted" style="margin:4px 0">Bei Picnic nichts gefunden – bleibt auf deiner Liste. Anders heißen?</p>${picAsk(i)}`
          : `<button class="pick" data-a="picopen" data-v="${i}" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left">${p.img ? `<img src="${esc(p.img)}" alt="" style="width:44px;height:44px;object-fit:contain">` : ''}<span style="flex:1">${esc(p.name)} <span class="muted">${esc(p.unit)}</span></span><b>${euro(p.price)}</b></button>
            ${r.skip ? '' : `<div class="pic-n ${r.n >= PIC_MANY ? 'warn' : ''}"><button class="mini-btn" data-a="picn" data-v="${i}" data-d="-1" aria-label="Weniger" ${r.n <= 1 ? 'disabled' : ''}>−</button><b>${r.n}×</b><button class="mini-btn" data-a="picn" data-v="${i}" data-d="1" aria-label="Mehr" ${r.n >= PIC_MAX ? 'disabled' : ''}>+</button>
              <span class="muted">${picTotal(r, r.n).slice(1)}</span><b style="margin-left:auto">${r.n > 1 ? euro(p.price * r.n) : ''}</b></div>`}`}
        ${ui.picOpen === i && r.hits && p ? picTable(r, i) + `<button class="linkbtn" data-a="picsort" data-v="${i}" style="background:none;border:0;text-decoration:underline;margin:6px 0 0">➕ Noch eine Sorte dazu</button>` + picAsk(i) : ''}
      </div>`;
    }).join('');
    const sum = picSum();
    if (rows.length && sum) h += `<p style="text-align:right;margin:6px 2px">Zusammen ca. <b>${euro(sum)}</b>${P.cartTotal ? `<br><span class="muted">+ ${euro(P.cartTotal)} schon im Warenkorb</span>` : ''}</p>`;
    if (rows.length) h += `<p class="hint">Antippen = anderes Produkt wählen oder noch eine Sorte dazu. − / + = wie viele. Deine Wahl merkt sich die App fürs nächste Mal.</p>
      <div class="row"><button class="btn green" data-a="picgo" ${P.busy || !n ? 'disabled' : ''}>${P.busy ? 'Moment…' : `🧺 ${n} in den Warenkorb`}</button><button class="btn soft" data-a="close">Abbrechen</button></div>
      <p style="text-align:center"><button class="linkbtn muted" data-a="piclogout" style="background:none;border:0;text-decoration:underline">Von Picnic abmelden</button></p>`;
    if (P.msg) h += `<p class="hint" style="color:var(--danger)">${esc(P.msg)}</p>`;
  }
  modal(`<div style="text-align:left">${h}</div>`, '', !!$('#ov') && ui.picShown);
  ui.picShown = true;
}
export async function picSearchAll() {
  const map = picLS.map, open = S.shop.filter(x => !x.done && !x.pic);
  ui.pic = { step: 'match', rows: open.map(x => ({ x, hits: null, pick: null, skip: false, more: false, n: 1 })), busy: true, inCart: S.shop.filter(x => !x.done && x.pic).length };
  picModal();
  try {
    try { ui.pic.cartTotal = (await pic('/cart')).total || 0; } catch (e) { if (e.auth) throw e; }   // what's already in there counts for the 150 € look
    for (const r of ui.pic.rows) {   // one after the other: gentle on Picnic, and the list fills in visibly
      if (r.hits) continue;   // a second sort she added meanwhile
      const mem = map[Sh.norm(itemName(r.x))];
      const f = await picFind(itemName(r.x)); r.hits = f.hits; r.q = f.q;
      if (mem && !r.hits.some(h => h.id === mem.id)) r.hits.unshift(mem);
      r.pick = (mem && r.hits.find(h => h.id === mem.id)) || r.hits[0] || null;
      if (!r.nSet) r.n = picN(r.x, r.pick);
      if (!$('#ov')) return;   // she closed it meanwhile
      picModal();
    }
  } catch (e) { return picFail(e); }
  ui.pic.busy = false; picModal();
}
// the options as a small table: picture · name · size · price (+ €/kg or €/l to compare sizes); 6 first, "mehr anzeigen" for the rest
function picTable(r, i) {
  const all = r.hits, show = r.more ? all : all.slice(0, 6), p = r.pick;
  return `<div class="pictab">${show.map(x => { const k = all.indexOf(x); return `<button class="pt-row ${p && p.id === x.id ? 'on' : ''}" data-a="picpick" data-v="${i}" data-k="${k}">
      <span class="pt-img">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ''}</span><span class="pt-name">${esc(x.name)}<small>${esc(x.unit)}</small></span>
      <span class="pt-price"><b>${euro(x.price)}</b><small>${picPer(x)}</small></span></button>`; }).join('')}</div>
    ${!r.more && all.length > 6 ? `<button class="linkbtn muted" data-a="picmore" data-v="${i}" style="background:none;border:0;text-decoration:underline;margin:4px 0">mehr anzeigen (${all.length - 6} weitere)</button>` : ''}`;
}
const picAsk = i => `<div style="display:flex;gap:6px;margin-top:6px"><input id="pic-q-${i}" placeholder="Anders suchen, z. B. Rinderfond" style="flex:1;min-width:0"><button class="mini-btn" data-a="picq" data-v="${i}" aria-label="Suchen">🔍</button></div>`;
export function picFail(e) {
  ui.pic = Object.assign(ui.pic || {}, { busy: false, step: e.auth ? 'login' : (ui.pic || {}).step, msg: e.auth ? 'Bitte nochmal anmelden.' : 'Hat nicht geklappt: ' + e.message });
  picModal();
}
// the list grouped by supermarket section, in the chosen store's order (shop.js); ticked items go to "Im Wagen"
const secOf = x => x.sec || Sh.classify(x.text, S.shopLearn || {});
export const shopOrder = () => { const st = Sh.STORES[S.shopStore] ? S.shopStore : 'standard'; return ((S.shopOrder || {})[st] || Sh.STORES[st][1]).slice(); };
export function shopModal(item, keep) { // her list — or a handed-over one (item.list) on the partner's phone; keep = update in place
  if (!item && !$('#ov') && inQ('einkauf')) { ui.shopItemId = null; render(); return; }   // the list is open as a tab: just redraw it
  ui.shopItemId = item ? item.id : null;
  modal(`<div style="text-align:left">${shopBody(item, false)}</div>`, '', keep);
}
export function shopBody(item, inTab) {
  const L = item ? item.list : S.shop, open = L.filter(x => !x.done), done = L.filter(x => x.done), di = item ? ` data-item="${item.id}"` : '';
  const row = x => `<div class="shoprow"><button class="pick ${x.done ? 'on' : ''}" data-a="shoptick" data-id="${x.id}"${di}><span class="box">${x.done ? '✓' : ''}</span><span style="${x.done ? 'text-decoration:line-through;opacity:.6' : ''}"><span class="${!x.done && x.pic ? 'in-pic' : ''}">${esc(itemName(x))}${itemQty(x) || x.q ? ` <b class="qty">${esc(itemQty(x) ? fmtQty(itemQty(x)) : x.q)}</b>` : ''}</span>${x.from ? `<span class="tag">${esc(x.from)}</span>` : ''}${!x.done && x.pic ? `<span class="tag pic-tag">🧺 ${x.pic.n > 1 ? x.pic.n + '× ' : ''}im Picnic-Warenkorb${x.sortOf || S.shop.some(y => y.sortOf === x.id && y.pic) ? ' · ' + esc(x.pic.name) : ''}</span>` : !x.done && x.nopic ? '<span class="tag">nicht bei Picnic</span>' : ''}</span></button>`
    + (!x.done && (ui.shopEdit || secOf(x) === 'sonst') ? `<button class="mini-btn" data-a="shoptag" data-id="${x.id}"${di} aria-label="Abteilung wählen">🏷️</button>` : '')
    + `<button class="mini-btn" data-a="shopdel" data-id="${x.id}"${di} aria-label="Entfernen">✕</button></div>`
    + (ui.tagId === x.id ? `<div class="chips tagpick">${Object.entries(Sh.SECTIONS).map(([k, [ic, l]]) => `<button class="chip ${secOf(x) === k ? 'on' : ''}" data-a="shopsec" data-id="${x.id}" data-v="${k}"${di}>${ic} ${l.split(' (')[0]}</button>`).join('')}</div>` : '');
  const order = shopOrder();
  const groups = order.map((sec, i) => {
    const xs = open.filter(x => !x.pic && secOf(x) === sec);   // 🧺 cart items live in their own folded section below
    if (!xs.length && !ui.shopEdit) return '';
    const [ic, l] = Sh.SECTIONS[sec];
    return `<div class="shopsec"><div class="sechead"><span>${ic} ${l}${xs.length ? ' <span class="muted">(' + xs.length + ')</span>' : ''}</span>${ui.shopEdit ? `<span><button class="mini-btn" data-a="shopmove" data-v="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Nach oben">↑</button><button class="mini-btn" data-a="shopmove" data-v="${i}" data-d="1" ${i < order.length - 1 ? '' : 'disabled'} aria-label="Nach unten">↓</button></span>` : ''}</div>${xs.map(row).join('')}</div>`;
  }).join('');
  return `${inTab ? '' : `<h2 style="text-align:center">🛒 ${item ? esc(item.text) : 'Einkaufsliste'}</h2>`}
    ${item ? `<p class="muted">von ${esc(item.from || '')}</p>` : ''}
    <div class="chips stores">${Object.entries(Sh.STORES).map(([k, [l]]) => `<button class="chip ${(S.shopStore || 'standard') === k ? 'on' : ''}" data-a="shopstore" data-v="${k}">${l}</button>`).join('')}<button class="chip ${ui.shopEdit ? 'on' : ''}" data-a="shopedit">↕ Reihenfolge anpassen</button></div>
    ${ui.shopEdit ? `<p class="hint" style="margin:0 0 6px">So wie in deiner ${esc(Sh.STORES[S.shopStore] ? Sh.STORES[S.shopStore][0] : 'Filiale')}-Filiale: ↑↓ verschiebt Abteilungen, 🏷️ ändert die Abteilung eines Artikels.</p>` : ''}
    <div class="steps">${groups || (open.length ? '' : '<p class="muted">Noch leer.</p>')}
    ${(() => { const pl = open.filter(x => x.pic); if (!pl.length) return '';   // user 2026-10-20: the store list stays clean, Picnic's things fold away
      return `<div class="shopsec picsec${ui.picOpen ? ' open' : ''}"><button class="sechead picsec-h" data-a="picsec" aria-expanded="${!!ui.picOpen}"><span>🧺 Kommt mit Picnic <span class="muted">(${pl.length})</span></span><span class="muted">${ui.picOpen ? 'zuklappen ▴' : 'anzeigen ▾'}</span></button>${ui.picOpen ? order.map(sec => { const xs = pl.filter(x => secOf(x) === sec); if (!xs.length) return ''; const [ic, l] = Sh.SECTIONS[sec];   // same aisles inside (user)
        return `<div class="sechead picsub"><span>${ic} ${l} <span class="muted">(${xs.length})</span></span></div>${xs.map(row).join('')}`; }).join('') : ''}</div>`; })()}
    ${done.length ? `<div class="shopsec"><div class="sechead"><span>✓ Im Wagen <span class="muted">(${done.length})</span></span></div>${done.map(row).join('')}</div>` : ''}</div>
    ${!item && done.length ? `<button class="btn green wide alldone" data-a="shopdoneask">✅ Fertig eingekauft – ${done.length} ${done.length === 1 ? 'Sache' : 'Sachen'} in den Vorrat</button>` : ''}
    ${item ? '' : `<form class="add" data-f="shopadd"><input name="t" placeholder="Was fehlt? (Komma = mehrere)" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Hinzufügen">+</button></form>`}
    ${!item && open.length && hnUnwrapped() ? (() => { const todo = open.filter(x => !x.pic).length, inCart = open.length - todo;   // (what's in the cart already doesn't count, user 2026-10-20)
      return todo ? `<button class="btn soft wide" data-a="picnic" style="margin-top:8px">🧺 Bei Picnic bestellen (${todo})</button>${inCart ? `<p class="hint" style="text-align:center;margin-top:4px">${inCart} ${inCart === 1 ? 'liegt' : 'liegen'} schon im Picnic-Warenkorb</p>` : ''}`
        : `<button class="btn soft wide" data-a="picapp" style="margin-top:8px">📱 Alles im Picnic-Warenkorb – Picnic-App öffnen</button>`; })() : ''}
    ${done.length && !item || !inTab ? `<div class="row">${done.length && !item ? '<button class="btn soft" data-a="shopclear">Erledigte löschen</button>' : ''}${inTab ? '' : '<button class="btn" data-a="close">Fertig</button>'}</div>` : ''}
    ${!item && L.length ? (ui.shopWipe ? `<div class="row"><button class="btn" data-a="shopwipeyes" style="background:var(--danger)">Ja, alle ${L.length} löschen – auch bei ${esc(pn())}</button><button class="btn soft" data-a="shopwipe">Doch nicht</button></div>`
      : `<div class="row"><button class="btn soft" data-a="shopwipe" style="color:var(--danger)">🗑 Ganze Liste leeren</button></div>`) : ''}
`;
}
function vorratHtml() {
  const V = vorratGroups();
  return `<div class="vorrat"><div class="sechead"><span>🧊 Daheim im Vorrat <span class="muted">(${V.length})</span></span></div>
    ${V.map(x => `<div class="shoprow"><button class="pick" data-a="vorratqty" data-id="${esc(x.id)}"><span style="flex:1">${esc(x.name)}</span>${groupQty(x) ? `<b class="qty">${esc(groupQty(x))}</b>` : '<span class="muted" style="font-size:14px">Menge?</span>'}</button><button class="mini-btn" data-a="vorratdel" data-id="${esc(x.id)}" aria-label="Ist aufgebraucht">✕</button></div>`).join('') || '<p class="muted">Noch leer. Nach dem Einkaufen „Alles eingekauft!“ drücken – oder hier eintragen, was eh da ist.</p>'}
    <form class="add" data-f="vorratadd"><input name="t" placeholder="Hab ich daheim… z.B. 500 g Nudeln" autocomplete="off" enterkeyhint="done"><button class="btn blue" aria-label="Zum Vorrat">+</button></form>
    <p class="hint">Tippen = Menge ändern · ✕ = aufgebraucht. Beim „Jetzt kochen“ wird abgezogen, was das Rezept braucht.</p></div>`;
}
export const shopAgain = () => shopModal(ui.shopItemId ? S.items.find(i => i.id === ui.shopItemId) : null, true);
// cookbook "auf die Liste" while the list isn't open: show it as a pop-over as before
export function cookModal(rid) {
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
