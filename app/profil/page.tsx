'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
      <main className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4"><span className="text-6xl">🌙</span></div>
          <p className="text-indigo-200">Chargement...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0118] flex items-center justify-center px-4 relative overflow-hidden">

      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-700 opacity-20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] bg-indigo-600 opacity-20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] bg-pink-600 opacity-10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌙</div>
          <h1 className="text-3xl font-black text-white">Mon Profil</h1>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-900/40 hover:scale-105 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-white/40 hover:text-white/70 transition text-center mt-2"
            >
              ← Retour au dashboard
            </button>
          </div>

        </div>
      </div>
    </main>
  )
}
