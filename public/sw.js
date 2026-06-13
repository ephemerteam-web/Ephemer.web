// public/sw.js
// Service Worker minimal pour recevoir les notifications push

self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Ephemer";
  const options = {
    body: data.body || "Tu as un nouveau rappel !",
    icon: "/icon-192.png",      // (optionnel, on l'ajoutera plus tard)
    badge: "/badge.png",        // (optionnel)
    data: data.url || "/",      // page à ouvrir au clic
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Quand l'utilisateur clique sur la notification
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data));
});
