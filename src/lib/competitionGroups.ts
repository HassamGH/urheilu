import type { Match } from '../types';
import { sortMatches } from './sortMatches';

export type CompetitionGroup = { key: string; name: string; logo?: string; matches: Match[] };

// Matches with no competition name at all (single-event fixtures, mostly) still need a bucket —
// grouped together rather than dropped or each getting their own one-match section.
const UNGROUPED = 'Other';

// Splits one date's worth of matches into their competitions — football specifically can have
// dozens of matches on a single day across a dozen-plus leagues, which read as one indistinguishable
// wall of cards in a single rail. Grouped, each competition gets its own small heading and its own
// short rail instead.
export function buildCompetitionGroups(matches: Match[]): CompetitionGroup[] {
  const groups = new Map<string, { name: string; logo?: string; matches: Match[] }>();
  const order: string[] = [];
  matches.forEach((match) => {
    const name = match.competition || UNGROUPED;
    if (!groups.has(name)) {
      groups.set(name, { name, logo: match.competitionLogo, matches: [] });
      order.push(name);
    }
    const group = groups.get(name)!;
    group.matches.push(match);
    if (!group.logo && match.competitionLogo) group.logo = match.competitionLogo;
  });

  // `matches` arrives already sorted chronologically (see sortMatches/buildDateGroups), so a
  // competition's own matches come out sorted for free — sorting is still applied explicitly rather
  // than assumed, so this holds even if a future caller passes in unsorted matches. Competitions are
  // then ordered by their own earliest kickoff, so whichever league has a match starting soonest on
  // this date leads — the same "what's coming up next" ordering the date rail itself uses.
  return order
    .map((name) => {
      const group = groups.get(name)!;
      return { key: name, name: group.name, logo: group.logo, matches: sortMatches(group.matches) };
    })
    .sort((a, b) => {
      const timeA = a.matches[0]?.startTime ? new Date(a.matches[0].startTime).getTime() : Number.POSITIVE_INFINITY;
      const timeB = b.matches[0]?.startTime ? new Date(b.matches[0].startTime).getTime() : Number.POSITIVE_INFINITY;
      if (timeA !== timeB) return timeA - timeB;
      return a.name.localeCompare(b.name);
    });
}
