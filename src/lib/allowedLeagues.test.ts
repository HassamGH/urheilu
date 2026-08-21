import { describe, expect, it } from 'vitest';
import { isAllowedFootballMatch } from './allowedLeagues';
import type { Match } from '../types';

function footballMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: '1',
    sportId: 'football',
    title: 'Test vs Test',
    isLive: false,
    streamsCount: 0,
    ...overrides
  };
}

describe('isAllowedFootballMatch', () => {
  it('allows English Premier League fixtures (exact match)', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'English Premier League' }))).toBe(true);
  });

  it('rejects bare "Premier League" — that string belongs to Azerbaijan in this feed, not England', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Premier League' }))).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'english premier league' }))).toBe(true);
    expect(isAllowedFootballMatch(footballMatch({ competition: 'ENGLISH PREMIER LEAGUE' }))).toBe(true);
  });

  it('allows Champions League fixtures', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'UEFA Champions League' }))).toBe(true);
  });

  it('allows La Liga but rejects its reserve/second division', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'La Liga' }))).toBe(true);
    expect(isAllowedFootballMatch(footballMatch({ competition: 'La Liga 2' }))).toBe(false);
  });

  it('allows Serie A but rejects the Brazilian league of the same name', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Serie A' }))).toBe(true);
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Brazilian Serie A' }))).toBe(false);
  });

  it('allows Bundesliga but rejects 2. Bundesliga', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Bundesliga' }))).toBe(true);
    expect(isAllowedFootballMatch(footballMatch({ competition: '2. Bundesliga' }))).toBe(false);
  });

  it('rejects matches with no competition at all', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: undefined }))).toBe(false);
  });

  it('rejects a league not on the allow-list', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Some Regional Sunday League' }))).toBe(false);
  });

  it('never filters non-football sports, regardless of competition name', () => {
    expect(isAllowedFootballMatch(footballMatch({ sportId: 'cricket', competition: 'Some Regional Sunday League' }))).toBe(true);
    expect(isAllowedFootballMatch(footballMatch({ sportId: 'basketball', competition: undefined }))).toBe(true);
  });

  it('only allows Club Friendlies when a marquee club is playing', () => {
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Club Friendlies', homeTeam: 'Arsenal', awayTeam: 'Some FC' }))).toBe(true);
    expect(isAllowedFootballMatch(footballMatch({ competition: 'Club Friendlies', homeTeam: 'Some FC', awayTeam: 'Another FC' }))).toBe(false);
  });
});
