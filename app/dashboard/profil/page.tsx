'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

import { INDICATIFS_PAYS, MESSAGES_UI } from '@/lib/constants'

export default function DashboardProfil() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [email, setEmail] = useState('')
  const [telephoneIndicatif, setTelephoneIndicatif] = useState('+33')
  const [telephoneNumero, setTelephoneNumero] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // ========================
  // 1. CHARGER LE PROFIL
  // ========================
  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setMessage(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      setEmail(user.email || '')

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur chargement profil:', error)
        setMessage({ text: MESSAGES_UI.erreur_genérique, type: 'error' })
      } else if (profile) {
        setPrenom(profile.prenom || '')
        setNom(profile.nom || '')
        setTelephoneIndicatif(profile.telephone_indicatif || '+33')
        setTelephoneNumero(profile.telephone_numero || '')
        if (profile.date_naissance) setDateNaissance(profile.date_naissance)
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  // ========================
  // 2. SAUVEGARDER
  // ========================
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        prenom: prenom.trim() || null,
        nom: nom.trim() || null,
        date_naissance: dateNaissance || null,
        telephone_indicatif: telephoneIndicatif,
        telephone_numero: telephoneNumero.trim() || null,
      }, { onConflict: 'id' })

    if (error) {
      setMessage({ text: MESSAGES_UI.erreur_genérique, type: 'error' })
    } else {
      setMessage({ text: '✅ Ton profil a été mis à jour avec succès !', type: 'success' })
    }

    setSaving(false)
  }

  if (loading) {
    return <AppLayout><div className="p-8 text-white">Chargement...</div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mon Profil</h1>
          <p className="text-white/60">Gère tes informations personnelles</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#C8A84E] to-[#D4B85C] rounded-2xl flex items-center justify-center text-5xl">
              👤
            </div>
          </div>

          <div className="space-y-6">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
              />
            </div>

            {/* Prénom */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent"
              />
            </div>

            {/* Nom */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent"
              />
            </div>

            {/* Date de naissance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent"
              />
            </div>

            {/* Téléphone - Version améliorée */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Téléphone</label>
              <div className="flex gap-3">
                <select
                  value={telephoneIndicatif}
                  onChange={(e) => setTelephoneIndicatif(e.target.value)}
                  className="bg-zinc-900 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent appearance-none cursor-pointer min-w-[180px]"
                >
                  {INDICATIFS_PAYS.map((item) => (
                    <option 
                      key={item.code} 
                      value={item.code}
                      className="bg-zinc-900 text-white py-2"
                    >
                      {item.pays}
                    </option>
                  ))}
                </select>

                <input
                  type="tel"
                  value={telephoneNumero}
                  onChange={(e) => setTelephoneNumero(e.target.value)}
                  placeholder={MESSAGES_UI.placeholder_telephone}
                  className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-white/40 mt-1">
                {MESSAGES_UI.info_telephone}
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-2xl text-sm border ${
                message.type === 'success' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-70"
            >
              {saving ? 'Enregistrement...' : '💾 Enregistrer mes informations'}
            </button>

            <button
              disabled
              className="w-full py-3 text-red-400/60 text-sm border border-red-500/20 rounded-2xl cursor-not-allowed"
            >
              🗑️ Supprimer mon compte (bientôt disponible)
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
