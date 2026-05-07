'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email)

const getPasswordStrength = (password: string) => {
  let score = 0
  if (password.length >= 6) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = password === confirmPassword

  const isFormValid =
    prenom &&
    nom &&
    isValidEmail(email) &&
    password.length >= 6 &&
    passwordsMatch

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

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      setIsError(true)
      setMessage("❌ Vérifie les champs")
      return
    }

    if (cooldown > 0) return

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setIsError(true)
      setMessage("❌ " + error.message)
      startCooldown()
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        prenom,
        nom,
        date_naissance: dateNaissance
      })
    }

    setIsError(false)
    setMessage("✅ Compte créé ! Vérifie ton email 📧")
    startCooldown()
    setLoading(false)
  }

  return (
    <AppLayout className="justify-center">
      <div className="w-full max-w-md relative z-10 px-4">

        <div className="text-center mb-8">
          <Link href="/" className="text-white/40 hover:text-[#C8A84E] text-sm">
            ← Retour
          </Link>
          <h1 className="text-3xl font-black text-white mt-4">
            Créer un compte
          </h1>
        </div>

        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8 backdrop-blur-sm">

          <form onSubmit={handleInscription} className="flex flex-col gap-5">

            {/* PRENOM */}
            <div>
              <label className="text-sm text-white/70">Prénom</label>
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full"
              />
            </div>

            {/* NOM */}
            <div>
              <label className="text-sm text-white/70">Nom</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-sm text-white/70">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full"
              />
              {email && !isValidEmail(email) && (
                <span className="text-red-400 text-xs">
                  Email invalide
                </span>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-sm text-white/70">Mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full"
              />

              {/* BARRE FORCE */}
              <div className="h-2 bg-white/10 rounded mt-2">
                <div
                  className={`h-2 rounded ${
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

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="text-sm text-white/70">Confirmer</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full"
              />
              {confirmPassword && !passwordsMatch && (
                <span className="text-red-400 text-xs">
                  Les mots de passe ne correspondent pas
                </span>
              )}
            </div>

            <label className="text-xs text-white/40 flex gap-2">
              <input type="checkbox" onChange={(e) => setShowPassword(e.target.checked)} />
              Afficher le mot de passe
            </label>

            <button
              disabled={!isFormValid || loading || cooldown > 0}
              className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-black py-3 rounded-xl font-bold"
            >
              {loading
                ? "Création..."
                : cooldown > 0
                ? `⏳ ${cooldown}s`
                : "Créer mon compte"}
            </button>

          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${
              isError
                ? 'bg-red-500/10 text-red-300'
                : 'bg-green-500/10 text-green-300'
            }`}>
              {message}
            </div>
          )}

          <p className="text-center text-sm text-white/30 mt-6">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="text-[#C8A84E]">
              Se connecter
            </Link>
          </p>

        </div>
      </div>
    </AppLayout>
  )
}
