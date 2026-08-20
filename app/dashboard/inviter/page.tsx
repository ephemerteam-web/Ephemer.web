'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import Link from 'next/link'
import CarteInvitation from './CarteInvitation'

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

export default function InviterPage() {
  const router = useRouter()

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [message, setMessage] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ============================================
  // 📥 CHARGEMENT INITIAL
  // ============================================
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/connexion')
        return
      }

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur chargement invitations :', error)
        setInvitations([])
      } else {
        setInvitations((data ?? []) as Invitation[])
      }

      setLoading(false)
    }

    init()
  }, [router])

  // Petit helper : message qui disparaît tout seul
  const flash = (txt: string) => {
    setMessage(txt)
    setTimeout(() => setMessage(''), 3500)
  }

  // ============================================
  // ✨ CRÉER UN LIEN
  // ============================================
  const creerLien = async () => {
    setCreating(true)

    // .rpc() = on appelle la fonction SQL créée dans Supabase
    const { data, error } = await supabase.rpc('creer_invitation', {
      p_label: label.trim() || null,
    })

    if (error) {
      console.error('Erreur création invitation :', error)
      flash('❌ Erreur : ' + error.message)
    } else {
      const nouvelle = (Array.isArray(data) ? data[0] : data) as Invitation
      setInvitations((prev) => [{ ...nouvelle, actif: true }, ...prev])
      setLabel('')
      flash('✨ Ton lien est prêt ! Copie-le et partage-le.')
    }

    setCreating(false)
  }

  // ============================================
  // 📋 COPIER
  // ============================================
  const copierLien = async (inv: Invitation) => {
    const url = `${window.location.origin}/invitation/${inv.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(inv.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      flash('❌ Copie impossible. Sélectionne le lien manuellement.')
    }
  }

  // ============================================
  // 💬 PARTAGER
  // ============================================
  const partager = async (inv: Invitation) => {
    const url = `${window.location.origin}/invitation/${inv.token}`
    const texte =
      "Salut ! 👋 Remplis ta fiche en 30 secondes pour que je n'oublie jamais ton anniversaire 🎂"

    // navigator.share = menu de partage natif du téléphone (iOS / Android)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoins-moi sur Ephemer',
          text: texte,
          url,
        })
      } catch {
        // L'utilisateur a annulé → on ne fait rien
      }
    } else {
      // Sur ordinateur : on ouvre WhatsApp Web
      window.open(
        `https://wa.me/?text=${encodeURIComponent(texte + '\n' + url)}`,
        '_blank'
      )
    }
  }

  // ============================================
  // 🚫 DÉSACTIVER
  // ============================================
  const desactiver = async (id: string) => {
    const { error } = await supabase.rpc('desactiver_invitation', { p_id: id })

    if (error) {
      console.error('Erreur désactivation :', error)
      flash('❌ Erreur : ' + error.message)
    } else {
      setInvitations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, actif: false } : i))
      )
      flash('🚫 Lien désactivé.')
    }
  }

  // ============================================
  // ⏳ ÉCRAN DE CHARGEMENT
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <span className="text-6xl">✨</span>
          </div>
          <p className="text-indigo-200">Chargement...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // 🎨 RENDU
  // ============================================
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* ─────── EN-TÊTE ─────── */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block">✨</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Invite tes proches
          </h1>
          <p className="text-indigo-200/80 text-sm max-w-md mx-auto leading-relaxed">
            Fini la saisie manuelle. Envoie un lien, ils remplissent leur fiche en
            30&nbsp;secondes, et leurs dates arrivent directement dans ton calendrier.
          </p>
        </div>

        {/* ─────── CRÉER UN LIEN ─────── */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-5 mb-8">
          <label
            htmlFor="label-lien"
            className="block text-sm font-medium text-indigo-200 mb-2"
          >
            🏷️ Nom du lien{' '}
            <span className="text-indigo-300/50 font-normal">(optionnel)</span>
          </label>

          <input
            id="label-lien"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : Groupe famille, Collègues, Club de sport…"
            maxLength={60}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40 transition mb-4"
          />

          <button
            onClick={creerLien}
            disabled={creating}
            className="w-full bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-bold text-sm py-3.5 rounded-xl transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '⏳ Création…' : '✨ Créer un nouveau lien'}
          </button>

          <p className="text-indigo-300/50 text-xs mt-3 text-center">
            Valable 60 jours · 25 réponses maximum par lien
          </p>
        </div>

        {/* ─────── MESSAGE FLASH ─────── */}
        {message && (
          <div className="mb-6 bg-white/5 border border-[#C8A84E]/30 rounded-xl px-4 py-3 text-sm text-center text-indigo-100">
            {message}
          </div>
        )}

        {/* ─────── LISTE DES LIENS ─────── */}
        <h2 className="text-lg font-bold text-white mb-4">
          📎 Mes liens
          {invitations.length > 0 && (
            <span className="ml-2 text-sm font-normal text-indigo-300">
              ({invitations.length})
            </span>
          )}
        </h2>

        {invitations.length === 0 ? (
          <div className="text-center mt-12">
            <span className="text-6xl mb-4 block">🔗</span>
            <p className="text-indigo-300 leading-relaxed">
              Aucun lien pour le moment.
              <br />
              Crée ton premier lien juste au-dessus ! 👆
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {invitations.map((inv) => (
              <CarteInvitation
                key={inv.id}
                invitation={inv}
                onCopier={(inv) => void copierLien(inv)}
                onPartager={partager}
                onDesactiver={desactiver}
                copie={copiedId === inv.id}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}