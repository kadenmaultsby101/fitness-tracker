/*
 * Trace — service worker
 * ----------------------
 * Caching strategy:
 *   - App shell (HTML / CSS / JS / manifest): network-first with cache
 *     fallback. This means a new deploy is visible within ~1 second
 *     instead of being pinned to whatever was cached at install time.
 *   - Icons + everything else: cache-first. They rarely change and are
 *     a few hundred bytes, so the cache hit keeps cold launch fast.
 *
 * Bump CACHE_VERSION whenever you want to drop everything in the
 * existing cache and start fresh. The activate handler below deletes
 * any cache whose key doesn't match the current version.
 */
const CACHE_VERSION = 'trace-v2';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

// Files we want to keep fresh on every visit. Matched by extension so
// the routing logic stays small.
const NETWORK_FIRST_EXTS = ['.html', '.css', '.js', '.json'];
const isNetworkFirst = (url) => {
  if (url.pathname === '/' || url.pathname.endsWith('/')) return true;
  return NETWORK_FIRST_EXTS.some((ext) => url.pathname.endsWith(ext));
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
  );
  // Take over immediately rather than waiting for old clients to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

// Try the network, refresh the cache on success, fall back to cache
// on failure. Used for the app shell so deploys propagate immediately.
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}

// Cached copy first, network only on miss. Used for icons and any
// other static asset that rarely changes.
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.status === 200 && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
  }
  return res;
}
