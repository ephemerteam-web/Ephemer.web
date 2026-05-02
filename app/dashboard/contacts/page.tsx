'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { TYPES_RELATION } from '@/lib/constants'
import { useDrawer } from '@/lib/DrawerContext'

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null
  telephone_indicatif: string | null
  telephone_numero: string | null
  note: string | null
  est_favori: boolean | null
}

type ContactAvecLien = Contact & {
  estLie: boolean
}

export default function ContactsPage() {
  const router = useRouter()
  const { ouvrirDrawer } = useDrawer()
  const [contacts, setContacts] = useState<ContactAvecLien[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/connexion')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('nom', { ascending: true })

      if (!error && data) {
        const liste = data as Contact[]

        const avecLiens = await Promise.all(
          liste.map(async (contact) => {
            if (!contact.email) return { ...contact, estLie: false }

            const { data: resultat } = await supabase.rpc('est_contact_lie', {
              mon_user_id: session.user.id,
              email_du_contact: contact.email,
            })

            return { ...contact, estLie: resultat === true }
          })
        )

        setContacts(avecLiens)
      }

      setLoading(false)
    }

    init()
  }, [router])

  const couleurRelation = (relation: string) => {
    const config = TYPES_RELATION.find(t => t.value === relation)
    if (!config) return 'bg-white/10 text-indigo-200 border border-white/20'
    return config.couleur
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-pulse mb-4">
          <span className="text-6xl">📒</span>
        </div>
        <p className="text-indigo-200">Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            📒 Mes contacts
            <span className="ml-2 text-sm font-normal text-indigo-300">
              ({contacts.length})
            </span>
          </h1>
          <Link
            href="/dashboard/contacts/nouveau"
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition border border-indigo-400/50"
          >
            + Nouveau
          </Link>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-6xl mb-4 block">👥</span>
            <p className="text-indigo-300">Aucun contact pour le moment.</p>
            <Link
              href="/dashboard/contacts/nouveau"
              className="inline-block mt-4 text-sm text-indigo-400 hover:text-white underline transition"
            >
              Ajouter mon premier contact →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => ouvrirDrawer(contact)}
                className="
                  bg-white/5 backdrop-blur-lg border border-white/10
                  hover:bg-white/10 hover:border-white/20
                  rounded-xl p-4 flex items-center justify-between
                  cursor-pointer transition-all duration-200
                "
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {contact.prenom[0]}{contact.nom[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {contact.prenom} {contact.nom}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${couleurRelation(contact.relation)}`}>
                      {contact.relation}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {contact.est_favori && <span className="text-lg">⭐</span>}
                  {contact.estLie && (
                    <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 font-medium px-2 py-1 rounded-full">
                      🤝 Lié
                    </span>
                  )}
                  {contact.date_naissance && <span className="text-gray-400">🎂</span>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/contacts/${contact.id}/modifier`)
                    }}
                    className="text-xs text-indigo-300 hover:text-white font-medium border border-indigo-500/40 px-3 py-1 rounded-lg hover:bg-indigo-500/30 transition"
                  >
                    ✏️ Modifier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
