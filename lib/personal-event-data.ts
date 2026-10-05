import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { readAllRows } from './pagination'
import { daysBetween } from './calendar-day'
import { type EventData, type Occurrence, shiftDay } from './personal-events'

// Le propriétaire vient de la session vérifiée, jamais d'un paramètre client.
export async function readEventData(client: SupabaseClient<Database>, owner: string, start: string, end: string, server = false, materialize = true): Promise<EventData> {
  if (daysBetween(start, end) < 0 || daysBetween(start, end) > 800) throw new Error('Période invalide')
  const occurrences: Occurrence[] = []
  for (let cursor = start; materialize && cursor <= end;) {
    const limit = shiftDay(cursor, Math.min(399, daysBetween(cursor, end)))
    const rows = await readAllRows(() => server
      ? client.rpc('materialiser_occurrences_serveur_lot02', { p_user: owner, p_debut: cursor, p_fin: limit })
      : client.rpc('materialiser_occurrences_lot02', { p_debut: cursor, p_fin: limit }))
    occurrences.push(...rows)
    cursor = shiftDay(limit, 1)
  }
  const [contacts, events, rules, history] = await Promise.all([
    readAllRows(() => client.from('contacts').select('*').eq('user_id', owner)),
    readAllRows(() => client.from('evenements_personnels').select('*').eq('user_id', owner)),
    readAllRows(() => client.from('regles_evenements').select('*').eq('user_id', owner)),
    readAllRows(() => client.from('occurrences_evenements').select('*').eq('user_id', owner).gte('date_occurrence', start).lte('date_occurrence', end)),
  ])
  if (occurrences.some(row => row.user_id !== owner)) throw new Error('Occurrence inaccessible')
  return { contacts, events, rules, occurrences: history }
}
