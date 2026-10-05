import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { occurrenceNotifications } from './occurrence-reminders'
type Entry = ReturnType<typeof occurrenceNotifications>[number]

// L'ancien index par date et le nouvel index par occurrence coexistent.
// Réutiliser une alerte encore en attente ; ne pas réécrire un envoi accepté.
export async function persistOccurrenceNotification(client: SupabaseClient<Database>, row: Entry) {
  const { error } = await client.from('notifications').insert(row)
  if (!error) return 1
  if (error.code !== '23505') throw error
  let { data: current, error: readError } = await client.from('notifications').select('id,occurrence_id,occurrence_revision,email_envoye')
    .eq('user_id', row.user_id).eq('occurrence_id', row.occurrence_id).eq('type', row.type).eq('jours_restants', row.jours_restants).maybeSingle()
  if (readError) throw readError
  if (!current && row.contact_id !== null) {
    const response = await client.from('notifications').select('id,occurrence_id,occurrence_revision,email_envoye')
      .eq('user_id', row.user_id).eq('contact_id', row.contact_id).eq('event_date', row.event_date).eq('type', row.type).eq('jours_restants', row.jours_restants).maybeSingle()
    current = response.data; readError = response.error
  }
  if (readError) throw readError
  if (!current || (current.occurrence_id && current.occurrence_id !== row.occurrence_id)) throw new Error('Conflit de notification : relecture nécessaire')
  if (current.email_envoye) return 0
  let query = client.from('notifications').update({ occurrence_id: row.occurrence_id, occurrence_revision: row.occurrence_revision,
    event_date: row.event_date, event_description: row.event_description, message: row.message })
    .eq('user_id', row.user_id).eq('id', current.id).eq('email_envoye', false)
  query = current.occurrence_revision === null ? query.is('occurrence_revision', null) : query.eq('occurrence_revision', current.occurrence_revision)
  const response = await query
  if (response.error) throw response.error
  return 0
}
