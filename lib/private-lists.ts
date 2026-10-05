import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Contact, Tables } from '@/types/database'
import { readAllRows } from './pagination'

export type PrivateList = Tables<'listes_personnelles'>
export type Membership = Tables<'appartenances_listes'>
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export async function readPrivateLists(client: SupabaseClient<Database>, owner: string) {
  const [lists, memberships] = await Promise.all([
    readAllRows(() => client.from('listes_personnelles').select('*').eq('user_id', owner)),
    readAllRows(() => client.from('appartenances_listes').select('*').eq('user_id', owner)),
  ])
  return { lists, memberships }
}

export function contactsInList<T extends Pick<Contact, 'id'>>(contacts: T[], list: string, memberships: Membership[]) {
  if (!list) return contacts
  const ids = new Set(memberships.filter(row => row.liste_id === list).map(row => row.contact_id))
  return contacts.filter(contact => ids.has(contact.id))
}

// Écriture exclusivement par le client soumis aux RLS. Jamais d'upsert d'appartenance.
export async function changeMembership(client: SupabaseClient<Database>, owner: string, list: string, contact: number, checked: boolean) {
  if (!checked) {
    const { error } = await client.from('appartenances_listes').delete().eq('user_id', owner).eq('liste_id', list).eq('contact_id', contact)
    if (error) throw error
    return
  }
  const { error } = await client.from('appartenances_listes').insert({ user_id: owner, liste_id: list, contact_id: contact })
  if (!error) return
  if (error.code !== '23505') throw error
  const { data, error: readError } = await client.from('appartenances_listes').select('id').eq('user_id', owner).eq('liste_id', list).eq('contact_id', contact).maybeSingle()
  if (readError || !data) throw error
}

export async function renameList(client: SupabaseClient<Database>, owner: string, list: PrivateList, name: string) {
  const { data, error } = await client.from('listes_personnelles').update({ nom: name.trim() }).eq('user_id', owner).eq('id', list.id).eq('nom', list.nom).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Cette liste a changé ailleurs. Recharge-la avant de la renommer.')
}
