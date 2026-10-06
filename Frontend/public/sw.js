/* Only public application assets are cached. Never API requests or case content. */
const CACHE = "sakshya-shell-3WYPQTUHSf3EWt_q6R9WZ";
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const response = await fetch("/precache.json", { cache: "no-store" });
      const urls = await response.json();
      await (await caches.open(CACHE)).addAll(urls);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("sakshya-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(url.pathname.startsWith("/d/") ? url.pathname : "/"),
      ),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/ocr/") ||
    url.pathname.startsWith("/d/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/preprocess-worker.js" ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest"
  )
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
});
