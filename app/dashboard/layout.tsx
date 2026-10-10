'use client'
import { DashboardUserContext, type DashboardUser } from '@/components/DashboardUserContext'
import LoadFailure from '@/components/LoadFailure'
import DashboardAvatarProvider from '@/components/avatars/DashboardAvatarContext'
import AccountAvatarBadge from '@/components/avatars/AccountAvatarBadge'

import ContactDraftProvider from '@/components/ContactDraftProvider'
import EtoilesProvider from '@/components/etoiles/EtoilesContext'
import CelestialBackdrop from '@/components/CelestialBackdrop'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { DrawerProvider } from '@/components/DrawerContext'
import DrawerGlobal from '@/components/DrawerGlobal'
import NotificationBell from '@/components/NotificationBell'
import MenuLateral from '@/components/MenuLateral'
import MenuNavigation from '@/components/MenuNavigation'
import OfflineBanner from '@/components/OfflineBanner';
import MainSpaces from '@/components/MainSpaces'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [navOuverte, setNavOuverte] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)

  // On remonte le user ici pour le partager avec MenuLateral ET le bouton
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [retryAuth, setRetryAuth] = useState(0)
  const [authError, setAuthError] = useState(false)
  const accountId = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    let generation = 0
    const timers = new Set<ReturnType<typeof setTimeout>>()
    async function verify(expectedId?: string) {
      const requestId = ++generation
      try {
        const { data: { user: verified }, error } = await supabase.auth.getUser()
        if (!active || requestId !== generation) return
        if (error || !verified || (expectedId && expectedId !== verified.id)) throw new Error('Session indisponible')
        const { data: profil, error: profileError } = await supabase.from('profiles').select('prenom').eq('id', verified.id).maybeSingle()
        if (!active || requestId !== generation) return
        if (profileError) throw new Error('Profil indisponible')
        accountId.current = verified.id
        setAuthError(false)
        setUser({ id: verified.id, email: verified.email || '', prenom: profil?.prenom ?? undefined })
      } catch {
        if (active && requestId === generation) { setUser(null); setAuthError(true) }
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        generation++
        accountId.current = null
        setUser(null)
        router.replace('/connexion')
      } else if (event === 'SIGNED_IN' && session && accountId.current !== session.user.id) {
        generation++
        accountId.current = session.user.id
        setUser(null)
        // Auth interdit ses propres appels synchrones dans ce callback.
        const timer = setTimeout(() => { timers.delete(timer); if (active) void verify(session.user.id) }, 0)
        timers.add(timer)
      }
    })
    void verify()
    return () => { active = false; generation++; subscription.unsubscribe(); timers.forEach(clearTimeout) }
  }, [router, retryAuth])

  // Calcule l'initiale à afficher dans le bouton
  const initiale = user?.prenom
    ? user.prenom.charAt(0).toUpperCase()
    : null

  if (!user) return authError
    ? <LoadFailure message="Session indisponible. Réessaie ou reconnecte-toi." retry={() => { setAuthError(false); setRetryAuth(value => value + 1) }} />
    : <main className="p-8 text-ink" role="status">Vérification de la session…</main>

  return (
    <DashboardUserContext.Provider key={user.id} value={user}><DashboardAvatarProvider ownerId={user.id}><ContactDraftProvider><EtoilesProvider><DrawerProvider>
      <div className="min-h-screen bg-canvas relative isolate">

        <CelestialBackdrop />

        <OfflineBanner />

        {/* HEADER */}
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-canvas/70 border-b border-accent/10">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">

  <div className="flex items-center gap-3">
    {/* BURGER NAVIGATION — à gauche */}
    <button
      onClick={() => setNavOuverte(true)}
      aria-label="Ouvrir la navigation"
      className="p-2 text-muted hover:text-accent bg-ink/5 hover:bg-action/10 rounded-lg transition border border-line hover:border-accent/30"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    {/* LOGO */}
    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
      <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#1B2A4A" />
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="15" cy="9" r="1" fill="currentColor" />
      </svg>
      <span className="text-xl font-black text-ink hidden sm:inline">Ephemer</span>
    </Link>
  </div>

  {/* DROITE : cloche + avatar */}
  <div className="flex items-center gap-2">

    <NotificationBell />
    <button
      onClick={() => setMenuOuvert(true)}
      aria-label="Ouvrir le menu"
      className="relative w-10 h-10 rounded-full bg-gradient-to-br from-action/30 to-action/10 border-2 border-accent/40 hover:border-accent hover:scale-105 transition-all duration-200 flex items-center justify-center"
    >
      <AccountAvatarBadge initiale={initiale} />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-canvas" />
    </button>
  </div>
</div>
</header>

        {/* MENU LATÉRAL — on lui passe user pour éviter qu'il le recharge */}
        <MenuLateral
          ouvert={menuOuvert}
          onFermer={() => setMenuOuvert(false)}
          user={user}
        />
        <MenuNavigation
  ouvert={navOuverte}
  onFermer={() => setNavOuverte(false)}
/>

        <MainSpaces />
        <main className="relative z-10 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <DrawerGlobal />

      </div>
    </DrawerProvider></EtoilesProvider></ContactDraftProvider></DashboardAvatarProvider></DashboardUserContext.Provider>
  )
}
