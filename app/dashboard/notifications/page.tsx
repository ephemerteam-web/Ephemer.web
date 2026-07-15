'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

// ============================================
// 🎨 TYPES
// ============================================
type Notification = {
  id: string
  contact_id: number
  type: string
  message: string
  lue: boolean
  event_date: string
  created_at: string
  contacts?: { prenom: string; nom: string } | null
}

type FiltreType = 'tous' | 'anniversaire' | 'fete' | 'rappel'
type FiltreStatut = 'tous' | 'non_lues'

type Groupe = {
  titre: string
  notifs: Notification[]
}

const PAGE_SIZE = 20

// ============================================
// 🔧 HELPERS
// ============================================
function getTypeLabel(type: string): { label: string; emoji: string; couleur: string } {
  if (type.startsWith('anniversaire')) {
    return { label: 'Anniversaire', emoji: '🎂', couleur: 'bg-rose-500/15 text-rose-300' }
  }
  if (type.startsWith('fete')) {
    return { label: 'Fête de prénom', emoji: '🙏', couleur: 'bg-indigo-500/15 text-indigo-300' }
  }
  if (type.startsWith('rappel')) {
    return { label: 'Rappel', emoji: '🔔', couleur: 'bg-amber-500/15 text-amber-300' }
  }
  return { label: type, emoji: '📌', couleur: 'bg-white/10 text-white/70' }
}
function getJoursRestants(eventDate: string): { jours: number; label: string } | null {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  
  const event = new Date(eventDate)
  event.setHours(0, 0, 0, 0)
  
  const diffMs = event.getTime() - aujourdhui.getTime()
  const jours = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  // On n'affiche le badge que pour les événements dans les 30 prochains jours
  if (jours < 0 || jours > 30) return null
  
  if (jours === 0) return { jours: 0, label: 'Aujourd\'hui' }
  if (jours === 1) return { jours: 1, label: 'Demain' }
  return { jours, label: `J-${jours}` }
}

function grouperParJour(notifs: Notification[]): Groupe[] {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const hier = new Date(aujourdhui)
  hier.setDate(hier.getDate() - 1)
  const debutSemaine = new Date(aujourdhui)
  debutSemaine.setDate(debutSemaine.getDate() - 7)

  const groupes: Record<string, Notification[]> = {
    "Aujourd'hui": [],
    Hier: [],
    'Cette semaine': [],
    'Plus ancien': [],
  }

  for (const n of notifs) {
    const d = new Date(n.event_date)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === aujourdhui.getTime()) groupes["Aujourd'hui"].push(n)
    else if (d.getTime() === hier.getTime()) groupes.Hier.push(n)
    else if (d >= debutSemaine && d < hier) groupes['Cette semaine'].push(n)
    else groupes['Plus ancien'].push(n)
  }

  return Object.entries(groupes)
    .filter(([, arr]) => arr.length > 0)
    .map(([titre, notifs]) => ({ titre, notifs }))
}

// ============================================
// 🎯 PAGE
// ============================================
export default function PageNotifications() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState<FiltreType>('tous')
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous')
  const [compteurNonLues, setCompteurNonLues] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 🔎 Est-ce qu'on est en mode recherche ?
  const estEnRecherche = recherche.trim().length > 0

  // ============================================
  // 🔧 Charger les notifications
  // ============================================
    const charger = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user?.id) return

        const userId = session.user.id

        // ─────────────────────────────────────────────────
        // Helper pour extraire le nom du contact de façon sûre
        // ─────────────────────────────────────────────────
        function getContactNom(n: Notification): string {
          if (!n.contacts) return ''

          // Cas 1 : contacts est un tableau (relation one-to-many)
          if (Array.isArray(n.contacts)) {
            const first = n.contacts[0]
            if (!first) return ''
            return `${first.prenom || ''} ${first.nom || ''}`.trim()
          }

          // Cas 2 : contacts est un objet simple (relation one-to-one)
          return `${n.contacts.prenom || ''} ${n.contacts.nom || ''}`.trim()
        }

        // ─────────────────────────────────────────────────
        // MODE RECHERCHE → on charge TOUT, puis on filtre
        // ─────────────────────────────────────────────────
        if (estEnRecherche) {
          let query = supabase
            .from('notifications')
            .select('id, contact_id, type, message, lue, event_date, created_at, contacts(prenom, nom)', {
              count: 'exact',
            })
            .eq('user_id', userId)
            .order('event_date', { ascending: false })
            .order('type', { ascending: true })

          // Filtre par type (côté serveur)
          if (filtreType === 'anniversaire') query = query.like('type', 'anniversaire%')
          else if (filtreType === 'fete') query = query.like('type', 'fete%')
          else if (filtreType === 'rappel') query = query.like('type', 'rappel%')

          // Filtre par statut (côté serveur)
          if (filtreStatut === 'non_lues') query = query.eq('lue', false)

          const { data, error, count } = await query

          if (error) {
            console.error('Erreur chargement notifs:', error)
            return
          }

          // Filtre recherche côté client (sur le jeu COMPLET)
          const rechercheLower = recherche.toLowerCase()
          const notifsFiltrees = (data || []).filter((n) => {
            const contactNom = getContactNom(n).toLowerCase()
            const messageLower = (n.message || '').toLowerCase()
            return contactNom.includes(rechercheLower) || messageLower.includes(rechercheLower)
          })

          console.log(`🔎 Recherche "${recherche}" :`, {
            totalChargees: data?.length || 0,
            filtrees: notifsFiltrees.length,
          })

          setNotifs(notifsFiltrees)
          setTotal(notifsFiltrees.length)
          setPage(0)
        }
        // ─────────────────────────────────────────────────
        // MODE NORMAL → pagination côté serveur
        // ─────────────────────────────────────────────────
        else {
          const from = pageNum * PAGE_SIZE
          const to = from + PAGE_SIZE - 1

          let query = supabase
            .from('notifications')
            .select('id, contact_id, type, message, lue, event_date, created_at, contacts(prenom, nom)', {
              count: 'exact',
            })
            .eq('user_id', userId)
            .order('event_date', { ascending: false })
            .order('type', { ascending: true })
            .range(from, to)

          if (filtreType === 'anniversaire') query = query.like('type', 'anniversaire%')
          else if (filtreType === 'fete') query = query.like('type', 'fete%')
          else if (filtreType === 'rappel') query = query.like('type', 'rappel%')

          if (filtreStatut === 'non_lues') query = query.eq('lue', false)

          const { data, error, count } = await query

          if (error) {
            console.error('Erreur chargement notifs:', error)
            return
          }

          const nouvellesNotifs = (data || []).map((n) => ({
            ...n,
            // ✅ Normaliser contacts pour qu'il soit toujours un objet (pas un tableau)
            contacts: Array.isArray(n.contacts) ? n.contacts[0] || null : n.contacts || null,
          }))

          if (reset) {
            setNotifs(nouvellesNotifs)
          } else {
            setNotifs((prev) => [...prev, ...nouvellesNotifs])
          }

          setTotal(count || 0)
          setPage(pageNum)
        }

        // Compteur non-lues (indépendant des filtres affichés)
        const { count: countNonLues } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('lue', false)
        setCompteurNonLues(countNonLues || 0)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filtreType, filtreStatut, recherche, estEnRecherche]
  )

  useEffect(() => {
    charger(0, true)
  }, [charger])

  // ============================================
  // ♾️ Pagination infinie (uniquement en mode normal)
  // ============================================
  useEffect(() => {
    if (!sentinelRef.current) return
    // Pas de pagination infinie en mode recherche
    if (estEnRecherche) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && notifs.length < total) {
          charger(page + 1, false)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [notifs.length, total, page, loading, loadingMore, charger, estEnRecherche])

  // ============================================
  // ⚡ Actions
  // ============================================
  const marquerLue = async (id: string, lue: boolean) => {
    const { error } = await supabase.from('notifications').update({ lue }).eq('id', id)
    if (error) return console.error(error)
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, lue } : n)))
    setCompteurNonLues((c) => c + (lue ? -1 : 1))
  }

  const supprimer = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) return console.error(error)
    setNotifs((prev) => prev.filter((n) => n.id !== id))
    setTotal((t) => t - 1)
  }

  const toutMarquerLues = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { error } = await supabase
      .from('notifications')
      .update({ lue: true })
      .eq('user_id', session.user.id)
      .eq('lue', false)
    if (error) return console.error(error)

    setNotifs((prev) => prev.map((n) => ({ ...n, lue: true })))
    setCompteurNonLues(0)
  }

  const toutSupprimer = async () => {
    if (!confirm('Supprimer TOUTES les notifications ?')) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { error } = await supabase.from('notifications').delete().eq('user_id', session.user.id)
    if (error) return console.error(error)

    setNotifs([])
    setCompteurNonLues(0)
    setTotal(0)
  }

  const groupes = grouperParJour(notifs)

  // ============================================
  // 🎨 RENDU
  // ============================================
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ─────── EN-TÊTE ─────── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="text-white/60 hover:text-[#C8A84E] transition"
            aria-label="Retour"
          >
            ← Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#C8A84E] to-[#E8D084] bg-clip-text text-transparent">
            🔔 Mes notifications
          </h1>
          <div className="w-16" />
        </div>

        {/* ─────── COMPTEUR GLOBAL ─────── */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-[#C8A84E]/10 border border-[#C8A84E]/30">
            <span className="text-[#C8A84E] font-bold">{compteurNonLues}</span>
            <span className="text-white/60 text-sm ml-2">non lue{compteurNonLues > 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={toutMarquerLues}
            disabled={compteurNonLues === 0}
            className="px-3 py-2 rounded-full text-sm bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ✓ Tout marquer lu
          </button>
          <button
            onClick={toutSupprimer}
            disabled={notifs.length === 0}
            className="px-3 py-2 rounded-full text-sm bg-red-500/10 hover:bg-red-500/20 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            🗑️ Tout supprimer
          </button>
        </div>

        {/* ─────── RECHERCHE + FILTRES ─────── */}
        <div className="space-y-3 mb-6">
          {/* Barre de recherche */}
          <div className="relative">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="🔍 Rechercher par nom de contact ou message..."
              className="w-full bg-[#1B2A4A]/40 border border-[#C8A84E]/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#C8A84E]/60 transition"
            />
            {recherche && (
              <button
                onClick={() => setRecherche('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>

          {/* Indicateur recherche active */}
          {estEnRecherche && (
            <div className="flex items-center gap-2 text-sm text-[#C8A84E]/80">
              <span>🔎</span>
              <span>
                {notifs.length} résultat{notifs.length > 1 ? 's' : ''} pour « {recherche} »
              </span>
            </div>
          )}

          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            {/* Type */}
            <div className="flex gap-1 p-1 bg-[#1B2A4A]/40 rounded-xl border border-[#C8A84E]/10">
              {(
                [
                  ['tous', 'Tous'],
                  ['anniversaire', '🎂 Anniv.'],
                  ['fete', '🌼 Fêtes'],
                ] as [FiltreType, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFiltreType(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition ${
                    filtreType === val
                      ? 'bg-[#C8A84E] text-[#0B1120] font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Statut */}
            <div className="flex gap-1 p-1 bg-[#1B2A4A]/40 rounded-xl border border-[#C8A84E]/10">
              {(
                [
                  ['tous', 'Toutes'],
                  ['non_lues', 'Non lues'],
                ] as [FiltreStatut, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFiltreStatut(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition ${
                    filtreStatut === val
                      ? 'bg-[#C8A84E] text-[#0B1120] font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─────── LISTE GROUPÉE ─────── */}
        {loading ? (
          <div className="text-center py-20 text-white/40">Chargement...</div>
        ) : groupes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔕</div>
            <p className="text-white/50">
              {estEnRecherche
                ? `Aucun résultat pour « ${recherche} »`
                : 'Aucune notification à afficher'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupes.map((groupe) => (
              <div key={groupe.titre}>
                {/* Titre du groupe */}
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8A84E]/70 mb-2 px-1">
                  {groupe.titre}{' '}
                  <span className="text-white/30 normal-case">({groupe.notifs.length})</span>
                </h2>

                {/* Carte notifications */}
                <div className="bg-[#1B2A4A]/30 border border-[#C8A84E]/15 rounded-xl divide-y divide-white/5 overflow-hidden">
                  {groupe.notifs.map((n) => {
                    const { label, emoji, couleur } = getTypeLabel(n.type)
                    const contactNom = n.contacts
                      ? `${n.contacts.prenom || ''} ${n.contacts.nom || ''}`.trim() || 'Contact'
                      : 'Contact inconnu'

                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 p-4 transition hover:bg-white/[0.03] ${
                          !n.lue ? 'bg-[#C8A84E]/[0.04]' : ''
                        }`}
                      >
                        {/* Pastille état */}
                        <div className="mt-1.5 flex-shrink-0">
                          {!n.lue ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#C8A84E] shadow-[0_0_8px_rgba(200,168,78,0.6)]" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                          )}
                        </div>

                                                {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-lg">{emoji}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${couleur}`}>
                              {label}
                            </span>
                            
                            {/* Badge J-X (comme dans FavorisRow) */}
                            {(() => {
                              const badge = getJoursRestants(n.event_date)
                              if (!badge) return null
                              return (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {badge.label}
                                </span>
                              )
                            })()}
                            
                            <span className="text-xs text-white/40 truncate">
                              pour {contactNom}
                            </span>
                          </div>
                          <p className={`text-sm ${!n.lue ? 'text-white' : 'text-white/70'}`}>
                            {n.message}
                          </p>
                          <p className="text-xs text-white/30 mt-1">{n.event_date}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => marquerLue(n.id, !n.lue)}
                            title={n.lue ? 'Marquer non lue' : 'Marquer lue'}
                            className="p-1.5 text-white/50 hover:text-[#C8A84E] hover:bg-[#C8A84E]/10 rounded-lg transition"
                          >
                            {n.lue ? '○' : '●'}
                          </button>
                          <button
                            onClick={() => supprimer(n.id)}
                            title="Supprimer"
                            className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Sentinelle pour pagination infinie (mode normal uniquement) */}
            {!estEnRecherche && (
              <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                {loadingMore && <span className="text-white/40 text-sm">Chargement...</span>}
                {notifs.length >= total && notifs.length > 0 && (
                  <span className="text-white/30 text-xs">— Fin des notifications —</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}