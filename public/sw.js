// public/sw.js - v9 (safe version - no more image caching spam)
const CACHE_NAME = 'freestreamworld-v9';
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
        console.log('[SW] Installing v9 - pre-caching static assets only');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER cache the background refresh endpoint
  if (url.pathname.includes('/api/refresh-all-free')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-First for all API calls (cached-fetch, title-sources, etc.)
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

  // IMPORTANT: SKIP caching for ALL external images (TMDB posters, etc.)
  // This is what was causing the QuotaExceededError
  if (url.hostname.includes('image.tmdb.org') || 
      url.pathname.endsWith('.jpg') || 
      url.pathname.endsWith('.png') || 
      url.pathname.endsWith('.webp')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-While-Revalidate ONLY for static HTML/pages and your own assets
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
