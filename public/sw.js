/* YevaTrade service worker — cache versionado + Web Push */
/* __YEWA_CACHE_VERSION__ é substituído no build (vite). */
const CACHE_VERSION = '__YEWA_CACHE_VERSION__';
const CACHE_NAME = `yeva-${CACHE_VERSION}`;
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon-192.png',
  '/favicon-32.png',
  '/recuperar.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(PRECACHE);
      } catch {
        /* precache best-effort */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('yeva-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'YEWA_SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data && data.type === 'YEWA_CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        const clientsList = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsList) {
          client.postMessage({ type: 'YEWA_CACHES_CLEARED' });
        }
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API / auth nunca em cache
  if (url.pathname.startsWith('/api')) return;

  // Assets hashed: cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          try {
            await cache.put(req, res.clone());
          } catch {
            /* */
          }
        }
        return res;
      })()
    );
    return;
  }

  // Navegação / HTML: network-first, fallback cache
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          try {
            await cache.put('/index.html', fresh.clone());
          } catch {
            /* */
          }
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            (await cache.match('/recuperar.html')) ||
            Response.error()
          );
        }
      })()
    );
  }
});

/* Web Push */
self.addEventListener('push', (event) => {
  let data = { title: 'YevaTrade', body: 'Nova notificação', eventType: '' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try {
      data.body = event.data ? event.data.text() : data.body;
    } catch {
      /* */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'YevaTrade', {
      body: data.body || '',
      icon: '/favicon-192.png',
      badge: '/favicon-32.png',
      data: { eventType: data.eventType, url: '/' },
      tag: data.eventType || 'yevatrade',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
