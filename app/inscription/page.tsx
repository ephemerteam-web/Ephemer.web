'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

// ✅ Traduction des erreurs Supabase
function getFriendlyAuthError(error: any) {
  if (error?.code === "over_email_send_rate_limit") {
    return "⏳ Un email vient d’être envoyé. Merci d’attendre 30 secondes.";
  }

  if (error?.status === 429) {
    return "⏳ Trop de tentatives. Merci d’attendre un instant.";
  }

  if (error?.message?.includes("already registered")) {
    return "📧 Un compte existe déjà avec cet email.";
  }

  return "❌ Une erreur est survenue. Merci de réessayer.";
}

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const router = useRouter()

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cooldown > 0) return

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error("Erreur Supabase:", error)
      setIsError(true)
      setMessage(getFriendlyAuthError(error))
      startCooldown()
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          prenom,
          nom,
          date_naissance: dateNaissance || null,
        })

      if (profileError) {
        console.error("Erreur profile:", profileError)
        setIsError(true)
        setMessage("❌ Erreur lors de la création du profil.")
        setLoading(false)
        return
      }
    }

    setIsError(false)
    setMessage("✅ Compte créé ! Vérifie ton email pour confirmer.")

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
      <div className="w-full max-w-md relative z-10 px-4">

        {/* HEADER */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-[#C8A84E] transition text-sm mb-6">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-black text-white">Créer un compte</h1>
          <p className="text-white/40 mt-2 text-sm">
            Rejoins Ephemer et ne rate plus aucune date 🎉
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8 backdrop-blur-sm">

          <form onSubmit={handleInscription} className="flex flex-col gap-5">

            {/* NOM / PRENOM */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white/70">Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white/70">Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 transition"
                />
              </div>
            </div>

            {/* DATE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 transition"
              />
            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Adresse email</label>
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 transition"
              />
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Choisis un mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 transition"
              />
              <label className="flex items-center gap-2 mt-1 cursor-pointer text-sm text-white/30 hover:text-white/50 transition">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="accent-[#C8A84E]"
                />
                Afficher le mot de passe
              </label>
            </div>

            {/* BOUTON */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className={`bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-2xl transition-all mt-2 ${
                loading || cooldown > 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] hover:scale-105'
              }`}
            >
              {loading
                ? "Création..."
                : cooldown > 0
                ? `⏳ Attends ${cooldown}s`
                : "✨ Créer mon compte"}
            </button>

          </form>

          {/* MESSAGE */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${
              isError
                ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                : 'bg-green-500/10 text-green-300 border border-green-500/20'
            }`}>
              {message}
            </div>
          )}

          {/* FOOTER */}
          <p className="text-center text-sm text-white/30 mt-6">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="text-[#C8A84E] font-semibold hover:text-white transition">
              Se connecter
            </Link>
          </p>

        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          © 2026 Ephemer — Fait avec 💜
        </p>

      </div>
    </AppLayout>
  )
}
