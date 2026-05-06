'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { INDICATIFS_PAYS, TYPES_RELATION, MESSAGES_UI } from '@/lib/constants'


export default function ModifierContact() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [relation, setRelation] = useState('ami')
  const [email, setEmail] = useState('')
  const [telephoneIndicatif, setTelephoneIndicatif] = useState('+33')
  const [telephoneNumero, setTelephoneNumero] = useState('')
  const [note, setNote] = useState('')
  const [estFavori, setEstFavori] = useState(false)
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
      setTelephoneIndicatif(data.telephone_indicatif || '+33')
      setTelephoneNumero(data.telephone_numero || '')
      setNote(data.note || '')
      setEstFavori(data.est_favori || false)

      setChargement(false)
    }

    chargerContact()
  }, [contactId, router])

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
        telephone_indicatif: telephoneNumero ? telephoneIndicatif : null,
        telephone_numero: telephoneNumero || null,
        note: note || null,
        est_favori: estFavori,
      })
      .eq('id', contactId)

    if (error) {
      setErreur('Erreur lors de la sauvegarde. Réessaie !')
      console.log(error)
    } else {
      router.push('/dashboard/contacts')
      router.refresh()
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
      router.push('/dashboard/contacts')
      router.refresh()
    }
  }

  if (chargement) {
    return <p className="p-8 text-center text-white/50">Chargement...</p>
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold text-white mb-6">
          ✏️ Modifier le contact
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="text-sm font-semibold text-white/70">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">Date de naissance</label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">Type de relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
            >
              <option value="ami" className="bg-[#0B1120]">👫 Ami(e)</option>
              <option value="famille" className="bg-[#0B1120]">👨‍👩‍👧 Famille</option>
              <option value="pro" className="bg-[#0B1120]">💼 Professionnel</option>
              <option value="autre" className="bg-[#0B1120]">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">Téléphone</label>
            <div className="mt-1 flex gap-2">
              <select
                value={telephoneIndicatif}
                onChange={(e) => setTelephoneIndicatif(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
              >
                {INDICATIFS_PAYS.map((i) => (
                  <option key={i.code} value={i.code} className="bg-[#0B1120]">
                    {i.pays} ({i.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={telephoneNumero}
                onChange={(e) => setTelephoneNumero(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="612345678"
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
              />
            </div>
            <p className="text-xs text-white/40 mt-1">
              Sans le 0 du début (ex : 612345678 pour 06 12 34 56 78)
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">
              Note / À propos de ce contact
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : aime le foot, fan de cuisine italienne, vit à Paris, deux enfants..."
              rows={4}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 resize-none"
            />
            <p className="text-xs text-white/40 mt-1">
              💡 Plus tu en mets, plus les suggestions de cadeaux seront pertinentes.
            </p>
          </div>

          <div
            onClick={() => setEstFavori(!estFavori)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
              estFavori
                ? 'border-[#C8A84E] bg-[#C8A84E]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-white">⭐ Contact favori</p>
              <p className="text-xs text-white/40 mt-0.5">Apparaîtra en priorité</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${estFavori ? 'bg-[#C8A84E]' : 'bg-gray-500'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${estFavori ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {erreur && <p className="text-red-400 text-sm">{erreur || MESSAGES_UI.erreur_genérique}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>

        </form>

        <div className="mt-6 border-t border-white/10 pt-4">
          {!confirmSupprimer ? (
            <button
              onClick={() => setConfirmSupprimer(true)}
              className="w-full py-2 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
            >
              🗑️ Supprimer ce contact
            </button>
          ) : (
            <div className="bg-red-500/10 rounded-xl p-4 flex flex-col gap-2">
              <p className="text-sm text-red-300 font-medium">⚠️ Action irréversible. Confirmer ?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSupprimer}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setConfirmSupprimer(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}