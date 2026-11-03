// SCHÄTZE: wishes, the photo book, photo hydration.
import * as C from './content.js';
import * as D from './data.js';
import { plantSVG } from './plant.js';
import { esc, shortDate } from './core.js';
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
export async function hydratePhotos(root = document) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const u = await D.photoURL(+img.dataset.photo);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted', textContent: '📷 lädt online' }));
  }
}
