// 🔐 Les RPC privilégiées restent derrière cette vérification de session/propriétaire.
import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from './supabase-admin'
import { limitedJSON } from './ai-transport'
import { publicCard, CARD_EXPIRY_DAYS, type CardShareStatus } from './cards'
import { supportedCardSnapshot } from './card-snapshot-v2'
import { cardSecretHash, decryptCardSecret, encryptCardSecret, isCardSecret, newCardSecret, type EncryptedCardSecret } from './card-link-crypto'

export const CARD_PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Vary': 'Authorization' }
class CardHTTPError extends Error { constructor(public status: number, message: string) { super(message) } }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const inaccessible = () => new CardHTTPError(404, 'Cette carte est indisponible')
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: CARD_PRIVATE_HEADERS })
function databaseError(error: { code?: string } | null) {
  if (!error) return
  if (error.code === '40001' || error.code === '23505') throw new CardHTTPError(409, 'La carte a changé. Ta saisie est conservée ; relis son état avant de continuer.')
  if (error.code === '42501' || error.code === 'PGRST116') throw inaccessible()
  if (error.code === '23514' || error.code === '22023') throw new CardHTTPError(400, 'Action invalide. Relis le brouillon enregistré.')
  throw new CardHTTPError(503, 'Service momentanément indisponible. Réessaie.')
}
function closedBody(input: unknown, keys: string[]) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CardHTTPError(400, 'Requête invalide.')
  const body = input as Record<string, unknown>
  if (Object.keys(body).length !== keys.length || Object.keys(body).some(key => !keys.includes(key))) throw new CardHTTPError(400, 'Requête invalide.')
  return body
}
async function owner(request: Request, client: typeof supabaseAdmin) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new CardHTTPError(403, 'Origine refusée.')
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ') || header.length > 16384) throw new CardHTTPError(401, 'Reconnecte-toi pour gérer ta carte.')
  const result = await client.auth.getUser(header.slice(7))
  if (result.error || !result.data.user) throw new CardHTTPError(401, 'Reconnecte-toi pour gérer ta carte.')
  return result.data.user.id
}
async function ownedCard(client: typeof supabaseAdmin, userId: string, id: string) {
  if (!uuid.test(id)) throw inaccessible()
  const result = await client.from('cartes_individuelles').select('id,revision').eq('user_id', userId).eq('id', id).maybeSingle()
  databaseError(result.error)
  if (!result.data) throw inaccessible()
  return result.data
}
async function shareStatus(client: typeof supabaseAdmin, userId: string, id: string, withSecret = false) {
  const result = await client.rpc('lire_partage_carte_lot08', { p_user_id: userId, p_carte: id, p_avec_secret: withSecret })
  databaseError(result.error)
  if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) throw inaccessible()
  return result.data as Record<string, unknown>
}
async function currentStatus(client: typeof supabaseAdmin, userId: string, id: string): Promise<CardShareStatus> {
  const state = await shareStatus(client, userId, id)
  const card = await ownedCard(client, userId, id)
  if (!['absent', 'actif', 'expire', 'revoque'].includes(String(state.state))) throw inaccessible()
  let published = null
  if (typeof state.versionId === 'string') {
    const version = await client.from('versions_cartes').select('contenu').eq('user_id', userId).eq('carte_id', id).eq('id', state.versionId).maybeSingle()
    databaseError(version.error)
    if (!version.data) throw inaccessible()
    published = supportedCardSnapshot(version.data.contenu, true)
  }
  return { revision: card.revision, versionId: typeof state.versionId === 'string' ? state.versionId : null, linkId: typeof state.linkId === 'string' ? state.linkId : null,
    state: state.state as CardShareStatus['state'], expiresAt: typeof state.expiresAt === 'string' ? state.expiresAt : null, published }
}
async function mutate(client: typeof supabaseAdmin, userId: string, id: string, action: 'publier' | 'remplacer' | 'revoquer', body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.revision) || (body.revision as number) < 1 || (body.revision as number) >= Number.MAX_SAFE_INTEGER || typeof body.operationId !== 'string' || !uuid.test(body.operationId) ||
    (action !== 'revoquer' && !CARD_EXPIRY_DAYS.some(days => days === body.expiryDays))) throw new CardHTTPError(400, 'Révision, opération ou durée invalide.')
  const args: { p_user_id: string; p_carte: string; p_revision: number; p_operation: string; p_action: string; p_duree?: number; p_lien?: string; p_empreinte?: string; p_secret_chiffre?: string; p_nonce?: string; p_tag?: string } = {
    p_user_id: userId, p_carte: id, p_revision: body.revision as number, p_operation: body.operationId, p_action: action,
  }
  if (action !== 'revoquer') {
    const linkId = randomUUID(), secret = newCardSecret()
    let envelope: EncryptedCardSecret
    try { envelope = encryptCardSecret(secret, { ownerId: userId, cardId: id, linkId }) }
    catch { throw new CardHTTPError(503, 'La création des liens est indisponible. La clé serveur doit être configurée.') }
    Object.assign(args, { p_duree: body.expiryDays, p_lien: linkId, p_empreinte: cardSecretHash(secret), p_secret_chiffre: envelope.ciphertext, p_nonce: envelope.nonce, p_tag: envelope.tag })
  }
  const { p_action, ...publicationArgs } = args
  const result = action === 'publier'
    ? await client.rpc('publier_carte_lot09', { ...publicationArgs, p_duree: args.p_duree!, p_lien: args.p_lien!, p_empreinte: args.p_empreinte!, p_secret_chiffre: args.p_secret_chiffre!, p_nonce: args.p_nonce!, p_tag: args.p_tag! })
    : await client.rpc('gerer_partage_carte_lot08', { ...publicationArgs, p_action })
  databaseError(result.error)
  // Ne jamais renvoyer le secret généré ci-dessus : un retry peut correspondre à un ancien résultat.
  return currentStatus(client, userId, id)
}
export type CardEndpoint = 'consulter' | 'publication' | 'lien' | 'supprimer' | 'export'
export async function cardEndpoint(request: Request, endpoint: CardEndpoint, id = '', client = supabaseAdmin): Promise<Response> {
  try {
    if (endpoint === 'consulter') {
      let body: Record<string, unknown>
      try { body = closedBody(await limitedJSON(request, 2048, 400), ['secret']) }
      catch (error) { if ((error as { status?: number }).status === 413) throw error; throw inaccessible() }
      if (!isCardSecret(body.secret)) throw inaccessible()
      const result = await client.rpc('consulter_carte_lot08', { p_empreinte: cardSecretHash(body.secret) })
      if (result.error) throw new CardHTTPError(503, 'Service momentanément indisponible. Réessaie.')
      try { return reply(publicCard(result.data)) } catch { throw inaccessible() }
    }
    const userId = await owner(request, client)
    if (endpoint === 'export') {
      const params = new URL(request.url).searchParams, cursor = params.get('apres')
      if ([...params.keys()].some(key => key !== 'apres') || (cursor !== null && !uuid.test(cursor))) throw new CardHTTPError(400, 'Curseur invalide.')
      const result = await client.rpc('exporter_liens_cartes_lot08', { p_user_id: userId, p_limite: 200, ...(cursor ? { p_apres: cursor } : {}) })
      databaseError(result.error)
      const rows = (result.data ?? []).map(row => ({ id: row.id, carte_id: row.carte_id, version_id: row.version_id, expires_at: row.expires_at, revoked_at: row.revoked_at ?? null, created_at: row.created_at,
        statut: row.revoked_at ? 'revoque' : Date.parse(row.expires_at) <= Date.now() ? 'expire' : 'actif' }))
      return reply({ rows })
    }
    await ownedCard(client, userId, id)
    if (endpoint === 'supprimer') {
      const result = await client.from('cartes_individuelles').delete().eq('user_id', userId).eq('id', id).select('id').single()
      databaseError(result.error)
      if (!result.data) throw inaccessible()
      return reply({ deleted: true })
    }
    if (endpoint === 'lien' && request.method === 'GET') return reply(await currentStatus(client, userId, id))
    const input = await limitedJSON(request, 64 * 1024, 400)
    if (endpoint === 'publication') return reply(await mutate(client, userId, id, 'publier', closedBody(input, ['revision', 'operationId', 'expiryDays'])))
    const action = input && typeof input === 'object' ? (input as Record<string, unknown>).action : null
    if (action === 'recuperer') {
      closedBody(input, ['action'])
      const state = await shareStatus(client, userId, id, true)
      if (state.state !== 'actif' || typeof state.linkId !== 'string' || typeof state.expiresAt !== 'string' || Date.parse(state.expiresAt) <= Date.now()) throw inaccessible()
      let secret: string
      try {
        secret = decryptCardSecret(state.encryptedSecret as EncryptedCardSecret, { ownerId: userId, cardId: id, linkId: state.linkId })
        if (cardSecretHash(secret) !== state.secretHash) throw inaccessible()
      } catch { throw new CardHTTPError(503, 'La récupération du lien est indisponible. Tu peux toujours le désactiver.') }
      return reply({ secret, linkId: state.linkId, expiresAt: state.expiresAt })
    }
    if (action !== 'remplacer' && action !== 'revoquer') throw new CardHTTPError(400, 'Action invalide.')
    return reply(await mutate(client, userId, id, action, closedBody(input, action === 'remplacer' ? ['action', 'revision', 'operationId', 'expiryDays'] : ['action', 'revision', 'operationId'])))
  } catch (error) {
    // Les détails Supabase et cryptographiques ne sont jamais journalisés ni exposés.
    const status = (error as { status?: number }).status
    return reply({ error: typeof status === 'number' ? (error as Error).message : 'Service momentanément indisponible. Réessaie.' }, typeof status === 'number' ? status : 503)
  }
}
