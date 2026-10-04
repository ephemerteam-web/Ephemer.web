'use client'

import { duplicateReason } from '@/lib/contact-quality'
import { readOwnRows } from '@/lib/user-data'
import { useState } from 'react'
import { useBrowserValue } from '@/lib/hooks/useBrowserValue'
type PickedContact = { name?: string[]; email?: string[]; tel?: string[] }
type ContactNavigator = Navigator & { contacts?: { select: (fields: string[], options: { multiple: boolean }) => Promise<PickedContact[]> } }
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { INDICATIFS_PAYS } from '@/lib/constants'

type ContactTelephone = {
  id: string
  nomComplet: string
  prenom: string
  nom: string
  dateNaissance: string
  relation: string
  email: string
  telephoneIndicatif: string
  telephoneNumero: string
  note: string
  estFavori: boolean
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
  const [contactEnEdition, setContactEnEdition] = useState<ContactTelephone | null>(null)


  // États pour l’import téléphone
  const isMobile = useBrowserValue(() => /android|iphone|ipad|ipod|blackberry|windows phone/i.test(navigator.userAgent), false)
  const supporteContactPicker = useBrowserValue(() => typeof (navigator as ContactNavigator).contacts?.select === 'function', false)
  const [importEnCours, setImportEnCours] = useState(false)
  const [contactsTelephone, setContactsTelephone] = useState<ContactTelephone[]>([])


  const nettoyerNumeroTelephone = (tel: string): { indicatif: string; numero: string } => {
    const cleaned = tel.replace(/[^0-9+]/g, '')

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
      const picker = (navigator as ContactNavigator).contacts
      if (!picker) throw new Error('Import non disponible')
      const contactsSelectionnes = await picker.select(
        ['name', 'email', 'tel'],
        { multiple: true }
      )

      if (!contactsSelectionnes || contactsSelectionnes.length === 0) {
        setErreur('Aucun contact sélectionné.')
        return
      }

      const contactsFormates: ContactTelephone[] = contactsSelectionnes.map(
        (contact: PickedContact, index: number) => {
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
  dateNaissance: '',
  relation: 'ami',
  email: emailContact,
  telephoneIndicatif: telephoneNettoye?.indicatif || '+33',
  telephoneNumero: telephoneNettoye?.numero || '',
  note: '',
  estFavori: false,
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
    } catch (error: unknown) {
      console.error('Contact Picker Error:', error)

      if (error instanceof Error && error.name === 'AbortError') {
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
const sauvegarderContactEdite = () => {
  if (!contactEnEdition) return

  setContactsTelephone((contactsActuels) =>
    contactsActuels.map((contact) =>
      contact.id === contactEnEdition.id ? contactEnEdition : contact
    )
  )

  setContactEnEdition(null)
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
  date_naissance: contact.dateNaissance || null,
  relation: contact.relation || 'ami',
  email: contact.email || null,
  telephone_indicatif: contact.telephoneNumero
    ? contact.telephoneIndicatif
    : null,
  telephone_numero: contact.telephoneNumero || null,
  note: contact.note || null,
  est_favori: contact.estFavori,
}))


      const existing = await readOwnRows('contacts', userData.user.id)
      const warnings: string[] = []
      for (let i = 0; i < contactsPourSupabase.length; i++) {
        const candidate = contactsPourSupabase[i]
        const match = [...existing, ...contactsPourSupabase.slice(0, i)].find(other => duplicateReason(candidate, other))
        if (match) warnings.push(`${candidate.prenom} ${candidate.nom ?? ''} : ${duplicateReason(candidate, match)}`)
      }
      if (warnings.length && !window.confirm(`Doublons possibles :\n${warnings.join('\n')}\n\nAucune fusion ne sera effectuée. Importer quand même ces fiches séparées ? Annule pour modifier la sélection.`)) return
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

    try {
      const existing = await readOwnRows('contacts', userData.user.id)
      const candidate = { prenom, nom, email, telephone_indicatif: telephoneIndicatif, telephone_numero: telephoneNumero }
      const match = existing.find(other => duplicateReason(candidate, other))
      if (match && !window.confirm(`Doublon possible : ${duplicateReason(candidate, match)}. Créer quand même une fiche distincte ?`)) { setChargement(false); return }
    } catch { setErreur('Impossible de vérifier les doublons. Réessaie.'); setChargement(false); return }
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
    <div className="min-h-screen bg-canvas pb-12">
      <div className="mx-auto max-w-lg px-4 pt-8">
        <h1 className="mb-2 text-3xl font-bold text-ink">👤 Nouveau contact</h1>

        <p className="mb-8 text-muted">
          Ajoute manuellement ou importe depuis ton téléphone
        </p>

        {isMobile && supporteContactPicker && (
          <div className="mb-8">
            <button
              type="button"
              onClick={importerDepuisTelephone}
              disabled={importEnCours}
              className="flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-lg font-semibold text-ink shadow-xl transition-all active:scale-[0.985] disabled:opacity-70"
            >
              {importEnCours
                ? '📖 Ouverture du carnet...'
                : '📱 Importer depuis mes contacts'}
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-muted">
              Le téléphone ouvrira ton carnet d’adresses.
              <br />
              Choisis un ou plusieurs contacts.
            </p>
          </div>
        )}

        {isMobile && !supporteContactPicker && (
          <div className="mb-8 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm text-warning">
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
                ? 'border-emerald-500/30 bg-emerald-500/10 text-success'
                : 'border-red-500/30 bg-red-500/10 text-danger'
            }`}
          >
            {erreur}
          </div>
        )}

        {contactsTelephone.length > 0 && (
          <div className="mb-10 rounded-3xl border border-line bg-ink/[0.03] p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  Contacts à importer
                </h2>
                <p className="text-sm text-muted">
                  Décoche les contacts que tu ne veux pas enregistrer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setContactsTelephone([])}
                className="rounded-full bg-ink/10 px-3 py-1 text-xs text-muted active:scale-95"
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
                      ? 'border-accent/50 bg-action/10'
                      : 'border-line bg-ink/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={contact.selectionne}
                    onChange={() => changerSelectionContact(contact.id)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#C8A84E]"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">
                      {contact.nomComplet || 'Contact sans nom'}
                    </p>

                    <div className="mt-1 space-y-1 text-sm text-muted">
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
                        <p className="text-warning">
                          Aucun téléphone ou email détecté
                        </p>
                      )}
                      <button
  type="button"
  onClick={(e) => {
    e.preventDefault()
    setContactEnEdition(contact)
  }}
  className="mt-3 rounded-xl bg-ink/10 px-4 py-2 text-sm font-semibold text-ink active:scale-95"
>
  Modifier
</button>

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
              className="mt-5 w-full rounded-3xl bg-gradient-to-r from-action to-action px-4 py-5 text-lg font-bold text-on-action shadow-xl transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
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
            <label className="mb-2 block text-sm font-semibold text-muted">
              Prénom *
            </label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="Marie"
              className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted">
              Nom
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Dupont"
              className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted">
              Date de naissance
            </label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted">
              Relation
            </label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              <option value="ami">👫 Ami(e)</option>
              <option value="famille">👨‍👩‍👧 Famille</option>
              <option value="pro">💼 Professionnel</option>
              <option value="autre">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@email.com"
              className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted">
              Téléphone
            </label>

            <div className="flex gap-3">
              <select
                value={telephoneIndicatif}
                onChange={(e) => setTelephoneIndicatif(e.target.value)}
                className="w-28 rounded-2xl border border-line bg-ink/5 px-4 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
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
                className="min-w-0 flex-1 rounded-2xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
            </div>

            <p className="mt-3 text-xs text-muted">
              Sans le 0 initial, ex : 612345678.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted">
              Note / À propos
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aime le foot, cuisine italienne, vit à Lyon..."
              rows={4}
              className="w-full resize-y rounded-3xl border border-line bg-ink/5 px-5 py-4 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />

            <p className="mt-3 text-xs text-muted">
              💡 Plus tu donnes de détails, meilleures seront les idées de
              cadeaux.
            </p>
          </div>

          <div
            onClick={() => setEstFavori(!estFavori)}
            className={`flex cursor-pointer items-center justify-between rounded-3xl border p-5 transition-all active:scale-[0.985] ${
              estFavori
                ? 'border-accent bg-action/10'
                : 'border-line bg-ink/5 hover:border-line'
            }`}
          >
            <div>
              <p className="font-semibold text-ink">⭐ Contact favori</p>
              <p className="text-xs text-muted">
                Apparaîtra en premier dans ta liste
              </p>
            </div>

            <div
              className={`relative h-7 w-12 rounded-full transition-colors ${
                estFavori ? 'bg-action' : 'bg-gray-600'
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
            className="mt-6 w-full rounded-3xl bg-gradient-to-r from-action to-action py-5 text-lg font-bold text-on-action shadow-xl transition-all active:scale-[0.985] disabled:opacity-60"
          >
            {chargement ? 'Enregistrement en cours...' : '💾 Enregistrer le contact'}
          </button>
        </form>
      </div>
      {contactEnEdition && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 sm:items-center">
    <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-canvas p-5 shadow-2xl sm:rounded-3xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">
            Modifier le contact
          </h2>
          <p className="text-sm text-muted">
            Complète les informations avant import.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setContactEnEdition(null)}
          className="rounded-full bg-ink/10 px-3 py-2 text-ink"
        >
          ✕
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Prénom *
          </label>
          <input
            type="text"
            value={contactEnEdition.prenom}
            onChange={(e) =>
              setContactEnEdition({
                ...contactEnEdition,
                prenom: e.target.value,
              })
            }
            className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Nom
          </label>
          <input
            type="text"
            value={contactEnEdition.nom}
            onChange={(e) =>
              setContactEnEdition({
                ...contactEnEdition,
                nom: e.target.value,
              })
            }
            className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Date de naissance
          </label>
          <input
            type="date"
            value={contactEnEdition.dateNaissance}
            onChange={(e) =>
              setContactEnEdition({
                ...contactEnEdition,
                dateNaissance: e.target.value,
              })
            }
            className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Relation
          </label>
          <select
            value={contactEnEdition.relation}
            onChange={(e) =>
              setContactEnEdition({
                ...contactEnEdition,
                relation: e.target.value,
              })
            }
            className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            <option value="ami">👫 Ami(e)</option>
            <option value="famille">👨‍👩‍👧 Famille</option>
            <option value="pro">💼 Professionnel</option>
            <option value="autre">✨ Autre</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Email
          </label>
          <input
            type="email"
            value={contactEnEdition.email}
            onChange={(e) =>
              setContactEnEdition({
                ...contactEnEdition,
                email: e.target.value,
              })
            }
            className="w-full rounded-2xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Téléphone
          </label>

          <div className="flex gap-3">
            <select
              value={contactEnEdition.telephoneIndicatif}
              onChange={(e) =>
                setContactEnEdition({
                  ...contactEnEdition,
                  telephoneIndicatif: e.target.value,
                })
              }
              className="w-28 rounded-2xl border border-line bg-ink/5 px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              {INDICATIFS_PAYS.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.code}
                </option>
              ))}
            </select>

            <input
              type="tel"
              value={contactEnEdition.telephoneNumero}
              onChange={(e) =>
                setContactEnEdition({
                  ...contactEnEdition,
                  telephoneNumero: e.target.value.replace(/[^0-9]/g, ''),
                })
              }
              className="min-w-0 flex-1 rounded-2xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-muted">
            Note / À propos
          </label>
          <textarea
            value={contactEnEdition.note}
            onChange={(e) =>
              setContactEnEdition({
                ...contactEnEdition,
                note: e.target.value,
              })
            }
            rows={4}
            className="w-full resize-y rounded-3xl border border-line bg-ink/5 px-5 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </div>

        <div
          onClick={() =>
            setContactEnEdition({
              ...contactEnEdition,
              estFavori: !contactEnEdition.estFavori,
            })
          }
          className={`flex cursor-pointer items-center justify-between rounded-3xl border p-5 transition-all active:scale-[0.985] ${
            contactEnEdition.estFavori
              ? 'border-accent bg-action/10'
              : 'border-line bg-ink/5'
          }`}
        >
          <div>
            <p className="font-semibold text-ink">⭐ Contact favori</p>
            <p className="text-xs text-muted">
              Apparaîtra en premier dans ta liste
            </p>
          </div>

          <div
            className={`relative h-7 w-12 rounded-full transition-colors ${
              contactEnEdition.estFavori ? 'bg-action' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                contactEnEdition.estFavori ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={sauvegarderContactEdite}
          disabled={!contactEnEdition.prenom.trim()}
          className="w-full rounded-3xl bg-gradient-to-r from-action to-action py-5 text-lg font-bold text-on-action shadow-xl active:scale-[0.985] disabled:opacity-50"
        >
          Enregistrer les modifications
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}
