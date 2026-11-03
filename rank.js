// The rank: an emblem per tier (SVG), the rank screen, promotions.
import * as C from './content.js';
import { $, confetti, esc, modal } from './core.js';
import { S } from './state.js';

// ---------- the rank: an emblem per tier (SVG), the rank screen, promotions ----------
export function emblem(t, size = 40, div = '') {
  const R = C.RANKS[t], id = 'em' + t + size;
  const wings = t >= 4 ? `<path d="M10 52 Q-4 38 4 22 Q12 34 20 38Z M90 52 Q104 38 96 22 Q88 34 80 38Z" fill="${R.dark}" opacity=".9"/>` : '';
  const crown = t >= 7 ? `<path d="M34 14 L40 4 L46 12 L50 2 L54 12 L60 4 L66 14Z" fill="${C.RANKS[9].color}" stroke="${R.dark}" stroke-width="1.5"/>` : '';
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="-6 -2 112 106" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.color}"/><stop offset="1" stop-color="${R.dark}"/></linearGradient></defs>
    ${wings}<path d="M50 10 L84 28 L84 66 L50 92 L16 66 L16 28Z" fill="url(#${id})" stroke="${R.dark}" stroke-width="4"/>
    <path d="M50 20 L74 33 L74 62 L50 81 L26 62 L26 33Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <path d="M50 33 L55 45 L68 46 L58 54 L61 67 L50 60 L39 67 L42 54 L32 46 L45 45Z" fill="#fff" opacity=".92"/>${crown}
    ${div ? `<text x="50" y="100" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="18" fill="${R.dark}" stroke="#fff" stroke-width="4" paint-order="stroke">${div}</text>` : ''}</svg>`;
}
export function rankCard(big) {
  const r = C.rankOf(S.earned), nx = r.to != null ? C.rankOf(r.to) : null, p = r.to != null ? (S.earned - r.from) / (r.to - r.from) : 1;
  return `<div class="rankcard ${big ? 'big' : ''}">${emblem(r.t, big ? 120 : 64, r.div)}<div><div class="rname" style="color:${r.tier.dark}">${esc(r.name)}</div>
    <div class="muted"><b>${S.earned} ⭐</b> insgesamt gesammelt</div>
    <div class="bar"><i style="width:${Math.round(p * 100)}%;background:${r.tier.color}"></i></div>
    <div class="muted" style="font-size:13px">${nx ? 'noch ' + (r.to - S.earned) + ' ⭐ bis ' + esc(nx.name) : 'Ganz oben. Mehr geht nicht. 👑'}</div></div></div>`;
}
export function rankModal() {
  const r = C.rankOf(S.earned);
  modal(`<h2>Dein Rang</h2>${rankCard(true)}
    <p class="muted" style="margin-top:12px">Der Rang zählt <b>alle</b> Sterne, die du je gesammelt hast – Ausgeben bei Schätze kostet dich nie einen Rang. Gerade hast du <b>${S.stars} ⭐</b> zum Ausgeben.</p>
    <div class="ladder">${C.RANKS.map((R, i) => `<div class="${i === r.t ? 'on' : i < r.t ? 'done' : ''}">${emblem(i, 34)}<span>${R.name}-Nudel</span><span class="muted">${R.from} ⭐</span></div>`).slice().reverse().join('')}</div>
    <div class="row"><button class="btn" data-a="close">Weiter sammeln</button></div>`);
}
export function checkPromotion() { // a new division (or tier) → a celebration, once
  const r = C.rankOf(S.earned);
  if (S.rankSeen == null) { S.rankSeen = r.step; return; }
  if (r.step > S.rankSeen) {
    S.rankSeen = r.step;
    const show = () => { if ($('#ov') || $('.viewer') || $('#story')) return setTimeout(show, 1500);   // never over something she's doing
      confetti(120); modal(`<div class="promo">${emblem(r.t, 140, r.div)}</div><h2>Aufgestiegen!</h2><p class="hand" style="font-size:36px;margin:4px 0;color:${r.tier.dark}">${esc(r.name)}</p><p class="muted">${S.earned} gute Nudel Sterne gesammelt. Du bist wirklich eine gute Nudel. 💛</p><div class="row"><button class="btn" data-a="close">Juhu!</button></div>`); };
    setTimeout(show, 900);
  } else if (r.step < S.rankSeen) S.rankSeen = r.step;   // an entry removed: quietly back down, no fuss
}
