'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { INDICATIFS_PAYS, TYPES_RELATION, MESSAGES_UI } from '@/lib/constants'

export default function NouveauContact() {
  const router = useRouter()

  // === États du formulaire ===
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

  // === NOUVEAUX États pour le Contact Picker ===
  const [isMobile, setIsMobile] = useState(false)
  const [supporteContactPicker, setSupporteContactPicker] = useState(false)
  const [importEnCours, setImportEnCours] = useState(false)

  // Détection du mobile + support de l'API Contacts Picker
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const estMobile = /android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent)
    setIsMobile(estMobile)

    // Vérifie si le navigateur supporte l'API Contacts Picker
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      setSupporteContactPicker(true)
    }
  }, [])

  // Fonction principale : Importer les contacts depuis le téléphone
  const importerDepuisTelephone = async () => {
    setImportEnCours(true)
    setErreur('')

    try {
      // Ouvre le sélecteur de contacts du téléphone
      const contactsSelectionnes = await (navigator as any).contacts.select(
        ['name', 'email', 'tel'], 
        { multiple: true }
      )

      if (!contactsSelectionnes || contactsSelectionnes.length === 0) {
        setErreur("Aucun contact n'a été sélectionné.")
        return
      }

      // On prend le premier contact pour l'instant (on pourra améliorer plus tard)
      const contact = contactsSelectionnes[0]

      // Remplissage automatique des champs
      if (contact.name && contact.name.length > 0) {
        const nomComplet = contact.name[0]
        const parties = nomComplet.trim().split(/\s+/)
        setPrenom(parties[0] || '')
        setNom(parties.slice(1).join(' ') || '')
      }

      if (contact.email && contact.email.length > 0) {
        setEmail(contact.email[0])
      }

      if (contact.tel && contact.tel.length > 0) {
        let numero = contact.tel[0]
          .replace(/\s+/g, '')           // Supprime les espaces
          .replace(/\+33/, '')           // Enlève le +33
          .replace(/^0/, '')             // Enlève le 0 du début si présent
          
        setTelephoneNumero(numero)
        
        // On force l'indicatif à +33 si c'est un numéro français
        if (contact.tel[0].includes('+33') || (contact.tel[0].startsWith('0') && numero.length >= 9)) {
          setTelephoneIndicatif('+33')
        }
      }

      setErreur(`✅ ${contactsSelectionnes.length} contact(s) importé(s) avec succès ! Vous pouvez les modifier avant d'enregistrer.`)
      
    } catch (error: any) {
      console.error('Contact Picker Error:', error)
      
      if (error.name === 'AbortError') {
        setErreur("Import annulé. Vous pouvez réessayer.")
      } else {
        setErreur("Impossible d'accéder aux contacts. Cette fonctionnalité marche mieux sur Android Chrome.")
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

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: userData.user.id,
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

    if (error) {
      setErreur('Une erreur est survenue lors de l\'enregistrement. Réessaie !')
      console.error(error)
    } else {
      router.push('/dashboard/contacts')
      router.refresh()
    }

    setChargement(false)
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold text-white mb-6">
          👤 Nouveau contact
        </h1>

        {/* === Bouton Import Contact Picker (visible seulement sur mobile) === */}
        {isMobile && supporteContactPicker && (
          <div className="mb-8">
            <button
              onClick={importerDepuisTelephone}
              disabled={importEnCours}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 
                         text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 
                         transition-all duration-200 shadow-lg disabled:opacity-70 text-base"
            >
              {importEnCours ? '⏳ Ouverture du carnet d\'adresses...' : '📱 Importer depuis mes contacts téléphone'}
            </button>
            <p className="text-center text-xs text-white/50 mt-3">
              Le téléphone va ouvrir votre carnet d'adresses • Vous choisissez qui importer
            </p>
          </div>
        )}

        {isMobile && !supporteContactPicker && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <p className="text-amber-400 text-sm">
              ⚠️ L'import automatique depuis les contacts n'est pas supporté par votre navigateur.<br />
              Utilisez le formulaire ci-dessous.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Ton formulaire existant reste exactement pareil */}
          <div>
            <label className="text-sm font-semibold text-white/70">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="ex: Marie"
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: Dupont"
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

          {erreur && (
            <p className={`text-sm ${erreur.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
          >
            {chargement ? 'Enregistrement en cours...' : '💾 Enregistrer le contact'}
          </button>
        </form>
      </div>
    </div>
  )
}
