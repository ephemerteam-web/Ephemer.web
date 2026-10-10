// 🔐 RPC authentifiées : session avant/après, pas de cache ou stockage des données privées.
import { supabase } from './supabase-browser'
import { profilUnifie, commandeProfil, type CommandeProfil } from './profile-contract'
import { resultatUnivers } from './univers-contract'
async function request(owner: string, name: string, args: unknown, signal?: AbortSignal) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Hors ligne : reconnecte-toi. Ta saisie reste en mémoire.')
  const before = await supabase.auth.getUser()
  if (before.error || before.data.user?.id !== owner) throw new Error('La session a changé. Reconnecte-toi.')
  const timeout = AbortSignal.timeout(15000), abort = signal ? AbortSignal.any([signal,timeout]) : timeout
  const { data, error } = await supabase.rpc(name as never,args as never).abortSignal(abort)
  const after = await supabase.auth.getUser()
  if (after.error || after.data.user?.id !== owner) throw new Error('La session a changé. Recharge ton profil.')
  if (error) {
    if (['PGRST202','42883'].includes(error.code)) throw new Error('La page attend l’installation du SQL Profil unifié. Réessaie après sa mise en place.')
    if (['40001','P1009'].includes(error.code)) throw new Error('Ton profil ou tes dates ont changé ailleurs. Relis avant de continuer ; ta saisie est conservée.')
    throw new Error('Lecture ou enregistrement indisponible. Réessaie ; ta saisie est conservée.')
  }
  if (data === null) throw new Error('Réponse non confirmée. Réessaie avec la même saisie.')
  return data
}
export async function readProfile(owner: string, signal?: AbortSignal) { return profilUnifie(await request(owner,'lire_mon_profil',{},signal)) }
export async function saveProfile(owner: string, input: CommandeProfil, signal?: AbortSignal) {
  const c = commandeProfil(input)
  return resultatUnivers(await request(owner,'enregistrer_mon_profil',{ p_operation: c.operation, p_donnees: { ...c.donnees,revision:c.revision } },signal))
}
export const profileService = { lire: readProfile, commander: saveProfile }
