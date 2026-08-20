'use client'
// "use client" veut dire : ce composant tourne dans le NAVIGATEUR (pas sur le serveur)
// Il a besoin de React, des clics utilisateur, etc.

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase-browser'
import { useDrawer } from '@/components/DrawerContext'
import { useRouter } from 'next/navigation'

// ── Types (définitions de la forme de nos données) ────────────────
type Notification = {
  id: string
  message: string
  lue: boolean
  created_at: string
  contact_id: string
  jours_restants?: number | null
  type?: string | null            // 👈 pour distinguer les invitations
}

// ── Composant principal ───────────────────────────────────────────
export default function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { ouvrirDrawer } = useDrawer()
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()
  

  // ── Fonction utilitaire : couleur selon l'urgence ───────────────
  const getCouleurUrgence = (notif: Notification) => {
    // 👈 les invitations ont leur propre couleur (vert émeraude)
    if (notif.type === 'invitation_remplie') return 'border-l-emerald-500'

    const jours = notif.jours_restants
    if (jours === null || jours === undefined) return 'border-l-gray-500'
    if (jours === 0) return 'border-l-red-500'      // Jour J = rouge 🔴
    if (jours === 1) return 'border-l-orange-500'   // J-1 = orange 🟠
    if (jours <= 3) return 'border-l-yellow-500'    // J-2/J-3 = jaune 🟡
    return 'border-l-blue-500'                      // J-4 à J-7 = bleu 🔵
  }

  // ── Charger les notifications déjà existantes ────────────────
  const chargerNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) { setLoading(false); return }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id, message, lue, created_at, contact_id, jours_restants, type')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (fetchError) {
        console.error('Erreur chargement notifs:', fetchError.message)
        setError('Impossible de charger les notifications')
      } else if (data) {
        setNotifications(data)
        setError(null)
      }
    } catch (err) {
      console.error('Erreur chargement notifications:', err)
      setError('Erreur de connexion')
    }
    setLoading(false)
  }, [])

  // ── Tout marquer comme lu ────────────────────────────────────
  const marquerToutCommeLu = useCallback(async () => {
    try {
      const nonLuesIds = notifications.filter(n => !n.lue).map(n => n.id)
      if (nonLuesIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .in('id', nonLuesIds)

      if (error) throw error
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })))
    } catch (err) {
      console.error('Erreur marquer tout lu:', err)
    }
  }, [notifications])

  // ── Realtime : écouter les nouvelles notifs en direct ⚡ ──────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      channel = supabase
        .channel('notifications-listen')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications(prev => {
              const existeDeja = prev.some(n => n.id === newNotif.id)
              if (existeDeja) return prev
              return [newNotif, ...prev]
            })
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // ── Initialisation au chargement ────────────────────────────
  useEffect(() => {
    chargerNotifications()
  }, [chargerNotifications])

  // ── Fermeture avec Échap (accessibilité) ────────────────────
  useEffect(() => {
    if (!ouvert) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ouvert])

  // ── Marquer une notification comme lue ──────────────────────
  async function marquerLue(id: string) {
    try {
      await supabase.from('notifications').update({ lue: true }).eq('id', id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n))
    } catch (err) {
      console.error('Erreur marquer lue:', err)
    }
  }

  // ── Clic sur une notification ───────────────────────────────
  async function handleNotificationClick(notif: Notification) {
    marquerLue(notif.id)
    setOuvert(false)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', notif.contact_id)
      .eq('user_id', session.user.id)
      .single()

    if (!contact) return

    // 👈 un contact venu d'une invitation est un contact "lié"
    const estLie = notif.type === 'invitation_remplie'

    ouvrirDrawer({ ...contact, estLie })
  }

  // ── Calcul du nombre de notifications non lues ──────────────
  const nbNonLues = notifications.filter(n => !n.lue).length

  // ── Rendu visuel ────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ── Bouton cloche ── */}
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-3 rounded-full hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
        title="Notifications"
        aria-label={`${nbNonLues} notification${nbNonLues > 1 ? 's' : ''} non lue${nbNonLues > 1 ? 's' : ''}`}
      >
        <span className="text-2xl">🔔</span>
        {nbNonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {nbNonLues > 99 ? '99+' : nbNonLues}
          </span>
        )}
      </button>

      {/* ── Panneau déroulant ── */}
      {ouvert && (
        <>
          {/* Fond noir semi-transparent sur mobile */}
          <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={() => setOuvert(false)} />

          <div
            ref={panelRef}
            className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 w-[calc(100%-2rem)] sm:w-80 max-h-[75vh] bg-gray-900 text-white rounded-2xl shadow-2xl z-40 overflow-hidden border border-gray-700 flex flex-col"
            role="dialog"
            aria-labelledby="notifications-title"
          >
            {/* En-tête */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
              <button
                onClick={() => {
                  setOuvert(false)
                  router.push('/dashboard/notifications')
                }}
                className="font-semibold hover:text-[#C8A84E] transition active:scale-95 flex items-center gap-2"
              >
                Notifications → 📬
              </button>
              <div className="flex gap-2 items-center">
                {nbNonLues > 0 && (
                  <button
                    onClick={marquerToutCommeLu}
                    className="text-xs text-[#C8A84E] hover:text-[#e0c46a] px-2 py-1 rounded transition active:scale-95 touch-manipulation"
                    aria-label="Tout marquer comme lu"
                  >
                    ✓ Tout lu
                  </button>
                )}
                <button
                  onClick={() => setOuvert(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Bannière d'erreur */}
            {error && (
              <div className="p-3 bg-red-500/20 border-b border-red-500/40 text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Contenu */}
            {loading ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[#C8A84E]/30 border-t-[#C8A84E] rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-2">
                <span className="text-4xl">📭</span>
                <p className="text-gray-400">Aucune notification</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNotificationClick(notif) }}
                    className={`p-4 cursor-pointer hover:bg-gray-800/70 transition-all ${
                      notif.lue
                        ? 'opacity-70'
                        : `${notif.type === 'invitation_remplie' ? 'bg-emerald-900/15' : 'bg-purple-900/10'} border-l-4 ${getCouleurUrgence(notif)}`
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="text-[15px] leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notif.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}