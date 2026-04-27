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
  est_favori: boolean // 👈 NOUVEAU
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
        .order('est_favori', { ascending: false }) // 👈 Les favoris apparaissent en premier
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

  if (loading) return <p className="p-8 text-center text-gray-400">Chargement...</p>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* En-tête */}
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

        {/* Liste */}
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-center mt-12">Aucun contact pour le moment.</p>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setContactSelectionne(contact)}
                className={`
                  relative rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all
                  ${contact.est_favori
                    // ✨ Style carte favori : fond doré subtil + bordure or + légère lueur
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-yellow-100 shadow-md hover:shadow-yellow-200 hover:shadow-lg'
                    // Style carte normale
                    : 'bg-white border border-gray-100 hover:shadow-md'
                  }
                `}
              >
                {/* Bandeau "FAVORI" en coin pour les favoris */}
                {contact.est_favori && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    ⭐ Favori
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* Avatar cercle avec initiales */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                    ${contact.est_favori
                      ? 'bg-yellow-400 text-white'
                      : 'bg-indigo-100 text-indigo-600'
                    }
                  `}>
                    {contact.prenom[0]}{contact.nom?.[0] || ''}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-800">
                      {contact.prenom} {contact.nom}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{contact.relation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {contact.estLie && (
                    <span className="text-xs bg-green-100 text-green-600 font-medium px-2 py-1 rounded-full">
                      🤝 Lié
                    </span>
                  )}
                  {contact.date_naissance && (
                    <span className="text-gray-400">🎂</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // 👈 Empêche l'ouverture du drawer quand on clique Modifier
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

      {/* ===== DRAWER (panneau latéral) ===== */}
      {/* Fond sombre derrière le drawer — clic dessus = ferme */}
      {contactSelectionne && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setContactSelectionne(null)}
        />
      )}

      {/* Le drawer lui-même */}
      <div className={`
        fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${contactSelectionne ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {contactSelectionne && (
          <>
            {/* Header du drawer */}
            <div className={`p-6 ${contactSelectionne.est_favori ? 'bg-gradient-to-r from-yellow-400 to-amber-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {/* Grand avatar */}
                  <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center text-xl font-bold text-white">
                    {contactSelectionne.prenom[0]}{contactSelectionne.nom?.[0] || ''}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {contactSelectionne.prenom} {contactSelectionne.nom}
                    </h2>
                    <p className="text-white/80 text-sm capitalize">{contactSelectionne.relation}</p>
                  </div>
                </div>
                <button
                  onClick={() => setContactSelectionne(null)}
                  className="text-white/80 hover:text-white text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
              {contactSelectionne.est_favori && (
                <div className="mt-3 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  ⭐ Contact favori
                </div>
              )}
            </div>

            {/* Corps du drawer */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Date de naissance</p>
                  <p className="text-gray-700 mt-1">
                    {contactSelectionne.date_naissance
                      ? new Date(contactSelectionne.date_naissance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : <span className="text-gray-400 italic">Non renseignée</span>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Email</p>
                  <p className="text-gray-700 mt-1">
                    {contactSelectionne.email
                      ? <a href={`mailto:${contactSelectionne.email}`} className="text-indigo-600 hover:underline">{contactSelectionne.email}</a>
                      : <span className="text-gray-400 italic">Non renseigné</span>
                    }
                  </p>
                </div>
              </div>

              {contactSelectionne.estLie && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-700 font-semibold text-sm">🤝 Contact lié</p>
                  <p className="text-green-600 text-xs mt-1">
                    Ce contact utilise aussi Ephemer.
                  </p>
                </div>
              )}

            </div>

            {/* Bouton modifier en bas */}
            <div className="p-6 border-t border-gray-100">
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
          </>
        )}
      </div>

    </main>
  )
}
