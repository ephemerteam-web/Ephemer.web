'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/connexion')
        return
      }
      setUserEmail(session.user.email ?? null)
      const pseudo = session.user.email?.split('@')[0] ?? null
      setUserName(pseudo)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <span className="text-6xl">🌙</span>
          </div>
          <p className="text-indigo-200">Chargement...</p>
        </div>
      </div>
    )
  }

  const cartes = [
    {
      id: 1,
      icon: '🎂',
      titre: 'Anniversaires',
      description: 'Vois vos prochains anniversaires',
      couleur: 'from-rose-500 to-pink-500',
      path: '/dashboard/anniversaires'
    },
    {
      id: 2,
      icon: '📒',
      titre: 'Contacts',
      description: 'Gère tous tes contacts',
      couleur: 'from-blue-500 to-cyan-500',
      path: '/contacts'
    },
    {
      id: 3,
      icon: '📅',
      titre: 'Calendrier',
      description: 'Explore les fêtes des saints',
      couleur: 'from-purple-500 to-violet-500',
      path: '/dashboard/calendrier'
    },
    {
      id: 4,
      icon: '✨',
      titre: 'Messages IA',
      description: 'Génère des messages personnalisés',
      couleur: 'from-amber-500 to-orange-500',
      path: '/dashboard/generate',
      disabled: false
    }
  ]

  return (
    <div className="p-6 md:p-8">

      {/* Message de bienvenue */}
      {userName && (
        <p className="text-indigo-200 text-sm mb-8">
          Bienvenue, <span className="font-semibold">{userName}</span> 👋
        </p>
      )}

      {/* Section principale */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
          Accède à tes outils
        </h2>

        {/* Grille des cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cartes.map((carte) => (
            <button
              key={carte.id}
              onClick={() => !carte.disabled && router.push(carte.path)}
              disabled={carte.disabled}
              className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                carte.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 hover:shadow-2xl cursor-pointer'
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${carte.couleur} ${
                  carte.disabled ? 'opacity-30' : 'opacity-80 group-hover:opacity-100'
                } transition-opacity duration-300`}
              ></div>

              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>

              <div className="relative z-10 flex flex-col h-full">
                <span className="text-4xl md:text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {carte.icon}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-white text-left mb-2">
                  {carte.titre}
                </h3>
                <p className="text-white/80 text-sm text-left flex-1">
                  {carte.description}
                </p>

                {carte.disabled && (
                  <div className="mt-4 inline-flex px-3 py-1 bg-white/20 rounded-full">
                    <span className="text-xs font-semibold text-white">🔧 Bientôt</span>
                  </div>
                )}

                {!carte.disabled && (
                  <div className="mt-4 flex items-center gap-2 text-white group-hover:gap-3 transition-all">
                    <span className="text-sm font-semibold">Ouvrir</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/40 transition-colors"></div>
            </button>
          ))}
        </div>

        {/* Section infos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">

          {/* Carte info 1 */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">✨</span>
              <h3 className="text-lg font-bold text-white">Comment ça marche ?</h3>
            </div>
            <p className="text-indigo-200 text-sm">
              Ajoute tes contacts, définis leurs dates importantes, et reçois des rappels pour ne jamais oublier un anniversaire ou une fête.
            </p>
          </div>

          {/* Carte Générateur IA */}
          <div
            onClick={() => router.push('/dashboard/generate')}
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl group-hover:scale-110 transition-transform">🤖</span>
              <h3 className="text-lg font-bold text-white">Générateur IA</h3>
            </div>
            <p className="text-indigo-200 text-sm">
              Génère un message personnalisé pour SMS, email ou réseaux sociaux en quelques secondes.
            </p>
            <span className="inline-block mt-3 text-xs text-purple-300 font-medium">
              Essayer →
            </span>
          </div>

        </div>{/* fin grid infos */}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 text-center">
          <p className="text-indigo-300 text-sm">
            Made with 💜 • Version 1.0
          </p>
        </div>

      </div>{/* fin section principale */}
    </div>
  )
}
