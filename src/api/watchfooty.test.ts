import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// getStreams' final fallback (streamed.pk) is a separate integration entirely — mocked here so
// tests for the WatchFooty listing/single-match fallback logic don't depend on its behavior.
vi.mock('./streamed', () => ({
  getStreamedFallbackStreams: vi.fn(async () => []),
  toStreamedSport: (sportId?: string) => sportId,
  dropPosterlessFightingMatches: (matches: unknown[]) => matches
}));

import { getMatchDetails, getStreams } from './watchfooty';
import { getStreamedFallbackStreams } from './streamed';

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
