// public/sw.js
// Service Worker Ephemer.name — v2
// Rôle : notifications push + page de secours hors ligne.
// PRINCIPE DE SÉCURITÉ : on ne met JAMAIS en cache une page
// ou une réponse contenant des données utilisateur.

const CACHE_NAME = 'ephemer-static-v2';

// Uniquement des fichiers PUBLICS et identiques pour tout le monde.
// Aucune page /dashboard ici : elles contiennent des données privées.
const URLS_TO_CACHE = [
  '/offline.html',
  '/site.webmanifest',
  '/icon-192.png',
];

// ─────────────────────────────────────────────
// 1. INSTALLATION
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // On ajoute les fichiers UN PAR UN : si l'un manque,
      // les autres sont quand même installés (contrairement à addAll).
      return Promise.all(
        URLS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Fichier introuvable, ignoré :', url);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────
// 2. ACTIVATION → nettoyage des anciens caches
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// 3. FETCH → stratégie "réseau d'abord"
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // a) On ignore tout ce qui n'est pas une lecture simple
  if (request.method !== 'GET') return;

  // b) On ignore les autres domaines (Supabase, Resend, Google...)
  //    Ce n'est pas notre rôle de mettre leurs réponses en cache.
  if (new URL(request.url).origin !== self.location.origin) return;

  // c) On ignore TOTALEMENT les appels API : ce sont des données
  //    privées et changeantes. Elles doivent toujours venir du serveur.
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  // d) Pour les pages HTML : réseau d'abord, page offline en secours.
  //    On ne met JAMAIS la page en cache (elle contient tes contacts).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // e) Pour les fichiers statiques (images, CSS, JS compilé) :
  //    cache d'abord car ils portent un identifiant de version unique.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // On ne met en cache que les réponses valides
        if (response.ok && response.type === 'basic') {
          const copie = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
        }
        return response;
      });
    })
  );
});

// ─────────────────────────────────────────────
// 4. NOTIFICATIONS PUSH
// ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Si le message reçu n'est pas du JSON valide, on ne plante pas
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Ephemer';
  const options = {
    body: data.body || 'Tu as un nouveau rappel !',
    icon: '/icon-192.png',
    badge: '/badge.png',
    // On stocke l'URL dans un objet : plus fiable pour le clic
    data: { url: data.url || '/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─────────────────────────────────────────────
// 5. CLIC SUR LA NOTIFICATION
// ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const cible = (event.notification.data && event.notification.data.url) || '/dashboard';

  // Si Ephemer est déjà ouvert dans un onglet, on le réutilise
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((liste) => {
        for (const client of liste) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(cible);
            return client.focus();
          }
        }
        return self.clients.openWindow(cible);
      })
  );
});