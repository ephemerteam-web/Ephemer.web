'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SAINTS } from '@/lib/saints'

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
}

export default function Dashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/connexion'); return }
      setUserName(session.user.email?.split('@')[0] ?? null)
      const { data } = await supabase
        .from('contacts')
        .select('id, nom, prenom, date_naissance')
        .eq('user_id', session.user.id)
      if (data) setContacts(data as Contact[])
      setLoading(false)
    }
    init()
  }, [router])

  const feteDuJour = useMemo(() => {
    const today = new Date()
    const mois = String(today.getMonth() + 1).padStart(2, '0')
    const jour = String(today.getDate()).padStart(2, '0')
    return SAINTS.filter((s) => s.date === `${mois}-${jour}`)
  }, [])

  const { anniversairesAujourdhui, anniversairesPassés, anniversairesBientot } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const prochainAnniv = (dateNaissance: string): Date => {
      const [annee, mois, jour] = dateNaissance.split('-').map(Number)
      const anniv = new Date(today.getFullYear(), mois - 1, jour)
      return anniv
    }

    const diffJours = (d: Date): number => {
      return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    const aujourd: Contact[] = []
    const passés: (Contact & { joursPassés: number })[] = []
    const bientot: (Contact & { joursRestants: number })[] = []

    for (const c of contacts) {
      if (!c.date_naissance) continue
      const anniv = prochainAnniv(c.date_naissance)
      const diff = diffJours(anniv)

      if (diff === 0) {
        aujourd.push(c)
      } else if (diff < 0 && diff >= -7) {
        passés.push({ ...c, joursPassés: Math.abs(diff) })
      } else if (diff > 0 && diff <= 30) {
        bientot.push({ ...c, joursRestants: diff })
      }
    }

    passés.sort((a, b) => a.joursPassés - b.joursPassés)
    bientot.sort((a, b) => a.joursRestants - b.joursRestants)

    return {
      anniversairesAujourdhui: aujourd,
      anniversairesPassés: passés,
      anniversairesBientot: bientot
    }
  }, [contacts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-pulse mb-4"><span className="text-6xl">🌙</span></div>
          <p className="text-indigo-200">Chargement...</p>
        </div>
      </div>
    )
  }

  const cartes = [
  { id: 1, icon: '🎂', titre: 'Anniversaires', description: 'Vois vos prochains anniversaires', couleur: 'from-rose-500 to-pink-500', path: '/dashboard/anniversaires', disabled: false },
  { id: 2, icon: '📒', titre: 'Contacts', description: 'Gère tous tes contacts', couleur: 'from-blue-500 to-cyan-500', path: '/dashboard/contacts', disabled: false },
  { id: 3, icon: '📅', titre: 'Calendrier', description: 'Explore les fêtes des saints', couleur: 'from-purple-500 to-violet-500', path: '/dashboard/calendrier', disabled: false },
  { id: 4, icon: '🙏', titre: 'Fêtes des Saints', description: 'Les fêtes de vos contacts', couleur: 'from-amber-500 to-orange-500', path: '/dashboard/calendrier_saints', disabled: false }
]


  return (
    <div className="p-6 md:p-8">

      {/* Bienvenue */}
      {userName && (
        <p className="text-indigo-200 text-sm mb-6">
          Bienvenue, <span className="font-semibold">{userName}</span> 👋
        </p>
      )}

      {/* BLOC : FÊTE DU JOUR + ANNIVERSAIRES */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-5 mb-8 flex flex-col gap-6">

        {/* Fête du jour */}
        <div>
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
            ✨ Fête du jour
          </p>
          {feteDuJour.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {feteDuJour.map((saint, idx) => (
                <div key={idx} className="bg-purple-500/10 border border-purple-400/20 rounded-2xl px-4 py-3">
                  <p className="text-white font-bold text-sm">{saint.nomSaint}</p>
                  <p className="text-purple-300 text-xs mt-0.5 capitalize">{saint.prenoms.join(', ')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">Aucune fête répertoriée aujourd'hui.</p>
          )}
        </div>

        <div className="border-t border-white/10" />

        {/* Anniversaires aujourd'hui */}
        <div>
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-3">
            🎂 Anniversaire(s) aujourd'hui
          </p>
          {anniversairesAujourdhui.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {anniversairesAujourdhui.map((c) => (
                <div key={c.id} className="bg-rose-500/10 border border-rose-400/20 rounded-2xl px-4 py-3">
                  <p className="text-white font-bold text-sm">{c.prenom} {c.nom}</p>
                  <p className="text-rose-300 text-xs mt-0.5">🎉 C'est son anniversaire !</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm italic">
              Pas d'anniversaire aujourd'hui — profite de la tranquillité 😄
            </p>
          )}
        </div>

        {/* Anniversaires passés */}
        {anniversairesPassés.length > 0 && (
          <>
            <div className="border-t border-white/10" />
            <div>
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">
                ⏳ Anniversaires récents (7 derniers jours)
              </p>
              <div className="flex flex-wrap gap-3">
                {anniversairesPassés.map((c) => (
                  <div key={c.id} className="bg-orange-500/10 border border-orange-400/20 rounded-2xl px-4 py-3">
                    <p className="text-white font-bold text-sm">{c.prenom} {c.nom}</p>
                    <p className="text-orange-300 text-xs mt-0.5">
                      Il y a {c.joursPassés} jour{c.joursPassés > 1 ? 's' : ''} — il est encore temps ! 💌
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Anniversaires à venir */}
        {anniversairesBientot.length > 0 && (
          <>
            <div className="border-t border-white/10" />
            <div>
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
                📅 Bientôt (dans les 30 prochains jours)
              </p>
              <div className="flex flex-wrap gap-3">
                {anniversairesBientot.map((c) => (
                  <div key={c.id} className="bg-cyan-500/10 border border-cyan-400/20 rounded-2xl px-4 py-3">
                    <p className="text-white font-bold text-sm">{c.prenom} {c.nom}</p>
                    <p className="text-cyan-300 text-xs mt-0.5">
                      Dans {c.joursRestants} jour{c.joursRestants > 1 ? 's' : ''} 🗓️
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Section principale */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Accède à tes outils</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cartes.map((carte) => (
            <button
              key={carte.id}
              onClick={() => !carte.disabled && router.push(carte.path)}
              disabled={carte.disabled}
              className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                carte.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-2xl cursor-pointer'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${carte.couleur} ${
                carte.disabled ? 'opacity-30' : 'opacity-80 group-hover:opacity-100'
              } transition-opacity duration-300`}></div>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
              <div className="relative z-10 flex flex-col h-full">
                <span className="text-4xl md:text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{carte.icon}</span>
                <h3 className="text-lg md:text-xl font-bold text-white text-left mb-2">{carte.titre}</h3>
                <p className="text-white/80 text-sm text-left flex-1">{carte.description}</p>
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

        {/* Section infos — 3 cartes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">

          {/* Carte : Comment ça marche */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">✨</span>
              <h3 className="text-lg font-bold text-white">Comment ça marche ?</h3>
            </div>
            <p className="text-indigo-200 text-sm">
              Ajoute tes contacts, définis leurs dates importantes, et reçois des rappels pour ne jamais oublier un anniversaire ou une fête.
            </p>
          </div>

          {/* Carte : Générateur IA */}
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
            <span className="inline-block mt-3 text-xs text-purple-300 font-medium">Essayer →</span>
          </div>

          {/* Carte : Messages programmés */}
          <div
            onClick={() => router.push('/dashboard/messages-programmes')}
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl group-hover:scale-110 transition-transform">📅</span>
              <h3 className="text-lg font-bold text-white">Messages programmés</h3>
            </div>
            <p className="text-indigo-200 text-sm">
              Consulte et gère tous tes messages en attente d'envoi.
            </p>
            <span className="inline-block mt-3 text-xs text-blue-300 font-medium">Voir →</span>
          </div>

        </div>

        {/* Footer */}
<div className="mt-12 pt-6 border-t border-white/10 text-center space-y-3">
  <p className="text-indigo-300 text-sm">Made with 💜 • Version 0.2</p>
  
  <a
    href="mailto:ephemer.team@gmail.com?subject=Ephemer - Support&body=Bonjour,%0D%0A%0D%0A[Décris ton bug ou ta suggestion ici]%0D%0A%0D%0AMerci !"
    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-300 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
  >
    <span>💬</span>
    Contacter le support
  </a>
</div>

      </div>

    </div>
  )
}
