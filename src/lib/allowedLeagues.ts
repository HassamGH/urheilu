import type { Match } from '../types';

// Each competition matches if ANY pattern's substrings are ALL present in the league name
// (case-insensitive), unless a global exclude word also appears — used to keep e.g. "Serie A"
// from matching "Brazilian Serie A", or "Bundesliga" from matching "2. Bundesliga".
// `exact` is for names that collide as substrings across countries (many nations have their own
// "X Premier League") — in this feed the English one is the bare, unprefixed string.
type LeaguePattern = string[];
type LeagueRule = { patterns?: LeaguePattern[]; exact?: string[]; exclude?: string[] };

const ENGLISH_PREMIER_LEAGUE_NAMES = new Set(['premier league', 'english premier league']);
const ENGLISH_PREMIER_LEAGUE_TEAMS = new Set([
  'arsenal',
  'aston villa',
  'bournemouth',
  'brentford',
  'brighton',
  'brighton & hove albion',
  'chelsea',
  'coventry',
  'coventry city',
  'crystal palace',
  'everton',
  'fulham',
  'hull',
  'hull city',
  'ipswich',
  'ipswich town',
  'leeds',
  'leeds united',
  'liverpool',
  'manchester city',
  'man city',
  'manchester united',
  'man utd',
  'newcastle',
  'newcastle united',
  'nottingham forest',
  'sunderland',
  'tottenham',
  'tottenham hotspur',
  'spurs'
]);

const FOOTBALL_LEAGUE_RULES: LeagueRule[] = [
  { patterns: [['uefa champions league']] },
  { exact: ['premier league', 'english premier league'] },
  { patterns: [['europa league']], exclude: ['conference'] },
  { patterns: [['la liga'], ['laliga']], exclude: ['2', ' ii', 'women'] },
  { patterns: [['serie a']], exclude: ['brazilian', 'women'] },
  { patterns: [['bundesliga']], exclude: ['2.', ' ii', 'women', 'austria'] },
  { patterns: [['fifa world cup'], ['world cup']], exclude: ['qualif', 'women', 'u-', 'u17', 'u20', 'u23', 'club'] },
  { patterns: [['ligue 1']], exclude: ['women'] },
  { patterns: [['conference league']] },
  { patterns: [['copa del rey']] },
  { exact: ['fa cup', 'english fa cup', 'the fa cup'] },
  { patterns: [['european championship'], ['euro ']], exclude: ['qualif', 'women', 'u-', 'u19', 'u21'] },
  { patterns: [['coppa italia']] },
  { patterns: [['uefa super cup']] },
  { patterns: [['coupe de france']] },
  { patterns: [['spanish super cup'], ['supercopa de espana'], ['supercopa espana']] },
  { patterns: [['fifa club world cup'], ['club world cup']] },
  { patterns: [['copa america']] },
  { patterns: [['world cup qualifiers', 'uefa']] },
  { patterns: [['nations league']] },
  { exact: ['community shield', 'fa community shield', 'english community shield'] },
  { patterns: [['dfb pokal'], ['dfb-pokal']] },
  { patterns: [['super cup', 'ital'], ['supercoppa italiana']] },
  { patterns: [['international friendlies', 'uefa']] },
  { patterns: [['super cup', 'german'], ['dfl-supercup'], ['dfl supercup']] },
  { patterns: [['club friendlies', 'uefa']] },
  { patterns: [['super cup', 'france'], ['trophee des champions'], ['trophée des champions']] },
  { patterns: [['european championship qualifiers'], ['euro', 'qualif']] },
  { patterns: [['finalissima']] },
  { exact: ['mls'], patterns: [['major league soccer']], exclude: ['next pro'] },
  { patterns: [['roshn saudi league'], ['saudi pro league'], ['saudi professional league']] }
];

function matchesRule(name: string, rule: LeagueRule) {
  if (rule.exclude?.some((word) => name.includes(word))) return false;
  if (rule.exact?.includes(name)) return true;
  return (rule.patterns || []).some((pattern) => pattern.every((word) => name.includes(word)));
}

function isEnglishPremierLeagueMatch(match: Match, name: string) {
  if (!ENGLISH_PREMIER_LEAGUE_NAMES.has(name)) return false;
  const teams = [match.homeTeam, match.awayTeam].map((team) => team?.trim().toLowerCase()).filter(Boolean) as string[];
  return teams.length > 0 && teams.every((team) => ENGLISH_PREMIER_LEAGUE_TEAMS.has(team));
}

export function isAllowedFootballMatch(match: Match) {
  if (match.sportId !== 'football' && match.sportId !== 'soccer') return true;
  if (!match.competition) return false;
  const name = match.competition.toLowerCase();
  if (ENGLISH_PREMIER_LEAGUE_NAMES.has(name)) return isEnglishPremierLeagueMatch(match, name);
  return FOOTBALL_LEAGUE_RULES.some((rule) => matchesRule(name, rule));
}
