'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { DrawerProvider } from '@/components/DrawerContext'
import DrawerGlobal from '@/components/DrawerGlobal'
import NotificationBell from '@/components/NotificationBell'
import MenuLateral from '@/components/MenuLateral'
import { Analytics } from "@vercel/analytics/next"
import MenuNavigation from '@/components/MenuNavigation'
import OfflineBanner from '@/components/OfflineBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const estPageAccueilDashboard = pathname === '/dashboard'
  const [navOuverte, setNavOuverte] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)

  // On remonte le user ici pour le partager avec MenuLateral ET le bouton
  const [user, setUser] = useState<{ email: string; prenom?: string } | null>(null)

  useEffect(() => {
    const chargerUser = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      if (supabaseUser) {
        const { data: profil } = await supabase
          .from('profiles') // ⚠️ adapte si besoin
          .select('prenom')
          .eq('id', supabaseUser.id)
          .single()

        setUser({
          email: supabaseUser.email || '',
          prenom: profil?.prenom,
        })
      }
    }
    chargerUser()
  }, [])

  // Calcule l'initiale à afficher dans le bouton
  const initiale = user?.prenom
    ? user.prenom.charAt(0).toUpperCase()
    : null

  return (
    <DrawerProvider>
      <div className="min-h-screen bg-[#0B1120]">

        {/* Étoiles déco (inchangé) */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[20%] w-1 h-1 bg-[#C8A84E] rounded-full shadow-[0_0_6px_2px_rgba(200,168,78,0.4)]" />
          <div className="absolute top-[25%] left-[35%] w-0.5 h-0.5 bg-[#C8A84E]/60 rounded-full" />
          <div className="absolute top-[10%] right-[25%] w-1 h-1 bg-[#C8A84E]/80 rounded-full shadow-[0_0_4px_1px_rgba(200,168,78,0.3)]" />
          <div className="absolute top-[30%] right-[15%] w-0.5 h-0.5 bg-[#C8A84E]/40 rounded-full" />
          <div className="absolute top-[8%] left-[55%] w-0.5 h-0.5 bg-[#C8A84E]/50 rounded-full" />
          <div className="absolute top-[20%] right-[40%] w-1 h-1 bg-[#C8A84E]/30 rounded-full" />
          <div className="absolute top-[35%] left-[10%] w-0.5 h-0.5 bg-[#C8A84E]/40 rounded-full" />
          <div className="absolute top-[12%] left-[75%] w-1 h-1 bg-[#C8A84E]/60 rounded-full shadow-[0_0_4px_1px_rgba(200,168,78,0.2)]" />
          <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] pointer-events-none">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1B2A4A] via-[#152038] to-[#0B1120] opacity-60" />
            <div className="absolute inset-[-20px] rounded-full bg-[#C8A84E]/5 blur-3xl" />
            <div className="absolute inset-0 rounded-full border border-[#C8A84E]/10" />
          </div>
        </div>
<body>
  <OfflineBanner />
  {/* le reste de ton contenu */}
</body>

        {/* HEADER */}
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-[#0B1120]/70 border-b border-[#C8A84E]/10">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">

  <div className="flex items-center gap-3">
    {/* BURGER NAVIGATION — à gauche */}
    <button
      onClick={() => setNavOuverte(true)}
      aria-label="Ouvrir la navigation"
      className="p-2 text-white/60 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    {/* LOGO */}
    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
      <svg className="w-8 h-8 text-[#C8A84E]" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#1B2A4A" />
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="15" cy="9" r="1" fill="currentColor" />
      </svg>
      <span className="text-xl font-black text-white hidden sm:inline">Ephemer</span>
    </Link>
  </div>

  {/* DROITE : cloche + avatar */}
  <div className="flex items-center gap-2">
    <NotificationBell />
    <button
      onClick={() => setMenuOuvert(true)}
      aria-label="Ouvrir le menu"
      className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#C8A84E]/30 to-[#C8A84E]/10 border-2 border-[#C8A84E]/40 hover:border-[#C8A84E] hover:scale-105 transition-all duration-200 flex items-center justify-center overflow-hidden group"
    >
      {initiale ? (
        <span className="text-[#C8A84E] font-bold text-base group-hover:scale-110 transition-transform">
          {initiale}
        </span>
      ) : (
        <svg className="w-5 h-5 text-[#C8A84E]/70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      )}
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0B1120]" />
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

        <main className="relative z-10">
          {children}
        </main>

        <DrawerGlobal />

      </div>
    </DrawerProvider>
  )
}
