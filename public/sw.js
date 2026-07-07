// public/sw.js
// Service Worker amélioré pour Ephemer.name
// Gère les notifications push + le mode hors ligne

const CACHE_NAME = 'ephemer-cache-v1';

// Liste des pages et fichiers à mettre en cache pour le mode hors ligne
const URLS_TO_CACHE = [
  '/',
  '/dashboard',
  '/dashboard/calendrier',
  '/dashboard/contacts',
  '/dashboard/messages-programmes',
  '/site.webmanifest',
  '/globals.css',
  // Ajoute ici d’autres pages importantes si besoin
];

// 1. Installation du Service Worker → mise en cache initiale
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des pages principales');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Active immédiatement la nouvelle version
});

// 2. Activation → nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Prend le contrôle immédiatement
});

// 3. Interception des requêtes → mode hors ligne
self.addEventListener('fetch', (event) => {
  // On ne met en cache que les requêtes GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si on a une version en cache → on la renvoie (rapide + hors ligne)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Sinon on va chercher sur le réseau
      return fetch(event.request)
        .then((networkResponse) => {
          // On met en cache les nouvelles réponses pour la prochaine fois
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Si tout échoue (pas de réseau + pas en cache) → page de secours basique
          if (event.request.destination === 'document') {
            return caches.match('/dashboard'); // ou une page offline.html si tu en crées une
          }
        });
    })
  );
});

// 4. Notifications push (ton code actuel conservé)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Ephemer';
  const options = {
    body: data.body || 'Tu as un nouveau rappel !',
    icon: '/icon-192.png',
    badge: '/badge.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data));
});
