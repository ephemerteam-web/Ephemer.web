// Machine de traitement à services injectés ; le worker du cron fournit les transports réels.
import { collectiveDue } from './collective-card-schedule'

export type CollectiveEmailPayload = { from: string; to: string; subject: string; html: string; text: string }
export type CollectiveEmailClaim = { state: 'reserved'; id: string; token: string; dueAt: string; payload: CollectiveEmailPayload } | { state: 'busy' | 'accepted' | 'cancelled' | 'uncertain' | 'failed' | 'a_reprogrammer' | 'waiting' }
export type CollectiveDeliveryTransport = {
  claim: () => Promise<CollectiveEmailClaim>
  begin: (id: string, token: string) => Promise<{ ready: boolean; state: 'sending' | 'busy' | 'retryable' | 'cancelled' | 'a_reprogrammer' }>
  stop: (id: string, token: string, state: 'a_reprogrammer') => Promise<void>
  send: (payload: CollectiveEmailPayload & { tags: { name: string; value: string }[] }, options: { idempotencyKey: string }) => Promise<{ data?: { id?: string } | null; error?: { statusCode?: number | null } | null }>
  finish: (id: string, token: string, outcome: 'accepted' | 'uncertain' | 'retryable' | 'failed', providerId: string | null) => Promise<void>
}
export async function processCollectiveEmail(transport: CollectiveDeliveryTransport, now = Date.now()): Promise<string> {
  const claim = await transport.claim()
  if (claim.state !== 'reserved') return claim.state
  const due = collectiveDue(claim.dueAt, now)
  if (due === 'attente') return 'waiting'
  if (due === 'a_reprogrammer') { await transport.stop(claim.id, claim.token, 'a_reprogrammer'); return due }
  // begin doit vérifier atomiquement publication, lien, droits, quota et annulation.
  const engagement = await transport.begin(claim.id, claim.token)
  if (!engagement.ready) return engagement.state
  if (engagement.state !== 'sending') throw new Error('Engagement incohérent : aucun envoi effectué.')
  let result: Awaited<ReturnType<CollectiveDeliveryTransport['send']>>
  try { result = await transport.send({ ...claim.payload, tags: [{ name: 'ephemer_job', value: claim.id }] }, { idempotencyKey: 'email/' + claim.id }) }
  catch { await transport.finish(claim.id, claim.token, 'uncertain', null); return 'uncertain' }
  if (result.error || !result.data?.id) {
    const status = result.error?.statusCode
    const state = status === 429 ? 'retryable' : status && status >= 400 && status < 500 ? 'failed' : 'uncertain'
    await transport.finish(claim.id, claim.token, state, null)
    return state
  }
  // Une panne ici ne doit jamais relancer send : le journal reste engagé, à rapprocher.
  await transport.finish(claim.id, claim.token, 'accepted', result.data.id)
  return 'accepted'
}
export const COLLECTIVE_EMAIL_LABELS = {
  absent: 'Aucun envoi programmé', programme: 'Envoi programmé', pris_en_charge: 'Pris en charge : annulation non garantie',
  accepte: 'Accepté par le fournisseur — livraison non confirmée', livre: 'Livraison confirmée par le fournisseur',
  echec: 'Échec', annule: 'Annulé avant prise en charge', incertain: 'Résultat incertain — rapprochement requis', a_reprogrammer: 'Délai dépassé — à reprogrammer',
} as const
