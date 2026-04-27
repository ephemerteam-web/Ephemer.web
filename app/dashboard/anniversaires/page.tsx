'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculerProchainAnniversaire, formaterDateFR } from '@/lib/anniversaires'

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null  // ← nouveau champ email
}

type ContactAvecAnniv = Contact & {
  joursRestants: number
  ageAVenir: number
  prochainAnniv: Date
}

// TypeRappel : quand envoyer le rappel
type TypeRappel = 'jour_j' | 'semaine' | 'mois'

// Destinataire : qui reçoit l'email
type Destinataire = 'moi' | 'contact' | 'les_deux'

// État de la modal (fenêtre qui s'ouvre au clic)
type EtatModal = {
  ouvert: boolean
  contact: ContactAvecAnniv | null
  typeRappel: TypeRappel | null
  message: string
  sujetEmail: string
  destinataire: Destinataire
  ton: 'familier' | 'formel' | 'humoristique' | 'poetique'
  enChargement: boolean  // pendant que l'IA génère
  enRegistrement: boolean  // pendant qu'on sauvegarde
  succes: boolean
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function AnniversairesPage() {
  const router = useRouter()
  const [contactsAvecAnniv, setContactsAvecAnniv] = useState<ContactAvecAnniv[]>([])
  const [loading, setLoading] = useState(true)
  const [emailUtilisateur, setEmailUtilisateur] = useState<string>('')

  // État initial de la modal (fermée)
  const [modal, setModal] = useState<EtatModal>({
    ouvert: false,
    contact: null,
    typeRappel: null,
    message: '',
    sujetEmail: '',
    destinataire: 'moi',
    ton: 'familier',
    enChargement: false,
    enRegistrement: false,
    succes: false,
  })

  // ─── Chargement des contacts ─────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/connexion')
        return
      }

      // On récupère l'email de l'utilisateur connecté
      setEmailUtilisateur(session.user.email ?? '')

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)

      if (!error && data) {
        const liste = data as Contact[]
        const avecAnniv: ContactAvecAnniv[] = liste
          .filter((c) => c.date_naissance !== null)
          .map((c) => {
            const { joursRestants, ageAVenir, prochainAnniv } =
              calculerProchainAnniversaire(c.date_naissance!)
            return { ...c, joursRestants, ageAVenir, prochainAnniv }
          })
          .sort((a, b) => a.joursRestants - b.joursRestants)

        setContactsAvecAnniv(avecAnniv)
      }

      setLoading(false)
    }
    init()
  }, [router])

  // ─── Fonctions utilitaires ───────────────────────────────────────────────────

  const couleurBadge = (jours: number) => {
    if (jours === 0) return 'bg-red-100 text-red-600'
    if (jours <= 7) return 'bg-orange-100 text-orange-600'
    if (jours <= 30) return 'bg-yellow-100 text-yellow-700'
    return 'bg-purple-100 text-purple-600'
  }

  const texteBadge = (jours: number) => {
    if (jours === 0) return "🎉 Aujourd'hui !"
    if (jours === 1) return '⏰ Demain !'
    return `Dans ${jours} j`
  }

  // Calcule la date d'envoi selon le type de rappel
  const calculerDateEnvoi = (prochainAnniv: Date, typeRappel: TypeRappel): Date => {
    const date = new Date(prochainAnniv)
    if (typeRappel === 'semaine') date.setDate(date.getDate() - 7)
    if (typeRappel === 'mois') date.setDate(date.getDate() - 30)
    // 'jour_j' = date de l'anniversaire directement
    return date
  }

  const labelTypeRappel = (type: TypeRappel) => {
    if (type === 'jour_j') return "Jour J (le jour même)"
    if (type === 'semaine') return "J-7 (une semaine avant)"
    return "J-30 (un mois avant)"
  }

  // ─── Ouverture de la modal + génération IA ───────────────────────────────────

  // Fonction qui appelle l'IA (réutilisable pour régénérer)
const genererMessage = async (
  contact: ContactAvecAnniv,
  typeRappel: TypeRappel,
  ton: string
) => {
  setModal((prev) => ({ ...prev, enChargement: true }))

  try {
    const reponse = await fetch('/api/generate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: contact.prenom,
        nom: contact.nom,
        relation: contact.relation,
        age: contact.ageAVenir,
        typeRappel,
        tone: ton,   // ← on envoie le ton choisi
      }),
    })

    const resultat = await reponse.json()

    setModal((prev) => ({
      ...prev,
      message: resultat.message ?? '',
      sujetEmail: prev.sujetEmail || `Anniversaire de ${contact.prenom} ${contact.nom}`,
      enChargement: false,
    }))
  } catch {
    setModal((prev) => ({
      ...prev,
      message: 'Erreur lors de la génération. Écris ton message manuellement.',
      enChargement: false,
    }))
  }
}

// Ouverture de la modal
const ouvrirModal = async (contact: ContactAvecAnniv, typeRappel: TypeRappel) => {
  const tonDefaut = 'familier'
  setModal({
    ouvert: true,
    contact,
    typeRappel,
    message: '',
    sujetEmail: `Anniversaire de ${contact.prenom} ${contact.nom}`,
    destinataire: 'moi',
    ton: tonDefaut,
    enChargement: true,
    enRegistrement: false,
    succes: false,
  })

  await genererMessage(contact, typeRappel, tonDefaut)
}


  // ─── Fermer la modal ─────────────────────────────────────────────────────────

  const fermerModal = () => {
    setModal({
      ouvert: false,
      contact: null,
      typeRappel: null,
      message: '',
      sujetEmail: '',
      destinataire: 'moi',
      ton: 'familier',
      enChargement: false,
      enRegistrement: false,
      succes: false,
    })
  }

  // ─── Enregistrer le rappel en base ──────────────────────────────────────────

  const enregistrerRappel = async () => {
    if (!modal.contact || !modal.typeRappel) return

    setModal((prev) => ({ ...prev, enRegistrement: true }))

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Calculer la date d'envoi
    const dateEnvoi = calculerDateEnvoi(modal.contact.prochainAnniv, modal.typeRappel)

    // Déterminer l'email destinataire
    let emailDest: string | null = null
    if (modal.destinataire === 'moi') emailDest = emailUtilisateur
    if (modal.destinataire === 'contact') emailDest = modal.contact.email
    if (modal.destinataire === 'les_deux') {
      // On stocke les deux séparés par une virgule
      emailDest = [emailUtilisateur, modal.contact.email].filter(Boolean).join(',')
    }

    const { error } = await supabase.from('rappels').insert({
      user_id: session.user.id,
      contact_id: modal.contact.id,
      date_envoi: dateEnvoi.toISOString().split('T')[0], // format YYYY-MM-DD
      type_rappel: modal.typeRappel,
      destinataire: modal.destinataire,
      message: modal.message,
      sujet_email: modal.sujetEmail,
      email_destinataire: emailDest,
      statut: 'en_attente',
    })

    if (error) {
      console.error('Erreur enregistrement rappel:', error)
      alert('Erreur lors de l\'enregistrement. Réessaie.')
      setModal((prev) => ({ ...prev, enRegistrement: false }))
      return
    }

    // Succès !
    setModal((prev) => ({ ...prev, enRegistrement: false, succes: true }))
  }

  // ─── Redirection vers le générateur de message ────────────────────────────────

  const ouvrirGenerateur = (contact: ContactAvecAnniv) => {
    const params = new URLSearchParams({
      prenom: contact.prenom,
      nom: contact.nom,
      relation: contact.relation,
      age: contact.ageAVenir.toString(),
    })
    router.push(`/dashboard/generate?${params.toString()}`)
  }

  // ─── Affichage ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">

        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-indigo-400 hover:text-indigo-600 mb-6 flex items-center gap-1"
        >
          ← Retour au dashboard
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">🎂 Anniversaires</h1>

        {contactsAvecAnniv.length === 0 ? (
          <p className="text-gray-500">Aucun contact avec une date de naissance.</p>
        ) : (
          <div className="grid gap-3">
            {contactsAvecAnniv.map((contact) => (
              <div
                key={contact.id}
                className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3"
              >
                {/* Infos contact */}
                <div className="flex-1 min-w-[150px]">
                  <p className="font-semibold text-gray-800">
                    {contact.prenom} {contact.nom}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formaterDateFR(contact.prochainAnniv)} • {contact.ageAVenir} ans
                  </p>
                </div>

                {/* Badge jours restants */}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${couleurBadge(contact.joursRestants)}`}>
                  {texteBadge(contact.joursRestants)}
                </span>

                {/* Bouton générateur de message */}
                <button
                  onClick={() => ouvrirGenerateur(contact)}
                  className="text-xs bg-purple-600 text-white font-medium px-3 py-2 rounded-xl hover:bg-purple-500 transition whitespace-nowrap"
                >
                  ✨ Générer un message
                </button>

                {/* 3 boutons de rappel */}
                <button
                  onClick={() => ouvrirModal(contact, 'mois')}
                  className="text-xs bg-blue-50 text-blue-600 border border-blue-200 font-medium px-3 py-2 rounded-xl hover:bg-blue-100 transition whitespace-nowrap"
                >
                  📅 J-30
                </button>
                <button
                  onClick={() => ouvrirModal(contact, 'semaine')}
                  className="text-xs bg-orange-50 text-orange-600 border border-orange-200 font-medium px-3 py-2 rounded-xl hover:bg-orange-100 transition whitespace-nowrap"
                >
                  ⏰ J-7
                </button>
                <button
                  onClick={() => ouvrirModal(contact, 'jour_j')}
                  className="text-xs bg-red-50 text-red-600 border border-red-200 font-medium px-3 py-2 rounded-xl hover:bg-red-100 transition whitespace-nowrap"
                >
                  🎉 Jour J
                </button>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* ─── MODAL ─────────────────────────────────────────────────────────────── */}

      {modal.ouvert && modal.contact && (
        // Fond sombre derrière la modal
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">

            {/* En-tête */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                📬 Programmer un rappel
              </h2>
              <button onClick={fermerModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Infos du rappel */}
            <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
              <p><strong>Contact :</strong> {modal.contact.prenom} {modal.contact.nom}</p>
              <p><strong>Rappel :</strong> {labelTypeRappel(modal.typeRappel!)}</p>
              <p><strong>Date d'envoi :</strong> {calculerDateEnvoi(modal.contact.prochainAnniv, modal.typeRappel!).toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Message IA ou chargement */}
            {modal.enChargement ? (
              <div className="flex flex-col items-center gap-2 py-6 text-gray-500">
                <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-sm">L'IA génère un message...</p>
              </div>
            ) : modal.succes ? (
              // Message de succès
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-4xl">✅</p>
                <p className="text-green-700 font-semibold">Rappel programmé avec succès !</p>
                <p className="text-sm text-gray-500 text-center">
                  L'email sera envoyé automatiquement le {calculerDateEnvoi(modal.contact.prochainAnniv, modal.typeRappel!).toLocaleDateString('fr-FR')}
                </p>
                <button
                  onClick={fermerModal}
                  className="mt-2 bg-purple-600 text-white px-6 py-2 rounded-xl hover:bg-purple-500"
                >
                  Fermer
                </button>
              </div>
            ) : (
              // Formulaire de validation
              <>{/* Choix du ton */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    🎭 Ton du message
  </label>
  <div className="flex gap-2 flex-wrap">
    {[
      { val: 'familier',      emoji: '😊', label: 'Familier' },
      { val: 'formel',        emoji: '👔', label: 'Formel' },
      { val: 'humoristique',  emoji: '😄', label: 'Humour' },
      { val: 'poetique',      emoji: '🌸', label: 'Poétique' },
    ].map(({ val, emoji, label }) => (
      <button
        key={val}
        onClick={() => setModal((prev) => ({ ...prev, ton: val as EtatModal['ton'] }))}
        className={`flex-1 min-w-[80px] border rounded-xl px-2 py-2 text-xs font-medium transition
          ${modal.ton === val
            ? 'border-purple-500 bg-purple-50 text-purple-700'
            : 'border-gray-200 text-gray-600 hover:border-purple-300'}
        `}
      >
        {emoji} {label}
      </button>
    ))}
  </div>

  {/* Bouton régénérer */}
  <button
    onClick={() => genererMessage(modal.contact!, modal.typeRappel!, modal.ton)}
    disabled={modal.enChargement}
    className="mt-2 w-full border border-purple-300 text-purple-600 text-sm font-medium py-2 rounded-xl hover:bg-purple-50 transition disabled:opacity-40"
  >
    {modal.enChargement ? '⏳ Génération...' : '🔄 Régénérer avec ce ton'}
  </button>
</div>

                {/* Sujet email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sujet de l'email
                  </label>
                  <input
                    type="text"
                    value={modal.sujetEmail}
                    onChange={(e) => setModal((prev) => ({ ...prev, sujetEmail: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (modifiable)
                  </label>
                  <textarea
                    value={modal.message}
                    onChange={(e) => setModal((prev) => ({ ...prev, message: e.target.value }))}
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  />
                </div>

                {/* Destinataire */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Envoyer à...
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { val: 'moi', label: '👤 Moi seulement', desc: emailUtilisateur },
                      { val: 'contact', label: '🎂 Le contact', desc: modal.contact.email ?? 'Pas d\'email', disabled: !modal.contact.email },
                      { val: 'les_deux', label: '👥 Les deux', desc: '', disabled: !modal.contact.email },
                    ].map(({ val, label, desc, disabled }) => (
                      <button
                        key={val}
                        disabled={disabled}
                        onClick={() => setModal((prev) => ({ ...prev, destinataire: val as Destinataire }))}
                        className={`flex-1 min-w-[120px] border rounded-xl px-3 py-2 text-xs text-left transition
                          ${modal.destinataire === val ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}
                          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-purple-300'}
                        `}
                      >
                        <p className="font-medium">{label}</p>
                        {desc && <p className="text-gray-400 truncate">{desc}</p>}
                        {disabled && <p className="text-red-400">Pas d'email</p>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bouton valider */}
                <button
                  onClick={enregistrerRappel}
                  disabled={modal.enRegistrement || !modal.message}
                  className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {modal.enRegistrement ? 'Enregistrement...' : '✅ Programmer cet envoi'}
                </button>
              </>
            )}

          </div>
        </div>
      )}

    </main>
  )
}
