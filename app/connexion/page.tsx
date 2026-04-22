'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConnexionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false) // afficher/masquer le mot de passe

  const router = useRouter()

  const handleConnexion = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setIsError(false)
      setMessage('✅ Connexion réussie ! Redirection...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  }

  // Fonction déclenchée quand on clique sur "Mot de passe oublié"
  const handleMotDePasseOublie = async () => {
    if (!email) {
      setIsError(true)
      setMessage('❌ Entre d\'abord ton adresse email ci-dessus.')
      return
    }

    // Supabase envoie un email avec un lien pour réinitialiser le mot de passe
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setIsError(false)
      setMessage('📧 Email envoyé ! Vérifie ta boîte mail pour réinitialiser ton mot de passe.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">Bon retour ! 👋</h1>
          <p className="text-gray-500 mt-2">Connecte-toi pour voir tes événements du jour</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleConnexion} className="flex flex-col gap-5">

          {/* Champ Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Adresse email
            </label>
            <input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Champ Mot de passe */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Mot de passe
            </label>
            <input
              // Si showPassword est true, on affiche le texte, sinon on masque
              type={showPassword ? 'text' : 'password'}
              placeholder="Ton mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />

            {/* Case à cocher pour afficher/masquer */}
            <label className="flex items-center gap-2 mt-1 cursor-pointer text-sm text-gray-500">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="accent-indigo-600"
              />
              Afficher le mot de passe
            </label>
          </div>

          {/* Lien mot de passe oublié */}
          <button
            type="button" // "button" pour ne pas soumettre le formulaire
            onClick={handleMotDePasseOublie}
            className="text-sm text-indigo-500 hover:underline text-right -mt-2"
          >
            Mot de passe oublié ?
          </button>

          {/* Bouton connexion */}
          <button
            type="submit"
            className="bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 transition mt-2"
          >
            Me connecter
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

        {/* Liens du bas */}
        <div className="text-center text-sm text-gray-500 mt-6 flex flex-col gap-2">
          <p>
            Pas encore de compte ?{' '}
            <a href="/inscription" className="text-indigo-600 font-semibold hover:underline">
              S'inscrire
            </a>
          </p>
          <a href="/" className="text-gray-400 hover:text-indigo-500 hover:underline transition">
            ← Retour à l'accueil
          </a>
        </div>

      </div>

    </main>
  )
}
