self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'New Order';
  const options = {
    body: payload.body || 'New order received. Open dashboard to view details.',
    icon: payload.icon || '/saysavor-icon.png',
    badge: payload.badge || '/saysavor-icon.png',
    tag: payload.tag || 'order-notification',
    requireInteraction: true,
    data: {
      url: payload.url || '/dashboard/orders',
      orderId: payload.order_id || null,
      event: payload.event || 'order_created',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/dashboard/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
