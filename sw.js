const CACHE_NAME = "vyrona-cache-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/variables.css",
  "./css/styles.css",
  "./js/app.js",
  "./js/config.js",
  "./js/supabaseClient.js",
  "./js/db.js",
  "./js/state.js",
  "./js/xp.js",
  "./js/habits.js",
  "./js/goals.js",
  "./js/journal.js",
  "./js/dashboard.js",
  "./js/review.js",
  "./js/achievements.js",
  "./js/settings.js",
  "./js/themes.js",
  "./js/router.js",
  "./js/ui.js",
  "./js/notifications.js",
  "./icons/icon.svg",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            /* ignore missing optional asset during install */
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Never cache Supabase API calls — always go to network.
  if (request.url.includes("supabase.co") || request.url.includes("esm.sh")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
