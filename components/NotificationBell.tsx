'use client'
import { useDashboardUser } from '@/components/DashboardUserContext'
import LoadFailure from '@/components/LoadFailure'
import { createRequestScope } from '@/lib/request-scope'
import { markAllNotificationsRead, compareNotificationDates } from '@/lib/notifications'
import { notifyNotificationsChanged, subscribeNotificationChanges } from '@/lib/notification-changes'
import { readAllResult } from '@/lib/pagination'
// "use client" veut dire : ce composant tourne dans le NAVIGATEUR (pas sur le serveur)
// Il a besoin de React, des clics utilisateur, etc.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useDrawer } from '@/components/DrawerContext'
import { useRouter } from 'next/navigation'

// ── Types (définitions de la forme de nos données) ────────────────
type Notification = Pick<import('@/types/database').Notification, 'id' | 'message' | 'lue' | 'created_at' | 'contact_id' | 'jours_restants' | 'type'>

// ── Composant principal ───────────────────────────────────────────
export default function NotificationBell() {
  const router = useRouter()
  const user = useDashboardUser()
  const scopeRef = useRef(createRequestScope())
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { ouvrirDrawer } = useDrawer()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
    scopeRef.current.cancel()
    const scope = createRequestScope()
    scopeRef.current = scope
    setLoading(true)
    try {

      const { data, error: fetchError } = await readAllResult(() => supabase
        .from('notifications')
        .select('id, message, lue, created_at, contact_id, jours_restants, type')
        .eq('user_id', user.id))
      if (!scope.current()) return

      if (fetchError) {
        console.error('Erreur chargement notifs:', fetchError.message)
        setError('Impossible de charger les notifications')
      } else if (data) {
        setNotifications(data.sort(compareNotificationDates))
        setError(null)
      }
    } catch (err) {
      console.error('Erreur chargement notifications:', err)
      if (scope.current()) setError('Erreur de connexion')
    }
    if (scope.current()) setLoading(false)
  }, [user.id])

  // ── Tout marquer comme lu ────────────────────────────────────
  const marquerToutCommeLu = useCallback(async () => {
    const scope = scopeRef.current
    try {
      await markAllNotificationsRead(supabase, user.id)
      if (scope.current()) { await chargerNotifications(); notifyNotificationsChanged(user.id, 'bell') }
    } catch {
      if (scope.current()) setError('Impossible de tout marquer comme lu. Réessaie.')
    }
  }, [user.id, chargerNotifications])

  // ── Realtime : écouter les nouvelles notifs en direct ⚡ ──────
  useEffect(() => subscribeNotificationChanges((ownerId, source) => {
    if (ownerId === user.id && source !== 'bell') void chargerNotifications()
  }), [user.id, chargerNotifications])

  useEffect(() => {
    const channel = supabase.channel('notifications-listen-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + user.id },
        () => { void chargerNotifications() }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user.id, chargerNotifications])

  // ── Initialisation au chargement ────────────────────────────
  useEffect(() => {
    // Chargement réseau initial : les mises à jour suivent la réponse Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void chargerNotifications()
    return () => scopeRef.current.cancel()
  }, [chargerNotifications])

  // ── Fermeture avec Échap (accessibilité) ────────────────────
  useEffect(() => {
    if (!ouvert) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOuvert(false); triggerRef.current?.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ouvert])

  // ── Marquer une notification comme lue ──────────────────────
  async function marquerLue(id: string) {
    try {
      const { error } = await supabase.from('notifications').update({ lue: true }).eq('id', id).eq('user_id', user.id)
      if (error) throw error
      if (!scopeRef.current.current()) return
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n))
      notifyNotificationsChanged(user.id, 'bell')
    } catch (err) {
      console.error('Erreur marquer lue:', err)
      if (scopeRef.current.current()) setError('Impossible de marquer cette notification comme lue. Réessaie.')
    }
  }

  // ── Clic sur une notification ───────────────────────────────
  async function handleNotificationClick(notif: Notification) {
    marquerLue(notif.id)
    setOuvert(false)
    if (notif.contact_id === null) return


    const scope = scopeRef.current
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', notif.contact_id)
      .eq('user_id', user.id)
      .single()

    if (!scope.current()) return
    if (contactError || !contact) {
      setError('Impossible de charger ce contact. Réessaie.'); setOuvert(true); return
    }

    // 👈 un contact venu d'une invitation est un contact "lié"
    const estLie = false

    ouvrirDrawer({ ...contact, estLie })
  }

  // ── Calcul du nombre de notifications non lues ──────────────
  const nbNonLues = notifications.filter(n => !n.lue).length

  // ── Rendu visuel ────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ── Bouton cloche ── */}
      <button
        ref={triggerRef}
        onClick={() => setOuvert(!ouvert)}
        className="relative p-3 rounded-full hover:bg-ink/10 transition focus:outline-none focus:ring-2 focus:ring-accent/50"
        title="Notifications"
        aria-label={error || loading ? 'Notifications : compteur indisponible' : `${nbNonLues} notification${nbNonLues > 1 ? 's' : ''} non lue${nbNonLues > 1 ? 's' : ''}`}
      >
        <span className="text-2xl">🔔</span>
        {!error && !loading && nbNonLues > 0 && (
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
            className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-12 w-auto sm:w-80 max-h-[75dvh] bg-surface text-ink rounded-2xl shadow-2xl z-40 overflow-hidden border border-gray-700 flex flex-col"
            role="dialog"
            aria-labelledby="notifications-title"
          >
            {/* En-tête */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-surface rounded-t-2xl">
              <button
                onClick={() => {
                  setOuvert(false)
                  router.push('/dashboard/notifications')
                }}
                className="font-semibold hover:text-accent transition active:scale-95 flex items-center gap-2"
              >
                Notifications → 📬
              </button>
              <div className="flex gap-2 items-center">
                {nbNonLues > 0 && (
                  <button
                    onClick={marquerToutCommeLu}
                    className="text-xs text-accent hover:text-accent px-2 py-1 rounded transition active:scale-95 touch-manipulation"
                    aria-label="Tout marquer comme lu"
                  >
                    ✓ Tout lu
                  </button>
                )}
                <button
                  onClick={() => setOuvert(false)}
                  className="text-muted hover:text-ink"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenu */}
            {error ? <LoadFailure message={error} retry={() => void chargerNotifications()} /> : loading ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-accent/30 border-t-[#C8A84E] rounded-full animate-spin" />
                <p className="text-muted text-sm">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-2">
                <span className="text-4xl">📭</span>
                <p className="text-muted">Aucune notification</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNotificationClick(notif) }}
                    className={`p-4 cursor-pointer hover:bg-surface/70 transition-all ${
                      notif.lue
                        ? 'opacity-70'
                        : `${notif.type === 'invitation_remplie' ? 'bg-emerald-900/15' : 'bg-purple-900/10'} border-l-4 ${getCouleurUrgence(notif)}`
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="text-[15px] leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-muted mt-2">
                      {notif.created_at ? new Date(notif.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'Date inconnue'}
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
