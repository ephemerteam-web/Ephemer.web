import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Rappel } from '@/types/database'
export async function rappelOccurrenceCurrent(client: SupabaseClient<Database>, rappel: Rappel) {
  if (!rappel.occurrence_id) {
    if (rappel.source === 'message_programme') return true
    // Ne plus envoyer le calcul historique d'une date explicitement remplacée.
    const kind = rappel.type_evenement === 'fete_prenomale' ? 'fete_prenomale' : rappel.type_evenement
    if (!['anniversaire', 'fete_prenomale'].includes(kind)) return true
    const query = client.from('evenements_personnels').select('id').eq('user_id', rappel.user_id).eq('type_evenement', kind)
    const { data, error } = await (rappel.contact_id === null ? query.is('contact_id', null) : query.eq('contact_id', rappel.contact_id))
    if (error) throw error
    return !data?.length
  }
  const { data: occurrence, error } = await client.from('occurrences_evenements').select('*').eq('user_id', rappel.user_id).eq('id', rappel.occurrence_id).maybeSingle()
  if (error) throw error
  if (!occurrence || occurrence.annulee || occurrence.revision !== rappel.occurrence_revision || occurrence.date_occurrence !== rappel.event_date) return false
  const { data: event, error: eventError } = await client.from('evenements_personnels').select('*').eq('user_id', rappel.user_id).eq('id', occurrence.evenement_id).maybeSingle()
  if (eventError) throw eventError
  return !!event && !event.archive && event.rappels_actifs && !event.choix_a_reconfirmer && event.contact_id === rappel.contact_id &&
    (event.arrete_apres_cycle === null || occurrence.cycle === 0 || occurrence.cycle <= event.arrete_apres_cycle)
}
