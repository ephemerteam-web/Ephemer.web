'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  calculerProchainAnniversaire,
  formaterDateFR,
} from '@/lib/anniversaires'

// Type Contact : décrit la forme d'un contact dans notre app
type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null   // ← on ajoute l'email
  estLie?: boolean       // ← badge "lié" (optionnel, calculé après)
}

// Type enrichi : un contact + ses infos d'anniversaire calculées
type ContactAvecAnniv = Contact & {
  joursRestants: number
  ageAVenir: number
  prochainAnniv: Date
}

export default function Dashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsAvecAnniv, setContactsAvecAnniv] = useState<ContactAvecAnniv[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Vérification de la session utilisateur
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/connexion')
        return
      }

      setUserEmail(session.user.email ?? null)

      // Récupération des contacts depuis Supabase
      const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('user_id', session.user.id)
  .order('nom', { ascending: true })

if (error) {
  console.error('Erreur chargement contacts :', error)
} else {
  const liste = data as Contact[]

  // Pour chaque contact avec un email, on vérifie si le lien est mutuel
  const listeAvecLiens = await Promise.all(
    liste.map(async (c) => {
      if (!c.email) return { ...c, estLie: false }
      const { data: lieData } = await supabase.rpc('est_contact_lie', {
        mon_user_id: session.user.id,
        email_du_contact: c.email,
      })
      return { ...c, estLie: lieData === true }
    })
  )

  setContacts(listeAvecLiens)

  const avecAnniv: ContactAvecAnniv[] = listeAvecLiens
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

  // Déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  // Couleur du badge selon la proximité
  const couleurBadge = (jours: number) => {
    if (jours === 0) return 'bg-red-100 text-red-600'
    if (jours <= 7) return 'bg-orange-100 text-orange-600'
    if (jours <= 30) return 'bg-yellow-100 text-yellow-700'
    return 'bg-purple-100 text-purple-600'
  }

  // Texte du badge
  const texteBadge = (jours: number) => {
    if (jours === 0) return '🎉 Aujourd\'hui !'
    if (jours === 1) return '⏰ Demain !'
    return `Dans ${jours} j`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 animate-pulse">Chargement...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Barre de navigation */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-purple-600">💜 RelAtion</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{userEmail}</span>
 <button
      onClick={() => router.push('/profil')}
      className="text-sm text-purple-500 hover:text-purple-700 transition"
    >
      👤 Profil
    </button>

          <button
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-600 transition"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Contenu principal */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Message de bienvenue */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Bonjour 👋
          </h2>
          <p className="text-gray-400 mt-1">
            Voici un aperçu de tes contacts et anniversaires à venir.
          </p>
        </div>

        {/* Grille de cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Carte : Prochains anniversaires */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700 text-lg">🎂 Prochains anniversaires</h3>
              <span className="text-xs text-gray-400">{contactsAvecAnniv.length} avec date</span>
            </div>

            {contactsAvecAnniv.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucun contact avec une date de naissance pour l'instant.
              </p>
            ) : (
              <ul className="space-y-3">
                {contactsAvecAnniv.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition"
                  >
                    {/* Infos du contact */}
                    <div>
                      <p className="font-medium text-gray-800">
                        {c.prenom} {c.nom}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formaterDateFR(c.prochainAnniv)} · {c.ageAVenir} ans
                      </p>
                    </div>

                    {/* Badge + bouton générer */}
<div className="flex flex-col items-end gap-2">
  <span
    className={`text-xs font-semibold px-3 py-1 rounded-full ${couleurBadge(c.joursRestants)}`}
  >
    {texteBadge(c.joursRestants)}
  </span>
  <button
    onClick={() =>
      router.push(
        `/dashboard/generate?prenom=${encodeURIComponent(c.prenom)}&nom=${encodeURIComponent(c.nom)}&relation=${encodeURIComponent(c.relation)}&age=${c.ageAVenir}`
)
    }
    className="text-xs text-purple-500 hover:text-purple-700 underline transition"
  >
    ✍️ Générer un message
  </button>
</div>

                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Carte : Liste de tous les contacts */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700 text-lg">👥 Mes contacts</h3>
              <button
                onClick={() => router.push('/contacts/nouveau')}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition"
              >
                + Ajouter
              </button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucun contact pour l'instant.
              </p>
            ) : (
              <ul className="space-y-2">
                {contacts.map((c) => (
                  <li
  key={c.id}
  className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-gray-50 transition"
>
  <span className="font-medium text-gray-800">
    {c.prenom} {c.nom}
  </span>
  <div className="flex items-center gap-2">
  <span className="text-xs text-gray-400 capitalize">
    {c.relation}
  </span>

  {/* Badge lié — visible uniquement si le lien est mutuel */}
  {c.estLie && (
    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
      🤝 Lié
    </span>
  )}

  <button
    onClick={() => router.push(`/contacts/${c.id}/edit`)}
    className="text-xs text-purple-400 hover:text-purple-600 border border-purple-100 px-2 py-1 rounded-lg transition"
  >
    ✏️ Modifier
  </button>
</div>

</li>

                ))}
              </ul>
            )}
          </div>

          {/* Carte placeholder : Générateur de messages */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-dashed border-purple-100">
            <div className="text-3xl mb-3">✍️</div>
            <h3 className="font-bold text-gray-700">Générateur de messages</h3>
            <p className="text-sm text-gray-400 mt-1">
              Prochaine étape : générer automatiquement un message personnalisé pour chaque anniversaire.
            </p>
          </div>

          {/* Carte placeholder : Éphéméride */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-dashed border-purple-100">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-bold text-gray-700">Éphéméride</h3>
            <p className="text-sm text-gray-400 mt-1">
              Prochaine étape : détecter la fête de chaque prénom (ex: Saint-Joseph le 19 mars).
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}
