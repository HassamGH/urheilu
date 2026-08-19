import type { Match } from '../types';

// Distinctive phrases — matched as plain substrings since they're specific enough not to collide
// with unrelated text.
const ALLOWED_RACING_PHRASES = [
  'formula 1', 'formula1', 'formula-1',
  'le mans', '24 heures du mans', '24 hours of le mans',
  'indy 500', 'indianapolis 500', 'indycar',
  'daytona 24', 'rolex 24', 'daytona 500',
  'nurburgring 24', 'nürburgring 24', 'nurburgring', 'nürburgring',
  'monaco gp', 'monaco grand prix',
  'nascar',
  'motogp', 'moto gp',
  'isle of man tt', 'isle of man',
  'suzuka 8 hours', 'suzuka 8h', '8 hours of suzuka',
  '24 heures motos', "bol d'or",
  'worldsbk', 'world superbike', 'superbike world championship',
  'dakar rally', 'dakar'
];

// Short tokens that need word-boundary matching (unlike the phrases above) since they're short
// enough to false-positive inside unrelated text if checked as a plain substring.
const ALLOWED_RACING_TOKENS = ['f1', 'wrc'];

function hasToken(text: string, token: string) {
  return text.split(/[^a-z0-9]+/).includes(token);
}

export function isAllowedRacingMatch(match: Match) {
  if (match.sportId !== 'racing') return true;
  const text = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  return ALLOWED_RACING_PHRASES.some((phrase) => text.includes(phrase)) || ALLOWED_RACING_TOKENS.some((token) => hasToken(text, token));
}
