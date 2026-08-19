import type { Stream } from '../types';

const STREAMED_BASE = 'https://streamed.pk';

type RawStreamedTeam = { name?: string };

type RawStreamedMatch = {
  id: string;
  title?: string;
  poster?: string;
  teams?: { home?: RawStreamedTeam; away?: RawStreamedTeam };
  sources?: { source: string; id: string }[];
};

type RawStreamedStream = {
  streamNo: number;
  language?: string;
  hd?: boolean;
  embedUrl: string;
  source: string;
};

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${STREAMED_BASE}${path}`, { signal });
  if (!response.ok) throw new Error(`Streamed request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

// Our sportId slugs (from WatchFooty/lib/sports.ts) don't all line up with streamed.pk's own
// category slugs — everything else happens to match by coincidence.
const STREAMED_SPORT_SLUGS: Record<string, string> = {
  fighting: 'fight',
  racing: 'motor-sports'
};

export function toStreamedSport(sportId: string) {
  return STREAMED_SPORT_SLUGS[sportId] || sportId;
}

function normalizeTeamName(name?: string) {
  return (name || '').toLowerCase().trim();
}

// Loose (substring, either direction) rather than exact equality — the two APIs don't always spell
// a team the same way ("Sri Lanka" vs "Sri Lanka Cricket Team"), and home/away can be swapped
// between sources. Requires BOTH sides to line up, in either order, so this can't match a
// completely unrelated fixture just because one team name happens to overlap.
function teamsCorrelate(raw: RawStreamedMatch, homeTeam?: string, awayTeam?: string) {
  const rawHome = normalizeTeamName(raw.teams?.home?.name);
  const rawAway = normalizeTeamName(raw.teams?.away?.name);
  const home = normalizeTeamName(homeTeam);
  const away = normalizeTeamName(awayTeam);
  if (!rawHome || !rawAway || !home || !away) return false;

  const overlaps = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);
  return (overlaps(rawHome, home) && overlaps(rawAway, away)) || (overlaps(rawHome, away) && overlaps(rawAway, home));
}

async function fetchStreamsFor(matches: RawStreamedMatch[], signal?: AbortSignal) {
  const perMatch = await Promise.all(
    matches.map(async (match) => {
      const perSource = await Promise.all(
        (match.sources || []).map(({ source, id }) =>
          requestJson<RawStreamedStream[]>(`/api/stream/${source}/${id}`, signal).catch(() => [] as RawStreamedStream[])
        )
      );
      return perSource.flat().map((stream) => ({ stream, matchTitle: match.title }));
    })
  );
  return perMatch.flat();
}

// Used only as a fallback when a WatchFooty match has zero streams of its own. There's no shared id
// between the two APIs, so this correlates by team name first — pulling every stream from
// streamed.pk's own listing would risk attaching a completely different, unrelated live match's
// feed to this one whenever more than one game is live at once.
//
// Cricket only: streamed.pk frequently lists a cricket broadcast under a channel/brand name
// ("Willow Cricket") rather than the actual teams, so team correlation often finds nothing even
// though it's usually airing the same game. When that happens, fall back to every cricket source
// instead of showing nothing — but tag each stream with the source's own title so it's clear this
// wasn't a confirmed match, not presented as if it definitely is this game.
export async function getStreamedFallbackStreams(
  sport: string,
  targetMatchId: string,
  homeTeam: string | undefined,
  awayTeam: string | undefined,
  signal?: AbortSignal
): Promise<Stream[]> {
  const matches = await requestJson<RawStreamedMatch[]>(`/api/matches/${sport}`, signal);
  const correlated = matches.filter((match) => teamsCorrelate(match, homeTeam, awayTeam));

  const isUnconfirmed = correlated.length === 0 && sport === 'cricket';
  const pool = isUnconfirmed ? matches : correlated;
  if (pool.length === 0) return [];

  const results = await fetchStreamsFor(pool, signal);

  return results.map(({ stream, matchTitle }, index) => ({
    id: `streamed-${stream.source}-${stream.streamNo}-${index}`,
    matchId: targetMatchId,
    name: stream.language ? `${stream.language} ${stream.hd ? 'HD' : 'SD'}` : `Stream ${index + 1}`,
    url: stream.embedUrl,
    type: 'embed',
    quality: stream.hd ? 'HD' : 'SD',
    language: stream.language,
    isAvailable: true,
    sourceLabel: isUnconfirmed ? matchTitle : undefined
  }));
}

function normalizeFightTitle(title?: string) {
  return (title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// The fight listing is small (a couple dozen entries) and shared across every fight-card match on
// a page, so it's fetched once and cached for the session rather than once per card.
let fightMatchesPromise: Promise<RawStreamedMatch[]> | null = null;

function getStreamedFightMatches() {
  if (!fightMatchesPromise) {
    fightMatchesPromise = requestJson<RawStreamedMatch[]>('/api/matches/fight').catch(() => [] as RawStreamedMatch[]);
  }
  return fightMatchesPromise;
}

// WatchFooty's own poster asset 500s for most individual fight-card bouts (an upstream bug, not
// something within our control) — streamed.pk's fight listing is an independent second source for
// the same event. There's no shared id between the two APIs, so this correlates by normalized
// title instead, the same way getStreamedFallbackStreams correlates by team name.
export async function getStreamedFightPoster(title: string): Promise<string | undefined> {
  const target = normalizeFightTitle(title);
  if (!target) return undefined;
  const matches = await getStreamedFightMatches();
  const found = matches.find((match) => match.poster && normalizeFightTitle(match.title) === target);
  return found?.poster ? `${STREAMED_BASE}${found.poster}` : undefined;
}

let racingMatchesPromise: Promise<RawStreamedMatch[]> | null = null;

function getStreamedRacingMatches() {
  if (!racingMatchesPromise) {
    racingMatchesPromise = requestJson<RawStreamedMatch[]>('/api/matches/motor-sports').catch(() => [] as RawStreamedMatch[]);
  }
  return racingMatchesPromise;
}

// A racing title on both APIs is "<event> - <session-or-series>" (e.g. WatchFooty's "Heineken
// Dutch Grand Prix - Qual" / streamed's "Dutch Grand Prix - Qualifying"), but which half is the
// "event" and which is the "session" isn't consistent between them (NASCAR flips it: WatchFooty's
// "Team EJP 175 - NASCAR" vs streamed's "Nascar Truck Series 2026 - Team EJP 175") — so both
// orderings are tried. The event half only needs to overlap (sponsor prefixes like "Heineken"
// mean neither side is a clean substring of the other); the session half is matched via a small
// abbreviation table (WatchFooty uses "Qual"/"FP1"/"SR", streamed spells them out) and then
// compared for exact equality — loose substring matching here previously matched "Qual" against
// "Sprint Qualifying" since "qualifying" is a substring of it, attaching the wrong session's poster.
const SESSION_ALIASES: [RegExp, string][] = [
  [/^fp ?1$/, 'practice 1'],
  [/^fp ?2$/, 'practice 2'],
  [/^fp ?3$/, 'practice 3'],
  [/^qual(ifying)?$/, 'qualifying'],
  [/^q ?1$/, 'qualifying 1'],
  [/^sq$/, 'sprint qualifying'],
  [/^ss$/, 'sprint qualifying'],
  [/^sr$/, 'sprint race'],
  [/^sprint$/, 'sprint race'],
  [/^race$/, 'race']
];

function expandSession(chunk: string) {
  for (const [pattern, full] of SESSION_ALIASES) {
    if (pattern.test(chunk)) return full;
  }
  return chunk;
}

function titleChunks(title?: string) {
  return (title || '')
    .split(' - ')
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean);
}

function chunkOverlaps(a: string, b: string) {
  if (a.length < 3 || b.length < 3) return a === b;
  return a === b || a.includes(b) || b.includes(a);
}

function racingTitlesCorrelate(watchfootyTitle: string, streamedTitle?: string) {
  const a = titleChunks(watchfootyTitle);
  const b = titleChunks(streamedTitle);
  if (a.length < 2 || b.length < 2) return false;
  const aEvent = a.slice(0, -1).join(' ');
  const bEvent = b.slice(0, -1).join(' ');
  const aSession = expandSession(a[a.length - 1]);
  const bSession = expandSession(b[b.length - 1]);
  return chunkOverlaps(aEvent, bEvent) && aSession === bSession;
}

// Same upstream-poster-500 problem as fighting (see getStreamedFightPoster), for racing sessions
// instead of fight cards.
export async function getStreamedRacingPoster(title: string): Promise<string | undefined> {
  if (!title) return undefined;
  const matches = await getStreamedRacingMatches();
  const found = matches.find((match) => match.poster && racingTitlesCorrelate(title, match.title));
  return found?.poster ? `${STREAMED_BASE}${found.poster}` : undefined;
}
