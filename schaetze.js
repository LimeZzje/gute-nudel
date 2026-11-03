// SCHÄTZE: wishes, the photo book, photo hydration.
import * as C from './content.js';
import * as D from './data.js';
import { plantGrams, plantNorm, plantRipe, plantSVG } from './plant.js';
import { esc, shortDate, today } from './core.js';
import { S, ui } from './state.js';

// ---------- SCHÄTZE ----------
export function viewSchaetze() {
  if (ui.sub === 'book') return viewBook();
  const pages = S.book.pages, full = pages >= C.BOOK_PAGES;
  let h = `<div class="sec-title" style="margin-top:6px">Deine Schätze</div><p class="muted" style="margin:0 4px 14px">Du hast <b>${S.stars} gute Nudel Sterne</b>. Gib sie aus, wofür du Lust hast.</p>`;
  h += `<div class="card"><div class="treasure"><div class="thumb" id="bookthumb">${pages ? '' : '🔒'}</div><div>
    <h3>${pages ? 'Dein Fotobuch' : 'Ein geheimes Fotobuch'}</h3>
    <p class="muted">${pages ? pages + ' von ' + C.BOOK_PAGES + ' Seiten' : 'Was drin ist? Das verrät dir Seite 1.'}</p>
    <div class="bar"><i style="width:${pages / C.BOOK_PAGES * 100}%"></i></div></div></div>
    <div class="row" style="margin-top:10px">${full ? '' : `<button class="btn" data-a="unlockpage" ${S.stars < C.pageCost(pages) ? 'disabled' : ''}>Seite freischalten · ${C.pageCost(pages)} ⭐</button>`}${pages ? '<button class="btn soft" data-a="openbook">Ansehen</button>' : ''}</div>
    ${!full && S.stars < C.pageCost(pages) ? `<p class="hint">Noch ${C.pageCost(pages) - S.stars} ⭐ bis zur nächsten Seite.</p>` : ''}</div>`;

  const p = plantNorm(S.plant), ripe = plantRipe(p), nh = p.harvests.length, aday = adventDay(), short = S.stars < C.STAGE_COST;
  h += `<div class="card"><h3>🌿 Deine Pflanze${nh ? ' · Ernte Nr. ' + (nh + 1) : ''}</h3>
    <div class="plantbox"><div class="stagename">${esc(C.plantLabel(p))}</div>${plantSVG(p, nh, decoNow())}</div>
    ${aday ? adventBox(aday) : ''}
    ${ripe ? `<button class="btn green wide" data-a="harvest">Ernten! 🌿 · ca. ${plantGrams(p)} g</button>`
      : `<button class="btn wide" data-a="grow" ${short ? 'disabled' : ''}>${p.flip ? 'Eine Woche blühen lassen' : 'Eine Woche wachsen lassen'} · ${C.STAGE_COST} ⭐</button>
         <p class="hint">${p.flip ? 'Noch ' + (C.BLOOM_WEEKS - p.b) + (C.BLOOM_WEEKS - p.b === 1 ? ' Blütewoche' : ' Blütewochen') + ' bis zur Ernte (ca. ' + plantGrams(p) + ' g).' : p.v < C.FLIP_FROM ? 'Woche ' + p.v + '. Ab Woche ' + C.FLIP_FROM + ' darfst du sie blühen lassen.' : 'Woche ' + p.v + '. Sie wächst, solange du willst.'} ${short ? 'Noch ' + (C.STAGE_COST - S.stars) + ' ⭐.' : ''}</p>`}
    ${!p.flip && p.v >= C.FLIP_FROM ? `<button class="btn soft wide" data-a="flip">💡 Auf 12/12 umstellen – Blüte starten</button>
         <p class="hint">Dann blüht sie ${C.BLOOM_WEEKS} Wochen und wird geerntet – jetzt wären das ca. ${plantGrams(p)} g. <span class="psst">Psst: die ganz Großen wachsen ~50 Wochen.</span></p>` : ''}
    ${nh ? `<p class="muted" style="margin-top:12px;font-weight:800">Erntejournal</p><div class="shelf">${p.harvests.map(x => `<span class="jar">🫙 ${esc(x.name)} <span class="muted">· ${x.g ? x.g + ' g · ' : ''}${shortDate(x.day)}</span></span>`).join('')}</div>` : ''}</div>`;


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
export async function hydratePhotos(root = document) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const u = await D.photoURL(+img.dataset.photo);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted', textContent: '📷 lädt online' }));
  }
}

// 🎄 December: day of the month (0 outside December) and the pieces hanging today
export function adventDay() { const k = today(); return k.slice(5, 7) === '12' ? +k.slice(8) : 0; }
export function decoNow() {
  const day = adventDay(); if (!day) return [];
  const y = today().slice(0, 4), dc = S.deco || {}, open = new Set(dc.open || []), off = new Set(dc.off || []);
  return C.ADVENT.filter(x => x.d <= day && open.has(y + '-' + x.d) && !off.has(x.id)).map(x => x.id);
}
function adventBox(day) {
  const y = today().slice(0, 4), dc = S.deco || {}, open = new Set(dc.open || []), off = new Set(dc.off || []);
  const doors = C.ADVENT.map(x => x.d > day ? `<span class="adv-door lock">${x.d}</span>`
    : !open.has(y + '-' + x.d) ? `<button class="adv-door new" data-a="advent" data-d="${x.d}" aria-label="Türchen ${x.d} öffnen">${x.d}</button>`
    : `<button class="adv-door${off.has(x.id) ? ' off' : ''}" data-a="decotog" data-id="${x.id}" aria-label="${esc(x.n)}${off.has(x.id) ? ' aufhängen' : ' abnehmen'}" title="${esc(x.n)}">${x.ic}</button>`).join('');
  return `<div class="advent"><div class="adv-h">🎄 Adventskalender</div><div class="adv-grid">${doors}</div><p class="hint">Jeden Tag ein Türchen. Antippen = aufhängen oder abnehmen.</p></div>`;
}
