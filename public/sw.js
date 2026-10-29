/* Service Worker - La Cocina de Anita */
const CACHE_VERSION = "cocina-anita-v2";
const CACHE_NAME = CACHE_VERSION;

const CORE_ASSETS = [
  "/index.html",
  "/manifest.webmanifest",
  "/market.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // No interceptar peticiones a la API (Supabase) ni métodos no-GET.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Navegaciones: prioridad a red, con respaldo al shell cacheado (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // Assets estáticos (con hash de Vite): cache-first con revalidación en
  // segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
