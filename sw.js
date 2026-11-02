const CACHE_NAME = 'orthogro-offline-v1';

// Install and cache the main app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting())
  );
});

// Activate and remove outdated app caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('orthogro-') &&
                            name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Network and offline request handling
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // Handle app navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', copy);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match('/') ||
            new Response('OrthoGro is not available offline yet.', {
              status: 503,
              headers: {
                'Content-Type': 'text/plain'
              }
            })
          );
        })
    );

    return;
  }

  // Cache scripts, stylesheets, fonts and images
  if (
    ['script', 'style', 'font', 'image'].includes(request.destination)
  ) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const response = await fetch(request);

          if (response.ok || response.type === 'opaque') {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }

          return response;

        } catch (error) {
          return new Response('', { status: 503 });
        }
      })
    );
  }
});
