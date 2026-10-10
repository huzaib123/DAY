/*
 * Keeps the mission working with no signal: the app shell is cached on first visit,
 * pages fall back to the cached copy after a short wait, and the text reader is cached once used.
 */
const VERSION = "op1110-v1";
const SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "js/config.js",
  "js/outbox.js",
  "js/ocr.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png"
];
const OCR_CACHE = "op1110-ocr-v1";
const FONT_CACHE = "op1110-fonts-v1";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  const keep = [VERSION, OCR_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

// Fresh copy when the network answers quickly, cached copy otherwise.
async function networkFirst(request, cacheName, waitMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(request), timeout(waitMs)]);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    throw e;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.includes("/vendor/")) {
      event.respondWith(cacheFirst(req, OCR_CACHE));
      return;
    }
    event.respondWith(networkFirst(req, VERSION, req.mode === "navigate" ? 3500 : 2500));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(req, FONT_CACHE));
  }
  // ntfy and everything else go straight to the network.
});
