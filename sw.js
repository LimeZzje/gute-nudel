// Offline support: the app files come from the cache, updates load in the background (next start shows them).
// GitHub (backup + photos) always goes to the network.
const V = 'gn-3';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'data.js', 'content.js', 'plant.js', 'manifest.json',
  'fonts/nunito.woff2', 'fonts/caveat.woff2', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response('offline', { status: 503 });
  }));
});
