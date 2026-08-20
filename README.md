# Urheilu

Installable PWA for browsing live and upcoming sports matches and watching their streams, built on the WatchFooty API with a streamed.pk fallback and ESPN Cricinfo for accurate cricket kickoff times.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, HLS.js for `.m3u8` playback.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build   # next build
npm run start   # next start
```

## Configuration

WatchFooty is tried at `api.watchfooty.st` first, falling back to the mirror at `api.watchfooty.ru` if that request fails (see `WATCHFOOTY_API_ORIGINS` in `src/api/watchfooty.ts`). Server Components/Route Handlers try both origins directly; client-side calls go through `src/app/api/watchfooty/[...path]/route.ts`, a route handler that runs the same primary/fallback attempt server-side (works identically in dev, build, and on Vercel) and reports which origin it used via an `x-api-origin` response header, so relative poster/logo paths get resolved against whichever host actually served that response. Image/logo assets are fetched directly from that origin, not proxied. ESPN Cricinfo (`src/api/cricinfo.ts`) and streamed.pk (`src/api/streamed.ts`) are always called directly, with no fallback origin; both have open CORS.

No API key is required by any of these sources at the time of implementation. If that changes, add server-side environment variables rather than exposing secrets in client code.

## Access

`src/proxy.ts` (Next.js's server-side request-gating convention — file and export renamed from `middleware.ts`/`middleware` as of Next.js 16) enforces HTTP Basic Auth on every request, including the WatchFooty proxy, before anything renders or any data is fetched. The password is compared using a timing-safe SHA-256 digest check, and the gate fails closed (500) if `SITE_PASSWORD` isn't set, rather than silently letting requests through.

Set `SITE_PASSWORD` in `.env`/`.env.local` (see `.env.example`) for local dev, or in Vercel's Project Settings → Environment Variables for deployed builds.

## Routes

App Router, under `src/app/`:

- `/` — sport filters and current matches, grouped by date (`src/app/page.tsx`)
- `/match/:id` — match details and available streams (`src/app/match/[id]/page.tsx`)
- `/match/:id/stream/:streamId` — selected stream player, code-split from the main bundle since hls.js is only needed here (`src/app/match/[id]/stream/[streamId]/`)

Each route is a thin Server Component that fetches its data server-side (so the initial HTML already has it) and hands it as `initialX` props into the corresponding client component in `src/ui/`. The sport filter itself is handled entirely client-side after that first load (see the comment in `src/ui/HomePage.tsx`) — switching sports doesn't re-run the Server Component, it just re-fetches client-side the same way the 90s poll does, with the URL updated cosmetically so back/forward still works.

## Data sources

**WatchFooty** (`src/api/watchfooty.ts`) is the primary source:

- `GET /api/v1/sports`
- `GET /api/v1/matches/all`
- `GET /api/v1/matches/:sport`
- `GET /api/v1/match/:id`

Streams are returned inline on match payloads. Stream URLs are generally embed URLs (iframe playback with native fullscreen); direct `.m3u8` is played via HLS.js.

**ESPN Cricinfo** (`src/api/cricinfo.ts`) corrects cricket kickoff times and live status — WatchFooty's own cricket timestamps are frequently wrong (often day-granular with no real kickoff time). Matches are correlated by team name against ESPN's own scoreboard; a cricket match's live indicator only lights up when both WatchFooty's flag and ESPN's corrected start time agree the match has actually begun.

**streamed.pk** (`src/api/streamed.ts`) is used as a fallback when WatchFooty returns zero streams for a match, or (for fighting cards specifically) when WatchFooty's own poster asset doesn't actually resolve. Since the two APIs share no match ID, matches are correlated by home/away team name (loose substring match, either order). For cricket specifically, streamed.pk often lists broadcasts under a channel name instead of team names, so if team correlation finds nothing, every live cricket stream is shown instead, each tagged with its source title to signal it's unconfirmed rather than a certain match.

## Filtering

Shown sports are fixed to: baseball, basketball, cricket, fighting, football, hockey, motorsports (`src/lib/sports.ts`). Per-sport allow-lists (`src/lib/allowed*.ts`) further restrict which leagues/competitions surface within football, cricket, fighting, racing, baseball, and basketball. Women's, amateur/reserve/emerging, and playoff matches are excluded (`excludeWomens.ts`, `excludeAmateur.ts`, `excludePlayoffs.ts`), fighting cards with no working poster from either source are dropped entirely, and finished matches are dropped using a grace window after kickoff, since neither API supports filtering for live/upcoming only.

## PWA

`public/manifest.webmanifest` and `public/sw.js` make the app installable. The service worker (production builds only) caches the Next.js build output (`/_next/static/*`) cache-first, and applies a short (20s) TTL cache to the WatchFooty JSON proxy — short enough to stay under the live-score poll interval, long enough to make quick repeat navigation feel instant. The server-rendered HTML document itself is never cached, since it references that build's hashed asset filenames.
