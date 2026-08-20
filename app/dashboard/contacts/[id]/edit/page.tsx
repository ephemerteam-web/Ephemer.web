'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'
import { INDICATIFS_PAYS, TYPES_RELATION, MESSAGES_UI } from '@/lib/constants'


export default function ModifierContact() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string
  const supabase = getSupabaseClient()
  
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
      console.error('Erreur sauvegarde contact:', error)
    } else {
      // Ne pas faire router.refresh() ici car cela cause des appels RPC inutiles
      // La page contacts se rechargera naturellement avec les données fraîches
      router.push('/dashboard/contacts')
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
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-center text-white/50 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-2xl mx-auto w-full min-w-0">

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6">
          ✏️ Modifier le contact
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">

          {/* Prénom */}
          <div className="min-w-0">
            <label htmlFor="prenom" className="block text-sm font-semibold text-white/70">
              Prénom *
            </label>
            <input
              id="prenom"
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              autoComplete="given-name"
              className="mt-1.5 w-full min-w-0 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40"
            />
          </div>

          {/* Nom */}
          <div className="min-w-0">
            <label htmlFor="nom" className="block text-sm font-semibold text-white/70">
              Nom
            </label>
            <input
              id="nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoComplete="family-name"
              className="mt-1.5 w-full min-w-0 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40"
            />
          </div>

          {/* Date de naissance */}
          <div className="min-w-0">
            <label htmlFor="dateNaissance" className="block text-sm font-semibold text-white/70">
              Date de naissance
            </label>
            <input
              id="dateNaissance"
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="mt-1.5 w-full min-w-0 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40"
            />
          </div>

          {/* Relation */}
          <div className="min-w-0">
            <label htmlFor="relation" className="block text-sm font-semibold text-white/70">
              Type de relation
            </label>
            <select
              id="relation"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="mt-1.5 w-full min-w-0 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40"
            >
              {TYPES_RELATION.map((typeRelation) => (
                <option
                  key={typeRelation.value}
                  value={typeRelation.value}
                  className="bg-[#0B1120]"
                >
                  {typeRelation.emoji} {typeRelation.label}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div className="min-w-0">
            <label htmlFor="email" className="block text-sm font-semibold text-white/70">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={MESSAGES_UI.placeholder_email}
              autoComplete="email"
              className="mt-1.5 w-full min-w-0 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40 placeholder:text-white/30"
            />
          </div>

          {/* Téléphone — le point le plus sensible sur mobile */}
          <div className="min-w-0">
            <label className="block text-sm font-semibold text-white/70">
              Téléphone
            </label>
            {/* Sur très petit écran : colonne ; à partir de sm : ligne */}
            <div className="mt-1.5 flex flex-col sm:flex-row gap-2 min-w-0">
              <select
                value={telephoneIndicatif}
                onChange={(e) => setTelephoneIndicatif(e.target.value)}
                aria-label="Indicatif pays"
                className="w-full sm:w-auto sm:max-w-[9.5rem] shrink-0 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40"
              >
                {INDICATIFS_PAYS.map((i) => (
                  <option key={i.code} value={i.code} className="bg-[#0B1120]">
                    {i.pays} ({i.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="numeric"
                value={telephoneNumero}
                onChange={(e) => setTelephoneNumero(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={MESSAGES_UI.placeholder_telephone}
                autoComplete="tel-national"
                className="w-full min-w-0 flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40 placeholder:text-white/30"
              />
            </div>
            <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
              {MESSAGES_UI.info_telephone}
            </p>
          </div>

          {/* Note */}
          <div className="min-w-0">
            <label htmlFor="note" className="block text-sm font-semibold text-white/70">
              Note / À propos de ce contact
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={MESSAGES_UI.placeholder_note}
              rows={4}
              className="mt-1.5 w-full min-w-0 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/40 resize-none placeholder:text-white/30"
            />
            <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
              💡 Plus tu en mets, plus les suggestions de cadeaux seront pertinentes.
            </p>
          </div>

          {/* Favori (toggle) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setEstFavori(!estFavori)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setEstFavori(!estFavori)
              }
            }}
            className={`flex items-center justify-between gap-3 p-4 rounded-xl border cursor-pointer transition select-none ${
              estFavori
                ? 'border-[#C8A84E] bg-[#C8A84E]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">⭐ Contact favori</p>
              <p className="text-xs text-white/40 mt-0.5">Apparaîtra en priorité</p>
            </div>
            <div
              className={`shrink-0 w-11 h-6 rounded-full transition-colors ${
                estFavori ? 'bg-[#C8A84E]' : 'bg-gray-500'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${
                  estFavori ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>

          {erreur && (
            <p className="text-red-400 text-sm break-words">
              {erreur || MESSAGES_UI.erreur_genérique}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </form>

        {/* Suppression */}
        <div className="mt-6 border-t border-white/10 pt-4">
          {!confirmSupprimer ? (
            <button
              type="button"
              onClick={() => setConfirmSupprimer(true)}
              className="w-full py-3 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition active:scale-[0.98]"
            >
              🗑️ Supprimer ce contact
            </button>
          ) : (
            <div className="bg-red-500/10 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm text-red-300 font-medium leading-relaxed">
                ⚠️ Action irréversible. Confirmer ?
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSupprimer}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition active:scale-[0.98]"
                >
                  Oui, supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSupprimer(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium border border-white/10 text-white/70 hover:text-white transition active:scale-[0.98]"
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