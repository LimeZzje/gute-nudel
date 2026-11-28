// 🐶 Gassi mehrmals am Tag (his ask 2026-11-28, only Gassi for now): a routine gets numbered walks per day and person.
// Default: Stefan 2, Julia 1, the same every day; a single day (or the whole week) is changed in the Sprint-Planung.
// Home phone (where the routine lives): c.walks = { per: { stand: n, stefan: m }, day: { 'YYYY-MM-DD': { stand, stefan } } }.
//   Its own first walk = the routine line itself (with its parts); walks 2..n are extra lines 'gm-<cid>-<day>-<k>'.
//   A day where it has 0 walks: the routine line stays away.
// Partner phone: gets its walks from the home phone's post (post.walks) as lines 'gm-<cid>-<day>-<k>' (1..n).
// Each line = one star; a line not done that day just goes away (no Liste, no "von gestern").
import { S } from './state.js';
import * as D from './data.js';

export const WALK_DEFAULT = { stand: 1, stefan: 2 };
export const isWalky = c => !!c && /gassi/i.test(c.name || '');
export function walksInit() {   // the default once, on the home phone
  let ch = false;
  for (const c of S.chores || []) if (isWalky(c) && !c.walks) { c.walks = { per: { ...WALK_DEFAULT }, day: {} }; ch = true; }
  return ch;
}
export const walkCount = (w, who, d) => { if (!w) return 0; const x = w.day && w.day[d]; return x && who in x ? x[who] : (w.per && w.per[who]) || 0; };
const done = id => S.log.some(e => e.gm === id);
const has = id => S.items.some(i => i.id === id);
// the walk lines for today on THIS phone (called from scheduleChores)
export function walkLines(d) {
  const me = D.me(); let added = 0;
  const add = (cid, k, n, text, home) => {
    const id = 'gm-' + cid + '-' + d + '-' + k;
    if (has(id) || done(id)) return;
    S.items.push({ id, text: text + ' · ' + k + '/' + n, where: 'heute', created: Date.now(), gm: { cid, home, day: d } }); added++;
  };
  for (const c of S.chores || []) if (c.walks) { const n = walkCount(c.walks, me, d); for (let k = 2; k <= n; k++) add(c.id, k, n, c.name, me); }
  for (const w of S.partnerWalks || []) { const n = walkCount(w, me, d); for (let k = 1; k <= n; k++) add(w.id, k, n, w.t, D.partner()); }
  // a count lowered for today: extra lines over the count go (unless done)
  S.items = S.items.filter(i => {
    if (!i.gm || i.gm.day !== d || i.where !== 'heute') return true;
    const k = +i.id.split('-').pop(), w = i.gm.home === me ? (S.chores.find(c => c.id === i.gm.cid) || {}).walks : (S.partnerWalks || []).find(x => x.id === i.gm.cid);
    return k <= walkCount(w, me, d);
  });
  return added;
}
// what travels from the home phone
export const walksPost = () => (S.chores || []).filter(c => c.walks).map(c => ({ id: c.id, t: (c.icon ? c.icon + ' ' : '') + c.name, per: c.walks.per, day: c.walks.day }));
// set the counts for one day (or several) on the home phone
export function setWalks(c, days, counts) {
  if (!c || !c.walks) return false;
  c.walks.day = c.walks.day || {};
  for (const d of days) c.walks.day[d] = { ...walkCount.length && { stand: walkCount(c.walks, 'stand', d), stefan: walkCount(c.walks, 'stefan', d) }, ...counts };
  // keep it small: past days go
  const t = new Date(Date.now() - 3 * 3600e3 - 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(c.walks.day)) if (k < t) delete c.walks.day[k];
  return true;
}
