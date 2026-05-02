'use client'

import { useRouter } from 'next/navigation'
import { useDrawer } from '@/lib/DrawerContext'
import { TYPES_RELATION } from '@/lib/constants'

export default function DrawerGlobal() {
  const router = useRouter()
  const { contactAffiche, fermerDrawer } = useDrawer()

  const formaterDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const couleurRelation = (relation: string) => {
    const config = TYPES_RELATION.find(t => t.value === relation)
    if (!config) return 'bg-white/10 text-indigo-200 border border-white/20'
    return config.couleur
  }

  const emojiRelation = (relation: string) => {
    const config = TYPES_RELATION.find(t => t.value === relation)
    return config?.emoji ?? ''
  }

  return (
    <>
      {/* OVERLAY */}
      {contactAffiche && (
        <div
          className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm"
          onClick={fermerDrawer}
        />
      )}

      {/* DRAWER */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-sm z-[9999]
          bg-indigo-950/95 backdrop-blur-xl border-l border-white/10
          shadow-2xl transform transition-transform duration-300 ease-in-out
          ${contactAffiche ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {contactAffiche && (
          <div className="h-full flex flex-col overflow-y-auto">

            {/* En-tête */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white sticky top-0">
              <button
                onClick={fermerDrawer}
                className="mb-4 text-white/70 hover:text-white text-sm flex items-center gap-1 transition"
              >
                ✕ Fermer
              </button>

              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-2xl font-bold">
                  {contactAffiche.prenom[0]}{contactAffiche.nom[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {contactAffiche.prenom} {contactAffiche.nom}
                  </h2>
                  {contactAffiche.est_favori && (
                    <span className="text-lg">⭐ Contact favori</span>
                  )}
                </div>
              </div>

              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${couleurRelation(contactAffiche.relation)}`}>
                {emojiRelation(contactAffiche.relation)} {contactAffiche.relation}
              </span>
            </div>

            {/* Corps */}
            <div className="p-6 flex flex-col gap-4 flex-1">

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-2">🎂 Date de naissance</p>
                <p className="text-white font-medium">
                  {contactAffiche.date_naissance
                    ? formaterDate(contactAffiche.date_naissance)
                    : <span className="text-indigo-400 italic">Non renseignée</span>}
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-2">✉️ Email</p>
                <p className="text-white font-medium">
                  {contactAffiche.email
                    ? <a href={`mailto:${contactAffiche.email}`} className="text-indigo-300 hover:text-white hover:underline transition">{contactAffiche.email}</a>
                    : <span className="text-indigo-400 italic">Non renseigné</span>}
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-2">📱 Téléphone</p>
                <p className="text-white font-medium">
                  {contactAffiche.telephone_numero
                    ? <a href={`tel:${contactAffiche.telephone_indicatif}${contactAffiche.telephone_numero}`} className="text-indigo-300 hover:text-white hover:underline transition">{contactAffiche.telephone_indicatif} {contactAffiche.telephone_numero}</a>
                    : <span className="text-indigo-400 italic">Non renseigné</span>}
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-2">📝 Notes</p>
                <p className="text-white font-medium">
                  {contactAffiche.note
                    ? <span className="text-indigo-100 whitespace-pre-wrap">{contactAffiche.note}</span>
                    : <span className="text-indigo-400 italic">Aucune note</span>}
                </p>
              </div>

              {contactAffiche.estLie && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-300 font-semibold text-sm">🤝 Contact lié</p>
                  <p className="text-green-400/80 text-xs mt-1">
                    Ce contact utilise aussi Ephemer — vos anniversaires sont partagés automatiquement.
                  </p>
                </div>
              )}

            </div>

            {/* Bouton modifier */}
            <div className="p-6 border-t border-white/10 sticky bottom-0 bg-indigo-950/95">
              <button
                onClick={() => {
                  const id = contactAffiche.id
                  fermerDrawer()
                  router.push(`/dashboard/contacts/${id}/modifier`)
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition border border-indigo-400/50"
              >
                ✏️ Modifier ce contact
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
