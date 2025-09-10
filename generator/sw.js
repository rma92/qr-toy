// sw.js — place next to index.html
const CACHE_NAME = 'hotqr-offline-20250909';

// Only cache what the app actually uses:
const APP_SHELL = [
  './',                       // directory entry
  './index.html',
  './manifest.json',
//  './icons/icon-192.png',
//  './icons/icon-512.png',
  './htqr_gen.png',           // existing app icon used in page/head
  './qrcodegen-v1.8.0-es6.min.js',
//  './jquery-3.6.0.slim.min.js',
  './barcode.min.js',
  './index-splitter.js',
  './lzma_worker-min.js',
  './extendedRenderer.js'
];

// Install: precache everything, no network needed on load
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

// Activate: clean old caches, claim clients, disable nav preload
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.disable();
    await self.clients.claim();
  })());
});

// Fetch: cache-first for navigations and same-origin assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations: always serve cached index immediately
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
            .then(cached => cached || fetch(req))
    );
    return;
  }

  // Same-origin files: cache-first (no delay)
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE_NAME);
        c.put(req, res.clone());
        return res;
      } catch {
        // Optional: last-resort fallback
        return caches.match('./index.html', { ignoreSearch: true });
      }
    })());
  }
});
