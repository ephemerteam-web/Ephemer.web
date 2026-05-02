'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DrawerProvider } from '@/lib/DrawerContext'
import DrawerGlobal from '@/components/DrawerGlobal'

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900">

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>

        <header className="sticky top-0 z-50 backdrop-blur-lg bg-indigo-950/70 border-b border-white/10">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">

            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
              <span className="text-3xl">🌙</span>
              <span className="text-xl font-black text-white hidden sm:inline">Ephemer</span>
            </Link>

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard/profil')}
                className="px-3 md:px-4 py-2 text-sm font-medium text-indigo-200 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30 flex items-center gap-2"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Profil</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 md:px-4 py-2 text-sm font-medium text-indigo-200 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {!estPageAccueilDashboard && (
            <div className="px-4 md:px-8 pb-3">
              <button
                onClick={() => router.back()}
                className="text-sm text-indigo-200 hover:text-white transition flex items-center gap-1"
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
