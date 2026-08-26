const CACHE_NAME = "handball-static-v1";
const SAFE_STATIC_PREFIXES = ["/_next/static/", "/icons/"];
const SAFE_STATIC_PATHS = new Set(["/manifest.webmanifest", "/favicon.ico"]);

function shouldCache(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (SAFE_STATIC_PATHS.has(url.pathname)) return true;
  return SAFE_STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (!shouldCache(event.request)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(event.request, response.clone());
      }
      return response;
    }),
  );
});
