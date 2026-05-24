// Service worker — offline support via stale-while-revalidate.
//
// BUMP THIS on each deploy that should invalidate old caches.
// (Old caches will be deleted automatically during the next activate.)
const CACHE_VERSION = 'v1';

const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE  = `pages-${CACHE_VERSION}`;
const OFFLINE_URL  = '/offline';

// Minimal precache — homepage + offline fallback + manifest.
// Everything else is cached lazily as users navigate.
const PRECACHE_URLS = ['/', OFFLINE_URL, '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // addAll fails atomically — wrap each so one 404 doesn't kill install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => { /* best-effort */ })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests; skip API + Next.js data routes.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/data/')) return;

  // Static assets — cache-first, long-lived (content-hashed by Next.js).
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Page navigations + HTML — stale-while-revalidate with offline fallback.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE, /* withOfflineFallback */ true));
    return;
  }

  // Anything else (JSON, etc.) — stale-while-revalidate, no offline page.
  event.respondWith(staleWhileRevalidate(request, PAGES_CACHE, false));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName, withOfflineFallback) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // If we have a cached copy, return it instantly; refresh happens in the background.
  if (cached) {
    networkPromise.catch(() => { /* swallow — best-effort refresh */ });
    return cached;
  }

  // No cache — wait for network. If offline, serve the fallback page.
  const fresh = await networkPromise;
  if (fresh) return fresh;

  if (withOfflineFallback) {
    const offline = await cache.match(OFFLINE_URL) || await (await caches.open(STATIC_CACHE)).match(OFFLINE_URL);
    if (offline) return offline;
  }
  return Response.error();
}
