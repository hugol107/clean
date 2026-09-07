// CleanTap service worker — MVP scope only.
//
// What this does: makes the app installable and keeps the app shell (icons,
// manifest, offline fallback) available when a worker walks into a
// basement/back-of-house area with no signal.
//
// What this deliberately does NOT do: cache or replay API calls, cache any
// dashboard/analytics data, or queue Tap In/Tap Out requests made while
// offline. Serving stale cleaning-session data would be actively
// misleading for a compliance tool, so dynamic routes always hit the
// network. See docs/architecture.md "Offline support (Phase 2)" for the
// planned background-sync design (IndexedDB outbox + Background Sync API)
// that would extend this file.

const CACHE_NAME = "cleantap-shell-v1";
const SHELL_ASSETS = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutations (Tap In/Out, forms, etc.)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // always live data

  // Navigations: try the network first so authenticated pages stay fresh;
  // fall back to the offline shell only when there's truly no connection.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html").then((res) => res || Response.error())),
    );
    return;
  }

  // Static shell assets: cache-first.
  if (SHELL_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
