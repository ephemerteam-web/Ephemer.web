import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Notification } from '@/types/database'
import { readAllRows } from './pagination'
import { compareNotificationDates } from './notifications'

export type UnifiedNotification = Pick<Notification, 'id' | 'message' | 'lue' | 'created_at' | 'contact_id' | 'jours_restants' | 'type' | 'event_date'> & { source: 'rappel' | 'etoile' }
export function notificationKey(notification: Pick<UnifiedNotification, 'source' | 'id'>) { return `${notification.source}:${notification.id}` }
export async function readNotifications(client: SupabaseClient<Database>, ownerId: string): Promise<UnifiedNotification[]> {
  // Une source indisponible rend le compteur indisponible : pas de total partiel.
  const [personal, social] = await Promise.all([
    readAllRows(() => client.from('notifications').select('id,message,lue,created_at,contact_id,jours_restants,type,event_date').eq('user_id', ownerId)),
    readAllRows(() => client.from('notifications_etoiles').select('id,type,lue,created_at').eq('user_id', ownerId)),
  ])
  return [
    ...personal.map(row => ({ ...row, source: 'rappel' as const })),
    ...social.map(row => ({ id: row.id, type: row.type, lue: row.lue, created_at: row.created_at, source: 'etoile' as const, contact_id: null, jours_restants: null, event_date: null,
      message: row.type === 'nouvelle_etoile' ? 'Une nouvelle étoile a rejoint tes relations.' : 'Tu as reçu une demande pour devenir une étoile.' })),
  ].sort((a, b) => compareNotificationDates(a, b) || a.source.localeCompare(b.source))
}
export async function markNotificationRead(client: SupabaseClient<Database>, ownerId: string, notification: Pick<UnifiedNotification, 'source' | 'id'>) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Hors ligne : reconnecte-toi pour marquer comme lu.')
  const table = notification.source === 'etoile' ? 'notifications_etoiles' : 'notifications'
  const { data, error } = await client.from(table).update({ lue: true }).eq('user_id', ownerId).eq('id', notification.id).select('id')
  if (error || !data?.length) throw new Error('Impossible de marquer cette notification comme lue. Réessaie.')
}
export async function markAllMergedNotificationsRead(client: SupabaseClient<Database>, ownerId: string) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Hors ligne : reconnecte-toi pour marquer comme lu.')
  const results = await Promise.all(['notifications', 'notifications_etoiles'].map(table => client.from(table as 'notifications' | 'notifications_etoiles').update({ lue: true }).eq('user_id', ownerId).or('lue.eq.false,lue.is.null')))
  if (results.some(result => result.error)) throw new Error('Marquage incomplet. Actualise et réessaie.')
}
