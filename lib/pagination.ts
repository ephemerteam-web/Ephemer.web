// 📚 Curseur unique : les changements de statut ne décalent pas les pages suivantes.
import { normalizeRelation } from './constants'
export const PAGE_SIZE = 200
type PageResult<T> = { data: T[] | null; error: unknown }
export type PageQuery<T> = PromiseLike<PageResult<T>> & {
  order(column: string, options: { ascending: boolean }): PageQuery<T>
  limit(size: number): PageQuery<T>
  gt(column: string, value: string | number): PageQuery<T>
}

export async function* readPages<T>(query: () => PageQuery<T>, key = 'id'): AsyncGenerator<T[]> {
  let cursor: string | number | null = null
  while (true) {
    let page = query().order(key, { ascending: true }).limit(PAGE_SIZE)
    if (cursor !== null) page = page.gt(key, cursor)
    const { data, error } = await page
    if (error) throw error
    if (!data?.length) return
    for (const row of data) {
      const next = (row as Record<string, unknown>)[key]
      if ((typeof next !== 'string' && typeof next !== 'number') ||
        (cursor !== null && (typeof cursor !== typeof next || next <= cursor))) {
        throw new Error('Pagination incohérente. Aucune liste partielle ne peut être présentée comme complète.')
      }
      cursor = next
    }
    yield data.map(row => row && typeof row === 'object' && 'relation' in row
      ? { ...row, relation: normalizeRelation(row.relation) } : row)
    // Une page courte peut être le plafond du projet : continuer jusqu'à une page vide.
  }
}

export async function readAllRows<T>(query: () => PageQuery<T>, key = 'id'): Promise<T[]> {
  const rows: T[] = []
  for await (const page of readPages(query, key)) rows.push(...page)
  return rows
}

// Même forme que les réponses Supabase pour les écrans déjà équipés d'un état d'erreur.
export async function readAllResult<T>(query: () => PageQuery<T>, key = 'id') {
  try { return { data: await readAllRows(query, key), error: null } }
  catch { return { data: null, error: new Error('Chargement incomplet. Réessaie pour obtenir toutes les données.') } }
}

export function batches<T>(rows: readonly T[], size = PAGE_SIZE): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error('Taille de lot invalide')
  const result: T[][] = []
  for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size))
  return result
}
