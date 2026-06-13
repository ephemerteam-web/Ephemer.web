'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import AppLayout from '@/components/AppLayout'
import { INDICATIFS_PAYS, MESSAGES_UI } from '@/lib/constants'

export default function DashboardProfil() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [email, setEmail] = useState('')
  const [telephoneIndicatif, setTelephoneIndicatif] = useState('+33')
  const [telephoneNumero, setTelephoneNumero] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ========================
  // 1. CHARGER LE PROFIL
  // ========================
  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setMessage(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      setEmail(user.email || '')

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur chargement profil:', error)
        setMessage({ text: MESSAGES_UI.erreur_genérique, type: 'error' })
      } else if (profile) {
        setPrenom(profile.prenom || '')
        setNom(profile.nom || '')
        setTelephoneIndicatif(profile.telephone_indicatif || '+33')
        setTelephoneNumero(profile.telephone_numero || '')
        if (profile.date_naissance) setDateNaissance(profile.date_naissance)
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  // ========================
  // 2. SAUVEGARDER
  // ========================
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        prenom: prenom.trim() || null,
        nom: nom.trim() || null,
        date_naissance: dateNaissance || null,
        telephone_indicatif: telephoneIndicatif,
        telephone_numero: telephoneNumero.trim() || null,
      }, { onConflict: 'id' })

    if (error) {
      setMessage({ text: MESSAGES_UI.erreur_genérique, type: 'error' })
    } else {
      setMessage({ text: '✅ Ton profil a été mis à jour avec succès !', type: 'success' })
    }

    setSaving(false)
  }

  // ========================
  // 3. CHANGER MOT DE PASSE
  // ========================
  const handleChangePassword = async () => {
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      setMessage({ text: 'Impossible de récupérer ton email', type: 'error' })
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setMessage({
        text: '📩 Un email de réinitialisation a été envoyé ! Vérifie ta boîte mail.',
        type: 'success'
      })
    }
  }

  // ========================
  // 4. SUPPRIMER LE COMPTE
  // ========================
  const handleDeleteAccount = async () => {
    setDeleting(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setMessage({ text: 'Session expirée, reconnecte-toi', type: 'error' })
        return
      }

      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur inconnue')
      }

      await supabase.auth.signOut()
      router.push('/?deleted=true')

    } catch (error: any) {
      setMessage({
        text: `Erreur : ${error.message}`,
        type: 'error'
      })
      setDeleting(false)
    }
  }

  // ========================
  // ÉTAT CHARGEMENT
  // ========================
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            {/* Spinner animé */}
            <div className="w-10 h-10 border-4 border-white/20 border-t-[#C8A84E] rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Chargement de ton profil…</p>
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
        - px-4 : marges latérales confortables sur mobile
        - py-6 : espace vertical raisonnable
        - max-w-lg : on limite la largeur sur grands écrans
        ─────────────────────────────────────────
      */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-16">

        {/* ── EN-TÊTE ── */}
        <div className="mb-6">
          {/*
            text-2xl sur mobile (au lieu de 3xl) = moins imposant,
            plus de place pour le contenu
          */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Mon Profil
          </h1>
          <p className="text-white/50 text-sm">
            Gère tes informations personnelles
          </p>
        </div>

        {/* ── CARTE PRINCIPALE ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">

          {/* Avatar + nom affiché (compact sur mobile) */}
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/10">
            {/*
              Avatar plus petit (16x16 au lieu de 24x24)
              pour ne pas gaspiller l'espace vertical
            */}
            <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-[#C8A84E] to-[#D4B85C] rounded-2xl flex items-center justify-center text-3xl">
              👤
            </div>
            <div className="min-w-0">
              {/* min-w-0 permet à truncate de fonctionner dans un flex */}
              <p className="text-white font-semibold truncate">
                {prenom || nom
                  ? `${prenom} ${nom}`.trim()
                  : 'Profil incomplet'}
              </p>
              {/* Email tronqué si trop long */}
              <p className="text-white/40 text-xs truncate mt-0.5">
                {email}
              </p>
            </div>
          </div>

          {/* ── FORMULAIRE ── */}
          <div className="flex flex-col gap-4">

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
                  placeholder="Jean"
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
                {/* Icône cadenas pour signaler visuellement que c'est verrouillé */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">
                  🔒
                </span>
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
                /*
                  "color-scheme: dark" force le calendrier natif iOS/Android
                  à s'afficher en thème sombre — sinon il est blanc cassé
                  et illisible sur notre fond foncé
                */
                style={{ colorScheme: 'dark' }}
                className="bg-white/8 border border-white/10 rounded-xl px-3 py-3 text-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50
                           focus:border-transparent transition-all"
              />
            </div>

            {/* ── TÉLÉPHONE ── version empilée sur mobile */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                Téléphone
              </label>

              {/*
                flex-col sur mobile : indicatif en haut, numéro en bas
                flex-row à partir de sm (640px) : côte à côte
                → beaucoup plus confortable sur petit écran
              */}
              <div className="flex flex-col sm:flex-row gap-2">

                {/* Sélecteur pays */}
                <select
                  value={telephoneIndicatif}
                  onChange={(e) => setTelephoneIndicatif(e.target.value)}
                  className="bg-zinc-900 border border-white/20 text-white rounded-xl
                             px-3 py-3 text-sm focus:outline-none focus:ring-2
                             focus:ring-[#C8A84E]/50 focus:border-transparent
                             appearance-none cursor-pointer
                             w-full sm:w-auto sm:min-w-[160px]"
                >
                  {INDICATIFS_PAYS.map((item) => (
                    <option
                      key={item.code}
                      value={item.code}
                      className="bg-zinc-900 text-white"
                    >
                      {item.pays}
                    </option>
                  ))}
                </select>

                {/* Numéro */}
                <input
                  type="tel"
                  value={telephoneNumero}
                  onChange={(e) => setTelephoneNumero(e.target.value)}
                  placeholder={MESSAGES_UI.placeholder_telephone}
                  className="flex-1 bg-white/8 border border-white/10 rounded-xl
                             px-3 py-3 text-white text-sm placeholder-white/30
                             focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50
                             focus:border-transparent transition-all"
                />
              </div>

              <p className="text-xs text-white/35 leading-relaxed">
                {MESSAGES_UI.info_telephone}
              </p>
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
            {/*
              min-h-[52px] garantit une zone tactile suffisante (Apple recommande 44pt min)
              active:scale-95 donne un retour visuel immédiat au doigt sur mobile
            */}
            <button
              onClick={handleSave}
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
                '💾 Enregistrer mes informations'
              )}
            </button>

            {/* ── SÉPARATEUR ── */}
            <div className="border-t border-white/10 pt-2" />

            {/* ── CHANGER MOT DE PASSE ── */}
            <button
              onClick={handleChangePassword}
              className="w-full min-h-[48px] py-3 text-blue-400 text-sm
                         border border-blue-400/25 rounded-2xl
                         hover:bg-blue-500/10 active:scale-95 transition-all"
            >
              🔐 Modifier mon mot de passe
            </button>

            {/* ── ZONE DANGER ── */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full min-h-[48px] py-3 text-red-400 text-sm
                           border border-red-500/25 rounded-2xl
                           hover:bg-red-500/10 active:scale-95 transition-all"
              >
                🗑️ Supprimer mon compte
              </button>
            ) : (
              /*
                Confirmation de suppression
                Plus compact sur mobile : texte court, boutons bien espacés
              */
              <div className="border border-red-500/30 rounded-2xl p-4 bg-red-500/5">
                <p className="text-red-400 font-semibold text-sm mb-1">
                  ⚠️ Es-tu sûr(e) ?
                </p>
                <p className="text-white/50 text-xs leading-relaxed mb-4">
                  Cette action est{' '}
                  <strong className="text-white/70">irréversible</strong>.
                  Ton compte, tes contacts et toutes tes données seront supprimés définitivement.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 min-h-[44px] text-white/70 text-sm
                               border border-white/20 rounded-xl
                               hover:bg-white/10 active:scale-95 transition-all
                               disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 min-h-[44px] bg-red-500/80 text-white text-sm
                               font-semibold rounded-xl
                               hover:bg-red-500 active:scale-95 transition-all
                               disabled:opacity-50"
                  >
                    {deleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Suppression…
                      </span>
                    ) : (
                      'Oui, supprimer'
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Espace en bas pour ne pas être caché par la nav mobile */}
        <div className="h-6" />
      </div>
    </AppLayout>
  )
}
