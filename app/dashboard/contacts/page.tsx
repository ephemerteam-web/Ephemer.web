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

  // 👇 NOUVEAU : quel contact est actuellement sélectionné (null = aucun, drawer fermé)
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
            if (!contact.email) {
              return { ...contact, estLie: false }
            }

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

  // 👇 NOUVEAU : formate une date "1990-05-21" en "21 mai 1990" (plus lisible)
  const formaterDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // 👇 NOUVEAU : donne une couleur selon la relation
  const couleurRelation = (relation: string) => {
    switch (relation) {
      case 'famille': return 'bg-pink-100 text-pink-600'
      case 'amis': return 'bg-yellow-100 text-yellow-600'
      case 'pro': return 'bg-blue-100 text-blue-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) return <p className="p-8 text-center text-gray-400">Chargement...</p>

  return (
    // 👇 "relative" ici pour que le drawer soit positionné par rapport à ce conteneur
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* En-tête — INCHANGÉ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-600">
              ← Retour
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">
              📒 Mes contacts ({contacts.length})
            </h1>
          </div>
          <Link
            href="/contacts/nouveau"
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-500 transition"
          >
            + Nouveau
          </Link>
        </div>

        {/* Liste — LÉGÈREMENT MODIFIÉE : la carte entière est cliquable */}
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-center mt-12">Aucun contact pour le moment.</p>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                // 👇 MODIFIÉ : onClick sur la carte pour ouvrir le drawer
                // "cursor-pointer" = le curseur devient une main (indique que c'est cliquable)
                onClick={() => setContactSelectionne(contact)}
                className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:bg-indigo-50/50 transition"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {contact.prenom} {contact.nom}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 capitalize">
                      {contact.relation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">

                  {/* Badge Lié — INCHANGÉ */}
                  {contact.estLie && (
                    <span className="text-xs bg-green-100 text-green-600 font-medium px-2 py-1 rounded-full">
                      🤝 Lié
                    </span>
                  )}

                  {contact.date_naissance && (
                    <span className="text-gray-400">🎂</span>
                  )}

                  {/* 👇 MODIFIÉ : on stoppe la propagation du clic (sinon cliquer sur 
                      "Modifier" ouvrirait AUSSI le drawer en même temps) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // stoppe le clic pour qu'il ne remonte pas à la carte
                      router.push(`/contacts/${contact.id}/edit`)
                    }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 transition"
                  >
                    ✏️ Modifier
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 👇 NOUVEAU : OVERLAY + DRAWER (s'affiche quand un contact est sélectionné) */}
      {/* ============================================================ */}

      {/* OVERLAY = fond semi-transparent derrière le drawer, cliquer dessus ferme le drawer */}
      {contactSelectionne && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          // "fixed inset-0" = couvre TOUTE la page (top:0, left:0, right:0, bottom:0)
          // "z-40" = s'affiche au-dessus du contenu normal
          onClick={() => setContactSelectionne(null)} // ferme en cliquant sur le fond
        />
      )}

      {/* DRAWER = le panneau qui glisse depuis la droite */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${contactSelectionne ? 'translate-x-0' : 'translate-x-full'}
        `}
        // "translate-x-full" = caché complètement à droite (hors écran)
        // "translate-x-0"    = visible (en position normale)
        // La transition entre les deux crée l'animation de glissement
      >
        {contactSelectionne && (
          <div className="h-full flex flex-col overflow-y-auto">

            {/* --- EN-TÊTE DU DRAWER --- */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              {/* Bouton fermer */}
              <button
                onClick={() => setContactSelectionne(null)}
                className="mb-4 text-white/70 hover:text-white text-sm flex items-center gap-1 transition"
              >
                ✕ Fermer
              </button>

              {/* Avatar avec initiales */}
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold mb-3">
                {contactSelectionne.prenom[0]}{contactSelectionne.nom[0]}
                {/* [0] = prend la première lettre du prénom et du nom */}
              </div>

              <h2 className="text-2xl font-bold">
                {contactSelectionne.prenom} {contactSelectionne.nom}
              </h2>

              {/* Badge relation */}
              <span className={`mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full ${couleurRelation(contactSelectionne.relation)}`}>
                {contactSelectionne.relation}
              </span>
            </div>

            {/* --- DÉTAILS DU CONTACT --- */}
            <div className="p-6 flex flex-col gap-5 flex-1">

              {/* Date de naissance */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">🎂 Date de naissance</p>
                <p className="text-gray-800 font-medium">
                  {contactSelectionne.date_naissance
                    ? formaterDate(contactSelectionne.date_naissance)
                    : <span className="text-gray-400 italic">Non renseignée</span>
                  }
                </p>
              </div>

              {/* Email */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">✉️ Email</p>
                <p className="text-gray-800 font-medium">
                  {contactSelectionne.email
                    ? <a href={`mailto:${contactSelectionne.email}`} className="text-indigo-600 hover:underline">{contactSelectionne.email}</a>
                    : <span className="text-gray-400 italic">Non renseigné</span>
                  }
                </p>
              </div>

              {/* Badge lié */}
              {contactSelectionne.estLie && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-700 font-semibold text-sm">🤝 Contact lié</p>
                  <p className="text-green-600 text-xs mt-1">
                    Ce contact utilise aussi Ephemer — vos anniversaires sont partagés automatiquement.
                  </p>
                </div>
              )}

            </div>

            {/* --- BOUTONS D'ACTION EN BAS --- */}
            <div className="p-6 border-t border-gray-100 flex flex-col gap-3">
              <button
                onClick={() => {
                  setContactSelectionne(null)
                  router.push(`/contacts/${contactSelectionne.id}/edit`)
                }}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 transition"
              >
                ✏️ Modifier ce contact
              </button>
            </div>

          </div>
        )}
      </div>

    </main>
  )
}
