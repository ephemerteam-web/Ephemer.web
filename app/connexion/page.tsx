'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import { useBrowserValue } from '@/lib/hooks/useBrowserValue'

export default function ConnexionPage() {
  const router = useRouter()
  const callbackFailed = useBrowserValue(() => new URLSearchParams(window.location.search).has('auth_error'), false)

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
      setMessage('❌ ' + error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setIsError(true)
      setMessage("❌ Impossible de récupérer l'utilisateur.")
      setLoading(false)
      return
    }

    const userId = data.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('prenom, nom, date_naissance')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      setIsError(true)
      setMessage('Connexion établie, mais le profil est indisponible. Réessaie.')
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
      setMessage('✅ Complète ton profil')
      setTimeout(() => router.push('/completer-profil'), 800)
      return
    }

    setMessage('✅ Connexion réussie')
    setTimeout(() => router.push('/dashboard'), 800)
  }

  const handleMotDePasseOublie = async () => {
    setMessage('')
    setIsError(false)

    if (!email) {
      setIsError(true)
      setMessage("❌ Entre ton email")
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ ' + error.message)
    } else {
      setMessage('📧 Email envoyé')
    }
  }

  return (
    <AppLayout>
      {callbackFailed && <p role="alert" className="p-4 text-danger">Le lien de connexion a expiré ou est invalide. Reconnecte-toi ou demande un nouveau lien.</p>}
      <div className="min-h-screen flex flex-col justify-center px-4 pb-10">

        <div className="w-full max-w-md mx-auto">

          <div className="bg-ink/5 border border-line rounded-3xl p-6 sm:p-8 backdrop-blur-sm relative">

            {/* RETOUR */}
            <Link
              href="/"
              className="absolute top-4 left-4 text-muted text-lg"
            >
              ←
            </Link>

            {/* HEADER */}
            <div className="text-center mb-8 mt-2">
              <div className="text-4xl mb-2">🌙</div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">
                Bon retour
              </h1>
              <p className="text-muted text-sm mt-2">
                Connecte-toi à ton espace
              </p>
            </div>

            <form onSubmit={handleConnexion} className="flex flex-col gap-5">

              {/* EMAIL */}
              <div>
                <label className="text-sm text-muted">
                  Email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2 w-full bg-canvas text-ink rounded-2xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-sm text-muted">
                  Mot de passe
                </label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-canvas text-ink rounded-2xl px-4 py-4 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-accent"
                  />

                  {/* TOGGLE VISIBILITÉ */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* FORGOT PASSWORD */}
              <button
                type="button"
                onClick={handleMotDePasseOublie}
                className="text-sm text-accent text-right"
              >
                Mot de passe oublié ?
              </button>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-action to-action text-on-action py-4 rounded-2xl text-lg font-bold active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

            </form>

            {/* MESSAGE */}
            {message && (
              <div
                className={`mt-5 p-4 rounded-2xl text-sm ${
                  isError
                    ? 'bg-red-500/10 text-danger border border-red-500/20'
                    : 'bg-green-500/10 text-success border border-green-500/20'
                }`}
              >
                {message}
              </div>
            )}

            {/* SIGNUP */}
            <p className="text-center text-sm text-muted mt-6">
              Pas encore de compte ?{' '}
              <Link href="/inscription" className="text-accent">
                S&apos;inscrire
              </Link>
            </p>

          </div>

          <p className="text-center text-muted text-xs mt-6">
            © 2026 Ephemer
          </p>

        </div>
      </div>
    </AppLayout>
  )
}
