'use client';

import { useState, useEffect } from 'react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);

  // Détecte si le navigateur peut installer l'application (Chrome, Edge, Samsung Internet...)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();           // Empêche le mini-menu automatique
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Vérifie si l'application est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Installation réelle (sur Android/Chrome)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`Installation PWA : ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Mode simulation / explication pour iOS et navigateurs qui ne supportent pas
      setShowManualInstall(true);
    }
  };

  // Message explicatif quand on ne peut pas installer automatiquement
  if (showManualInstall) {
    return (
      <div className="bg-white/5 border border-[#C8A84E]/30 rounded-3xl p-6 max-w-md text-center">
        <div className="text-4xl mb-4">📱</div>
        <h3 className="text-[#C8A84E] font-semibold text-lg mb-2">Comment installer Ephemer ?</h3>
        <p className="text-white/70 text-sm mb-6">
          Sur ton téléphone, appuie sur le menu <span className="text-white">⋮</span> (ou le bouton partage) 
          puis choisis <strong>« Ajouter à l’écran d’accueil »</strong>.
        </p>
        <button
          onClick={() => setShowManualInstall(false)}
          className="text-white/50 hover:text-white text-sm underline"
        >
          Fermer
        </button>
      </div>
    );
  }

  // Bouton principal (style doré élégant qui correspond à ton thème)
  return (
    <button
      onClick={handleInstallClick}
      className="group flex items-center gap-3 bg-gradient-to-r from-[#C8A84E] to-amber-400 hover:from-amber-300 hover:to-[#E6D07A] text-[#0B1120] font-semibold px-8 py-4 rounded-2xl shadow-2xl shadow-[#C8A84E]/30 transition-all duration-300 active:scale-[0.97] hover:shadow-[#C8A84E]/50"
    >
      <span className="text-3xl transition-transform group-active:rotate-12">📲</span>
      <div className="text-left leading-tight">
        <div className="text-lg tracking-wide">Installer Ephemer</div>
        <div className="text-xs opacity-75">Sur ton écran d’accueil • Gratuit</div>
      </div>
    </button>
  );
}
