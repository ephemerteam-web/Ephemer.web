'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function ModifierContact() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [relation, setRelation] = useState('ami')
  const [email, setEmail] = useState('')
  const [estFavori, setEstFavori] = useState(false) // 👈 NOUVEAU
  const [chargement, setChargement] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [confirmSupprimer, setConfirmSupprimer] = useState(false)

  useEffect(() => {
    async function chargerContact() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push('/connexion')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', userData.user.id)
        .single()

      if (error || !data) {
        setErreur('Contact introuvable.')
        setChargement(false)
        return
      }

      setPrenom(data.prenom)
      setNom(data.nom || '')
      setDateNaissance(data.date_naissance || '')
      setRelation(data.relation || 'ami')
      setEmail(data.email || '')
      setEstFavori(data.est_favori || false) // 👈 NOUVEAU : on charge la valeur depuis Supabase
      setChargement(false)
    }

    chargerContact()
  }, [contactId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErreur('')

    const { error } = await supabase
      .from('contacts')
      .update({
        prenom,
        nom,
        date_naissance: dateNaissance || null,
        relation,
        email: email || null,
        est_favori: estFavori, // 👈 NOUVEAU : on sauvegarde le favori
      })
      .eq('id', contactId)

    if (error) {
      setErreur('Erreur lors de la sauvegarde. Réessaie !')
      console.log(error)
    } else {
            router.push('/contacts')
            router.refresh()// 👈 MODIFIÉ : on revient sur la liste des contacts
    }

    setSaving(false)
  }

  const handleSupprimer = async () => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      setErreur('Erreur lors de la suppression.')
    } else {
      router.push('/contacts') // 👈 MODIFIÉ : on revient sur la liste des contacts
    router.refresh()}
  }

  if (chargement) return <p className="p-8 text-center text-gray-400">Chargement...</p>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">

        {/* MODIFIÉ : deux boutons de retour */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => router.push('/contacts')}
            className="text-sm text-indigo-400 hover:text-indigo-600 flex items-center gap-1"
          >
            ← Retour aux contacts
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            🏠 Dashboard
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          ✏️ Modifier le contact
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="text-sm font-semibold text-gray-600">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Date de naissance</label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Type de relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="ami">👫 Ami(e)</option>
              <option value="famille">👨‍👩‍👧 Famille</option>
              <option value="pro">💼 Professionnel</option>
              <option value="autre">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* 👇 NOUVEAU : toggle favori */}
          <div
            onClick={() => setEstFavori(!estFavori)}
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
              estFavori
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-700">⭐ Contact favori</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Apparaîtra en priorité dans tes listes
              </p>
            </div>
            {/* Interrupteur visuel (toggle) */}
            <div className={`w-11 h-6 rounded-full transition-colors ${estFavori ? 'bg-yellow-400' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${estFavori ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder les modifications'}
          </button>

        </form>

        <div className="mt-6 border-t border-gray-100 pt-4">
          {!confirmSupprimer ? (
            <button
              onClick={() => setConfirmSupprimer(true)}
              className="w-full py-2 rounded-xl text-sm text-red-400 border border-red-100 hover:bg-red-50 transition"
            >
              🗑️ Supprimer ce contact
            </button>
          ) : (
            <div className="bg-red-50 rounded-xl p-4 flex flex-col gap-2">
              <p className="text-sm text-red-600 font-medium">⚠️ Cette action est irréversible. Confirmer ?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSupprimer}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setConfirmSupprimer(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
