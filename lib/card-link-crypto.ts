// 🔐 Primitives serveur seulement ; jamais importées dans les composants navigateur.
import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type CardLinkContext = { ownerId: string; cardId: string; linkId: string }
export type EncryptedCardSecret = { format: 1; ciphertext: string; nonce: string; tag: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function contextBytes(context: CardLinkContext) {
  if (![context.ownerId, context.cardId, context.linkId].every(value => typeof value === 'string' && uuid.test(value))) throw new Error('Contexte de lien invalide.')
  return Buffer.from(['ephemer-card-link-v1', context.ownerId.toLowerCase(), context.cardId.toLowerCase(), context.linkId.toLowerCase()].join(':'))
}
function encryptionKey(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) throw new Error('EPHEMER_CARD_LINK_KEY absente ou invalide.')
  return Buffer.from(value, 'hex')
}
export function isCardSecret(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) && Buffer.from(value, 'base64url').toString('base64url') === value
}
export function newCardSecret() { return randomBytes(32).toString('base64url') }
export function cardSecretHash(secret: string) {
  if (!isCardSecret(secret)) throw new Error('Lien invalide.')
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}
export function encryptCardSecret(secret: string, context: CardLinkContext, key = process.env.EPHEMER_CARD_LINK_KEY): EncryptedCardSecret {
  if (!isCardSecret(secret)) throw new Error('Lien invalide.')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), nonce)
  cipher.setAAD(contextBytes(context))
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(secret, 'base64url')), cipher.final()])
  return { format: 1, ciphertext: ciphertext.toString('hex'), nonce: nonce.toString('hex'), tag: cipher.getAuthTag().toString('hex') }
}
export function decryptCardSecret(envelope: EncryptedCardSecret, context: CardLinkContext, key = process.env.EPHEMER_CARD_LINK_KEY) {
  const material = encryptionKey(key)
  if (!envelope || envelope.format !== 1 || !/^[0-9a-f]{64}$/.test(envelope.ciphertext) ||
    !/^[0-9a-f]{24}$/.test(envelope.nonce) || !/^[0-9a-f]{32}$/.test(envelope.tag)) throw new Error('Lien indisponible.')
  try {
    const decipher = createDecipheriv('aes-256-gcm', material, Buffer.from(envelope.nonce, 'hex'))
    decipher.setAAD(contextBytes(context)); decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'hex')), decipher.final()])
    if (plaintext.length !== 32) throw new Error('Taille invalide')
    return plaintext.toString('base64url')
  } catch { throw new Error('Lien indisponible.') }
}
