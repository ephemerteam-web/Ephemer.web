'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null
}

type ContactAvecLien = Contact & {
  estLie: boolean
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactAvecLien[]>([])
  const [loading, setLoading] = useState(true)
  const [contactSelectionne, setContactSelectionne] = useState<ContactAvecLien | null>(null)

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

  const formaterDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Couleurs adaptées au thème sombre du dashboard
  const couleurRelation = (relation: string) => {
    switch (relation) {
      case 'famille': return 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
      case 'amis':    return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      case 'pro':     return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      default:        return 'bg-white/10 text-indigo-200 border border-white/20'
    }
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
    // ⬇️ Plus de bg ici : le layout fournit déjà le fond violet/indigo
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* En-tête */}
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

        {/* Liste des contacts */}
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
                onClick={() => setContactSelectionne(contact)}
                className="
                  bg-white/5 backdrop-blur-lg border border-white/10
                  hover:bg-white/10 hover:border-white/20
                  rounded-xl p-4 flex items-center justify-between
                  cursor-pointer transition-all duration-200
                "
              >
                {/* Infos principales */}
                <div className="flex items-center gap-3">
                  {/* Avatar avec initiales */}
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

                {/* Badges + bouton modifier */}
                <div className="flex items-center gap-2">
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
                      router.push(`/contacts/${contact.id}/edit`)
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

      {/* =============================== */}
      {/* OVERLAY */}
      {/* =============================== */}
      {contactSelectionne && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setContactSelectionne(null)}
        />
      )}

      {/* =============================== */}
      {/* DRAWER */}
      {/* =============================== */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-sm z-50
          bg-indigo-950/95 backdrop-blur-xl border-l border-white/10
          shadow-2xl transform transition-transform duration-300 ease-in-out
          ${contactSelectionne ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {contactSelectionne && (
          <div className="h-full flex flex-col overflow-y-auto">

            {/* En-tête du drawer */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <button
                onClick={() => setContactSelectionne(null)}
                className="mb-4 text-white/70 hover:text-white text-sm flex items-center gap-1 transition"
              >
                ✕ Fermer
              </button>

              <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-2xl font-bold mb-3">
                {contactSelectionne.prenom[0]}{contactSelectionne.nom[0]}
              </div>

              <h2 className="text-2xl font-bold">
                {contactSelectionne.prenom} {contactSelectionne.nom}
              </h2>

              <span className={`mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full ${couleurRelation(contactSelectionne.relation)}`}>
                {contactSelectionne.relation}
              </span>
            </div>

            {/* Détails */}
            <div className="p-6 flex flex-col gap-5 flex-1">

              {/* Date de naissance */}
              <div>
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-1">🎂 Date de naissance</p>
                <p className="text-white font-medium">
                  {contactSelectionne.date_naissance
                    ? formaterDate(contactSelectionne.date_naissance)
                    : <span className="text-indigo-400 italic">Non renseignée</span>
                  }
                </p>
              </div>

              {/* Email */}
              <div>
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-1">✉️ Email</p>
                <p className="text-white font-medium">
                  {contactSelectionne.email
                    ? <a href={`mailto:${contactSelectionne.email}`} className="text-indigo-300 hover:text-white hover:underline transition">{contactSelectionne.email}</a>
                    : <span className="text-indigo-400 italic">Non renseigné</span>
                  }
                </p>
              </div>

              {/* Badge lié */}
              {contactSelectionne.estLie && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-300 font-semibold text-sm">🤝 Contact lié</p>
                  <p className="text-green-400/80 text-xs mt-1">
                    Ce contact utilise aussi Ephemer — vos anniversaires sont partagés automatiquement.
                  </p>
                </div>
              )}
            </div>

            {/* Bouton modifier en bas */}
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => {
                  setContactSelectionne(null)
                  router.push(`/contacts/${contactSelectionne.id}/edit`)
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition border border-indigo-400/50"
              >
                ✏️ Modifier ce contact
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
