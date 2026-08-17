# Urheilu

Installable PWA for browsing live and upcoming sports matches and watching their streams, built on the WatchFooty API with a streamed.pk fallback.

## Stack

React 19, TypeScript, Vite 7, Tailwind CSS 4, HLS.js for `.m3u8` playback.

## Run

```bash
yarn install
yarn dev
```

```bash
yarn build    # tsc -b && vite build
yarn preview
```

## Configuration

The app proxies browser requests through Vite in development:

```text
/api/watchfooty/* -> https://api.watchfooty.st/api/v1/*
```

No API key is required by WatchFooty or streamed.pk at the time of implementation. If that changes, add server-side environment variables (e.g. `WATCHFOOTY_API_URL`, `WATCHFOOTY_API_KEY`) rather than exposing secrets in client code.

## Routes

- `/` — sport filters and current matches, grouped by date
- `/match/:matchId` — match details and available streams
- `/match/:matchId/stream/:streamId` — selected stream player

The sport filter is stored in the `?sport=` query param (not component state) so back/forward navigation preserves it.

## Data sources

**WatchFooty** (`src/api/watchfooty.ts`) is the primary source:

- `GET /api/v1/sports`
- `GET /api/v1/matches/all`
- `GET /api/v1/matches/:sport`
- `GET /api/v1/match/:id`

Streams are returned inline on match payloads. Stream URLs are generally embed URLs (iframe playback with native fullscreen); direct `.m3u8` is played via HLS.js.

**streamed.pk** (`src/api/streamed.ts`) is used only as a fallback when WatchFooty returns zero streams for a match. Since the two APIs share no match ID, matches are correlated by home/away team name (loose substring match, either order). For cricket specifically, streamed.pk often lists broadcasts under a channel name instead of team names, so if team correlation finds nothing, every live cricket stream is shown instead, each tagged with its source title to signal it's unconfirmed rather than a certain match.

## Filtering

Shown sports are fixed to: baseball, basketball, cricket, fighting, football, hockey, motorsports (`src/lib/sports.ts`). Per-sport allow-lists (`src/lib/allowed*.ts`) further restrict which leagues/competitions surface within football, cricket, fighting, racing, baseball, and basketball. Women's and amateur matches are excluded (`excludeWomens.ts`, `excludeAmateur.ts`), and finished matches are dropped client-side using a grace window after kickoff, since neither API supports filtering for live/upcoming only.

## PWA

`public/manifest.webmanifest` and `public/sw.js` make the app installable. The service worker does no caching — it exists solely to satisfy installability checks and passes every request straight through to the network.
