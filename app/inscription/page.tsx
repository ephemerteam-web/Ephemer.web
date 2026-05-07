'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

// ✅ Vérification email simple
const isValidEmail = (email: string) => {
  return /\S+@\S+\.\S+/.test(email)
}

// ✅ Calcul force mot de passe
const getPasswordStrength = (password: string) => {
  let score = 0
  if (password.length >= 6) score++
  if (password.match(/[A-Z]/)) score++
  if (password.match(/[0-9]/)) score++
  if (password.match(/[^A-Za-z0-9]/)) score++
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

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      setIsError(true)
      setMessage("❌ Vérifie les champs du formulaire.")
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
        date_naissance: dateNaissance || null,
      })
    }

    setIsError(false)
    setMessage("✅ Compte créé ! Vérifie ton email.")
    startCooldown()
    setLoading(false)
  }

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

  return (
    <AppLayout className="justify-center">
      <div className="w-full max-w-md px-4">

        <div className="text-center mb-8">
          <Link href="/" className="text-white/40 hover:text-[#C8A84E] text-sm">
            ← Retour
          </Link>
          <h1 className="text-3xl font-black text-white mt-4">Créer un compte</h1>
        </div>

        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8">

          <form onSubmit={handleInscription} className="flex flex-col gap-5">

            {/* NOM / PRENOM */}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="input" />
              <input placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} className="input" />
            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-1">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
              {email && !isValidEmail(email) && (
                <span className="text-red-400 text-xs">Email invalide</span>
              )}
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />

              {/* ✅ Barre de force */}
              <div className="h-2 rounded bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength <= 1
                      ? 'bg-red-500 w-1/4'
                      : passwordStrength === 2
                      ? 'bg-orange-400 w-2/4'
                      : passwordStrength === 3
                      ? 'bg-yellow-400 w-3/4'
                      : 'bg-green-500 w-full'
                  }`}
                />
              </div>

              <span className="text-xs text-white/40">
                {passwordStrength <= 1 && "Mot de passe faible"}
                {passwordStrength === 2 && "Mot de passe moyen"}
                {passwordStrength >= 3 && "Mot de passe fort"}
              </span>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="flex flex-col gap-1">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirme le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
              />
              {confirmPassword && !passwordsMatch && (
                <span className="text-red-400 text-xs">
                  Les mots de passe ne correspondent pas
                </span>
              )}
            </div>

            {/* SHOW PASSWORD */}
            <label className="text-xs text-white/40 flex gap-2">
              <input type="checkbox" onChange={(e) => setShowPassword(e.target.checked)} />
              Afficher le mot de passe
            </label>

            {/* BOUTON */}
            <button
              disabled={!isFormValid || loading || cooldown > 0}
              className="bg-[#C8A84E] text-black py-3 rounded-xl disabled:opacity-40"
            >
              {loading
                ? "Création..."
                : cooldown > 0
                ? `⏳ ${cooldown}s`
                : "Créer mon compte"}
            </button>

          </form>

          {/* MESSAGE GLOBAL */}
          {message && (
            <div className={`mt-4 p-3 rounded ${
              isError ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
            }`}>
              {message}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  )
}
