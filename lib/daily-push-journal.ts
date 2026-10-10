// Contrat futur du SQL documenté ; les types générés de la DB restent intacts.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
type Args = { p_user_id: string; p_device_key: string; p_day: string }
export async function dailyPushRpc(client: Pick<SupabaseClient<Database>, 'rpc'>, name: 'claim_daily_push' | 'daily_push_ready', args: Args | Record<string, never>) {
  const call = client.rpc.bind(client) as unknown as (name: string, args: Args | Record<string, never>) => PromiseLike<{ data: unknown; error: unknown }>
  const result = await call(name, args)
  if (result.error || typeof result.data !== 'boolean') throw new Error('Journal push indisponible')
  return result.data
}
