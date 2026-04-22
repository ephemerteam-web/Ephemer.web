'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const router = useRouter()

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()

    // Étape 1 : on crée le compte avec email + mot de passe
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
      return
    }

    // Étape 2 : on sauvegarde le profil dans la table profiles
    // data.user.id est l'identifiant unique créé par Supabase pour cet utilisateur
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,       // on lie le profil à l'utilisateur
          prenom: prenom,
          nom: nom,
          date_naissance: dateNaissance || null,
        })

      if (profileError) {
        setIsError(true)
        setMessage('❌ Erreur profil : ' + profileError.message)
        return
      }
    }

    setIsError(false)
    setMessage('✅ Compte créé ! Vérifie tes emails pour confirmer.')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">Créer un compte</h1>
          <p className="text-gray-500 mt-2">Rejoins Ephemer et ne rate plus aucune date importante 🎉</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleInscription} className="flex flex-col gap-5">

          {/* Prénom */}
<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-700">Prénom</label>
  <input
    type="text"
    placeholder="Marie"
    value={prenom}
    onChange={(e) => setPrenom(e.target.value)}
    required
    className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
  />
</div>

{/* Nom */}
<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-700">Nom</label>
  <input
    type="text"
    placeholder="Dupont"
    value={nom}
    onChange={(e) => setNom(e.target.value)}
    required
    className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
  />
</div>


          {/* Date de naissance */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Date de naissance <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Adresse email</label>
            <input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
            <input
              type="password"
              placeholder="Minimum 6 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Bouton */}
          <button
            type="submit"
            className="bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 transition mt-2"
          >
            Créer mon compte
          </button>

        </form>

        {/* Message succès ou erreur */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${
            isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Lien vers connexion */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <a href="/connexion" className="text-indigo-600 font-semibold hover:underline">
            Se connecter
          </a>
        </p>

      </div>

    </main>
  )
}
