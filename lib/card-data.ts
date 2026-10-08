// 💌 Brouillons soumis aux RLS ; liens gérés uniquement par les routes serveur.
import { supabase } from './supabase-browser'
import { requireOwner } from './attention-data'
import { type CardShareStatus } from './cards'
import { supportedCardSnapshot, type SupportedCardSnapshot } from './card-snapshot-v2'
import type { Tables } from '@/types/database'
export type CardDraft = Tables<'cartes_individuelles'>
export function draftSnapshot(row: CardDraft): SupportedCardSnapshot {
  if (row.rendu_version === 1 && row.avatar_signature != null) throw new Error('Brouillon invalide.')
  return supportedCardSnapshot({ format: row.rendu_version, templateId: row.modele_id, templateVersion: row.modele_version, renderVersion: row.rendu_version, message: row.message, signature: row.signature, ...(row.rendu_version === 2 ? { avatar: row.avatar_signature } : {}) })
}
export async function cardRequest<T>(owner: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  await requireOwner(owner)
  const session = await supabase.auth.getSession()
  if (session.error || session.data.session?.user.id !== owner) throw new Error('La session a changé. Reconnecte-toi.')
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000)
  let response: Response, data: { error?: string }
  try {
    response = await fetch(path, { method, cache: 'no-store', credentials: 'omit', signal: controller.signal, headers: { Authorization: 'Bearer ' + session.data.session.access_token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    data = await response.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Réponse invalide.')
  } catch { throw new Error('Réponse non confirmée. Reprends la même opération ou relis la carte.') }
  finally { clearTimeout(timer) }
  await requireOwner(owner)
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Action impossible. Réessaie.')
  return data as T
}
export async function loadCard(owner: string, preparationId: string) {
  await requireOwner(owner)
  const result = await supabase.from('cartes_individuelles').select('*').eq('user_id', owner).eq('preparation_id', preparationId).maybeSingle()
  if (result.error) throw result.error
  await requireOwner(owner)
  if (!result.data) return { draft: null, share: null }
  draftSnapshot(result.data)
  const share = await cardRequest<CardShareStatus>(owner, '/api/cartes/' + result.data.id + '/lien')
  // Une publication peut avoir incrémenté la révision depuis la lecture du brouillon.
  if (share.revision !== result.data.revision) throw new Error('La carte a changé pendant le chargement. Relance la lecture.')
  return { draft: result.data, share }
}
export async function saveCard(owner: string, preparationId: string, id: string, revision: number | null, input: SupportedCardSnapshot): Promise<CardDraft> {
  const snapshot = supportedCardSnapshot(input)
  const values = { modele_id: snapshot.templateId, modele_version: snapshot.templateVersion, rendu_version: snapshot.renderVersion, message: snapshot.message, signature: snapshot.signature, avatar_signature: snapshot.format === 2 ? snapshot.avatar : null }
  await requireOwner(owner)
  const matches = (row: CardDraft) => row.preparation_id === preparationId && JSON.stringify(draftSnapshot(row)) === JSON.stringify(snapshot)
  if (revision === null) {
    const retry = await supabase.from('cartes_individuelles').select('*').eq('user_id', owner).eq('id', id).maybeSingle()
    if (retry.error) throw retry.error
    if (retry.data) {
      await requireOwner(owner)
      if (!matches(retry.data)) throw new Error('La création précédente contient une autre saisie. Tes changements sont conservés ; relis la carte.')
      return retry.data
    }
  } else if (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER) throw new Error('Révision invalide.')
  const result = revision === null
    ? await supabase.from('cartes_individuelles').insert({ id, user_id: owner, preparation_id: preparationId, ...values }).select().single()
    : await supabase.from('cartes_individuelles').update({ ...values, revision: revision + 1 }).eq('user_id', owner).eq('id', id).eq('revision', revision).select().single()
  await requireOwner(owner)
  if (result.error || !result.data) {
    // Reprise d'une réponse perdue, uniquement si l'état attendu et son texte correspondent exactement.
    const retry = await supabase.from('cartes_individuelles').select('*').eq('user_id', owner).eq('id', id).maybeSingle()
    await requireOwner(owner)
    if (!retry.error && retry.data && matches(retry.data) && retry.data.revision === (revision === null ? 1 : revision + 1)) return retry.data
    throw new Error('Enregistrement non confirmé ou conflit. Ta saisie est conservée ; relis la carte avant de continuer.')
  }
  return result.data
}
export type CardOperation = { action: 'publier' | 'remplacer' | 'revoquer'; revision: number; operationId: string; expiryDays?: number }
export async function cardOperation(owner: string, id: string, operation: CardOperation) {
  const { action, ...values } = operation
  return cardRequest<CardShareStatus>(owner, '/api/cartes/' + id + (action === 'publier' ? '/publication' : '/lien'), 'POST', action === 'publier' ? values : { action, ...values })
}
export type RecoveredCardLink = { secret: string; linkId: string; expiresAt: string }
export async function recoverCardLink(owner: string, id: string) {
  return cardRequest<RecoveredCardLink>(owner, '/api/cartes/' + id + '/lien', 'POST', { action: 'recuperer' })
}
export async function exportCardLinks(owner: string) {
  const rows: Record<string, unknown>[] = []
  let cursor = ''
  while (true) {
    const page = await cardRequest<{ rows: Record<string, unknown>[] }>(owner, '/api/cartes/export-liens' + (cursor ? '?apres=' + encodeURIComponent(cursor) : ''))
    if (!Array.isArray(page.rows)) throw new Error('Export des liens impossible.')
    // Projection défensive supplémentaire : aucune capacité secrète dans le fichier téléchargé.
    for (const row of page.rows) rows.push(Object.fromEntries(['id', 'carte_id', 'version_id', 'expires_at', 'revoked_at', 'created_at', 'statut'].map(key => [key, row[key]])))
    if (rows.length > 100000) throw new Error('Export trop volumineux.')
    if (!page.rows.length) return rows
    const next = page.rows.at(-1)?.id
    if (typeof next !== 'string' || next <= cursor) throw new Error('Pagination des liens invalide.')
    cursor = next
  }
}
