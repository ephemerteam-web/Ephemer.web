'use client'; // ← Important : ce composant doit être interactif

import { useState, useEffect } from 'react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // On empêche le mini-menu automatique du navigateur
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // Affiche la vraie boîte de dialogue d’installation

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Installation : ${outcome}`);

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Si le navigateur ne supporte pas l’installation, on affiche un beau bouton qui simule
  if (!isInstallable) {
    return (
      <button
        onClick={() => alert("📱 Sur mobile : Appuie sur le menu ⋮ puis « Ajouter à l’écran d’accueil »")}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-2xl font-medium transition-all active:scale-95"
      >
        📲 Installer Ephemer sur mon téléphone
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 shadow-lg"
    >
      📲 Installer l’application
    </button>
  );
}
