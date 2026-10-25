// Stale-while-revalidate for same-origin files so the app opens offline.
// Bump V to force-clear old caches after a big change.
const V = 'qb-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
                        .catch(() => hit || Response.error());
    return hit || net;
  }));
});
