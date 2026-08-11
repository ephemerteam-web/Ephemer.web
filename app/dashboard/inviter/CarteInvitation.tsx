'use client'

import { useState } from 'react'

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
  const [showQR, setShowQR] = useState(false)

  // ── Calculs d'affichage ──
  const origine =
    typeof window !== 'undefined' ? window.location.origin : 'https://ephemer.name'
  const url = `${origine}/invitation/${invitation.token}`

  const pourcentage =
    (invitation.nb_utilisations / invitation.max_utilisations) * 100
  const complet = invitation.nb_utilisations >= invitation.max_utilisations

  const joursRestants = Math.ceil(
    (new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const expire = joursRestants <= 0
  const inactif = !invitation.actif || complet || expire

  // QR code via API gratuite (aucune librairie à installer)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    url
  )}&bgcolor=0B1120&color=C8A84E&margin=10`

  return (
    <div
      className={`relative bg-white/5 backdrop-blur-lg border rounded-xl p-4 transition-all duration-300 ${
        inactif
          ? 'border-white/10 opacity-50'
          : 'border-[#C8A84E]/30 hover:border-[#C8A84E]/60 shadow-[0_0_15px_-3px_rgba(200,168,78,0.12)]'
      }`}
    >
      {/* ─────── LIGNE 1 : titre + compteur ─────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm md:text-base truncate">
            {invitation.label || '🔗 Lien sans nom'}
          </h3>
          <p className="text-indigo-300/70 text-xs mt-0.5">
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
              ? 'bg-green-500/20 text-green-300 border-green-500/30'
              : 'bg-[#C8A84E]/15 text-[#C8A84E] border-[#C8A84E]/30'
          }`}
        >
          {invitation.nb_utilisations}/{invitation.max_utilisations}
        </div>
      </div>

      {/* ─────── LIGNE 2 : l'URL (version raccourcie si trop longue) ─────── */}
      <div className="bg-[#0B1120]/60 border border-white/10 rounded-lg px-3 py-2.5 mb-3">
        <p className="text-[#C8A84E]/90 text-xs font-mono truncate select-all">
          {url.length > 40 ? `${url.substring(0, 37)}...` : url}
        </p>
      </div>

      {/* ─────── LIGNE 3 : barre de progression ─────── */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-[#C8A84E] to-[#F4E5BC] rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pourcentage, 100)}%` }}
        />
      </div>

      {/* ─────── LIGNE 4 : boutons (taille uniformisée) ─────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCopier(invitation)}
          disabled={inactif}
          className="flex-1 min-w-[80px] text-xs font-medium text-indigo-200 hover:text-white border border-indigo-400/30 hover:bg-indigo-500/10 px-3 py-2.5 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copie ? '✓ Copié !' : '📋 Copier'}
        </button>

        <button
          onClick={() => onPartager(invitation)}
          disabled={inactif}
          className="flex-1 min-w-[80px] text-xs font-medium text-green-300 hover:text-white border border-green-500/30 hover:bg-green-500/10 px-3 py-2.5 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          💬 Partager
        </button>

        <button
          onClick={() => setShowQR(!showQR)}
          disabled={inactif}
          className="flex-1 min-w-[80px] text-xs font-medium text-indigo-200 hover:text-white border border-indigo-400/30 hover:bg-indigo-500/10 px-3 py-2.5 rounded-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showQR ? '✕' : '🔲 QR'}
        </button>

        {invitation.actif && !complet && !expire && (
          <button
            onClick={() => {
              if (confirm('Désactiver ce lien ? Il ne sera plus utilisable.')) {
                onDesactiver(invitation.id)
              }
            }}
            className="flex-1 min-w-[80px] text-xs font-medium text-red-300 hover:text-white border border-red-500/30 hover:bg-red-500/10 px-3 py-2.5 rounded-lg transition active:scale-95"
          >
            🚫
          </button>
        )}
      </div>

      {/* ─────── QR CODE dépliable (taille adaptée pour mobile) ─────── */}
      {showQR && (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR code du lien d'invitation"
            className="rounded-xl border border-[#C8A84E]/30 w-48 h-48 max-w-full"
          />
          <p className="text-indigo-300/70 text-xs mt-3 text-center">
            Scanne ce code 📱
          </p>
        </div>
      )}
    </div>
  )
}