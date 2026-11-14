// 🧾 Kassenzettel (G23, his idea 2026-11-14): after a spontaneous shop, photograph the receipt → kassenzettel/<ts>-<me>.jpg
// in the private repo. The next Claude session reads it (tools/rezepte.py bons), adds the food with clean names to the Vorrat
// through its own post/claude.json (add-only, merged into vorratAdds like the partner's post) and writes recipes from it.
import * as D from './data.js';
import { toast } from './core.js';
import { A } from './state.js';
import { shrink } from './recipes.js';
import { render } from './app.js';

const LS = 'gn_bons';   // ids still waiting for their upload; the photo itself waits in IndexedDB (stash)
const waiting = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } };
const setWaiting = a => { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {} };
let busy = false;
export async function retryBons() {   // called on every sync; a failed upload simply stays for the next one
  if (busy || !D.canPost() || !navigator.onLine || !waiting().length) return;
  busy = true;
  try {
    for (const id of waiting()) {
      const d = await D.stashGet('bon:' + id);
      if (d) await D.putBinary(`kassenzettel/${id}.jpg`, String(d).split(',')[1], 'Kassenzettel');
      try { await D.stashDel('bon:' + id); } catch (e) {}
      setWaiting(waiting().filter(x => x !== id));
    }
  } catch (e) { console.warn('bon', e); }
  finally { busy = false; }
}
export const bonBtn = () => `<label class="btn soft">🧾 Kassenzettel<input type="file" accept="image/*" data-ch="bonadd" hidden></label>`;
export const bonHint = () => { const n = waiting().length; return n ? `<p class="hint">🧾 ${n === 1 ? 'Ein Kassenzettel wartet' : n + ' Kassenzettel warten'} noch aufs Hochladen – geht von selbst, sobald Netz da ist.</p>` : ''; };
A.bonadd = async el => {
  const f = el.files && el.files[0]; el.value = ''; if (!f) return;
  let d; try { d = await shrink(f, 2400); } catch (e) { toast('Das Foto ließ sich nicht lesen'); return; }   // receipts are long: a bit more than recipe pages
  const id = Date.now() + '-' + D.me();
  try { await D.stashPut('bon:' + id, d); } catch (e) { toast('Speichern ging nicht – nochmal?'); return; }
  setWaiting(waiting().concat([id]));
  toast('🧾 Kassenzettel ist unterwegs – Claude trägt die Sachen in den Vorrat ein und schreibt Rezepte dazu');
  render(); await retryBons(); render();
};
