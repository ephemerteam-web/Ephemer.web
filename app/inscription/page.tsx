'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

export default function InscriptionPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const router = useRouter()

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setIsError(true)
      setMessage('❌ Erreur : ' + error.message)
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
        setIsError(true)
        setMessage('❌ Erreur profil : ' + profileError.message)
        return
      }
    }

    setIsError(false)
    setMessage('✅ Compte créé ! Vérifie tes emails pour confirmer.')
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
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white/70">Prénom</label>
                <input
                  type="text"
                  placeholder="Marie"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white/70">Nom</label>
                <input
                  type="text"
                  placeholder="Dupont"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">
                Date de naissance{' '}
                <span className="text-white/30 font-normal">(optionnel)</span>
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Adresse email</label>
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Mot de passe</label>
              <input
                type="password"
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-2xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition-all hover:scale-105 mt-2"
            >
              ✨ Créer mon compte
            </button>

          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${
              isError
                ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                : 'bg-green-500/10 text-green-300 border border-green-500/20'
            }`}>
              {message}
            </div>
          )}

          <p className="text-center text-sm text-white/30 mt-6">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="text-[#C8A84E] font-semibold hover:text-white transition">
              Se connecter
            </Link>
          </p>

        </div>

        <p className="text-center text-white/20 text-xs mt-8">© 2025 Ephemer — Fait avec 💜</p>

      </div>
    </AppLayout>
  )
}