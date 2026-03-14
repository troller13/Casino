// BETZONE Service Worker
const CACHE = "betzone-v1";
const PRECACHE = ["/", "/live", "/casino", "/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network first for API calls
  if (
    e.request.url.includes("supabase") ||
    e.request.url.includes("odds-api")
  ) {
    e.respondWith(
      fetch(e.request).catch(
        () =>
          new Response("{}", {
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    return;
  }
  // Cache first for static assets
  e.respondWith(
    caches
      .match(e.request)
      .then(
        (cached) =>
          cached ||
          fetch(e.request).then((res) => {
            if (res.ok)
              caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
            return res;
          }),
      )
      .catch(() => caches.match("/offline.html")),
  );
});

// Push notifications
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "BETZONE", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/" },
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? "/"));
});
