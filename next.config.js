/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev`/`next build` otherwise regenerate AGENTS.md/CLAUDE.md (a boilerplate note for AI
  // coding agents about Next.js 16's breaking changes) on every run — not wanted here.
  agentRules: false,
  // Client-side calls to WatchFooty (the sport-filter switch, the 90s poll/retry — see
  // CLIENT_API_BASE in watchfooty.ts) used to go through a plain `rewrites()` entry here to a
  // single fixed upstream URL. That's gone now that there's a primary/fallback origin to try — a
  // static rewrite can only ever point at one destination, with no way to fail over to a second, so
  // the proxy moved to a real route handler instead: src/app/api/watchfooty/[...path]/route.ts,
  // which tries both origins itself the same way the server-side branch of requestJson does.
  //
  // `staleTimes.dynamic`, not a page's own `export const revalidate`: every page here (home, match,
  // stream) calls into watchfooty.ts functions that make at least one `cacheable: false` fetch (the
  // per-sport/per-match listings — deliberately uncached, since they routinely exceed Next's 2MB
  // Data Cache per-entry limit; see requestJson's own comment). Per Next's own docs, a route
  // containing ANY `cache: 'no-store'` fetch is always server-rendered fresh on every single
  // request — its own `revalidate` export is silently ignored in that case, verified here directly
  // (three back-to-back requests to the same match page all took ~6.8s, no speedup at all). The one
  // cache that CAN still help is the browser's client-side Router Cache, which staleTimes controls
  // independently of server-side rendering mode — this is what actually makes back/forward
  // navigation reuse a page instead of re-running the full origin-fallback fetch chain again. 20s to
  // match the app's own recurring cache-window figure elsewhere (the service worker's API_TTL_MS,
  // the single still-effective `cacheable: true` fetch in getMatchDetails).
  experimental: {
    staleTimes: {
      dynamic: 20
    }
  }
};

module.exports = nextConfig;
