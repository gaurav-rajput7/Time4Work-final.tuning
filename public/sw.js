const CACHE_PREFIX = "time4work-";
const CACHE = "time4work-v25";
const APP_BASE = new URL("./", self.location.href);
const ASSETS = ["./index.html", "./calendar.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"];
const CACHED_ASSETS = new Set(ASSETS.map(asset => new URL(asset, APP_BASE).href));

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const app = windows.find(client => new URL(client.url).origin === APP_BASE.origin && client.url.startsWith(APP_BASE.href));
    return app ? app.focus() : clients.openWindow(APP_BASE.href);
  }));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || !CACHED_ASSETS.has(url.href)) return;
  const response = caches.open(CACHE).then(cache => cache.match(e.request).then(hit => {
    if (hit) return hit;
    return fetch(e.request).then(res => {
      if (res && res.status === 200) return cache.put(e.request, res.clone()).then(() => res);
      return res;
    }).catch(() => e.request.mode === "navigate"
      ? cache.match(new URL("./index.html", APP_BASE).href)
      : Response.error());
  }));
  e.respondWith(response);
});
