// 🏢 Büro days (his design 2026-11-28): a mark on a DAY, not a task. He goes 2-3 times a week, irregularly, often decided
// the evening before or the same morning. Unmarked = a home day. A Büro day holds at most C.OFFICE_LINES lines, nothing 🥵,
// and at most C.OFFICE_RBUDGET non-daily routine. Marking a day that is already planned: what no longer fits slides to
// the next free day by itself (🥵 first), never to the other person; nothing has to be tidied by hand.
// State: S.office = { days: ['YYYY-MM-DD'], u } (own days; the newest edit wins between his devices), posted as post.office.
import * as C from './content.js';
import { addDays, today } from './core.js';
import { S } from './state.js';

export const officeDays = () => ((S.office && S.office.days) || []).filter(d => d >= today());
export const isOfficeMe = d => officeDays().includes(d);
export function setOffice(d, on) {
  const days = new Set(officeDays());
  if (on) days.add(d); else days.delete(d);
  S.office = { days: [...days].sort(), u: Date.now() };
}
export const officePost = () => officeDays();
// routines: the room a day gives to non-daily routines; a 🥵 routine never lands on a Büro day
export const routineRoom = (d, base) => isOfficeMe(d) ? Math.min(base, C.OFFICE_RBUDGET) : base;
export const lineCap = office => office ? C.OFFICE_LINES : C.DAY_LINES;
// the next day after d (within 7 days of today) that is no Büro day and has room; null = none
export function nextFree(d, roomOf) {
  const end = addDays(today(), 6);
  for (let k = addDays(d, 1); k <= end; k = addDays(k, 1)) if (!isOfficeMe(k) && roomOf(k) > 0) return k;
  return null;
}
