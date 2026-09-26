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

        // Pour l'instant, on désactive la vérification des contacts liés
        // car la RPC est_contact_lie n'est pas disponible
        // Tous les contacts sont marqués comme non liés
        const avecLiens = liste.map(contact => ({
          ...contact,
          estLie: false
        }))

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
      return 'bg-ink/10 text-info border border-line'
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
          <p className="text-info">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-ink">
            📒 Mes contacts
            <span className="ml-2 text-sm font-normal text-info">
              ({contacts.length})
            </span>
          </h1>

          <div className="flex gap-2 w-full sm:w-auto">
            <Link
              href="/dashboard/contacts/rapide"
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-action to-action/80 hover:from-action hover:to-action text-on-action font-bold text-sm px-4 py-2 rounded-xl transition whitespace-nowrap shadow-lg hover:shadow-xl active:scale-95"
            >
              ⚡ Rapide
            </Link>
            <Link
              href="/dashboard/contacts/nouveau"
              className="flex-1 sm:flex-none text-center bg-ink/5 hover:bg-ink/10 border border-line text-ink font-bold text-sm px-4 py-2 rounded-xl transition whitespace-nowrap"
            >
              + Nouveau
            </Link>
          </div>
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
            <p className="text-info">Aucun contact pour le moment.</p>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/contacts/rapide"
                className="bg-gradient-to-r from-action to-action/80 text-on-action font-bold px-6 py-3 rounded-xl transition shadow-lg hover:shadow-xl active:scale-95"
              >
                ⚡ Ajout rapide
              </Link>
              <Link
                href="/dashboard/contacts/nouveau"
                className="bg-ink/5 hover:bg-ink/10 border border-line text-ink font-bold px-6 py-3 rounded-xl transition"
              >
                + Nouveau contact
              </Link>
            </div>
          </div>
        ) : contactsFiltres.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-6xl mb-4 block">🔍</span>
            <p className="text-info">
              Aucun contact ne correspond à ta recherche.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {contactsFiltres.map((contact) => (
              <div
                key={contact.id}
                onClick={() => ouvrirDrawer(contact)}
                className={`group relative bg-ink/5 backdrop-blur-lg border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer transition-all duration-300 ${
                  contact.est_favori
                    ? 'border-accent/40 hover:border-accent/70 shadow-[0_0_15px_-3px_rgba(200,168,78,0.15)]'
                    : 'border-line hover:bg-ink/10 hover:border-line'
                }`}
              >
                {/* Lueur dorée subtile en arrière-plan si favori */}
                {contact.est_favori && (
                  <div className="absolute inset-0 bg-gradient-to-r from-action/5 to-transparent opacity-50 pointer-events-none rounded-xl" />
                )}

                <div className="flex items-center gap-4 min-w-0 relative z-10">
                  {/* AVATAR AVEC CADRE DORÉ */}
                  <div className="relative flex-shrink-0">
                    {/* Le cercle doré (visible seulement si favori) */}
                    {contact.est_favori && (
                      <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-action via-action to-action animate-pulse-slow" />
                    )}
                    
                    {/* L'avatar lui-même */}
                    <div 
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                        contact.est_favori
                          ? 'bg-canvas text-accent border-canvas' // Fond sombre pour faire ressortir l'or
                          : 'bg-indigo-500/30 text-ink border-indigo-400/40'
                      }`}
                    >
                      {getInitiales(contact)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className={`font-semibold truncate transition-colors ${
                      contact.est_favori ? 'text-accent' : 'text-ink'
                    }`}>
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

                <div className="flex items-center gap-2 flex-wrap sm:justify-end relative z-10">
                  {/* On a retiré l'étoile ici car elle est maintenant sur l'avatar */}

                  {contact.estLie && (
                    <span className="text-xs bg-green-500/20 text-success border border-green-500/30 font-medium px-2 py-1 rounded-full">
                      🤝 Lié
                    </span>
                  )}

                  {contact.date_naissance && (
                    <span className="text-muted">🎂</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/generate?contactId=${contact.id}`)
                    }}
                    className="text-xs text-info hover:text-ink font-medium border border-indigo-400/30 px-3 py-1 rounded-lg hover:bg-indigo-500/10 transition"
                  >
                    ✨ Générer
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/contacts/${contact.id}/edit`)
                    }}
                    className="text-xs text-accent/70 hover:text-ink font-medium border border-accent/30 px-3 py-1 rounded-lg hover:bg-action/10 transition"
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