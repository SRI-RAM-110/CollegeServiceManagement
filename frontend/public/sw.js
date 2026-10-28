// Service Worker for Browser Web Push Notifications
// NEC College Faculty Service Management System

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'NEC Service Notification', body: event.data.text() };
    }
  }

  const title = data.title || 'NEC Campus Notification';
  const options = {
    body: data.body || 'You have a new update regarding your service request.',
    icon: data.icon || '/NEClogo.png',
    badge: data.badge || '/favicon.svg',
    data: data.data || { url: '/notifications' },
    tag: data.tag || 'nec-notification-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
