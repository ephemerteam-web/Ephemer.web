'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SAINTS } from '@/lib/saints'
import { trouverFete, calculerProchaineFete, formaterDateFR } from '@/lib/anniversaires'

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
            const { prochaineFete, joursRestants } = calculerProchaineFete(fete.date)
            const saint = SAINTS.find((s) => s.date === fete.date)
            list.push({
              nomSaint: fete.nomSaint,
              prenoms: saint?.prenoms || [],
              prochaineFete,
              joursRestants,
              contact,
            })
          }
        }

        list.sort((a, b) => a.joursRestants - b.joursRestants)
        setFetelist(list)
      }

      setLoading(false)
    }
    init()
  }, [router])

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

  const allerVersGenerateur = (contactId: string) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=fete`)
  }

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

        <h1 className="text-2xl font-bold text-gray-800 mb-6">✨ Fêtes des Saints</h1>

        {fetelist.length === 0 ? (
          <p className="text-gray-500">Aucun contact avec une fête associée.</p>
        ) : (
          <div className="grid gap-3">
            {fetelist.map((item, idx) => (
              <div
                key={`${item.contact.id}-${idx}`}
                className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[150px]">
                  <p className="font-semibold text-gray-800">
                    {item.nomSaint}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formaterDateFR(item.prochaineFete)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    👤 {item.contact.prenom} {item.contact.nom} • {item.prenoms.join(', ')}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-sm font-medium ${couleurBadge(item.joursRestants)}`}>
                  {texteBadge(item.joursRestants)}
                </span>

                <button
                  onClick={() => allerVersGenerateur(item.contact.id)}
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
