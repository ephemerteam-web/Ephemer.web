import { supabase } from './supabase-browser'

export async function readOwnRows(table: 'contacts' | 'rappels' | 'notifications' | 'notification_preferences' | 'profiles' | 'invitations', userId: string) {
  const rows: Record<string, unknown>[] = []
  const owner = table === 'profiles' ? 'id' : 'user_id'
  const order = table === 'notification_preferences' ? 'user_id' : 'id'
  // Les liens d'invitation sont des capacités d'accès : ne pas exporter leurs tokens.
  const columns = table === 'invitations' ? 'id,user_id,actif,expires_at,nb_utilisations,max_utilisations' : '*'
  for (let offset = 0; offset < 100000; offset += 200) {
    const { data, error } = await supabase.from(table).select<string, Record<string, unknown>>(columns).eq(owner, userId).order(order).range(offset, offset + 199)
    if (error) throw new Error(`Lecture impossible : ${table}. Aucun export partiel n’a été téléchargé.`)
    rows.push(...(data ?? []))
    if (!data || data.length < 200) return rows
  }
  throw new Error('Export trop volumineux pour le navigateur. Aucun fichier partiel téléchargé.')
}

export async function exportOwnData() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Reconnecte-toi pour exporter tes données.')
  const tables = ['profiles', 'contacts', 'rappels', 'notifications', 'notification_preferences', 'invitations'] as const
  const result: Record<string, unknown> = {
    format: 'ephemer-personal-export', version: 1, exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    limitations: 'Lecture paginée sans instantané transactionnel. Tokens d’invitation, secrets de session et clés push exclus. Les journaux des prestataires et sauvegardes ne sont pas inclus.',
  }
  for (const table of tables) result[table] = await readOwnRows(table, user.id)
  const { data: current } = await supabase.auth.getUser()
  if (current.user?.id !== user.id) throw new Error('La session a changé. Relance l’export.')
  return result
}
