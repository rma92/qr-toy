// sw.js — place next to index.html (use ./ paths if hosted in a subfolder)
const CACHE_NAME = 'hotqr-scanner-20250908'; // bump on deploy

// Only cache what's actually used by the page:
const APP_SHELL = [
  './',                        // directory entry
  './index.html',
  './manifest.json',
  './htqr_read.png',          // app icon used by the page
  './zxing_reader.js',        // minified loader
  './zxing_reader.wasm',      // WASM (fetched by the loader)
  './lzma_worker-min.js',
  './hotqr_reader.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.disable();
    await self.clients.claim();
  })());
});

// Offline-first (cache-first) for navigations and same-origin assets.
// Cross-origin requests (if any) are ignored.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations: serve cached index immediately
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
            .then(cached => cached || fetch(req))
    );
    return;
  }

  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;                 // instant, even when online
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE_NAME);
        c.put(req, res.clone());
        return res;
      } catch {
        // Optional: fallback to index for same-origin misses while offline
        return caches.match('./index.html', { ignoreSearch: true });
      }
    })());
  }
});

