// Ephemer v6 : aucun HTML applicatif, RSC, API ou fichier privé en cache.
const CACHE_NAME = 'ephemer-static-v6';
const OFFLINE_URL = '/offline.html';
const PUBLIC_FILES = [OFFLINE_URL, '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // La page de secours est indispensable ; une icône absente ne bloque pas le worker.
    await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    await Promise.allSettled(PUBLIC_FILES.slice(1).map(url => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ephemer-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(OFFLINE_URL) || new Response('Hors ligne. Reconnectez-vous pour consulter Ephemer.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  // Liste fermée, sans paramètres : aucune image privée ou réponse API admise.
  if (!url.search && PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(url.pathname) || fetch(request);
    })());
  }
});

function safeNotificationURL(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/dashboard/notifications', self.location.origin);
    if (url.origin === self.location.origin && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) return url.href;
  } catch { /* Destination invalide : centre de notifications. */ }
  return new URL('/dashboard/notifications', self.location.origin).href;
}

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Pas de contenu privé dans le fallback. */ }
  if (!data || typeof data !== 'object') data = {};
  // Le détail reste dans l'application authentifiée, pas sur un écran verrouillé.
  const options = {
    body: 'Une activité est disponible dans votre application.',
    icon: '/icon-192.png', badge: '/icon-192.png',
    data: { url: safeNotificationURL(data.url) },
    ...(typeof data.tag === 'string' && data.tag ? { tag: data.tag } : {}),
  };
  event.waitUntil(self.registration.showNotification('Ephemer', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = safeNotificationURL(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        const navigated = await client.navigate(url);
        if (navigated) return navigated.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
