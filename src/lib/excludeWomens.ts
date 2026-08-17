import type { Match } from '../types';

const WOMENS_KEYWORDS = ['women', 'ladies', 'femenino', 'femenil', 'female', '(w)', 'wnba', 'wta', 'nwsl', 'w-league'];

export function isWomensMatch(match: Match) {
  const haystack = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  return WOMENS_KEYWORDS.some((keyword) => haystack.includes(keyword));
}
