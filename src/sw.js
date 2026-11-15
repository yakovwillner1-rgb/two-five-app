/* Service worker template. vite.config.ts fills in the two placeholders at build time and writes dist/sw.js.
   Rules (see CLAUDE.md):
   - HTML: network first, so a new deploy shows on the very next launch. Cache only when offline.
   - Hashed files in assets/: cache first (their names change whenever their content does).
   - The cache name carries the build hash; old caches are deleted when a new worker activates. */
const BUILD = '__BUILD_HASH__';
const CACHE = 'twofive-' + BUILD;
const FONTS = 'twofive-fonts';
const PRECACHE = __PRECACHE__;
const INDEX = new URL('./index.html', self.location).href;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE.map(u => new Request(new URL(u, self.location).href, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* Caches from the single-file app (twofive-v1, twofive-v2) served stale pages. */
    const legacy = keys.some(k => /^twofive-v\d+$/.test(k));
    await Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k)));
    await self.clients.claim();
    /* One-time migration: a page loaded from the old stale cache reloads itself into the new version. */
    if (legacy) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach(w => w.navigate(w.url).catch(() => {}));
    }
  })());
});

const put = (name, req, res) => caches.open(name).then(c => c.put(req, res));

async function networkFirst(req, fallbackUrl) {
  try {
    /* 'no-cache' = always check with the server, so the browser's own HTTP cache can't serve a stale page */
    const res = await fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' });
    if (res && res.ok) put(CACHE, fallbackUrl || req, res.clone());
    return res;
  } catch (err) {
    const hit = (await caches.match(req, { ignoreSearch: true })) || (fallbackUrl && (await caches.match(fallbackUrl)));
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) put(name, req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('.html')) e.respondWith(networkFirst(req, INDEX));
    else if (url.pathname.includes('/assets/')) e.respondWith(cacheFirst(req, CACHE));
    else e.respondWith(networkFirst(req));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    /* Fonts: keep a copy so the app looks right offline. gstatic files are versioned by URL. */
    e.respondWith(url.hostname === 'fonts.gstatic.com' ? cacheFirst(req, FONTS) : fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) put(FONTS, req, res.clone()); return res; }).catch(() => caches.match(req)));
  }
});
