import type { Match } from '../types';

const ALLOWED_RACING_PHRASES = ['formula 1', 'formula1', 'formula-1'];

// "f1" needs word-boundary matching on its own (unlike the phrases above) since it's short enough
// to false-positive inside unrelated text if checked as a plain substring.
function hasF1Token(text: string) {
  return text.split(/[^a-z0-9]+/).includes('f1');
}

export function isAllowedRacingMatch(match: Match) {
  if (match.sportId !== 'racing') return true;
  const text = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  return ALLOWED_RACING_PHRASES.some((phrase) => text.includes(phrase)) || hasF1Token(text);
}
