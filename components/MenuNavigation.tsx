'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type MenuNavigationProps = {
  ouvert: boolean
  onFermer: () => void
}

// Structure des pages de l'app
const PAGES = [
  {
    label: 'Dashboard',
    chemin: '/dashboard',
    icone: '🏠',
  },
  {
    label: 'Anniversaires',
    chemin: '/dashboard/anniversaires',
    icone: '🎂',
  },
  {
    label: 'Calendrier',
    chemin: '/dashboard/calendrier',
    icone: '📅',
    sousPages: [
      { label: 'Calendrier Saints', chemin: '/dashboard/calendrier_saints', icone: '✝️' },
    ]
  },
  {
    label: 'Contacts',
    chemin: '/dashboard/contacts',
    icone: '👥',
  },
  {
    label: 'Générer un message',
    chemin: '/dashboard/generate',
    icone: '✨',
  },
  {
    label: 'Messages programmés',
    chemin: '/dashboard/messages-programmes',
    icone: '📨',
  },
]

export default function MenuNavigation({ ouvert, onFermer }: MenuNavigationProps) {
  const router = useRouter()
  const pathname = usePathname() // pour savoir quelle page est active

  // Bloque le scroll quand ouvert
  useEffect(() => {
    document.body.style.overflow = ouvert ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [ouvert])

  const naviguerVers = (chemin: string) => {
    onFermer()
    router.push(chemin)
  }

  return (
    <>
      {/* OVERLAY */}
      <div
        onClick={onFermer}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          ouvert ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* DRAWER — glisse depuis la GAUCHE */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-full sm:w-72 bg-[#0B1120] border-r border-[#C8A84E]/20 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          ouvert ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* EN-TÊTE */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8A84E]/10">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-[#C8A84E]" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#1B2A4A" />
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1" fill="none" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
            </svg>
            <span className="text-white font-black text-lg">Ephemer</span>
          </div>

          <button
            onClick={onFermer}
            aria-label="Fermer la navigation"
            className="p-2 text-white/60 hover:text-[#C8A84E] hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex flex-col py-4 overflow-y-auto">
          {PAGES.map((page) => {
            const estActive = pathname === page.chemin

            return (
              <div key={page.chemin}>
                {/* Lien principal */}
                <button
                  onClick={() => naviguerVers(page.chemin)}
                  className={`w-full px-6 py-3 text-left text-sm flex items-center gap-3 transition-all ${
                    estActive
                      ? 'text-[#C8A84E] bg-[#C8A84E]/10 border-r-2 border-[#C8A84E] font-semibold'
                      : 'text-white/70 hover:text-[#C8A84E] hover:bg-[#C8A84E]/5'
                  }`}
                >
                  <span className="text-lg">{page.icone}</span>
                  <span>{page.label}</span>
                  {estActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C8A84E]" />}
                </button>

                {/* Sous-pages si elles existent */}
                {page.sousPages?.map((sousPage) => {
                  const sousPageActive = pathname === sousPage.chemin
                  return (
                    <button
                      key={sousPage.chemin}
                      onClick={() => naviguerVers(sousPage.chemin)}
                      className={`w-full pl-14 pr-6 py-2.5 text-left text-sm flex items-center gap-3 transition-all border-l-2 ml-6 ${
                        sousPageActive
                          ? 'text-[#C8A84E] bg-[#C8A84E]/10 border-[#C8A84E] font-semibold'
                          : 'text-white/50 hover:text-[#C8A84E] hover:bg-[#C8A84E]/5 border-white/10'
                      }`}
                    >
                      <span>{sousPage.icone}</span>
                      <span>{sousPage.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* PIED : version app */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-white/5">
          <p className="text-white/20 text-xs text-center">Ephemer • v1.0</p>
        </div>
      </aside>
    </>
  )
}
