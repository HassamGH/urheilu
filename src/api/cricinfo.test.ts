import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '../types';

function cricketMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: '1',
    sportId: 'cricket',
    title: 'India vs Australia',
    homeTeam: 'India',
    awayTeam: 'Australia',
    isLive: false,
    streamsCount: 0,
    ...overrides
  };
}

describe('correctCricketMatchTimes', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Regression test for the root cause of the "renders take minutes on first load" bug: ESPN's
  // fetch here used to carry no timeout of its own, only the (usually undefined) caller signal — so
  // a hanging ESPN response blocked the whole SSR page render indefinitely. It must now give up on
  // its own after ESPN_TIMEOUT_MS and fall through to "keep WatchFooty's original time", same as any
  // other ESPN failure — never hang the caller.
  it('does not hang forever when ESPN never responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener('abort', () => reject(new Error(String(signal.reason))));
          }
          // Deliberately never resolves on its own — simulates a stuck upstream with no HTTP
          // error and no natural end, the exact shape a dead timeout guard can't recover from.
        });
      })
    );

    const { correctCricketMatchTimes } = await import('./cricinfo');
    const matches = [cricketMatch()];

    const result = await correctCricketMatchTimes(matches);

    // Falls open: WatchFooty's original data is kept unchanged rather than the call hanging or
    // throwing.
    expect(result).toEqual(matches);
  }, 8000);
});
