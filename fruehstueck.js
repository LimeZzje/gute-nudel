// ☕ G38 Frühstücksplan: one page for the two of them at breakfast, one phone on the table. Forward only: today's fixed
// things, her lines, his lines, the Gelber Schein, open questions. No reminder, no badge, no log that it happened.
// The partner's lines come from their post (post.today = {day, lines}); older than today = "noch nicht da".
import * as Car from './car.js';
import { commit, esc, monday, scheinOn, today } from './core.js';
import { A, S, ui } from './state.js';
import { pn } from './sync.js';
import { carAll, carDay, carTime, isCar, shared } from './termine.js';
import { scheinBtn } from './schein.js';
import { whyFor } from './builder.js';
import { bzOn } from './babyzeit.js';
import { seltenCard } from './daheim.js';
import { render } from './app.js';

const label = i => { const c = i.chore && S.chores.find(x => x.id === i.chore); return (c ? c.icon + ' ' : '') + i.text; };
// what travels: my lines of today as plain text
export const fsPost = () => ({ today: { day: today(), schein: scheinOn(), lines: S.items.filter(i => i.where === 'heute').map(label).slice(0, 12) } });
export function fsReceive(p) {
  if (!p.today || JSON.stringify(p.today) === JSON.stringify(S.partnerToday || null)) return false;
  S.partnerToday = p.today; return true;
}
export const fsTile = () => `<button class="card hcard fs-tile" data-a="fs"><span class="hc-txt"><b>☕ Frühstücksplan</b><span class="muted">Was heute für euch beide dran ist</span></span><span class="hc-go">›</span></button>`;

export function viewFs() {
  const t = today(), now = Car.localISO(new Date());
  const terms = carAll(Car.live, false).filter(b => shared(b) && !isCar(b) && carDay(b.start) <= t && carDay(b.end) >= t && b.end > now);
  const due = S.items.filter(i => !i.chore && i.due === t);
  let h = `<button class="btn soft back-home" data-a="go" data-tab="home">‹ Zurück</button><section class="fs"><h2>☕ Frühstücksplan</h2>`;
  if (terms.length || due.length) h += `<div class="card fs-fix"><h3>Heute fest</h3>${terms.map(b => `<p>📅 <b>${esc(carDay(b.start) < t ? 'ganztags' : carTime(b.start))}</b> · ${esc(b.note || 'Termin')}</p>`).join('')}${due.map(i => `<p>📌 ${esc(i.text)}</p>`).join('')}</div>`;
  // mine (with 'heute nicht' and the Schein)
  const mine = S.items.filter(i => i.where === 'heute');
  h += `<div class="card fs-me"><h3>${esc(S.name || 'Ich')}</h3>`;
  if (scheinOn()) h += `<p class="fs-pause">🟡 Heute ist Pause.</p>`;
  else h += mine.length ? mine.map(i => `<div class="fs-line"><span>${esc(label(i))}</span>${i.chore ? `<button class="mini-btn" data-a="choreskip" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht">⏭</button>` : `<button class="mini-btn" data-a="later" data-id="${i.id}" aria-label="Heute nicht" title="Heute nicht">${whyFor(i.id) ? '↻' : '↩'}</button>`}</div>`).join('') : `<p class="muted">Noch nichts für heute.</p>`;
  h += scheinBtn() + `</div>`;
  // the partner's, read only
  const p = S.partnerToday;
  h += `<div class="card fs-you"><h3>${esc(pn())}</h3>${!p || p.day !== t ? `<p class="muted">noch nicht da</p>` : p.schein ? `<p class="fs-pause">🟡 Heute ist Pause.</p>` : p.lines.length ? p.lines.map(x => `<div class="fs-line"><span>${esc(x)}</span></div>`).join('') : `<p class="muted">Nichts geplant.</p>`}</div>`;
  // open questions, only if any
  h += seltenCard();
  if (bzOn()) h += `<button class="btn soft wide" data-a="go" data-tab="ruhe" data-q="haushalt">👶 Haushalt in der Baby-Zeit ansehen</button>`;
  if (S.fsWeek !== monday(t)) h += `<p class="fs-week"><button class="btn soft wide" data-a="fsweek">📚 Liste für die Woche durchgehen?</button></p>`;
  return h + `</section>`;
}

Object.assign(A, {
  fs() { ui.tab = 'home'; ui.sub = 'fs'; render(); scrollTo(0, 0); },
  fsweek() { S.fsWeek = monday(today()); commit(); A.psortstart(); },
});
