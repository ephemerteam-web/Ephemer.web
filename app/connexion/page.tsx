'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

export default function ConnexionPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConnexion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setMessage('')
    setIsError(false)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setIsError(true)
      setMessage("❌ Impossible de récupérer l'utilisateur connecté.")
      setLoading(false)
      return
    }

    const userId = data.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, prenom, nom, date_naissance')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      setIsError(true)
      setMessage('❌ Connexion réussie, mais impossible de lire le profil : ' + profileError.message)
      setLoading(false)
      return
    }

    const profilIncomplet =
      !profile ||
      !profile.prenom ||
      !profile.nom ||
      !profile.date_naissance

    setIsError(false)

    if (profilIncomplet) {
      setMessage('✅ Connexion réussie ! Complète ton profil.')
      setTimeout(() => {
        router.push('/completer-profil')
      }, 800)
      return
    }

    setMessage('✅ Connexion réussie ! Redirection...')
    setTimeout(() => {
      router.push('/dashboard')
    }, 800)
  }

  const handleMotDePasseOublie = async () => {
    setMessage('')
    setIsError(false)

    if (!email) {
      setIsError(true)
      setMessage("❌ Entre d'abord ton adresse email.")
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md relative">

          {/* CARTE */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative">

            {/* FLECHE RETOUR */}
            <Link
              href="/"
              className="absolute top-5 left-5 text-white/40 hover:text-white transition text-sm"
            >
              ←
            </Link>

            {/* HEADER */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🌙</div>
              <h1 className="text-3xl font-black text-white">Bon retour !</h1>
              <p className="text-white/40 mt-2 text-sm">
                Connecte-toi pour retrouver tes événements
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleConnexion} className="flex flex-col gap-5">

              {/* EMAIL */}
              <div>
                <label className="text-sm text-white/70">
                  Adresse email
                </label>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-white text-black border border-white/20 rounded-xl px-4 py-3 w-full placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-sm text-white/70">
                  Mot de passe
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ton mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 bg-white text-black border border-white/20 rounded-xl px-4 py-3 w-full placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
                />
              </div>

              {/* SHOW PASSWORD */}
              <label className="text-xs text-white/60 flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                Afficher le mot de passe
              </label>

              {/* FORGOT PASSWORD */}
              <button
                type="button"
                onClick={handleMotDePasseOublie}
                className="text-sm text-[#C8A84E] hover:underline text-right"
              >
                Mot de passe oublié ?
              </button>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-black py-3 rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                {loading ? 'Connexion...' : 'Me connecter'}
              </button>

            </form>

            {/* MESSAGE */}
            {message && (
              <div
                className={`mt-4 p-3 rounded-xl text-sm ${
                  isError
                    ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                    : 'bg-green-500/10 text-green-300 border border-green-500/20'
                }`}
              >
                {message}
              </div>
            )}

            {/* SIGNUP LINK */}
            <p className="text-center text-sm text-white/40 mt-6">
              Pas encore de compte ?{' '}
              <Link href="/inscription" className="text-[#C8A84E] hover:underline">
                S'inscrire
              </Link>
            </p>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
