import type { Match } from '../types';

// Live matches always outrank upcoming ones; among ties, whichever kicks off soonest wins.
// Already-finished matches never reach here since the data layer drops them before this runs.
export function pickFeaturedMatch(matches: Match[]): Match | undefined {
  const now = Date.now();
  const sorted = matches
    .filter((match) => match.isLive || !match.startTime || new Date(match.startTime).getTime() >= now)
    .slice()
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return new Date(a.startTime || 8640000000000000).getTime() - new Date(b.startTime || 8640000000000000).getTime();
    });
  return sorted[0];
}
