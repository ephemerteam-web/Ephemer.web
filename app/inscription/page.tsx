'use client'

import { useState, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StarryBackground from '@/components/StarryBackground'

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email)
const supabase = getSupabaseClient()
  
const getPasswordStrength = (password: string) => {
  let score = 0
  if (password.length >= 6) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export default function InscriptionPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = password === confirmPassword

  const isFormValid =
    isValidEmail(email) && password.length >= 6 && passwordsMatch

  const startCooldown = () => {
    setCooldown(30)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const getErrorMessage = (errorMessage: string) => {
    const lowerMessage = errorMessage.toLowerCase()
    if (lowerMessage.includes('rate limit')) {
      return "⏳ Trop de tentatives. Attends 30 à 60 secondes avant de réessayer."
    }
    if (
      lowerMessage.includes('already registered') ||
      lowerMessage.includes('already been registered')
    ) {
      return "❌ Cet email est déjà utilisé. Essaie de te connecter."
    }
    return `❌ ${errorMessage}`
  }

  const handleInscription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')
    setIsError(false)

    if (!isFormValid) {
      setIsError(true)
      setMessage('❌ Merci de saisir un email valide et deux mots de passe identiques.')
      return
    }

    if (cooldown > 0) return

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setIsError(true)
      setMessage(getErrorMessage(error.message))
      startCooldown()
      setLoading(false)
      return
    }

    if (!data.user) {
      setIsError(true)
      setMessage("❌ Le compte n'a pas pu être créé. Réessaie.")
      setLoading(false)
      return
    }

    setIsError(false)
    setMessage('✅ Compte créé ! Vérifie ton email 📧 puis connecte-toi.')

    setEmail('')
    setPassword('')
    setConfirmPassword('')

    startCooldown()
    setLoading(false)
  }

  return (
    <StarryBackground>
      {/* HEADER avec logo */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <svg
            className="w-8 h-8 text-[#C8A84E] transition-transform duration-300 group-hover:rotate-12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="currentColor"
              className="text-[#1B2A4A]"
            />
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="15" cy="9" r="1" fill="currentColor" />
          </svg>
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-white">Ephemer</span>
            <span className="text-white/40 font-light">
              <span className="text-[#C8A84E]">.</span>name
            </span>
          </span>
        </Link>
      </nav>

      {/* CONTENU CENTRÉ */}
      <div className="flex-1 flex items-center justify-center w-full px-4 py-8 z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8 backdrop-blur-sm relative">

            {/* FLÈCHE RETOUR */}
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Revenir à la page précédente"
              className="absolute top-5 left-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#C8A84E]/30 bg-black/30 text-[#C8A84E] backdrop-blur-sm transition hover:bg-[#C8A84E] hover:text-black"
            >
              ←
            </button>

            <div className="text-center mb-8 pt-6">
              <h1 className="text-3xl font-black text-white">Créer un compte</h1>
              <p className="text-white/40 text-sm mt-2">
                Rejoins Ephemer.name et ne rate plus aucune date importante.
              </p>
            </div>

            <form onSubmit={handleInscription} className="flex flex-col gap-5">
              {/* EMAIL */}
              <div>
                <label className="text-sm text-white/70">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="mt-1 bg-white text-black border border-white/20 rounded-xl px-4 py-3 w-full placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
                />
                {email && !isValidEmail(email) && (
                  <span className="text-red-400 text-xs">Email invalide</span>
                )}
              </div>

              {/* MOT DE PASSE */}
              <div>
                <label className="text-sm text-white/70">Mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="mt-1 bg-white text-black border border-white/20 rounded-xl px-4 py-3 w-full placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
                />
                <div className="h-2 bg-white/10 rounded mt-2 overflow-hidden">
                  <div
                    className={`h-2 rounded transition-all ${
                      passwordStrength <= 1
                        ? 'bg-red-500 w-1/4'
                        : passwordStrength === 2
                        ? 'bg-yellow-500 w-2/4'
                        : passwordStrength === 3
                        ? 'bg-blue-500 w-3/4'
                        : 'bg-green-500 w-full'
                    }`}
                  />
                </div>
              </div>

              {/* CONFIRMATION */}
              <div>
                <label className="text-sm text-white/70">Confirmer le mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retape ton mot de passe"
                  className="mt-1 bg-white text-black border border-white/20 rounded-xl px-4 py-3 w-full placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
                />
                {confirmPassword && !passwordsMatch && (
                  <span className="text-red-400 text-xs">
                    Les mots de passe ne correspondent pas.
                  </span>
                )}
              </div>

              <label className="text-xs text-white/60 flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                Afficher le mot de passe
              </label>

              <button
                disabled={!isFormValid || loading || cooldown > 0}
                className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-black py-3 rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                {loading
                  ? 'Création...'
                  : cooldown > 0
                  ? `⏳ Réessaie dans ${cooldown}s`
                  : 'Créer mon compte'}
              </button>
            </form>

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

            <p className="text-center text-sm text-white/40 mt-6">
              Déjà un compte ?{' '}
              <Link href="/connexion" className="text-[#C8A84E] hover:underline">
                Se connecter
              </Link>
            </p>

          </div>
        </div>
      </div>
    </StarryBackground>
  )
}
