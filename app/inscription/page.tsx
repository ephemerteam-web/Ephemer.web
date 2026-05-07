'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

// ✅ Fonction pour traduire les erreurs Supabase
function getFriendlyAuthError(error: any) {
  if (error?.code === "over_email_send_rate_limit") {
    return "⏳ Merci de patienter quelques secondes avant de réessayer. Un email a déjà été envoyé.";
  }

  if (error?.status === 429) {
    return "⏳ Trop de tentatives. Merci d’attendre un instant avant de réessayer.";
  }

  if (error?.message?.includes("already registered")) {
    return "📧 Un compte existe déjà avec cette adresse email.";
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

  // ✅ état pour bloquer le bouton
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const router = useRouter()

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ bloque si déjà en cooldown
    if (cooldown > 0) return

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      console.error("Erreur Supabase:", error)

      setIsError(true)
      setMessage(getFriendlyAuthError(error))

      // ✅ lance cooldown même en cas d'erreur
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
        setMessage('❌ Erreur profil : ' + profileError.message)
        setLoading(false)
        return
      }
    }

    setIsError(false)
    setMessage('✅ Compte créé ! Vérifie tes emails pour confirmer.')

    // ✅ cooldown après succès
    startCooldown()

    setLoading(false)
  }

  // ✅ Fonction cooldown 30 secondes
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
      <div className="w-full max-w-md relative z-10 px-4 py-12">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-[#C8A84E] transition text-sm mb-6">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-black text-white">Créer un compte</h1>
          <p className="text-white/40 mt-2 text-sm">Rejoins Ephemer et ne rate plus aucune date importante 🎉</p>
        </div>

        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8 backdrop-blur-sm">

          <form onSubmit={handleInscription} className="flex flex-col gap-5">

            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required className="input" />
              <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="input" />
            </div>

            <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="input" />

            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />

            <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" />

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className={`py-3 rounded-xl font-bold transition ${
                loading || cooldown > 0
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-[#C8A84E] hover:scale-105'
              }`}
            >
              {loading
                ? "Création..."
                : cooldown > 0
                ? `⏳ Attends ${cooldown}s`
                : "✨ Créer mon compte"}
            </button>

          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm ${
              isError ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'
            }`}>
              {message}
            </div>
          )}

          <p className="text-center text-sm text-white/30 mt-6">
            Déjà un compte ? <Link href="/connexion" className="text-[#C8A84E]">Se connecter</Link>
          </p>

        </div>
      </div>
    </AppLayout>
  )
}
