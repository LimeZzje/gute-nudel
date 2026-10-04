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
    v: 1, me: null, created: Date.now(), updatedAt: 0, name: '',
    stars: 0, earned: 0,
    items: [],             // {id, text, where: 'heute'|'liste', created, carried}
    log: [],               // {id, text, kind: task|extra|rest|setup|prep|reward|unlock, day, ts, stars, iid?}
    today: { day: '', planned: false, capShown: false, closed: false },
    book: { pages: 0 },
    plant: { stage: 0, harvests: [] },
    recipe: null,          // {id, mini, done: [bool]}
    preps: {},             // id -> [bool]
    quest: null,           // active quest id
    chores: [],            // recurring chores: {id, icon, name, every (days) | week [0..6], reward, last (day), skip (day)}
    gifts: [],             // chore rewards waiting today
    shop: [],              // her shopping list: {id, text, done, from, sec?}
    shopStore: 'standard', shopOrder: {}, shopLearn: {}, pantry: [],   // pantry: ingredients she usually has at home (learned)   // chosen store, her own section order per store, sections she corrected
    recipes: null,         // her cookbook: {id, title, ingredients[], steps} (null = the examples not added yet)
    timers: [],            // running: {id, icon, label, end}
    cook: {},              // what she cooked: recipe id -> {n, last (day), taste 1–3}: {id, cid, day, icon, name, reward}
    combo: null,           // active double quest: {id, day, phase: 'work'|'reward', iid} – only valid on its day
    wishes: [],            // {id, text}
    favs: [],              // reward texts she liked
    weeksSeen: [],
    sent: [],              // tasks I handed to the partner: {id, text, today, ts, status: wartet|ok|nein|erledigt, reason}
    answered: {},          // my answers to the partner's tasks: id -> {status: ok|nein|erledigt, reason, ts}
    incoming: [],          // partner's tasks waiting for my answer: {id, text, today, ts}
    car: [],               // my car bookings: {id, start, end ('YYYY-MM-DDTHH:MM'), note, ts, del?}
    partnerCar: [],        // the partner's upcoming bookings (from their post)
    partnerName: '', postedName: null,
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
let timer = null, pending = null, running = false;

// write a JSON file into the repo (one commit); knows each file's version so it never overwrites blindly
const shas = {};
const ghErr = st => new Error(st === 401 ? 'Schlüssel ungültig oder abgelaufen' : st === 404 ? 'Repo nicht gefunden' : 'GitHub ' + st);
async function putJSON(path, obj, msg) {
  const content = b64(JSON.stringify(obj, null, 1));
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!(path in shas) || attempt) { const g = await gh(path); shas[path] = g.ok ? (await g.json()).sha : null; if (!g.ok && g.status !== 404) throw ghErr(g.status); }
    const r = await gh(path, { method: 'PUT', body: JSON.stringify({ message: msg, content, ...(shas[path] ? { sha: shas[path] } : {}) }) });
    if (r.ok) { shas[path] = (await r.json()).content.sha; return; }
    if ((r.status === 409 || r.status === 422) && !attempt) continue;
    throw ghErr(r.status);
  }
}
async function getJSON(path) { // null if the file does not exist yet
  const r = await gh(path, { raw: true });
  if (r.status === 404) return null;
  if (!r.ok) throw ghErr(r.status);
  return JSON.parse(await r.text());
}

export function scheduleBackup(state, delay = 8000) {
  pending = state;
  if (!configured(getCfg())) { setStatus('none'); return; }
  setStatus('wait');
  clearTimeout(timer);
  timer = setTimeout(flushBackup, delay);
}
// ---------- several devices of one person (e.g. phone + PC) ----------
// Each device remembers which version of the backup it last had (its "base"). Newer one on the server → another device
// saved: take it over (nothing changed here) or merge (both changed). Before every save the same check runs, so a device
// never overwrites what another one did.
const base = () => +localStorage.getItem('gn_base') || 0;
const setBase = t => localStorage.setItem('gn_base', String(t || 0));
let onRemote = null;   // set by the app: (remote state, adopt?) → the state to keep
export function setRemoteHandler(fn) { onRemote = fn; }
const unb64 = c => new TextDecoder().decode(Uint8Array.from(atob(String(c).replace(/\s/g, '')), ch => ch.charCodeAt(0)));
async function getFile(path) { // content + version in one request
  const r = await gh(path);
  if (r.status === 404) { shas[path] = null; return null; }
  if (!r.ok) throw ghErr(r.status);
  const j = await r.json();
  shas[path] = j.sha;
  if (j.content) return JSON.parse(unb64(j.content));
  return getJSON(path);   // big files come without content
}
let pulling = null;
export async function pull(local) { // → the state to use now, or null when nothing changed
  if (!configured(getCfg()) || !navigator.onLine || !onRemote) return null;
  if (pulling) return pulling;
  pulling = (async () => {
    try {
      const remote = await getFile(FILE_());
      if (!remote || !(remote.updatedAt > base())) return null;
      if (remote.updatedAt === local.updatedAt) { setBase(remote.updatedAt); return null; }   // the same version
      // nothing new here since the last sync — or this device never synced and is simply older → take it over
      const adopt = !(local.updatedAt > base()) || (!base() && local.updatedAt <= remote.updatedAt);
      const next = onRemote(remote, adopt);
      setBase(remote.updatedAt);
      if (!adopt) scheduleBackup(next, 500);   // a merge: the result goes up too
      return next;
    } catch (e) { return null; }
    finally { setTimeout(() => { pulling = null; }, 0); }
  })();
  return pulling;
}
export function markSynced(t) { setBase(t); }

export async function flushBackup() {
  clearTimeout(timer);
  if (!pending || running) return;
  if (!configured(getCfg())) { setStatus('none'); return; }
  if (!navigator.onLine) { setStatus('wait', 'offline'); return; }
  running = true;
  let s = pending; pending = null;
  try {
    const remote = await getFile(FILE_());   // did another device save meanwhile? then merge first
    if (remote && remote.updatedAt > base() && onRemote) s = onRemote(remote, false);
    await putJSON(FILE_(), s, 'Sicherung ' + new Date().toLocaleString('de-DE'));
    setBase(s.updatedAt);
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
export function stopAll() { clearTimeout(timer); clearTimeout(postTimer); pending = null; postPending = null; }
export async function wipeLocal() { try { await idb('kv', 'readwrite', s => s.clear()); } catch (e) {} }

export const fetchBackup = () => getJSON(FILE_()); // the newest backup from GitHub, or null
export async function testConnection() {
  const c = getCfg();
  const r = await fetch(API() + '/repos/' + c.owner + '/' + c.repo, { headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  const exp = r.headers.get('github-authentication-token-expiration');
  if (exp) localStorage.setItem('gn_tokexp', exp);
  if (r.ok) return { ok: true, private: (await r.json()).private };
  return { ok: false, msg: r.status === 401 ? 'Schlüssel ungültig' : r.status === 404 ? 'Repo nicht gefunden (Name oder Schlüssel-Rechte prüfen)' : 'Fehler ' + r.status };
}
export function tokenExpiry() { const e = localStorage.getItem('gn_tokexp'); return e ? new Date(e.replace(' UTC', 'Z').replace(' ', 'T')) : null; }

// ---------- post: handing tasks to the partner ----------
// Each person only ever WRITES their own file post/<me>.json and only READS the partner's, so the two phones
// can never overwrite each other. Ids: her file is "stand" (the default), his is "stefan".
export const me = () => (FILE_().match(/([\w-]+)\.json$/) || [])[1] || 'stand';
export const partner = () => getCfg().partner || (me() === 'stand' ? 'stefan' : 'stand');
export const canPost = () => configured(getCfg());
let postTimer = null, postPending = null, postRunning = false;
export function schedulePost(obj, delay = 1500) {
  postPending = obj;
  if (!canPost()) return;
  clearTimeout(postTimer); postTimer = setTimeout(flushPost, delay);
}
export async function flushPost() {
  clearTimeout(postTimer);
  if (!postPending || postRunning || !canPost() || !navigator.onLine) return;
  postRunning = true;
  const o = postPending; postPending = null;
  try { await putJSON('post/' + me() + '.json', o, 'Post ' + new Date().toLocaleString('de-DE')); }
  catch (e) { if (!postPending) postPending = o; postTimer = setTimeout(flushPost, 30000); }
  finally { postRunning = false; if (postPending) { clearTimeout(postTimer); postTimer = setTimeout(flushPost, 1500); } }
}
export const readPartnerPost = () => getJSON('post/' + partner() + '.json');

// ---------- photos ----------
const pad = n => String(n).padStart(2, '0');
const urls = {};
async function privateURL(key, path, type) { // object URL of a picture in the private repo; cached on the phone after first load
  if (urls[key]) return urls[key];
  let blob = null;
  try { blob = await idb('photos', 'readonly', s => s.get(key)); } catch (e) {}
  if (!blob) {
    if (!configured(getCfg()) || !navigator.onLine) return null;
    const r = await gh(path, { raw: true });
    if (!r.ok) return null;
    blob = new Blob([await r.arrayBuffer()], { type });
    try { await idb('photos', 'readwrite', s => s.put(blob, key)); } catch (e) {}
  }
  return (urls[key] = URL.createObjectURL(blob));
}
export const photoURL = n => privateURL(n, 'fotos/' + pad(n) + '.jpg', 'image/jpeg');   // book photo n (1-based)
export const carURL = () => privateURL('auto-1', 'fotos/auto.webp', 'image/webp');      // their own A1 (shows the plate → private); new photo = new key
