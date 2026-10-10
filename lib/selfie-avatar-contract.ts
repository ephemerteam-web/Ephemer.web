// Contrat commun : aucune configuration privée ni prompt dans le navigateur.
export const SELFIE_PROMPT_VERSION = 'celeste-cartoon-v1'
export const SELFIE_SOURCE_MAX_BYTES = 10 * 1024 * 1024
export const SELFIE_INPUT_MAX_BYTES = 512 * 1024
export const SELFIE_BODY_MAX_BYTES = 1024 * 1024
export const SELFIE_INPUT_MAX_SIDE = 500
export const SELFIE_OUTPUT_SIDE = 1024
export const SELFIE_OUTPUT_MAX_BYTES = 8 * 1024 * 1024
export const SELFIE_SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type GeneratedSelfieAvatar = { file: File; promptVersion: typeof SELFIE_PROMPT_VERSION }

export class SelfieAvatarError extends Error {
  status: number
  code: string
  constructor(message: string, status = 400, code = 'IMAGE_INVALIDE') {
    super(message)
    this.status = status
    this.code = code
  }
}

export type RasterInfo = { type: 'image/jpeg' | 'image/png' | 'image/webp'; width: number; height: number }

/** Signature et dimensions réelles ; ne constitue pas un détecteur de visage. */
export function rasterInfo(bytes: Uint8Array): RasterInfo {
  const invalid = () => { throw new SelfieAvatarError('Cette image est invalide. Choisis une photo JPEG, PNG ou WebP.') }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length))
  let info: RasterInfo | undefined
  if (bytes.length >= 33 && bytes.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i]) && view.getUint32(8) === 13 && ascii(12, 4) === 'IHDR') {
    info = { type: 'image/png', width: view.getUint32(16), height: view.getUint32(20) }
  } else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) {
    let offset = 2
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) return invalid()
      while (bytes[offset] === 255) offset++
      const marker = bytes[offset++]
      if (marker === 218 || marker === 217) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      if (offset + 2 > bytes.length) return invalid()
      const length = view.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) return invalid()
      if ([192, 193, 194].includes(marker) && length >= 8) {
        info = { type: 'image/jpeg', height: view.getUint16(offset + 3), width: view.getUint16(offset + 5) }
        break
      }
      offset += length
    }
  } else if (bytes.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP' && view.getUint32(4, true) + 8 === bytes.length) {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8X') {
      info = { type: 'image/webp', width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
    } else if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      info = { type: 'image/webp', width: view.getUint16(26, true) & 16383, height: view.getUint16(28, true) & 16383 }
    } else if (chunk === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21, true)
      info = { type: 'image/webp', width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 }
    }
  }
  if (!info || !info.width || !info.height) return invalid()
  return info
}

export function validateSelfieInput(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > SELFIE_INPUT_MAX_BYTES) throw new SelfieAvatarError('La photo préparée est trop volumineuse.', 413)
  const info = rasterInfo(bytes)
  if (info.type !== 'image/jpeg' || info.width > SELFIE_INPUT_MAX_SIDE || info.height > SELFIE_INPUT_MAX_SIDE) {
    throw new SelfieAvatarError('La photo doit être préparée en JPEG, avec un côté de 500 pixels maximum.')
  }
  return info
}
