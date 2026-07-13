'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import Link from 'next/link'
import { TYPES_RELATION } from '@/lib/constants'
import { useDrawer } from '@/components/DrawerContext'
import ContactSearchFilters from '@/components/ContactSearchFilters'
import { useContactFilters } from '@/lib/hooks/useContactFilters'

type Contact = {
  id: string
  nom: string | null
  prenom: string | null
  date_naissance: string | null
  relation: string | null
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

  const {
    recherche,
    setRecherche,
    triPar,
    setTriPar,
    filtreRelation,
    setFiltreRelation,
    contactsFiltres,
  } = useContactFilters(contacts)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/connexion')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('nom', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Erreur chargement contacts :', error)
        setContacts([])
        setLoading(false)
        return
      }

      if (data) {
        const liste = data as Contact[]

        const avecLiens = await Promise.all(
          liste.map(async (contact) => {
            if (!contact.email) {
              return { ...contact, estLie: false }
            }

            const { data: resultat, error: lienError } = await supabase.rpc(
              'est_contact_lie',
              {
                mon_user_id: session.user.id,
                email_du_contact: contact.email,
              }
            )

            if (lienError) {
              console.warn(
                'Impossible de vérifier si le contact est lié :',
                lienError
              )

              return { ...contact, estLie: false }
            }

            return { ...contact, estLie: resultat === true }
          })
        )

        setContacts(avecLiens)
      }

      setLoading(false)
    }

    init()
  }, [router])

  const couleurRelation = (relation: string | null) => {
    const relationSecurisee = relation ?? ''
    const config = TYPES_RELATION.find((t) => t.value === relationSecurisee)

    if (!config) {
      return 'bg-white/10 text-indigo-200 border border-white/20'
    }

    return config.couleur
  }

  const getNomComplet = (contact: ContactAvecLien) => {
    const prenom = contact.prenom?.trim() ?? ''
    const nom = contact.nom?.trim() ?? ''
    const nomComplet = `${prenom} ${nom}`.trim()

    return nomComplet || 'Contact sans nom'
  }

  const getInitiales = (contact: ContactAvecLien) => {
    const premiereLettrePrenom = contact.prenom?.trim()?.[0] ?? ''
    const premiereLettreNom = contact.nom?.trim()?.[0] ?? ''
    const initiales = `${premiereLettrePrenom}${premiereLettreNom}`.trim()

    return initiales || '👤'
  }

  const getRelationLabel = (relation: string | null) => {
    const relationSecurisee = relation?.trim()

    return relationSecurisee || 'non classé'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <span className="text-6xl">📒</span>
          </div>
          <p className="text-indigo-200">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white">
            📒 Mes contacts
            <span className="ml-2 text-sm font-normal text-indigo-300">
              ({contacts.length})
            </span>
          </h1>

          <Link
            href="/dashboard/contacts/nouveau"
            className="w-full sm:w-auto text-center bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-bold text-sm px-4 py-2 rounded-xl transition whitespace-nowrap"
          >
            + Nouveau
          </Link>
        </div>

        <ContactSearchFilters
          recherche={recherche}
          setRecherche={setRecherche}
          triPar={triPar}
          setTriPar={setTriPar}
          filtreRelation={filtreRelation}
          setFiltreRelation={setFiltreRelation}
        />

        {contacts.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-6xl mb-4 block">👥</span>
            <p className="text-indigo-300">Aucun contact pour le moment.</p>

            <Link
              href="/dashboard/contacts/nouveau"
              className="inline-block mt-4 text-sm text-[#C8A84E] hover:text-white underline transition"
            >
              Ajouter mon premier contact →
            </Link>
          </div>
        ) : contactsFiltres.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-6xl mb-4 block">🔍</span>
            <p className="text-indigo-300">
              Aucun contact ne correspond à ta recherche.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {contactsFiltres.map((contact) => (
              <div
                key={contact.id}
                onClick={() => ouvrirDrawer(contact)}
                className="bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitiales(contact)}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {getNomComplet(contact)}
                    </p>

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${couleurRelation(
                        contact.relation
                      )}`}
                    >
                      {getRelationLabel(contact.relation)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  {contact.est_favori && <span className="text-lg">⭐</span>}

                  {contact.estLie && (
                    <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 font-medium px-2 py-1 rounded-full">
                      🤝 Lié
                    </span>
                  )}

                  {contact.date_naissance && (
                    <span className="text-gray-400">🎂</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/generate?contactId=${contact.id}`)
                    }}
                    className="text-xs text-indigo-300 hover:text-white font-medium border border-indigo-400/30 px-3 py-1 rounded-lg hover:bg-indigo-500/10 transition"
                  >
                    ✨ Générer
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/contacts/${contact.id}/edit`)
                    }}
                    className="text-xs text-[#C8A84E]/70 hover:text-white font-medium border border-[#C8A84E]/30 px-3 py-1 rounded-lg hover:bg-[#C8A84E]/10 transition"
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