import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { limitedJSON } from './ai-transport'
import { CELEBRATIONS_ENABLED, celebrationCommand, celebrationUuid, celebrationResult, celebrationItems, celebrationSummary, celebrationInvitation, celebrationDetail } from './celebration-contract'

export const CELEBRATION_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', Vary: 'Authorization' }
export type CelebrationTransport = { verify: () => Promise<{ id: string; email_confirmed_at?: string; is_anonymous?: boolean } | null>; rpc: (name: string, args: Record<string, unknown>) => Promise<unknown> }
class CelebrationHTTPError extends Error { status:number;constructor(status: number, message: string) { super(message);this.status=status } }
export function celebrationRpcError(code:unknown):Error {
  if(code==='42501'||code==='28000')return new CelebrationHTTPError(404,'Cette célébration est indisponible.')
  if(['40001','23505','40P01','55P03'].includes(String(code)))return new CelebrationHTTPError(409,'L’action a rencontré un conflit. Ta saisie est conservée ; relis puis réessaie.')
  if(code==='P1130')return new CelebrationHTTPError(429,'La limite de cette action est atteinte.')
  if(code==='22023'||code==='22P02')return new CelebrationHTTPError(400,'Commande invalide.')
  return new CelebrationHTTPError(503,'Le résultat de l’action ne peut pas être confirmé. Ta saisie est conservée ; réessaie avec la même commande.')
}
export function celebrationTransport(token: string): CelebrationTransport {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new CelebrationHTTPError(503, 'Service indisponible.')
  const client = createClient(url, key, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  return {
    verify: async () => { const result = await client.auth.getUser(token); return result.error ? null : result.data.user },
    rpc: async (name, args) => {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(15000) })
      const result = await limitedJSON(response, 2 * 1024 * 1024, 502)
      if (!response.ok) {
        const code = result && typeof result === 'object' && 'code' in result ? result.code : ''
        throw celebrationRpcError(code)
      }
      return result
    },
  }
}
export async function celebrationEndpoint(request: Request, endpoint: 'liste' | 'detail' | 'invitations' | 'export', factory = celebrationTransport, enabled = CELEBRATIONS_ENABLED): Promise<Response> {
  const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: CELEBRATION_HEADERS })
  try {
    const origin = request.headers.get('origin'), url = new URL(request.url)
    if (origin && origin !== url.origin) throw new CelebrationHTTPError(403, 'Origine refusée.')
    const authorization = request.headers.get('authorization')
    if (!authorization || !/^Bearer \S+$/.test(authorization) || authorization.length > 16384) throw new CelebrationHTTPError(401, 'Reconnecte-toi pour gérer tes célébrations.')
    if (!enabled) throw new CelebrationHTTPError(503, 'L’organisation partagée attend la validation de son installation.')
    const api = factory(authorization.slice(7)), actor = await api.verify()
    if (!actor || !actor.email_confirmed_at || actor.is_anonymous) throw new CelebrationHTTPError(401, 'Connexion avec adresse vérifiée requise.')
    const params = url.searchParams, allowed = endpoint === 'detail' ? ['id'] : ['apres', 'limite']
    if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1)) throw new CelebrationHTTPError(400, 'Paramètres invalides.')
    if (request.method === 'POST') {
      if (endpoint !== 'liste' || [...params.keys()].length) throw new CelebrationHTTPError(400, 'Commande invalide.')
      let command
      try { command = celebrationCommand(await limitedJSON(request, 20 * 1024, 400)) } catch { throw new CelebrationHTTPError(400, 'Commande invalide.') }
      return reply(celebrationResult(await api.rpc('commander_celebrations', { p_action: command.action, p_operation: command.operation, p_donnees: command.donnees })))
    }
    if (request.method !== 'GET') throw new CelebrationHTTPError(405, 'Méthode indisponible.')
    if (endpoint === 'detail') {
      let id; try { id = celebrationUuid(params.get('id')) } catch { throw new CelebrationHTTPError(400, 'Adresse invalide.') }
      return reply(celebrationDetail(await api.rpc('lire_celebration', { p_id: id })))
    }
    const limit = params.get('limite') ?? (endpoint === 'export' ? '1' : '100')
    if (!/^(?:[1-9][0-9]?|100)$/.test(limit)) throw new CelebrationHTTPError(400, 'Limite invalide.')
    if(endpoint==='export'&&limit!=='1')throw new CelebrationHTTPError(400,'L’export se lit une célébration à la fois.')
    let after: string | null = null
    try { if (params.has('apres')) after = celebrationUuid(params.get('apres')) } catch { throw new CelebrationHTTPError(400, 'Curseur invalide.') }
    const result = await api.rpc(endpoint === 'invitations' ? 'lire_invitations_celebrations' : endpoint === 'export' ? 'exporter_celebrations' : 'lire_celebrations', { p_apres: after, p_limite: Number(limit) })
    if (endpoint === 'export') {
      if (!result || typeof result !== 'object' || !('items' in result) || !Array.isArray(result.items) || result.items.length > 1) throw new Error('Export invalide')
      return reply({ items: result.items.map(celebrationDetail) })
    }
    return reply({ items: endpoint === 'invitations' ? celebrationItems(result, celebrationInvitation) : celebrationItems(result, celebrationSummary) })
  } catch (error) { return reply({ error: error instanceof CelebrationHTTPError ? error.message : 'Service momentanément indisponible.' }, error instanceof CelebrationHTTPError ? error.status : 503) }
}
