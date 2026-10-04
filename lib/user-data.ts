import { readPages } from './pagination'
import { supabase } from './supabase-browser'

export async function readOwnRows(table: 'contacts' | 'rappels' | 'notifications' | 'notification_preferences' | 'profiles' | 'invitations', userId: string) {
  const rows: Record<string, unknown>[] = []
  const owner = table === 'profiles' ? 'id' : 'user_id'
  const order = table === 'notification_preferences' ? 'user_id' : 'id'
  // Les liens d'invitation sont des capacités d'accès : ne pas exporter leurs tokens.
  const columns = table === 'invitations' ? 'id,user_id,actif,expires_at,nb_utilisations,max_utilisations' : '*'
  try {
    for await (const page of readPages(() => supabase.from(table).select<string, Record<string, unknown>>(columns).eq(owner, userId), order)) {
      rows.push(...page)
      if (rows.length > 100000) throw new Error('Export trop volumineux')
    }
    return rows
  } catch { throw new Error(`Lecture impossible : ${table}. Aucun export partiel n’a été téléchargé.`) }
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
