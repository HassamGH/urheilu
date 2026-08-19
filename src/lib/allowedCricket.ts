import type { Match } from '../types';

// Team-name based, not competition-name based — international series/tours get named all sorts
// of ways ("India in Sri Lanka", "The Ashes", "ICC T20 World Cup"...), but a genuine international
// is reliably identifiable by both sides being actual countries rather than club/franchise names.
const INTERNATIONAL_TEAMS = new Set([
  'india', 'ind',
  'australia', 'aus',
  'england', 'eng',
  'pakistan', 'pak',
  'sri lanka', 'sl',
  'bangladesh', 'ban',
  'south africa', 'sa',
  'new zealand', 'nz',
  'west indies', 'wi',
  'afghanistan', 'afg',
  'ireland', 'ire',
  'zimbabwe', 'zim',
  'scotland', 'sco',
  'netherlands', 'ned',
  'nepal', 'nep',
  'usa', 'united states', 'us',
  'uae', 'united arab emirates',
  'canada', 'can',
  'namibia', 'nam',
  'oman',
  'papua new guinea', 'png',
  'kenya', 'ken',
  'uganda', 'uga',
  'germany', 'ger',
  'italy', 'ita',
  'spain', 'esp',
  'jersey', 'jer',
  'bermuda', 'ber',
  'hong kong', 'hk',
  'singapore', 'sin',
  'malaysia', 'mal',
  'qatar', 'qat',
  'bahrain', 'bhr',
  'kuwait', 'kwt'
]);

const SUFFIXES_TO_STRIP = [' emerging', ' emerging team', ' a team', ' xi', ' under-19', ' under 19', ' u19', ' women', ' w'];

function normalizeTeamName(name: string) {
  let value = name.toLowerCase().trim();
  for (const suffix of SUFFIXES_TO_STRIP) {
    if (value.endsWith(suffix)) value = value.slice(0, -suffix.length).trim();
  }
  return value;
}

export function isInternationalCricketMatch(match: Match) {
  if (!match.homeTeam || !match.awayTeam) return false;
  return INTERNATIONAL_TEAMS.has(normalizeTeamName(match.homeTeam)) && INTERNATIONAL_TEAMS.has(normalizeTeamName(match.awayTeam));
}

// Domestic franchise leagues, plus the major ICC global events by name — the latter are already
// covered by isInternationalCricketMatch in the normal case (both sides are countries), but naming
// them explicitly guarantees they show even for an edge case (a warm-up game, an unusual team-name
// format) where the team-name check alone might miss.
const ALLOWED_CRICKET_LEAGUE_KEYWORDS = [
  'ipl', 'indian premier league',
  'psl', 'pakistan super league',
  'big bash league',
  'bpl', 'bangladesh premier league',
  'cpl', 'caribbean premier league',
  'global t20 canada',
  'lpl', 'lanka premier league',
  'sa20', 'sa 20',
  'the hundred',
  't20 world cup', 'odi world cup', 'cricket world cup', 'world cup',
  'world test championship', 'test championship', 'wtc'
];

export function isAllowedCricketMatch(match: Match) {
  if (match.sportId !== 'cricket') return true;
  if (isInternationalCricketMatch(match)) return true;
  if (!match.competition) return false;
  const name = match.competition.toLowerCase();
  return ALLOWED_CRICKET_LEAGUE_KEYWORDS.some((keyword) => name.includes(keyword));
}
