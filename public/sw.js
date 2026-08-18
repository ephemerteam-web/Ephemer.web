// public/sw.js
// Service Worker Ephemer.name — v3
// Rôle : notifications push + page de secours hors ligne + mise à jour auto.
// PRINCIPE DE SÉCURITÉ : on ne met JAMAIS en cache une page
// ou une réponse contenant des données utilisateur.

const CACHE_NAME = 'ephemer-static-v3';
const OFFLINE_URL = '/offline.html';

// Uniquement des fichiers PUBLICS et identiques pour tout le monde.
// Aucune page /dashboard ici : elles contiennent des données privées.
const URLS_TO_CACHE = [
  OFFLINE_URL,
  '/site.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── INSTALLATION : on pré-cache les fichiers statiques ───
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pré-cache des fichiers statiques');
      return cache.addAll(URLS_TO_CACHE);
    }).catch((err) => {
      console.warn('[SW] Erreur de pré-cache (non bloquant) :', err);
    })
  );
  // Force l'activation immédiate (sans attendre que l'onglet se ferme)
  self.skipWaiting();
});

// ─── ACTIVATION : on supprime les vieux caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Suppression du vieux cache :', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Prend le contrôle immédiatement de tous les onglets ouverts
  self.clients.claim();
});

// ─── FETCH : stratégie "Network First" pour les pages, "Cache First" pour les assets ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore les requêtes non-GET (POST, PUT, etc.)
  if (request.method !== 'GET') return;

  // Ignore les requêtes vers des API externes (Supabase, Resend...)
  if (request.url.includes('supabase.co') || request.url.includes('resend.com')) {
    return;
  }

  // ── Stratégie 1 : Cache First pour les fichiers statiques ──
  // (icônes, CSS, JS, manifeste → ne changent jamais entre deux déploiements)
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.url.endsWith('.webmanifest')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // ── Stratégie 2 : Network First pour les pages HTML ──
  // (on essaie le réseau, et si ça échoue → page hors ligne)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la réponse est valide, on la met en cache pour la prochaine fois
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Réseau indisponible → on sert la page hors ligne
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // ── Stratégie par défaut : Network First avec fallback cache ──
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// ─── NOTIFICATION PUSH : quand on reçoit un push de Supabase/Vercel ───
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Ephemer', body: event.data.text() };
  }

  const title = data.title || 'Ephemer';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200], // Vibration : vibre-pause-vibre
    data: {
      url: data.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: '📖 Ouvrir' },
      { action: 'close', title: '✕ Fermer' },
    ],
    tag: data.tag || 'ephemer-notification', // Évite les doublons
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── CLIC SUR NOTIFICATION : ouvre la bonne page ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  if (event.action === 'close') return;

  // Si Ephemer est déjà ouvert dans un onglet, on le réutilise
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((liste) => {
        for (const client of liste) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// ─── MISE À JOUR AUTO : informe les onglets ouverts qu'une nouvelle version est dispo ───
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});