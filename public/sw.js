// Deliberately does no caching — this exists only so the app satisfies the browser's PWA
// installability checks (a registered service worker with a fetch handler). Every request just
// passes straight through to the network, so there's no risk of ever serving stale content.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
