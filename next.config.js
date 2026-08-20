/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev`/`next build` otherwise regenerate AGENTS.md/CLAUDE.md (a boilerplate note for AI
  // coding agents about Next.js 16's breaking changes) on every run — not wanted here.
  agentRules: false
  // Client-side calls to WatchFooty (the sport-filter switch, the 90s poll/retry — see
  // CLIENT_API_BASE in watchfooty.ts) used to go through a plain `rewrites()` entry here to a
  // single fixed upstream URL. That's gone now that there's a primary/fallback origin to try — a
  // static rewrite can only ever point at one destination, with no way to fail over to a second, so
  // the proxy moved to a real route handler instead: src/app/api/watchfooty/[...path]/route.ts,
  // which tries both origins itself the same way the server-side branch of requestJson does.
};

module.exports = nextConfig;
