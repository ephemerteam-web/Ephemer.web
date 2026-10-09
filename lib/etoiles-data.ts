// ⭐ Transport navigateur : session contrôlée avant et après chaque réponse.
import { supabase } from './supabase-browser'
import { limitedJSON } from './ai-transport'
import { commandeEtoile, etoilesItems, resultatEtoile, reconnaissanceEtoiles, exportEtoilesItems, ETOILES_EXPORT_VUES, type CommandeEtoile, type EtoilesRows, type EtoilesExportVue, type ResultatEtoile } from './etoiles-contract'
export class EtoilesRequestError extends Error { status: number; constructor(message: string, status = 0) { super(message); this.status = status } }
export async function socialRequest(ownerId: string, path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new EtoilesRequestError('Hors ligne : reconnecte-toi pour gérer tes étoiles.')
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session || session.user.id !== ownerId) throw new EtoilesRequestError('La session a changé. Reconnecte-toi.', 401)
  if (signal?.aborted) throw new DOMException('Lecture abandonnée.', 'AbortError')
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal })
  const result = await limitedJSON(response, 128 * 1024, 502)
  const { data: after, error: afterError } = await supabase.auth.getSession()
  if (afterError || after.session?.user.id !== ownerId) throw new EtoilesRequestError('La session a changé. Relance la lecture.', 401)
  if (!response.ok) throw new EtoilesRequestError(result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : 'Action indisponible. Réessaie.', response.status)
  return result
}
export function etoilesRequest(ownerId: string, path: string, body?: unknown, signal?: AbortSignal) {
  return socialRequest(ownerId, '/api/etoiles' + path, body, signal)
}
export async function readEtoiles<V extends keyof EtoilesRows>(ownerId: string, vue: V, signal?: AbortSignal): Promise<EtoilesRows[V][]> {
  const all: EtoilesRows[V][] = []; let apres: string | null = null
  const seen = new Set<string>()
  do {
    const query: URLSearchParams = new URLSearchParams({ ...(vue === 'associations' ? {} : { vue }), limite: '100', ...(apres ? { apres } : {}) })
    const rows: EtoilesRows[V][] = etoilesItems(await etoilesRequest(ownerId, (vue === 'associations' ? '/associations?' : '?') + query, undefined, signal), vue)
    for (const row of rows) {
      const key = 'contact_id' in row ? row.contact_id : row.id
      if (seen.has(key)) throw new Error('Pagination incohérente. Relance la lecture.')
      seen.add(key)
    }
    all.push(...rows)
    if (all.length > 100000) throw new Error('Liste trop volumineuse.')
    const last = rows.at(-1)
    apres = rows.length === 100 && last ? ('contact_id' in last ? last.contact_id : last.id) : null
  } while (apres)
  return all
}
export async function recogniseEtoiles(ownerId: string, signal?: AbortSignal) {
  let apres: string | null = null; const seen = new Set<string>()
  do {
    const result = reconnaissanceEtoiles(await etoilesRequest(ownerId, '/reconnaitre', { apres, limite: 100 }, signal))
    apres = result.apres
    if (apres && seen.has(apres)) throw new Error('Reconnaissance incohérente. Réessaie.')
    if (apres) seen.add(apres)
    if (seen.size > 1000) throw new Error('Carnet trop volumineux.')
  } while (apres)
}
export async function sendEtoileCommand(ownerId: string, input: CommandeEtoile, signal?: AbortSignal): Promise<ResultatEtoile> {
  const command = commandeEtoile(input)
  return resultatEtoile(await etoilesRequest(ownerId, '', command, signal), command.action)
}
export async function exportEtoiles(ownerId: string) {
  const result: Record<EtoilesExportVue, Record<string, unknown>[]> = { relations: [], demandes: [], blocages: [], liens: [], associations: [] }
  for (const vue of ETOILES_EXPORT_VUES) {
    let apres: string | null = null; const seen = new Set<string>()
    do {
      const query = new URLSearchParams({ vue, limite: '100', ...(apres ? { apres } : {}) })
      const rows = exportEtoilesItems(await etoilesRequest(ownerId, '/export?' + query), vue)
      for (const row of rows) { const key = String(vue === 'associations' ? row.contact_id : row.id); if (seen.has(key)) throw new Error('Export incohérent.'); seen.add(key) }
      result[vue].push(...rows)
      if (result[vue].length > 100000) throw new Error('Export trop volumineux.')
      const last = rows.at(-1)
      apres = rows.length === 100 && last ? String(vue === 'associations' ? last.contact_id : last.id) : null
    } while (apres)
  }
  return result
}
