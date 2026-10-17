import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from './supabase-admin'
import { limitedJSON } from './ai-transport'
import { celebrationTransport, celebrationRpcError, CELEBRATION_HEADERS } from './celebration-server'
import { celebrationUuid } from './celebration-contract'
import { collectiveCommand } from './collective-card-workflow'
import { collectiveCreation, collectiveView, ownCollectiveExport } from './collective-card-contract'
import { closedCollectiveObject } from './collective-card'
import { cardSecretHash, isCardSecret, newCardSecret, type EncryptedCardSecret } from './card-link-crypto'
import { sealCollectiveContent, openCollectiveContent } from './collective-card-crypto'

// Adaptateur commun aux RPC privilégiées : délais bornés et réponses validées par leurs appelants.
export async function collectiveServiceRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (name: string, args: Record<string, unknown>) => { abortSignal: (signal: AbortSignal) => PromiseLike<{ data: unknown; error: { code?: string } | null }> }
  const result = await rpc(name, args).abortSignal(AbortSignal.timeout(15000))
  if (result.error) throw celebrationRpcError(result.error.code)
  return result.data
}
export function collectiveTransport(token: string) { const user = celebrationTransport(token); return { verify: user.verify, user: user.rpc, service: collectiveServiceRpc } }
type Transport = ReturnType<typeof collectiveTransport>
class CollectiveHTTPError extends Error { constructor(public status: number, message: string) { super(message) } }
export async function publishCollective(api: Pick<Transport, 'service'>, input: { celebration: string; card: string; actor: string; revision: number; operation: string; version: string; expiryDays: number; plan?: string }) {
  const secret = newCardSecret(), link = randomUUID()
  const encrypted = sealCollectiveContent(secret, { celebration: input.celebration, card: input.card, version: input.version }, 'lien')
  // Ne jamais retourner le secret candidat : au réessai la base peut retrouver une autre enveloppe.
  return api.service('publier_carte_collective', { p_carte: input.card, p_acteur: input.actor, p_revision: input.revision, p_operation: input.operation, p_version: input.version, p_lien: link, p_hash: cardSecretHash(secret), p_chiffre: encrypted, p_duree: input.expiryDays, p_plan: input.plan ?? null })
}
export async function collectiveEndpoint(request: Request, endpoint: 'carte' | 'lien' | 'export' = 'carte', factory = collectiveTransport): Promise<Response> {
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: CELEBRATION_HEADERS })
  try {
    const url = new URL(request.url), origin = request.headers.get('origin'), header = request.headers.get('authorization')
    if (origin && origin !== url.origin) throw new CollectiveHTTPError(403, 'Origine refusée.')
    if (!header || !/^Bearer \S+$/.test(header) || header.length > 16384) throw new CollectiveHTTPError(401, 'Reconnecte-toi pour ouvrir la carte.')
    const api = factory(header.slice(7)), actor = await api.verify()
    if (!actor?.email_confirmed_at || actor.is_anonymous) throw new CollectiveHTTPError(401, 'Connexion avec adresse vérifiée requise.')
    if (await api.user('collectif_disponible', {}) !== true) {
      if (endpoint === 'export' && request.method === 'GET') return reply(null)
      throw new CollectiveHTTPError(503, 'La carte collective attend son activation manuelle.')
    }
    if (request.method === 'GET') {
      if ([...url.searchParams.keys()].some(k => k !== 'id') || url.searchParams.getAll('id').length !== 1) throw new CollectiveHTTPError(400, 'Adresse invalide.')
      const id = celebrationUuid(url.searchParams.get('id')), view = collectiveView(await api.user('lire_carte_collective', { p_celebration: id }))
      if (endpoint === 'carte') return reply(view)
      if ('absente' in view) { if (endpoint === 'export') return reply(null); throw new CollectiveHTTPError(404, 'Cette carte est indisponible.') }
      if (endpoint === 'export') return reply(ownCollectiveExport(await api.user('exporter_mes_contributions_collectives', { p_celebration: id })))
      if (!view.isOrganizer) throw new CollectiveHTTPError(404, 'Cette carte est indisponible.')
      const raw = await api.service('statut_lien_collectif', { p_carte: view.id, p_acteur: actor.id })
      if (raw === null) throw new CollectiveHTTPError(404, 'Cette carte est indisponible.')
      const row = closedCollectiveObject(raw, ['celebration', 'carte', 'version', 'expiresAt', 'secretChiffre', 'hash'])
      if (row.celebration !== id || row.carte !== view.id || row.version !== view.published?.version || typeof row.expiresAt !== 'string' || Date.parse(row.expiresAt) <= Date.now()) throw new CollectiveHTTPError(404, 'Cette carte est indisponible.')
      const secret = openCollectiveContent(row.secretChiffre as EncryptedCardSecret, { celebration: id, card: view.id, version: celebrationUuid(row.version) }, 'lien')
      if (!isCardSecret(secret) || cardSecretHash(secret) !== row.hash) throw new Error('Lien incohérent')
      return reply({ secret, version: row.version, expiresAt: row.expiresAt })
    }
    if (request.method !== 'POST' || endpoint !== 'carte' || url.search) throw new CollectiveHTTPError(405, 'Méthode indisponible.')
    let id: string, command
    try {
      const body = closedCollectiveObject(await limitedJSON(request, 32 * 1024, 400), ['celebration', 'command'])
      id = celebrationUuid(body.celebration)
      command = body.command && typeof body.command === 'object' && 'revision' in body.command && body.command.revision === 0 ? collectiveCreation(body.command) : collectiveCommand(body.command)
    } catch { throw new CollectiveHTTPError(400, 'Commande de carte invalide.') }
    if (command.data.action === 'publier') {
      const view = collectiveView(await api.user('lire_carte_collective', { p_celebration: id }))
      if ('absente' in view || !view.isOrganizer) throw new CollectiveHTTPError(404, 'Cette carte est indisponible.')
      await publishCollective(api, { celebration: id, card: view.id, actor: actor.id, revision: command.revision, operation: command.operation, version: command.data.version, expiryDays: command.data.expiryDays })
    } else await api.user('commander_carte_collective', { p_celebration: id, p_commande: command })
    return reply({ ok: true })
  } catch (error) {
    const status = (error as { status?: number }).status
    return reply({ error: typeof status === 'number' ? (error as Error).message : 'Résultat non confirmé. Ta saisie est conservée ; relis puis réessaie.' }, typeof status === 'number' ? status : 503)
  }
}
