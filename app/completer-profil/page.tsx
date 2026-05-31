'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

export default function CompleterProfilPage() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const [loadingPage, setLoadingPage] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        router.push('/connexion')
        return
      }

      setUserId(data.user.id)
      setEmail(data.user.email ?? '')
      setLoadingPage(false)
    }

    checkUser()
  }, [router])

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!userId) {
      setMessage("Utilisateur introuvable. Reconnecte-toi.")
      setIsError(true)
      return
    }

    if (!prenom || !nom || !dateNaissance) {
      setMessage("Merci de remplir tous les champs.")
      setIsError(true)
      return
    }

    setSaving(true)
    setMessage('')
    setIsError(false)

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        prenom,
        nom,
        date_naissance: dateNaissance,
        email,
      })

    if (error) {
      setMessage("Le profil n'a pas pu être enregistré : " + error.message)
      setIsError(true)
      setSaving(false)
      return
    }

    setMessage('Profil enregistré avec succès ✅')
    setIsError(false)

    setTimeout(() => {
      router.push('/dashboard')
    }, 800)

    setSaving(false)
  }

  if (loadingPage) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center text-white">
          Chargement...
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">

          <h1 className="text-3xl font-bold mb-2">
            Compléter mon profil
          </h1>

          <p className="text-white/50 mb-8">
            Ces informations permettront de personnaliser ton expérience sur Ephemer.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-5">

            <div>
              <label className="text-sm text-white/70">
                Prénom
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="mt-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full outline-none focus:border-[#C8A84E]"
                placeholder="Ex : Marie"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">
                Nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="mt-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full outline-none focus:border-[#C8A84E]"
                placeholder="Ex : Dupont"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">
                Date de naissance
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="mt-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white w-full outline-none focus:border-[#C8A84E]"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/50 w-full cursor-not-allowed"
              />
            </div>

            <button
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-black py-3 rounded-xl font-bold transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
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

        </div>
      </div>
    </AppLayout>
  )
}
