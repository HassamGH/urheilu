// Bump this to invalidate every existing cache entry on the next deploy — each visitor's `activate`
// handler wipes any cache whose name doesn't match, so a version bump is the escape hatch if a
// change here should never be served from what an existing client already cached.
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Match-list/stream JSON changes minute to minute (live scores, new streams appearing) — this is
// deliberately much shorter than HomePage's own 90s poll interval, so a cache hit only ever
// happens for genuinely-back-to-back requests (repeat navigation, a quick sport-filter re-click),
// never for the poll itself finding stale data.
const API_TTL_MS = 20000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

// Vite-hashed build output plus the handful of root static files — every one of these has a
// content-addressed or effectively-immutable URL, so cache-first is always safe: a change to any
// of them means a new URL, never the same URL with different bytes.
function isBuildAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/favicon.svg' || url.pathname === '/manifest.webmanifest';
}

// The JSON API proxy only — NOT `/api/watchfooty/poster|team-logo|league-logo/*`, because those
// don't exist anymore (images are fetched directly from api.watchfooty.st, see ASSET_ORIGIN in
// watchfooty.ts) and wouldn't want short-TTL treatment even if they did; they already carry their
// own long-lived Cache-Control from the origin.
function isApiRequest(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/api/watchfooty/');
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function shortTtlCache(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    const cachedAt = Number(cached.headers.get('sw-cached-at') || 0);
    if (Date.now() - cachedAt < API_TTL_MS) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      // The Cache API stores whatever Headers came back, and fetch Responses don't expose a
      // settable custom header directly — rebuilding the Response with an added `sw-cached-at` is
      // the only way to stash our own TTL timestamp alongside the cached body.
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', String(Date.now()));
      const body = await response.clone().arrayBuffer();
      await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
    }
    return response;
  } catch (err) {
    // Offline or a flaky connection — a stale-but-present entry still beats a hard failure.
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // never intercept POST/etc — let those pass through untouched

  const url = new URL(request.url);

  if (isBuildAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(shortTtlCache(request));
    return;
  }

  // Navigation requests (index.html) and everything cross-origin (ESPN, streamed.pk, WatchFooty's
  // own image CDN) are passed straight through, uncached. index.html especially must never be
  // served from cache — it references this build's hashed asset filenames, and caching it risks
  // handing a returning visitor a shell that points at files a newer deploy already removed.
  event.respondWith(fetch(request));
});
