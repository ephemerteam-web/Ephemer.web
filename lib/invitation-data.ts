// Les nouvelles RPC sont proposées dans docs/sql/invitations-v2.sql ; aucun faux type généré.
import { supabase } from './supabase-browser'
import type { Json } from '@/types/database'
import type { InvitationAnswer, InvitationRecovery, PendingAnswer } from './invitation-contract'
import { authReturn, profileDestination } from './auth-return'
export type InvitationRPC = 'soumettre_invitation_v2' | 'lire_reprises_invitation' | 'lire_reponses_invitation' | 'traiter_reponse_invitation' | 'lire_premier_profil' | 'enregistrer_premier_profil'
export async function invitationRpc<T>(name: InvitationRPC, args: Record<string, Json> = {}, owner?: string): Promise<T> {
  if (navigator.onLine === false) throw new Error('Hors ligne : reconnecte-toi. Ta saisie est conservée.')
  if (owner) {
    const before = await supabase.auth.getUser()
    if (before.error || before.data.user?.id !== owner) throw new Error('La session a changé. Reconnecte-toi.')
  }
  const { data, error } = await supabase.rpc(name as never, args as never)
  if (owner) {
    const after = await supabase.auth.getUser()
    if (after.error || after.data.user?.id !== owner) throw new Error('La session a changé. Relance la lecture.')
  }
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') throw new Error('Ce nouveau parcours attend l’installation du SQL invitations. Réessaie après sa mise en place.')
    if (error.code === '40001' || error.code === 'P1009') throw new Error('Ces informations ont changé. Relis-les avant de continuer ; ta saisie est conservée.')
    throw new Error('Enregistrement ou lecture indisponible. Vérifie le lien et réessaie ; ta saisie est conservée.')
  }
  if (data === null) throw new Error('Réponse non confirmée. Réessaie avec la même saisie.')
  return data as T
}
export const readRecoveries = (owner: string) => invitationRpc<InvitationRecovery[]>('lire_reprises_invitation', {}, owner)
export const readPendingAnswers = (owner: string) => invitationRpc<PendingAnswer[]>('lire_reponses_invitation', {}, owner)
export type FirstProfile = { complete: boolean; prenom: string; nom: string; anniversaire: InvitationAnswer['anniversaire']; email: string; indicatif: string; tel: string; passions: string; presentation: string; revisionUnivers: number; empreinte: string }
export const readFirstProfile = (owner: string) => invitationRpc<FirstProfile>('lire_premier_profil', {}, owner)
export async function isProfileComplete(owner: string) {
  try { return (await readFirstProfile(owner)).complete }
  catch (failure) {
    // Compatibilité avant SQL : les comptes existants ne sont pas bloqués par une colonne absente.
    if (!(failure instanceof Error) || !failure.message.includes('installation du SQL')) throw failure
    const { data, error } = await supabase.from('profiles').select('prenom').eq('id', owner).maybeSingle()
    if (error) throw new Error('Connexion établie, mais le profil est indisponible. Réessaie.')
    return !!data?.prenom?.trim()
  }
}
export async function continueAfterAuth(owner: string, next: unknown) {
  if (authReturn(next) === '/reset-password') return '/reset-password'
  const complete = await isProfileComplete(owner)
  let recoveries: InvitationRecovery[] = []
  try { recoveries = await readRecoveries(owner) }
  catch (failure) { if (!(failure instanceof Error) || !failure.message.includes('installation du SQL')) throw failure }
  return profileDestination(complete && recoveries.length === 0, next)
}
