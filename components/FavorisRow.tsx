'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDrawer } from '@/components/DrawerContext'

// Type complet correspondant à un favori (doit refléter la table contacts)
type Favori = {
  id: string
  nom: string | null
  prenom: string | null
  date_naissance: string | null
  est_favori?: boolean
  email: string | null
  telephone_indicatif: string | null
  telephone_numero: string | null
  relation: string | null
  note: string | null
  prochainEvent: {
    type: 'anniversaire' | 'fete_prenom'
    date: Date
    jours: number
  } | null
}

type Props = {
  favoris: Favori[]
  favoriMenuOuvert: string | null
  setFavoriMenuOuvert: (id: string | null) => void
  couleurAvatar: (texte: string | null | undefined) => string
}

export default function FavorisRow({
  favoris,
  favoriMenuOuvert,
  setFavoriMenuOuvert,
  couleurAvatar,
}: Props) {
  const router = useRouter()
  const { ouvrirDrawer } = useDrawer()
  const conteneurRef = useRef<HTMLDivElement>(null)

  // Ferme le menu quand on clique ailleurs sur la page
  useEffect(() => {
    if (!favoriMenuOuvert) return

    const handleClickOutside = (e: MouseEvent) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setFavoriMenuOuvert(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [favoriMenuOuvert, setFavoriMenuOuvert])

  if (favoris.length === 0) return null

  return (
    <div className="mb-8" ref={conteneurRef}>
      {/* En-tête de la section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-bold text-white">
          ⭐ Mes favoris
        </h2>
        <Link
          href="/dashboard/contacts"
          className="text-indigo-300/70 hover:text-indigo-200 text-xs transition-colors"
        >
          Gérer →
        </Link>
      </div>

      {/* Rangée qui défile horizontalement sur mobile */}
      <div className="flex gap-4 overflow-x-auto overflow-y-visible pb-2 -mx-1 px-1 scrollbar-hide md:flex-wrap md:overflow-x-visible">
        {favoris.map((fav) => {
          const initiales =
            `${fav.prenom?.[0] ?? ''}${fav.nom?.[0] ?? ''}`.toUpperCase()
          const ev = fav.prochainEvent
          const afficheBadge = ev && ev.jours >= 0 && ev.jours <= 30
          const menuOuvert = favoriMenuOuvert === fav.id

          // Objet contact complet pour le drawer (tous les champs de la table)
          const contactPourDrawer = {
            id: fav.id,
            nom: fav.nom,
            prenom: fav.prenom,
            date_naissance: fav.date_naissance,
            est_favori: fav.est_favori ?? false,
            email: fav.email,
            telephone_indicatif: fav.telephone_indicatif,
            telephone_numero: fav.telephone_numero,
            relation: fav.relation,
            note: fav.note,
            // On n’inclut PAS est_lie/estLie car cela n'existe pas dans la base
          }

          return (
            <div
              key={fav.id}
              className="relative flex-shrink-0 flex flex-col items-center w-[72px]"
            >
              {/* Avatar cliquable */}
              <button
                onClick={() =>
                  setFavoriMenuOuvert(menuOuvert ? null : fav.id)
                }
                className="relative group"
                aria-label={`Menu de ${fav.prenom} ${fav.nom}`}
              >
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${couleurAvatar(
                    fav.prenom
                  )} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform`}
                >
                  {initiales || '?'}
                </div>

                {/* Badge événement proche */}
                {afficheBadge && ev && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#1e1b4b] whitespace-nowrap pointer-events-none">
                    {ev.type === 'anniversaire' ? '🎂' : '🙏'}{' '}
                    {ev.jours === 0 ? 'J' : `J-${ev.jours}`}
                  </span>
                )}
              </button>

              {/* Prénom */}
              <p className="text-white text-xs mt-2 text-center truncate w-full">
                {fav.prenom}
              </p>

              {/* Menu contextuel */}
              {menuOuvert && (
                <div
                  className={`
                    z-50 bg-[#221f47] border border-white/15 rounded-xl shadow-2xl p-1 min-w-[170px]
                    animate-[fadeIn_0.15s_ease]
                    /* Desktop : attaché à l'avatar */
                    md:absolute md:top-16 md:left-1/2 md:-translate-x-1/2
                    /* Mobile : flottant en bas de l'écran */
                    max-sm:fixed max-sm:bottom-4 max-sm:left-1/2 max-sm:-translate-x-1/2
                    max-sm:w-[calc(100%-2rem)] max-sm:max-w-xs
                  `}
                >
                  <button
                    onClick={() => {
                      ouvrirDrawer(contactPourDrawer)
                      setFavoriMenuOuvert(null)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    👤 Voir la fiche
                  </button>

                  <button
                    onClick={() => {
                      const type = ev?.type ?? 'anniversaire'
                      setFavoriMenuOuvert(null)
                      router.push(
                        `/dashboard/generate?contactId=${fav.id}&eventType=${type}`
                      )
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    ✨ Générer un message
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
