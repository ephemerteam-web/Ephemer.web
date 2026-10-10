import { prepareSelfie } from './selfie-avatar-client'
import { portraitAvatar, PORTRAIT_MAX_BYTES, type PortraitAvatar } from './portrait-avatar'
import { SELFIE_PROMPT_VERSION, type GeneratedSelfieAvatar } from './selfie-avatar-contract'

/** JPEG de profil : 500 px, sans métadonnées. L’original reste téléchargeable. */
export async function preparePortrait(avatar: GeneratedSelfieAvatar, revision: number, signal: AbortSignal): Promise<PortraitAvatar> {
  if (avatar.promptVersion !== SELFIE_PROMPT_VERSION) throw new Error('Version du portrait incompatible. Crée un nouvel avatar.')
  const file = await prepareSelfie(avatar.file, signal, 0.82)
  if (file.size > PORTRAIT_MAX_BYTES) throw new Error('Ce portrait est trop volumineux pour le profil. Télécharge-le puis essaie une nouvelle génération.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  signal.throwIfAborted()
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const result = portraitAvatar({ image: `data:image/jpeg;base64,${btoa(binary)}`, promptVersion: avatar.promptVersion, revision }, revision)
  if (!result) throw new Error('Impossible de préparer ton portrait.')
  return result
}
