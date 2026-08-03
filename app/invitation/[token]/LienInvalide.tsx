const MESSAGES: Record<string, { emoji: string; titre: string; texte: string }> = {
  introuvable: {
    emoji: '🔍',
    titre: 'Ce lien semble incomplet',
    texte: "Vérifie que tu as bien copié l'adresse en entier, ou demande à ton proche de t'en renvoyer un.",
  },
  expire: {
    emoji: '⏳',
    titre: 'Ce lien a expiré',
    texte: "Il était valable 60 jours. Redemande un nouveau lien à la personne qui t'a invité.",
  },
  desactive: {
    emoji: '🔒',
    titre: 'Ce lien a été fermé',
    texte: "La personne qui t'a invité a désactivé ce lien. Elle peut t'en créer un nouveau en un clic.",
  },
  complet: {
    emoji: '🎉',
    titre: 'Ce lien est complet',
    texte: 'Il a déjà accueilli tous ses participants. Demande un nouveau lien à ton proche.',
  },
}

export default function LienInvalide({ raison }: { raison: string }) {
  const m = MESSAGES[raison] ?? MESSAGES.introuvable

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F1017] via-[#15161F] to-[#0F1017] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-6">{m.emoji}</div>

        <h1 className="text-2xl font-semibold text-white mb-3">{m.titre}</h1>
        <p className="text-white/50 leading-relaxed mb-10">{m.texte}</p>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        <p className="text-xs tracking-[0.2em] uppercase text-white/25">Ephemer</p>
        <p className="text-white/30 text-sm mt-2">
          N'oublie plus jamais les dates qui comptent.
        </p>
      </div>
    </main>
  )
}