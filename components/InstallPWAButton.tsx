'use client';

import { useState, useEffect } from 'react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Détection iOS
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isAppleDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si déjà installé en mode application
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt && !isIOS) {
      // Installation automatique sur Android
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Installation : ${outcome}`);
      setDeferredPrompt(null);
      if (outcome === 'accepted') setIsInstallable(false);
    } else {
      // Guide pour iOS ou navigateurs sans support
      setShowGuide(true);
    }
  };

  if (showGuide) {
    return (
      <div className="bg-[#0B1120] border border-[#C8A84E]/40 rounded-3xl p-8 max-w-md text-center mx-auto">
        <div className="text-5xl mb-6">📱</div>
        <h3 className="text-[#C8A84E] text-2xl font-semibold mb-4">
          Comment installer Ephemer sur ton téléphone
        </h3>
        
        <div className="text-left space-y-6 text-white/80">
          <div>
            <div className="font-medium text-white mb-2">Sur iPhone / iPad :</div>
            <ol className="list-decimal pl-5 space-y-3 text-sm">
              <li>Ouvre <strong>Ephemer.name</strong> dans <strong>Safari</strong></li>
              <li>Appuie sur le bouton <span className="text-[#C8A84E]">Partager</span> en bas (carré avec une flèche ↑)</li>
              <li>Fais défiler et appuie sur <strong>« Ajouter à l’écran d’accueil »</strong></li>
              <li>Appuie sur <strong>Ajouter</strong> en haut à droite</li>
            </ol>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(false)}
          className="mt-8 text-white/60 hover:text-white underline text-sm"
        >
          Fermer le guide
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="group flex items-center gap-3 bg-gradient-to-r from-[#C8A84E] to-amber-400 hover:from-amber-300 hover:to-[#E6D07A] text-[#0B1120] font-semibold px-8 py-4 rounded-2xl shadow-2xl shadow-[#C8A84E]/30 transition-all duration-300 active:scale-[0.97]"
    >
      <span className="text-3xl transition-transform group-active:rotate-12">📲</span>
      <div className="text-left leading-tight">
        <div className="text-lg">Installer sur mon téléphone</div>
        <div className="text-xs opacity-75">
          {isIOS ? "Guide iPhone • Ajouter à l’écran d’accueil" : "Installation en 1 clic"}
        </div>
      </div>
    </button>
  );
}
