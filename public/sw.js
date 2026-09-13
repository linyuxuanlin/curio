const CACHE = 'curio-shell-v1';
const FEED = '/feed.json';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function feedNetworkFirst(request) {
  const cache = await caches.open(CACHE);
  const cachedRequest = new Request(FEED);
  try {
    const response = await fetch(request, {cache: 'no-store'});
    if (response.ok) await cache.put(cachedRequest, response.clone());
    return response;
  } catch {
    return (await cache.match(cachedRequest)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === FEED) event.respondWith(feedNetworkFirst(request));
  else if (request.destination === 'document' || url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request));
  else event.respondWith(cacheFirst(request));
});
