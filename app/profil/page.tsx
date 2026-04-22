'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profil() {
  const router = useRouter()

  // Les infos du profil
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Au chargement de la page, on récupère les infos existantes
  useEffect(() => {
    async function loadProfil() {
      // On vérifie que l'utilisateur est connecté
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push('/connexion')
        return
      }

      // On cherche le profil dans la table profiles
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      // Si un profil existe, on remplit les champs
      if (data) {
        setPrenom(data.prenom || '')
        setNom(data.nom || '')
        setDateNaissance(data.date_naissance || '')
      }

      setLoading(false)
    }

    loadProfil()
  }, [])

  // Quand l'utilisateur clique sur Enregistrer
  async function handleSave() {
    setSaving(true)
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    // On fait un "upsert" : si le profil existe on le met à jour, sinon on le crée
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user.id,  // L'id doit correspondre à l'utilisateur connecté
        prenom,
        nom,
        date_naissance: dateNaissance || null,
      })

    if (error) {
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setMessage('✅ Profil enregistré avec succès !')
    }

    setSaving(false)
  }

  if (loading) return <p className="p-8">Chargement...</p>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Mon Profil</h1>

        {/* Champ Prénom */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prénom
          </label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Champ Nom */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Champ Date de naissance */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de naissance
          </label>
          <input
            type="date"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Message de succès ou erreur */}
        {message && (
          <p className="mb-4 text-sm text-center">{message}</p>
        )}

        {/* Bouton Enregistrer */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        {/* Retour au dashboard */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour au dashboard
        </button>
      </div>
    </div>
  )
}
