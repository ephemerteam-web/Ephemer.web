'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { MESSAGES_UI } from '@/lib/constants'

export default function CompleterProfilPage() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const [loadingPage, setLoadingPage] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // ========================
  // 1. VÉRIFIER L'UTILISATEUR
  // ========================
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        router.push('/connexion')
        return
      }

      setUserId(data.user.id)
      setEmail(data.user.email ?? '')
      setLoadingPage(false)
    }

    checkUser()
  }, [router])

  // ========================
  // 2. SAUVEGARDER LE PROFIL
  // ========================
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!userId) {
      setMessage({ text: "Utilisateur introuvable. Reconnecte-toi.", type: 'error' })
      return
    }

    if (!prenom.trim() || !nom.trim() || !dateNaissance) {
      setMessage({ text: "Merci de remplir tous les champs.", type: 'error' })
      return
    }

    setSaving(true)
    setMessage(null)

    // 🔄 Enregistrement dans la table `profiles`
    // Le trigger `trg_sync_profiles_to_auth` synchronisera automatiquement `auth.users`
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        prenom: prenom.trim(),
        nom: nom.trim(),
        date_naissance: dateNaissance,
      }, { onConflict: 'id' })

    if (error) {
      setMessage({ 
        text: "Le profil n'a pas pu être enregistré : " + error.message, 
        type: 'error' 
      })
      setSaving(false)
      return
    }

    setMessage({ text: '✅ Profil enregistré avec succès !', type: 'success' })

    // Redirection après 800ms
    setTimeout(() => {
      router.push('/dashboard')
    }, 800)

    setSaving(false)
  }

  // ========================
  // ÉTAT CHARGEMENT
  // ========================
  if (loadingPage) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-white/20 border-t-[#C8A84E] rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Chargement…</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/*
        ─────────────────────────────────────────
        CONTENEUR PRINCIPAL
        - Centré verticalement et horizontalement
        - px-4 : marges latérales confortables sur mobile
        - max-w-md : largeur maximale raisonnable
        ─────────────────────────────────────────
      */}
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">

          {/* ── EN-TÊTE ── */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Compléter mon profil
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Ces informations permettront de personnaliser ton expérience sur Ephemer.
            </p>
          </div>

          {/* ── FORMULAIRE ── */}
          <form onSubmit={handleSaveProfile} className="space-y-5">

            {/* Prénom + Nom côte à côte sur mobile (gain de place) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Prénom
                </label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Marie"
                  className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-white text-sm
                             placeholder-white/30 focus:outline-none focus:ring-2
                             focus:ring-[#C8A84E]/50 focus:border-transparent
                             transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Nom
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Dupont"
                  className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-white text-sm
                             placeholder-white/30 focus:outline-none focus:ring-2
                             focus:ring-[#C8A84E]/50 focus:border-transparent
                             transition-all"
                />
              </div>
            </div>

            {/* Date de naissance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                Date de naissance
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50
                           focus:border-transparent transition-all"
              />
            </div>

            {/* Email (lecture seule) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3
                             text-white/40 text-sm cursor-not-allowed pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">
                  🔒
                </span>
              </div>
            </div>

            {/* ── MESSAGE FEEDBACK ── */}
            {message && (
              <div className={`
                p-3.5 rounded-xl text-sm border leading-relaxed
                ${message.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                }
              `}>
                {message.text}
              </div>
            )}

            {/* ── BOUTON SAUVEGARDER ── */}
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[52px] bg-gradient-to-r from-[#C8A84E] to-[#D4B85C]
                         text-[#0B1120] font-bold text-sm rounded-2xl
                         hover:opacity-90 active:scale-95 transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0B1120]/30 border-t-[#0B1120] rounded-full animate-spin" />
                  Enregistrement…
                </span>
              ) : (
                '💾 Enregistrer mon profil'
              )}
            </button>

          </form>
        </div>
      </div>
    </AppLayout>
  )
}