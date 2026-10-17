import 'server-only'
import { randomUUID } from 'node:crypto'
import { collectiveServiceRpc, publishCollective } from './collective-card-server'
import { closedCollectiveObject } from './collective-card'
import { celebrationUuid } from './celebration-contract'
import { collectiveEmail } from './collective-card-workflow'
import { openCollectiveContent, sealCollectiveContent, type CollectiveCryptoContext } from './collective-card-crypto'
import type { EncryptedCardSecret } from './card-link-crypto'
import { cardSecretHash, isCardSecret } from './card-link-crypto'
import { collectiveEmailPayload } from './collective-card-email'
import { processCollectiveEmail, type CollectiveDeliveryTransport, type CollectiveEmailClaim, type CollectiveEmailPayload } from './collective-card-delivery'

type Dependencies = { rpc: typeof collectiveServiceRpc; send: CollectiveDeliveryTransport['send']; now: () => number }
function emailPayload(value: unknown): CollectiveEmailPayload {
  const p = closedCollectiveObject(value, ['from', 'to', 'subject', 'html', 'text'])
  if (p.from !== 'Ephemer <noreply@ephemer.name>' || typeof p.subject !== 'string' || /[\r\n]/.test(p.subject) || typeof p.html !== 'string' || typeof p.text !== 'string') throw new Error('Enveloppe email invalide.')
  return { from: p.from, to: collectiveEmail(p.to), subject: p.subject, html: p.html, text: p.text }
}
export async function processCollectiveBatch(deps: Dependencies, limit = 25) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 25) throw new Error('Lot collectif invalide.')
  const raw = await deps.rpc('lire_echeances_cartes', { p_limite: limit })
  if (!Array.isArray(raw) || raw.length > limit) throw new Error('Échéances invalides.')
  const result = { traites: 0, publications: 0, acceptes: 0, incertains: 0, erreurs: 0 }, start = deps.now()
  for (const item of raw) {
    // Borne de travail partagée avec le cron existant ; le prochain passage reprend les autres plans.
    if (deps.now() - start > 20000) break
    result.traites++
    try {
      const row = closedCollectiveObject(item, ['plan', 'carte', 'publication', 'envoi']), plan = celebrationUuid(row.plan), card = celebrationUuid(row.carte)
      if (typeof row.publication !== 'boolean' || typeof row.envoi !== 'boolean') throw new Error('Échéance invalide.')
      if (row.publication) {
        const ready = await deps.rpc('preparer_publication_collective', { p_plan: plan })
        if (ready !== null) {
          const p = closedCollectiveObject(ready, ['celebration', 'carte', 'actor', 'revision'])
          if (p.carte !== card || !Number.isSafeInteger(p.revision) || Number(p.revision) < 1) throw new Error('Publication invalide.')
          const published = await publishCollective({ service: deps.rpc }, { celebration: celebrationUuid(p.celebration), card, actor: celebrationUuid(p.actor), revision: Number(p.revision), operation: plan, version: randomUUID(), expiryDays: 30, plan })
          if (published && typeof published === 'object' && 'version' in published) result.publications++
        }
      }
      if (!row.envoi) continue
      const envelope = await deps.rpc('lire_enveloppe_carte', { p_plan: plan })
      if (envelope === null) {
        // Le serveur suspend aussi les échéances de plus de 48 h, sans construire d'email.
        await deps.rpc('reserver_email_carte', { p_plan: plan, p_payload_chiffre: {} }); continue
      }
      const e = closedCollectiveObject(envelope, ['celebration', 'carte', 'version', 'lien', 'secretChiffre', 'address', 'dueAt'])
      if (e.carte !== card || typeof e.dueAt !== 'string' || !Number.isFinite(Date.parse(e.dueAt))) throw new Error('Enveloppe invalide.')
      const context: CollectiveCryptoContext = { celebration: celebrationUuid(e.celebration), card, version: celebrationUuid(e.version) }
      const secret = openCollectiveContent(e.secretChiffre as EncryptedCardSecret, context, 'lien')
      if (!isCardSecret(secret)) throw new Error('Lien invalide.')
      // Dernière lecture publique avant réservation. begin revérifie encore sous verrou avant send.
      if (await deps.rpc('consulter_carte_collective', { p_empreinte: cardSecretHash(secret) }) === null) continue
      const candidate = sealCollectiveContent(JSON.stringify(collectiveEmailPayload(collectiveEmail(e.address), secret)), context, 'email')
      const state = await processCollectiveEmail({
        claim: async () => {
          const claim = await deps.rpc('reserver_email_carte', { p_plan: plan, p_payload_chiffre: candidate })
          if (!claim || typeof claim !== 'object' || !('state' in claim)) throw new Error('Réservation invalide.')
          if (claim.state !== 'reserved') {
            closedCollectiveObject(claim, ['state'])
            if (!['busy', 'accepted', 'cancelled', 'uncertain', 'failed', 'a_reprogrammer', 'waiting'].includes(String(claim.state))) throw new Error('État invalide.')
            return claim as CollectiveEmailClaim
          }
          const j = closedCollectiveObject(claim, ['state', 'id', 'token', 'dueAt', 'encryptedPayload'])
          if (j.dueAt !== e.dueAt) throw new Error('Échéance divergente.')
          // Relire et déchiffrer la charge PERSISTÉE, jamais envoyer le candidat du réessai.
          return { state: 'reserved', id: celebrationUuid(j.id), token: celebrationUuid(j.token), dueAt: e.dueAt as string, payload: emailPayload(JSON.parse(openCollectiveContent(j.encryptedPayload as EncryptedCardSecret, context, 'email'))) }
        },
        begin: async (id, token) => {
          const r = closedCollectiveObject(await deps.rpc('engager_email_carte', { p_job: id, p_token: token }), ['ready', 'state'])
          if (typeof r.ready !== 'boolean' || !['sending', 'busy', 'retryable', 'cancelled', 'a_reprogrammer'].includes(String(r.state))) throw new Error('Engagement invalide.')
          return r as Awaited<ReturnType<CollectiveDeliveryTransport['begin']>>
        },
        stop: async (id, token) => { await deps.rpc('engager_email_carte', { p_job: id, p_token: token }) },
        send: deps.send,
        finish: async (id, token, outcome, providerId) => { await deps.rpc('finish_email_job', { p_job_id: id, p_token: token, p_outcome: outcome, p_resend_id: providerId }) },
      }, deps.now())
      if (state === 'accepted') result.acceptes++
      if (state === 'uncertain') result.incertains++
      if (state === 'failed') result.erreurs++
    } catch { result.erreurs++ } // Aucun contenu, adresse, identifiant ou secret dans les logs/résultats.
  }
  return result
}
export function runCollectiveCron() {
  return processCollectiveBatch({ rpc: collectiveServiceRpc, now: Date.now, send: async (payload, options) => {
    const { resend } = await import('./resend')
    return resend.emails.send(payload, options)
  } })
}
