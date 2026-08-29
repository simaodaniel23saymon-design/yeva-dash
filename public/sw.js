/* YevaTrade Web Push service worker */
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
