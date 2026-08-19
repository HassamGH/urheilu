import type { Match } from '../types';

const PLAYOFF_KEYWORDS = ['playoff', 'playoffs', 'play-off', 'play-offs', 'postseason', 'post-season'];

export function isPlayoffMatch(match: Match) {
  const haystack = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  return PLAYOFF_KEYWORDS.some((keyword) => haystack.includes(keyword));
}
