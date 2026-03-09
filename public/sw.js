// public/sw.js - v8 (final version - March 2026)
// Faster activation + better assets + never cache the refresh endpoint
const CACHE_NAME = 'freestreamworld-v8';

const urlsToCache = [
  '/',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/og-image.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Installing v8 - pre-caching assets');
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Could not cache ${url} (skipping):`, err.message);
            })
          )
        );
      })
  );
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First for APIs (critical for our cached-fetch + sources modal)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER cache the background refresh (keeps it fresh)
  if (url.pathname.includes('/api/refresh-all-free')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // All other APIs (cached-fetch, title-sources, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate for everything else (static pages, images, etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      }).catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});
