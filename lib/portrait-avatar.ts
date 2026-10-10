// Portrait privé borné, séparé du contrat des avatars et copies de cartes.
import { rasterInfo, SELFIE_PROMPT_VERSION } from './selfie-avatar-contract'

export const PORTRAIT_MAX_BYTES = 128 * 1024
export const PORTRAIT_MAX_LENGTH = 175000
export type PortraitAvatar = { image: string; promptVersion: typeof SELFIE_PROMPT_VERSION; revision: number }

export function portraitAvatar(input: unknown, revision: number): PortraitAvatar | null {
  if (input == null) return null
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Portrait enregistré invalide.')
  const value = input as Record<string, unknown>
  if (Object.keys(value).sort().join(',') !== 'image,promptVersion,revision' || value.revision !== revision || !Number.isSafeInteger(revision) || revision < 1 || value.promptVersion !== SELFIE_PROMPT_VERSION || typeof value.image !== 'string' || value.image.length > PORTRAIT_MAX_LENGTH || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value.image)) throw new Error('Portrait enregistré invalide.')
  const encoded = value.image.slice(23)
  if (encoded.length % 4 !== 0) throw new Error('Portrait enregistré invalide.')
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  const info = rasterInfo(bytes)
  if (bytes.length > PORTRAIT_MAX_BYTES || info.type !== 'image/jpeg' || info.width !== 500 || info.height !== 500) throw new Error('Portrait enregistré invalide.')
  return { image: value.image, promptVersion: SELFIE_PROMPT_VERSION, revision }
}
