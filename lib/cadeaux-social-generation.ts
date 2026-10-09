// 🎁 Orchestration 10C : même contrôle pour les adapters réels et les simulations.
import { selectionUniversCadeaux, sourceCadeauxAutorisee, contactCadeaux, type SelectionUniversCadeaux, type UniversPourCadeaux } from './cadeaux-social-contract'

export class ConflitCadeaux extends Error {
  readonly status = 409
}
export type ServicesGenerationCadeaux<T> = {
  verifierSession: () => Promise<void>
  lireNotesPrivees: (contact: string | null) => Promise<Record<string, string | number>>
  resoudreUnivers: (selection: SelectionUniversCadeaux, contact: string | null) => Promise<unknown>
  consommerQuota: () => Promise<void>
  appelerFournisseur: (sources: { notesPrivees: Record<string, string | number>; universPartage: UniversPourCadeaux['champs'] }) => Promise<T>
}
function resolution(value: unknown, selection: SelectionUniversCadeaux) {
  try { return sourceCadeauxAutorisee(value, selection) }
  catch { throw new ConflitCadeaux('Les informations ont changé. Sélectionne à nouveau les champs.') }
}
/**
 * Les adapters fournissent auth.getUser, la lecture privée propriétaire et les RPC sous JWT.
 * Aucun résultat partiel, retry fournisseur, journal de prompts ou autorisation mémorisée.
 */
export async function genererCadeauxAvecSources<T>(input: { contactId?: unknown; univers?: unknown }, services: ServicesGenerationCadeaux<T>, signal?: AbortSignal): Promise<T> {
  const contact = contactCadeaux(input.contactId)
  const selection = input.univers === undefined ? null : selectionUniversCadeaux(input.univers)
  const check = () => { if (signal?.aborted) throw new Error('Génération annulée.') }
  check()
  await services.verifierSession()
  check()
  const notesPrivees = await services.lireNotesPrivees(contact)
  check()
  // Prévalidation : pas de quota consommé pour une ancienne sélection/association refusée.
  if (selection) resolution(await services.resoudreUnivers(selection, contact), selection)
  check()
  await services.consommerQuota()
  check()
  // Nouvelle lecture immédiatement avant fournisseur, y compris association si présente.
  const authorized = selection ? resolution(await services.resoudreUnivers(selection, contact), selection) : null
  check()
  const result = await services.appelerFournisseur({ notesPrivees, universPartage: authorized?.champs ?? {} })
  check()
  await services.verifierSession()
  if (selection) {
    const after = resolution(await services.resoudreUnivers(selection, contact), selection)
    if (JSON.stringify(after) !== JSON.stringify(authorized)) throw new ConflitCadeaux('Les informations ont changé pendant la génération. Le résultat a été écarté.')
  }
  check()
  return result
}
