import type { Match } from '../types';

// Live matches always sort first; upcoming ones after, soonest kickoff first. The list itself
// comes from the popular/live-popular feeds (see getFeaturedMatches) — this just orders it.
export function orderFeaturedMatches(matches: Match[]): Match[] {
  return matches.slice().sort((a, b) => {
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
    return new Date(a.startTime || 8640000000000000).getTime() - new Date(b.startTime || 8640000000000000).getTime();
  });
}
