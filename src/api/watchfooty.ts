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

// `.ru` and `.su` both mirror `.st` exactly — same endpoint shapes, same relative poster/logo
// paths, same open CORS — so each is a straight failover, not a different integration. Tried in
// order and only ever sequentially (see requestJson/route.ts): a healthy primary never pays for the
// others existing at all, since nothing later in the list is even attempted. Exported for the
// client-side proxy route (src/app/api/watchfooty/[...path]/route.ts) to share, so there's one list
// instead of several that could drift apart.
export const WATCHFOOTY_API_ORIGINS = ['https://api.watchfooty.st', 'https://api.watchfooty.ru', 'https://api.watchfooty.su'];

// Client-side calls stay relative, routed through the `/api/watchfooty/*` route handler (see
// src/app/api/watchfooty/[...path]/route.ts), which runs the same primary/fallback attempt
// server-side and reports which origin it used via a response header — see requestJson below.
// Server Components have no implicit origin to resolve a relative fetch() against, and since CORS
// is a browser-only concern anyway, server-side calls skip the proxy entirely and try each origin
// directly.
const CLIENT_API_BASE = '/api/watchfooty';

// Image/logo assets are served from whichever WatchFooty origin actually answered the request that
// returned them (see requestJson's `assetOrigin`) — routing them through our own proxy would strip
// none of their own long-lived `Cache-Control` (a year for logos, hours for posters) but adds a
// pointless extra hop (and the Basic Auth middleware check) on every single image a page loads.
// Pointing `<img>` tags straight at the origin lets the browser hit its CDN directly and reuse its
// own HTTP cache across matches that share a team/league logo.

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

// `next.revalidate` only takes effect for the server-side branch (fetching WatchFooty directly) —
// it puts these calls in Next's server-side Data Cache, so e.g. clicking from a match page into one
// of its streams (two separate Server Component renders, seconds apart) reuses the just-fetched
// match/listing data instead of re-hitting WatchFooty's API from scratch, and every visitor loading
// the same match within the window shares one upstream request. On the client-side branch (relative
// `/api/watchfooty/*`, a plain browser fetch) this option is simply ignored — the live-polling
// components already get their own freshness from useAsync's refresh interval. 20s mirrors the
// service worker's own API_TTL_MS, so a page's data is never staler than what the SW would already
// be willing to serve from its own cache.
//
// `cacheable` opts a call OUT of that: Next's Data Cache silently refuses to store any single entry
// over 2MB (logging an error and falling through to an uncached fetch instead of throwing) — and a
// full per-sport/all-sports listing (see the "300-1500+ raw matches" comment on isWithinWindow
// below) routinely lands well past that on a busy day, which was spamming that failed-to-cache error
// on every request for exactly the endpoints most worth NOT re-fetching. Passing `false` for those
// skips the doomed cache-write attempt entirely rather than paying its cost for nothing.
//
// Every caller gets back not just the parsed body but `assetOrigin` — whichever WatchFooty host
// actually answered — because normalizeMatch's poster/logo fields are relative paths, and `.ru`'s
// aren't guaranteed to resolve on `.st` (different host, unrelated CDN cache) or vice versa. A
// request that failed over mid-outage needs its own assets resolved against the origin that
// actually served ITS data, not whichever origin some other request happened to use.
type ApiResult<T> = { data: T; assetOrigin: string };

// A dead origin's fetch doesn't necessarily fail fast — a hostname that stops resolving, or a host
// that accepts a connection and then never answers, can hang far longer than a clean HTTP error
// response would (measured: one dead entry in WATCHFOOTY_API_ORIGINS was enough to stall a full
// page load past 30s with no timeout here). Capping each origin's own attempt means a truly dead
// one costs at most this long before moving on, however many more origins are still left to try.
//
// 5s, not something more generous — a hang here means the origin isn't answering AT ALL (this is
// what actually fires, not a slow-but-eventually-successful response; normal responses measured at
// 0.5-2s even under this app's own realistic concurrent load, so 5s already gives 2.5x+ headroom).
// Waiting longer buys nothing for a host that was never going to answer either way, and directly
// costs load time: three origins hanging back-to-back for one date range was measured taking a
// single sport-filtered page over 24s to finally give up on that one date and move on.
export const ORIGIN_TIMEOUT_MS = 5000;

function withOriginTimeout(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(ORIGIN_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

// `AbortSignal.timeout()`'s abort reason is a DOMException, not a plain Error — and unlike a plain
// Error, DOMException's `message` is a getter-only prototype property with no setter. Next's own
// error handling tries to write to `.message` when logging/serializing a thrown value, which is
// silent for a normal Error but throws a totally unrelated TypeError for a raw DOMException — seen
// in practice: exhausting every origin surfaced "Cannot set property message of [object
// DOMException] which has only a getter" instead of the actual WatchFooty failure. Normalizing
// whatever was caught into a real `Error` before it's ever stored/rethrown avoids that regardless
// of what specifically caused it.
function toError(err: unknown): Error {
  return new Error(err instanceof Error ? err.message : String(err));
}

// Shared classification for every place a failed upstream fetch gets logged/reported, so the same
// underlying failure reads the same way everywhere instead of each call site inventing its own
// label. TIMEOUT is our own withOriginTimeout firing (origin never answered at all). ABORTED covers
// the connection dropping mid-response — "The destination stream closed early" and its relatives
// (ECONNRESET, "socket hang up") all mean the same thing: something between us and the origin closed
// the pipe before the body finished, most often because the client that originally asked for this
// page navigated away or the app was backgrounded (common on mobile PWAs) and Next canceled the
// in-flight render — not a WatchFooty outage, so it gets its own label rather than folding into the
// generic ERROR bucket a real 4xx/5xx/DNS failure gets.
function classifyFetchError(err: unknown): { label: string; status: number } {
  const message = err instanceof Error ? err.message : String(err);
  if (/timeout|timed out/i.test(message)) return { label: 'TIMEOUT', status: 504 };
  if (/closed early|aborted|econnreset|socket hang up/i.test(message)) return { label: 'ABORTED', status: 499 };
  return { label: 'ERROR', status: 500 };
}

async function requestJson<T>(path: string, signal?: AbortSignal, cacheable = true): Promise<ApiResult<T>> {
  if (typeof window === 'undefined') {
    let lastError: Error | undefined;
    for (const origin of WATCHFOOTY_API_ORIGINS) {
      try {
        const response = await fetch(`${origin}/api/v1${path}`, {
          signal: withOriginTimeout(signal),
          ...(cacheable ? { next: { revalidate: 20 } } : {})
        });
        if (!response.ok) throw new Error(`WatchFooty request failed: ${response.status}`);
        return { data: (await response.json()) as T, assetOrigin: origin };
      } catch (err) {
        // Only the ORIGINAL caller-supplied signal aborting means the caller stopped waiting
        // (unmount, a newer request superseding this one) — trying another origin for data nobody
        // wants anymore would just be wasted work. `signal` here is never the per-origin timeout
        // signal created above, so a timeout firing falls through to the next origin like any other
        // failure instead of being mistaken for that.
        //
        // What actually gets caught here in that case is often a raw Node/undici error mid-body-read
        // ("The destination stream closed early" and its relatives) rather than the caller's own
        // AbortError — the fetch to WatchFooty was still streaming its response in when the outer
        // signal fired, so the read itself throws whatever shape undici happens to use, not a clean
        // Error. Always normalize through toError before it leaves this function (same reason as the
        // DOMException handling above), classified/logged the same way fetchRawMatchesForSport labels
        // its own failures, so this never surfaces as an unlabeled crash with just a Next digest.
        if (signal?.aborted) {
          const normalized = toError(err);
          const { label } = classifyFetchError(normalized);
          console.warn(` ${ANSI_RED}WARN${ANSI_RESET} GET ${path} ${ANSI_RED}[${label}]${ANSI_RESET} client disconnected mid-request`);
          throw normalized;
        }
        lastError = toError(err);
      }
    }
    throw lastError;
  }

  const response = await fetch(`${CLIENT_API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`WatchFooty request failed: ${response.status}`);
  }
  const assetOrigin = response.headers.get('x-api-origin') || WATCHFOOTY_API_ORIGINS[0];
  return { data: (await response.json()) as T, assetOrigin };
}

function absoluteAsset(url: string | undefined, assetOrigin: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${assetOrigin}${url}`;
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
export function normalizeMatch(raw: RawMatch, assetOrigin: string, fallbackId?: string): Match | null {
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
    poster: absoluteAsset(raw.poster, assetOrigin),
    homeTeam: isDuplicatedEventName ? undefined : rawHomeName,
    awayTeam: isDuplicatedEventName ? undefined : rawAwayName,
    homeTeamLogo: isDuplicatedEventName ? undefined : absoluteAsset(raw.teams?.home?.logoUrl, assetOrigin),
    awayTeamLogo: isDuplicatedEventName ? undefined : absoluteAsset(raw.teams?.away?.logoUrl, assetOrigin),
    competition: raw.league,
    competitionLogo: absoluteAsset(raw.leagueLogo, assetOrigin),
    startTime,
    status,
    isLive,
    streamsCount: raw.streams?.length || 0
  };
}

export function normalizeMatchDetails(raw: RawMatch, assetOrigin: string, fallbackId?: string): MatchDetails | null {
  const match = normalizeMatch(raw, assetOrigin, fallbackId);
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
  const { data } = await requestJson<RawSport[]>('/sports', signal);
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

// Each raw match is paired with the origin that actually returned it — the offsets below are
// fetched in parallel, and a mid-outage failover means it's entirely possible for one date's fetch
// to land on `.st` while another lands on `.ru` for the very same sport, so a single origin can't be
// assumed for the whole batch (see the assetOrigin comment on requestJson).
type OriginTaggedMatch = { raw: RawMatch; assetOrigin: string };

// The per-sport endpoint returns everything it has (weeks of fixtures) unless scoped with `date`,
// so every listing fetch is pinned to just the calendar days it actually needs instead. Default is
// today+tomorrow; getMatches (a single filtered sport) pulls yesterday through two days out for that
// page's day-by-day rail — four parallel requests instead of the eight a full week used to cost, for
// a noticeably faster load at the price of the rail only covering four days instead of seven. The
// "All" view and the featured banner stay narrower still (today+tomorrow).
//
// Each offset is still caught individually rather than left to reject the outer Promise.all: even
// at three offsets in flight, each independently retrying across all of WATCHFOOTY_API_ORIGINS, one
// date range having a bad time (already logged inside requestJson's own retries) shouldn't take the
// whole sport's listing down with it, empty-handed, rather than just quietly missing that one day.
// ANSI codes rather than a color-logging dependency — this only ever runs server-side, straight to
// the terminal Next's dev server already prints its own colored `GET /path 200 in 123ms` lines to,
// so plain escape codes match that output instead of introducing a different look.
const ANSI_RED = '\x1b[31m';
const ANSI_RESET = '\x1b[0m';

// Last-known-good result per `sport:offset`, kept purely in server-process memory (this endpoint is
// never cacheable via Next's Data Cache — see below — so there'd otherwise be nothing to fall back
// to). All three WATCHFOOTY_API_ORIGINS occasionally go quiet for the same date/sport at once for a
// few seconds; without this, that single unlucky poll returns an empty page and every match for that
// day blinks out of the listing until the next successful ISR revalidation happens to land clean.
// Falling back to the last good snapshot instead means a transient blip is invisible to visitors —
// they see slightly stale data for one cycle rather than a match vanishing and reappearing.
const lastGoodMatchesBySportOffset = new Map<string, OriginTaggedMatch[]>();

async function fetchRawMatchesForSport(sport: string, signal?: AbortSignal, offsets: number[] = [0, 1]): Promise<OriginTaggedMatch[]> {
  // Not cacheable — a single day of one sport is already routinely 2-3MB+ (see the requestJson
  // comment), past Next's per-entry Data Cache limit.
  const results = await Promise.all(
    offsets.map(async (offset) => {
      const cacheKey = `${sport}:${offset}`;
      const path = `/matches/${sport}?date=${dateParam(offset)}`;
      const start = Date.now();
      try {
        const { data, assetOrigin } = await requestJson<RawMatch[]>(path, signal, false);
        const tagged = data.map((raw) => ({ raw, assetOrigin }));
        lastGoodMatchesBySportOffset.set(cacheKey, tagged);
        return tagged;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        // `warn`, not `error`: every origin timing out for one date/sport just means that one
        // offset comes back empty for this request — the listing still renders with whatever the
        // other offsets/sports returned, so this isn't a failure the page needs to surface as one.
        //
        // Shaped to match Next's own `GET /path 200 in 123ms` dev request logs — one line, not a
        // multi-line `console.warn(msg, err)` dump (Next's console intercept renders an Error
        // argument's full source-mapped stack trace, many times longer than the one line that
        // actually matters here). `reason` is folded into a label rather than appended as free text
        // for the same reason `[TIMEOUT]` reads better inline than a full DOMException message would.
        // Duration formatted the same way Next's own request log switches from `123ms` to `4.1s` past
        // one second, so a slow-but-not-timed-out entry (a real 5s+ origin hang) reads consistently
        // next to Next's own lines instead of standing out as a raw millisecond count.
        const { status, label } = classifyFetchError(err);
        const elapsed = Date.now() - start;
        const duration = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(1)}s` : `${elapsed}ms`;
        const fallback = lastGoodMatchesBySportOffset.get(cacheKey);
        // `WARN` level prefix — the pino/winston convention — makes this greppable/filterable by
        // severity the way a bare Next-style request line (no level marker) isn't.
        console.warn(
          ` ${ANSI_RED}WARN${ANSI_RESET} GET ${path} ${ANSI_RED}${status}${ANSI_RESET} in ${duration} ${ANSI_RED}[${label}]${ANSI_RESET}${
            fallback ? ' — serving last-known-good snapshot' : ''
          }`
        );
        return fallback || [];
      }
    })
  );
  return results.flat();
}

// -1 (yesterday) is included so a match that kicked off late enough to still be live past midnight
// (e.g. an 11:30 PM start) isn't missed just because its calendar day has already turned over —
// isWithinWindow below still drops every non-live yesterday match, so this only ever surfaces
// yesterday's fixtures that are still actually live.
const SPORT_PAGE_DATE_OFFSETS = [-1, 0, 1, 2];

export async function getMatches(sport = 'all', signal?: AbortSignal) {
  // Kicked off before awaiting WatchFooty below (rather than left to correctCricketMatchTimes to
  // discover afterward) so the ESPN and WatchFooty requests run concurrently instead of back to
  // back — for a cricket-inclusive listing this was previously doubling the wait, since
  // correctCricketMatchTimes only ever started its fetch once WatchFooty's had already finished.
  if (sport === 'all' || sport === 'cricket') warmCricinfoCache(signal);
  const raw = await fetchRawMatchesForSport(sport, signal, SPORT_PAGE_DATE_OFFSETS);
  const matches = dedupeMatches(raw.map(({ raw: item, assetOrigin }) => normalizeMatch(item, assetOrigin)).filter(Boolean) as Match[]);
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  // Matches windowDays to SPORT_PAGE_DATE_OFFSETS above (today + 2 days = 3) — raw data past that
  // was never fetched in the first place now, so a wider window here wouldn't let anything more
  // through anyway; keeping the two in sync just avoids a stale number that no longer means anything.
  // (Yesterday's offset isn't counted here — isWithinWindow already lets a live match through
  // regardless of windowDays, which is the only kind of yesterday-dated match that offset can add.)
  return applyListingFilters(withPosters, { windowDays: 3 });
}

// Fetches only the given sports (in parallel) instead of the combined `/matches/all` endpoint,
// so sports we don't want to show are never requested in the first place.
export async function getMatchesForSports(sports: string[], signal?: AbortSignal) {
  if (sports.includes('cricket')) warmCricinfoCache(signal);
  const results = await Promise.all(sports.map((sport) => fetchRawMatchesForSport(sport, signal)));
  const matches = dedupeMatches(
    results
      .flat()
      .map(({ raw: item, assetOrigin }) => normalizeMatch(item, assetOrigin))
      .filter(Boolean) as Match[]
  );
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  return applyListingFilters(withPosters);
}

// The browser-side counterpart to getMatches/getMatchesForSports, used for every CLIENT-driven
// listing fetch (sport-filter switching, the 90s poll/retry) — instead of running the full
// fetch-8-large-upstream-requests-then-filter pipeline itself, it hits our own cached route
// (src/app/api/matches/route.ts), which does that work at most once per revalidation window and
// shares the result across every visitor. The Server Component page (src/app/page.tsx) still calls
// getMatches/getMatchesForSports directly for the initial SSR — this is purely a client-side path.
export async function getMatchesForHomePage(sport: string, signal?: AbortSignal): Promise<Match[]> {
  const response = await fetch(`/api/matches?sport=${encodeURIComponent(sport)}`, { signal });
  if (!response.ok) throw new Error(`Matches request failed: ${response.status}`);
  return response.json() as Promise<Match[]>;
}

export async function getPopularMatches(date?: string, signal?: AbortSignal) {
  // Unlike getMatches/getMatchesForSports, this endpoint spans every sport with no per-sport
  // param to check ahead of time — warmed unconditionally since it's a cached, cheap no-op for
  // callers that turn out to have no cricket in the results.
  warmCricinfoCache(signal);
  const query = date ? `?date=${date}` : '';
  const { data, assetOrigin } = await requestJson<RawMatch[]>(`/matches/popular${query}`, signal);
  const matches = data.map((item) => normalizeMatch(item, assetOrigin)).filter(Boolean) as Match[];
  const corrected = await correctCricketMatchTimes(matches, signal);
  const withPosters = await dropPosterlessFightingMatches(corrected);
  return applyListingFilters(withPosters, { allowStaleLiveOutsideWindow: false });
}

export async function getPopularLiveMatches(signal?: AbortSignal) {
  warmCricinfoCache(signal);
  const { data, assetOrigin } = await requestJson<RawMatch[]>('/matches/popular/live', signal);
  const matches = data.map((item) => normalizeMatch(item, assetOrigin)).filter(Boolean) as Match[];
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

// Shared by getMatchDetails and getStreams — both need "fetch a raw match by id from one of
// WatchFooty's two shapes of endpoint" and were duplicating the extract-and-pair-with-assetOrigin
// logic. Deliberately NOT a single "try X then Y and return the first hit" helper on top of these:
// the two callers disagree on fetch order (single-match first is cheap and usually right for
// getMatchDetails; getStreams already has the sport-scoped listing in hand from its caller, so that
// goes first) and on what counts as success (getMatchDetails only cares whether a match was found at
// all; getStreams needs a match AND non-empty streams, but still wants the raw match's team names for
// its own further fallback even when streams are empty) — forcing those into one control-flow
// function would either lose the raw match on a "found but not usable" result or leak per-caller
// success criteria into a supposedly-generic helper. Keeping just the fetch/extract pair shared
// avoids the duplication without pretending the two flows are the same shape.
async function fetchSingleMatchRaw(matchId: string, signal?: AbortSignal): Promise<OriginTaggedMatch | undefined> {
  const { data, assetOrigin } = await requestJson<RawMatch[] | RawMatch>(`/match/${matchId}`, signal);
  const raw = Array.isArray(data) ? data[0] : data;
  return raw && { raw, assetOrigin };
}

async function fetchListingMatchRaw(path: string, matchId: string, signal?: AbortSignal): Promise<OriginTaggedMatch | undefined> {
  // Not cacheable — full listings are the largest responses this API returns (see requestJson).
  const { data, assetOrigin } = await requestJson<RawMatch[]>(path, signal, false);
  const raw = data.find((item) => (item.matchId || item.id) === matchId);
  return raw && { raw, assetOrigin };
}

export async function getMatchDetails(matchId: string, signal?: AbortSignal) {
  // The single-match endpoint is intermittently unreliable (404s or empty results for matches that
  // the listing endpoint returns fine), so try it first (cheap) and fall back to the full listing.
  // "Usable" means both a raw match was found AND normalizeMatchDetails could make sense of it — a
  // raw match that fails to normalize (malformed data) falls through to the listing exactly like one
  // that was never found at all.
  let match: MatchDetails | null = null;
  try {
    const found = await fetchSingleMatchRaw(matchId, signal);
    match = found ? normalizeMatchDetails(found.raw, found.assetOrigin, matchId) : null;
  } catch {
    // fall through to the listing-based lookup below
  }
  if (!match) {
    const found = await fetchListingMatchRaw('/matches/all', matchId, signal);
    match = found ? normalizeMatchDetails(found.raw, found.assetOrigin, matchId) : null;
  }
  if (!match) throw new Error('Match not found');

  const [corrected] = await correctCricketMatchTimes([match], signal);
  return correctStaleLiveCricket(corrected) as MatchDetails;
}

export async function getStreams(matchId: string, sportId?: string, signal?: AbortSignal) {
  // A failure here (e.g. a single timed-out origin, common on mobile PWA resume) means "streams
  // unknown", not "every source is down" — so it degrades to the streamed.pk fallback below rather
  // than throwing and taking the whole match page down with it.
  let found: OriginTaggedMatch | undefined;
  try {
    found = await fetchListingMatchRaw(`/matches/${sportId || 'all'}`, matchId, signal);
  } catch {
    found = undefined;
  }
  let streams = (found?.raw.streams || []).map((stream, index) => normalizeStream(stream, matchId, index)).filter(Boolean) as Stream[];

  // The listing endpoint doesn't always carry every match that exists — the mirror image of the
  // problem getMatchDetails already works around (a single-match 404 where the listing has it fine):
  // here it's the listing missing a match the single-match endpoint knows about in full, streams
  // included. Confirmed in practice — a live PL match with 6 working stream links on `/match/{id}`
  // was simply absent from `/matches/football` on every date checked. Only worth trying when the
  // listing came up empty, since it's a second full request.
  if (streams.length === 0) {
    try {
      const single = await fetchSingleMatchRaw(matchId, signal);
      if (single) {
        streams = (single.raw.streams || []).map((stream, index) => normalizeStream(stream, matchId, index)).filter(Boolean) as Stream[];
        // Only replaces `found` when the listing had nothing at all — if the listing already found
        // this match (just with no usable streams), its `raw` is kept for the team-name fallback
        // below, since it's the richer of the two records where both point at the same match.
        found ||= single;
      }
    } catch {
      // fall through to the streamed.pk fallback below
    }
  }

  if (streams.length > 0 || !sportId) return streams;

  // WatchFooty has nothing for this match, for any sport — fall back to whatever streamed.pk
  // currently has for the specific fixture (matched by team name, see getStreamedFallbackStreams),
  // not just anything live for the sport (there's no shared id between the two APIs to match on
  // instead, and pooling indiscriminately would attach an unrelated match's stream when more than
  // one game in that sport is live at once). Matches with no team names (e.g. single-event fighting
  // cards) can never correlate this way, so they'll just get no fallback — expected, not a bug.
  return getStreamedFallbackStreams(toStreamedSport(sportId), matchId, found?.raw.teams?.home?.name, found?.raw.teams?.away?.name, signal).catch(() => []);
}
