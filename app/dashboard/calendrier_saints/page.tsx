'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { SAINTS_PAR_DATE } from '@/lib/saints'
import { trouverFete, calculerProchaineFete, formaterDateFR } from '@/lib/anniversaires'
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

type FeteAvecContact = {
  nomSaint: string
  prenoms: string[]
  prochaineFete: Date
  joursRestants: number
  contact: Contact
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendrierSaintsPage() {
  const router = useRouter()
  const [fetelist, setFetelist] = useState<FeteAvecContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/connexion')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('id, nom, prenom, date_naissance, relation, email')
        .eq('user_id', session.user.id)

      if (!error && data) {
        const contacts = data as Contact[]
        const list: FeteAvecContact[] = []

        for (const contact of contacts) {
          const fete = trouverFete(contact.prenom)

          if (fete) {
            const { prochaineFete, joursRestants } =
              calculerProchaineFete(fete.date)

            const saint = SAINTS_PAR_DATE.get(fete.date)

            list.push({
              nomSaint: fete.nomSaint,
              prenoms: saint?.prenoms || [],
              prochaineFete,
              joursRestants,
              contact,
            })
          }
        }

        setFetelist(list)
      }

      setLoading(false)
    }

    init()
  }, [router])

  // ✅ Hook filtres réutilisé
  const {
    recherche,
    setRecherche,
    triPar,
    setTriPar,
    filtreRelation,
    setFiltreRelation,
    contactsFiltres,
  } = useContactFilters(fetelist.map(f => f.contact))

  // ✅ Reconstruction après filtre
  const fetesFiltrees = fetelist.filter(f =>
    contactsFiltres.some(c => c.id === f.contact.id)
  )

  // ✅ TRI métier
  const fetesTriees = [...fetesFiltrees].sort(
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
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=fete`)
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
        <h1 className="text-2xl font-bold mb-4">
          ✨ Fêtes des Saints
          <span className="ml-2 text-sm text-indigo-300">
            ({fetesTriees.length})
          </span>
        </h1>

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
        {fetesTriees.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-5xl block mb-4">✨</span>
            <p className="text-indigo-300">
              Aucun contact avec une fête associée.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {fetesTriees.map((item, idx) => {
              const highlight =
                item.joursRestants <= 3
                  ? 'ring-2 ring-[#C8A84E]'
                  : ''

              const pulse =
                item.joursRestants === 0
                  ? 'animate-pulse'
                  : ''

              return (
                <div
                  key={`${item.contact.id}-${idx}`}
                  className={`bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all duration-200 ${highlight} ${pulse}`}
                >
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {item.nomSaint}
                    </p>

                    <p className="text-sm text-indigo-200">
                      {formaterDateFR(item.prochaineFete)}
                    </p>

                    <p className="text-xs text-indigo-300 mt-1">
                      👤 {item.contact.prenom} {item.contact.nom}
                    </p>
                  </div>

                  {/* Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit ${couleurBadge(
                      item.joursRestants
                    )}`}
                  >
                    {texteBadge(item.joursRestants)}
                  </span>

                  {/* CTA */}
                  <button
                    onClick={() => allerVersGenerateur(item.contact.id)}
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
