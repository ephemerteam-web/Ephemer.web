'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type MenuNavigationProps = {
  ouvert: boolean
  onFermer: () => void
}

// ============================================
// 📂 STRUCTURE : pages regroupées par catégorie
// ============================================
type Page = { label: string; chemin: string; icone: string }
type Groupe = { titre: string; pages: Page[] }

const GROUPES: Groupe[] = [
  {
    titre: 'Principal',
    pages: [
      { label: 'Dashboard', chemin: '/dashboard', icone: '🏠' },
    ],
  },
  {
    titre: 'Éphéméride',
    pages: [
      { label: 'Anniversaires', chemin: '/dashboard/anniversaires', icone: '🎂' },
      { label: 'Calendrier', chemin: '/dashboard/calendrier', icone: '📅' },
      { label: 'Calendrier des Saints', chemin: '/dashboard/calendrier_saints', icone: '✝️' },
    ],
  },
  {
    titre: 'Créer & Planifier',
    pages: [
      { label: 'Générer un message', chemin: '/dashboard/generate', icone: '✨' },
      { label: 'Idées cadeaux', chemin: '/dashboard/gift-ideas', icone: '🎁' },
      { label: 'Messages programmés', chemin: '/dashboard/messages-programmes', icone: '📨' },
    ],
  },
  {
    titre: 'Mes données',
    pages: [
      { label: 'Contacts', chemin: '/dashboard/contacts', icone: '👥' },
    ],
  },
]

export default function MenuNavigation({ ouvert, onFermer }: MenuNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  // États pour le swipe tactile
  const [translateX, setTranslateX] = useState(0)
  const startX = useRef<number | null>(null)

  // Bloque le scroll de la page quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = ouvert ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [ouvert])

  const naviguerVers = (chemin: string) => {
    onFermer()
    router.push(chemin)
  }

  // =========================
  // 👇 GESTION DU SWIPE
  // =========================
  const handleTouchStart = (e: React.TouchEvent) => {
    // On enregistre la position X du doigt au début du touch
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return

    const currentX = e.touches[0].clientX
    const diff = currentX - startX.current

    // Swipe vers la GAUCHE uniquement (diff négatif) pour fermer le menu qui vient de la gauche
    if (diff < 0) {
      setTranslateX(diff)
    }
  }

  const handleTouchEnd = () => {
    // Si on a glissé de plus de 100px vers la gauche, on ferme
    if (translateX < -100) {
      onFermer()
    }
    // Sinon, on remet à zéro (le menu revient à sa place)
    setTranslateX(0)
    startX.current = null
  }

  // On aplatit tous les liens pour calculer le délai d'animation en cascade
  let compteurLien = 0

  return (
    <>
      {/* ═══════════ OVERLAY (fond sombre flou) ═══════════ */}
      <div
        onClick={onFermer}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          ouvert ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ═══════════ DRAWER (glisse depuis la gauche) ═══════════ */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          // Si translateX n'est pas 0, on l'applique (pendant le swipe)
          // Sinon, on utilise la classe CSS normale (ouvert/fermé)
          transform: translateX !== 0 
            ? `translateX(${translateX}px)` 
            : undefined,
          // Pendant le swipe, pas de transition (pour suivre le doigt)
          // Quand on relâche, on active la transition pour l'effet de rebond
          transition: translateX !== 0 ? 'none' : 'transform 0.3s ease-out',
        }}
        className={`fixed top-0 left-0 z-50 h-full w-full sm:w-72 bg-[#0B1120] border-r border-[#C8A84E]/20 shadow-2xl flex flex-col ${
          // Si on ne swype pas, on utilise les classes Tailwind normales
          translateX === 0 && (ouvert ? 'translate-x-0' : '-translate-x-full')
        }`}
      >
        {/* Décor : étoiles discrètes en fond du menu */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[12%] left-[15%] w-1 h-1 bg-[#C8A84E]/40 rounded-full" />
          <div className="absolute top-[40%] right-[20%] w-0.5 h-0.5 bg-[#C8A84E]/30 rounded-full" />
          <div className="absolute top-[70%] left-[25%] w-1 h-1 bg-[#C8A84E]/20 rounded-full" />
          {/* Halo doré en haut à droite */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#C8A84E]/5 blur-3xl" />
        </div>

        {/* ─────────── EN-TÊTE ─────────── */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-[#C8A84E]/10">
          <div className="flex items-center gap-2.5">
            {/* Lune avec léger effet de pulsation */}
            <svg
              className="w-7 h-7 text-[#C8A84E] animate-pulse"
              style={{ animationDuration: '3s' }}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#1B2A4A" />
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
            </svg>
            <span className="text-white font-black text-lg tracking-wide">Ephemer</span>
          </div>

          <button
            onClick={onFermer}
            aria-label="Fermer la navigation"
            className="p-2 text-white/60 hover:text-[#C8A84E] hover:bg-white/5 rounded-lg transition hover:rotate-90 duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─────────── NAVIGATION (groupes) ─────────── */}
        <nav className="relative flex-1 flex flex-col py-4 overflow-y-auto">
          {GROUPES.map((groupe) => (
            <div key={groupe.titre} className="mb-2">
              {/* Titre de catégorie */}
              <p className="px-6 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#C8A84E]/50">
                {groupe.titre}
              </p>

              {/* Liens du groupe */}
              {groupe.pages.map((page) => {
                const estActive = pathname === page.chemin
                const delai = compteurLien * 50 // 50ms d'écart entre chaque lien
                compteurLien++

                return (
                  <button
                    key={page.chemin}
                    onClick={() => naviguerVers(page.chemin)}
                    style={{
                      // Animation en cascade : chaque lien apparaît après le précédent
                      transitionDelay: ouvert ? `${delai}ms` : '0ms',
                    }}
                    className={`group w-full px-6 py-3 text-left text-sm flex items-center gap-3 transition-all duration-300 ${
                      ouvert ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    } ${
                      estActive
                        ? 'text-[#C8A84E] bg-[#C8A84E]/10 border-r-2 border-[#C8A84E] font-semibold'
                        : 'text-white/70 hover:text-[#C8A84E] hover:bg-[#C8A84E]/5'
                    }`}
                  >
                    {/* Icône : glisse un peu à droite au survol */}
                    <span className="text-lg transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110">
                      {page.icone}
                    </span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      {page.label}
                    </span>

                    {/* Point lumineux qui pulse sur la page active */}
                    {estActive && (
                      <span className="ml-auto flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#C8A84E]/60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8A84E]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ─────────── PIED ─────────── */}
        <div className="relative px-6 py-4 border-t border-white/5">
          <p className="text-white/20 text-xs text-center tracking-wide">Ephemer • v1.0</p>
        </div>
      </aside>
    </>
  )
}