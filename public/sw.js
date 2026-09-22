// Minimal service worker: exists only so the app is installable (idea #2).
// It deliberately does NOT cache pages or data — everything is fetched from the
// network so content is always fresh. The empty fetch listener is enough to
// satisfy the installability criteria without ever serving stale responses.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // No respondWith: the browser handles the request normally (network, no cache).
})
