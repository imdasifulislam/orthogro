
/* ==========================================
   OrthoGro - Service Worker
   Offline App Shell & PWA Asset Caching
   ========================================== */

const CACHE_NAME = 'orthogro-cache-v3';

const APP_URL = new URL('./', self.registration.scope).href;

// Core PWA files to cache during installation
const APP_FILES = [
  APP_URL,
  new URL('manifest.json', self.registration.scope).href,
  new URL('icon-192.png', self.registration.scope).href,
  new URL('icon-512.png', self.registration.scope).href
];

// External resources allowed for caching
// Firebase API/data requests are intentionally excluded.
const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'www.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'img.icons8.com'
];

// INSTALL
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of APP_FILES) {
        try {
          const response = await fetch(url, {
            cache: 'reload'
          });

          if (response.ok) {
            await cache.put(url, response);
          } else {
            console.warn('Could not cache:', url, response.status);
          }
        } catch (error) {
          console.error('App file caching failed:', url, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith('orthogro-cache-') &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// FETCH
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. HTML Navigation: Network first, then cache
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(APP_URL, response.clone());
          }

          return response;

        } catch (error) {
          const cachedPage = await caches.match(APP_URL);

          if (cachedPage) return cachedPage;

          return new Response(
            'OrthoGro is unavailable offline. Please open the app once while connected to the internet.',
            {
              status: 503,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            }
          );
        }
      })()
    );

    return;
  }

  // 2. External CDN resources: Cache first, then network
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        try {
          const response = await fetch(request);

          if (response.ok || response.type === 'opaque') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;

        } catch (error) {
          return new Response(
            'Resource unavailable offline.',
            { status: 503 }
          );
        }
      })()
    );

    return;
  }

  // 3. Same-origin static files: Cache first, then network
  if (url.origin === self.location.origin) {

    const isStaticFile =
      /\.(html|css|js|json|png|jpg|jpeg|svg|ico|webp|woff2?)$/i.test(
        url.pathname
      );

    if (!isStaticFile) return;

    event.respondWith(
      (async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        try {
          const response = await fetch(request);

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;

        } catch (error) {
          return new Response(
            'File unavailable offline.',
            { status: 503 }
          );
        }
      })()
    );
  }
});
