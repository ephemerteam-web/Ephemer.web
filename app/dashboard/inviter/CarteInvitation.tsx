'use client'
import { useClock } from '@/lib/hooks/useClock'

type Invitation = {
  id: string
  token: string
  label: string | null
  max_utilisations: number
  nb_utilisations: number
  expires_at: string
  actif: boolean
  created_at: string
}

type Props = {
  invitation: Invitation
  onCopier: (inv: Invitation) => void
  onPartager: (inv: Invitation) => void
  onDesactiver: (id: string) => void
  copie: boolean
}

export default function CarteInvitation({
  invitation,
  onCopier,
  onPartager,
  onDesactiver,
  copie,
}: Props) {
  const now = useClock()
  // ── Calculs d'affichage ──
  const origine =
    typeof window !== 'undefined' ? window.location.origin : 'https://ephemer.name'
  const url = `${origine}/invitation/${invitation.token}`

  const pourcentage =
    (invitation.nb_utilisations / invitation.max_utilisations) * 100
  const complet = invitation.nb_utilisations >= invitation.max_utilisations

  const joursRestants = Math.ceil(
    (new Date(invitation.expires_at).getTime() - now) / (1000 * 60 * 60 * 24)
  )
  const expire = now > 0 && new Date(invitation.expires_at).getTime() <= now
  const inactif = !invitation.actif || complet || expire

  return (
    <div
      className={`relative bg-ink/5 backdrop-blur-lg border rounded-xl p-4 transition-all duration-300 ${
        inactif
          ? 'border-line opacity-50'
          : 'border-accent/30 hover:border-accent/60 shadow-[0_0_15px_-3px_rgba(200,168,78,0.12)]'
      }`}
    >
      {/* ─────── LIGNE 1 : titre + compteur ─────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink text-sm md:text-base truncate">
            {invitation.label || '🔗 Lien sans nom'}
          </h3>
          <p className="text-info text-xs mt-0.5">
            {expire
              ? '⏱️ Expiré'
              : complet
              ? '✅ Complet'
              : !invitation.actif
              ? '🚫 Désactivé'
              : `⏱️ ${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${
                  joursRestants > 1 ? 's' : ''
                }`}
          </p>
        </div>

        <div
          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
            complet
              ? 'bg-green-500/20 text-success border-green-500/30'
              : 'bg-action/15 text-accent border-accent/30'
          }`}
        >
          {invitation.nb_utilisations}/{invitation.max_utilisations}
        </div>
      </div>

      {/* ─────── LIGNE 2 : l'URL (version raccourcie si trop longue) ─────── */}
      <div className="bg-canvas/60 border border-line rounded-lg px-3 py-2.5 mb-3">
        <p className="text-accent/90 text-xs font-mono truncate select-all">
          {url.length > 40 ? `${url.substring(0, 37)}...` : url}
        </p>
      </div>

      {/* ─────── LIGNE 3 : barre de progression ─────── */}
      <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-action to-action rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pourcentage, 100)}%` }}
        />
      </div>

      {/* ─────── LIGNE 4 : boutons (taille uniformisée) ─────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCopier(invitation)}
          disabled={inactif}
          className="flex-1 min-w-[80px] text-xs font-medium text-info hover:text-ink border border-indigo-400/30 hover:bg-indigo-500/10 px-3 py-2.5 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copie ? '✓ Copié !' : '📋 Copier'}
        </button>

        <button
          onClick={() => onPartager(invitation)}
          disabled={inactif}
          className="flex-1 min-w-[80px] text-xs font-medium text-success hover:text-ink border border-green-500/30 hover:bg-green-500/10 px-3 py-2.5 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          💬 Partager
        </button>

        {invitation.actif && !complet && !expire && (
          <button
            onClick={() => {
              if (confirm('Désactiver ce lien ? Il ne sera plus utilisable.')) {
                onDesactiver(invitation.id)
              }
            }}
            className="flex-1 min-w-[80px] text-xs font-medium text-danger hover:text-ink border border-red-500/30 hover:bg-red-500/10 px-3 py-2.5 rounded-lg transition active:scale-95"
          >
            🚫
          </button>
        )}
      </div>

    </div>
  )
}
