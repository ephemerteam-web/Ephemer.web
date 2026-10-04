// 📬 Journal serveur : aucun envoi si la réservation durable échoue.
import { supabaseAdmin } from './supabase-admin'
import { resend } from './resend'
import type { CreateEmailOptions } from 'resend'

export type EmailJob = {
  key: string
  kind: 'rappel' | 'recap' | 'newsletter'
  userId: string
  rappelId?: number
  notificationIds?: string[]
  eventKeys?: string[]
  source?: Record<string, unknown>
  expiresOn: string
  payload: CreateEmailOptions
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.rpc(name, args)
  if (error) throw new Error(`Journal email indisponible (${name})`)
  return data
}

export async function deliverEmail(job: EmailJob): Promise<{ state: string; emailId?: string }> {
  const claim = await rpc('claim_email_job', {
    p_key: job.key, p_kind: job.kind, p_user_id: job.userId,
    p_rappel_id: job.rappelId ?? null, p_notification_ids: job.notificationIds ?? [],
    p_event_keys: job.eventKeys ?? [], p_source: job.source ?? {},
    p_expires_on: job.expiresOn, p_payload: job.payload,
  })
  if (claim.state !== 'reserved') return { state: claim.state, emailId: claim.resend_id ?? undefined }
  const started = await rpc('begin_email_job', { p_job_id: claim.id, p_token: claim.token })
  if (!started.ready) return { state: started.state }
  // Le contenu et la clé sont ceux enregistrés à la première réservation.
  let response
  try {
    response = await resend.emails.send({ ...claim.payload, tags: [{ name: 'ephemer_job', value: claim.id }] }, { idempotencyKey: `email/${claim.id}` })
  } catch {
    // Une exception réseau ne prouve pas que Resend a refusé l'email.
    await rpc('finish_email_job', { p_job_id: claim.id, p_token: claim.token, p_outcome: 'uncertain', p_resend_id: null })
    throw new Error('Envoi incertain : enregistré pour rapprochement')
  }
  if (response.error) {
    const status = response.error.statusCode
    // Seul un refus explicite 429 autorise une reprise sans ambiguïté.
    // Les 5xx sont conservateurs : le prestataire a pu accepter avant l'erreur.
    const outcome = status === 429 ? 'retryable' : status && status < 500 ? 'failed' : 'uncertain'
    await rpc('finish_email_job', { p_job_id: claim.id, p_token: claim.token, p_outcome: outcome, p_resend_id: null })
    throw new Error(outcome === 'failed' ? 'Envoi refusé par Resend' : 'Envoi à reprendre ou à vérifier')
  }
  if (!response.data?.id) {
    await rpc('finish_email_job', { p_job_id: claim.id, p_token: claim.token, p_outcome: 'uncertain', p_resend_id: null })
    throw new Error('Réponse Resend sans identifiant : livraison incertaine')
  }
  // Cet appel conserve l'ID, la tentative et le statut source dans une transaction.
  // S'il échoue, la réservation reste incertaine : pas de renvoi après 23 heures.
  await rpc('finish_email_job', { p_job_id: claim.id, p_token: claim.token, p_outcome: 'accepted', p_resend_id: response.data.id })
  return { state: 'accepted', emailId: response.data.id }
}

export async function recordCronRun(cron: string, userId: string, date: string, phase: string, success: boolean) {
  await rpc('record_cron_run', { p_cron: cron, p_user_id: userId, p_day: date, p_phase: phase, p_success: success })
}
