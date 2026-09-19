'use client'

import { Button, Input } from '@/components/ui'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return
      setSessionReady(!error && !!data.user)
      if (error || !data.user) {
        setIsError(true)
        setMessage('Lien expiré ou session absente. Demande un nouveau lien depuis la connexion.')
      }
    }).catch(() => {
      if (active) { setIsError(true); setMessage('Impossible de vérifier la session. Réessaie.') }
    })
    return () => { active = false }
  }, [])

  // ✅ Calcul force mot de passe
  const getStrength = () => {
    if (password.length < 6) return 'faible'
    if (password.match(/^(?=.*[A-Z])(?=.*[0-9])/)) return 'fort'
    return 'moyen'
  }

  const handleResetPassword = async () => {
    if (!sessionReady || loading) return
    setLoading(true)
    setMessage('')

    if (password.length < 6) {
      setIsError(true)
      setMessage('Mot de passe trop court')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setIsError(true)
      setMessage('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ ' + error.message)
    } else {
      setIsError(false)
      setMessage('✅ Mot de passe mis à jour')

      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }

    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">

        <div className="w-full max-w-md bg-ink/5 border border-line rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl">

          <h1 className="text-2xl font-semibold mb-6 text-center text-ink">
            🔐 Nouveau mot de passe
          </h1>

          {/* PASSWORD */}
          <div className="relative mb-4">
            <Input
              type={showPassword ? 'text' : 'password'}
              aria-label="Nouveau mot de passe" autoComplete="new-password" placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-12 rounded-xl bg-ink/10 text-ink placeholder-muted border border-line focus:outline-none focus:ring-2 focus:ring-accent"
            />

            {/* 👁 toggle */}
            <button
              type="button"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted"
            >
              👁
            </button>
          </div>

          {/* STRENGTH */}
          {password && (
            <p className="text-sm mb-3 text-muted">
              Sécurité :{' '}
              <span
                className={
                  getStrength() === 'faible'
                    ? 'text-danger'
                    : getStrength() === 'moyen'
                    ? 'text-warning'
                    : 'text-success'
                }
              >
                {getStrength()}
              </span>
            </p>
          )}

          {/* CONFIRM */}
          <Input
            type={showPassword ? 'text' : 'password'}
            aria-label="Confirmer le mot de passe" autoComplete="new-password" placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-ink/10 text-ink placeholder-muted border border-line focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {/* BUTTON */}
          <Button
            onClick={handleResetPassword}
            disabled={loading || !sessionReady}
            className="w-full"
          >
            {loading ? 'Chargement...' : 'Valider'}
          </Button>

          {/* MESSAGE */}
          {message && (
            <p
              className={`mt-4 text-sm text-center ${
                isError ? 'text-danger' : 'text-success'
              }`}
            >
              {message}
            </p>
          )}

        </div>

      </div>
    </AppLayout>
  )
}
