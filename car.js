// The shared car (Audi A1 Sportback S line, photo in the private repo: fotos/auto.webp): time helpers for bookings. A booking: {id, start, end ('YYYY-MM-DDTHH:MM', local time), note, ts, del?}.

const pad = n => String(n).padStart(2, '0');
export const localISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;
export const live = list => (list || []).filter(b => !b.del && b.end > localISO(new Date()));
// what the calendar shows (and the post carries): also the last ~5 weeks, so past days aren't empty
export const recent = list => (list || []).filter(b => !b.del && b.end > localISO(new Date(Date.now() - 35 * 864e5)));
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
