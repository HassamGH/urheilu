import type { Match, MatchDetails, Sport, Stream } from '../types';
import { isAllowedFootballMatch } from '../lib/allowedLeagues';
import { isAllowedCricketMatch, isInternationalCricketMatch } from '../lib/allowedCricket';
import { isAllowedFightingMatch } from '../lib/allowedFighting';
import { isAllowedRacingMatch } from '../lib/allowedRacing';
import { isAllowedBaseballMatch } from '../lib/allowedBaseball';
import { isAllowedBasketballMatch } from '../lib/allowedBasketball';
import { isWomensMatch } from '../lib/excludeWomens';
import { isAmateurMatch } from '../lib/excludeAmateur';
import { isPlayoffMatch } from '../lib/excludePlayoffs';
import { dateParam } from '../lib/dateParams';
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { getStreamedFallbackStreams, toStreamedSport, dropPosterlessFightingMatches } from './streamed';
import { correctCricketMatchTimes, warmCricinfoCache } from './cricinfo';

// Client-side calls stay relative, routed through the `/api/watchfooty/*` Vercel rewrite proxy (see
// vercel.json) — unchanged from before. Server Components have no implicit origin to resolve a
// relative fetch() against, and since CORS is a browser-only concern anyway, server-side calls skip
// the proxy entirely and hit WatchFooty's upstream API directly.
const API_BASE = typeof window === 'undefined' ? 'https://api.watchfooty.st/api/v1' : '/api/watchfooty';

// Image/logo assets are served from WatchFooty's own Cloudflare-fronted origin with
// `access-control-allow-origin: *` and long-lived `Cache-Control` (a year for logos, hours for
// posters) already set — routing them through our `/api/watchfooty` proxy would strip none of
// that but adds a pointless extra hop (and the Basic Auth middleware check) on every single image
// a page loads. Pointing `<img>` tags straight at the origin lets the browser hit its CDN directly
// and reuse its own HTTP cache across matches that share a team/league logo.
const ASSET_ORIGIN = 'https://api.watchfooty.st';

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
  return `${ASSET_ORIGIN}${url}`;
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

// `fallbackId` covers the single-match detail endpoint (see getMatchDetails): for single-event
// fixtures (racing sessions, WWE/UFC shows...) that response omits both `matchId` and `id`
// entirely — it has an unrelated `eventId` instead — even though every other field is valid, so
// normalizing would otherwise reject perfectly good data just for lacking an id. The caller
// already knows the id it requested the match by, so it's threaded through as the fallback.
export function normalizeMatch(raw: RawMatch, fallbackId?: string): Match | null {
  const id = raw.matchId || raw.id || fallbackId;
  if (!id || !raw.title) return null;
  const status = raw.status;
  // `currentMinute` is overloaded by the API: for live matches it's the match clock ("22'"),
  // but for not-yet-started matches it's a formatted kickoff time string, so it can't be used as a live signal.
  const rawIsLive = status === 'in' || status === 'live';
  // `timestamp` is already epoch milliseconds (confirmed against live responses, where it matches
  // `date` exactly) — this is only a fallback for the rare record missing `date` entirely.
  const startTime = raw.date || (raw.timestamp ? new Date(raw.timestamp).toISOString() : undefined);
  // The upstream `status` field occasionally gets stuck on "in"/"live" ahead of actual kickoff
  // (seen on cricket, where `date` is day-granular with no kickoff time, so this can't catch
  // same-day cases — but it does catch matches flagged live while dated a future day).
  const isLive = rawIsLive && (!startTime || new Date(startTime).getTime() <= Date.now());
  // Same single-match endpoint, another quirk: single-event fixtures get the event name stuffed
  // into BOTH `teams.home.name` and `teams.away.name` (identical strings, identical logos) instead
  // of the listing endpoints' `teams.event` shape — which would otherwise defeat isEvent detection
  // downstream (MatchCard etc.) and render as a nonsense "Event Name vs Event Name" card. Collapse
  // it back to "no team data" whenever both sides are the same non-empty name.
  const rawHomeName = raw.teams?.home?.name;
  const rawAwayName = raw.teams?.away?.name;
  const isDuplicatedEventName = Boolean(rawHomeName) && rawHomeName === rawAwayName;
  return {
    id,
    sportId: raw.sport || 'unknown',
    title: raw.title,
    poster: absoluteAsset(raw.poster),
    homeTeam: isDuplicatedEventName ? undefined : rawHomeName,
    awayTeam: isDuplicatedEventName ? undefined : rawAwayName,
    homeTeamLogo: isDuplicatedEventName ? undefined : absoluteAsset(raw.teams?.home?.logoUrl),
    awayTeamLogo: isDuplicatedEventName ? undefined : absoluteAsset(raw.teams?.away?.logoUrl),
    competition: raw.league,
    competitionLogo: absoluteAsset(raw.leagueLogo),
    startTime,
    status,
    isLive,
    streamsCount: raw.streams?.length || 0
  };
}

export function normalizeMatchDetails(raw: RawMatch, fallbackId?: string): MatchDetails | null {
  const match = normalizeMatch(raw, fallbackId);
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

// Only matches within `windowDays` of today should ever reach the listing, in the viewer's own
// calendar day — a hard cutoff on top of the `date`-scoped fetches below, since the upstream `date`
// filter's day boundaries don't reliably line up with what was requested (it spills into neighboring
// days). `windowDays: 2` is today+tomorrow (the default, used everywhere except the single-sport
// listing); `windowDays: 7` covers a full week out for that view's day-by-day rail.
function isWithinWindow(match: Match, windowDays: number) {
  if (match.isLive || !match.startTime) return true;
  const kickoff = new Date(match.startTime).getTime();
  if (Number.isNaN(kickoff)) return true;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfWindow = startOfToday + windowDays * 24 * 60 * 60 * 1000;
  return kickoff >= startOfToday && kickoff < endOfWindow;
}

function dedupeMatches(matches: Match[]): Match[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

// Domestic T20 leagues (CPL, IPL, PSL...) never run longer than ~5 hours, so `status` stuck on
// "in" past that point is a stale upstream flag rather than a genuinely long match — seen on CPL
// fixtures still reporting "in" a full day after kickoff. International cricket is exempted since
// Test matches legitimately stay "in progress" for days.
const CRICKET_LIVE_STALE_MS = 8 * 60 * 60 * 1000;

function correctStaleLiveCricket(match: Match): Match {
  if (match.sportId !== 'cricket' || !match.isLive || !match.startTime) return match;
  if (isInternationalCricketMatch(match)) return match;
  const kickoff = new Date(match.startTime).getTime();
  if (Number.isNaN(kickoff) || kickoff + CRICKET_LIVE_STALE_MS >= Date.now()) return match;
  return { ...match, isLive: false };
}

// The API has no per-league filtering — fetching a sport always returns every match for it, so
// this is the earliest point we can drop matches from leagues/competitions we don't show, keeping
// that decision out of the UI layer entirely.
//
// `allowStaleLiveOutsideWindow` controls whether a stale-live-corrected match (see
// correctStaleLiveCricket) can still appear even though it's dated outside today/tomorrow — true
// for the main per-sport/all listing (so a stuck fixture like a CPL match still shows, just
// unbadged, instead of vanishing), false for the popular/featured feeds that back the home page
// banner, which should never surface a yesterday-dated match regardless of live-status corrections.
function applyListingFilters(
  matches: Match[],
  { allowStaleLiveOutsideWindow = true, windowDays = 2 }: { allowStaleLiveOutsideWindow?: boolean; windowDays?: number } = {}
) {
  // Matches aren't dropped just because they're old/finished — only by falling outside the date
  // window below (or, for a stale-live-corrected cricket match, not even then — see
  // allowStaleLiveOutsideWindow).
  const staleLiveCorrectedIds = new Set<string>();
  const corrected = matches.map((match) => {
    const fixed = correctStaleLiveCricket(match);
    if (fixed !== match) staleLiveCorrectedIds.add(fixed.id);
    return fixed;
  });
  return corrected.filter(
    (match) =>
      isAllowedFootballMatch(match) &&
      isAllowedCricketMatch(match) &&
      isAllowedFightingMatch(match) &&
      isAllowedRacingMatch(match) &&
      isAllowedBaseballMatch(match) &&
      isAllowedBasketballMatch(match) &&
      !isWomensMatch(match) &&
      !isAmateurMatch(match) &&
      !isPlayoffMatch(match) &&
      ((allowStaleLiveOutsideWindow && staleLiveCorrectedIds.has(match.id)) || isWithinWindow(match, windowDays))
  );
}

// The per-sport endpoint returns everything it has (weeks of fixtures) unless scoped with `date`,
// so every listing fetch is pinned to just the calendar days it actually needs instead. Default is
// today+tomorrow; getMatches (a single filtered sport) pulls a wider [-1..6] range — yesterday for a
// fixture stuck mid-correction (see correctStaleLiveCricket/allowStaleLiveOutsideWindow), and a full
// week forward for that page's day-by-day rail. The "All" view and the featured banner stay narrow.
async function fetchRawMatchesForSport(sport: string, signal?: AbortSignal, offsets: number[] = [0, 1]): Promise<RawMatch[]> {
  const results = await Promise.all(offsets.map((offset) => requestJson<RawMatch[]>(`/matches/${sport}?date=${dateParam(offset)}`, signal)));
  return results.flat();
}

const SPORT_PAGE_DATE_OFFSETS = [-1, 0, 1, 2, 3, 4, 5, 6];

export async function getMatches(sport = 'all', signal?: AbortSignal) {
  // Kicked off before awaiting WatchFooty below (rather than left to correctCricketMatchTimes to
  // discover afterward) so the ESPN and WatchFooty requests run concurrently instead of back to
  // back — for a cricket-inclusive listing this was previously doubling the wait, since
  // correctCricketMatchTimes only ever started its fetch once WatchFooty's had already finished.
  if (sport === 'all' || sport === 'cricket') warmCricinfoCache(signal);
  const raw = await fetchRawMatchesForSport(sport, signal, SPORT_PAGE_DATE_OFFSETS);
  const matches = dedupeMatches(raw.map((item) => normalizeMatch(item)).filter(Boolean) as Match[]);
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  return applyListingFilters(withPosters, { windowDays: 7 });
}

// Fetches only the given sports (in parallel) instead of the combined `/matches/all` endpoint,
// so sports we don't want to show are never requested in the first place.
export async function getMatchesForSports(sports: string[], signal?: AbortSignal) {
  if (sports.includes('cricket')) warmCricinfoCache(signal);
  const results = await Promise.all(sports.map((sport) => fetchRawMatchesForSport(sport, signal)));
  const matches = dedupeMatches(results.flat().map((item) => normalizeMatch(item)).filter(Boolean) as Match[]);
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  return applyListingFilters(withPosters);
}

export async function getPopularMatches(date?: string, signal?: AbortSignal) {
  // Unlike getMatches/getMatchesForSports, this endpoint spans every sport with no per-sport
  // param to check ahead of time — warmed unconditionally since it's a cached, cheap no-op for
  // callers that turn out to have no cricket in the results.
  warmCricinfoCache(signal);
  const query = date ? `?date=${date}` : '';
  const data = await requestJson<RawMatch[]>(`/matches/popular${query}`, signal);
  const matches = data.map((item) => normalizeMatch(item)).filter(Boolean) as Match[];
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  return applyListingFilters(withPosters, { allowStaleLiveOutsideWindow: false });
}

export async function getPopularLiveMatches(signal?: AbortSignal) {
  warmCricinfoCache(signal);
  const data = await requestJson<RawMatch[]>('/matches/popular/live', signal);
  const matches = data.map((item) => normalizeMatch(item)).filter(Boolean) as Match[];
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  return applyListingFilters(withPosters, { allowStaleLiveOutsideWindow: false });
}

// The `/matches/popular*` endpoints span every sport the API has (14, including ones this site
// never shows a filter tab for — tennis, golf, darts, rugby...), not just the ones we actually
// display — so the banner needs its own sport allow-list rather than a small blocklist. Built from
// SHOWN_SPORT_SLUGS (the same list driving the sport filter pills) minus baseball/hockey/basketball,
// which are shown elsewhere on the site but specifically not wanted in the banner.
const FEATURED_EXCLUDED_SPORTS = new Set(['baseball', 'hockey', 'basketball']);
const FEATURED_ALLOWED_SPORTS = new Set(SHOWN_SPORT_SLUGS.filter((slug) => !FEATURED_EXCLUDED_SPORTS.has(slug)));

// Feeds the home page's featured banner: currently-live popular matches first, then today's and
// tomorrow's popular picks — merged and deduped rather than just taking the first match off the
// regular listing, so the banner surfaces genuinely notable fixtures instead of whatever sorts first.
export async function getFeaturedMatches(signal?: AbortSignal) {
  const [live, today, tomorrow] = await Promise.all([
    getPopularLiveMatches(signal),
    getPopularMatches(dateParam(0), signal),
    getPopularMatches(dateParam(1), signal)
  ]);
  return dedupeMatches([...live, ...today, ...tomorrow]).filter((match) => FEATURED_ALLOWED_SPORTS.has(match.sportId));
}

export async function getMatchDetails(matchId: string, signal?: AbortSignal) {
  // The single-match endpoint is intermittently unreliable (404s or empty results for matches that
  // the listing endpoint returns fine), so fall back to searching the full listing before giving up.
  try {
    const data = await requestJson<RawMatch[] | RawMatch>(`/match/${matchId}`, signal);
    const raw = Array.isArray(data) ? data[0] : data;
    const match = raw && normalizeMatchDetails(raw, matchId);
    if (match) {
      const [corrected] = await correctCricketMatchTimes([match], signal);
      return correctStaleLiveCricket(corrected) as MatchDetails;
    }
  } catch {
    // fall through to the listing-based lookup below
  }

  const listing = await requestJson<RawMatch[]>('/matches/all', signal);
  const raw = listing.find((item) => (item.matchId || item.id) === matchId);
  const match = raw && normalizeMatchDetails(raw, matchId);
  if (!match) throw new Error('Match not found');
  const [corrected] = await correctCricketMatchTimes([match], signal);
  return correctStaleLiveCricket(corrected) as MatchDetails;
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
