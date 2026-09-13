const CACHE = 'curio-shell-v2';
const FEED = '/feed.json';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('curio-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function feedNetworkFirst(request) {
  const cache = await caches.open(CACHE);
  const cachedRequest = new Request(FEED);
  try {
    const response = await fetch(request, {cache: 'no-store'});
    if (!response.ok) throw Error('Network response unavailable');
    await cache.put(cachedRequest, response.clone());
    return response;
  } catch {
    return (await cache.match(cachedRequest)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === FEED) event.respondWith(feedNetworkFirst(request));
  else if (request.mode === 'navigate') event.respondWith(documentNetworkFirst(request));
  else event.respondWith(cacheFirst(request));
});

async function documentNetworkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (!response.ok) throw Error('Document unavailable');
    await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/')) || Response.error();
  }
}

self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows)if('focus' in client)return client.focus();
  return self.clients.openWindow('/');
 })());
});
