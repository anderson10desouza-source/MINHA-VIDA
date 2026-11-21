const CACHE_NAME = 'meu-mundo-offline-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/pwa-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache live audio streams
  if (url.pathname.startsWith('/api/radio/stream') || url.pathname.startsWith('/api/podcast/audio')) {
    return;
  }

  // Network-first for API search responses so offline mode falls back to last cached results
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // Stale-while-revalidate / network-first for app shell & static assets
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
