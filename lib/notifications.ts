import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
// Même définition que le compteur : false ET null sont non lus.
export async function markAllNotificationsRead(client: SupabaseClient<Database>, userId: string) {
  const { error } = await client.from('notifications').update({ lue: true })
    .eq('user_id', userId).or('lue.eq.false,lue.is.null')
  if (error) throw new Error('Impossible de tout marquer comme lu. Réessaie.')
}
export function compareNotificationDates(a: { created_at: string | null; id: string }, b: { created_at: string | null; id: string }) {
  return (b.created_at ?? '').localeCompare(a.created_at ?? '') || a.id.localeCompare(b.id)
}
