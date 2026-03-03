// MB Group PWA Service Worker
const CACHE_NAME = 'mbgroup-pwa-v1';

// App Shell — risorse da mettere in cache per uso offline
const APP_SHELL = [
  '/',
  '/internal/dashboard',
  '/internal/timbrature',
  '/internal/commesse',
  '/internal/rimborsi',
  '/css/site.css',
  '/js/site.js',
  '/js/scanner.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
];

// Install — pre-caching dell'app shell
self.addEventListener('install', event => {
  console.log('[SW] Installing MB Group PWA...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache the local resources
      return cache.addAll([
        '/css/site.css',
        '/js/site.js',
        '/js/scanner.js',
      ]).catch(err => console.warn('[SW] Cache warning:', err));
    }).then(() => self.skipWaiting())
  );
});

// Activate — pulizia vecchie cache
self.addEventListener('activate', event => {
  console.log('[SW] Activating MB Group PWA...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — strategia: Network First per API, Cache First per assets statici
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non HTTP
  if (!request.url.startsWith('http')) return;

  // Ignora richieste Blazor SignalR hub
  if (url.pathname.startsWith('/_blazor')) return;

  // Ignora richieste framework Blazor
  if (url.pathname.startsWith('/_framework')) return;

  // Assets statici → Cache First
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pagine interne → Network First con fallback
  if (url.pathname.startsWith('/internal')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Tutto il resto → Network First
  event.respondWith(networkFirst(request));
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(css|js|woff|woff2|ttf|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline fallback page
    return new Response(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Offline – MB Group</title>
        <style>
          body { font-family: Inter, sans-serif; background: #0d1b2a; color: white;
                 display: flex; align-items: center; justify-content: center;
                 min-height: 100vh; margin: 0; text-align: center; padding: 2rem; }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
          p { color: rgba(255,255,255,0.6); }
          button { background: #e8902a; color: white; border: none; padding: 0.75rem 2rem;
                   border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div>
          <div class="icon">📡</div>
          <h2>Sei offline</h2>
          <p>Connettiti alla rete per accedere al portale MB Group</p>
          <button onclick="location.reload()">Riprova</button>
        </div>
      </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

// Background sync per timbrature offline (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-timbrature') {
    console.log('[SW] Background sync: timbrature');
  }
});
