const CACHE_NAME = "hotqr-combined-20260519-5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css",
  "./app-scanner.js",
  "./reader-fixes.js",
  "./htqr_gen.png",
  "./qrcodegen-v1.8.0-es6.min.js",
  "./barcode.min.js",
  "./index-splitter.js",
  "./extendedRenderer.js",
  "./lzma_worker-min.js",
  "./hotqr_reader.js",
  "./zxing_reader.js",
  "./zxing_reader.wasm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => key === CACHE_NAME ? null : caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.disable();
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(caches.match("./index.html", { ignoreSearch: true }).then((cached) => cached || fetch(req)));
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      return caches.match("./index.html", { ignoreSearch: true });
    }
  })());
});
