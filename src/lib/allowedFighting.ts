import type { Match } from '../types';

// Fighting-sport fixtures are almost always single-event listings (no real home/away teams — see
// MatchCard's isEvent handling), so promotion detection runs on the competition/title text instead.
const ALLOWED_FIGHTING_KEYWORDS = ['ufc', 'mma', 'boxing'];

export function isAllowedFightingMatch(match: Match) {
  if (match.sportId !== 'fighting') return true;
  const text = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  if (text.includes('wwe') || text.includes('aew') || text.includes('tna')) return false;
  // The generic "Events" league is the catch-all bucket for standalone fight cards (boxing,
  // Bellator, PFL...) — a boxing title is just "Fighter A vs Fighter B" with no promotion keyword
  // to match on, so anything in that bucket is allowed once WWE is filtered out above.
  if ((match.competition || '').trim().toLowerCase() === 'events') return true;
  return ALLOWED_FIGHTING_KEYWORDS.some((word) => text.includes(word));
}
