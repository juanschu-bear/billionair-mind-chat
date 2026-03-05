// Billionair Mind Chat — Service Worker for Push Notifications
'use strict';

self.addEventListener('push', (event) => {
  let data = { title: 'Billionair Mind Chat', body: 'You have a new message' };

  try {
    data = event.data.json();
  } catch (e) {
    // fallback to defaults
  }

  const options = {
    body: data.body,
    icon: '/assets/bmc-icon-192.png',
    badge: '/assets/bmc-icon-192.png',
    tag: data.tag || 'bmc-nudge',
    data: {
      ceoId: data.ceo_id,
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Reply' }
    ],
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const ceoId = event.notification.data?.ceoId;
  const url = ceoId ? `/?open=${ceoId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'OPEN_CHAT', ceoId });
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});
