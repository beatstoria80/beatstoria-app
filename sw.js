
const CACHE_NAME = 'space-studio-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Montserrat:wght@300;400;500;600;700;800;900&family=Noto+Sans:wght@400;700&family=Oswald:wght@300;500;700&family=Roboto:wght@300;400;900&family=Saira+Condensed:wght@400;700;900&family=Righteous&family=Permanent+Marker&family=Merriweather:wght@400;900&family=Pacifico&display=swap'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests like Google API for offline caching logic simplicity
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('cdn') && !event.request.url.includes('fonts')) {
     return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});
