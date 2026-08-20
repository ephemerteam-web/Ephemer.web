'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { SAINTS } from '@/lib/saints'
import Link from 'next/link'
import { useUserProfile } from '@/lib/hooks/useUserProfile'
import IconeLuneIA from '@/components/IconeLuneIA'
import FavorisRow from '@/components/FavorisRow'



type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  est_favori?: boolean 
}
type Profile = {
  prenom: string
}

export default function Dashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [prenom, setPrenom] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false)
  const [aideOuverte, setAideOuverte] = useState(false)
  const [favoriMenuOuvert, setFavoriMenuOuvert] = useState<string | null>(null)


  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/connexion')
        return
      }

      setUserName(session.user.email?.split('@')[0] ?? null)

      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('est_favori', true)

      if (data) setContacts(data as Contact[])

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('prenom')
        .eq('id', session.user.id)

      if (!profileError && profileData && profileData.length > 0) {
        const fetchedPrenom = String(profileData[0].prenom || '')
        if (fetchedPrenom.trim() !== '') {
          setProfile({ prenom: fetchedPrenom })
        } else {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

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
      anniversairesBientot: bientot,
    }
  }, [contacts])

  // ============================================
  // ⭐ FAVORIS + leur prochain événement (anniv OU fête prénom)
  // ============================================
  const favoris = useMemo<any[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const prochaineFetePrenom = (prenom: string): Date | null => {
      const prenomNorm = prenom.trim().toLowerCase()
      const saintTrouve = SAINTS.find((s) =>
        s.prenoms.some((p) => p.trim().toLowerCase() === prenomNorm)
      )
      if (!saintTrouve) return null
      const [mois, jour] = saintTrouve.date.split('-').map(Number)
      let dateFete = new Date(today.getFullYear(), mois - 1, jour)
      if (dateFete < today) dateFete.setFullYear(dateFete.getFullYear() + 1)
      return dateFete
    }

    const prochainAnniv = (dateNaissance: string): Date => {
      const [, mois, jour] = dateNaissance.split('-').map(Number)
      let anniv = new Date(today.getFullYear(), mois - 1, jour)
      if (anniv < today) anniv.setFullYear(anniv.getFullYear() + 1)
      return anniv
    }

    const diffJours = (d: Date): number =>
      Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return contacts
      .filter((c) => c.est_favori)
      .map((c) => {
        const dateAnniv = c.date_naissance ? prochainAnniv(c.date_naissance) : null
        const dateFete = prochaineFetePrenom(c.prenom)

        let prochainEvent: { type: 'anniversaire' | 'fete_prenom'; date: Date; jours: number } | null = null

        if (dateAnniv) {
          prochainEvent = { type: 'anniversaire', date: dateAnniv, jours: diffJours(dateAnniv) }
        }
        if (dateFete) {
          const joursFete = diffJours(dateFete)
          if (!prochainEvent || joursFete < prochainEvent.jours) {
            prochainEvent = { type: 'fete_prenom', date: dateFete, jours: joursFete }
          }
        }

        return { ...c, prochainEvent }
      })
      .sort((a, b) => {
        if (!a.prochainEvent) return 1
        if (!b.prochainEvent) return -1
        return a.prochainEvent.jours - b.prochainEvent.jours
      })
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

  const couleurAvatar = (texte: string | null | undefined): string => {
    const base = texte ?? ''
    const palettes = [
      'from-rose-500 to-pink-500',
      'from-indigo-500 to-violet-500',
      'from-sky-500 to-cyan-500',
      'from-amber-500 to-orange-500',
      'from-emerald-500 to-teal-500',
      'from-fuchsia-500 to-purple-500',
    ]
    let somme = 0
    for (let i = 0; i < base.length; i++) somme += base.charCodeAt(i)
    return palettes[somme % palettes.length]
  }

   // ============================================
  // ⭐ FONCTIONS VEDETTES
  // ============================================
  const vedetteIA = {
    titre: 'Générateur IA',
    sous: 'Crée un message personnalisé pour SMS, email ou réseaux sociaux en quelques secondes.',
    path: '/dashboard/generate',
    gradient: 'from-violet-600 via-indigo-600 to-purple-700',
    badge: 'Vedette',
  }

  const vedetteCadeaux = {
    titre: 'Idées Cadeaux',
    sous: 'Trouve l\'inspiration parfaite et offre le cadeau idéal adapté à chaque événement.',
    path: '/dashboard/gift-ideas',
    gradient: 'from-fuchsia-600 via-rose-600 to-pink-700', // Un dégradé rose/fuchsia super chaleureux
    badge: 'Nouveau',
  }

  // ============================================
  // 📆 OUTILS ÉPHÉMÉRIDE (tons indigo/violet/cyan)
  // ============================================
  const outilsEphemeride = [
    { id: 1, icon: '🎂', titre: 'Anniversaires', couleur: 'from-indigo-500 to-indigo-600', path: '/dashboard/anniversaires' },
    { id: 2, icon: '🙏', titre: 'Fêtes des Saints', couleur: 'from-violet-500 to-purple-600', path: '/dashboard/calendrier_saints' },
    { id: 3, icon: '📅', titre: 'Calendrier', couleur: 'from-sky-500 to-cyan-600', path: '/dashboard/calendrier' },
  ]

  // ============================================
  // ⚙️ GESTION (tons sobres)
  // ============================================
  const outilsGestion = [
    { id: 1, icon: '📒', titre: 'Contacts', sous: 'Gère ton carnet', path: '/dashboard/contacts' },
    { id: 2, icon: '📨', titre: 'Messages programmés', sous: 'Tes envois en attente', path: '/dashboard/messages-programmes' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* ============ EN-TÊTE ============ */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white">Tableau de bord</h2>
        {profile?.prenom ? (
          <p className="text-indigo-200 text-sm mt-1">
            Bienvenue, <span className="font-semibold">{profile.prenom}</span> 👋
          </p>
        ) : userName && (
          <p className="text-indigo-200 text-sm mt-1">
            Bienvenue, <span className="font-semibold">{userName}</span> 👋
          </p>
        )}
      </div>

      {/* ============ BLOC FÊTE + ANNIVERSAIRES ============ */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-4 md:p-5 mb-8 flex flex-col gap-5">

        {/* Fête du jour */}
        <div>
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
            ✨ Fête du jour
          </p>
          {feteDuJour.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
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
            <div className="flex flex-wrap gap-2.5">
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
              <div className="flex flex-wrap gap-2.5">
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
              <div className="flex flex-wrap gap-2.5">
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

      {/* ⭐ MES FAVORIS */}
      <FavorisRow
        favoris={favoris}
        favoriMenuOuvert={favoriMenuOuvert}
        setFavoriMenuOuvert={setFavoriMenuOuvert}
        couleurAvatar={couleurAvatar}
      />

            {/* ============ ⭐ VEDETTES : L'ESSENTIEL ============ */}
      <div className="mb-8">
        <h2 className="text-base md:text-lg font-bold text-white mb-4">L'essentiel</h2>

        {/* grid-cols-1 = 1 colonne sur mobile | md:grid-cols-2 = 2 colonnes sur tablette/ordinateur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bouton 1 : Générateur IA */}
          <button
            onClick={() => router.push(vedetteIA.path)}
            className="group relative w-full overflow-hidden rounded-3xl p-5 md:p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] flex flex-col justify-between min-h-[150px] md:min-h-[160px]"
          >
            {/* Dégradé de fond interactif */}
            <div className={`absolute inset-0 bg-gradient-to-br ${vedetteIA.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
            {/* Effet de reflet de lumière au survol */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative z-10 flex items-start gap-3 md:gap-4 h-full">
              {/* Conteneur d'icône avec fond translucide */}
              <span className="flex-shrink-0 transform group-hover:scale-110 transition-transform bg-white/10 p-2 rounded-2xl w-[48px] h-[48px] flex items-center justify-center">
                <IconeLuneIA size={28} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-base md:text-lg font-bold text-white leading-tight">{vedetteIA.titre}</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {vedetteIA.badge}
                  </span>
                </div>
                <p className="text-white/85 text-xs md:text-sm leading-relaxed">{vedetteIA.sous}</p>
              </div>
              <span className="hidden sm:block text-xl text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all self-center">
                →
              </span>
            </div>

            <div className="absolute inset-0 rounded-3xl border border-white/25 group-hover:border-white/50 transition-colors" />
          </button>

          {/* Bouton 2 : Idées Cadeaux */}
          <button
            onClick={() => router.push(vedetteCadeaux.path)}
            className="group relative w-full overflow-hidden rounded-3xl p-5 md:p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] flex flex-col justify-between min-h-[150px] md:min-h-[160px]"
          >
            {/* Dégradé de fond interactif */}
            <div className={`absolute inset-0 bg-gradient-to-br ${vedetteCadeaux.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
            {/* Effet de reflet de lumière au survol */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative z-10 flex items-start gap-3 md:gap-4 h-full">
              {/* Conteneur d'icône cadeau */}
              <span className="flex-shrink-0 text-2xl transform group-hover:scale-110 transition-transform bg-white/10 p-2 rounded-2xl w-[48px] h-[48px] flex items-center justify-center">
                🎁
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-base md:text-lg font-bold text-white leading-tight">{vedetteCadeaux.titre}</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {vedetteCadeaux.badge}
                  </span>
                </div>
                <p className="text-white/85 text-xs md:text-sm leading-relaxed">{vedetteCadeaux.sous}</p>
              </div>
              <span className="hidden sm:block text-xl text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all self-center">
                →
              </span>
            </div>

            <div className="absolute inset-0 rounded-3xl border border-white/25 group-hover:border-white/50 transition-colors" />
          </button>

        </div>
      </div>

        {/* ============ 📆 OUTILS ÉPHÉMÉRIDE (3 au même niveau) ============ */}
      <div className="mb-8">
        <h2 className="text-base md:text-lg font-bold text-white mb-4">Dates & éphéméride</h2>

        <div className="grid grid-cols-3 gap-3">
          {outilsEphemeride.map((carte) => (
            <button
              key={carte.id}
              onClick={() => router.push(carte.path)}
              className="group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[110px] transition-all duration-300 hover:scale-[1.03] active:scale-95"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${carte.couleur} opacity-75 group-hover:opacity-90 transition-opacity`} />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="text-2xl md:text-3xl transform group-hover:scale-110 transition-transform">{carte.icon}</span>
                <h3 className="text-xs md:text-sm font-bold text-white leading-tight">{carte.titre}</h3>
              </div>
              <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/40 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* ============ ⚙️ GESTION (2 au même niveau) ============ */}
      <div className="mb-8">
        <h2 className="text-base md:text-lg font-bold text-white mb-4">Gérer mes envois</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {outilsGestion.map((carte) => (
            <button
              key={carte.id}
              onClick={() => router.push(carte.path)}
              className="flex items-center gap-4 bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 hover:border-indigo-400/40 hover:bg-white/10 transition-all text-left group"
            >
              <span className="text-2xl md:text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">{carte.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white">{carte.titre}</h3>
                <p className="text-indigo-200/70 text-xs mt-0.5 truncate">{carte.sous}</p>
              </div>
              <span className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============ ℹ️ AIDE REPLIABLE ============ */}
      <div className="mb-8">
        <button
          onClick={() => setAideOuverte(!aideOuverte)}
          className="flex items-center gap-2 text-indigo-300/70 hover:text-indigo-200 text-sm transition-colors"
        >
          <span>💡</span>
          <span>Besoin d'aide ? Comment ça marche</span>
          <span className={`transform transition-transform ${aideOuverte ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {/* Contenu repliable */}
        {aideOuverte && (
          <div className="mt-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease]">
            <span className="text-2xl flex-shrink-0">✨</span>
            <p className="text-indigo-200/80 text-sm leading-relaxed">
              Ajoute tes contacts et leurs dates importantes (anniversaires, fêtes…).
              Ephemer détecte automatiquement les événements à venir et te permet de générer
              puis programmer des messages personnalisés. Tu ne rateras plus jamais une date importante !
            </p>
          </div>
        )}
      </div>

      {/* ============ FOOTER ============ */}
      <div className="mt-10 pt-6 border-t border-white/10 text-center space-y-3">
        <p className="text-indigo-300 text-sm">
          Made with 💜 • Version Alpha 0.7 ou 0.8 ? who knows ?
        </p>

        <div className="flex justify-center gap-2 flex-wrap">
    <a
      href="mailto:ephemer.team@gmail.com?subject=Ephemer - Support&body=Bonjour,%0D%0A%0D%0A[Décris ton bug ou ta suggestion ici]%0D%0A%0D%0AMerci !"
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
    >
      💬 Support
    </a>
    <Link
      href="/guide-notifications"
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
    >
      🔔 Tuto Notifications
    </Link>
    <Link
      href="/confidentialite"
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
    >
      🔒 Confidentialité
    </Link>
    <Link
      href="/conditions"
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
    >
      📄 Conditions
    </Link>
    <Link
      href="/patchnote"
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/30 hover:bg-indigo-800/60 rounded-lg transition border border-indigo-500/30"
    >
      📜 Quoi de neuf ?
    </Link>
  </div>
</div>
    </div>
  )
}
