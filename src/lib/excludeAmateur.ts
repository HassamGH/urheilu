import type { Match } from '../types';

const AMATEUR_KEYWORDS = [
  'amateur', 'youth', 'junior', 'academy', 'reserve', 'reserves', 'development', 'emerging',
  'ncaa', 'college', 'university', 'school',
  ' ii', ' 2nd', 'second team', 'b team', '(b)', ' b)',
  // Spanish reserve sides play under their own traditional names rather than a literal "B"/"II"
  // suffix (e.g. "Real Madrid Castilla", not "Real Madrid B") — RESERVE_TEAM_NAME_REGEX below
  // can't catch those, so the well-known ones are listed explicitly here instead.
  'castilla', 'atlètic', 'mestalla', 'sanse', 'bilbao athletic',
  'u-15', 'u-16', 'u-17', 'u-18', 'u-19', 'u-20', 'u-21', 'u-23',
  'u15', 'u16', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
  'under-15', 'under-16', 'under-17', 'under-18', 'under-19', 'under-20', 'under-21', 'under-23',
  'under 15', 'under 16', 'under 17', 'under 18', 'under 19', 'under 20', 'under 21', 'under 23'
];

// Catches reserve-team designations that show up as a bare trailing letter/numeral on the team
// name itself ("Barcelona B", "Real Madrid II") rather than as a keyword in the competition or
// title text — those slip past AMATEUR_KEYWORDS entirely since e.g. "Barcelona B vs CE Europa"
// contains no "b team"/"(b)"/reserve-style substring for it to match against.
const RESERVE_TEAM_NAME_REGEX = /\b(b|ii|iii)$/i;

function isReserveTeamName(name?: string) {
  return Boolean(name) && RESERVE_TEAM_NAME_REGEX.test(name!.trim());
}

export function isAmateurMatch(match: Match) {
  const haystack = `${match.competition || ''} ${match.title || ''}`.toLowerCase();
  if (AMATEUR_KEYWORDS.some((keyword) => haystack.includes(keyword))) return true;
  return isReserveTeamName(match.homeTeam) || isReserveTeamName(match.awayTeam);
}
