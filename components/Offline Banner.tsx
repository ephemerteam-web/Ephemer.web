'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Vérifie l'état au chargement
    setIsOnline(navigator.onLine);

    // Écoute les changements de connexion
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null; // N'affiche rien si on est en ligne

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm z-50">
      📡 Mode hors ligne – certaines données peuvent ne pas être à jour
    </div>
  );
}
