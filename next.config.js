/** @type {import('next').NextConfig} */
const nextConfig = {
  // Client-side calls to WatchFooty (the sport-filter switch, the 90s poll/retry — see API_BASE in
  // watchfooty.ts) go through this relative path rather than the upstream URL directly, so the
  // browser never needs CORS clearance for it. Living in next.config.js (not vercel.json) means it
  // works identically in `next dev`, `next build && next start`, and on an actual Vercel deploy —
  // vercel.json rewrites are a platform-level feature that only takes effect once actually deployed
  // to Vercel, so a rewrite defined only there is invisible to local dev/start entirely.
  async rewrites() {
    return [
      {
        source: '/api/watchfooty/:path*',
        destination: 'https://api.watchfooty.st/api/v1/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
