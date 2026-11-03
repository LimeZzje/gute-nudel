// WOCHE: week stats, moods, the week log, the story.
import * as C from './content.js';
import { addDays, commit, confetti, esc, isRest, isWork, longDate, modal, monday, parse, shortDate, today, weekDays } from './core.js';
import { S, ui } from './state.js';
import { pn } from './sync.js';
import { rankCard } from './rank.js';

// ---------- WOCHE ----------
export function weekStats(mon) {
  const days = weekDays(mon), log = S.log.filter(e => days.includes(e.day));
  const per = days.map(d => ({ d, work: log.filter(e => e.day === d && isWork(e)).length, rest: log.filter(e => e.day === d && isRest(e)).length }));
  return {
    mon, days, per, log,
    work: log.filter(isWork).length, rest: log.filter(isRest).length,
    stars: log.reduce((a, e) => a + (e.stars > 0 ? e.stars : 0), 0),
    pages: log.filter(e => e.kind === 'unlock' && e.what === 'page').length,
    stages: log.filter(e => e.kind === 'unlock' && e.what === 'stage').length,
    treats: log.filter(e => e.kind === 'reward').length,
    // handed-over tasks (older entries have no n: "3 Aufgaben an … abgegeben")
    sent: log.filter(e => e.kind === 'delegate').reduce((a, e) => a + (e.n || parseInt(e.text) || 1), 0),
    moods: log.filter(e => e.mood),
  };
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const moodFace = v => C.MOODS[Math.max(0, Math.min(4, Math.round(v) - 1))];
// how her tasks felt: average per task (at least 2 ratings), best and hardest
function moodByTask(log) {
  const by = {};
  log.filter(e => e.mood).forEach(e => { const k = e.text.trim().toLowerCase(); (by[k] = by[k] || { text: e.text, m: [] }).m.push(e.mood); });
  const L = Object.values(by).filter(x => x.m.length >= 2).map(x => ({ text: x.text, n: x.m.length, v: avg(x.m) })).sort((a, b) => b.v - a.v);
  return { best: L.filter(x => x.v >= 3.5).slice(0, 3), hard: L.filter(x => x.v <= 2.5).reverse().slice(0, 3) };
}
export function viewWoche() {
  const mon = monday(today()), w = weekStats(mon), max = Math.max(1, ...w.per.map(p => p.work + p.rest));
  let h = `<button class="card wide rankwrap" data-a="rank">${rankCard(false)}</button><div class="sec-title" style="margin-top:6px">Diese Woche</div>
    <div class="stat-row"><button class="stat" data-a="weeklog" data-k="work" data-w="${mon}"><b>${w.work}</b><span>erledigt ›</span></button><button class="stat" data-a="weeklog" data-k="rest" data-w="${mon}"><b>${w.rest}</b><span>entspannt ›</span></button><button class="stat" data-a="weeksent" data-w="${mon}"><b>${w.sent}</b><span>abgegeben ›</span></button><div class="stat"><b>${w.stars}</b><span>Sterne</span></div></div>
    <div class="card" style="margin-top:14px"><div class="weekbars">${w.per.map(p => `<div><i style="height:${p.work / max * 100}%"></i>${p.rest ? `<i class="rest" style="height:${p.rest / max * 100}%"></i>` : ''}${C.DAYSHORT[parse(p.d).getDay()]}</div>`).join('')}</div>
    <p class="muted" style="text-align:center;margin:6px 0 0"><span style="color:var(--accent)">■</span> erledigt &nbsp; <span style="color:#7b62b8">■</span> entspannt</p></div>
    <button class="btn wide" data-a="story" data-w="${mon}">✨ Wochenrückblick ansehen</button>`;
  if (w.moods.length) {
    const t = moodByTask(S.log.filter(e => e.day >= addDays(today(), -28)));
    h += `<div class="sec-title">Wie es sich angefühlt hat</div><div class="card">
      <div class="moodweek">${w.per.map(p => { const m = w.moods.filter(e => e.day === p.d).map(e => e.mood); return `<div><b>${m.length ? moodFace(avg(m)) : '·'}</b><span>${C.DAYSHORT[parse(p.d).getDay()]}</span></div>`; }).join('')}</div>
      <p class="muted" style="text-align:center;margin:8px 0 0">Diese Woche im Schnitt: ${moodFace(avg(w.moods.map(e => e.mood)))} ${C.MOOD_WORDS[Math.round(avg(w.moods.map(e => e.mood))) - 1]} · ${w.moods.length} Bewertungen</p>
      ${t.best.length ? `<p style="margin:12px 0 4px"><b>Fühlt sich gut an</b></p><ul class="list-plain">${t.best.map(x => `<li><span>${esc(x.text)}</span><span>${moodFace(x.v)}</span></li>`).join('')}</ul>` : ''}
      ${t.hard.length ? `<p style="margin:12px 0 4px"><b>Zieht Energie</b> <span class="muted">– vielleicht mal an ${esc(pn())} abgeben?</span></p><ul class="list-plain">${t.hard.map(x => `<li><span>${esc(x.text)}</span><span>${moodFace(x.v)}</span></li>`).join('')}</ul>` : ''}
      <p class="hint">Die letzten 4 Wochen, ab 2 Bewertungen pro Aufgabe.</p></div>`;
  }
  const past = [];
  for (let i = 1; i <= 8; i++) { const m = addDays(mon, -7 * i); const s = weekStats(m); if (s.log.length) past.push(s); }
  if (past.length) {
    h += `<div class="sec-title">Frühere Wochen</div>` + past.map(s => `<button class="card btn soft wide" data-a="story" data-w="${s.mon}" style="text-align:left;display:flex;justify-content:space-between"><span>${shortDate(s.mon)} – ${shortDate(addDays(s.mon, 6))}</span><span>${s.work} erledigt · ${s.rest} entspannt${s.sent ? ' · ' + s.sent + ' abgegeben' : ''}</span></button>`).join('');
  }
  return h;
}

export function weekLogModal(keep) { // this week's done (or rested) entries by day, each removable and (re)ratable
  const { k, w } = ui.wl, f = k === 'rest' ? isRest : isWork;
  const days = weekDays(w).filter(d => d <= today()).reverse();
  let h = '';
  for (const d of days) {
    const es = S.log.filter(e => e.day === d && f(e)); if (!es.length) continue;
    h += `<p class="muted" style="font-weight:800;margin:14px 0 4px">${esc(longDate(d))}</p><ul class="list-plain">` +
      es.map(e => ui.rateId === e.id
        ? `<li class="rating"><span>${esc(e.text)}</span><span class="faces">${C.MOODS.map((m, i) => `<button class="${e.mood === i + 1 ? 'on' : ''}" data-a="rateset" data-id="${e.id}" data-v="${i + 1}" aria-label="${C.MOOD_WORDS[i]}">${m}</button>`).join('')}</span></li>`
        : `<li><span>${esc(e.text)}</span>${e.stars > 0 ? `<span class="muted">+${e.stars}⭐</span>` : ''}<button class="mini-btn ratebtn" data-a="ratepick" data-id="${e.id}" aria-label="Bewerten">${e.mood ? C.MOODS[e.mood - 1] : '☆'}</button><button class="mini-btn" data-a="logdel" data-id="${e.id}" aria-label="Entfernen">✕</button></li>`).join('') + '</ul>';
  }
  modal(`<h2>${k === 'rest' ? 'Entspannt' : 'Erledigt'} diese Woche</h2><p class="muted" style="margin-top:0">Tipp auf ☆ (oder das Gesicht), um nachträglich zu bewerten, wie es sich angefühlt hat.</p><div style="text-align:left">${h || '<p class="muted">Noch nichts.</p>'}</div><div class="row"><button class="btn" data-a="close">Fertig</button></div>`, '', keep);
}

export function story(mon) {
  const w = weekStats(mon), done = w.log.filter(isWork), best = w.per.reduce((a, b) => (b.work > a.work ? b : a), w.per[0]);
  const isPast = addDays(mon, 6) < today();
  const hl = done.map(e => e.text).filter((t, i, a) => a.indexOf(t) === i).sort(() => Math.random() - .5).slice(0, 6);
  const daysActive = w.per.filter(p => p.work).length || 1;
  const slides = [
    ['linear-gradient(160deg,#e0864a,#c8577a)', `<div class="k">DEIN WOCHENRÜCKBLICK</div><div class="t">${shortDate(mon)} – ${shortDate(addDays(mon, 6))}</div><p class="p">Lehn dich zurück.<br>Das hier ist alles deins.</p>`],
    ['linear-gradient(160deg,#2f5aa8,#6b4fb0)', w.work ? `<div class="k">${isPast ? 'IN DIESER WOCHE HAST DU' : 'BIS JETZT HAST DU DIESE WOCHE'}</div><div class="n">${w.work}</div><div class="t">Sachen erledigt</div><p class="p">Das sind im Schnitt ${(w.work / daysActive).toFixed(1).replace('.', ',')} pro Tag.<br>Jede einzelne zählt.</p>`
      : `<div class="k">DIESE WOCHE</div><div class="t">war eine ruhige Woche.</div><p class="p">Und das ist auch völlig in Ordnung.</p>`],
    ['linear-gradient(160deg,#4f9a5b,#2d7a6e)', best && best.work ? `<div class="k">DEIN STÄRKSTER TAG</div><div class="t">${C.DAYNAMES[parse(best.d).getDay()]}</div><div class="n">${best.work}</div><p class="p">Sachen an einem Tag. Wow.</p>`
      : `<div class="k">DEIN STÄRKSTER TAG</div><div class="t">kommt noch.</div>`],
    ['linear-gradient(160deg,#3b2f52,#7b62b8)', `<div class="k">SO OFT HAST DU DIR WAS GUTES GETAN</div><div class="n">${w.rest}</div><p class="p">${w.rest ? 'Das ist die eigentliche Heldentat.<br>Wirklich.' : 'Nächste Woche vielleicht?<br>Du hast es dir verdient.'}</p>`],
    ...(w.moods.length >= 3 ? [['linear-gradient(160deg,#2d7a6e,#4f9a5b)', (() => { const t = moodByTask(w.log), a = avg(w.moods.map(e => e.mood)); return `<div class="k">SO HAT SICH DEINE WOCHE ANGEFÜHLT</div><div class="n">${moodFace(a)}</div><div class="t">${C.MOOD_WORDS[Math.round(a) - 1]}</div>` +
      (t.best[0] ? `<p class="p">Am liebsten: <b>${esc(t.best[0].text)}</b> ${moodFace(t.best[0].v)}</p>` : '') + (t.hard[0] ? `<p class="p">Am zähesten: <b>${esc(t.hard[0].text)}</b> ${moodFace(t.hard[0].v)}</p>` : ''); })()]] : []),
    ['linear-gradient(160deg,#e3a92b,#e0864a)', `<div class="k">DU HAST VERDIENT</div><div class="n">${w.stars}</div><div class="t">gute Nudel Sterne</div><p class="p">${[w.pages ? w.pages + (w.pages === 1 ? ' neue Seite' : ' neue Seiten') + ' im Fotobuch' : '', w.stages ? w.stages + ' Wachstumsschritt' + (w.stages === 1 ? '' : 'e') + ' für die Pflanze' : '', w.treats ? w.treats + ' Mal was gegönnt' : ''].filter(Boolean).join('<br>') || 'Gesammelt und bereit zum Ausgeben.'}</p>`],
    ['linear-gradient(160deg,#c8577a,#6b4fb0)', hl.length ? `<div class="k">EIN PAAR DINGE, DIE DU GESCHAFFT HAST</div><ul>${hl.map(t => '<li>' + esc(t) + '</li>').join('')}</ul><p class="p">…und alles andere auch.</p>` : `<div class="k">DIESE WOCHE</div><div class="t">durfte auch mal leer sein.</div>`],
    ['linear-gradient(160deg,#e0864a,#e3a92b)', `<div class="t" style="font-size:52px">Du darfst stolz auf dich sein.</div><p class="p">Nicht weil alles erledigt ist – das ist es nie.<br>Sondern weil du so viel gegeben hast.<br>Und weil du eine gute Nudel bist. 💛</p><button class="btn soft" data-a="storyclose" style="margin-top:20px;background:rgba(255,255,255,.9);color:#c8577a">Schließen</button>`],
  ];
  let i = 0;
  const el = document.createElement('div'); el.className = 'story'; el.id = 'story';
  const show = () => {
    el.style.background = slides[i][0];
    el.innerHTML = `<div class="prog">${slides.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div><button class="x" data-a="storyclose" aria-label="Schließen">✕</button><div class="slide">${slides[i][1]}</div><div class="tapnote">${i < slides.length - 1 ? 'Tippen für weiter' : ''}</div>`;
    if (i === slides.length - 1) confetti(40);
  };
  el.addEventListener('click', e => {
    if (e.target.closest('[data-a]')) return;
    const left = e.clientX < window.innerWidth * 0.3;
    i = Math.max(0, Math.min(slides.length - 1, i + (left ? -1 : 1))); show();
  });
  show(); document.body.appendChild(el);
  if (isPast && !S.weeksSeen.includes(mon)) { S.weeksSeen.push(mon); commit(); }
}
