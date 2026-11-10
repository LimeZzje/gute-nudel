// Several devices of one person: mergeStates(local, remote, base).
import * as D from './data.js';
import * as B from './baby.js';
import { plantProgress } from './plant.js';

// ---------- several devices of one person: merge two versions of the same save ----------
// base = the version both devices last agreed on (null if unknown). With it, the merge knows what was DELETED:
// an entry that was in the base but is missing on one side was ticked off or removed there and stays gone.
// Without a base (old app version) it falls back to joining everything.
export function mergeStates(local, remote, base = null) {
  const newer = (remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local, older = newer === remote ? local : remote;
  const m = Object.assign(D.freshState(), newer, { me: D.me() });
  // lists: joined by id, the newer version of an entry wins; deleted on either side (since the base) = gone
  const join = k => {
    const a = (newer[k] || []).filter(Boolean), b = (older[k] || []).filter(Boolean);
    const inA = new Set(a.map(x => x.id)), inB = new Set(b.map(x => x.id)), inBase = base ? new Set((base[k] || []).filter(Boolean).map(x => x.id)) : null;
    const seen = new Set();
    return a.concat(b).filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return !inBase || !inBase.has(x.id) || (inA.has(x.id) && inB.has(x.id)); });
  };
  ['items', 'chores', 'shop', 'wishes', 'sent', 'gifts', 'timers', 'car', 'thanks', 'myRecipes', 'recipeInbox', 'dishes', 'vorratAdd', 'vorratUsed', 'myRituals', 'events', 'cookLog', 'dishPics'].forEach(k => { m[k] = join(k); });
  m.relaxRate = Object.assign({}, older.relaxRate || {}, newer.relaxRate || {});
  m.swiped = Object.assign({}, older.swiped || {}, newer.swiped || {});
  m.picCheered = [...new Set([].concat(older.picCheered || [], newer.picCheered || []))];
  m.newsRead = [...new Set([].concat(older.newsRead || [], newer.newsRead || []))];   // (per recipe, the newer decision wins: ↶ undo sticks)
  m.hnOpen = newer.hnOpen || older.hnOpen;
  m.plan = ((older.plan || {}).u || 0) > ((newer.plan || {}).u || 0) ? older.plan : newer.plan;   // 🗓️ the last edit wins
  { const g = new Map(); [].concat(older.shopGone || [], newer.shopGone || []).forEach(x => x && g.set(x.id, x)); m.shopGone = [...g.values()].slice(-500); }   // 🎁 unwrapped on any of her devices = unwrapped
  m.hiddenRecipes = [...new Set([].concat(newer.hiddenRecipes || [], older.hiddenRecipes || []))];
  // the log the same way (an undo on one device removes the entry everywhere)
  const ids = new Set((newer.log || []).map(e => e.id)), extra = (older.log || []).filter(e => !ids.has(e.id));
  m.log = join('log').sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (base) { // stars: both sides' changes since the base add up
    m.stars = Math.max(0, (newer.stars || 0) + (older.stars || 0) - (base.stars || 0));
    m.earned = Math.max(0, (newer.earned || 0) + (older.earned || 0) - (base.earned || 0));
    // 🍼 a baby tick credited (or taken back) on BOTH devices counted twice above → once
    const bids = x => new Map((x.log || []).filter(e => e.kind === 'baby' || e.kind === 'event' || e.kind === 'kniff').map(e => [e.id, e.stars || 1])), bA = bids(newer), bB = bids(older), bZ = bids(base);
    let fix = 0; bA.forEach((n, id) => { if (bB.has(id) && !bZ.has(id)) fix -= n; }); bZ.forEach((n, id) => { if (!bA.has(id) && !bB.has(id)) fix += n; });
    m.stars = Math.max(0, m.stars + fix); m.earned = Math.max(0, m.earned + fix);
  } else {
    m.stars = Math.max(0, (newer.stars || 0) + extra.reduce((a, e) => a + (e.stars || 0), 0));
    m.earned = (newer.earned || 0) + extra.reduce((a, e) => a + Math.max(0, e.stars || 0), 0);
  }
  // a chore deleted on one device takes its open to-dos with it; one open to-do per chore at most
  const cids = new Set(m.chores.map(c => c.id)), one = new Set();
  m.items = m.items.filter(i => !i.chore || (cids.has(i.chore) && !(i.where === 'heute' && (one.has(i.chore) || !one.add(i.chore)))));
  m.recipes = newer.recipes || older.recipes;
  m.fixes = [...new Set([].concat(newer.fixes || [], older.fixes || []))];
  m.favs = [...new Set([].concat(newer.favs || [], older.favs || []))];
  m.termSeen = newer.termSeen || older.termSeen ? [...new Set([].concat(newer.termSeen || [], older.termSeen || []))].slice(-300) : undefined;
  m.vrSeen = newer.vrSeen || older.vrSeen ? [...new Set([].concat(older.vrSeen || [], newer.vrSeen || []))].slice(-400) : undefined;
  m.thanksSeen = [...new Set([].concat(newer.thanksSeen || [], older.thanksSeen || []))].slice(-200);
  m.cook = Object.assign({}, older.cook || {}, newer.cook || {});
  m.babyMine = B.mergeMine(older.babyMine, newer.babyMine);
  m.knMine = B.mergeMine(older.knMine, newer.knMine);   // 💡 Kniff verdicts + setup ticks: per id the newer one
  m.answered = Object.assign({}, older.answered || {}, newer.answered || {});
  const gA = newer.game || {}, gB = older.game || {}, lv = { ...(gB.levels || {}) };
  for (const [k, v] of Object.entries(gA.levels || {})) lv[k] = Math.max(v, lv[k] || 0);
  m.game = { levels: lv, endless: Math.max(gA.endless || 0, gB.endless || 0) };
  m.book = { pages: Math.max((newer.book || {}).pages || 0, (older.book || {}).pages || 0) };
  // 🌿 the plant: the copy with more progress wins (more harvests, then more weeks) – a grow on the other device is not undone
  m.plant = plantProgress(older.plant) > plantProgress(newer.plant) ? older.plant : newer.plant;
  { const a = newer.deco || {}, b = older.deco || {}, last = (b.u || 0) > (a.u || 0) ? b : a;   // 🎄 doors opened anywhere stay open; on/off: the last edit wins
    m.deco = { open: [...new Set([].concat(a.open || [], b.open || []))], off: (last.off || []).slice(), u: Math.max(a.u || 0, b.u || 0) }; }
  m.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0) + 1;
  return m;
}
