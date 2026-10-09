// 🔐 Un client par requête et le JWT de l'appelant ; aucune clé administrateur.
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { limitedJSON } from './ai-transport'
import { commandeEtoile, lectureEtoiles, contactIdEtoile, uuidEtoile, etoilesItems, resultatEtoile, reconnaissanceEtoiles, exportEtoilesItems, ETOILES_EXPORT_VUES, type EtoilesExportVue } from './etoiles-contract'

export const ETOILES_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', Vary: 'Authorization' }
class EtoilesHTTPError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status } }
export type EtoilesEndpoint = 'liste' | 'commande' | 'reconnaitre' | 'associations' | 'export'
type Rpc = 'lire_etoiles' | 'commander_etoiles' | 'reconnaitre_etoiles' | 'lire_associations_etoiles' | 'exporter_etoiles' | 'lire_mon_univers' | 'consulter_univers_etoile' | 'commander_mon_univers'
export type EtoilesTransport = { verify: () => Promise<{ id: string; email_confirmed_at?: string; is_anonymous?: boolean } | null>; rpc: (name: Rpc, args: Record<string, Json>) => Promise<unknown> }
function failDatabase(code: unknown): never {
  if (code === '28000') throw new EtoilesHTTPError(403, 'Une adresse de connexion vérifiée est nécessaire.')
  if (code === 'P1020') throw new EtoilesHTTPError(429, 'Tu as atteint la limite de 20 nouvelles demandes aujourd’hui.')
  if (code === 'P1009' || code === '40001' || code === '23505') throw new EtoilesHTTPError(409, 'L’état a changé. Actualise avant de continuer.')
  if (code === '22023' || code === '22P02') throw new EtoilesHTTPError(400, 'Requête invalide.')
  if (code === '42501') throw new EtoilesHTTPError(403, 'Cette action est indisponible.')
  throw new EtoilesHTTPError(503, 'Service momentanément indisponible. Réessaie.')
}
export function socialTransport(token: string): EtoilesTransport {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new EtoilesHTTPError(503, 'Service momentanément indisponible.')
  const client = createClient<Database>(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  return {
    verify: async () => { const result = await client.auth.getUser(token); return result.error ? null : result.data.user },
    // Le transport REST préserve les paramètres bigint en texte : les types générés
    // les décrivent comme number, conversion qui ferait perdre des bits.
    rpc: async (name, args) => {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(15000) })
      const data = await limitedJSON(response, 128 * 1024, 502)
      if (!response.ok) failDatabase(data && typeof data === 'object' && 'code' in data ? data.code : null)
      return data
    },
  }
}
function params(request: Request, allowed: string[]) {
  const data = new URL(request.url).searchParams
  if ([...data.keys()].some(key => !allowed.includes(key) || data.getAll(key).length !== 1)) throw new EtoilesHTTPError(400, 'Paramètres invalides.')
  return data
}
function limit(value: string | null) {
  if (value !== null && !/^(?:[1-9][0-9]?|100)$/.test(value)) throw new EtoilesHTTPError(400, 'Limite invalide.')
  return value === null ? 100 : Number(value)
}
function closed(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) throw new EtoilesHTTPError(400, 'Requête invalide.')
  return value as Record<string, unknown>
}
export async function etoilesEndpoint(request: Request, endpoint: EtoilesEndpoint, factory: (token: string) => EtoilesTransport = socialTransport): Promise<Response> {
  const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: ETOILES_HEADERS })
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) throw new EtoilesHTTPError(403, 'Origine refusée.')
    const header = request.headers.get('authorization')
    if (!header || !/^Bearer [^\s]+$/.test(header) || header.length > 16384) throw new EtoilesHTTPError(401, 'Reconnecte-toi pour gérer tes étoiles.')
    const api = factory(header.slice(7)), user = await api.verify()
    if (!user) throw new EtoilesHTTPError(401, 'Reconnecte-toi pour gérer tes étoiles.')
    if (!user.email_confirmed_at || user.is_anonymous) throw new EtoilesHTTPError(403, 'Une adresse de connexion vérifiée est nécessaire.')
    if (endpoint === 'commande') {
      params(request, [])
      let command
      try { command = commandeEtoile(await limitedJSON(request, 4096, 400)) }
      catch (error) { throw new EtoilesHTTPError((error as { status?: number }).status === 413 ? 413 : 400, 'Commande invalide.') }
      const result = await api.rpc('commander_etoiles', { p_action: command.action, p_donnees: command.donnees, p_operation: command.operation })
      return reply(resultatEtoile(result, command.action), command.action.startsWith('demander') ? 202 : 200)
    }
    if (endpoint === 'reconnaitre') {
      params(request, [])
      let apres: string | null; let taille: number
      try { const data = closed(await limitedJSON(request, 4096, 400), ['apres', 'limite']); apres = data.apres === null ? null : contactIdEtoile(data.apres); if (typeof data.limite !== 'number' || !Number.isInteger(data.limite)) throw new Error('Limite invalide'); taille = limit(String(data.limite)) }
      catch (error) { throw new EtoilesHTTPError((error as { status?: number }).status === 413 ? 413 : 400, 'Reconnaissance invalide.') }
      return reply(reconnaissanceEtoiles(await api.rpc('reconnaitre_etoiles', { p_apres: apres, p_limite: taille })))
    }
    const p = params(request, endpoint === 'associations' ? ['apres', 'limite'] : ['vue', 'apres', 'limite'])
    const taille = limit(p.get('limite'))
    if (endpoint === 'associations') {
      let apres: string | null
      try { apres = p.has('apres') ? contactIdEtoile(p.get('apres')) : null } catch { throw new EtoilesHTTPError(400, 'Curseur invalide.') }
      return reply({ items: etoilesItems(await api.rpc('lire_associations_etoiles', { p_apres: apres, p_limite: taille }), 'associations') })
    }
    if (endpoint === 'export') {
      const vue = p.get('vue') as EtoilesExportVue
      if (!ETOILES_EXPORT_VUES.includes(vue)) throw new EtoilesHTTPError(400, 'Export invalide.')
      let apres: string | null
      try { apres = !p.has('apres') ? null : vue === 'associations' ? contactIdEtoile(p.get('apres')) : uuidEtoile(p.get('apres')) } catch { throw new EtoilesHTTPError(400, 'Curseur invalide.') }
      return reply({ items: exportEtoilesItems(await api.rpc('exporter_etoiles', { p_vue: vue, p_apres: apres, p_limite: taille }), vue) })
    }
    let lecture
    try { lecture = lectureEtoiles({ vue: p.get('vue'), apres: p.get('apres'), limite: taille }) } catch { throw new EtoilesHTTPError(400, 'Lecture invalide.') }
    return reply({ items: etoilesItems(await api.rpc('lire_etoiles', { p_vue: lecture.vue, p_apres: lecture.apres, p_limite: lecture.limite }), lecture.vue) })
  } catch (error) {
    return reply({ error: error instanceof EtoilesHTTPError ? error.message : 'Service momentanément indisponible. Réessaie.' }, error instanceof EtoilesHTTPError ? error.status : 503)
  }
}
