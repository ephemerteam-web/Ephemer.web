'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NouveauContact() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [relation, setRelation] = useState('ami')
  const [email, setEmail] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChargement(true)
    setErreur('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/connexion')
      return
    }

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: userData.user.id,
        prenom,
        nom,
        date_naissance: dateNaissance || null,
        relation,
        email: email || null,
      })

    if (error) {
      setErreur('Une erreur est survenue. Réessaie !')
      console.log(error)
    } else {
      router.push('/dashboard')
    }

    setChargement(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">

        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-indigo-400 hover:text-indigo-600 mb-6 flex items-center gap-1"
        >
          ← Retour au dashboard
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          👤 Nouveau contact
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="text-sm font-semibold text-gray-600">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="ex: Marie"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: Dupont"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Date de naissance</label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Type de relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="ami">👫 Ami(e)</option>
              <option value="famille">👨‍👩‍👧 Famille</option>
              <option value="pro">💼 Professionnel</option>
              <option value="autre">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {erreur && (
            <p className="text-red-500 text-sm">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {chargement ? 'Enregistrement...' : '💾 Enregistrer le contact'}
          </button>

        </form>
      </div>
    </main>
  )
}
