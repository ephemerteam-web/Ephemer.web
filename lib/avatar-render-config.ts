// Contrat fermé commun au profil et aux copies de cartes, après confirmation SQL V3.
import { avatarConfig, type AvatarConfigV1 } from './avatars'
import { avatarConfigV3, DEFAULT_AVATAR_V3, type AvatarConfigV3 } from './avatar-collection-v3'
export type AvatarRenderConfig = AvatarConfigV1 | AvatarConfigV3
export function avatarRenderConfig(input: unknown): AvatarRenderConfig {
  if (input && typeof input === 'object' && 'format' in input && input.format === 2) return avatarConfigV3(input)
  return avatarConfig(input)
}
/** Repli réservé au profil. Une publication invalide est toujours refusée. */
export function recoverProfileRenderAvatar(input: unknown): { config: AvatarRenderConfig; notice: string | null } {
  if (input == null) return { config: avatarConfigV3(DEFAULT_AVATAR_V3), notice: null }
  try { return { config: avatarRenderConfig(input), notice: null } }
  catch { return { config: avatarConfigV3(DEFAULT_AVATAR_V3), notice: 'Cette configuration ne peut pas être reprise. Un avatar par défaut est affiché ; aucune donnée enregistrée n’a été remplacée.' } }
}
