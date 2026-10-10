// 🌙 Avatar privé : RLS, révision attendue et vérification avant toute nouvelle écriture.
import { supabase } from './supabase-browser'
import { requireOwner } from './attention-data'
import { avatarRenderConfig, recoverProfileRenderAvatar, type AvatarRenderConfig } from './avatar-render-config'
import type { Tables } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { avatarConfigV3, DEFAULT_AVATAR_V3 } from './avatar-collection-v3'
import { portraitAvatar, type PortraitAvatar } from './portrait-avatar'

// Colonne proposée : les types générés restent ceux du schéma installé.
export type ProfileAvatar = Tables<'avatars_utilisateurs'> & { portrait_ia?: unknown }
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

/** Même ligne, même RLS et même verrou de révision que l’avatar personnalisable. */
export async function savePortraitAvatar(owner: string, revision: number | null, portrait: PortraitAvatar, signal: AbortSignal): Promise<ProfileAvatar> {
  if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER)) throw new Error('Révision invalide.')
  const nextRevision = (revision ?? 0) + 1
  const valid = portraitAvatar(portrait, nextRevision)
  if (!valid) throw new Error('Portrait invalide.')
  const matches = (row: ProfileAvatar | null) => {
    try { return row?.user_id === owner && row.revision === nextRevision && portraitAvatar(row.portrait_ia, row.revision)?.image === valid.image } catch { return false }
  }
  signal.throwIfAborted()
  const current = await loadAvatar(owner)
  signal.throwIfAborted()
  if (matches(current)) return current!
  if ((current?.revision ?? null) !== revision) throw new Error('Ton avatar a changé. Recharge la page avant de valider ce portrait.')
  await requireOwner(owner)
  signal.throwIfAborted()
  // Adaptateur isolé pour la colonne future ; aucun type DB généré anticipé.
  const client = supabase as unknown as SupabaseClient
  const query = revision === null
    ? client.from('avatars_utilisateurs').insert({ user_id: owner, configuration: avatarConfigV3(DEFAULT_AVATAR_V3), portrait_ia: valid })
    : client.from('avatars_utilisateurs').update({ portrait_ia: valid, revision: nextRevision }).eq('user_id', owner).eq('revision', revision)
  const result = await query.select().abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15000)])).maybeSingle()
  signal.throwIfAborted()
  await requireOwner(owner)
  signal.throwIfAborted()
  if (result.error?.code === 'PGRST204' || result.error?.code === '42703' || result.error?.code === '42501') throw new Error('L’enregistrement du portrait attend l’installation du script Avatar IA dans Supabase.')
  if (!result.error && matches(result.data)) return result.data as ProfileAvatar
  // Une réponse perdue est relue, sans nouvelle écriture automatique.
  const verified = await loadAvatar(owner)
  signal.throwIfAborted()
  if (matches(verified)) return verified!
  throw new Error('Enregistrement non confirmé ou conflit. Ton aperçu reste disponible ; recharge la page avant de continuer.')
}
