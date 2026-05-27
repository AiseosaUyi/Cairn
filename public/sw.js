/**
 * Service worker — minimum required for PWA installability.
 *
 * v0 strategy: cache-first for same-origin static assets, network-first for
 * navigations with a stale-while-revalidate fallback. Real offline support
 * (Workbox / Serwist, structured precache, background sync) is a follow-up
 * — this gets the install prompt unlocked and basic resilience.
 *
 * The cache version string forces a clean swap on each deploy. Bump it
 * when changing this file or asset URLs that should be evicted.
 */
const CACHE = 'cairn-v1';
const APP_SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin GETs; skip external (dicebear, unsplash, etc.)
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network-first for HTML — fresh content when online.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  // Stale-while-revalidate for static assets.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
