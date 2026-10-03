// Offline support. Online: always the newest app files from the network (so updates apply at once);
// offline: the copy from the cache. GitHub (backup + photos) never goes through here.
const V = 'gn-32';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'data.js', 'content.js', 'cookbook.js', 'shop.js', 'plant.js', 'manifest.json',
  'fonts/nunito.woff2', 'fonts/caveat.woff2', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    try {
      const r = await fetch(e.request, { cache: 'no-cache' });
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await c.match(e.request, { ignoreSearch: true })) || new Response('offline', { status: 503 });
    }
  }));
});
