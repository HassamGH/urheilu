import type { Match } from '../types';

// Prefix match rather than a plain substring check — "WNBA" contains "nba" as a substring, so a
// naive `includes('nba')` would wrongly let WNBA games through.
function isNba(name: string) {
  return name === 'nba' || name.startsWith('nba ') || name.startsWith('nba-');
}

export function isAllowedBasketballMatch(match: Match) {
  if (match.sportId !== 'basketball') return true;
  if (!match.competition) return false;
  return isNba(match.competition.toLowerCase());
}
