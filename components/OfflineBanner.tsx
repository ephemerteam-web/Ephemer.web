'use client';

import { useSyncExternalStore } from 'react';
function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => { window.removeEventListener('online', callback); window.removeEventListener('offline', callback); };
}
export default function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  if (isOnline) return null; // N'affiche rien si on est en ligne

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm z-50">
      📡 Mode hors ligne – certaines données peuvent ne pas être à jour
    </div>
  );
}
