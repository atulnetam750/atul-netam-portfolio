const CACHE_NAME = 'atul-portfolio-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './atul-photo.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/js/portfolio-enhancements.js',
  './data/live-feed.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      CORE_ASSETS.map(asset =>
        fetch(asset, { cache: 'reload' }).then(res => {
          if (res.ok) return cache.put(asset, res);
        }).catch(() => null)
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/data/live-feed.json')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const stableKey = new Request(new URL('data/live-feed.json', self.registration.scope).href);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(stableKey, response.clone());
        return response;
      } catch (_) {
        return (await cache.match(stableKey)) || (await cache.match('./data/live-feed.json')) || Response.error();
      }
    })());
    return;
  }

  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached || Response.error());
      return cached || networkFetch;
    })
  );
});
