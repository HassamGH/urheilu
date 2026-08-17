import type { Match } from '../types';

const AMATEUR_KEYWORDS = [
  'amateur', 'youth', 'junior', 'academy', 'reserve', 'reserves', 'development',
  'ncaa', 'college', 'university', 'school',
  ' ii', ' 2nd', 'second team', 'b team', '(b)', ' b)',
  'u-15', 'u-16', 'u-17', 'u-18', 'u-19', 'u-20', 'u-21', 'u-23',
  'u15', 'u16', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
  'under-15', 'under-16', 'under-17', 'under-18', 'under-19', 'under-20', 'under-21', 'under-23',
  'under 15', 'under 16', 'under 17', 'under 18', 'under 19', 'under 20', 'under 21', 'under 23'
];

export function isAmateurMatch(match: Match) {
  const haystack = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  return AMATEUR_KEYWORDS.some((keyword) => haystack.includes(keyword));
}
