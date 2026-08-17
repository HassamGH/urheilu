import type { Match } from '../types';

// Exact/prefix match (not a plain substring check) so this only catches "MLB" and "MLB - Playoffs"
// style suffixes, not any league whose name happens to contain "mlb" elsewhere.
function isMlb(name: string) {
  return name === 'mlb' || name.startsWith('mlb ') || name.startsWith('mlb-');
}

export function isAllowedBaseballMatch(match: Match) {
  if (match.sportId !== 'baseball') return true;
  if (!match.competition) return false;
  return isMlb(match.competition.toLowerCase());
}
