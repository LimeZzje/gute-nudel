// The shared car (Audi A1 Sportback S line, photo in the private repo: fotos/auto.webp): time helpers for bookings. A booking: {id, start, end ('YYYY-MM-DDTHH:MM', local time), note, ts, del?,
// every? (7 | 14 days: a series, start/end = the first one), until? (last day), skip? [days left out]}.

const pad = n => String(n).padStart(2, '0');
export const localISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;
export const REPEAT = { 7: 'jede Woche', 14: 'alle 14 Tage' };
const shift = (iso, n) => { const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n); return localISO(d).slice(0, 10) + iso.slice(10); };
// single bookings and every date of a series that overlap [from, to); a series date gets id "<id>@<day>" and sid
export function expand(list, from, to) {
  const out = [];
  for (const b of list || []) {
    if (b.del) continue;
    if (!b.every) { if (b.start < to && b.end > from) out.push(b); continue; }
    for (let i = 0; i < 800; i++) {
      const s = shift(b.start, i * b.every), e = shift(b.end, i * b.every), day = s.slice(0, 10);
      if (s >= to || (b.until && day > b.until)) break;
      if (e <= from || (b.skip || []).includes(day)) continue;
      out.push({ ...b, id: b.id + '@' + day, sid: b.id, start: s, end: e });
    }
  }
  return out;
}
const until = () => localISO(new Date(Date.now() + 400 * 864e5)), past = () => localISO(new Date(Date.now() - 35 * 864e5));
export const live = list => expand(list, localISO(new Date()), until());   // upcoming (and running)
export const recent = list => expand(list, past(), until());               // what the calendar shows: also the last ~5 weeks
// what travels in the post: the bookings themselves (a series as one entry), without long-finished ones
export const raw = list => (list || []).filter(b => !b.del && (b.every ? !b.until || b.until >= past().slice(0, 10) : b.end > past()))
  .map(({ id, start, end, note, every, until: u, skip }) => ({ id, start, end, note, ...(every ? { every } : {}), ...(u ? { until: u } : {}), ...(skip && skip.length ? { skip } : {}) }));
// each person has a colour; the car icon in the calendar is painted with it
export const COLORS = { stand: '#ffb020', stefan: '#3fb6ff' };
export const icon = (color, size = 18) => `<svg class="mcar" viewBox="0 0 24 12" width="${size}" height="${size / 2}" aria-hidden="true"><path d="M1.6,9.2 L1.6,7 Q1.6,5.6 3,5.3 L6,4.7 L8.7,2.3 Q9.3,1.8 10.2,1.8 L15.4,1.8 Q16.3,1.8 16.9,2.4 L19.4,4.9 L21.2,5.3 Q22.6,5.7 22.6,7.1 L22.6,9.2 Z" fill="${color}"/><path d="M9.6,3 L15.2,3 L17.4,5 L7.6,5 Z" fill="#0d0e10" opacity=".55"/><circle cx="6.4" cy="9.3" r="2" fill="#0d0e10" stroke="${color}" stroke-width="1"/><circle cx="17.8" cy="9.3" r="2" fill="#0d0e10" stroke="${color}" stroke-width="1"/></svg>`;
// minutes of day k (YYYY-MM-DD) covered by booking b: [from, to] in 0..1440, or null
export function onDay(b, k) {
  const a = k + 'T00:00', z = k + 'T24:00';
  if (!(b.start < z && b.end > a)) return null;
  const m = iso => +iso.slice(11, 13) * 60 + +iso.slice(14, 16);
  const from = b.start <= a ? 0 : m(b.start), to = b.end >= z || b.end.slice(0, 10) > k ? 1440 : m(b.end);
  return [from, to === 1439 ? 1440 : to];
}
