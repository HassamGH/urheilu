import type { Match } from '../types';

// Matches without a start time (TBD/always-on channels) sort after everything scheduled.
export function sortMatches(matches: Match[]): Match[] {
  return matches.slice().sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
    if (timeA !== timeB) return timeA - timeB;
    return a.title.localeCompare(b.title);
  });
}
