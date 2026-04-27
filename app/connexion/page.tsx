'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConnexionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()

  const handleConnexion = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setIsError(false)
      setMessage('✅ Connexion réussie ! Redirection...')
      setTimeout(() => router.push('/dashboard'), 1000)
    }
  }

  const handleMotDePasseOublie = async () => {
    if (!email) {
      setIsError(true)
      setMessage('❌ Entre d\'abord ton adresse email ci-dessus.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
    } else {
      setIsError(false)
      setMessage('📧 Email envoyé ! Vérifie ta boîte mail.')
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0118] flex items-center justify-center px-4 relative overflow-hidden">

      {/* BOULES LUMINEUSES */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-700 opacity-20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] bg-indigo-600 opacity-20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] bg-pink-600 opacity-10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* LOGO */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition text-sm mb-6">
            ← Retour à l'accueil
          </a>
          <div className="text-5xl mb-3">🌙</div>
          <h1 className="text-3xl font-black text-white">Bon retour !</h1>
          <p className="text-white/40 mt-2 text-sm">Connecte-toi pour voir tes événements du jour</p>
        </div>

        {/* CARTE FORMULAIRE */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">

          <form onSubmit={handleConnexion} className="flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">
                Adresse email
              </label>
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">
                Mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ton mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <label className="flex items-center gap-2 mt-1 cursor-pointer text-sm text-white/30 hover:text-white/50 transition">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="accent-purple-500"
                />
                Afficher le mot de passe
              </label>
            </div>

            {/* Mot de passe oublié */}
            <button
              type="button"
              onClick={handleMotDePasseOublie}
              className="text-sm text-purple-400 hover:text-pink-400 transition text-right -mt-2"
            >
              Mot de passe oublié ?
            </button>

            {/* Bouton connexion */}
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-900/40 hover:scale-105 mt-2"
            >
              Me connecter →
            </button>

          </form>

          {/* Message succès ou erreur */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${
              isError
                ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                : 'bg-green-500/10 text-green-300 border border-green-500/20'
            }`}>
              {message}
            </div>
          )}

          {/* Lien inscription */}
          <p className="text-center text-sm text-white/30 mt-6">
            Pas encore de compte ?{' '}
            <a href="/inscription" className="text-purple-400 font-semibold hover:text-pink-400 transition">
              S'inscrire
            </a>
          </p>

        </div>

        <p className="text-center text-white/20 text-xs mt-8">© 2025 Ephemer — Fait avec 💜</p>

      </div>
    </main>
  )
}
