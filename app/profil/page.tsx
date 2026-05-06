'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

export default function Profil() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    async function loadProfil() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push('/connexion')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      if (data) {
        setPrenom(data.prenom || '')
        setNom(data.nom || '')
        setDateNaissance(data.date_naissance || '')
      }

      setLoading(false)
    }

    loadProfil()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setIsError(false)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user.id,
        prenom,
        nom,
        date_naissance: dateNaissance || null,
      })

    if (error) {
      setIsError(true)
      setMessage('Erreur : ' + error.message)
    } else {
      setMessage('Profil enregistré avec succès !')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <AppLayout className="justify-center">
        <div className="text-center relative z-10">
          <div className="animate-pulse mb-4"><span className="text-6xl">🌙</span></div>
          <p className="text-white/50">Chargement...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout className="justify-center">
      <div className="w-full max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Mon Profil</h1>
        </div>

        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-3xl p-8 backdrop-blur-sm">

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent transition"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium ${
                isError
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : 'bg-green-500/10 text-green-300 border border-green-500/20'
              }`}>
                {isError ? '❌ ' : '✅ '}{message}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-2xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition-all hover:scale-105 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-white/40 hover:text-[#C8A84E] transition text-center mt-2"
            >
              ← Retour au dashboard
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}