import { socialRequest } from './etoiles-data'
import { celebrationCommand, celebrationResult, celebrationDetail, celebrationItems, celebrationSummary, celebrationInvitation, type CelebrationCommand, type CelebrationDetail } from './celebration-contract'

export const celebrationService = {
  lire: async (owner: string, id: string, signal?: AbortSignal) => celebrationDetail(await socialRequest(owner, '/api/celebrations/detail?id=' + encodeURIComponent(id), undefined, signal, 2*1024*1024)),
  liste: async (owner: string, after: string | null, signal?: AbortSignal) => celebrationItems(await socialRequest(owner, '/api/celebrations?limite=100' + (after ? '&apres=' + after : ''), undefined, signal, 2*1024*1024), celebrationSummary),
  invitations: async (owner: string, after: string | null, signal?: AbortSignal) => celebrationItems(await socialRequest(owner, '/api/celebrations/invitations?limite=100' + (after ? '&apres=' + after : ''), undefined, signal, 2*1024*1024), celebrationInvitation),
  commander: async (owner: string, input: CelebrationCommand, signal?: AbortSignal) => celebrationResult(await socialRequest(owner, '/api/celebrations', celebrationCommand(input), signal, 2*1024*1024)),
}
export type CelebrationService = typeof celebrationService
export async function exportCelebrations(owner: string) {
  const items:CelebrationDetail[] = [], seen = new Set<string>(); let after: string | null = null
  do {
    const rows:CelebrationDetail[] = celebrationItems(await socialRequest(owner, '/api/celebrations/export?limite=1' + (after ? '&apres=' + after : ''), undefined, undefined, 2*1024*1024), celebrationDetail)
    for (const row of rows) { if (seen.has(row.celebration.id)) throw new Error('Export incohérent.'); seen.add(row.celebration.id); items.push(row) }
    if (items.length > 100000) throw new Error('Export trop volumineux.')
    after = rows.length === 1 ? rows.at(-1)!.celebration.id : null
  } while (after)
  // Une révocation durant la pagination invalide l'ensemble avant téléchargement.
  for(const item of items)await celebrationService.lire(owner,item.celebration.id)
  return items
}
