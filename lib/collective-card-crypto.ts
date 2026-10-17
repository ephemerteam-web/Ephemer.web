import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { celebrationUuid } from './celebration-contract'
import type { EncryptedCardSecret } from './card-link-crypto'

export type CollectiveCryptoContext = { celebration: string; card: string; version: string }
function keyBytes(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) throw new Error('EPHEMER_CARD_LINK_KEY absente ou invalide.')
  return Buffer.from(value, 'hex')
}
function aad(context: CollectiveCryptoContext, purpose: 'lien' | 'email') {
  return Buffer.from(['ephemer-collective-v1', purpose, celebrationUuid(context.celebration), celebrationUuid(context.card), celebrationUuid(context.version)].join(':'))
}
/** L'enveloppe email fige aussi l'adresse et le HTML : pas de secret en clair dans le journal. */
export function sealCollectiveContent(value: string, context: CollectiveCryptoContext, purpose: 'lien' | 'email', key = process.env.EPHEMER_CARD_LINK_KEY): EncryptedCardSecret {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 60000) throw new Error('Contenu à chiffrer invalide.')
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', keyBytes(key), nonce)
  cipher.setAAD(aad(context, purpose))
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return { format: 1, ciphertext: encrypted.toString('hex'), nonce: nonce.toString('hex'), tag: cipher.getAuthTag().toString('hex') }
}
export function openCollectiveContent(value: EncryptedCardSecret, context: CollectiveCryptoContext, purpose: 'lien' | 'email', key = process.env.EPHEMER_CARD_LINK_KEY): string {
  const material = keyBytes(key)
  try {
    if (value.format !== 1 || !/^(?:[0-9a-f]{2}){0,60000}$/.test(value.ciphertext) || !/^[0-9a-f]{24}$/.test(value.nonce) || !/^[0-9a-f]{32}$/.test(value.tag)) throw new Error()
    const decipher = createDecipheriv('aes-256-gcm', material, Buffer.from(value.nonce, 'hex'))
    decipher.setAAD(aad(context, purpose)); decipher.setAuthTag(Buffer.from(value.tag, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'hex')), decipher.final()]).toString('utf8')
  } catch { throw new Error('Contenu collectif indisponible.') }
}
