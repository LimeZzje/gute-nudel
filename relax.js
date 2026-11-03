// 🛋️ ENTSPANNEN: time + energy → one ritual (own rituals, rating, the Home card).
import * as C from './content.js';
import * as D from './data.js';
import * as E from './entspannen.js';
import { dayLog, esc, evening, isRest, modal, parse, today } from './core.js';
import { S, ui } from './state.js';
import { pn } from './sync.js';
import { ago } from './settings.js';
import { dueBtns, dueTag } from './faellig.js';

// ---------- 🛋️ ENTSPANNEN (since 2026-10-08): time + energy → ONE ritual, the app does the thinking ----------
export const rxP = t => String(t).replace(/\{p\}/g, pn());
const ownRituals = () => (S.myRituals || []).map(x => Object.assign({ own: true }, x))
  .concat((S.wishes || []).map(w => ({ id: 'w-' + w.id, icon: '💛', title: w.text, size: 'besonders', en: 'pof', own: true, wish: true })));
const allRituals = () => E.RITUALS.concat(ownRituals());
export const ritualById = id => allRituals().find(x => x.id === id);
const prepReady = id => { const st = S.preps[id] || []; return st.length > 0 && st.every(Boolean); };
function rxCtx() {
  const recent = {}, t = today();
  for (const e of S.log) if (e.ritual) { const ago = Math.round((parse(t) - parse(e.day)) / 864e5); if (recent[e.ritual] == null || ago < recent[e.ritual]) recent[e.ritual] = ago; }
  return { rate: S.relaxRate || {}, recent, ready: new Set(C.PREPS.map(p => p.id).filter(prepReady)), hour: new Date().getHours(), partner: !!(S.partnerName || D.me() === 'stand') };
}
const sizeOf = k => E.SIZES.find(z => z[0] === k);
function ritualSteps(x, mini) { return (mini && x.mini ? x.mini : x.steps) || []; }

export function viewRelax() {
  const rx = ui.rx;
  let h = `<section class="relax-hero"><div class="rh-k">${evening() ? 'Feierabend 🌙' : 'Kleine Pause'}</div><h2>Mach's dir gemütlich</h2>
    <p>Du musst dir nichts ausdenken. Sag mir nur, wie viel Zeit du hast und wie es dir geht – den Rest mach ich.</p></section>`;
  if (S.ritual) h += relaxActive();
  else if (!rx.size) {
    h += `<div class="card rx-step"><h3>Wie viel Zeit hast du?</h3><div class="rx-tiles">${E.SIZES.map(([k, ic, l, sub]) => `<button class="rx-tile" data-a="rxsize" data-v="${k}"><span class="rt-i">${ic}</span><b>${l}</b><small>${sub}</small></button>`).join('')}</div></div>`;
  } else if (!rx.en && rx.size !== 'besonders') {
    const z = sizeOf(rx.size);
    h += `<div class="card rx-step"><button class="rx-back" data-a="rxback">‹ ${z[1]} ${z[2]}</button><h3>Und wie geht's dir gerade?</h3><div class="rx-tiles">${E.ENERGY.map(([k, ic, l]) => `<button class="rx-tile" data-a="rxen" data-v="${k}"><span class="rt-i">${ic}</span><b>${l}</b></button>`).join('')}</div></div>`;
  } else {
    let x = rx.cur && ritualById(rx.cur);
    if (!x) { x = E.choose(allRituals(), rx.size, rx.en, rxCtx(), rx.skip); rx.cur = x.id; }
    const z = sizeOf(rx.size), en = E.ENERGY.find(e => e[0] === rx.en), steps = ritualSteps(x), rate = (S.relaxRate || {})[x.id];
    h += `<div class="card rx-pick"><button class="rx-back" data-a="rxback">‹ ${z[1]} ${z[2]}${en ? ' · ' + en[1] + ' ' + en[2] : ''}</button>
      <div class="rx-icon">${x.icon}</div><h3 class="rx-title">${esc(rxP(x.title))}</h3>
      ${x.text ? `<p class="rx-text">${esc(rxP(x.text))}</p>` : ''}
      ${steps.length ? `<ol class="rx-prev">${steps.map(t => `<li>${esc(rxP(t))}</li>`).join('')}</ol>` : ''}
      <div class="rx-tags">${x.own ? '<span class="tag">💛 deins</span>' : ''}${rate === 3 ? '<span class="tag">😍 mochtest du</span>' : ''}${x.prep && prepReady(x.prep) ? '<span class="tag">🧺 vorbereitet</span>' : ''}${x.mini ? '<span class="tag">Mini-Version möglich</span>' : ''}</div>
      <div class="row"><button class="btn" data-a="rxgo">${rx.size === 'besonders' ? 'Mach ich!' : "Los geht's"}</button><button class="btn soft" data-a="rxnext">↻ Was anderes</button></div>
      ${x.mini ? `<button class="btn soft wide" data-a="rxgo" data-mini="1">Nur die Mini-Version (2 Min.)</button>` : ''}
      ${rx.size === 'besonders' ? `<button class="btn soft wide" data-a="rxplan">📋 Auf meine Liste – zum Planen</button>` : ''}</div>`;
  }
  // her own rituals
  const own = S.myRituals || [];
  h += `<div class="sec-title">Deine Rituale</div><div class="card">${own.length ? `<ul class="list-plain rx-own">${own.map(x => `<li><span><b>${esc(x.icon)} ${esc(x.title)}</b><small>${sizeOf(x.size)[1]} ${sizeOf(x.size)[2]}${(x.steps || []).length ? ' · ' + x.steps.length + ' Schritte' : ''}</small>${dueTag(x)}</span>
      <span class="rx-own-b">${dueBtns(x, 'ritual')}<button class="mini-btn" data-a="rxstart" data-id="${esc(x.id)}" aria-label="Jetzt machen">▶</button><button class="mini-btn" data-a="rxown" data-id="${esc(x.id)}" aria-label="Bearbeiten">✎</button><button class="mini-btn" data-a="rxowndel" data-id="${esc(x.id)}" aria-label="Löschen">✕</button></span></li>`).join('')}</ul>`
      : '<p class="muted" style="margin-top:0">Was tut dir gut? Trag deine eigenen Entspannungsrituale ein – sie kommen dann öfter dran als meine.</p>'}
    <button class="btn wide" data-a="rxown">+ Eigenes Ritual</button></div>`;
  // preparations for days with energy (they make the rituals cost almost nothing later)
  h += `<div class="sec-title">Vorbereiten – für Tage mit Energie</div><p class="muted" style="margin:0 4px 12px">Einmal vorbereiten, dann kostet Gemütlichkeit später fast nichts mehr. Vorbereitete Rituale schlage ich öfter vor. Fertig vorbereitet: +2 ⭐.</p>`;
  for (const p of C.PREPS) {
    const st = S.preps[p.id] || [], n = st.filter(Boolean).length, full = n === p.steps.length, open = ui.openPrep === p.id;
    h += `<div class="card"><h3>${p.icon} ${esc(p.title)}${full ? '<span class="ready">fertig</span>' : ''}</h3><p class="muted">${esc(p.text)}</p><div class="bar"><i style="width:${n / p.steps.length * 100}%"></i></div>`;
    if (open) h += '<div class="steps">' + p.steps.map((t, i) => `<button class="pick ${st[i] ? 'on' : ''}" data-a="prepstep" data-id="${p.id}" data-i="${i}"><span class="box">${st[i] ? '✓' : ''}</span><span>${esc(t)}</span></button>`).join('') + '</div>';
    h += `<button class="btn soft wide" data-a="prepopen" data-id="${p.id}">${open ? 'Zuklappen' : full ? 'Ansehen' : n ? 'Weitermachen' : 'Anfangen'}</button></div>`;
  }
  // browse everything (optional — for days when she does want to choose)
  const all = allRituals();
  h += `<details class="card rx-all"><summary>Alle ${all.length} Ideen durchstöbern</summary>${E.SIZES.map(([k, ic, l, sub]) => `<h4>${ic} ${l} <small>${sub}</small></h4><div class="rx-chips">${all.filter(x => x.size === k).map(x => `<button class="chip" data-a="rxpick" data-id="${esc(x.id)}">${x.icon} ${esc(rxP(x.title))}${(S.relaxRate || {})[x.id] === 3 ? ' 😍' : ''}</button>`).join('')}</div>`).join('')}</details>`;
  return h;
}
function relaxActive() {
  const x = ritualById(S.ritual.id);
  if (!x) { S.ritual = null; return ''; }
  const steps = ritualSteps(x, S.ritual.mini), done = S.ritual.done || [], all = !steps.length || steps.every((_, i) => done[i]);
  return `<div class="card rx-active"><div class="rx-icon">${x.icon}</div><h3 class="rx-title">${esc(rxP(x.title))}${S.ritual.mini ? ' <small>(Mini)</small>' : ''}</h3>
    ${steps.length ? `<p class="muted" style="margin:0 0 8px">Hak ab, was fertig ist – oder auch nicht. Es ist nur eine Hilfe.</p><div class="steps">${steps.map((t, i) => `<button class="pick ${done[i] ? 'on' : ''}" data-a="rxstep" data-i="${i}"><span class="box">${done[i] ? '✓' : ''}</span><span>${esc(rxP(t))}</span></button>`).join('')}</div>`
      : `<p class="rx-text">${esc(rxP(x.text || 'Genieß es. 💛'))}</p>`}
    ${all && steps.length ? '<p><b>Alles bereit. Und jetzt: genießen.</b></p>' : ''}
    <div class="row"><button class="btn green" data-a="rxdone">Hab's genossen! +${E.STARS} ⭐</button><button class="btn soft" data-a="rxstop">Abbrechen</button></div></div>`;
}
export function ownRitualForm(id) {
  const x = (S.myRituals || []).find(r => r.id === id) || { icon: '🛋️', title: '', size: 'kurz', en: 'pof', steps: [] };
  ui.rxForm = { id: x.id || null, icon: x.icon, size: x.size, en: x.en };
  modal(`<h2>${x.id ? 'Ritual ändern' : 'Eigenes Ritual'}</h2>
    <label class="field"><span>Was tut dir gut?</span><input id="rx-title" value="${esc(x.title)}" placeholder="z. B. Badewanne mit Hörbuch" autocomplete="off"></label>
    <div class="field"><span>Symbol</span><div class="rx-icons">${E.OWN_ICONS.map(i => `<button class="chip ${i === x.icon ? 'on' : ''}" data-a="rxfi" data-v="${i}">${i}</button>`).join('')}</div></div>
    <div class="field"><span>Wie lange?</span><div class="chips">${E.SIZES.map(([k, ic, l]) => `<button class="chip ${k === x.size ? 'on' : ''}" data-a="rxfs" data-v="${k}">${ic} ${l}</button>`).join('')}</div></div>
    <div class="field"><span>Passt, wenn ich … bin (mehrere gehen)</span><div class="chips">${E.ENERGY.map(([k, ic, l]) => `<button class="chip ${x.en.includes(k) ? 'on' : ''}" data-a="rxfe" data-v="${k}">${ic} ${l}</button>`).join('')}</div></div>
    <label class="field"><span>Schritte (optional, einer pro Zeile)</span><textarea id="rx-steps" rows="4" placeholder="Wanne einlassen&#10;Hörbuch an&#10;Kerze an">${esc((x.steps || []).join('\n'))}</textarea></label>
    <label class="field"><span>Fällig am (optional)</span><input type="date" id="rx-due" class="due-in big" value="${x.due || ''}"></label>
    <div class="row"><button class="btn" data-a="rxownsave">Speichern</button><button class="btn soft" data-a="close">Abbrechen</button></div>`);
}
export function rateRitual(id) {
  const x = ritualById(id); if (!x) return;
  modal(`<h2>Wie war's?</h2><p><b>${x.icon} ${esc(rxP(x.title))}</b></p><p class="muted">Dann schlage ich dir mehr von dem vor, was dir guttut.</p>
    <div class="rx-rate">${[[3, '😍', 'Richtig gut'], [2, '🙂', 'Okay'], [1, '😕', 'Eher nicht']].map(([v, e, l]) => `<button class="btn soft" data-a="rxrate" data-id="${esc(id)}" data-v="${v}"><span>${e}</span>${l}</button>`).join('')}</div>
    <div class="row"><button class="btn soft" data-a="close">Überspringen</button></div>`);
}
export function relaxHomeCard() {   // after Feierabend: the way in, right on Home
  if (!evening()) return '';
  if (S.ritual) { const x = ritualById(S.ritual.id); if (x) return `<button class="card hcard relax-home" data-a="go" data-tab="ruhe" data-q="relax"><span class="hc-txt"><b>🛋️ Weiter mit: ${esc(rxP(x.title))}</b><span class="muted">Du hast schon angefangen. Schön.</span></span><span class="hc-go">›</span></button>`; }
  const rested = dayLog(today()).some(isRest);
  return `<div class="card relax-home"><b>${rested ? 'Noch was Gemütliches? 🌙' : 'Feierabend 🌙 Lust auf was Gemütliches?'}</b><span class="muted">${rested ? 'Du hast dir heute schon was gegönnt – mehr ist erlaubt.' : 'Du musst nichts aussuchen. Nur sagen, wie viel Zeit du hast.'}</span>
    <div class="rx-tiles small">${E.SIZES.slice(0, 2).map(([k, ic, l]) => `<button class="rx-tile" data-a="rxhome" data-v="${k}"><span class="rt-i">${ic}</span><b>${l}</b></button>`).join('')}</div></div>`;
}
