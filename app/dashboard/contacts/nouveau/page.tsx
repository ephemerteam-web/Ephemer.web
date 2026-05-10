'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { INDICATIFS_PAYS, TYPES_RELATION, MESSAGES_UI } from '@/lib/constants'

export default function NouveauContact() {
  const router = useRouter()

  // États du formulaire (ajout manuel)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [relation, setRelation] = useState('ami')
  const [email, setEmail] = useState('')
  const [telephoneIndicatif, setTelephoneIndicatif] = useState('+33')
  const [telephoneNumero, setTelephoneNumero] = useState('')
  const [note, setNote] = useState('')
  const [estFavori, setEstFavori] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  // États pour le Contact Picker
  const [isMobile, setIsMobile] = useState(false)
  const [supporteContactPicker, setSupporteContactPicker] = useState(false)
  const [importEnCours, setImportEnCours] = useState(false)

  // Détection mobile + support API (optimisé pour ne pas rerendre inutilement)
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const estMobile = /android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent)
    setIsMobile(estMobile)

    if ('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function') {
      setSupporteContactPicker(true)
    }
  }, [])

  // Fonction améliorée de nettoyage de numéro (plus robuste)
  const nettoyerNumeroTelephone = (tel: string): { indicatif: string; numero: string } => {
    let cleaned = tel.replace(/[^0-9+]/g, '') // Garde seulement chiffres et +

    if (cleaned.startsWith('+33')) {
      return { indicatif: '+33', numero: cleaned.slice(3) }
    }
    if (cleaned.startsWith('33')) {
      return { indicatif: '+33', numero: cleaned.slice(2) }
    }
    if (cleaned.startsWith('0')) {
      return { indicatif: '+33', numero: cleaned.slice(1) }
    }
    return { indicatif: '+33', numero: cleaned }
  }

  const importerDepuisTelephone = async () => {
    setImportEnCours(true)
    setErreur('')

    try {
      const contactsSelectionnes = await (navigator as any).contacts.select(
        ['name', 'email', 'tel'],
        { multiple: true }
      )

      if (!contactsSelectionnes || contactsSelectionnes.length === 0) {
        setErreur("Aucun contact sélectionné.")
        return
      }

      // Pour l'instant on prend le premier contact (simple pour débutant)
      // On pourra passer à un aperçu multiple plus tard si tu valides cette version
      const contact = contactsSelectionnes[0]

      if (contact.name?.[0]) {
        const parties = contact.name[0].trim().split(/\s+/)
        setPrenom(parties[0] || '')
        setNom(parties.slice(1).join(' ') || '')
      }

      if (contact.email?.[0]) {
        setEmail(contact.email[0])
      }

      if (contact.tel?.[0]) {
        const { indicatif, numero } = nettoyerNumeroTelephone(contact.tel[0])
        setTelephoneIndicatif(indicatif)
        setTelephoneNumero(numero)
      }

      const nb = contactsSelectionnes.length
      setErreur(`✅ ${nb} contact${nb > 1 ? 's' : ''} importé${nb > 1 ? 's' : ''} ! Modifie les champs ci-dessous si besoin.`)

    } catch (error: any) {
      console.error('Contact Picker Error:', error)
      if (error.name === 'AbortError') {
        setErreur("Import annulé.")
      } else {
        setErreur("Impossible d'accéder aux contacts. Cette fonctionnalité marche mieux sur Android avec Chrome.")
      }
    } finally {
      setImportEnCours(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChargement(true)
    setErreur('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push('/connexion')
      return
    }

    const { error } = await supabase.from('contacts').insert({
      user_id: userData.user.id,
      prenom: prenom.trim(),
      nom: nom.trim() || null,
      date_naissance: dateNaissance || null,
      relation,
      email: email.trim() || null,
      telephone_indicatif: telephoneNumero ? telephoneIndicatif : null,
      telephone_numero: telephoneNumero || null,
      note: note.trim() || null,
      est_favori: estFavori,
    })

    if (error) {
      setErreur("Une erreur est survenue lors de l'enregistrement.")
      console.error(error)
    } else {
      setErreur('🎉 Contact enregistré avec succès !')
      setTimeout(() => {
        router.push('/dashboard/contacts')
        router.refresh()
      }, 1200)
    }

    setChargement(false)
  }

  return (
    <div className="min-h-screen bg-[#0B1120] pb-12">
      <div className="max-w-lg mx-auto px-4 pt-8"> {/* Optimisé pour mobile : max-w-lg + padding réduit */}

        <h1 className="text-3xl font-bold text-white mb-2">👤 Nouveau contact</h1>
        <p className="text-white/60 mb-8">Ajoute manuellement ou importe depuis ton téléphone</p>

        {/* Bouton Import - Très visible et optimisé mobile */}
        {isMobile && supporteContactPicker && (
          <div className="mb-10">
            <button
              onClick={importerDepuisTelephone}
              disabled={importEnCours}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-5 px-6 rounded-3xl flex items-center justify-center gap-3 text-lg shadow-xl active:scale-[0.985] transition-all disabled:opacity-70"
            >
              {importEnCours ? '📖 Ouverture du carnet...' : '📱 Importer depuis mes contacts'}
            </button>
            <p className="text-center text-xs text-white/50 mt-3 leading-relaxed">
              Le téléphone ouvrira ton carnet d’adresses.<br />
              Choisis un ou plusieurs contacts.
            </p>
          </div>
        )}

        {isMobile && !supporteContactPicker && (
          <div className="mb-8 p-5 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
            <p className="text-amber-400 text-sm">
              ⚠️ L’import automatique n’est pas disponible sur ton navigateur.<br />
              Remplis le formulaire ci-dessous.
            </p>
          </div>
        )}

        {erreur && (
          <div className={`mb-8 p-5 rounded-3xl text-sm border ${
            erreur.includes('✅') || erreur.includes('🎉')
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {erreur}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tous les champs avec espacement optimisé pour le doigt sur mobile */}
          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="Marie"
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Dupont"
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Date de naissance</label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            >
              <option value="ami">👫 Ami(e)</option>
              <option value="famille">👨‍👩‍👧 Famille</option>
              <option value="pro">💼 Professionnel</option>
              <option value="autre">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@email.com"
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Téléphone</label>
            <div className="flex gap-3">
              <select
                value={telephoneIndicatif}
                onChange={(e) => setTelephoneIndicatif(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60 w-28"
              >
                {INDICATIFS_PAYS.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={telephoneNumero}
                onChange={(e) => setTelephoneNumero(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="612345678"
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
              />
            </div>
            <p className="text-xs text-white/40 mt-3">
              Sans le 0 initial (ex : 612345678)
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 block mb-2">Note / À propos</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aime le foot, cuisine italienne, vit à Lyon..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 text-white rounded-3xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60 resize-y"
            />
            <p className="text-xs text-white/40 mt-3">
              💡 Plus tu donnes de détails, meilleures seront les idées de cadeaux.
            </p>
          </div>

          <div
            onClick={() => setEstFavori(!estFavori)}
            className={`flex items-center justify-between p-5 rounded-3xl border cursor-pointer transition-all active:scale-[0.985] ${
              estFavori
                ? 'border-[#C8A84E] bg-[#C8A84E]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div>
              <p className="font-semibold text-white">⭐ Contact favori</p>
              <p className="text-xs text-white/50">Apparaîtra en premier dans ta liste</p>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors relative ${estFavori ? 'bg-[#C8A84E]' : 'bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${estFavori ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
          </div>

          <button
            type="submit"
            disabled={chargement || !prenom.trim()}
            className="w-full mt-6 bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-5 rounded-3xl text-lg active:scale-[0.985] transition-all disabled:opacity-60 shadow-xl"
          >
            {chargement ? 'Enregistrement en cours...' : '💾 Enregistrer le contact'}
          </button>
        </form>
      </div>
    </div>
  )
}
