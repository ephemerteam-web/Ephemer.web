import { socialRequest } from './etoiles-data'
import { collectiveView, ownCollectiveExport, type CollectiveMutation } from './collective-card-contract'
import { closedCollectiveObject } from './collective-card'
import { celebrationUuid } from './celebration-contract'

const path = '/api/celebrations/carte'
export const collectiveService = {
  read: async (owner: string, id: string, signal?: AbortSignal) => collectiveView(await socialRequest(owner, path + '?id=' + encodeURIComponent(id), undefined, signal, 2 * 1024 * 1024)),
  command: async (owner: string, id: string, command: CollectiveMutation, signal?: AbortSignal) => {
    const row = closedCollectiveObject(await socialRequest(owner, path, { celebration: id, command }, signal), ['ok'])
    if (row.ok !== true) throw new Error('Résultat non confirmé.')
  },
  link: async (owner: string, id: string, signal?: AbortSignal) => {
    const r = closedCollectiveObject(await socialRequest(owner, path + '/lien?id=' + encodeURIComponent(id), undefined, signal), ['secret', 'version', 'expiresAt'])
    if (typeof r.secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(r.secret) || typeof r.expiresAt !== 'string' || !Number.isFinite(Date.parse(r.expiresAt))) throw new Error('Lien indisponible.')
    return { secret: r.secret, version: celebrationUuid(r.version), expiresAt: r.expiresAt }
  },
  export: async (owner: string, id: string) => { const r = await socialRequest(owner, path + '/export?id=' + encodeURIComponent(id)); return r === null ? null : ownCollectiveExport(r) },
}
