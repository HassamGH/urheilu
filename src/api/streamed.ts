import type { Stream } from '../types';

const STREAMED_BASE = 'https://streamed.pk';

type RawStreamedTeam = { name?: string };

type RawStreamedMatch = {
  id: string;
  title?: string;
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
