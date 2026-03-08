 // public/sw.js - v6 (safe version — won't break on missing files)
const CACHE_NAME = 'freestreamworld-v6';
const urlsToCache = [
  '/',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
  // /globals.css was removed — it doesn't exist as a static file in Next.js (it's bundled)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets v6');
        // Safe version: one file failing won't crash the whole service worker
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Could not cache ${url} (skipping):`, err.message);
            })
          )
        );
      })
  );
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
    })
  );
});

// Network-First for APIs (stops scroll flicker & jump)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
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
  // Stale-While-Revalidate for everything else
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
