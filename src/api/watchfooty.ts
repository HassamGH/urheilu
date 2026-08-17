import type { Match, MatchDetails, Sport, Stream } from '../types';
import { isAllowedFootballMatch } from '../lib/allowedLeagues';
import { isAllowedCricketMatch } from '../lib/allowedCricket';
import { isAllowedFightingMatch } from '../lib/allowedFighting';
import { isAllowedRacingMatch } from '../lib/allowedRacing';
import { isAllowedBaseballMatch } from '../lib/allowedBaseball';
import { isAllowedBasketballMatch } from '../lib/allowedBasketball';
import { isWomensMatch } from '../lib/excludeWomens';
import { isAmateurMatch } from '../lib/excludeAmateur';
import { getStreamedFallbackStreams, toStreamedSport } from './streamed';

const API_BASE = '/api/watchfooty';

type RawSport = {
  name?: string;
  displayName?: string;
};

type RawStream = {
  id?: string;
  url?: string;
  quality?: string;
  language?: string;
  isRedirect?: boolean;
  nsfw?: boolean;
  ads?: boolean;
};

type RawMatch = {
  matchId?: string;
  id?: string;
  title?: string;
  poster?: string;
  teams?: {
    home?: { name?: string; logoUrl?: string };
    away?: { name?: string; logoUrl?: string };
  };
  homeScore?: number;
  awayScore?: number;
  status?: string;
  currentMinute?: string;
  date?: string;
  timestamp?: number;
  league?: string;
  leagueLogo?: string;
  sport?: string;
  venue?: string;
  note?: string;
  streams?: RawStream[];
};

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`WatchFooty request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function absoluteAsset(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.replace(/^\/api\/v1/, '')}`;
}

function streamType(url: string): Stream['type'] {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mpd')) return 'dash';
  if (/\.(mp4|webm|ogg)(\?|$)/.test(lower)) return 'video';
  if (lower.includes('/embed/') || lower.includes('spiderembed')) return 'embed';
  return 'unknown';
}

export function normalizeSport(raw: RawSport): Sport | null {
  if (!raw.name) return null;
  return {
    id: raw.name,
    slug: raw.name,
    name: raw.displayName || raw.name.replaceAll('-', ' ')
  };
}

export function normalizeStream(raw: RawStream, matchId: string, index = 0): Stream | null {
  if (!raw.url) return null;
  const id = raw.id || `${matchId}-${index}`;
  return {
    id,
    matchId,
    name: raw.quality ? `${raw.quality} Stream` : `Stream ${index + 1}`,
    url: raw.url,
    type: streamType(raw.url),
    quality: raw.quality,
    language: raw.language,
    isAvailable: Boolean(raw.url),
    hasAds: raw.ads,
    isNsfw: raw.nsfw
  };
}

export function normalizeMatch(raw: RawMatch): Match | null {
  const id = raw.matchId || raw.id;
  if (!id || !raw.title) return null;
  const status = raw.status;
  // `currentMinute` is overloaded by the API: for live matches it's the match clock ("22'"),
  // but for not-yet-started matches it's a formatted kickoff time string, so it can't be used as a live signal.
  const isLive = status === 'in' || status === 'live';
  return {
    id,
    sportId: raw.sport || 'unknown',
    title: raw.title,
    poster: absoluteAsset(raw.poster),
    homeTeam: raw.teams?.home?.name,
    awayTeam: raw.teams?.away?.name,
    homeTeamLogo: absoluteAsset(raw.teams?.home?.logoUrl),
    awayTeamLogo: absoluteAsset(raw.teams?.away?.logoUrl),
    competition: raw.league,
    competitionLogo: absoluteAsset(raw.leagueLogo),
    // `timestamp` is already epoch milliseconds (confirmed against live responses, where it matches
    // `date` exactly) — this is only a fallback for the rare record missing `date` entirely.
    startTime: raw.date || (raw.timestamp ? new Date(raw.timestamp).toISOString() : undefined),
    status,
    isLive,
    streamsCount: raw.streams?.length || 0
  };
}

export function normalizeMatchDetails(raw: RawMatch): MatchDetails | null {
  const match = normalizeMatch(raw);
  if (!match) return null;
  return {
    ...match,
    venue: raw.venue,
    note: raw.note,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
    minute: raw.currentMinute
  };
}

export async function getSports(signal?: AbortSignal) {
  const data = await requestJson<RawSport[]>('/sports', signal);
  return data.map(normalizeSport).filter(Boolean) as Sport[];
}

// The API has no "upcoming/live only" param — it always returns finished matches mixed in with
// live/upcoming ones, so this is the earliest point we can drop them. A grace window (rather than
// a strict now-cutoff) avoids misclassifying a match as finished during the brief window right at
// kickoff where the feed's `status` hasn't flipped to live yet.
const FINISHED_GRACE_MS = 3 * 60 * 60 * 1000;

function isFinishedMatch(match: Match) {
  if (match.isLive || !match.startTime) return false;
  const kickoff = new Date(match.startTime).getTime();
  if (Number.isNaN(kickoff)) return false;
  return kickoff + FINISHED_GRACE_MS < Date.now();
}

// The API has no per-league filtering — fetching a sport always returns every match for it, so
// this is the earliest point we can drop matches from leagues/competitions we don't show, keeping
// that decision out of the UI layer entirely.
function applyListingFilters(matches: Match[]) {
  return matches.filter(
    (match) =>
      isAllowedFootballMatch(match) &&
      isAllowedCricketMatch(match) &&
      isAllowedFightingMatch(match) &&
      isAllowedRacingMatch(match) &&
      isAllowedBaseballMatch(match) &&
      isAllowedBasketballMatch(match) &&
      !isWomensMatch(match) &&
      !isAmateurMatch(match) &&
      !isFinishedMatch(match)
  );
}

export async function getMatches(sport = 'all', signal?: AbortSignal) {
  const data = await requestJson<RawMatch[]>(`/matches/${sport}`, signal);
  const matches = data.map(normalizeMatch).filter(Boolean) as Match[];
  return applyListingFilters(matches);
}

// Fetches only the given sports (in parallel) instead of the combined `/matches/all` endpoint,
// so sports we don't want to show are never requested in the first place.
export async function getMatchesForSports(sports: string[], signal?: AbortSignal) {
  const results = await Promise.all(sports.map((sport) => requestJson<RawMatch[]>(`/matches/${sport}`, signal)));
  const matches = results.flat().map(normalizeMatch).filter(Boolean) as Match[];
  return applyListingFilters(matches);
}

export async function getMatchDetails(matchId: string, signal?: AbortSignal) {
  // The single-match endpoint is intermittently unreliable (404s or empty results for matches that
  // the listing endpoint returns fine), so fall back to searching the full listing before giving up.
  try {
    const data = await requestJson<RawMatch[] | RawMatch>(`/match/${matchId}`, signal);
    const raw = Array.isArray(data) ? data[0] : data;
    const match = raw && normalizeMatchDetails(raw);
    if (match) return match;
  } catch {
    // fall through to the listing-based lookup below
  }

  const listing = await requestJson<RawMatch[]>('/matches/all', signal);
  const raw = listing.find((item) => (item.matchId || item.id) === matchId);
  const match = raw && normalizeMatchDetails(raw);
  if (!match) throw new Error('Match not found');
  return match;
}

export async function getStreams(matchId: string, sportId?: string, signal?: AbortSignal) {
  const data = await requestJson<RawMatch[]>(`/matches/${sportId || 'all'}`, signal);
  const raw = data.find((item) => (item.matchId || item.id) === matchId);
  const streams = (raw?.streams || []).map((stream, index) => normalizeStream(stream, matchId, index)).filter(Boolean) as Stream[];
  if (streams.length > 0 || !sportId) return streams;

  // WatchFooty has nothing for this match, for any sport — fall back to whatever streamed.pk
  // currently has for the specific fixture (matched by team name, see getStreamedFallbackStreams),
  // not just anything live for the sport (there's no shared id between the two APIs to match on
  // instead, and pooling indiscriminately would attach an unrelated match's stream when more than
  // one game in that sport is live at once). Matches with no team names (e.g. single-event fighting
  // cards) can never correlate this way, so they'll just get no fallback — expected, not a bug.
  return getStreamedFallbackStreams(toStreamedSport(sportId), matchId, raw?.teams?.home?.name, raw?.teams?.away?.name, signal).catch(() => []);
}
