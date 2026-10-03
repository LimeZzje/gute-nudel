// Storage: the phone is the main copy (IndexedDB, mirrored to localStorage), a private GitHub repo is the backup.
// Every change is saved locally at once; a few seconds later it is pushed to GitHub (one commit = one restore point).
// The book photos live in the same private repo and are cached on the phone once loaded.

const DB = 'gutenudel', VER = 1;
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('kv'); d.createObjectStore('photos'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function idb(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, mode), st = tx.objectStore(store), r = fn(st);
    tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error);
  });
}
const kvGet = k => idb('kv', 'readonly', s => s.get(k));
const kvSet = (k, v) => idb('kv', 'readwrite', s => s.put(v, k));

export function freshState() {
  return {
    v: 1, created: Date.now(), updatedAt: 0, name: '',
    stars: 0, earned: 0,
    items: [],             // {id, text, where: 'heute'|'liste', created, carried}
    log: [],               // {id, text, kind: task|extra|rest|setup|prep|reward|unlock, day, ts, stars, iid?}
    today: { day: '', planned: false, capShown: false, closed: false },
    book: { pages: 0 },
    plant: { stage: 0, harvests: [] },
    recipe: null,          // {id, mini, done: [bool]}
    preps: {},             // id -> [bool]
    quest: null,           // active quest id
    wishes: [],            // {id, text}
    favs: [],              // reward texts she liked
    weeksSeen: [],
  };
}

// ---------- local ----------
export async function loadLocal() {
  let s = null;
  try { s = await kvGet('state'); } catch (e) { console.warn('idb read', e); }
  if (!s) { try { const j = localStorage.getItem('gn_state'); if (j) s = JSON.parse(j); } catch (e) {} }
  return s ? Object.assign(freshState(), s) : null;
}
export async function saveLocal(s) {
  const j = JSON.stringify(s);
  try { localStorage.setItem('gn_state', j); } catch (e) {}
  try { await kvSet('state', JSON.parse(j)); } catch (e) { console.warn('idb write', e); }
}
export async function askPersistent() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) return await navigator.storage.persist(); } catch (e) {}
  return null;
}

// ---------- config (repo + token) ----------
export function getCfg() {
  try { return JSON.parse(localStorage.getItem('gn_cfg') || 'null') || {}; } catch (e) { return {}; }
}
export async function setCfg(c) {
  localStorage.setItem('gn_cfg', JSON.stringify(c));
  try { await kvSet('cfg', c); } catch (e) {}
}
export async function restoreCfg() { // localStorage lost but IndexedDB kept (or the other way round)
  if (localStorage.getItem('gn_cfg')) return;
  try { const c = await kvGet('cfg'); if (c) localStorage.setItem('gn_cfg', JSON.stringify(c)); } catch (e) {}
}
const API = () => localStorage.getItem('gn_api') || 'https://api.github.com';
const configured = c => c.owner && c.repo && c.token;

async function gh(path, opts = {}) {
  const c = getCfg();
  const r = await fetch(API() + '/repos/' + c.owner + '/' + c.repo + '/contents/' + path, {
    ...opts, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + c.token, Accept: opts.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', ...(opts.headers || {}) },
  });
  const exp = r.headers.get('github-authentication-token-expiration');
  if (exp) localStorage.setItem('gn_tokexp', exp);
  return r;
}
const b64 = str => { const by = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < by.length; i += 0x8000) s += String.fromCharCode(...by.subarray(i, i + 0x8000)); return btoa(s); };

// ---------- backup ----------
// each person has their own save file in the repo (setup link &p=name); hers is the default
const FILE_ = () => getCfg().file || 'sicherung/stand.json';
export const backup = { status: 'none', last: +localStorage.getItem('gn_lastbackup') || 0, err: '', listeners: new Set() };
function setStatus(st, err = '') { backup.status = st; backup.err = err; backup.listeners.forEach(f => f()); }
let timer = null, pending = null, running = false, sha = null;

export function scheduleBackup(state, delay = 8000) {
  pending = state;
  if (!configured(getCfg())) { setStatus('none'); return; }
  setStatus('wait');
  clearTimeout(timer);
  timer = setTimeout(flushBackup, delay);
}
export async function flushBackup() {
  clearTimeout(timer);
  if (!pending || running) return;
  if (!configured(getCfg())) { setStatus('none'); return; }
  if (!navigator.onLine) { setStatus('wait', 'offline'); return; }
  running = true;
  const s = pending; pending = null;
  try {
    const body = JSON.stringify(s, null, 1);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!sha || attempt) { const g = await gh(FILE_()); sha = g.ok ? (await g.json()).sha : null; if (!g.ok && g.status !== 404) throw new Error('GitHub ' + g.status); }
      const d = new Date();
      const r = await gh(FILE_(), { method: 'PUT', body: JSON.stringify({ message: 'Sicherung ' + d.toLocaleString('de-DE'), content: b64(body), ...(sha ? { sha } : {}) }) });
      if (r.ok) { sha = (await r.json()).content.sha; break; }
      if ((r.status === 409 || r.status === 422) && !attempt) continue;
      throw new Error(r.status === 401 ? 'Schlüssel ungültig oder abgelaufen' : r.status === 404 ? 'Repo nicht gefunden' : 'GitHub ' + r.status);
    }
    backup.last = Date.now(); localStorage.setItem('gn_lastbackup', backup.last);
    setStatus('ok');
  } catch (e) {
    if (!pending) pending = s;                       // keep it for the next try
    setStatus('bad', e.message || String(e));
    clearTimeout(timer); timer = setTimeout(flushBackup, 60000);
  } finally {
    running = false;
    if (pending && backup.status === 'ok') { clearTimeout(timer); timer = setTimeout(flushBackup, 2000); }
  }
}
export function hasPending() { return !!pending; }

export async function fetchBackup() { // the newest backup from GitHub, or null
  const r = await gh(FILE_(), { raw: true });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(r.status === 401 ? 'Schlüssel ungültig oder abgelaufen' : 'GitHub ' + r.status);
  return JSON.parse(await r.text());
}
export async function testConnection() {
  const c = getCfg();
  const r = await fetch(API() + '/repos/' + c.owner + '/' + c.repo, { headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  const exp = r.headers.get('github-authentication-token-expiration');
  if (exp) localStorage.setItem('gn_tokexp', exp);
  if (r.ok) return { ok: true, private: (await r.json()).private };
  return { ok: false, msg: r.status === 401 ? 'Schlüssel ungültig' : r.status === 404 ? 'Repo nicht gefunden (Name oder Schlüssel-Rechte prüfen)' : 'Fehler ' + r.status };
}
export function tokenExpiry() { const e = localStorage.getItem('gn_tokexp'); return e ? new Date(e.replace(' UTC', 'Z').replace(' ', 'T')) : null; }

// ---------- photos ----------
const pad = n => String(n).padStart(2, '0');
const urls = {};
export async function photoURL(n) { // object URL of book photo n (1-based); cached on the phone after first load
  if (urls[n]) return urls[n];
  let blob = null;
  try { blob = await idb('photos', 'readonly', s => s.get(n)); } catch (e) {}
  if (!blob) {
    if (!configured(getCfg()) || !navigator.onLine) return null;
    const r = await gh('fotos/' + pad(n) + '.jpg', { raw: true });
    if (!r.ok) return null;
    blob = new Blob([await r.arrayBuffer()], { type: 'image/jpeg' });
    try { await idb('photos', 'readwrite', s => s.put(blob, n)); } catch (e) {}
  }
  return (urls[n] = URL.createObjectURL(blob));
}
