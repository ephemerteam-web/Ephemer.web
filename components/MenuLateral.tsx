'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import PushPermissionButton from './PushPermissionButton'

type MenuLateralProps = {
  ouvert: boolean
  onFermer: () => void
  user: { email: string; prenom?: string } | null
}

// ============================================
// 📂 STRUCTURE : sections du menu profil
// ============================================
type MenuItem = { label: string; chemin?: string; icone: string; action?: () => void; couleur?: string }
type MenuSection = { titre: string; items: MenuItem[] }

export default function MenuLateral({ ouvert, onFermer, user }: MenuLateralProps) {
  const router = useRouter()

  // Bloque le scroll quand ouvert
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

  // Initiale pour l'avatar
  const initiale = user?.prenom ? user.prenom.charAt(0).toUpperCase() : null

  // ============================================
  // 📂 SECTIONS du menu
  // ============================================
  const SECTIONS: MenuSection[] = [
    {
      titre: 'Général',
      items: [
        { label: 'Mon profil', chemin: '/dashboard/profil', icone: '👤' },
        // À décommenter quand prêt :
        // { label: 'Réglages', chemin: '/dashboard/reglages', icone: '⚙️' },
      ],
    },
    {
      titre: 'Notifications',
      items: [
        // Note : ce bouton est spécial (composant externe), on le gère séparément plus bas
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
          couleur: 'red', // Section rouge/danger
        },
      ],
    },
  ]

  let compteurItem = 0

  return (
    <>
      {/* ═══════════ OVERLAY ═══════════ */}
      <div
        onClick={onFermer}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          ouvert ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ═══════════ DRAWER (glisse depuis la DROITE) ═══════════ */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-80 bg-[#0B1120] border-l border-[#C8A84E]/20 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          ouvert ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Décor : étoiles discrètes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] right-[15%] w-1 h-1 bg-[#C8A84E]/40 rounded-full" />
          <div className="absolute top-[50%] left-[10%] w-0.5 h-0.5 bg-[#C8A84E]/30 rounded-full" />
          <div className="absolute bottom-[30%] right-[20%] w-1 h-1 bg-[#C8A84E]/20 rounded-full" />
          {/* Halo en haut à gauche */}
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#C8A84E]/5 blur-3xl" />
        </div>

        {/* ─────────── EN-TÊTE : PROFIL ─────────── */}
        <div className="relative p-6 border-b border-[#C8A84E]/10 bg-gradient-to-br from-[#1B2A4A]/40 to-transparent">
          {/* Bouton fermer */}
          <button
            onClick={onFermer}
            aria-label="Fermer le menu"
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-[#C8A84E] hover:bg-white/5 rounded-lg transition hover:rotate-90 duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Avatar + infos utilisateur */}
          <div
            className={`flex flex-col items-center text-center mt-2 transition-all duration-500 ${
              ouvert ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            {/* Avatar animé */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C8A84E]/30 to-[#C8A84E]/10 border-2 border-[#C8A84E]/40 flex items-center justify-center mb-4 shadow-lg hover:shadow-[0_0_20px_rgba(200,168,78,0.3)] transition-shadow duration-300">
              {initiale ? (
                <span className="text-[#C8A84E] font-bold text-3xl">{initiale}</span>
              ) : (
                <svg className="w-10 h-10 text-[#C8A84E]/70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>

            <p className="text-white font-bold text-lg tracking-wide">{user?.prenom || 'Mon compte'}</p>
            {user?.email && (
              <p className="text-white/50 text-xs mt-2 truncate max-w-full px-4 font-mono">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* ─────────── NAVIGATION : SECTIONS ─────────── */}
        <nav className="relative flex-1 flex flex-col py-4 overflow-y-auto">
          {SECTIONS.map((section, indexSection) => (
            <div key={section.titre}>
              {/* Titre de section */}
              {section.items.length > 0 && (
                <p className="px-6 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#C8A84E]/50">
                  {section.titre}
                </p>
              )}

              {/* Items de la section */}
              {section.items.map((item) => {
                const delai = compteurItem * 50
                compteurItem++

                // Classes conditionnelles selon la couleur
                const estDanger = item.couleur === 'red'
                const bgActive = estDanger ? 'bg-red-500/10' : 'bg-[#C8A84E]/10'
                const textHover = estDanger ? 'hover:text-red-400' : 'hover:text-[#C8A84E]'

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
                    className={`group w-full px-6 py-3 text-left text-sm flex items-center gap-3 transition-all duration-300 ${
                      ouvert ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                    } text-white/70 ${textHover} hover:${bgActive}`}
                  >
                    {/* Icône : glisse + pulse au survol */}
                    <span className="text-lg transition-transform duration-300 group-hover:-translate-x-1 group-hover:scale-110">
                      {item.icone}
                    </span>
                    <span className="transition-transform duration-300 group-hover:-translate-x-1">
                      {item.label}
                    </span>

                    {/* Flèche discrète au survol (pour les liens) */}
                    {item.chemin && (
                      <span className="ml-auto text-white/40 group-hover:text-white/60 transition-all duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {/* ─────────── SECTION NOTIFICATIONS (spéciale) ─────────── */}
          <div className="mt-2">
            <p className="px-6 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#C8A84E]/50">
              Notifications
            </p>
            <div
              style={{
                transitionDelay: ouvert ? `${compteurItem * 50}ms` : '0ms',
              }}
              className={`px-6 py-3 transition-all duration-300 ${
                ouvert ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
            >
              <PushPermissionButton />
            </div>
          </div>
        </nav>

        {/* ─────────── PIED ─────────── */}
        <div className="relative px-6 py-4 border-t border-white/5">
          <p className="text-white/20 text-xs text-center tracking-wide">Ephemer • v1.0</p>
        </div>
      </aside>
    </>
  )
}
