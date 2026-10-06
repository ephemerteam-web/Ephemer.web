// 🔐 Accès navigateur soumis aux RLS, propriétaire explicite et révision attendue.
import { supabase } from './supabase-browser'
import { requireOwner } from './attention-data'
import { readAllRows } from './pagination'
import { CATEGORIES_CADEAU } from './gift-config'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type PreferenceTable = 'styles_messages' | 'preferences_styles_messages' | 'styles_messages_contacts' | 'preferences_cadeaux_contacts'
export async function preferenceRows<T extends PreferenceTable>(table: T, owner: string): Promise<Tables<T>[]> {
  const name = table as PreferenceTable
  await requireOwner(owner)
  const rows = await readAllRows(() => supabase.from(name).select('*').eq('user_id', owner))
  await requireOwner(owner)
  return rows as Tables<T>[]
}
export async function readStyleBook(owner: string) {
  const [styles, defaults, contacts] = await Promise.all([
    preferenceRows('styles_messages', owner), preferenceRows('preferences_styles_messages', owner), preferenceRows('styles_messages_contacts', owner),
  ])
  return { styles, defaultPreference: defaults[0] ?? null, contacts }
}
export function giftCategories(values: string[]): string[] {
  if (values.length > 5 || new Set(values).size !== values.length || values.some(v => !CATEGORIES_CADEAU.some(c => c.id === v))) throw new Error('Catégories inconnues ou répétées.')
  return values
}
function confirmRetriedInsert(existing: Record<string, unknown>, payload: Record<string, unknown>) {
  if (Object.entries(payload).some(([key, value]) => JSON.stringify(existing[key]) !== JSON.stringify(value))) throw new Error('La création précédente a réussi avec une autre saisie. Copie tes changements, puis recharge pour comparer avant de les enregistrer.')
}
export async function savePreference<T extends PreferenceTable>(table: T, owner: string, id: string, revision: number | null, values: TablesUpdate<T>): Promise<Tables<T>> {
  const name = table as PreferenceTable
  const columns = name === 'styles_messages' ? ['nom', 'ton', 'longueur', 'adresse', 'emojis', 'signature'] : name === 'preferences_cadeaux_contacts' ? ['categories'] : ['style_id']
  const source = values as Record<string, unknown>
  const payload = Object.fromEntries(columns.filter(k => k in source).map(k => [k, source[k]]))
  // Le contact ne fait partie que de l'INSERT : son UPDATE n'est pas autorisé par le contrat installé.
  if (revision === null && (name === 'styles_messages_contacts' || name === 'preferences_cadeaux_contacts')) payload.contact_id = source.contact_id
  await requireOwner(owner)
  if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER)) throw new Error('Révision invalide.')
  if (revision === null) {
    const existing = await supabase.from(name).select('*').eq('user_id', owner).eq('id', id).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) { confirmRetriedInsert(existing.data, payload); await requireOwner(owner); return existing.data as Tables<T> }
  }
  const inserted = { ...payload, id, user_id: owner }
  const result = revision === null
    ? name === 'styles_messages'
      ? await supabase.from('styles_messages').insert(inserted as TablesInsert<'styles_messages'>).select().single()
      : name === 'preferences_styles_messages'
        ? await supabase.from('preferences_styles_messages').insert(inserted as TablesInsert<'preferences_styles_messages'>).select().single()
        : name === 'styles_messages_contacts'
          ? await supabase.from('styles_messages_contacts').insert(inserted as TablesInsert<'styles_messages_contacts'>).select().single()
          : await supabase.from('preferences_cadeaux_contacts').insert(inserted as TablesInsert<'preferences_cadeaux_contacts'>).select().single()
    : await supabase.from(name).update({ ...payload, revision: revision + 1 } as TablesUpdate<PreferenceTable>).eq('user_id', owner).eq('id', id).eq('revision', revision).select().single()
  if (result.error || !result.data) {
    // Deux onglets peuvent terminer le même INSERT. Relire cet UUID seulement ; jamais écraser l'autre choix.
    if (revision === null && result.error?.code === '23505') {
      const retry = await supabase.from(name).select('*').eq('user_id', owner).eq('id', id).maybeSingle()
      if (retry.error) throw retry.error
      if (retry.data) { confirmRetriedInsert(retry.data, payload); await requireOwner(owner); return retry.data as Tables<T> }
      throw new Error('Une préférence existe déjà. Ta saisie est conservée ; recharge avant de choisir laquelle garder.')
    }
    throw result.error ?? { code: '40001' }
  }
  await requireOwner(owner)
  return result.data as Tables<T>
}
export async function removePreference(table: PreferenceTable, owner: string, id: string, revision: number) {
  await requireOwner(owner)
  const result = await supabase.from(table).delete().eq('user_id', owner).eq('id', id).eq('revision', revision).select('id').single()
  if (result.error || !result.data) throw result.error ?? { code: '40001' }
  await requireOwner(owner)
}
