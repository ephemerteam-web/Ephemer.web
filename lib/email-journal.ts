// 📬 Contrat FUTUR du SQL docs/sql/email-reliability.sql, absent du schéma réel.
// Seule cette frontière connaît ces RPC. Les types générés restent intacts.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CreateEmailOptions } from 'resend'

export type Claim = { state: string; resend_id?: string | null; id?: string; token?: string; payload?: CreateEmailOptions }
export type EmailStatus = { rappel_id: number; state: string; resend_id: string | null; delivery_status: string; updated_at: string }
type Contract = {
  claim_email_job: { args: { p_key: string; p_kind: string; p_user_id: string; p_rappel_id: number | null; p_notification_ids: string[]; p_event_keys: string[]; p_source: Record<string, unknown>; p_expires_on: string; p_payload: CreateEmailOptions }; result: Claim }
  begin_email_job: { args: { p_job_id: string; p_token: string }; result: { ready: boolean; state: string } }
  finish_email_job: { args: { p_job_id: string; p_token: string; p_outcome: 'accepted' | 'uncertain' | 'retryable' | 'failed'; p_resend_id: string | null }; result: null }
  record_cron_run: { args: { p_cron: string; p_user_id: string; p_day: string; p_phase: string; p_success: boolean }; result: null }
  record_email_webhook: { args: { p_event_id: string; p_resend_id: string; p_type: string; p_occurred_at: string; p_job_id: string | null }; result: null }
  my_email_status: { args: Record<string, never>; result: EmailStatus[] }
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
export function validateJournalResponse(name: keyof Contract, data: unknown): boolean {
  if (name === 'my_email_status') return Array.isArray(data) && data.every(row =>
    object(row) && Number.isSafeInteger(row.rappel_id) && typeof row.state === 'string' &&
    (row.resend_id === null || typeof row.resend_id === 'string') &&
    typeof row.delivery_status === 'string' && typeof row.updated_at === 'string')
  if (name === 'begin_email_job') return object(data) && typeof data.ready === 'boolean' &&
    (data.ready ? data.state === 'sending' : ['busy', 'expired', 'cancelled', 'suspended', 'throttled'].includes(String(data.state)))
  if (name !== 'claim_email_job') return data === null
  if (!object(data) || typeof data.state !== 'string') return false
  if (data.state !== 'reserved') return ['already_accepted', 'cancelled', 'busy', 'review', 'failed', 'expired'].includes(data.state) &&
    (data.resend_id === undefined || data.resend_id === null || typeof data.resend_id === 'string')
  return typeof data.id === 'string' && !!data.id && typeof data.token === 'string' && !!data.token &&
    object(data.payload) && typeof data.payload.from === 'string' && typeof data.payload.subject === 'string' &&
    (typeof data.payload.to === 'string' || (Array.isArray(data.payload.to) && data.payload.to.length > 0 && data.payload.to.every(v => typeof v === 'string'))) &&
    (typeof data.payload.html === 'string' || typeof data.payload.text === 'string')
}
export async function emailJournalRpc<N extends keyof Contract>(
  client: Pick<SupabaseClient<Database>, 'rpc'>, name: N, args: Contract[N]['args']
): Promise<{ data: Contract[N]['result'] | null; error: Error | null }> {
  try {
    // Assertion limitée aux RPC futures ; jamais un client global non typé.
    const call = client.rpc.bind(client) as unknown as
      (name: N, args: Contract[N]['args']) => PromiseLike<{ data: unknown; error: unknown }>
    const result = await call(name, args)
    if (result.error || !validateJournalResponse(name, result.data)) {
      return { data: null, error: new Error('Journal email indisponible ou réponse invalide') }
    }
    return { data: result.data as Contract[N]['result'], error: null }
  } catch {
    return { data: null, error: new Error('Journal email indisponible') }
  }
}
