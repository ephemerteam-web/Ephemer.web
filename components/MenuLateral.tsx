'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

type MenuLateralProps = {
  ouvert: boolean
  onFermer: () => void
  // user est maintenant reçu du parent
  user: { email: string; prenom?: string } | null
}

export default function MenuLateral({ ouvert, onFermer, user }: MenuLateralProps) {
  const router = useRouter()

  // Bloque le scroll quand ouvert
  useEffect(() => {
    document.body.style.overflow = ouvert ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [ouvert])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  const naviguerVers = (chemin: string) => {
    onFermer()
    router.push(chemin)
  }

  // Initiale pour l'avatar dans le header du drawer
  const initiale = user?.prenom
    ? user.prenom.charAt(0).toUpperCase()
    : null

  return (
    <>
      {/* OVERLAY */}
      <div
        onClick={onFermer}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          ouvert ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* DRAWER */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-80 bg-[#0B1120] border-l border-[#C8A84E]/20 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          ouvert ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* EN-TÊTE PROFIL */}
        <div className="relative p-6 border-b border-[#C8A84E]/10 bg-gradient-to-br from-[#1B2A4A]/40 to-transparent">
          <button
            onClick={onFermer}
            aria-label="Fermer le menu"
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-[#C8A84E] hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col items-center text-center mt-2">
            {/* Même avatar que dans le header */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C8A84E]/30 to-[#C8A84E]/10 border-2 border-[#C8A84E]/40 flex items-center justify-center mb-3">
              {initiale ? (
                <span className="text-[#C8A84E] font-bold text-3xl">{initiale}</span>
              ) : (
                <svg className="w-10 h-10 text-[#C8A84E]/70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              )}
            </div>
            <p className="text-white font-semibold text-lg">
              {user?.prenom || 'Mon compte'}
            </p>
            {user?.email && (
              <p className="text-white/50 text-sm mt-1 truncate max-w-full px-4">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex flex-col py-2">
          <button
            onClick={() => naviguerVers('/dashboard/profil')}
            className="px-6 py-3 text-left text-sm text-white/80 hover:text-[#C8A84E] hover:bg-[#C8A84E]/10 transition flex items-center gap-3"
          >
            <span className="text-lg">👤</span>
            <span>Mon profil</span>
          </button>

          {/* Futurs boutons ici */}
          {/* <button onClick={() => naviguerVers('/dashboard/reglages')} ...>⚙️ Réglages</button> */}

          <div className="my-2 border-t border-white/5" />

          <button
            onClick={() => { onFermer(); handleLogout() }}
            className="px-6 py-3 text-left text-sm text-white/80 hover:text-red-400 hover:bg-red-500/10 transition flex items-center gap-3"
          >
            <span className="text-lg">🚪</span>
            <span>Déconnexion</span>
          </button>
        </nav>
      </aside>
    </>
  )
}
