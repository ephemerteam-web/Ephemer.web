'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

export default function DashboardProfil() {
  const router = useRouter()

  // États du formulaire
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [email, setEmail] = useState('') // Email vient de Supabase Auth (non modifiable)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // ========================
  // 1. CHARGER LES DONNÉES DU PROFIL
  // ========================
  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setMessage(null)

      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      setEmail(user.email || '')

      // Charger les infos depuis la table "profiles"
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Pas encore de profil → on laisse les champs vides
          console.log('Aucun profil trouvé, création possible')
        } else {
          console.error('Erreur lors du chargement du profil:', error)
          setMessage({ text: 'Erreur lors du chargement de ton profil', type: 'error' })
        }
      } else if (profile) {
        setPrenom(profile.prenom || '')
        setNom(profile.nom || '')
        // Formatage de la date pour l'input type="date"
        if (profile.date_naissance) {
          setDateNaissance(profile.date_naissance)
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  // ========================
  // 2. SAUVEGARDER / METTRE À JOUR LE PROFIL
  // ========================
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const profileData = {
      id: user.id,
      prenom: prenom.trim(),
      nom: nom.trim(),
      date_naissance: dateNaissance || null,
      // email n'est pas mis à jour ici car il vient de auth.users
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' }) // upsert = insert ou update
      .select()

    if (error) {
      console.error('Erreur sauvegarde profil:', error)
      setMessage({ 
        text: 'Erreur lors de la sauvegarde. Réessaie.', 
        type: 'error' 
      })
    } else {
      setMessage({ 
        text: '✅ Ton profil a été mis à jour avec succès !', 
        type: 'success' 
      })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white">Chargement de ton profil...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mon Profil</h1>
          <p className="text-white/60">Gère tes informations personnelles</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          {/* Avatar (placeholder pour plus tard) */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#C8A84E] to-[#D4B85C] rounded-2xl flex items-center justify-center text-4xl shadow-lg">
              👤
            </div>
          </div>

          <div className="space-y-6">
            {/* Email (non modifiable) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
              />
              <p className="text-xs text-white/40">Cet email ne peut pas être modifié ici</p>
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

            {/* Boutons */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-2xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement en cours...' : '💾 Enregistrer mes informations'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full text-sm text-white/40 hover:text-[#C8A84E] transition py-2"
            >
              ← Retour au dashboard
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
