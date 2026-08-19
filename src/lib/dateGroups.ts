import type { Match } from '../types';
import { sortMatches } from './sortMatches';
import { DISPLAY_TIME_ZONE } from './timeZone';

export type DateGroup = { key: string; matches: Match[] };

// `en-CA`'s date formatting happens to be exactly `YYYY-MM-DD` — used here purely as a trick to get
// a PKT-pinned, sortable, string-comparable calendar-day key out of Intl.DateTimeFormat, not because
// the locale itself matters. Unlike `toDateString()` (which reads the calendar day in the runtime's
// own local timezone), this gives the identical key on the server and the client regardless of
// which timezone each happens to run in.
function pktDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TIME_ZONE }).format(date);
}

export function buildDateGroups(matches: Match[]): DateGroup[] {
  const groups = new Map<string, Match[]>();
  const order: string[] = [];
  matches.forEach((match) => {
    const key = match.startTime ? pktDateKey(new Date(match.startTime)) : 'TBD';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(match);
  });
  // `YYYY-MM-DD` keys sort correctly as plain strings — no need to re-parse them into Dates first.
  const dated = order.filter((key) => key !== 'TBD').sort();
  const result = dated.map((key) => ({ key, matches: sortMatches(groups.get(key)!) }));
  if (groups.has('TBD')) result.push({ key: 'TBD', matches: sortMatches(groups.get('TBD')!) });
  return result;
}

export function relativeDayLabel(date: Date) {
  const dateKey = pktDateKey(date);
  const todayKey = pktDateKey(new Date());
  if (dateKey === todayKey) return 'Today';

  const [y, m, d] = dateKey.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  // Both sides built from UTC-midnight-of-the-PKT-calendar-day, purely so the subtraction counts
  // whole calendar days without any local-timezone/DST rounding creeping back in.
  const diffDays = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: DISPLAY_TIME_ZONE }).format(date);
}
