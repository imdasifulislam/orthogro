const CACHE_NAME = 'orthogro-offline-v1';

// ইনস্টল করার সময় রুট পাথ বা বর্তমান লোকেশন ক্যাশ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add('./')) // './' ব্যবহার করলে সাব-ডিরেক্টরিতে ৪৪০ এরর আসবে না
      .then(() => self.skipWaiting())
  );
});

// নেভিগেশন রিকোয়েস্ট হ্যান্ডেল করার সময় फॉールব্যাক চেক করা
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match('./') ||
            new Response('OrthoGro is not available offline yet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          );
        })
    );
    return;
  }
});
