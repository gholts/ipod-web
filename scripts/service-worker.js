const VERSION = __BUILD_VERSION__;
const FILES = __PRECACHE_FILES__;
const PREFIX = `ipod:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const urls = new Set(
  FILES.map((path) => new URL(path, self.registration.scope).href),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([...urls]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  url.search = "";
  // Only cache our own application files. Music previews bypass this worker.
  if (event.request.method !== "GET" || !urls.has(url.href)) return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(url.href)) ?? Response.error();
    }),
  );
});
