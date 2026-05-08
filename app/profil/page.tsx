'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

export default function Profil() {
  const router = useRouter()

  // États pour les champs du formulaire
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [email, setEmail] = useState('') // Email vient de l'authentification

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 1. Chargement des données du profil au démarrage
  useEffect(() => {
    async function loadProfil() {
      setLoading(true)
      setMessage(null)

      // Récupérer l'utilisateur connecté via Supabase Auth
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      // Charger les informations de la table "profiles"
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "aucune ligne trouvée" → c'est normal au premier profil
        console.error('Erreur chargement profil:', error)
      }

      if (profile) {
        setPrenom(profile.prenom || '')
        setNom(profile.nom || '')
        setEmail(user.email || '') // Email vient toujours de auth.users

        // Gestion propre de la date (Supabase renvoie parfois un objet Date)
        if (profile.date_naissance) {
          const date = new Date(profile.date_naissance)
          setDateNaissance(date.toISOString().split('T')[0]) // format YYYY-MM-DD
        }
      } else {
        // Si le profil n'existe pas encore, on met au moins l'email
        setEmail(user.email || '')
      }

      setLoading(false)
    }

    loadProfil()
  }, [router])

  // 2. Fonction de sauvegarde
  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,                    // Important : on lie toujours au user.id
        prenom: prenom.trim(),
        nom: nom.trim(),
        date_naissance: dateNaissance || null,
        // email n'est pas mis à jour ici (il vient de auth.users)
      })

    if (error) {
      setMessage({ text: 'Erreur lors de la sauvegarde : ' + error.message, type: 'error' })
    } else {
      setMessage({ text: '✅ Profil mis à jour avec succès !', type: 'success' })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <AppLayout className="justify-center">
        <div className="text-center relative z-10">
          <div className="animate-pulse mb-4">
            <span className="text-6xl">🌙</span>
          </div>
          <p className="text-white/50">Chargement de ton profil...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout className="justify-center">
      <div className="w-full max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-white/10 border border-[#C8A84E]/20 rounded-2xl flex items-center justify-center text-5xl">
            👤
          </div>
          <h1 className="text-3xl font-black text-white">Mon Profil</h1>
          <p className="text-white/50 mt-2">Tes informations personnelles</p>
        </div>

        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8 backdrop-blur-sm">

          <div className="flex flex-col gap-6">
            {/* Email (non modifiable) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
              />
              <p className="text-[10px] text-white/30">Cet email ne peut pas être modifié ici</p>
            </div>

            {/* Prénom */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ton prénom"
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            {/* Nom */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ton nom de famille"
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            {/* Date de naissance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            {/* Message de retour */}
            {message && (
              <div className={`p-4 rounded-2xl text-sm font-medium border ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-300 border-green-500/20'
                  : 'bg-red-500/10 text-red-300 border-red-500/20'
              }`}>
                {message.text}
              </div>
            )}

            {/* Bouton Enregistrer */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-2xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {saving ? 'Enregistrement en cours...' : '💾 Enregistrer mes informations'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-white/40 hover:text-[#C8A84E] transition text-center"
            >
              ← Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
