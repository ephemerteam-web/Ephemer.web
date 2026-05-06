'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DrawerProvider } from '@/lib/DrawerContext'
import DrawerGlobal from '@/components/DrawerGlobal'
import NotificationBell from '@/components/NotificationBell'


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const estPageAccueilDashboard = pathname === '/dashboard'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  return (
    <DrawerProvider>
      <div className="min-h-screen bg-[#0B1120]">

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

        <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0B1120]/70 border-b border-[#C8A84E]/10">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">

            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
              <svg className="w-8 h-8 text-[#C8A84E]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#1B2A4A" />
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1" fill="none" />
                <circle cx="15" cy="9" r="1" fill="currentColor" />
              </svg>
              <span className="text-xl font-black text-white hidden sm:inline">Ephemer</span>
            </Link>

            <div className="flex gap-2">
              <NotificationBell />
              <button
                onClick={() => router.push('/dashboard/profil')}
                className="px-3 md:px-4 py-2 text-sm font-medium text-white/60 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30 flex items-center gap-2"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Profil</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 md:px-4 py-2 text-sm font-medium text-white/60 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {!estPageAccueilDashboard && (
            <div className="px-4 md:px-8 pb-3">
              <button
                onClick={() => router.back()}
                className="text-sm text-white/40 hover:text-[#C8A84E] transition flex items-center gap-1"
              >
                <span>←</span> Retour
              </button>
            </div>
          )}
        </header>

        <main className="relative z-10">
          {children}
        </main>

        <DrawerGlobal />

      </div>
    </DrawerProvider>
  )
}