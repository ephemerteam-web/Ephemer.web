'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { calculerProchainAnniversaire, formaterDateFR } from '@/lib/date-utils'
import { useContactFilters } from '@/lib/hooks/useContactFilters'
import ContactSearchFilters from '@/components/ContactSearchFilters'

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnniversairesPage() {
  const router = useRouter()
  const [contactsAvecAnniv, setContactsAvecAnniv] = useState<ContactAvecAnniv[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('id, nom, prenom, date_naissance, relation, email')
        .eq('user_id', session.user.id)

      if (!error && data) {
        const liste = data as Contact[]

        const avecAnniv: ContactAvecAnniv[] = liste
          .filter((c) => c.date_naissance !== null)
          .map((c) => {
            const { joursRestants, ageAVenir, date: prochainAnniv } =
              calculerProchainAnniversaire(c.date_naissance!)
            return { ...c, joursRestants, ageAVenir, prochainAnniv }
          })

        setContactsAvecAnniv(avecAnniv)
      }

      setLoading(false)
    }

    init()
  }, [router])

  // ✅ Hook filtres réutilisable
  const {
    recherche,
    setRecherche,
    triPar,
    setTriPar,
    filtreRelation,
    setFiltreRelation,
    contactsFiltres,
  } = useContactFilters(contactsAvecAnniv)

  // ✅ Tri métier prioritaire (important)
  const contactsTries = [...contactsFiltres].sort(
    (a, b) => a.joursRestants - b.joursRestants
  )

  // ─── UI helpers ────────────────────────────────────────────────────────────

  const couleurBadge = (jours: number) => {
    if (jours === 0) return 'bg-red-500/20 text-red-300 border border-red-500/30'
    if (jours <= 7) return 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
    if (jours <= 30) return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
    return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
  }

  const texteBadge = (jours: number) => {
    if (jours === 0) return "🎉 Aujourd'hui"
    if (jours === 1) return '⏰ Demain'
    return `Dans ${jours} j`
  }

  const allerVersGenerateur = (contactId: string) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=anniversaire`)
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <p className="text-indigo-300">Chargement...</p>
      </main>
    )
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen p-4 sm:p-6 text-white">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            🎂 Anniversaires
            <span className="ml-2 text-sm text-indigo-300">
              ({contactsTries.length})
            </span>
          </h1>
        </div>

        {/* Filtres */}
        <ContactSearchFilters
          recherche={recherche}
          setRecherche={setRecherche}
          triPar={triPar}
          setTriPar={setTriPar}
          filtreRelation={filtreRelation}
          setFiltreRelation={setFiltreRelation}
        />

        {/* Liste */}
        {contactsTries.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-5xl block mb-4">🎂</span>
            <p className="text-indigo-300">
              Aucun anniversaire trouvé.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {contactsTries.map((contact) => {
              const highlight =
                contact.joursRestants <= 3
                  ? 'ring-2 ring-[#C8A84E]'
                  : ''

              return (
                <div
                  key={contact.id}
                  className={`bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all duration-200 ${highlight}`}
                >
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {contact.prenom} {contact.nom}
                    </p>

                    <p className="text-sm text-indigo-200">
                      {formaterDateFR(contact.prochainAnniv)} • {contact.ageAVenir} ans
                    </p>
                  </div>

                  {/* Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit ${couleurBadge(
                      contact.joursRestants
                    )}`}
                  >
                    {texteBadge(contact.joursRestants)}
                  </span>

                  {/* CTA */}
                  <button
                    onClick={() => allerVersGenerateur(contact.id)}
                    className="w-full sm:w-auto text-xs bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-medium px-4 py-2 rounded-xl transition"
                  >
                    ✨ Message
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
