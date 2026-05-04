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
  email: string | null
}

type ContactAvecAnniv = Contact & {
  joursRestants: number
  ageAVenir: number
  prochainAnniv: Date
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function AnniversairesPage() {
  const router = useRouter()
  const [contactsAvecAnniv, setContactsAvecAnniv] = useState<ContactAvecAnniv[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      // Vérifier la session (utilisateur connecté ?)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Charger les contacts de l'utilisateur
      const { data, error } = await supabase
        .from('contacts')
        .select('id, nom, prenom, date_naissance, relation, email')
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

  // ─── Style du badge "jours restants" ───────────────────────────────────────

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

  // ─── Redirection vers le générateur avec contact prérempli ─────────────────
  // On passe l'ID du contact + le type d'événement dans l'URL.
  // La page /dashboard/generate lira ces paramètres et préremplira tout.
  const allerVersGenerateur = (contactId: string) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=anniversaire`)
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">

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

                {/* UN SEUL bouton : direction le générateur */}
                <button
                  onClick={() => allerVersGenerateur(contact.id)}
                  className="text-xs bg-purple-600 text-white font-medium px-4 py-2 rounded-xl hover:bg-purple-500 transition whitespace-nowrap"
                >
                  ✨ Préparer un message
                </button>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
