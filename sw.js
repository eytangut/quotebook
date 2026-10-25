// v2: offline app shell + cached CDN scripts. Model files are handled by js/offline.js (File System API).
// Bump V to force-clear old caches after a big change.
const V = 'qb-v3';
const CDN = /(^|\.)(jsdelivr\.net|esm\.sh|unpkg\.com|cdnjs\.cloudflare\.com|skypack\.dev)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('qb-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    // stale-while-revalidate; navigations fall back to the cached shell when offline
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
        .catch(async () => hit || (r.mode === 'navigate' ? await c.match('index.html') : null) || Response.error());
      return hit || net;
    }));
  } else if (CDN.test(u.hostname) && !r.headers.has('range')) {
    // versioned CDN files are effectively immutable: cache-first
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r);
      if (res.ok || res.type === 'opaque') c.put(r, res.clone());
      return res;
    }));
  }
});
