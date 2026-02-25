// public/sw.js
// Version: bump this number (e.g. v3, v4) every time you deploy significant changes
// This forces cache invalidation and cleanup of old versions
const CACHE_VERSION = 'freestream-cache-v2';
const CACHE_NAME = `freestream-static-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  // Add more static assets here if needed, e.g. '/manifest.json', '/offline.html'
];

self.addEventListener('install', (event) => {
  // Skip waiting → new SW activates immediately after install (no waiting for old tabs to close)
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets:', urlsToCache);
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients → take control of all open pages right away (no reload needed for new SW to handle fetches)
  event.waitUntil(self.clients.claim());

  // Clean up old caches (delete anything not matching current CACHE_NAME)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => {
          // Keep only the current version; delete all others
          return name.startsWith('freestream-') && name !== CACHE_NAME;
        }).map((name) => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // NetworkFirst strategy: Try network first (fresh content), fallback to cache if fails (offline support)
  // This prevents stale JS/app shell issues on updates
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Optional: Clone and cache successful responses for offline fallback
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline → serve from cache
        return caches.match(event.request);
      })
  );
});

// Optional: Add a fetch event for navigation requests only if you want a custom offline page later
// self.addEventListener('fetch', (event) => {
//   if (event.request.mode === 'navigate') {
//     event.respondWith(
//       fetch(event.request).catch(() => caches.match('/offline.html'))
//     );
//   }
// });
