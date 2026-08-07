'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import PushPermissionButton from './PushPermissionButton'

type MenuLateralProps = {
  ouvert: boolean
  onFermer: () => void
  user: { email: string; prenom?: string } | null
}

type MenuItem = {
  label: string
  chemin?: string
  icone: string
  action?: () => void
  couleur?: string
}

type MenuSection = {
  titre: string
  items: MenuItem[]
}

export default function MenuLateral({ ouvert, onFermer, user }: MenuLateralProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [translateX, setTranslateX] = useState(0)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    document.body.style.overflow = ouvert ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [ouvert])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  const naviguerVers = (chemin: string) => {
    onFermer()
    router.push(chemin)
  }

  const initiale = user?.prenom ? user.prenom.charAt(0).toUpperCase() : null

  // =========================
  // 👇 GESTION DU SWIPE
  // =========================
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return

    const currentX = e.touches[0].clientX
    const diff = currentX - startX.current

    // Swipe vers la droite uniquement
    if (diff > 0) {
      setTranslateX(diff)
    }
  }

  const handleTouchEnd = () => {
    if (translateX > 100) {
      onFermer()
    }
    setTranslateX(0)
    startX.current = null
  }

  const SECTIONS: MenuSection[] = [
    {
      titre: 'Général',
      items: [
        { label: 'Mon profil', chemin: '/dashboard/profil', icone: '👤' },
      ],
    },
    {
      titre: 'Notifications',
      items: [
        { label: 'Centre de notifications', chemin: '/dashboard/notifications', icone: '🔔' },
      ],
    },
    {
      titre: 'Compte',
      items: [
        {
          label: 'Déconnexion',
          icone: '🚪',
          action: () => {
            onFermer()
            handleLogout()
          },
          couleur: 'red',
        },
      ],
    },
  ]

  let compteurItem = 0

  return (
    <>
      {/* OVERLAY */}
      <div
        onClick={onFermer}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
          ouvert ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* DRAWER */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: ouvert
            ? `translateX(${translateX}px)`
            : 'translateX(100%)',
          transition: translateX === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-80 
        bg-background/95 backdrop-blur-xl border-l border-foreground/10 
        shadow-2xl flex flex-col"
      >
        {/* HEADER */}
        <div className="relative p-6 border-b border-foreground/10">
          <button
            onClick={onFermer}
            className="absolute top-4 right-4 p-2 text-foreground/60"
          >
            ✕
          </button>

          <div className="flex flex-col items-center text-center mt-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              {initiale ? (
                <span className="text-primary font-bold text-3xl">{initiale}</span>
              ) : (
                <span className="text-primary text-xl">👤</span>
              )}
            </div>

            <p className="text-foreground font-semibold text-lg">
              {user?.prenom || 'Mon compte'}
            </p>

            {user?.email && (
              <p className="text-foreground/40 text-xs mt-1 truncate">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto py-4">
          {SECTIONS.map((section) => (
            <div key={section.titre} className="mb-4">
              <p className="px-6 pb-2 text-[11px] uppercase text-foreground/30">
                {section.titre}
              </p>

              {section.items.map((item) => {
                const estActif = item.chemin && pathname === item.chemin
                const estDanger = item.couleur === 'red'
                const delai = compteurItem * 40
                compteurItem++

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.chemin) naviguerVers(item.chemin)
                      if (item.action) item.action()
                    }}
                    style={{
                      transitionDelay: ouvert ? `${delai}ms` : '0ms',
                    }}
                    className={`w-full px-6 py-3 flex items-center gap-3 text-sm transition-all duration-300 active:scale-[0.97] ${
                      estActif
                        ? 'text-primary bg-primary/10'
                        : estDanger
                        ? 'text-foreground/70 hover:text-destructive'
                        : 'text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    <span>{item.icone}</span>
                    <span className="flex-1 text-left">{item.label}</span>

                    {estActif && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          <div className="px-6 mt-4">
            <PushPermissionButton />
          </div>
        </nav>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-foreground/5 text-center">
          <p className="text-foreground/20 text-xs">Ephemer • v1.0</p>
        </div>
      </aside>
    </>
  )
}