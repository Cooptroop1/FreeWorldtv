// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('freestream-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/icon-192.png',
        '/icon-512.png',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
