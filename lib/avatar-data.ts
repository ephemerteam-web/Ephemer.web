// 🌙 Avatar privé : RLS, révision attendue et vérification avant toute nouvelle écriture.
import { supabase } from './supabase-browser'
import { requireOwner } from './attention-data'
import { avatarRenderConfig, recoverProfileRenderAvatar, type AvatarRenderConfig } from './avatar-render-config'
import type { Tables } from '@/types/database'

export type ProfileAvatar = Tables<'avatars_utilisateurs'>
export async function loadAvatar(owner: string): Promise<ProfileAvatar | null> {
  await requireOwner(owner)
  const result = await supabase.from('avatars_utilisateurs').select('*').eq('user_id', owner).abortSignal(AbortSignal.timeout(15000)).maybeSingle()
  await requireOwner(owner)
  if (result.error) throw new Error('Impossible de lire ton avatar. Réessaie après reconnexion au réseau.')
  return result.data
}
export async function avatarForCard(owner: string): Promise<AvatarRenderConfig> {
  const row = await loadAvatar(owner)
  const recovered = recoverProfileRenderAvatar(row?.configuration)
  if (recovered.notice) throw new Error('Répare et enregistre ton avatar dans le profil avant de l’ajouter à une carte.')
  return avatarRenderConfig(recovered.config)
}
export async function saveAvatar(owner: string, revision: number | null, input: AvatarRenderConfig): Promise<ProfileAvatar> {
  const config = avatarRenderConfig(input)
  if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER)) throw new Error('Révision invalide.')
  const expectedRevision = revision === null ? 1 : revision + 1
  const matches = (row: ProfileAvatar | null) => {
    if (!row || row.revision !== expectedRevision) return false
    try { return JSON.stringify(avatarRenderConfig(row.configuration)) === JSON.stringify(config) } catch { return false }
  }
  // Reconnaître une sauvegarde déjà réussie, même après perte de sa réponse.
  const current = await loadAvatar(owner)
  if (matches(current)) return current!
  if ((current?.revision ?? null) !== revision) throw new Error('Ton avatar a changé. Tes choix sont conservés ; relis la version enregistrée.')
  await requireOwner(owner)
  let row: ProfileAvatar | null = null
  try {
    const result = revision === null
      ? await supabase.from('avatars_utilisateurs').insert({ user_id: owner, configuration: config }).select().abortSignal(AbortSignal.timeout(15000)).single()
      : await supabase.from('avatars_utilisateurs').update({ configuration: config, revision: expectedRevision }).eq('user_id', owner).eq('revision', revision).select().abortSignal(AbortSignal.timeout(15000)).single()
    await requireOwner(owner)
    if (!result.error && matches(result.data)) row = result.data
  } catch { /* Une réponse perdue doit être vérifiée, jamais réécrite automatiquement. */ }
  if (row) return row
  const verified = await loadAvatar(owner)
  if (matches(verified)) return verified!
  throw new Error('Enregistrement non confirmé ou conflit. Tes choix sont conservés ; relis la version enregistrée avant de continuer.')
}
