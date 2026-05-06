'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculerDateEvenement, TypeEvenement } from '@/lib/dates-evenements'
import { SAINTS } from '@/lib/saints'   // ← Nouveau

type NotificationInsert = {
  user_id: string
  contact_id: number
  type: string
  message: string
  event_date: string
  lue?: boolean
}

type Notification = {
  id: string
  message: string
  lue: boolean
  created_at: string
}

const EVENT_TYPES: TypeEvenement[] = ['anniversaire', 'fete_prenomale']

// Fonction pour trouver la prochaine fête d'un saint selon le prénom
function getProchaineFeteSaint(prenom: string): { date: Date; nomSaint: string } | null {
  if (!prenom) return null

  const normalized = prenom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const match = SAINTS.find(sainte =>
    sainte.prenoms.some(p => p === normalized)
  )

  if (!match) return null

  const [month, day] = match.date.split('-').map(Number)
  const today = new Date()
  let year = today.getFullYear()

  let candidate = new Date(year, month - 1, day)
  if (candidate < today) {
    candidate = new Date(year + 1, month - 1, day)
  }

  return { date: candidate, nomSaint: match.nomSaint }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [loading, setLoading] = useState(true)

  const genererNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const userId = session.user.id

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, prenom, nom, date_naissance')
      .eq('user_id', userId)

    if (!contacts || contacts.length === 0) return

    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('contact_id, type, event_date')
      .eq('user_id', userId)

    const existingSet = new Set(
      existingNotifications?.map(n => `${n.contact_id}-${n.type}-${n.event_date}`) || []
    )

    const aujourdHui = new Date()
    aujourdHui.setHours(0, 0, 0, 0)

    const notificationsToInsert: NotificationInsert[] = []

    // === 1. Anniversaires + Fêtes prénomales (basé sur date de naissance) ===
    for (const contact of contacts) {
      for (const typeEvt of ['anniversaire', 'fete_prenomale'] as TypeEvenement[]) {
        const dateEvenement = calculerDateEvenement(typeEvt, {
          prenom: contact.prenom,
          date_naissance: contact.date_naissance,
        })

        if (!dateEvenement) continue

        const dateJ = new Date(dateEvenement)
        dateJ.setHours(0, 0, 0, 0)

        const demain = new Date(aujourdHui)
        demain.setDate(demain.getDate() + 1)

        const dans7Jours = new Date(aujourdHui)
        dans7Jours.setDate(dans7Jours.getDate() + 7)

        let typeNotification = ''
        let emoji = ''
        if (dateJ.getTime() === aujourdHui.getTime()) {
          typeNotification = `${typeEvt}_j0`
          emoji = typeEvt === 'anniversaire' ? '🎂' : '🎉'
        } else if (dateJ.getTime() === demain.getTime()) {
          typeNotification = `${typeEvt}_j1`
          emoji = '📅'
        } else if (dateJ.getTime() === dans7Jours.getTime()) {
          typeNotification = `${typeEvt}_j7`
          emoji = '⏰'
        } else continue

        const cle = `${contact.id}-${typeNotification}-${dateJ.toISOString().split('T')[0]}`
        if (existingSet.has(cle)) continue

        const nomComplet = `${contact.prenom} ${contact.nom || ''}`.trim()
        let messageTexte = `${emoji} ${typeNotification.includes('anniversaire') ? "C'est l'anniversaire" : "C'est la fête"} de ${nomComplet} ${typeNotification.includes('j0') ? "aujourd'hui" : typeNotification.includes('j1') ? "demain" : "dans 7 jours"} !`

        notificationsToInsert.push({
          user_id: userId,
          contact_id: contact.id,
          type: typeNotification,
          message: messageTexte,
          event_date: dateJ.toISOString().split('T')[0],
          lue: false,
        })
      }
    }

    // === 2. Fêtes des Saints (nouveau !) ===
    for (const contact of contacts) {
      const feteSaint = getProchaineFeteSaint(contact.prenom)
      if (!feteSaint) continue

      const dateJ = feteSaint.date
      dateJ.setHours(0, 0, 0, 0)

      const demain = new Date(aujourdHui)
      demain.setDate(demain.getDate() + 1)

      const dans7Jours = new Date(aujourdHui)
      dans7Jours.setDate(dans7Jours.getDate() + 7)

      let typeNotification = ''
      let emoji = '🎉'
      let suffix = ''

      if (dateJ.getTime() === aujourdHui.getTime()) {
        typeNotification = 'fete_saint_j0'
        suffix = "aujourd'hui"
      } else if (dateJ.getTime() === demain.getTime()) {
        typeNotification = 'fete_saint_j1'
        suffix = 'demain'
      } else if (dateJ.getTime() === dans7Jours.getTime()) {
        typeNotification = 'fete_saint_j7'
        suffix = 'dans 7 jours'
      } else continue

      const cle = `${contact.id}-${typeNotification}-${dateJ.toISOString().split('T')[0]}`
      if (existingSet.has(cle)) continue

      const messageTexte = `${emoji} C'est bientôt la fête de ${contact.prenom} (${feteSaint.nomSaint}) ${suffix} !`

      notificationsToInsert.push({
        user_id: userId,
        contact_id: contact.id,
        type: typeNotification,
        message: messageTexte,
        event_date: dateJ.toISOString().split('T')[0],
        lue: false,
      })
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert)
    }
  }, [])

  const chargerNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, lue, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) setNotifications(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await genererNotifications()
      await chargerNotifications()
    }
    init()
  }, [genererNotifications, chargerNotifications])

  async function marquerLue(id: string) {
    await supabase.from('notifications').update({ lue: true }).eq('id', id)
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, lue: true } : n))
    )
  }

  const nbNonLues = notifications.filter(n => !n.lue).length

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-3 rounded-full hover:bg-white/10 transition"
        title="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {nbNonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {nbNonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={() => setOuvert(false)} />
          <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 w-[calc(100%-2rem)] sm:w-80 max-h-[75vh] bg-gray-900 text-white rounded-2xl shadow-2xl z-40 overflow-hidden border border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
              <h3 className="font-semibold">📬 Notifications</h3>
              <button onClick={() => setOuvert(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {loading ? (
              <p className="p-6 text-center text-gray-400">Chargement...</p>
            ) : notifications.length === 0 ? (
              <p className="p-8 text-center text-gray-400">Aucune notification pour le moment</p>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => marquerLue(notif.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-800/70 transition-all ${notif.lue ? 'opacity-70' : 'bg-purple-900/10'}`}
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
