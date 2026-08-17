import type { Match } from '../types';

// Fighting-sport fixtures are almost always single-event listings (no real home/away teams — see
// MatchCard's isEvent handling), so promotion detection runs on the competition/title text instead.
const ALLOWED_FIGHTING_KEYWORDS = ['ufc', 'mma'];

export function isAllowedFightingMatch(match: Match) {
  if (match.sportId !== 'fighting') return true;
  const text = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  if (text.includes('wwe')) return false;
  return ALLOWED_FIGHTING_KEYWORDS.some((word) => text.includes(word));
}
