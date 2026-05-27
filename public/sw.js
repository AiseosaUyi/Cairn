/**
 * Service worker — minimum required for PWA installability.
 *
 * Strategy: network-first for everything during active development.
 * Cache acts purely as an offline-fallback safety net — every request
 * hits the network first, the response gets cached opportunistically,
 * and the cached copy is only served if the network fails.
 *
 * Why this matters: during active dev the founder kept seeing UI from
 * older builds (banner walkthroughs, etc.) even after we deployed
 * fixes. Stale-while-revalidate is the usual culprit — it serves the
 * cached version IMMEDIATELY then updates in the background, so users
 * see the OLD bundle on this request and the NEW bundle only on the
 * next refresh. Network-first eliminates that one-request lag.
 *
 * Real offline support / precache (Workbox / Serwist) is a follow-up
 * once the surface stabilises.
 *
 * BUMP THE CACHE VERSION on any change to this file — the activate
 * handler deletes all caches that don't match CACHE, forcing a clean
 * slate for every installed client.
 */
const CACHE = 'cairn-v3';
const APP_SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  // Take control of existing clients ASAP so the old SW doesn't keep
  // serving stale responses.
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
  // Only handle same-origin GETs; skip external (CDN portraits, etc).
  if (url.origin !== self.location.origin) return;
  // Never cache API responses — those must always hit the function fresh.
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for everything. The cached copy is the offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Only cache 2xx responses to avoid pinning errors.
        if (res && res.status >= 200 && res.status < 300) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('/')),
      ),
  );
});
