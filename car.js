// The shared car (Audi A1 Sportback S line, photo in the private repo: fotos/auto.webp): time helpers for bookings. A booking: {id, start, end ('YYYY-MM-DDTHH:MM', local time), note, ts, del?}.

const pad = n => String(n).padStart(2, '0');
export const localISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;
export const live = list => (list || []).filter(b => !b.del && b.end > localISO(new Date()));
