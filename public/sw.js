const SHELL_CACHE = 'hogwarts-shell-v8';
const ASSET_CACHE = 'hogwarts-assets-v8';
const PRECACHE_URLS = ['/index.html', '/homescapes.html', '/gardenscapes.html', '/manifest.webmanifest'];
const MAX_ASSET_ENTRIES = 140;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const valid = new Set([SHELL_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !valid.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  await Promise.all(keys.slice(0, excess).map((req) => cache.delete(req)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Immutable hashed JS/CSS & WebP sprites: Cache-First for instant zero-network repeat loads
  const isStaticAsset = url.pathname.startsWith('/assets/');
  if (isStaticAsset) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) {
          cache.put(request, fresh.clone());
          trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
        }
        return fresh;
      })
    );
    return;
  }

  // 2. HTML documents & WebApp manifest: Network-First so app updates land immediately, offline fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => (await caches.match(request)) || Response.error())
  );
});
