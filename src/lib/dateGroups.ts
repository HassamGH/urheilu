import type { Match } from '../types';
import { sortMatches } from './sortMatches';

export type DateGroup = { key: string; matches: Match[] };

export function buildDateGroups(matches: Match[]): DateGroup[] {
  const groups = new Map<string, Match[]>();
  const order: string[] = [];
  matches.forEach((match) => {
    const key = match.startTime ? new Date(match.startTime).toDateString() : 'TBD';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(match);
  });
  const dated = order.filter((key) => key !== 'TBD').sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const result = dated.map((key) => ({ key, matches: sortMatches(groups.get(key)!) }));
  if (groups.has('TBD')) result.push({ key: 'TBD', matches: sortMatches(groups.get('TBD')!) });
  return result;
}

export function relativeDayLabel(date: Date) {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  // Pinned locale — see the comment in matchFormatting.ts for why (SSR/hydration formatting-style
  // mismatch, not a value mismatch).
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}
