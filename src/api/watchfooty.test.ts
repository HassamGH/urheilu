import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// getStreams' final fallback (streamed.pk) is a separate integration entirely — mocked here so
// tests for the WatchFooty listing/single-match fallback logic don't depend on its behavior.
vi.mock('./streamed', () => ({
  getStreamedFallbackStreams: vi.fn(async () => []),
  toStreamedSport: (sportId?: string) => sportId,
  dropPosterlessFightingMatches: (matches: unknown[]) => matches
}));

import { getMatchDetails, getMatchesForSports, getStreams } from './watchfooty';
import { getStreamedFallbackStreams } from './streamed';
import { dateParam } from '../lib/dateParams';

type FetchArgs = [RequestInfo | URL, RequestInit?];

// Every origin in WATCHFOOTY_API_ORIGINS is tried in order until one responds; since these tests
// always answer the first attempt, only that first origin's URL shape actually matters here.
function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function installFetchMock(handler: (url: string) => Promise<Response>) {
  const calls: string[] = [];
  const fn = vi.fn(async (...args: FetchArgs) => {
    const url = String(args[0]);
    calls.push(url);
    return handler(url);
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

describe('getMatchDetails', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the single-match endpoint when it has the match, without touching the listing', async () => {
    const { calls } = installFetchMock(async (url) => {
      if (url.includes('/match/123')) {
        return jsonResponse({ matchId: '123', title: 'Home vs Away', sport: 'football' });
      }
      throw new Error('unexpected call: ' + url);
    });

    const match = await getMatchDetails('123');
    expect(match.title).toBe('Home vs Away');
    expect(calls.some((u) => u.includes('/matches/all'))).toBe(false);
  });

  it('falls back to the full listing when the single-match endpoint 404s', async () => {
    installFetchMock(async (url) => {
      if (url.includes('/match/123')) return jsonResponse({ error: 'not found' }, 404);
      if (url.includes('/matches/all')) {
        return jsonResponse([{ matchId: '999', title: 'Other Match', sport: 'football' }, { matchId: '123', title: 'Home vs Away', sport: 'football' }]);
      }
      throw new Error('unexpected call: ' + url);
    });

    const match = await getMatchDetails('123');
    expect(match.title).toBe('Home vs Away');
  });

  it('falls back to the listing when the single-match record fails to normalize (e.g. missing title)', async () => {
    // Regression test: an earlier version of this refactor treated "raw match object exists" as
    // success without checking whether normalizeMatchDetails could actually make sense of it,
    // which surfaced as a type error (MatchDetails | null not assignable) and would otherwise have
    // silently thrown "Match not found" for a match the listing endpoint had fine.
    installFetchMock(async (url) => {
      if (url.includes('/match/123')) return jsonResponse({ matchId: '123', sport: 'football' }); // no title
      if (url.includes('/matches/all')) return jsonResponse([{ matchId: '123', title: 'Home vs Away', sport: 'football' }]);
      throw new Error('unexpected call: ' + url);
    });

    const match = await getMatchDetails('123');
    expect(match.title).toBe('Home vs Away');
  });

  it('throws when neither endpoint has the match', async () => {
    installFetchMock(async (url) => {
      if (url.includes('/match/123')) return jsonResponse({ error: 'not found' }, 404);
      if (url.includes('/matches/all')) return jsonResponse([]);
      throw new Error('unexpected call: ' + url);
    });

    await expect(getMatchDetails('123')).rejects.toThrow('Match not found');
  });
});

describe('getStreams', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getStreamedFallbackStreams).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns streams found directly in the sport-scoped listing, without calling the single-match endpoint', async () => {
    const { calls } = installFetchMock(async (url) => {
      if (url.includes('/matches/football')) {
        return jsonResponse([{ matchId: '123', title: 'Home vs Away', sport: 'football', streams: [{ id: 's1', url: 'https://example.com/s1.m3u8', quality: 'HD' }] }]);
      }
      throw new Error('unexpected call: ' + url);
    });

    const streams = await getStreams('123', 'football');
    expect(streams).toHaveLength(1);
    expect(streams[0].id).toBe('s1');
    expect(calls.some((u) => u.includes('/match/123'))).toBe(false);
  });

  it('falls back to the single-match endpoint when the match is entirely absent from the listing', async () => {
    // This is the real bug found in production: a live match with working stream links on
    // /match/{id} was completely missing from /matches/{sport} on every date checked.
    installFetchMock(async (url) => {
      if (url.includes('/matches/football')) return jsonResponse([{ matchId: '999', title: 'Unrelated', sport: 'football', streams: [] }]);
      if (url.includes('/match/123')) {
        return jsonResponse({ matchId: '123', title: 'Home vs Away', sport: 'football', streams: [{ id: 's1', url: 'https://example.com/s1.m3u8' }] });
      }
      throw new Error('unexpected call: ' + url);
    });

    const streams = await getStreams('123', 'football');
    expect(streams).toHaveLength(1);
    expect(streams[0].id).toBe('s1');
  });

  it('falls back to the single-match endpoint when the listing has the match but with no streams', async () => {
    installFetchMock(async (url) => {
      if (url.includes('/matches/football')) return jsonResponse([{ matchId: '123', title: 'Home vs Away', sport: 'football', streams: [] }]);
      if (url.includes('/match/123')) {
        return jsonResponse({ matchId: '123', title: 'Home vs Away', sport: 'football', streams: [{ id: 's1', url: 'https://example.com/s1.m3u8' }] });
      }
      throw new Error('unexpected call: ' + url);
    });

    const streams = await getStreams('123', 'football');
    expect(streams).toHaveLength(1);
  });

  it('falls back to streamed.pk (by team name) when neither endpoint has streams and a sportId is given', async () => {
    installFetchMock(async (url) => {
      if (url.includes('/matches/football')) {
        return jsonResponse([{ matchId: '123', title: 'Home vs Away', sport: 'football', teams: { home: { name: 'Home' }, away: { name: 'Away' } }, streams: [] }]);
      }
      if (url.includes('/match/123')) return jsonResponse({ matchId: '123', title: 'Home vs Away', sport: 'football', streams: [] });
      throw new Error('unexpected call: ' + url);
    });

    await getStreams('123', 'football');
    expect(getStreamedFallbackStreams).toHaveBeenCalledTimes(1);
    expect(getStreamedFallbackStreams).toHaveBeenCalledWith('football', '123', 'Home', 'Away', undefined);
  });

  it('returns an empty list without calling streamed.pk when no sportId is given', async () => {
    installFetchMock(async (url) => {
      if (url.includes('/matches/all')) return jsonResponse([]);
      throw new Error('unexpected call: ' + url);
    });

    const streams = await getStreams('123');
    expect(streams).toEqual([]);
    expect(getStreamedFallbackStreams).not.toHaveBeenCalled();
  });
});

describe('getMatchesForSports deduping', () => {
  // getMatchesForSports fetches dateParam(0) and dateParam(1) (today/tomorrow, LOCAL calendar day)
  // in parallel — computed here with the app's own dateParam rather than a hardcoded date string, so
  // the mock reliably targets one offset's URL vs the other regardless of which real day the suite
  // runs on. Getting this wrong makes both offsets fall into the same mock branch, returning the
  // identical entry twice — a false-positive test that would pass even without the dedup fix, since
  // plain id-based dedup alone already collapses two responses returning the same id.
  const todayParam = dateParam(0);
  const tomorrowParam = dateParam(1);

  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Reproduces a real bug found in production: WatchFooty's own backend assigned two different
  // matchId values to the same live Arsenal vs Coventry City fixture depending on which date-offset
  // request served it. Id-only dedup let both through as if they were separate matches.
  it('collapses the same fixture into one match even when WatchFooty assigns it two different ids', async () => {
    const live = {
      status: 'in',
      sport: 'football',
      league: 'English Premier League',
      date: '2026-08-21T19:00:00.000Z',
      teams: { home: { name: 'Arsenal' }, away: { name: 'Coventry City' } }
    };
    installFetchMock(async (url) => {
      if (url.includes('/matches/football')) {
        // Same fixture, two different ids and slightly different titles — exactly what was observed
        // against the live API (id 4741712 "Arsenal vs Coventry" vs a differently-idd "...Coventry City").
        if (url.includes(`date=${todayParam}`)) return jsonResponse([{ matchId: '4741712', title: 'Arsenal vs Coventry', ...live }]);
        if (url.includes(`date=${tomorrowParam}`)) return jsonResponse([{ matchId: '401879301', title: 'Arsenal vs Coventry City', ...live }]);
      }
      return jsonResponse([]);
    });

    const matches = await getMatchesForSports(['football']);
    const coventryMatches = matches.filter((match) => match.awayTeam === 'Coventry City');
    expect(coventryMatches).toHaveLength(1);
  });

  it('does not merge two genuinely different fixtures between the same teams on different days', async () => {
    // Both marked live (rather than a future `pre` fixture) so isWithinWindow's live short-circuit
    // keeps both in play regardless of the listing's today/tomorrow window — the point of this test
    // is dedup behavior specifically, not date-window filtering.
    const base = { status: 'in', sport: 'football', league: 'English Premier League', teams: { home: { name: 'Arsenal' }, away: { name: 'Coventry City' } } };
    installFetchMock(async (url) => {
      if (url.includes('/matches/football')) {
        if (url.includes(`date=${todayParam}`)) return jsonResponse([{ matchId: 'a', title: 'Arsenal vs Coventry', date: '2026-01-01T19:00:00.000Z', ...base }]);
        if (url.includes(`date=${tomorrowParam}`)) return jsonResponse([{ matchId: 'b', title: 'Arsenal vs Coventry', date: '2026-06-01T19:00:00.000Z', ...base }]);
      }
      return jsonResponse([]);
    });

    const matches = await getMatchesForSports(['football']);
    const coventryMatches = matches.filter((match) => match.awayTeam === 'Coventry City');
    expect(coventryMatches).toHaveLength(2);
  });

  // A baseball doubleheader is two genuinely separate games between the same two teams on the same
  // calendar day, hours apart — an earlier version of this fix keyed dedup on "same day" alone, which
  // would have silently dropped the second game. The 3-hour window exists specifically so this stays
  // 2 matches, not 1.
  it('keeps both games of a same-day doubleheader between the same two teams', async () => {
    const base = { status: 'pre', sport: 'baseball', league: 'MLB', teams: { home: { name: 'Houston Astros' }, away: { name: 'Athletics' } } };
    installFetchMock(async (url) => {
      if (url.includes('/matches/baseball')) {
        if (url.includes(`date=${todayParam}`)) return jsonResponse([{ matchId: 'g1', title: 'Astros vs Athletics (Game 1)', date: '2026-08-22T18:00:00.000Z', ...base }]);
        if (url.includes(`date=${tomorrowParam}`)) return jsonResponse([{ matchId: 'g2', title: 'Astros vs Athletics (Game 2)', date: '2026-08-23T00:00:00.000Z', ...base }]);
      }
      return jsonResponse([]);
    });

    const matches = await getMatchesForSports(['baseball']);
    const doubleheaderMatches = matches.filter((match) => match.awayTeam === 'Athletics');
    expect(doubleheaderMatches).toHaveLength(2);
  });
});
