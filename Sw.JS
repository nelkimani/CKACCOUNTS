const CACHE_NAME = "ckmutegi-shell-v1";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Only the app shell itself is cached. Every other request (Supabase auth,
// database queries, realtime, fonts, CDN libraries) always goes to the
// network untouched — this app needs a live connection to work correctly,
// and caching financial data offline risks showing stale or wrong figures.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellRequest =
    url.origin === self.location.origin &&
    (SHELL_FILES.includes(url.pathname) || url.pathname === "/");

  if (!isShellRequest) return; // let the browser handle it normally

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
