'use client' 
// ⬆️ 'use client' = ce fichier tourne dans le navigateur (pas sur le serveur).
// On en a besoin car on utilise des clics (onClick), de la navigation, etc.

import { useRouter, usePathname } from 'next/navigation'
// useRouter = permet de naviguer entre les pages par code (router.push('/...'))
// usePathname = permet de savoir SUR QUELLE page on est actuellement (ex: "/dashboard/contacts")

import Link from 'next/link'
// Link = lien optimisé de Next.js (plus rapide qu'une balise <a> classique)

import { supabase } from '@/lib/supabase'
// On importe Supabase pour gérer la déconnexion

export default function DashboardLayout({
  children, // children = le contenu de la page actuelle (ex: le contenu de /dashboard/contacts)
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  // On veut afficher le bouton "Retour" SAUF sur la page d'accueil du dashboard
  // Donc si on est sur "/dashboard" pile, on n'affiche PAS le bouton retour
  const estPageAccueilDashboard = pathname === '/dashboard'

  // Fonction de déconnexion : on déconnecte de Supabase puis on renvoie à la page de connexion
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900">
      
      {/* === DÉCORATION DE FOND (les boules floues violettes) === */}
      {/* pointer-events-none = on ne peut pas cliquer dessus, c'est juste décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* === HEADER COMMUN (sticky = reste en haut quand on scroll) === */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-indigo-950/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 md:px-8 py-3">
          
          {/* --- LOGO cliquable (renvoie au dashboard) --- */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-3xl">🌙</span>
            <span className="text-xl font-black text-white hidden sm:inline">Ephemer</span>
          </Link>

          {/* --- BOUTONS À DROITE --- */}
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

        {/* --- BOUTON RETOUR (affiché seulement si on est dans une sous-page) --- */}
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

      {/* === CONTENU DE LA PAGE === */}
      {/* relative z-10 = pour que le contenu s'affiche AU-DESSUS des boules floues */}
      <main className="relative z-10">
        {children}
      </main>

    </div>
  )
}
