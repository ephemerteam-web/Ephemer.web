'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { INDICATIFS_PAYS } from '@/lib/constants'

type ContactTelephone = {
  id: string
  nomComplet: string
  prenom: string
  nom: string
  email: string
  telephoneIndicatif: string | null
  telephoneNumero: string | null
  selectionne: boolean
}

export default function NouveauContact() {
  const router = useRouter()

  // États du formulaire manuel
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

  // États pour l’import téléphone
  const [isMobile, setIsMobile] = useState(false)
  const [supporteContactPicker, setSupporteContactPicker] = useState(false)
  const [importEnCours, setImportEnCours] = useState(false)
  const [contactsTelephone, setContactsTelephone] = useState<ContactTelephone[]>([])

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const estMobile = /android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent)

    setIsMobile(estMobile)

    if ('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function') {
      setSupporteContactPicker(true)
    }
  }, [])

  const nettoyerNumeroTelephone = (tel: string): { indicatif: string; numero: string } => {
    let cleaned = tel.replace(/[^0-9+]/g, '')

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

  const separerPrenomNom = (nomComplet: string): { prenom: string; nom: string } => {
    const parties = nomComplet.trim().split(/\s+/)

    return {
      prenom: parties[0] || '',
      nom: parties.slice(1).join(' ') || '',
    }
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
        setErreur('Aucun contact sélectionné.')
        return
      }

      const contactsFormates: ContactTelephone[] = contactsSelectionnes.map(
        (contact: any, index: number) => {
          const nomComplet = contact.name?.[0] || ''
          const noms = separerPrenomNom(nomComplet)

          const emailContact = contact.email?.[0] || ''
          const telephoneBrut = contact.tel?.[0] || ''
          const telephoneNettoye = telephoneBrut
            ? nettoyerNumeroTelephone(telephoneBrut)
            : null

          return {
            id: `${Date.now()}-${index}`,
            nomComplet,
            prenom: noms.prenom,
            nom: noms.nom,
            email: emailContact,
            telephoneIndicatif: telephoneNettoye?.indicatif || null,
            telephoneNumero: telephoneNettoye?.numero || null,
            selectionne: true,
          }
        }
      )

      setContactsTelephone(contactsFormates)

      setErreur(
        `✅ ${contactsFormates.length} contact${
          contactsFormates.length > 1 ? 's' : ''
        } prêt${contactsFormates.length > 1 ? 's' : ''} à importer. Vérifie la liste ci-dessous.`
      )
    } catch (error: any) {
      console.error('Contact Picker Error:', error)

      if (error.name === 'AbortError') {
        setErreur('Import annulé.')
      } else {
        setErreur(
          "Impossible d'accéder aux contacts. Cette fonctionnalité marche mieux sur Android avec Chrome."
        )
      }
    } finally {
      setImportEnCours(false)
    }
  }

  const changerSelectionContact = (id: string) => {
    setContactsTelephone((contactsActuels) =>
      contactsActuels.map((contact) =>
        contact.id === id
          ? { ...contact, selectionne: !contact.selectionne }
          : contact
      )
    )
  }

  const importerContactsSelectionnes = async () => {
    setImportEnCours(true)
    setErreur('')

    try {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push('/connexion')
        return
      }

      const contactsSelectionnes = contactsTelephone.filter(
        (contact) => contact.selectionne
      )

      if (contactsSelectionnes.length === 0) {
        setErreur('Sélectionne au moins un contact à importer.')
        return
      }

      const contactsPourSupabase = contactsSelectionnes.map((contact) => ({
        user_id: userData.user.id,
        prenom: contact.prenom || 'Sans prénom',
        nom: contact.nom || null,
        date_naissance: null,
        relation: 'ami',
        email: contact.email || null,
        telephone_indicatif: contact.telephoneNumero
          ? contact.telephoneIndicatif
          : null,
        telephone_numero: contact.telephoneNumero || null,
        note: null,
        est_favori: false,
      }))

      const { error } = await supabase.from('contacts').insert(contactsPourSupabase)

      if (error) {
        console.error(error)
        setErreur("Une erreur est survenue pendant l'import des contacts.")
        return
      }

      setErreur(
        `🎉 ${contactsSelectionnes.length} contact${
          contactsSelectionnes.length > 1 ? 's ont' : ' a'
        } bien été importé${contactsSelectionnes.length > 1 ? 's' : ''} !`
      )

      setContactsTelephone([])
      router.refresh()
    } catch (error) {
      console.error(error)
      setErreur("Une erreur inattendue est survenue pendant l'import.")
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

      setPrenom('')
      setNom('')
      setDateNaissance('')
      setRelation('ami')
      setEmail('')
      setTelephoneIndicatif('+33')
      setTelephoneNumero('')
      setNote('')
      setEstFavori(false)

      router.refresh()
    }

    setChargement(false)
  }

  return (
    <div className="min-h-screen bg-[#0B1120] pb-12">
      <div className="mx-auto max-w-lg px-4 pt-8">
        <h1 className="mb-2 text-3xl font-bold text-white">👤 Nouveau contact</h1>

        <p className="mb-8 text-white/60">
          Ajoute manuellement ou importe depuis ton téléphone
        </p>

        {isMobile && supporteContactPicker && (
          <div className="mb-8">
            <button
              type="button"
              onClick={importerDepuisTelephone}
              disabled={importEnCours}
              className="flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-lg font-semibold text-white shadow-xl transition-all active:scale-[0.985] disabled:opacity-70"
            >
              {importEnCours
                ? '📖 Ouverture du carnet...'
                : '📱 Importer depuis mes contacts'}
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-white/50">
              Le téléphone ouvrira ton carnet d’adresses.
              <br />
              Choisis un ou plusieurs contacts.
            </p>
          </div>
        )}

        {isMobile && !supporteContactPicker && (
          <div className="mb-8 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm text-amber-400">
              ⚠️ L’import automatique n’est pas disponible sur ton navigateur.
              <br />
              Remplis le formulaire ci-dessous.
            </p>
          </div>
        )}

        {erreur && (
          <div
            className={`mb-8 rounded-3xl border p-5 text-sm ${
              erreur.includes('✅') || erreur.includes('🎉')
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {erreur}
          </div>
        )}

        {contactsTelephone.length > 0 && (
          <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Contacts à importer
                </h2>
                <p className="text-sm text-white/50">
                  Décoche les contacts que tu ne veux pas enregistrer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setContactsTelephone([])}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 active:scale-95"
              >
                Vider
              </button>
            </div>

            <div className="space-y-3">
              {contactsTelephone.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex gap-3 rounded-2xl border p-4 transition-all active:scale-[0.99] ${
                    contact.selectionne
                      ? 'border-[#C8A84E]/50 bg-[#C8A84E]/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={contact.selectionne}
                    onChange={() => changerSelectionContact(contact.id)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#C8A84E]"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">
                      {contact.nomComplet || 'Contact sans nom'}
                    </p>

                    <div className="mt-1 space-y-1 text-sm text-white/55">
                      {contact.telephoneNumero && (
                        <p className="truncate">
                          📞 {contact.telephoneIndicatif}{' '}
                          {contact.telephoneNumero}
                        </p>
                      )}

                      {contact.email && (
                        <p className="truncate">✉️ {contact.email}</p>
                      )}

                      {!contact.telephoneNumero && !contact.email && (
                        <p className="text-amber-300">
                          Aucun téléphone ou email détecté
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={importerContactsSelectionnes}
              disabled={
                importEnCours ||
                contactsTelephone.filter((contact) => contact.selectionne)
                  .length === 0
              }
              className="mt-5 w-full rounded-3xl bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] px-4 py-5 text-lg font-bold text-[#0B1120] shadow-xl transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importEnCours
                ? 'Import en cours...'
                : `Importer ${
                    contactsTelephone.filter((contact) => contact.selectionne)
                      .length
                  } contact(s) sélectionné(s)`}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Prénom *
            </label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="Marie"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Nom
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Dupont"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Date de naissance
            </label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Relation
            </label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            >
              <option value="ami">👫 Ami(e)</option>
              <option value="famille">👨‍👩‍👧 Famille</option>
              <option value="pro">💼 Professionnel</option>
              <option value="autre">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@email.com"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Téléphone
            </label>

            <div className="flex gap-3">
              <select
                value={telephoneIndicatif}
                onChange={(e) => setTelephoneIndicatif(e.target.value)}
                className="w-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
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
                onChange={(e) =>
                  setTelephoneNumero(e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="612345678"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
              />
            </div>

            <p className="mt-3 text-xs text-white/40">
              Sans le 0 initial, ex : 612345678.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">
              Note / À propos
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aime le foot, cuisine italienne, vit à Lyon..."
              rows={4}
              className="w-full resize-y rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/60"
            />

            <p className="mt-3 text-xs text-white/40">
              💡 Plus tu donnes de détails, meilleures seront les idées de
              cadeaux.
            </p>
          </div>

          <div
            onClick={() => setEstFavori(!estFavori)}
            className={`flex cursor-pointer items-center justify-between rounded-3xl border p-5 transition-all active:scale-[0.985] ${
              estFavori
                ? 'border-[#C8A84E] bg-[#C8A84E]/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div>
              <p className="font-semibold text-white">⭐ Contact favori</p>
              <p className="text-xs text-white/50">
                Apparaîtra en premier dans ta liste
              </p>
            </div>

            <div
              className={`relative h-7 w-12 rounded-full transition-colors ${
                estFavori ? 'bg-[#C8A84E]' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  estFavori ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={chargement || !prenom.trim()}
            className="mt-6 w-full rounded-3xl bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] py-5 text-lg font-bold text-[#0B1120] shadow-xl transition-all active:scale-[0.985] disabled:opacity-60"
          >
            {chargement ? 'Enregistrement en cours...' : '💾 Enregistrer le contact'}
          </button>
        </form>
      </div>
    </div>
  )
}
