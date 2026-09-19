'use client';

import { useState, useEffect } from 'react';
import { useBrowserValue } from '@/lib/hooks/useBrowserValue';
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPrompt | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const standalone = useBrowserValue(() => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true, false);
  const isIOS = useBrowserValue(() => /iPad|iPhone|iPod/.test(navigator.userAgent), false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {

    const handler = (event: Event) => {
      const e = event as InstallPrompt;
      e.preventDefault();
      if (window.matchMedia('(display-mode: standalone)').matches) return;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);


    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); setIsInstallable(false); };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt && !isIOS) {
      // Installation automatique sur Android
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setInstalled(true);
      } catch { setShowGuide(true); }
      finally { setDeferredPrompt(null); setIsInstallable(false); }
    } else {
      // Guide pour iOS ou navigateurs sans support
      setShowGuide(true);
    }
  };

  if (standalone || installed) return null;

  if (showGuide) {
    return (
      <div className="bg-canvas border border-accent/40 rounded-3xl p-8 max-w-md text-center mx-auto">
        <div className="text-5xl mb-6">📱</div>
        <h3 className="text-accent text-2xl font-semibold mb-4">
          Comment installer Ephemer sur ton téléphone
        </h3>
        
        <div className="text-left space-y-6 text-muted">
          {!isIOS && <p className="text-sm">Ouvre le menu de ton navigateur et cherche « Installer l’application » ou « Ajouter à l’écran d’accueil ». Si cette option est absente, continue dans le navigateur.</p>}
          <div>
            <div className="font-medium text-ink mb-2">Sur iPhone / iPad :</div>
            <ol className="list-decimal pl-5 space-y-3 text-sm">
              <li>Ouvre <strong>Ephemer.name</strong> dans <strong>Safari</strong></li>
              <li>Appuie sur le bouton <span className="text-accent">Partager</span> en bas (carré avec une flèche ↑)</li>
              <li>Fais défiler et appuie sur <strong>« Ajouter à l’écran d’accueil »</strong></li>
              <li>Appuie sur <strong>Ajouter</strong> en haut à droite</li>
            </ol>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(false)}
          className="mt-8 text-muted hover:text-ink underline text-sm"
        >
          Fermer le guide
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="group flex items-center gap-3 bg-gradient-to-r from-action to-action hover:from-action-hover hover:to-action-hover text-on-action font-semibold px-8 py-4 rounded-2xl shadow-2xl shadow-[#C8A84E]/30 transition-all duration-300 active:scale-[0.97]"
    >
      <span className="text-3xl transition-transform group-active:rotate-12">📲</span>
      <div className="text-left leading-tight">
        <div className="text-lg">Installer sur mon téléphone</div>
        <div className="text-xs opacity-75">
          {isIOS ? "Guide iPhone • Ajouter à l’écran d’accueil" : isInstallable ? "Installation disponible" : "Voir les instructions"}
        </div>
      </div>
    </button>
  );
}
