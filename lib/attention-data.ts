import { supabase } from '@/lib/supabase-browser'
import { readAllRows } from './pagination'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Preparation = Tables<'preparations_evenements'>
export type Task = Tables<'taches_preparation'>
export type Idea = Tables<'idees_cadeaux'>
export type Choice = Tables<'choix_cadeaux'>
export type Gift = Tables<'cadeaux_offerts'>
export type AttentionTable = 'idees_cadeaux' | 'choix_cadeaux' | 'cadeaux_offerts'

export async function requireOwner(owner: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || user?.id !== owner) throw new Error('La session a changé. Reconnecte-toi.')
}
export async function attentionRows<T extends AttentionTable | 'preparations_evenements' | 'taches_preparation'>(table: T, owner: string) {
  const name: AttentionTable | 'preparations_evenements' | 'taches_preparation' = table
  const rows = await readAllRows(() => supabase.from(name).select('*').eq('user_id', owner))
  return rows as Tables<T>[]
}
export async function saveAttention(table: AttentionTable, owner: string, id: string, revision: number | null, values: TablesUpdate<AttentionTable>) {
  await requireOwner(owner)
  if (revision === null) {
    // Un UUID conservé par le formulaire permet de retrouver un INSERT réussi dont la réponse a été perdue.
    const existing = await supabase.from(table).select('*').eq('user_id', owner).eq('id', id).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) return existing.data
  }
  const inserted = { ...values, id, user_id: owner }
  const result = revision === null
    ? table === 'idees_cadeaux'
      ? await supabase.from('idees_cadeaux').insert(inserted as TablesInsert<'idees_cadeaux'>).select().single()
      : table === 'choix_cadeaux'
        ? await supabase.from('choix_cadeaux').insert(inserted as TablesInsert<'choix_cadeaux'>).select().single()
        : await supabase.from('cadeaux_offerts').insert(inserted as TablesInsert<'cadeaux_offerts'>).select().single()
    : await supabase.from(table).update({ ...values, revision: revision + 1 }).eq('user_id', owner).eq('id', id).eq('revision', revision).select().single()
  if (result.error || !result.data) throw result.error ?? new Error('Donnée inaccessible.')
  return result.data
}
export async function removeAttention(table: AttentionTable, owner: string, id: string) {
  await requireOwner(owner)
  const result = await supabase.from(table).delete().eq('user_id', owner).eq('id', id).select('id').single()
  if (result.error || !result.data) throw result.error ?? new Error('Donnée inaccessible.')
}
export async function loadPreparation(owner: string, occurrenceId: string) {
  await requireOwner(owner)
  const occurrence = await supabase.from('occurrences_evenements').select('*').eq('user_id', owner).eq('id', occurrenceId).single()
  if (occurrence.error || !occurrence.data) throw new Error('Cet événement est inaccessible ou a été supprimé.')
  const event = await supabase.from('evenements_personnels').select('*').eq('user_id', owner).eq('id', occurrence.data.evenement_id).single()
  if (event.error || !event.data) throw new Error('Événement inaccessible.')
  const contact = event.data.contact_id === null ? null : await supabase.from('contacts').select('*').eq('user_id', owner).eq('id', event.data.contact_id).single()
  if (contact?.error) throw new Error('Contact inaccessible.')
  const opened = await supabase.rpc('ouvrir_preparation_lot04', { p_occurrence: occurrenceId })
  if (opened.error || !opened.data) throw opened.error ?? new Error('Préparation inaccessible.')
  const tasks = await readAllRows(() => supabase.from('taches_preparation').select('*').eq('user_id', owner).eq('preparation_id', opened.data.id))
  return { occurrence: occurrence.data, event: event.data, contact: contact?.data ?? null, preparation: opened.data, tasks }
}
