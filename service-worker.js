const CACHE_NAME = "presentation-tools-v28";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=18",
  "./app.js?v=18",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./school-bell/",
  "./school-bell/index.html",
  "./school-bell/styles.css?v=6",
  "./school-bell/app.js?v=12",
  "./school-bell/chime.wav",
  "./school-bell/scheduler-core.js?v=2",
  "./school-bell/manifest.webmanifest",
  "./school-bell/manifest-en.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    const requestUrl = new URL(event.request.url);
    const isSchoolBell = requestUrl.pathname.includes("/school-bell/");
    const fallbackKey = isSchoolBell ? "./school-bell/index.html" : "./index.html";
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(fallbackKey, copy));
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match(fallbackKey))),
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

