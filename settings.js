// Settings modal, connecting/testing the backup, restore, export.
import * as D from './data.js';
import { $, VERSION, closeModal, endTime, esc, modal, toast, today } from './core.js';
import { S, setS } from './state.js';
import { pn, shopSnapNow } from './sync.js';
import { rollover } from './chores.js';
import { render, renderTop } from './app.js';

// ---------- settings ----------
export function ago(t) {
  if (!t) return 'noch nie';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'gerade eben' : m < 60 ? 'vor ' + m + ' Min.' : m < 1440 ? 'vor ' + Math.round(m / 60) + ' Std.' : 'vor ' + Math.round(m / 1440) + ' Tagen';
}
export function settings() {
  const c = D.getCfg(), st = D.backup.status, exp = D.tokenExpiry();
  const dot = st === 'ok' ? 'ok' : st === 'wait' ? 'wait' : st === 'bad' ? 'bad' : '';
  const txt = { ok: 'Gesichert ' + ago(D.backup.last), wait: D.backup.err === 'offline' ? 'Offline – wird gesichert, sobald Internet da ist' : 'Wird gleich gesichert…', bad: 'Fehler: ' + D.backup.err, none: 'Sicherung noch nicht eingerichtet' }[st];
  const days = exp ? Math.round((exp - Date.now()) / 864e5) : null;
  modal(`<div style="text-align:left"><h2 style="text-align:center">Einstellungen</h2>
    <label class="field"><span>Wie soll dich die App nennen?</span><input id="s-name" value="${esc(S.name)}" placeholder="Dein Name (optional)"></label>
    <label class="field"><span>Wie heißt dein Partner hier? (Spitzname)</span><input id="s-nick" value="${esc(pn() === 'Partner' ? '' : pn())}" placeholder="${esc(S.partnerName || 'Name')}"></label>
    <label class="field"><span>Feierabend ab (dann heißt es „Tag geschafft!“)</span><input id="s-end" type="time" value="${esc(endTime())}"></label>
    <h3 style="margin:18px 0 4px">☁ Sicherung</h3>
    <div class="status"><span class="dot ${dot}"></span>${esc(txt)}</div>
    ${days !== null && days < 21 ? `<div class="warn">Der Sicherungs-Schlüssel läuft in ${days} Tagen ab. Bitte einen neuen eintragen.</div>` : ''}
    <label class="field"><span>GitHub-Name</span><input id="s-owner" value="${esc(c.owner || '')}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span>Repo</span><input id="s-repo" value="${esc(c.repo || 'gute-nudel-daten')}" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field"><span>Schlüssel (Token)</span><input id="s-token" type="password" value="${esc(c.token || '')}" autocomplete="off" spellcheck="false"></label>
    <div class="row"><button class="btn blue" data-a="cfgsave">Verbinden & testen</button></div>
    <label class="field"><span>…oder Einrichtungs-Link einfügen (vom QR-Code)</span><input id="s-link" placeholder="https://limezzje.github.io/gute-nudel/#setup=…" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <div class="row"><button class="btn soft" data-a="cfglink">Mit Link einrichten</button></div>
    <div class="row"><button class="btn soft" data-a="backupnow">Jetzt sichern</button><button class="btn soft" data-a="restore">Wiederherstellen</button></div>
    <div class="row"><button class="btn soft" data-a="export">Als Datei speichern</button></div>
    <div class="row"><button class="btn soft" data-a="wipe" style="color:var(--danger)">Handy trennen & leeren</button></div>
    <p class="muted" id="s-msg"></p>
    <div class="row"><button class="btn" data-a="settingsclose">Fertig</button></div><p class="muted" style="text-align:center;margin-top:10px">Version ${VERSION} · ${esc(D.me())}</p></div>`);
}
export async function saveCfgAndTest() {
  const msg = $('#s-msg');
  await D.setCfg({ owner: $('#s-owner').value.trim(), repo: $('#s-repo').value.trim(), token: $('#s-token').value.trim() });
  msg.textContent = 'Teste Verbindung…';
  try {
    const r = await D.testConnection();
    if (!r.ok) { msg.textContent = '❌ ' + r.msg; return; }
    msg.textContent = '✅ Verbunden' + (r.private ? ' (privates Repo).' : ' – ACHTUNG: das Repo ist öffentlich!');
    const remote = await D.fetchBackup().catch(() => null);
    if (remote && remote.updatedAt > S.updatedAt && !S.log.length) {
      msg.textContent += ' Sicherung gefunden – wird geladen…';
      await applyRestore(remote); return;
    }
    D.scheduleBackup(S, 10); renderTop();
  } catch (e) { msg.textContent = '❌ ' + e.message; }
}
export async function applyRestore(remote) {
  setS(Object.assign(D.freshState(), remote, { me: D.me() })); shopSnapNow();
  D.markSynced(remote.updatedAt, remote);
  await D.saveLocal(S);
  rollover(); closeModal(); render(); toast('Wiederhergestellt ✓');
}
export function exportFile() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
  a.download = 'gute-nudel-' + today() + '.json'; a.click();
}
