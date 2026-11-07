// Offline support. Online: always the newest app files from the network (so updates apply at once);
// offline: the copy from the cache. GitHub (backup + photos) never goes through here.
const V = 'gn-143';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'data.js', 'content.js', 'cookbook.js', 'shop.js', 'naehr.js', 'plant.js', 'car.js', 'spiel.js', 'entspannen.js', 'baby.js', 'geburtstag.js', 'hellonudel.js', 'hn_slides.js', 'manifest.json',
  'state.js', 'core.js', 'sync.js', 'rank.js', 'chores.js', 'heute.js', 'daheim.js', 'relax.js', 'schaetze.js', 'woche.js', 'settings.js', 'actions.js',
  'einkauf.js', 'kochbuch.js', 'recipes.js', 'termine.js', 'home.js', 'wochenplan.js', 'events.js', 'merge.js', 'faellig.js', 'flowers.js', 'snacks.js',
  'fonts/nunito.woff2', 'fonts/caveat.woff2', 'fonts/pixel.woff2', 'fonts/creepster.woff2', 'fonts/dancing.woff2', 'fonts/fraktur.woff2', 'fonts/fell.woff2', 'fonts/fell-i.woff2', 'fonts/patrick.woff2', 'book.js', 'icons/icon-192.png', 'icons/icon-512.png', 'iq/'];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// G16: the day-before reminder from the Gute Nudel push worker ({title, body, tag, url}); a tap opens the app
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Gute Nudel', { body: d.body || '', tag: d.tag || 'gn-due', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.startsWith(self.registration.scope));
    return w ? w.focus() : self.clients.openWindow(url);
  }));
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
