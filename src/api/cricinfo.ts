import type { Match } from '../types';
import { logFetchFailure } from '../lib/serverLog';

// ESPN's own aggregate scoreboard (used by espncricinfo.com/espn.com themselves) — unlike ESPN's
// per-league `site.api.espn.com` scoreboard (which needs a league id we don't have ahead of time),
// this one returns every currently-relevant cricket match across leagues for a given date, is
// CORS-open (`access-control-allow-origin: *`), and needs no proxying.
const ESPN_BASE = 'https://site.web.api.espn.com/apis/v2';

type RawEspnCompetitor = {
  homeAway?: string;
  displayName?: string;
};

type RawEspnEvent = {
  date?: string;
  status?: string;
  competitors?: RawEspnCompetitor[];
};

type RawEspnResponse = {
  sports?: { leagues?: { events?: RawEspnEvent[] }[] }[];
};

type CricinfoMatch = {
  homeTeam: string;
  awayTeam: string;
  startTime: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function espnDateParam(offsetDays: number): string {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}`;
}

// See the matching comment on watchfooty.ts's requestJson — same server-side Data Cache reasoning,
// same 20s TTL so this never lags behind what that cache already tolerates.
//
// Mirrors watchfooty.ts's ORIGIN_TIMEOUT_MS/withOriginTimeout (not imported directly — watchfooty.ts
// imports THIS module, so importing back would be circular). Without this, a slow/hanging ESPN
// response had nothing bounding it but the caller's own signal, which is undefined for the initial
// SSR page load — so a single stuck ESPN request blocked the whole page render indefinitely (measured
// multi-minute hangs on a cold serverless instance) instead of falling through to "keep WatchFooty's
// original time" like this function already does for a clean failure.
const ESPN_TIMEOUT_MS = 5000;

function withEspnTimeout(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(ESPN_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function requestForOffset(offsetDays: number, signal?: AbortSignal): Promise<RawEspnResponse> {
  const response = await fetch(`${ESPN_BASE}/scoreboard/header?sport=cricket&dates=${espnDateParam(offsetDays)}`, {
    signal: withEspnTimeout(signal),
    next: { revalidate: 20 }
  });
  if (!response.ok) throw new Error(`ESPN Cricinfo request failed: ${response.status}`);
  return response.json() as Promise<RawEspnResponse>;
}

function flattenEvents(data: RawEspnResponse): CricinfoMatch[] {
  const leagues = data.sports?.[0]?.leagues || [];
  const matches: CricinfoMatch[] = [];
  for (const league of leagues) {
    for (const event of league.events || []) {
      const home = event.competitors?.find((competitor) => competitor.homeAway === 'home')?.displayName;
      const away = event.competitors?.find((competitor) => competitor.homeAway === 'away')?.displayName;
      if (!home || !away || !event.date) continue;
      matches.push({ homeTeam: home, awayTeam: away, startTime: event.date });
    }
  }
  return matches;
}

// Mirrors SPORT_PAGE_DATE_OFFSETS in watchfooty.ts — the widest window any listing ever queries —
// so one cached fetch (shared across every call in the session) covers every cricket match any
// listing could show.
const CRICINFO_DATE_OFFSETS = [-1, 0, 1, 2, 3, 4, 5, 6];

let cricinfoMatchesPromise: Promise<CricinfoMatch[]> | null = null;

function getAllCricinfoMatches(signal?: AbortSignal): Promise<CricinfoMatch[]> {
  if (!cricinfoMatchesPromise) {
    // Each offset caught individually (not left to reject the outer Promise.all) — same reasoning
    // as watchfooty.ts's fetchRawMatchesForSport: one bad date shouldn't cost every other offset's
    // already-fetched corrections, and a silent blanket `.catch(() => [])` here previously meant a
    // single ESPN hiccup on any one of the 8 offsets discarded the whole batch with zero indication
    // of what failed or why.
    cricinfoMatchesPromise = Promise.all(
      CRICINFO_DATE_OFFSETS.map(async (offset) => {
        const path = `/scoreboard/header?sport=cricket&dates=${espnDateParam(offset)}`;
        const start = Date.now();
        try {
          return flattenEvents(await requestForOffset(offset, signal));
        } catch (err) {
          logFetchFailure('GET', path, err, start);
          return [];
        }
      })
    ).then((results) => results.flat());
  }
  return cricinfoMatchesPromise;
}

// Lets a caller that already knows cricket is involved (e.g. watchfooty.ts's getMatches, before it
// even has WatchFooty's own response yet) kick the ESPN fetch off early so it runs concurrently
// with the WatchFooty request instead of only starting once correctCricketMatchTimes is reached
// afterward — correctCricketMatchTimes's own call below just reuses this same cached promise, so
// nothing is fetched twice.
export function warmCricinfoCache(signal?: AbortSignal): void {
  void getAllCricinfoMatches(signal);
}

function normalizeTeamName(name?: string) {
  return (name || '').toLowerCase().trim();
}

function overlaps(a: string, b: string) {
  return a === b || a.includes(b) || b.includes(a);
}

function teamsCorrelate(entry: CricinfoMatch, homeTeam?: string, awayTeam?: string) {
  const home = normalizeTeamName(homeTeam);
  const away = normalizeTeamName(awayTeam);
  const entryHome = normalizeTeamName(entry.homeTeam);
  const entryAway = normalizeTeamName(entry.awayTeam);
  if (!home || !away || !entryHome || !entryAway) return false;
  return (overlaps(entryHome, home) && overlaps(entryAway, away)) || (overlaps(entryHome, away) && overlaps(entryAway, home));
}

// A team pairing can recur within the window (a bilateral series playing several matches), so
// picking the first correlated fixture isn't safe — prefer whichever ESPN fixture's kickoff is
// closest to WatchFooty's own (wrong, but usually not wildly wrong) time instead.
function pickClosest(candidates: CricinfoMatch[], referenceTime?: string): CricinfoMatch | undefined {
  if (candidates.length === 0) return undefined;
  const reference = referenceTime ? new Date(referenceTime).getTime() : Date.now();
  return candidates.reduce((best, candidate) => {
    const bestDiff = Math.abs(new Date(best.startTime).getTime() - reference);
    const candidateDiff = Math.abs(new Date(candidate.startTime).getTime() - reference);
    return candidateDiff < bestDiff ? candidate : best;
  });
}

// WatchFooty's cricket kickoff times are frequently wrong by hours (teams, date, and everything
// else about the match are fine) — ESPN Cricinfo's schedule is the more reliable source for the
// actual kickoff, so every cricket match gets its startTime (and, since that flows into it,
// isLive) recomputed from ESPN's data whenever a correlated fixture is found. Matches ESPN doesn't
// have (or when the ESPN fetch itself fails) just keep WatchFooty's original time — fail open
// rather than dropping/breaking the listing.
export async function correctCricketMatchTimes<T extends Match>(matches: T[], signal?: AbortSignal): Promise<T[]> {
  if (!matches.some((match) => match.sportId === 'cricket')) return matches;

  const cricinfoMatches = await getAllCricinfoMatches(signal);
  if (cricinfoMatches.length === 0) return matches;

  return matches.map((match) => {
    if (match.sportId !== 'cricket') return match;
    const candidates = cricinfoMatches.filter((entry) => teamsCorrelate(entry, match.homeTeam, match.awayTeam));
    const found = pickClosest(candidates, match.startTime);
    const rawIsLive = match.status === 'in' || match.status === 'live';
    // The live indicator only lights up when BOTH sides agree: WatchFooty's own live flag AND
    // ESPN's start time say the match has actually begun. WatchFooty's flag alone isn't trusted
    // for cricket (the same upstream unreliability that motivates the startTime correction above),
    // so an ESPN fixture that can't be found for this match (ambiguous/no correlation) reads as
    // not-live rather than trusting an unconfirmed flag — the card falls back to showing the
    // scheduled date/time instead of a "LIVE" badge that might be wrong.
    if (!found) return { ...match, isLive: false };
    const isLive = rawIsLive && new Date(found.startTime).getTime() <= Date.now();
    return { ...match, startTime: found.startTime, isLive };
  });
}
