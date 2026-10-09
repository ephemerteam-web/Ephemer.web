// 🌌 Aucun cache ni stockage navigateur ; session avant et après chaque réponse.
import { socialRequest } from './etoiles-data'
import { commandeUnivers, monUnivers, resultatUnivers, universPartage, type CommandeUnivers } from './univers-contract'
import { uuidEtoile } from './etoiles-contract'
function request(ownerId: string, path: string, body?: unknown, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15000)
  return socialRequest(ownerId, '/api/univers' + path, body, signal ? AbortSignal.any([signal, timeout]) : timeout)
}
export async function readMonUnivers(ownerId: string, signal?: AbortSignal) {
  return monUnivers(await request(ownerId, '', undefined, signal))
}
export async function sendUniversCommand(ownerId: string, input: CommandeUnivers, signal?: AbortSignal) {
  return resultatUnivers(await request(ownerId, '', commandeUnivers(input), signal))
}
export async function readUniversPartage(ownerId: string, etoileId: string, signal?: AbortSignal) {
  return universPartage(await request(ownerId, '/etoile?' + new URLSearchParams({ etoileId: uuidEtoile(etoileId) }), undefined, signal))
}
export const universService = { lire: readMonUnivers, commander: sendUniversCommand }
